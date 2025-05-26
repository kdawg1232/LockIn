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
 * Currently empty as tables will be added during development.
 */
export interface Database {
  public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
