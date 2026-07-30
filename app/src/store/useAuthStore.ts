import { create } from 'zustand';
import { supabase } from '../lib/supabase';

export interface Profile {
  id: string;
  username: string;
  full_name: string;
  avatar_url?: string;
  status: 'pending' | 'approved' | 'blocked';
  role: 'user' | 'admin';
  created_at: string;
}

interface AuthState {
  user: any | null;
  profile: Profile | null;
  loading: boolean;
  error: string | null;
  checkSession: () => Promise<void>;
  signUp: (email: string, password: string, username: string, fullName: string, avatarUrl?: string) => Promise<boolean>;
  signIn: (email: string, password: string) => Promise<boolean>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  loading: true,
  error: null,

  checkSession: async () => {
    try {
      set({ loading: true, error: null });
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        set({ user: session.user, profile: profile as Profile || null, loading: false });
      } else {
        set({ user: null, profile: null, loading: false });
      }
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  signUp: async (email, password, username, fullName, avatarUrl) => {
    try {
      set({ loading: true, error: null });
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username,
            full_name: fullName,
            avatar_url: avatarUrl || '',
          },
        },
      });

      if (error) throw error;

      if (data.user) {
        await get().checkSession();
      }
      return true;
    } catch (err: any) {
      set({ error: err.message, loading: false });
      return false;
    }
  },

  signIn: async (email, password) => {
    try {
      set({ loading: true, error: null });
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        await get().checkSession();
      }
      return true;
    } catch (err: any) {
      set({ error: err.message, loading: false });
      return false;
    }
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null, profile: null, loading: false });
  },
}));
