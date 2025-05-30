import supabase from '../../lib/supabase';

type SignUpData = {
  email: string;
  password: string;
  username: string;
  firstName: string;
  lastName: string;
};

export const authService = {
  async signUp({ email, password, username, firstName, lastName }: SignUpData) {
    try {
      console.log('🔄 Starting signup process for:', email);
      
      // 1. Create auth user
      const authResult = await supabase.signUp(email, password);
      
      console.log('📊 Auth result:', {
        success: !authResult.error,
        hasUser: !!authResult.user,
        error: authResult.error
      });

      if (authResult.error) {
        console.error('❌ Auth signup failed:', authResult.error);
        return { success: false, error: authResult.error };
      }

      if (!authResult.user) {
        console.error('❌ No user returned after signup');
        return { success: false, error: 'No user returned after signup' };
      }

      console.log('✅ Auth user created, ID:', authResult.user.id);
      console.log('🔄 Attempting to insert user profile...');

      // 2. Insert user data into users table
      const { error: userError } = await supabase
        .from('users')
        .insert({
          id: authResult.user.id,
          email,
          username,
          first_name: firstName,
          last_name: lastName,
        });

      if (userError) {
        console.error('❌ User profile insert failed:', {
          error: userError,
          userData: {
            id: authResult.user.id,
            email,
            username,
            first_name: firstName,
            last_name: lastName,
          }
        });
        return { success: false, error: userError };
      }

      console.log('✅ User profile created successfully');
      
      // Check if email confirmation is required
      if (!authResult.session) {
        console.log('📧 Email confirmation required');
        return { 
          success: true, 
          requiresEmailConfirmation: true,
          message: 'Account created! Please check your email to confirm your account before signing in.'
        };
      }
      
      return { success: true };
    } catch (error) {
      console.error('❌ Unexpected signup error:', error);
      return { success: false, error: 'An error occurred during sign up' };
    }
  },

  async signIn(emailOrUsername: string, password: string) {
    try {
      let email = emailOrUsername;

      // If input doesn't look like an email, assume it's a username
      if (!emailOrUsername.includes('@')) {
        console.log('Attempting to sign in with username:', emailOrUsername);
        
        // Query the users table to get the email for this username
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('email, username')
          .eq('username', emailOrUsername);

        if (userError || !userData || !Array.isArray(userData) || userData.length === 0) {
          console.log('No user found with username:', emailOrUsername);
          return {
            success: false,
            error: 'Invalid username or password'
          };
        }

        email = userData[0].email;
        console.log('Found matching email for username:', { username: userData[0].username, email });
      }

      // Sign in with email
      const authResult = await supabase.signInWithPassword(email, password);

      if (authResult.error) {
        console.error('Auth error:', authResult.error);
        return {
          success: false,
          error: 'Invalid username or password'
        };
      }

      return { success: true, user: authResult.user };
    } catch (error) {
      console.error('Sign in error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'An error occurred during sign in' 
      };
    }
  },
}; 