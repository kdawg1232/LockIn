-- Group Memberships Database Schema

-- Create group_memberships table
CREATE TABLE public.group_memberships (
  group_id uuid REFERENCES public.groups(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role text DEFAULT 'member' CHECK (role IN ('admin', 'member')) NOT NULL,
  joined_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (group_id, user_id)
);

-- Enable RLS for group_memberships
ALTER TABLE public.group_memberships ENABLE row level security;

-- Create RLS policies for group_memberships
-- Allow authenticated users to read all group memberships
-- (This is appropriate for a social app where users need to see group members)
CREATE POLICY "Authenticated users can read memberships" ON public.group_memberships
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can join groups (via invitations)" ON public.group_memberships
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Group admins can manage memberships (kick members)
CREATE POLICY "Group admins can manage memberships" ON public.group_memberships
  FOR DELETE USING (
    group_id IN (
      SELECT g.id FROM groups g 
      WHERE g.creator_id = auth.uid()
    )
  );

-- Grant permissions
GRANT SELECT, INSERT, DELETE ON public.group_memberships TO authenticated;

-- Create indexes for performance
CREATE INDEX group_memberships_group_id_idx ON public.group_memberships (group_id);
CREATE INDEX group_memberships_user_id_idx ON public.group_memberships (user_id);
CREATE INDEX group_memberships_role_idx ON public.group_memberships (role);

-- Comments for documentation
COMMENT ON TABLE public.group_memberships IS 'Junction table tracking which users belong to which groups';
COMMENT ON COLUMN public.group_memberships.role IS 'Member role: admin (group creator) or member';
COMMENT ON COLUMN public.group_memberships.joined_at IS 'When the user joined the group'; 