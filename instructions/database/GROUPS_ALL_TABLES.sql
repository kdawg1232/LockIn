-- =====================================================
-- GROUPS FEATURE - ALL TABLES
-- Complete SQL for Groups, Memberships, and Invitations
-- Updated: December 2024 - Added proper DELETE support
-- 
-- INSTRUCTIONS:
-- 1. Copy this entire file
-- 2. Go to Supabase Dashboard → SQL Editor
-- 3. Paste and run this script
-- 4. This will create all tables, policies, and indexes needed
-- =====================================================

-- First, drop ALL existing policies to avoid conflicts
-- Drop group_invitations policies
DROP POLICY IF EXISTS "Users can read their own invitations" ON public.group_invitations;
DROP POLICY IF EXISTS "Group members can create invitations" ON public.group_invitations;
DROP POLICY IF EXISTS "Invitees can update their invitation status" ON public.group_invitations;
DROP POLICY IF EXISTS "Group creators can delete invitations" ON public.group_invitations;

-- Drop group_memberships policies
DROP POLICY IF EXISTS "Users can read memberships for their groups" ON public.group_memberships;
DROP POLICY IF EXISTS "Users can read their own memberships" ON public.group_memberships;
DROP POLICY IF EXISTS "Users can read group member lists" ON public.group_memberships;
DROP POLICY IF EXISTS "Users can read all memberships" ON public.group_memberships;
DROP POLICY IF EXISTS "Authenticated users can read memberships" ON public.group_memberships;
DROP POLICY IF EXISTS "Users can join groups (via invitations)" ON public.group_memberships;
DROP POLICY IF EXISTS "Group admins can manage memberships" ON public.group_memberships;
DROP POLICY IF EXISTS "Users can leave groups" ON public.group_memberships;

-- Drop groups policies  
DROP POLICY IF EXISTS "Users can read groups they are members of" ON public.groups;
DROP POLICY IF EXISTS "Authenticated users can read groups" ON public.groups;
DROP POLICY IF EXISTS "Users can create groups" ON public.groups;
DROP POLICY IF EXISTS "Authenticated users can create groups" ON public.groups;
DROP POLICY IF EXISTS "Group creators can update their groups" ON public.groups;
DROP POLICY IF EXISTS "Group creators can delete their groups" ON public.groups;

-- Now drop existing tables (in reverse order due to dependencies)
DROP TABLE IF EXISTS public.group_invitations CASCADE;
DROP TABLE IF EXISTS public.group_memberships CASCADE;
DROP TABLE IF EXISTS public.groups CASCADE;

-- =====================================================
-- 1. GROUPS TABLE
-- =====================================================

