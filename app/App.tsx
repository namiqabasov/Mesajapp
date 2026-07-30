import React, { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuthStore } from './src/store/useAuthStore';
import { LoginScreen } from './src/screens/LoginScreen';
import { RegisterScreen } from './src/screens/RegisterScreen';
import { PendingApprovalScreen } from './src/screens/PendingApprovalScreen';
import { ChatListScreen } from './src/screens/ChatListScreen';
import { NewChatScreen } from './src/screens/NewChatScreen';
import { ChatDetailScreen } from './src/screens/ChatDetailScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  const { user, profile, loading, checkSession } = useAuthStore();

  useEffect(() => {
    checkSession();
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0f172a', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#25D366" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: '#1e293b' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold' },
        }}
      >
        {!user ? (
          <>
            <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Register" component={RegisterScreen} options={{ headerShown: false }} />
          </>
        ) : profile?.status === 'pending' ? (
          <Stack.Screen name="PendingApproval" component={PendingApprovalScreen} options={{ headerShown: false }} />
        ) : (
          <>
            <Stack.Screen name="ChatList" component={ChatListScreen} options={{ headerShown: false }} />
            <Stack.Screen name="NewChat" component={NewChatScreen} options={{ title: 'Yeni Söhbət' }} />
            <Stack.Screen name="ChatDetail" component={ChatDetailScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
