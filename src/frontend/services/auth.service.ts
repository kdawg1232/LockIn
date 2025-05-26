import { supabase } from '../../lib/supabase';

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
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) throw authError;

      if (!authData.user) throw new Error('No user returned after signup');

      // 2. Insert user data into users table
      const { error: userError } = await supabase
        .from('users')
        .insert({
          id: authData.user.id,
          email,
          username,
          first_name: firstName,
          last_name: lastName,
        });

      if (userError) throw userError;

      return { success: true };
    } catch (error) {
      console.error('Sign up error:', error);
      return { success: false, error };
    }
  },

  async signIn(emailOrUsername: string, password: string) {
    try {
      let email = emailOrUsername;

      // If input doesn't look like an email, assume it's a username
      if (!emailOrUsername.includes('@')) {
        console.log('Attempting to sign in with username:', emailOrUsername);
        
        // Query the users table to get the email for this username
        const selectResult = await supabase
          .from('users')
          .select('email, username'); // Also select username for verification
        
        const { data: userData, error: userError } = await selectResult.ilike('username', emailOrUsername);  // Case-insensitive username match

        console.log('Query result:', { userData, error: userError }); // Log the full query result

        // Handle the case when no user is found with this username
        if (userError || !userData || userData.length === 0) {
          console.log('No user found with username:', emailOrUsername);
          // Let's try to debug by fetching all usernames
          const allUsersResult = await supabase
            .from('users')
            .select('username');
          console.log('Available usernames:', allUsersResult.data);
          if (allUsersResult.error) console.error('Error fetching users:', allUsersResult.error);
          
          return {
            success: false,
            error: 'Invalid username or password'
          };
        }

        // Handle other database errors
        if (userError) {
          console.error('Database error while fetching user:', userError);
          return {
            success: false,
            error: 'An error occurred while signing in'
          };
        }

        email = userData[0].email; // Take the first match
        console.log('Found matching email for username:', { username: userData[0].username, email });
      }

      // Sign in with email
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Auth error:', error);
        return {
          success: false,
          error: 'Invalid username or password'
        };
      }

      return { success: true, user: data.user };
    } catch (error) {
      console.error('Sign in error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'An error occurred during sign in' 
      };
    }
  },
}; 