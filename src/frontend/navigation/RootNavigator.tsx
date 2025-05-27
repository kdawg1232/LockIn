import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import supabase from '../../lib/supabase';
import { AuthNavigator } from './AuthNavigator';
import { CreateProfileScreen } from '../screens/CreateProfileScreen';
import { OpponentOfTheDay } from '../screens/OpponentOfTheDay';
import { View, Text } from 'react-native';

type RootStackParamList = {
  Auth: undefined;
  CreateProfile: undefined;
  OpponentOfTheDay: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

// Temporary loading component
const LoadingScreen = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <Text>Loading...</Text>
  </View>
);

// Create a context to force session refresh
export const SessionContext = React.createContext<{
  refreshSession: () => Promise<void>;
}>({
  refreshSession: async () => {},
});

export const RootNavigator = () => {
  const [session, setSession] = useState<any>(null);
  const [hasProfile, setHasProfile] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(true);

  const checkSessionAndProfile = async () => {
    try {
      const { data: { session } } = await supabase.getSession();
      console.log('🔍 Session check - Got session:', session ? 'Yes' : 'No');
      console.log('🔍 Session user ID:', session?.user?.id);
      setSession(session);

      // If user is logged in, check if they have a profile
      if (session?.user) {
        console.log('🔍 Checking profile for user:', session.user.id);
        
        const { data: profileData, error } = await supabase
          .from('users')
          .select('university, major, profile_completed')
          .eq('id', session.user.id);

        console.log('🔍 Profile query result:', { profileData, error });

        if (!error && profileData && Array.isArray(profileData) && profileData.length > 0) {
          const profile = profileData[0];
          // Check if user has completed their profile (has university and major)
          const profileComplete = profile.university && profile.major;
          console.log('🔍 Profile complete:', profileComplete);
          console.log('🔍 Profile data:', profile);
          setHasProfile(profileComplete);
        } else {
          console.log('🔍 No profile found or error:', error);
          setHasProfile(false);
        }
      } else {
        console.log('🔍 No session user, setting hasProfile to false');
        setHasProfile(false);
      }
    } catch (error) {
      console.error('🔍 Error getting session:', error);
      setSession(null);
      setHasProfile(false);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshSession = async () => {
    setIsLoading(true);
    await checkSessionAndProfile();
  };

  useEffect(() => {
    console.log('RootNavigator mounted');
    checkSessionAndProfile();
  }, []);

  // Add navigation state change listener to refresh when needed
  const handleNavigationStateChange = () => {
    // If we're logged in but profile status might have changed, recheck
    if (session && !hasProfile) {
      console.log('Navigation state changed, rechecking profile...');
      checkSessionAndProfile();
    }
  };

  if (isLoading) {
    console.log('🔍 Rendering: LoadingScreen (isLoading=true)');
    return <LoadingScreen />;
  }

  console.log('🔍 Navigation Decision:');
  console.log('🔍 - session:', session ? 'EXISTS' : 'NULL');
  console.log('🔍 - hasProfile:', hasProfile);
  console.log('🔍 - isLoading:', isLoading);

  if (!session) {
    console.log('🔍 Rendering: Auth Navigator (no session)');
  } else if (!hasProfile) {
    console.log('🔍 Rendering: CreateProfile Screen (session exists, no profile)');
  } else {
    console.log('🔍 Rendering: OpponentOfTheDay Screen (session exists, profile complete)');
  }

  return (
    <SessionContext.Provider value={{ refreshSession }}>
      <NavigationContainer onStateChange={handleNavigationStateChange}>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {!session ? (
            <Stack.Screen name="Auth" component={AuthNavigator} />
          ) : !hasProfile ? (
            <Stack.Screen name="CreateProfile" component={CreateProfileScreen} />
          ) : (
            <Stack.Screen name="OpponentOfTheDay" component={OpponentOfTheDay} />
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </SessionContext.Provider>
  );
}; 