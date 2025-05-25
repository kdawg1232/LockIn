import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { SignUpScreen } from '../../../screens/auth/SignUpScreen';
import { supabase } from '../../../../lib/supabase';
import { Alert } from 'react-native';

// Mock dependencies
jest.mock('../../../../lib/supabase', () => ({
  supabase: {
    auth: {
      signUp: jest.fn(),
    },
  },
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
  }),
}));

describe('SignUpScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Expected use case test
  it('should handle successful sign up', async () => {
    const { getByTestId } = render(<SignUpScreen />);
    
    // Fill in valid credentials
    fireEvent.changeText(getByTestId('email-input'), 'test@example.com');
    fireEvent.changeText(getByTestId('password-input'), 'password123');
    
    // Mock successful signup
    (supabase.auth.signUp as jest.Mock).mockResolvedValueOnce({ error: null });
    
    // Trigger sign up
    fireEvent.press(getByTestId('signup-button'));
    
    await waitFor(() => {
      expect(supabase.auth.signUp).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
    });
  });

  // Edge case test
  it('should validate email format', async () => {
    const { getByTestId } = render(<SignUpScreen />);
    const alertSpy = jest.spyOn(Alert, 'alert');
    
    // Fill in invalid email
    fireEvent.changeText(getByTestId('email-input'), 'invalid-email');
    fireEvent.changeText(getByTestId('password-input'), 'password123');
    
    // Trigger sign up
    fireEvent.press(getByTestId('signup-button'));
    
    expect(alertSpy).toHaveBeenCalledWith('Error', 'Please enter a valid email address');
    expect(supabase.auth.signUp).not.toHaveBeenCalled();
  });

  // Failure case test
  it('should handle signup error from Supabase', async () => {
    const { getByTestId } = render(<SignUpScreen />);
    const alertSpy = jest.spyOn(Alert, 'alert');
    
    // Fill in valid credentials
    fireEvent.changeText(getByTestId('email-input'), 'test@example.com');
    fireEvent.changeText(getByTestId('password-input'), 'password123');
    
    // Mock Supabase error
    const error = new Error('Email already registered');
    (supabase.auth.signUp as jest.Mock).mockRejectedValueOnce(error);
    
    // Trigger sign up
    fireEvent.press(getByTestId('signup-button'));
    
    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Error', error.message);
    });
  });
}); 