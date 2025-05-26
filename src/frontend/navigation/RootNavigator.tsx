import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { supabase } from '../../lib/supabase';
import { AuthNavigator } from './AuthNavigator';
import { CreateProfileScreen } from '../screens/CreateProfileScreen';
import { View, Text } from 'react-native';
// TODO: Import MainNavigator when created

type RootStackParamList = {
  Auth: undefined;
  CreateProfile: undefined;
  Main: undefined;
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
  const [isProfileComplete, setIsProfileComplete] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    console.log('RootNavigator mounted');
    
    // Listen for auth changes
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('Got session:', session ? 'Yes' : 'No');
      setSession(session);
      if (session?.user) {
        checkProfileStatus(session.user.id);
      } else {
        setIsLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log('Auth state changed:', session ? 'Yes' : 'No');
      setSession(session);
      if (session?.user) {
        checkProfileStatus(session.user.id);
      } else {
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkProfileStatus = async (userId: string) => {
    try {
      console.log('Checking profile status for user:', userId);
      const selectResult = await supabase
        .from('users')
        .select('profile_completed');
      
      const { data, error } = await selectResult.eq('id', userId).single();

      if (error) throw error;
      console.log('Profile status:', data?.profile_completed);
      setIsProfileComplete(data?.profile_completed || false);
    } catch (error) {
      console.error('Error checking profile status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <LoadingScreen />;
  }

  console.log('Rendering navigator. Session:', session ? 'Yes' : 'No', 'Profile complete:', isProfileComplete);

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!session ? (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        ) : !isProfileComplete ? (
          <Stack.Screen name="CreateProfile" component={CreateProfileScreen} />
        ) : (
          // Temporary placeholder until main app is built
          <Stack.Screen 
            name="CreateProfile" 
            component={() => (
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
                <Text style={{ fontSize: 18, marginBottom: 20 }}>Profile Complete!</Text>
                <Text style={{ textAlign: 'center', color: '#666' }}>
                  Main app screens will be implemented here.
                </Text>
              </View>
            )} 
          />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}; 