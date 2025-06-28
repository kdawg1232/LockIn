-- Groups Database Schema

-- Drop existing tables if they exist
DROP TABLE IF EXISTS public.group_invitations;
DROP TABLE IF EXISTS public.group_memberships;
DROP TABLE IF EXISTS public.groups;

-- Create groups table
CREATE TABLE public.groups (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  creator_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for groups
ALTER TABLE public.groups ENABLE row level security;

-- Create RLS policies for groups
CREATE POLICY "Users can read groups they are members of" ON public.groups
  FOR SELECT USING (
    id IN (
      SELECT group_id FROM group_memberships WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create groups" ON public.groups
  FOR INSERT WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Group creators can update their groups" ON public.groups
  FOR UPDATE USING (auth.uid() = creator_id);

CREATE POLICY "Group creators can delete their groups" ON public.groups
  FOR DELETE USING (auth.uid() = creator_id);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.groups TO authenticated;

-- Create indexes for performance
CREATE INDEX groups_creator_id_idx ON public.groups (creator_id);
CREATE INDEX groups_created_at_idx ON public.groups (created_at);

-- Comments for documentation
COMMENT ON TABLE public.groups IS 'Groups where users can compete against each other';
COMMENT ON COLUMN public.groups.name IS 'Display name of the group';
COMMENT ON COLUMN public.groups.description IS 'Optional description of the group purpose';
COMMENT ON COLUMN public.groups.creator_id IS 'User who created the group (admin with full permissions)'; 