begin;

create table public.listening_rooms (
  id uuid primary key default gen_random_uuid(),
  relationship_id uuid not null references public.relationship_settings(id) on delete cascade,
  host_id uuid not null references public.profiles(id) on delete restrict,
  source_kind text,
  video_id text,
  playlist_id text,
  playlist_index integer,
  playback_state text not null default 'idle',
  position_seconds double precision not null default 0,
  revision bigint not null default 0,
  state_changed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  ended_at timestamptz,
  ended_by uuid references public.profiles(id) on delete set null,
  constraint listening_rooms_source_kind_check
    check (source_kind is null or source_kind in ('youtube_video', 'youtube_playlist')),
  constraint listening_rooms_playback_state_check
    check (playback_state in ('idle', 'playing', 'paused', 'buffering', 'ended')),
  constraint listening_rooms_position_seconds_check check (
    position_seconds >= 0 and position_seconds < 'Infinity'::double precision
  ),
  constraint listening_rooms_revision_check check (revision >= 0),
  constraint listening_rooms_playlist_index_check check (playlist_index is null or playlist_index >= 0),
  constraint listening_rooms_video_id_length_check check (
    video_id is null
    or (char_length(video_id) between 6 and 64 and video_id ~ '^[A-Za-z0-9_-]+$')
  ),
  constraint listening_rooms_playlist_id_length_check check (
    playlist_id is null
    or (char_length(playlist_id) between 6 and 128 and playlist_id ~ '^[A-Za-z0-9_-]+$')
  ),
  constraint listening_rooms_source_shape_check check (
    (
      source_kind is null
      and video_id is null
      and playlist_id is null
      and playlist_index is null
      and playback_state in ('idle', 'ended')
      and position_seconds = 0
    )
    or
    (source_kind = 'youtube_video' and video_id is not null and playlist_id is null and playlist_index is null)
    or
    (
      source_kind = 'youtube_playlist'
      and video_id is not null
      and playlist_id is not null
      and playlist_index is not null
    )
  ),
  constraint listening_rooms_ended_by_check check (ended_by is null or ended_at is not null),
  constraint listening_rooms_ended_state_check check (
    (ended_at is null and playback_state <> 'ended')
    or
    (ended_at is not null and playback_state = 'ended')
  )
);

create unique index listening_rooms_one_active_per_relationship_idx
  on public.listening_rooms (relationship_id)
  where ended_at is null;