-- Create groups table
CREATE TABLE public.groups (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  creator_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for groups (policies added later after all tables exist)
ALTER TABLE public.groups ENABLE row level security;

-- Grant permissions (including DELETE for group creators)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.groups TO authenticated;

-- Create indexes for performance
CREATE INDEX groups_creator_id_idx ON public.groups (creator_id);
CREATE INDEX groups_created_at_idx ON public.groups (created_at);

-- Comments for documentation
COMMENT ON TABLE public.groups IS 'Groups where users can compete against each other';
COMMENT ON COLUMN public.groups.name IS 'Display name of the group';
COMMENT ON COLUMN public.groups.description IS 'Optional description of the group purpose';
COMMENT ON COLUMN public.groups.creator_id IS 'User who created the group (admin with full permissions)';

-- =====================================================
-- 2. GROUP MEMBERSHIPS TABLE
-- =====================================================

-- Create group_memberships table
CREATE TABLE public.group_memberships (
  group_id uuid REFERENCES public.groups(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role text DEFAULT 'member' CHECK (role IN ('admin', 'member')) NOT NULL,
  joined_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (group_id, user_id)
);

-- Enable RLS for group_memberships (policies added later after all tables exist)
ALTER TABLE public.group_memberships ENABLE row level security;

-- Grant permissions (including DELETE for leaving groups)
GRANT SELECT, INSERT, DELETE ON public.group_memberships TO authenticated;

-- Create indexes for performance
CREATE INDEX group_memberships_group_id_idx ON public.group_memberships (group_id);
CREATE INDEX group_memberships_user_id_idx ON public.group_memberships (user_id);
CREATE INDEX group_memberships_role_idx ON public.group_memberships (role);

-- Comments for documentation
COMMENT ON TABLE public.group_memberships IS 'Junction table tracking which users belong to which groups';
COMMENT ON COLUMN public.group_memberships.role IS 'Member role: admin (group creator) or member';
COMMENT ON COLUMN public.group_memberships.joined_at IS 'When the user joined the group';

-- =====================================================
-- 3. GROUP INVITATIONS TABLE
-- =====================================================

-- Create group_invitations table
CREATE TABLE public.group_invitations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id uuid REFERENCES public.groups(id) ON DELETE CASCADE NOT NULL,
  inviter_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  invitee_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')) NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for group_invitations (policies added later after all tables exist)
ALTER TABLE public.group_invitations ENABLE row level security;

-- Grant permissions (including DELETE for managing invitations)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.group_invitations TO authenticated;

-- Create indexes for performance
CREATE INDEX group_invitations_group_id_idx ON public.group_invitations (group_id);
CREATE INDEX group_invitations_invitee_id_idx ON public.group_invitations (invitee_id);
CREATE INDEX group_invitations_status_idx ON public.group_invitations (status);
CREATE INDEX group_invitations_created_at_idx ON public.group_invitations (created_at);

-- Unique constraint to prevent duplicate pending invitations
CREATE UNIQUE INDEX group_invitations_unique_pending_idx ON public.group_invitations (group_id, invitee_id)
WHERE status = 'pending';

-- Comments for documentation
COMMENT ON TABLE public.group_invitations IS 'Invitations sent to users to join groups';
COMMENT ON COLUMN public.group_invitations.status IS 'Invitation status: pending, accepted, or declined';
COMMENT ON COLUMN public.group_invitations.inviter_id IS 'User who sent the invitation';
COMMENT ON COLUMN public.group_invitations.invitee_id IS 'User who received the invitation';

-- =====================================================
-- 4. RLS POLICIES (added after all tables exist)
-- =====================================================

-- Groups table policies
-- Allow authenticated users to read all groups (simplified for social app)
CREATE POLICY "Authenticated users can read groups" ON public.groups
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Allow authenticated users to create groups
CREATE POLICY "Authenticated users can create groups" ON public.groups
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Allow group creators to update their groups
CREATE POLICY "Group creators can update their groups" ON public.groups
  FOR UPDATE USING (auth.uid() = creator_id);

-- Allow group creators to delete their groups  
CREATE POLICY "Group creators can delete their groups" ON public.groups
  FOR DELETE USING (auth.uid() = creator_id);

-- Group memberships table policies
-- Allow authenticated users to read all group memberships
-- (This is appropriate for a social app where users need to see group members)
CREATE POLICY "Authenticated users can read memberships" ON public.group_memberships
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Allow users to join groups (via invitations)
CREATE POLICY "Users can join groups (via invitations)" ON public.group_memberships
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Allow group creators to remove members AND allow users to leave groups themselves
CREATE POLICY "Group admins can manage memberships" ON public.group_memberships
  FOR DELETE USING (
    -- Group creator can remove any member
    group_id IN (
      SELECT g.id FROM groups g 
      WHERE g.creator_id = auth.uid()
    )
    OR
    -- Users can leave groups themselves (self-removal)
    auth.uid() = user_id
  );

-- Group invitations table policies
-- Allow users to read their own invitations and group creators to read invitations for their groups
CREATE POLICY "Users can read their own invitations" ON public.group_invitations
  FOR SELECT USING (
    auth.uid() = invitee_id OR 
    auth.uid() = inviter_id OR
    auth.uid() IN (
      SELECT creator_id FROM groups WHERE id = group_id
    )
  );

-- Allow group members to create invitations
CREATE POLICY "Group members can create invitations" ON public.group_invitations
  FOR INSERT WITH CHECK (
    auth.uid() = inviter_id AND
    group_id IN (
      SELECT group_id FROM group_memberships WHERE user_id = auth.uid()
    )
  );

-- Allow invitees to update their invitation status
CREATE POLICY "Invitees can update their invitation status" ON public.group_invitations
  FOR UPDATE USING (auth.uid() = invitee_id);

-- Allow group creators to delete invitations for their groups
CREATE POLICY "Group creators can delete invitations" ON public.group_invitations
  FOR DELETE USING (
    auth.uid() IN (
      SELECT creator_id FROM groups WHERE id = group_id
    )
  );

-- =====================================================
-- SETUP COMPLETE
-- =====================================================

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Groups feature database setup completed successfully!';
    RAISE NOTICE 'Created tables: groups, group_memberships, group_invitations';
    RAISE NOTICE 'Applied RLS policies and indexes for optimal performance';
    RAISE NOTICE 'Added proper DELETE support for all operations';
END $$; 