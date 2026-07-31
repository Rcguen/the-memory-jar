begin;

create or replace function public.apply_listening_room_command(
  p_room_id uuid,
  p_command text,
  p_expected_revision bigint,
  p_position_seconds double precision,
  p_resulting_state text default null,
  p_source_kind text default null,
  p_video_id text default null,
  p_playlist_id text default null,
  p_playlist_index integer default null
)
returns public.listening_rooms
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  caller_id uuid := auth.uid();
  target_room public.listening_rooms%rowtype;
  next_playback_state text;
  next_source_kind text;
  next_video_id text;
  next_playlist_id text;
  next_playlist_index integer;
begin
  if caller_id is null then
    raise exception using errcode = 'P0001', message = 'LISTENING_ROOM_UNAUTHENTICATED';
  end if;

  if p_expected_revision is null or p_expected_revision < 0 then
    raise exception using errcode = 'P0001', message = 'LISTENING_ROOM_INVALID_COMMAND';
  end if;

  if p_position_seconds is null
    or p_position_seconds < 0
    or p_position_seconds >= 'Infinity'::double precision then
    raise exception using errcode = 'P0001', message = 'LISTENING_ROOM_INVALID_COMMAND';
  end if;

  if p_command is null
    or p_command not in ('play', 'pause', 'seek', 'track_change', 'next', 'previous') then
    raise exception using errcode = 'P0001', message = 'LISTENING_ROOM_INVALID_COMMAND';
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

  if caller_id <> target_room.host_id then
    raise exception using errcode = 'P0001', message = 'LISTENING_ROOM_HOST_ONLY';
  end if;

  if not exists (
    select 1
    from public.listening_room_participants as participant
    where participant.room_id = target_room.id
      and participant.profile_id = caller_id
      and participant.role = 'host'
      and participant.left_at is null
  ) then
    raise exception using errcode = 'P0001', message = 'LISTENING_ROOM_NOT_JOINED';
  end if;

  if target_room.revision <> p_expected_revision then
    raise exception using errcode = 'P0001', message = 'LISTENING_ROOM_REVISION_CONFLICT';
  end if;

  next_source_kind := target_room.source_kind;
  next_video_id := target_room.video_id;
  next_playlist_id := target_room.playlist_id;
  next_playlist_index := target_room.playlist_index;

  if p_command in ('play', 'pause') then
    if p_resulting_state is not null
      or p_source_kind is not null
      or p_video_id is not null
      or p_playlist_id is not null
      or p_playlist_index is not null
      or target_room.source_kind is null
      or target_room.video_id is null then
      raise exception using errcode = 'P0001', message = 'LISTENING_ROOM_INVALID_COMMAND';
    end if;

    next_playback_state := case when p_command = 'play' then 'playing' else 'paused' end;
  elsif p_command = 'seek' then
    if p_resulting_state not in ('playing', 'paused')
      or p_source_kind is not null
      or p_video_id is not null
      or p_playlist_id is not null
      or p_playlist_index is not null
      or target_room.source_kind is null
      or target_room.video_id is null then
      raise exception using errcode = 'P0001', message = 'LISTENING_ROOM_INVALID_COMMAND';
    end if;

    next_playback_state := p_resulting_state;
  else
    if p_resulting_state not in ('playing', 'paused')
      or p_source_kind not in ('youtube_video', 'youtube_playlist')
      or p_video_id is null
      or char_length(p_video_id) not between 6 and 64
      or p_video_id !~ '^[A-Za-z0-9_-]+$' then
      raise exception using errcode = 'P0001', message = 'LISTENING_ROOM_INVALID_COMMAND';
    end if;

    if p_source_kind = 'youtube_video' then
      if p_playlist_id is not null or p_playlist_index is not null then
        raise exception using errcode = 'P0001', message = 'LISTENING_ROOM_INVALID_COMMAND';
      end if;
    elsif p_playlist_id is null
      or char_length(p_playlist_id) not between 6 and 128
      or p_playlist_id !~ '^[A-Za-z0-9_-]+$'
      or p_playlist_index is null
      or p_playlist_index < 0 then
      raise exception using errcode = 'P0001', message = 'LISTENING_ROOM_INVALID_COMMAND';
    end if;

    next_playback_state := p_resulting_state;
    next_source_kind := p_source_kind;
    next_video_id := p_video_id;
    next_playlist_id := p_playlist_id;
    next_playlist_index := p_playlist_index;
  end if;

  update public.listening_rooms
  set
    source_kind = next_source_kind,
    video_id = next_video_id,
    playlist_id = next_playlist_id,
    playlist_index = next_playlist_index,
    playback_state = next_playback_state,
    position_seconds = p_position_seconds,
    revision = target_room.revision + 1,
    state_changed_at = now()
  where id = target_room.id
    and revision = target_room.revision
  returning * into target_room;

  if target_room.id is null then
    raise exception using errcode = 'P0001', message = 'LISTENING_ROOM_REVISION_CONFLICT';
  end if;

  return target_room;
end;
$$;

revoke all on function public.apply_listening_room_command(
  uuid,
  text,
  bigint,
  double precision,
  text,
  text,
  text,
  text,
  integer
) from public, anon;

grant execute on function public.apply_listening_room_command(
  uuid,
  text,
  bigint,
  double precision,
  text,
  text,
  text,
  text,
  integer
) to authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_catalog.pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'listening_rooms'
  ) then
    alter publication supabase_realtime add table public.listening_rooms;
  end if;
end;
$$;

commit;