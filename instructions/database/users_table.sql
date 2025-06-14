-- Users Database

-- Drop existing table
drop table if exists public.users;

-- Recreate users table with new fields
create table public.users (
  id uuid references auth.users on delete cascade not null primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  email text unique not null,
  username text unique not null,
  first_name text not null,
  last_name text not null,
  university text,
  major text,
  avatar_url text,
  profile_completed boolean default false,
  -- New fields for tasks 1.29-1.30
  focus_score integer default 0 not null, -- Updated when user wins (+10) or loses (-5) daily challenges
  win_streak integer default 0 not null, -- Consecutive days won, resets to 0 on loss
  total_coins integer default 0 not null -- Total accumulated coins from all transactions
);

-- Enable RLS
alter table public.users enable row level security;

-- Create policies
create policy "Users can read their own data" on public.users
  for select using (auth.uid() = id);

create policy "Users can update their own data" on public.users
  for update using (auth.uid() = id);

create policy "Enable insert for authentication users only" on public.users
  for insert
  with check (true);

-- Grant proper permissions
GRANT SELECT, INSERT, UPDATE ON public.users TO authenticated;

-- Create indexes for performance
create index users_email_idx on public.users (email);
create index users_username_idx on public.users (username);

-- Comments for documentation
COMMENT ON TABLE public.users IS 'User profiles with authentication data and game statistics';
COMMENT ON COLUMN public.users.focus_score IS 'Score tracking focus achievements: +10 for daily wins, -5 for losses';
COMMENT ON COLUMN public.users.win_streak IS 'Consecutive days won. Resets to 0 on any loss';
COMMENT ON COLUMN public.users.total_coins IS 'Total accumulated coins from all transactions'; 