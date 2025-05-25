import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

type RootStackParamList = {
  SignIn: undefined;
  SignUp: undefined;
};

type SignInScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'SignIn'>;

export const SignInScreen = () => {
  const navigation = useNavigation<SignInScreenNavigationProp>();

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Locked In</Text>
        <Text style={styles.subtitle}>Welcome back, productivity warrior!</Text>

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#9d9795"
        />

        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#9d9795"
          secureTextEntry
        />

        <TouchableOpacity style={styles.button}>
          <Text style={styles.buttonText}>Sign In</Text>
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
            <Text style={styles.footerLink}>Sign Up</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#cfb991',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 32,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: '#555960',
    marginBottom: 32,
  },
  input: {
    width: '100%',
    height: 50,
    borderWidth: 1,
    borderColor: '#c4bfc0',
    borderRadius: 8,
    paddingHorizontal: 16,
    marginBottom: 16,
    fontSize: 16,
    color: '#000000',
  },
  button: {
    width: '100%',
    height: 50,
    backgroundColor: '#000000',
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    marginTop: 24,
  },
  footerText: {
    color: '#555960',
    fontSize: 16,
  },
  footerLink: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '600',
  },
}); 