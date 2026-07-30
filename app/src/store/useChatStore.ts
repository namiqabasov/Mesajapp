import { create } from 'zustand';
import { supabase } from '../lib/supabase';

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content_type: 'text' | 'image' | 'audio';
  content_text?: string;
  media_url?: string;
  status: 'sent' | 'delivered' | 'read';
  created_at: string;
}

export interface ConversationItem {
  id: string;
  updated_at: string;
  other_user: {
    id: string;
    username: string;
    full_name: string;
    avatar_url?: string;
  };
  last_message?: Message;
  unread_count: number;
}

interface ChatState {
  conversations: ConversationItem[];
  currentMessages: Message[];
  activeConversationId: string | null;
  loading: boolean;
  fetchConversations: () => Promise<void>;
  fetchMessages: (conversationId: string) => Promise<void>;
  sendMessage: (conversationId: string, type: 'text' | 'image' | 'audio', text?: string, mediaUrl?: string) => Promise<boolean>;
  startConversation: (targetUserId: string) => Promise<string | null>;
  subscribeToMessages: (conversationId: string) => () => void;
  markAsRead: (conversationId: string) => Promise<void>;
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  currentMessages: [],
  activeConversationId: null,
  loading: false,

  fetchConversations: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    set({ loading: true });

    // Fetch user's conversation IDs
    const { data: userConvs } = await supabase
      .from('conversation_participants')
      .select('conversation_id, last_read_at')
      .eq('user_id', user.id);

    if (!userConvs || userConvs.length === 0) {
      set({ conversations: [], loading: false });
      return;
    }

    const convIds = userConvs.map(c => c.conversation_id);

    // Fetch participants of those conversations (excluding current user)
    const { data: participants } = await supabase
      .from('conversation_participants')
      .select('conversation_id, user_id, profiles(id, username, full_name, avatar_url)')
      .in('conversation_id', convIds)
      .neq('user_id', user.id);

    // Fetch last message for each conversation
    const { data: messages } = await supabase
      .from('messages')
      .select('*')
      .in('conversation_id', convIds)
      .order('created_at', { ascending: false });

    const formattedConvs: ConversationItem[] = [];

    for (const convId of convIds) {
      const participant = participants?.find(p => p.conversation_id === convId);
      const convMessages = messages?.filter(m => m.conversation_id === convId) || [];
      const lastMsg = convMessages[0];
      
      const userParticipant = userConvs.find(uc => uc.conversation_id === convId);
      const lastReadAt = userParticipant?.last_read_at ? new Date(userParticipant.last_read_at).getTime() : 0;
      
      const unreadCount = convMessages.filter(
        m => m.sender_id !== user.id && new Date(m.created_at).getTime() > lastReadAt
      ).length;

      if (participant && participant.profiles) {
        formattedConvs.push({
          id: convId,
          updated_at: lastMsg ? lastMsg.created_at : new Date().toISOString(),
          other_user: participant.profiles as any,
          last_message: lastMsg,
          unread_count: unreadCount,
        });
      }
    }

    formattedConvs.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

    set({ conversations: formattedConvs, loading: false });
  },

  fetchMessages: async (conversationId: string) => {
    set({ loading: true, activeConversationId: conversationId });
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    set({ currentMessages: (data as Message[]) || [], loading: false });
    get().markAsRead(conversationId);
  },

  sendMessage: async (conversationId, type, text, mediaUrl) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content_type: type,
        content_text: text || null,
        media_url: mediaUrl || null,
        status: 'sent',
      })
      .select()
      .single();

    if (error) {
      console.error('Error sending message:', error);
      return false;
    }

    if (data) {
      set(state => ({
        currentMessages: state.activeConversationId === conversationId ? [...state.currentMessages, data as Message] : state.currentMessages
      }));
      get().fetchConversations();
    }
    return true;
  },

  startConversation: async (targetUserId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // Check if conversation already exists between these 2 users
    const { data: existingMyConvs } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', user.id);

    if (existingMyConvs && existingMyConvs.length > 0) {
      const myConvIds = existingMyConvs.map(c => c.conversation_id);
      const { data: shared } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', targetUserId)
        .in('conversation_id', myConvIds)
        .maybeSingle();

      if (shared) {
        return shared.conversation_id;
      }
    }

    // Create new conversation
    const { data: newConv, error: convErr } = await supabase
      .from('conversations')
      .insert({})
      .select()
      .single();

    if (convErr || !newConv) return null;

    // Add both participants
    await supabase.from('conversation_participants').insert([
      { conversation_id: newConv.id, user_id: user.id },
      { conversation_id: newConv.id, user_id: targetUserId },
    ]);

    await get().fetchConversations();
    return newConv.id;
  },

  markAsRead: async (conversationId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from('conversation_participants')
      .update({ last_read_at: new Date().toISOString() })
      .match({ conversation_id: conversationId, user_id: user.id });
  },

  subscribeToMessages: (conversationId: string) => {
    const channel = supabase
      .channel(`chat_${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        payload => {
          const newMsg = payload.new as Message;
          set(state => {
            if (state.activeConversationId === conversationId) {
              if (state.currentMessages.some(m => m.id === newMsg.id)) return state;
              return { currentMessages: [...state.currentMessages, newMsg] };
            }
            return state;
          });
          get().markAsRead(conversationId);
          get().fetchConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },
}));
