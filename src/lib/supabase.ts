import AsyncStorage from '@react-native-async-storage/async-storage';

// Supabase configuration
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

// Storage keys
const SESSION_KEY = 'supabase.auth.token';
const USER_KEY = 'supabase.auth.user';

interface User {
  id: string;
  email: string;
  created_at: string;
  email_confirmed_at?: string;
}

interface Session {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  user: User;
}

interface AuthResponse {
  user: User | null;
  session: Session | null;
  error: string | null;
}

interface DatabaseResponse<T = any> {
  data: T | null;
  error: string | null;
}

class SupabaseRestClient {
  private baseUrl: string;
  private anonKey: string;

  constructor() {
    this.baseUrl = SUPABASE_URL;
    this.anonKey = SUPABASE_ANON_KEY;
  }

  // Get current session from storage
  async getSession(): Promise<{ data: { session: Session | null } }> {
    try {
      const sessionData = await AsyncStorage.getItem(SESSION_KEY);
      const session = sessionData ? JSON.parse(sessionData) : null;
      
      // Check if session is expired
      if (session && session.expires_at && Date.now() / 1000 > session.expires_at) {
        await this.clearSession();
        return { data: { session: null } };
      }
      
      return { data: { session } };
    } catch {
      return { data: { session: null } };
    }
  }

  // Get current user
  async getUser(): Promise<{ data: { user: User | null } }> {
    const { data: { session } } = await this.getSession();
    return { data: { user: session?.user || null } };
  }

  // Clear session from storage
  async clearSession(): Promise<void> {
    await AsyncStorage.multiRemove([SESSION_KEY, USER_KEY]);
  }

  // Sign up with email and password
  async signUp(email: string, password: string): Promise<AuthResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/auth/v1/signup`, {
        method: 'POST',
        headers: {
          'apikey': this.anonKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { user: null, session: null, error: data.error_description || data.msg || 'Sign up failed' };
      }

      // Store session if provided
      if (data.access_token) {
        const session: Session = {
          access_token: data.access_token,
          refresh_token: data.refresh_token,
          expires_at: data.expires_at,
          user: data.user,
        };
        await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));
        return { user: data.user, session, error: null };
      }

      return { user: data.user, session: null, error: null };
    } catch (error) {
      return { user: null, session: null, error: 'Network error during sign up' };
    }
  }

  // Sign in with email and password
  async signInWithPassword(email: string, password: string): Promise<AuthResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: {
          'apikey': this.anonKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { user: null, session: null, error: data.error_description || data.msg || 'Sign in failed' };
      }

      const session: Session = {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_at: data.expires_at,
        user: data.user,
      };

      await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));
      return { user: data.user, session, error: null };
    } catch (error) {
      return { user: null, session: null, error: 'Network error during sign in' };
    }
  }

  // Sign out
  async signOut(): Promise<{ error: string | null }> {
    try {
      const { data: { session } } = await this.getSession();
      
      if (session) {
        await fetch(`${this.baseUrl}/auth/v1/logout`, {
          method: 'POST',
          headers: {
            'apikey': this.anonKey,
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        });
      }

      await this.clearSession();
      return { error: null };
    } catch (error) {
      await this.clearSession(); // Clear local session even if API call fails
      return { error: null };
    }
  }

  // Get authorization headers
  private async getAuthHeaders(): Promise<Record<string, string>> {
    const { data: { session } } = await this.getSession();
    
    return {
      'apikey': this.anonKey,
      'Authorization': `Bearer ${session?.access_token || this.anonKey}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
    };
  }

  // Database operations
  from(table: string) {
    return {
      // Select data
      select: (columns = '*') => ({
        eq: async (column: string, value: any) => {
          try {
            const headers = await this.getAuthHeaders();
            const response = await fetch(
              `${this.baseUrl}/rest/v1/${table}?select=${columns}&${column}=eq.${value}`,
              { headers }
            );
            const data = await response.json();
            
            if (!response.ok) {
              return { data: null, error: data.message || 'Query failed' };
            }
            
            return { data, error: null };
          } catch (error) {
            return { data: null, error: 'Network error' };
          }
        },

        neq: async (column: string, value: any) => {
          try {
            const headers = await this.getAuthHeaders();
            const response = await fetch(
              `${this.baseUrl}/rest/v1/${table}?select=${columns}&${column}=neq.${value}`,
              { headers }
            );
            const data = await response.json();
            
            if (!response.ok) {
              return { data: null, error: data.message || 'Query failed' };
            }
            
            return { data, error: null };
          } catch (error) {
            return { data: null, error: 'Network error' };
          }
        },

        limit: (count: number) => ({
          single: async () => {
            try {
              const headers = await this.getAuthHeaders();
              const response = await fetch(
                `${this.baseUrl}/rest/v1/${table}?select=${columns}&limit=${count}`,
                { headers }
              );
              const data = await response.json();
              
              if (!response.ok) {
                return { data: null, error: data.message || 'Query failed' };
              }
              
              return { data: Array.isArray(data) ? data[0] : data, error: null };
            } catch (error) {
              return { data: null, error: 'Network error' };
            }
          },
        }),

        single: async () => {
          try {
            const headers = await this.getAuthHeaders();
            const response = await fetch(
              `${this.baseUrl}/rest/v1/${table}?select=${columns}&limit=1`,
              { headers }
            );
            const data = await response.json();
            
            if (!response.ok) {
              return { data: null, error: data.message || 'Query failed' };
            }
            
            return { data: Array.isArray(data) ? data[0] : data, error: null };
          } catch (error) {
            return { data: null, error: 'Network error' };
          }
        },
      }),

      // Insert data
      insert: async (insertData: any) => {
        try {
          const headers = await this.getAuthHeaders();
          const response = await fetch(`${this.baseUrl}/rest/v1/${table}`, {
            method: 'POST',
            headers,
            body: JSON.stringify(insertData),
          });
          
          const data = await response.json();
          
          if (!response.ok) {
            return { data: null, error: data.message || 'Insert failed' };
          }
          
          return { data, error: null };
        } catch (error) {
          return { data: null, error: 'Network error' };
        }
      },

      // Update data
      update: (updateData: any) => ({
        eq: async (column: string, value: any) => {
          try {
            const headers = await this.getAuthHeaders();
            const response = await fetch(
              `${this.baseUrl}/rest/v1/${table}?${column}=eq.${value}`,
              {
                method: 'PATCH',
                headers,
                body: JSON.stringify(updateData),
              }
            );
            
            const data = await response.json();
            
            if (!response.ok) {
              return { data: null, error: data.message || 'Update failed' };
            }
            
            return { data, error: null };
          } catch (error) {
            return { data: null, error: 'Network error' };
          }
        },
      }),
    };
  }
}

// Create and export the client
const supabase = new SupabaseRestClient();

export { supabase };
export default supabase; 