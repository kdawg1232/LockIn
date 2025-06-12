import { NativeStackNavigationProp } from '@react-navigation/native-stack';

export type RootStackParamList = {
  Intro: undefined;
  Auth: { screen?: string } | undefined;
  CreateProfile: undefined;
  OpponentOfTheDay: undefined;
  Stats: {
    opponentName: string;
    opponentId: string;
  };
  UserStats: undefined;
  OpponentStats: {
    opponentId: string;
    opponentName: string;
  };
  Timer: undefined;
  Profile: undefined;
  Community: undefined;
};

export type AuthStackParamList = {
  SignIn: undefined;
  SignUp: undefined;
};

export type RootStackNavigationProp = NativeStackNavigationProp<RootStackParamList>;

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
} 