create table public.listening_room_participants (
  room_id uuid not null references public.listening_rooms(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete restrict,
  role text not null,
  joined_at timestamptz not null default now(),
  left_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (room_id, profile_id),
  constraint listening_room_participants_role_check check (role in ('host', 'listener'))
);

create index listening_room_participants_profile_room_idx
  on public.listening_room_participants (profile_id, room_id);

create or replace function public.touch_listening_room_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.validate_listening_room()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if tg_op = 'UPDATE' then
    if new.relationship_id is distinct from old.relationship_id then
      raise exception using errcode = 'P0001', message = 'LISTENING_ROOM_RELATIONSHIP_IMMUTABLE';
    end if;

    if new.host_id is distinct from old.host_id then
      raise exception using errcode = 'P0001', message = 'LISTENING_ROOM_HOST_IMMUTABLE';
    end if;

    if old.ended_at is not null and new is distinct from old then
      raise exception using errcode = 'P0001', message = 'LISTENING_ROOM_ENDED_IMMUTABLE';
    end if;
  end if;

  if not exists (
    select 1
    from public.relationship_members as member
    where member.relationship_id = new.relationship_id
      and member.profile_id = new.host_id
  ) then
    raise exception using errcode = 'P0001', message = 'LISTENING_ROOM_NOT_RELATIONSHIP_MEMBER';
  end if;

  return new;
end;
$$;

create or replace function public.validate_listening_room_participant()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  target_relationship_id uuid;
  target_host_id uuid;
begin
  if tg_op = 'UPDATE' then
    if new.room_id is distinct from old.room_id
      or new.profile_id is distinct from old.profile_id
      or new.role is distinct from old.role then
      raise exception using errcode = 'P0001', message = 'LISTENING_ROOM_PARTICIPANT_IDENTITY_IMMUTABLE';
    end if;

    return new;
  end if;

  select room.relationship_id, room.host_id
  into target_relationship_id, target_host_id
  from public.listening_rooms as room
  where room.id = new.room_id;

  if target_relationship_id is null then
    raise exception using errcode = 'P0001', message = 'LISTENING_ROOM_NOT_FOUND';
  end if;

  if not exists (
    select 1
    from public.relationship_members as member
    where member.relationship_id = target_relationship_id
      and member.profile_id = new.profile_id
  ) then
    raise exception using errcode = 'P0001', message = 'LISTENING_ROOM_NOT_RELATIONSHIP_MEMBER';
  end if;

  if new.profile_id = target_host_id and new.role <> 'host' then
    raise exception using errcode = 'P0001', message = 'LISTENING_ROOM_HOST_ROLE_REQUIRED';
  end if;

  if new.profile_id <> target_host_id and new.role <> 'listener' then
    raise exception using errcode = 'P0001', message = 'LISTENING_ROOM_LISTENER_ROLE_REQUIRED';
  end if;

  return new;
end;
$$;

create trigger listening_rooms_validate
before insert or update on public.listening_rooms
for each row execute function public.validate_listening_room();

create trigger listening_rooms_touch_updated_at
before update on public.listening_rooms
for each row execute function public.touch_listening_room_updated_at();

create trigger listening_room_participants_validate
before insert or update on public.listening_room_participants
for each row execute function public.validate_listening_room_participant();

create trigger listening_room_participants_touch_updated_at
before update on public.listening_room_participants
for each row execute function public.touch_listening_room_updated_at();

alter table public.listening_rooms enable row level security;
alter table public.listening_room_participants enable row level security;

create policy "Relationship members can read listening rooms"
on public.listening_rooms
for select
to authenticated
using (public.is_relationship_member(relationship_id));

create policy "Relationship members can read listening room participants"
on public.listening_room_participants
for select
to authenticated
using (
  exists (
    select 1
    from public.listening_rooms as room
    where room.id = listening_room_participants.room_id
      and public.is_relationship_member(room.relationship_id)
  )
);

revoke all on public.listening_rooms from anon;
revoke all on public.listening_room_participants from anon;
revoke insert, update, delete on public.listening_rooms from authenticated;
revoke insert, update, delete on public.listening_room_participants from authenticated;
grant select on public.listening_rooms to authenticated;
grant select on public.listening_room_participants to authenticated;

create or replace function public.create_listening_room(
  p_relationship_id uuid,
  p_source_kind text default null,
  p_video_id text default null,
  p_playlist_id text default null,
  p_playlist_index integer default null,
  p_playback_state text default 'idle',
  p_position_seconds double precision default 0
)
returns public.listening_rooms
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  caller_id uuid := auth.uid();
  created_room public.listening_rooms%rowtype;
begin
  if caller_id is null then
    raise exception using errcode = 'P0001', message = 'LISTENING_ROOM_UNAUTHENTICATED';
  end if;

  if p_relationship_id is null or not public.is_relationship_member(p_relationship_id) then
    raise exception using errcode = 'P0001', message = 'LISTENING_ROOM_NOT_RELATIONSHIP_MEMBER';
  end if;

  if p_playback_state = 'ended' then
    raise exception using errcode = 'P0001', message = 'LISTENING_ROOM_INVALID_STATE';
  end if;

  begin
    insert into public.listening_rooms (
      relationship_id,
      host_id,
      source_kind,
      video_id,
      playlist_id,
      playlist_index,
      playback_state,
      position_seconds
    )
    values (
      p_relationship_id,
      caller_id,
      p_source_kind,
      p_video_id,
      p_playlist_id,
      p_playlist_index,
      p_playback_state,
      greatest(coalesce(p_position_seconds, 0), 0)
    )
    returning * into created_room;
  exception
    when unique_violation then
      raise exception using errcode = 'P0001', message = 'LISTENING_ROOM_ALREADY_ACTIVE';
  end;

  insert into public.listening_room_participants (room_id, profile_id, role)
  values (created_room.id, caller_id, 'host');

  return created_room;
end;
$$;

create or replace function public.join_listening_room(p_room_id uuid)
returns public.listening_room_participants
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  caller_id uuid := auth.uid();
  target_room public.listening_rooms%rowtype;
  participant public.listening_room_participants%rowtype;
  expected_role text;
begin
  if caller_id is null then
    raise exception using errcode = 'P0001', message = 'LISTENING_ROOM_UNAUTHENTICATED';
  end if;

  select *
  into target_room
  from public.listening_rooms
  where id = p_room_id
  for update;

  if target_room.id is null then
    raise exception using errcode = 'P0001', message = 'LISTENING_ROOM_NOT_FOUND';
  end if;

  if target_room.ended_at is not null then
    raise exception using errcode = 'P0001', message = 'LISTENING_ROOM_ENDED';
  end if;

  if not public.is_relationship_member(target_room.relationship_id) then
    raise exception using errcode = 'P0001', message = 'LISTENING_ROOM_NOT_RELATIONSHIP_MEMBER';
  end if;

  expected_role := case when caller_id = target_room.host_id then 'host' else 'listener' end;

  select *
  into participant
  from public.listening_room_participants
  where room_id = p_room_id
    and profile_id = caller_id;

  if participant.room_id is not null and participant.left_at is null then
    return participant;
  end if;

  insert into public.listening_room_participants (room_id, profile_id, role, joined_at, left_at)
  values (p_room_id, caller_id, expected_role, now(), null)
  on conflict (room_id, profile_id)
  do update set
    joined_at = excluded.joined_at,
    left_at = null
  returning * into participant;

  return participant;
end;
$$;

create or replace function public.leave_listening_room(p_room_id uuid)
returns public.listening_room_participants
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  caller_id uuid := auth.uid();
  participant public.listening_room_participants%rowtype;
begin
  if caller_id is null then
    raise exception using errcode = 'P0001', message = 'LISTENING_ROOM_UNAUTHENTICATED';
  end if;

  update public.listening_room_participants
  set left_at = now()
  where room_id = p_room_id
    and profile_id = caller_id
    and left_at is null
  returning * into participant;

  return participant;
end;
$$;

create or replace function public.end_listening_room(p_room_id uuid)
returns public.listening_rooms
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  caller_id uuid := auth.uid();
  target_room public.listening_rooms%rowtype;
begin
  if caller_id is null then
    raise exception using errcode = 'P0001', message = 'LISTENING_ROOM_UNAUTHENTICATED';
  end if;

  select *
  into target_room
  from public.listening_rooms
  where id = p_room_id
  for update;

  if target_room.id is null then
    raise exception using errcode = 'P0001', message = 'LISTENING_ROOM_NOT_FOUND';
  end if;

  if caller_id <> target_room.host_id then
    raise exception using errcode = 'P0001', message = 'LISTENING_ROOM_HOST_ONLY';
  end if;

  if target_room.ended_at is not null then
    return target_room;
  end if;

  update public.listening_rooms
  set
    ended_at = now(),
    ended_by = caller_id,
    playback_state = 'ended',
    revision = revision + 1,
    state_changed_at = now()
  where id = p_room_id
  returning * into target_room;

  update public.listening_room_participants
  set left_at = coalesce(left_at, now())
  where room_id = p_room_id
    and left_at is null;

  return target_room;
end;
$$;

revoke all on function public.touch_listening_room_updated_at() from public, anon, authenticated;
revoke all on function public.validate_listening_room() from public, anon, authenticated;
revoke all on function public.validate_listening_room_participant() from public, anon, authenticated;

revoke all on function public.create_listening_room(uuid, text, text, text, integer, text, double precision) from public, anon;
revoke all on function public.join_listening_room(uuid) from public, anon;
revoke all on function public.leave_listening_room(uuid) from public, anon;
revoke all on function public.end_listening_room(uuid) from public, anon;

grant execute on function public.create_listening_room(uuid, text, text, text, integer, text, double precision) to authenticated;
grant execute on function public.join_listening_room(uuid) to authenticated;
grant execute on function public.leave_listening_room(uuid) to authenticated;
grant execute on function public.end_listening_room(uuid) to authenticated;

commit;
