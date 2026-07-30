import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, Image, ActivityIndicator, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Audio } from 'expo-av';
import { useChatStore } from '../store/useChatStore';
import { useAuthStore } from '../store/useAuthStore';
import { supabase } from '../lib/supabase';

export function ChatDetailScreen({ route, navigation }: any) {
  const { conversationId, user: targetUser } = route.params;
  const { currentMessages, fetchMessages, sendMessage, subscribeToMessages } = useChatStore();
  const { profile } = useAuthStore();
  const [text, setText] = useState('');
  const [uploading, setUploading] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);

  useEffect(() => {
    navigation.setOptions({ title: targetUser?.full_name || 'Söhbət' });
    fetchMessages(conversationId);
    const unsubscribe = subscribeToMessages(conversationId);
    return () => {
      unsubscribe();
    };
  }, [conversationId]);

  const handleSendText = async () => {
    if (!text.trim()) return;
    const msgText = text;
    setText('');
    await sendMessage(conversationId, 'text', msgText);
  };

  const handlePickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('İcazə xətası', 'Qalereyaya giriş icazəsi verilmedi.');
      return;
    }

    const pickerResult = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });

    if (pickerResult.canceled || !pickerResult.assets[0].uri) return;

    try {
      setUploading(true);
      const uri = pickerResult.assets[0].uri;
      const response = await fetch(uri);
      const blob = await response.blob();
      const filename = `images/${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;

      const { data, error } = await supabase.storage.from('chat-media').upload(filename, blob, {
        contentType: 'image/jpeg',
      });

      if (error) throw error;

      const { data: publicUrlData } = supabase.storage.from('chat-media').getPublicUrl(filename);
      await sendMessage(conversationId, 'image', undefined, publicUrlData.publicUrl);
    } catch (err: any) {
      Alert.alert('Şəkil Yükləmə Xətası', err.message);
    } finally {
      setUploading(false);
    }
  };

  const startAudioRecording = async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('İcazə xətası', 'Mikrofon icazəsi verilmedi.');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(recording);
      setIsRecording(true);
    } catch (err) {
      console.error('Failed to start recording', err);
    }
  };

  const stopAudioRecording = async () => {
    if (!recording) return;
    setIsRecording(false);
    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();
    setRecording(null);

    if (!uri) return;

    try {
      setUploading(true);
      const response = await fetch(uri);
      const blob = await response.blob();
      const filename = `audio/${Date.now()}_${Math.random().toString(36).substring(7)}.m4a`;

      const { error } = await supabase.storage.from('chat-media').upload(filename, blob, {
        contentType: 'audio/m4a',
      });

      if (error) throw error;

      const { data: publicUrlData } = supabase.storage.from('chat-media').getPublicUrl(filename);
      await sendMessage(conversationId, 'audio', undefined, publicUrlData.publicUrl);
    } catch (err: any) {
      Alert.alert('Səs Mesajı Xətası', err.message);
    } finally {
      setUploading(false);
    }
  };

  const renderMessage = ({ item }: { item: any }) => {
    const isMe = item.sender_id === profile?.id;
    return (
      <View style={[styles.msgContainer, isMe ? styles.myMsg : styles.otherMsg]}>
        {item.content_type === 'text' && (
          <Text style={styles.msgText}>{item.content_text}</Text>
        )}

        {item.content_type === 'image' && item.media_url && (
          <Image source={{ uri: item.media_url }} style={styles.chatImage} resizeMode="cover" />
        )}

        {item.content_type === 'audio' && item.media_url && (
          <View style={styles.audioBubble}>
            <Text style={styles.audioIcon}>🎙️ Səs mesajı</Text>
          </View>
        )}

        <Text style={styles.msgTime}>
          {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={currentMessages}
        keyExtractor={item => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.messageList}
      />

      {uploading && (
        <View style={styles.uploadingBar}>
          <ActivityIndicator color="#25D366" size="small" />
          <Text style={styles.uploadingText}>Media yüklənir...</Text>
        </View>
      )}

      <View style={styles.inputContainer}>
        <TouchableOpacity style={styles.mediaBtn} onPress={handlePickImage} disabled={uploading}>
          <Text style={styles.mediaIcon}>📷</Text>
        </TouchableOpacity>

        <TextInput
          style={styles.textInput}
          placeholder="Mesaj yazın..."
          placeholderTextColor="#8e8e93"
          value={text}
          onChangeText={setText}
          multiline
        />

        {text.trim() ? (
          <TouchableOpacity style={styles.sendBtn} onPress={handleSendText}>
            <Text style={styles.sendIcon}>➤</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.sendBtn, isRecording && styles.recordingBtn]}
            onPress={isRecording ? stopAudioRecording : startAudioRecording}
            disabled={uploading}
          >
            <Text style={styles.sendIcon}>{isRecording ? '⏹' : '🎙️'}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  messageList: {
    padding: 16,
  },
  msgContainer: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
    marginBottom: 10,
  },
  myMsg: {
    alignSelf: 'flex-end',
    backgroundColor: '#059669',
    borderBottomRightRadius: 2,
  },
  otherMsg: {
    alignSelf: 'flex-start',
    backgroundColor: '#1e293b',
    borderBottomLeftRadius: 2,
    borderWidth: 1,
    borderColor: '#334155',
  },
  msgText: {
    color: '#fff',
    fontSize: 15,
  },
  msgTime: {
    fontSize: 10,
    color: '#cbd5e1',
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  chatImage: {
    width: 200,
    height: 200,
    borderRadius: 12,
  },
  audioBubble: {
    paddingVertical: 6,
  },
  audioIcon: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#1e293b',
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  mediaBtn: {
    padding: 8,
  },
  mediaIcon: {
    fontSize: 22,
  },
  textInput: {
    flex: 1,
    backgroundColor: '#0f172a',
    color: '#fff',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 15,
    maxHeight: 100,
    marginHorizontal: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#25D366',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordingBtn: {
    backgroundColor: '#ef4444',
  },
  sendIcon: {
    color: '#fff',
    fontSize: 18,
  },
  uploadingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    backgroundColor: '#1e293b',
  },
  uploadingText: {
    color: '#94a3b8',
    marginLeft: 8,
    fontSize: 12,
  },
});
