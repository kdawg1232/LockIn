import { NativeStackNavigationProp } from '@react-navigation/native-stack';

export type RootStackParamList = {
  Intro: undefined;
  Auth: { screen?: string } | undefined;
  CreateProfile: undefined;
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
  GroupScreen: undefined; // Renamed from Community for groups feature
  CreateGroup: undefined; // New screen for creating groups
  GroupInvites: undefined; // New screen for viewing/accepting group invitations
  GroupMembers: { // New screen for viewing group members and details
    groupId: string;
    groupName: string;
  };
  SettingsPrivacy: undefined; // New screen for task 1.31
  EditProfile: undefined; // New screen for editing profile
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