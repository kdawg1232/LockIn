import { NativeStackNavigationProp } from '@react-navigation/native-stack';

export type RootStackParamList = {
  SignUp: undefined;
  SignIn: undefined;
  Home: undefined;
};

export type RootStackNavigationProp = NativeStackNavigationProp<RootStackParamList>;

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
} 