import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { supabase } from '../../lib/supabase';
import { AuthNavigator } from './AuthNavigator';
import { CreateProfileScreen } from '../screens/CreateProfileScreen';
import { View, Text } from 'react-native';

type RootStackParamList = {
  Auth: undefined;
  CreateProfile: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

// Temporary loading component
const LoadingScreen = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <Text>Loading...</Text>
  </View>
);

export const RootNavigator = () => {
  const [session, setSession] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    console.log('RootNavigator mounted');
    
    // Listen for auth changes
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('Got session:', session ? 'Yes' : 'No');
      setSession(session);
      setIsLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log('Auth state changed:', session ? 'Yes' : 'No');
      setSession(session);
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (isLoading) {
    return <LoadingScreen />;
  }

  console.log('Rendering navigator. Session:', session ? 'Yes' : 'No');

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!session ? (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        ) : (
          <Stack.Screen name="CreateProfile" component={CreateProfileScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}; 