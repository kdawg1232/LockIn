/**
 * Tests for Supabase client configuration and initialization
 */

import { supabase } from '../../lib/supabase';

describe('Supabase Client Configuration', () => {
  // Test expected use
  test('supabase client is properly initialized', () => {
    expect(supabase).toBeDefined();
    expect(supabase.auth).toBeDefined();
  });

  // Test edge case
  test('supabase client has auth configuration', () => {
    expect(supabase.auth.getSession).toBeDefined();
    expect(typeof supabase.auth.getSession).toBe('function');
  });

  // Test failure case
  test('supabase client handles invalid auth attempts', async () => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'invalid@email.com',
      password: 'invalid-password'
    });
    expect(data.session).toBeNull();
    expect(error).toBeDefined();
  });
}); 