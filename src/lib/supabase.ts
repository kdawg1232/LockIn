import AsyncStorage from '@react-native-async-storage/async-storage';
import { Database } from '../types/database.types';

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

interface QueryBuilder<T> {
  select: (columns?: string) => QueryFilter<T>;
  insert: (values: Partial<T>) => Promise<DatabaseResponse<T>>;
  update: (values: Partial<T>) => QueryFilter<T>;
  delete: () => QueryFilter<T>;
}

interface QueryFilter<T> {
  eq: (column: string, value: any) => Promise<DatabaseResponse<T>>;
  neq: (column: string, value: any) => Promise<DatabaseResponse<T>>;
  gt: (column: string, value: any) => Promise<DatabaseResponse<T>>;
  gte: (column: string, value: any) => Promise<DatabaseResponse<T>>;
  lt: (column: string, value: any) => Promise<DatabaseResponse<T>>;
  lte: (column: string, value: any) => Promise<DatabaseResponse<T>>;
  like: (column: string, pattern: string) => Promise<DatabaseResponse<T>>;
  ilike: (column: string, pattern: string) => Promise<DatabaseResponse<T>>;
  is: (column: string, value: any) => Promise<DatabaseResponse<T>>;
  in: (column: string, values: any[]) => Promise<DatabaseResponse<T>>;
  contains: (column: string, value: any) => Promise<DatabaseResponse<T>>;
  containedBy: (column: string, value: any) => Promise<DatabaseResponse<T>>;
  rangeLt: (column: string, range: any) => Promise<DatabaseResponse<T>>;
  rangeGt: (column: string, range: any) => Promise<DatabaseResponse<T>>;
  rangeGte: (column: string, range: any) => Promise<DatabaseResponse<T>>;
  rangeLte: (column: string, range: any) => Promise<DatabaseResponse<T>>;
  rangeAdjacent: (column: string, range: any) => Promise<DatabaseResponse<T>>;
  overlaps: (column: string, value: any) => Promise<DatabaseResponse<T>>;
  textSearch: (column: string, query: string, config?: string) => Promise<DatabaseResponse<T>>;
  match: (query: object) => Promise<DatabaseResponse<T>>;
  not: (column: string, operator: string, value: any) => Promise<DatabaseResponse<T>>;
  or: (filters: string, values?: any) => Promise<DatabaseResponse<T>>;
  filter: (column: string, operator: string, value: any) => Promise<DatabaseResponse<T>>;
  limit: (count: number) => QueryFilter<T>;
  order: (column: string, options?: { ascending?: boolean; nullsFirst?: boolean; foreignTable?: string }) => QueryFilter<T>;
  single: () => Promise<DatabaseResponse<T>>;
  maybeSingle: () => Promise<DatabaseResponse<T>>;
  select: (columns?: string) => QueryFilter<T>;
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
      console.log('🔗 Making signup request to:', `${this.baseUrl}/auth/v1/signup`);
      console.log('🔑 Using API key:', this.anonKey.substring(0, 20) + '...');
      
