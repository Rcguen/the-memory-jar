-- 1. Create profiles table
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  username text unique not null,
  email text unique not null,
  display_name text not null,
  avatar text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Enable Row Level Security (RLS)
alter table public.profiles enable row level security;

-- 3. Create RLS Policies

-- The RPC function will bypass this for the specific email lookup.
create policy "Users can view their own profile."
  on public.profiles for select
  using ( auth.uid() = id );

create policy "Users can update their own profile."
  on public.profiles for update
  using ( auth.uid() = id );

-- 4. Create secure RPC function to get email by username
-- This function runs as SECURITY DEFINER, meaning it bypasses RLS
-- and executes with the privileges of the role that created it (usually postgres).
create or replace function public.get_email_by_username(lookup_username text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  user_email text;
begin
  select email into user_email
  from public.profiles
  where username = lookup_username
  limit 1;
  
  return user_email;
end;
$$;

-- 5. Grant execute permissions
-- Allow the anonymous role to execute this function so unauthenticated users can look up their email during login.
grant execute on function public.get_email_by_username(text) to anon, authenticated;

-- Note:
-- To use this system, you must first create the two users (Selene and Ritchi) in Supabase Authentication.
-- Then, insert their corresponding records into this `profiles` table using their newly generated `auth.users(id)`.

-- 6. Create relationship_settings table
create table public.relationship_settings (
  id uuid default gen_random_uuid() primary key,
  start_date timestamp with time zone not null,
  anniversary_type text default 'yearly',
  timezone text default 'UTC',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Ensure only one relationship settings row exists (optional but good practice for this app)
create unique index relationship_settings_single_row_idx on public.relationship_settings ((true));

-- 6.1 Create relationship_members table
create table public.relationship_members (
  id uuid default gen_random_uuid() primary key,
  relationship_id uuid references public.relationship_settings(id) on delete cascade not null,
  profile_id uuid references public.profiles(id) on delete cascade not null,
  role text default 'partner',
  display_name text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (relationship_id, profile_id)
);

-- Enable RLS for relationship_settings & members
alter table public.relationship_settings enable row level security;
alter table public.relationship_members enable row level security;

-- Create policies (read-only for authenticated users)
create policy "Authenticated users can read relationship_settings."
  on public.relationship_settings for select
  to authenticated
  using ( true );

create policy "Authenticated users can read relationship_members."
  on public.relationship_members for select
  to authenticated
  using ( true );

-- 7. Create memory_moods table (predefined)
create table public.memory_moods (
  id text primary key, -- e.g., 'love', 'happy'
  emoji text not null,
  name text not null,
  color text not null, -- Tailwind color class or hex
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Seed predefined moods
insert into public.memory_moods (id, emoji, name, color) values
  ('love', '❤️', 'Love', 'text-rose-500'),
  ('emotional', '🥹', 'Emotional', 'text-blue-500'),
  ('joy', '😂', 'Joy', 'text-amber-500'),
  ('peace', '🌸', 'Peace', 'text-pink-400'),
  ('magic', '✨', 'Magic', 'text-yellow-400'),
  ('night', '🌙', 'Night', 'text-indigo-400'),
  ('day', '☀️', 'Day', 'text-orange-400')
on conflict (id) do nothing;

-- Enable RLS for memory_moods
alter table public.memory_moods enable row level security;
create policy "Authenticated users can view memory_moods."
  on public.memory_moods for select
  to authenticated
  using ( true );

-- 8. Create memories table
create type public.memory_type as enum (
  'promise', 'letter', 'photo', 'voice', 'video', 'travel', 'wish', 'gratitude', 'random_thought'
);

create type public.memory_status as enum (
  'draft', 'pending_partner', 'sealed', 'unlocked', 'opening', 'archived'
);

create type public.capsule_style as enum (
  'vintage_parcel', 'ribbon_box', 'wax_capsule', 'glass_capsule', 'wooden_box', 'silk_envelope'
);

create table public.memories (
  id uuid default gen_random_uuid() primary key,
  relationship_id uuid references public.relationship_settings(id) on delete cascade not null,
  type public.memory_type not null,
  status public.memory_status default 'sealed' not null,
  capsule_style public.capsule_style,
  version integer default 1 not null,
  title text,
  content text,
  mood_id text references public.memory_moods(id),
  is_collaborative boolean default false not null,
  memory_date timestamp with time zone not null default timezone('utc'::text, now()),
  unlock_at timestamp with time zone,
  sealed_at timestamp with time zone,
  unlocked_at timestamp with time zone,
  opened_at timestamp with time zone,
  deleted_at timestamp with time zone,
  created_by uuid references public.profiles(id) not null default auth.uid(),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 8.1 Create memory_open_participants table for the Knock ritual
create table public.memory_open_participants (
  id uuid default gen_random_uuid() primary key,
  memory_id uuid references public.memories(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (memory_id, user_id)
);

alter table public.memories enable row level security;
alter table public.memory_open_participants enable row level security;

create policy "Users can view all memories."
  on public.memories for select
  to authenticated
  using ( deleted_at is null );

create policy "Users can insert memories."
  on public.memories for insert
  to authenticated
  with check ( auth.uid() = created_by );

create policy "Users can update memories."
  on public.memories for update
  to authenticated
  using ( true );

create policy "Users can view participants."
  on public.memory_open_participants for select
  to authenticated
  using ( true );

create policy "Users can insert participants."
  on public.memory_open_participants for insert
  to authenticated
  with check ( auth.uid() = user_id );

-- 9. Create tags and memory_tags tables
create table public.tags (
  id uuid default gen_random_uuid() primary key,
  name text unique not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table public.memory_tags (
  memory_id uuid references public.memories(id) on delete cascade,
  tag_id uuid references public.tags(id) on delete cascade,
  primary key (memory_id, tag_id)
);

alter table public.tags enable row level security;
alter table public.memory_tags enable row level security;

create policy "Users can view all tags." on public.tags for select to authenticated using (true);
create policy "Users can insert tags." on public.tags for insert to authenticated with check (true);
create policy "Users can view all memory_tags." on public.memory_tags for select to authenticated using (true);
create policy "Users can insert memory_tags." on public.memory_tags for insert to authenticated with check (true);

-- 10. Create memory_attachments table
create type public.attachment_type as enum ('photo', 'voice', 'video', 'thumbnail');

create table public.memory_attachments (
  id uuid default gen_random_uuid() primary key,
  memory_id uuid references public.memories(id) on delete cascade not null,
  file_type public.attachment_type not null,
  url text not null, -- Supabase Storage path
  metadata jsonb default '{}'::jsonb not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.memory_attachments enable row level security;

create policy "Users can view all attachments."
  on public.memory_attachments for select
  to authenticated
  using ( true );

create policy "Users can insert attachments."
  on public.memory_attachments for insert
  to authenticated
  with check ( true );

-- 11. Create Storage Buckets
insert into storage.buckets (id, name, public) values 
  ('memory-images', 'memory-images', true),
  ('memory-voices', 'memory-voices', false),
  ('memory-videos', 'memory-videos', false),
  ('memory-thumbnails', 'memory-thumbnails', true)
on conflict (id) do nothing;

-- 12. Storage Policies
create policy "Authenticated users can upload to memory-images"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'memory-images');

create policy "Public can view memory-images"
  on storage.objects for select
  using (bucket_id = 'memory-images');

create policy "Authenticated users can upload to memory-voices"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'memory-voices');

create policy "Authenticated users can view memory-voices"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'memory-voices');

create policy "Authenticated users can upload to memory-videos"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'memory-videos');

create policy "Authenticated users can view memory-videos"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'memory-videos');

create policy "Authenticated users can upload to memory-thumbnails"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'memory-thumbnails');

create policy "Public can view memory-thumbnails"
  on storage.objects for select
  using (bucket_id = 'memory-thumbnails');

-- 13. Create memory_visual_state table
CREATE TABLE IF NOT EXISTS public.memory_visual_state (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  memory_id uuid REFERENCES public.memories(id) ON DELETE CASCADE,
  position_x numeric NOT NULL,
  position_y numeric NOT NULL,
  rotation numeric NOT NULL,
  scale numeric NOT NULL,
  velocity_x numeric DEFAULT 0,
  velocity_y numeric DEFAULT 0,
  is_sleeping boolean DEFAULT true,
  z_index integer DEFAULT 1,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(memory_id)
);

-- Turn on RLS for visual state
ALTER TABLE public.memory_visual_state ENABLE ROW LEVEL SECURITY;

-- Allow read access
CREATE POLICY "Users can view their own memory visual states" 
ON public.memory_visual_state FOR SELECT 
USING (
  memory_id IN (
    SELECT id FROM public.memories WHERE created_by = auth.uid()
  )
);

-- Allow insert/update access
CREATE POLICY "Users can manage their own memory visual states" 
ON public.memory_visual_state FOR ALL 
USING ( true );

-- 14. Server-Side Unlock via pg_cron
-- Ensure pg_cron is enabled in Supabase extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the job to run every minute
SELECT cron.schedule('unlock_time_capsules', '* * * * *', $$
  UPDATE public.memories 
  SET status = 'unlocked', unlocked_at = now() 
  WHERE status = 'sealed' AND unlock_at <= now() AND deleted_at IS NULL;
$$);
