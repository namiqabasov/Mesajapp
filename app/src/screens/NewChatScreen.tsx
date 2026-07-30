import React, { useState } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Image } from 'react-native';
import { supabase } from '../lib/supabase';
import { useChatStore } from '../store/useChatStore';

export function NewChatScreen({ navigation }: any) {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const { startConversation } = useChatStore();

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);

    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .ilike('username', `%${searchQuery.trim()}%`)
      .neq('id', user?.id)
      .eq('status', 'approved');

    setSearching(false);

    if (error) {
      Alert.alert('Xəta', 'Axtarış zamanı xəta baş verdi.');
      return;
    }

    setResults(data || []);
  };

  const handleSelectUser = async (targetUser: any) => {
    const convId = await startConversation(targetUser.id);
    if (convId) {
      navigation.replace('ChatDetail', { conversationId: convId, user: targetUser });
    } else {
      Alert.alert('Xəta', 'Söhbət başlatmaq mümkün olmadı.');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchBar}>
        <TextInput
          style={styles.input}
          placeholder="Username üzrə axtar..."
          placeholderTextColor="#8e8e93"
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={handleSearch}
          autoCapitalize="none"
        />
        <TouchableOpacity style={styles.searchBtn} onPress={handleSearch}>
          <Text style={styles.searchBtnText}>Axtar</Text>
        </TouchableOpacity>
      </View>

      {searching ? (
        <ActivityIndicator color="#25D366" size="large" style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={results}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.userCard} onPress={() => handleSelectUser(item)}>
              <View style={styles.avatar}>
                {item.avatar_url ? (
                  <Image source={{ uri: item.avatar_url }} style={styles.avatarImg} />
                ) : (
                  <Text style={styles.avatarText}>{item.full_name[0]}</Text>
                )}
              </View>
              <View>
                <Text style={styles.fullName}>{item.full_name}</Text>
                <Text style={styles.username}>@{item.username}</Text>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            searchQuery ? <Text style={styles.emptyText}>İstifadəçi tapılmadı.</Text> : null
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
    padding: 16,
  },
  searchBar: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  input: {
    flex: 1,
    backgroundColor: '#1e293b',
    color: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#334155',
    marginRight: 10,
  },
  searchBtn: {
    backgroundColor: '#25D366',
    borderRadius: 12,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  searchBtnText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    backgroundColor: '#1e293b',
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#25D366',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  avatarImg: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  fullName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  username: {
    fontSize: 14,
    color: '#94a3b8',
  },
  emptyText: {
    color: '#64748b',
    textAlign: 'center',
    marginTop: 20,
  },
});
