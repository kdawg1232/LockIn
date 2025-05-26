import 'react-native-url-polyfill/auto';
import { AuthClient } from '@supabase/auth-js';
import * as SecureStore from 'expo-secure-store';
import { EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY } from '@env';

// Validate environment variables
if (!EXPO_PUBLIC_SUPABASE_URL) throw new Error('Missing SUPABASE_URL');
if (!EXPO_PUBLIC_SUPABASE_ANON_KEY) throw new Error('Missing SUPABASE_ANON_KEY');

// Secure storage adapter for auth persistence
const ExpoSecureStoreAdapter = {
  getItem: (key: string): Promise<string | null> => {
    return SecureStore.getItemAsync(key);
  },
  setItem: (key: string, value: string): Promise<void> => {
    return SecureStore.setItemAsync(key, value);
  },
  removeItem: (key: string): Promise<void> => {
    return SecureStore.deleteItemAsync(key);
  },
};

// Create auth client
export const supabaseAuth = new AuthClient({
  url: `${EXPO_PUBLIC_SUPABASE_URL}/auth/v1`,
  headers: {
    apikey: EXPO_PUBLIC_SUPABASE_ANON_KEY,
    authorization: `Bearer ${EXPO_PUBLIC_SUPABASE_ANON_KEY}`,
  },
  autoRefreshToken: false,
  persistSession: false,
  detectSessionInUrl: false,
});

// REST API helper for database operations
class SupabaseRest {
  private baseUrl: string;
  private headers: Record<string, string>;

  constructor() {
    this.baseUrl = `${EXPO_PUBLIC_SUPABASE_URL}/rest/v1`;
    this.headers = {
      'apikey': EXPO_PUBLIC_SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${EXPO_PUBLIC_SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
    };
  }

  private async updateAuthHeader() {
    const session = await supabaseAuth.getSession();
    if (session.data.session?.access_token) {
      this.headers['Authorization'] = `Bearer ${session.data.session.access_token}`;
    }
  }

  from(table: string) {
    return {
      select: async (columns = '*') => {
        await this.updateAuthHeader();
        const response = await fetch(`${this.baseUrl}/${table}?select=${columns}`, {
          headers: this.headers,
        });
        const data = await response.json();
        return { 
          data, 
          error: response.ok ? null : await response.text(),
          eq: (column: string, value: any) => ({
            single: async () => {
              await this.updateAuthHeader();
              const response = await fetch(`${this.baseUrl}/${table}?select=${columns}&${column}=eq.${value}`, {
                headers: this.headers,
              });
              const data = await response.json();
              return { data: Array.isArray(data) ? data[0] : data, error: response.ok ? null : await response.text() };
            },
          }),
          ilike: async (column: string, pattern: string) => {
            await this.updateAuthHeader();
            const response = await fetch(`${this.baseUrl}/${table}?select=${columns}&${column}=ilike.${pattern}`, {
              headers: this.headers,
            });
            return { data: await response.json(), error: response.ok ? null : await response.text() };
          },
        };
      },
      insert: async (data: any) => {
        await this.updateAuthHeader();
        const response = await fetch(`${this.baseUrl}/${table}`, {
          method: 'POST',
          headers: this.headers,
          body: JSON.stringify(data),
        });
        return { data: await response.json(), error: response.ok ? null : await response.text() };
      },
      update: (data: any) => ({
        eq: async (column: string, value: any) => {
          await this.updateAuthHeader();
          const response = await fetch(`${this.baseUrl}/${table}?${column}=eq.${value}`, {
            method: 'PATCH',
            headers: this.headers,
            body: JSON.stringify(data),
          });
          return { data: await response.json(), error: response.ok ? null : await response.text() };
        },
      }),
      eq: (column: string, value: any) => ({
        single: async () => {
          await this.updateAuthHeader();
          const response = await fetch(`${this.baseUrl}/${table}?${column}=eq.${value}`, {
            headers: this.headers,
          });
          const data = await response.json();
          return { data: Array.isArray(data) ? data[0] : data, error: response.ok ? null : await response.text() };
        },
      }),
    };
  }
}

export const supabaseRest = new SupabaseRest();

// Create a unified interface that matches the original supabase client
export const supabase = {
  auth: supabaseAuth,
  from: (table: string) => supabaseRest.from(table),
}; 