      const response = await fetch(`${this.baseUrl}/auth/v1/signup`, {
        method: 'POST',
        headers: {
          'apikey': this.anonKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      
      console.log('📡 Signup response status:', response.status);
      console.log('📄 Signup response data:', data);

      if (!response.ok) {
        console.error('❌ Signup request failed:', {
          status: response.status,
          statusText: response.statusText,
          data
        });
        return { user: null, session: null, error: data.error_description || data.msg || 'Sign up failed' };
      }

      // Convert Supabase user format to our User interface
      const user: User | null = data.id ? {
        id: data.id,
        email: data.email,
        created_at: data.created_at,
        email_confirmed_at: data.email_confirmed_at
      } : null;

      // Store session if provided (user is immediately confirmed)
      if (data.access_token) {
        console.log('🎫 Access token received, storing session');
        const session: Session = {
          access_token: data.access_token,
          refresh_token: data.refresh_token,
          expires_at: data.expires_at,
          user: user!,
        };
        await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));
        return { user, session, error: null };
      }

      // No access token means email confirmation is required, but user was created successfully
      if (user) {
        console.log('✅ User created successfully, email confirmation required');
        return { user, session: null, error: null };
      }

      console.error('❌ No user data in successful response');
      return { user: null, session: null, error: 'No user data returned' };
    } catch (error) {
      console.error('🚨 Network error during signup:', error);
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
  from<T = any>(table: string): QueryBuilder<T> {
    const baseUrl = `${this.baseUrl}/rest/v1/${table}`;
    const headers = this.getAuthHeaders();

    const makeRequest = async (url: string, options: RequestInit = {}): Promise<DatabaseResponse<T>> => {
      try {
        const response = await fetch(url, { 
          headers: await headers,
          ...options 
        });
        const data = await response.json();
        return response.ok ? { data, error: null } : { data: null, error: data.message || 'Query failed' };
      } catch (error) {
        return { data: null, error: 'Network error' };
      }
    };

    const queryFilter = this.createQueryFilter<T>(table, '*', baseUrl, headers);

    return {
      select: (columns = '*') => this.createQueryFilter<T>(table, columns, baseUrl, headers),
      insert: async (values) => {
        return makeRequest(baseUrl, {
          method: 'POST',
          body: JSON.stringify(values)
        });
      },
      update: (values) => ({
        ...queryFilter,
        eq: async (column, value) => {
          return makeRequest(`${baseUrl}?${column}=eq.${value}`, {
            method: 'PATCH',
            body: JSON.stringify(values)
          });
        }
      }),
      delete: () => ({
        ...queryFilter,
        eq: async (column, value) => {
          return makeRequest(`${baseUrl}?${column}=eq.${value}`, {
            method: 'DELETE'
          });
        }
      })
    };
  }

  private createQueryFilter<T>(
    table: string, 
    columns = '*',
    baseUrl: string,
    headers: Promise<Record<string, string>>
  ): QueryFilter<T> {
    const makeRequest = async (url: string, options: RequestInit = {}): Promise<DatabaseResponse<T>> => {
      try {
        const response = await fetch(url, { 
          headers: await headers,
          ...options 
        });
        const data = await response.json();
        return response.ok ? { data, error: null } : { data: null, error: data.message || 'Query failed' };
      } catch (error) {
        return { data: null, error: 'Network error' };
      }
    };

    return {
      eq: async (column, value) => makeRequest(`${baseUrl}?select=${columns}&${column}=eq.${value}`),
      neq: async (column, value) => makeRequest(`${baseUrl}?select=${columns}&${column}=neq.${value}`),
      gt: async (column, value) => makeRequest(`${baseUrl}?select=${columns}&${column}=gt.${value}`),
      gte: async (column, value) => makeRequest(`${baseUrl}?select=${columns}&${column}=gte.${value}`),
      lt: async (column, value) => makeRequest(`${baseUrl}?select=${columns}&${column}=lt.${value}`),
      lte: async (column, value) => makeRequest(`${baseUrl}?select=${columns}&${column}=lte.${value}`),
      like: async (column, pattern) => makeRequest(`${baseUrl}?select=${columns}&${column}=like.${pattern}`),
      ilike: async (column, pattern) => makeRequest(`${baseUrl}?select=${columns}&${column}=ilike.${pattern}`),
      is: async (column, value) => makeRequest(`${baseUrl}?select=${columns}&${column}=is.${value}`),
      in: async (column, values) => makeRequest(`${baseUrl}?select=${columns}&${column}=in.(${values.join(',')})`),
      contains: async (column, value) => makeRequest(`${baseUrl}?select=${columns}&${column}=cs.${value}`),
      containedBy: async (column, value) => makeRequest(`${baseUrl}?select=${columns}&${column}=cd.${value}`),
      rangeLt: async (column, range) => makeRequest(`${baseUrl}?select=${columns}&${column}=sl.${range}`),
      rangeGt: async (column, range) => makeRequest(`${baseUrl}?select=${columns}&${column}=sr.${range}`),
      rangeGte: async (column, range) => makeRequest(`${baseUrl}?select=${columns}&${column}=nxl.${range}`),
      rangeLte: async (column, range) => makeRequest(`${baseUrl}?select=${columns}&${column}=nxr.${range}`),
      rangeAdjacent: async (column, range) => makeRequest(`${baseUrl}?select=${columns}&${column}=adj.${range}`),
      overlaps: async (column, value) => makeRequest(`${baseUrl}?select=${columns}&${column}=ov.${value}`),
      textSearch: async (column, query, config) => makeRequest(`${baseUrl}?select=${columns}&${column}=fts${config ? `(${config})` : ''}.${query}`),
      match: async (query) => makeRequest(`${baseUrl}?select=${columns}&${new URLSearchParams(query as any).toString()}`),
      not: async (column, operator, value) => makeRequest(`${baseUrl}?select=${columns}&${column}=not.${operator}.${value}`),
      or: async (filters, values) => makeRequest(`${baseUrl}?select=${columns}&or=(${filters})${values ? `&${new URLSearchParams(values).toString()}` : ''}`),
      filter: async (column, operator, value) => makeRequest(`${baseUrl}?select=${columns}&${column}=${operator}.${value}`),
      limit: (count) => {
        const url = `${baseUrl}?select=${columns}&limit=${count}`;
        return {
          ...this.createQueryFilter<T>(table, columns, baseUrl, headers),
          single: async () => makeRequest(url)
        };
      },
      order: (column, options = {}) => {
        const { ascending = true, nullsFirst = false, foreignTable } = options;
        const order = `${foreignTable ? `${foreignTable}.` : ''}${column}.${ascending ? 'asc' : 'desc'}.nulls${nullsFirst ? 'first' : 'last'}`;
        return this.createQueryFilter<T>(table, columns, baseUrl, headers);
      },
      single: async () => makeRequest(`${baseUrl}?select=${columns}&limit=1`),
      maybeSingle: async () => makeRequest(`${baseUrl}?select=${columns}&limit=1`),
      select: (newColumns = '*') => this.createQueryFilter<T>(table, newColumns, baseUrl, headers)
    };
  }

  // RPC (Remote Procedure Call) for database functions
  async rpc(functionName: string, params: Record<string, any> = {}): Promise<DatabaseResponse> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.baseUrl}/rest/v1/rpc/${functionName}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(params),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        return { data: null, error: data.message || 'RPC call failed' };
      }
      
      return { data, error: null };
    } catch (error) {
      return { data: null, error: 'Network error during RPC call' };
    }
  }
}

// Create and export the client
const supabase = new SupabaseRestClient();

export { supabase };
export default supabase; 