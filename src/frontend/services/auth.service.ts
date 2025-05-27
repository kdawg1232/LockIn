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
      // 1. Create auth user
      const authResult = await supabase.signUp(email, password);

      if (authResult.error) {
        return { success: false, error: authResult.error };
      }

      if (!authResult.user) {
        return { success: false, error: 'No user returned after signup' };
      }

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
        return { success: false, error: userError };
      }

      return { success: true };
    } catch (error) {
      console.error('Sign up error:', error);
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