/**
 * Type definitions for the Supabase database schema.
 * This file serves as a single source of truth for database types.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

/**
 * Database interface representing the Supabase schema.
 */
export interface Database {
  public: {
    Tables: {
      daily_pairings: {
        Row: DailyPairing;
        Insert: Omit<DailyPairing, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<DailyPairing, 'id'>>;
      };
      group_memberships: {
        Row: {
          id: string;
          group_id: string;
          user_id: string;
          role: string;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['group_memberships']['Row'], 'id' | 'created_at'>;
        Update: Partial<Omit<Database['public']['Tables']['group_memberships']['Row'], 'id'>>;
      };
      groups: {
        Row: {
          id: string;
          name: string;
          description?: string;
          creator_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['groups']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Database['public']['Tables']['groups']['Row'], 'id'>>;
      };
      coin_transactions: {
        Row: {
          id: string;
          user_id: string;
          amount: number;
          description: string;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['coin_transactions']['Row'], 'id' | 'created_at'>;
        Update: Partial<Omit<Database['public']['Tables']['coin_transactions']['Row'], 'id'>>;
      };
    };
    Views: {
      [_ in never]: never
    };
    Functions: {
      [_ in never]: never
    };
    Enums: {
      [_ in never]: never
    };
  }
}

export interface DailyPairing {
  id: string;
  group_id: string;
  date: string;
  pairs: PairData[];
  created_at: string;
  updated_at: string;
}

export interface PairData {
  user1_id: string;
  user2_id: string;
  is_extra_pair?: boolean;
}
