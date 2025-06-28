-- Group Invitations Database Schema

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

-- Enable RLS for group_invitations
ALTER TABLE public.group_invitations ENABLE row level security;

-- Create RLS policies for group_invitations
CREATE POLICY "Users can read their own invitations" ON public.group_invitations
  FOR SELECT USING (
    auth.uid() = invitee_id OR 
    auth.uid() = inviter_id OR
    auth.uid() IN (
      SELECT creator_id FROM groups WHERE id = group_id
    )
  );

CREATE POLICY "Group members can create invitations" ON public.group_invitations
  FOR INSERT WITH CHECK (
    auth.uid() = inviter_id AND
    group_id IN (
      SELECT group_id FROM group_memberships WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Invitees can update their invitation status" ON public.group_invitations
  FOR UPDATE USING (auth.uid() = invitee_id);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON public.group_invitations TO authenticated;

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