"use client";

import { createClient } from "@/lib/supabase/client";
import {
  mapListeningRoom,
  mapListeningRoomParticipant,
} from "@/lib/music/listening-room";
import type {
  ListeningRoom,
  ListeningRoomErrorCode,
  ListeningRoomParticipant,
  ListeningRoomTrackSnapshot,
} from "@/types/music";

type SupabaseFailure = {
  code?: string;
  message?: string;
};

export class ListeningRoomServiceError extends Error {
  constructor(
    public readonly code: ListeningRoomErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "ListeningRoomServiceError";
  }
}

const ERROR_COPY: Record<ListeningRoomErrorCode, string> = {
  NO_ACTIVE_RELATIONSHIP: "Choose a relationship before opening a listening room.",
  ROOM_ALREADY_ACTIVE: "A listening room is already open for both of you.",
  ROOM_NOT_FOUND: "This listening room is no longer available.",
  ROOM_ENDED: "This listening room has already ended.",
  NOT_RELATIONSHIP_MEMBER: "This listening room is private.",
  HOST_ONLY: "Only the host can end this listening room.",
  NOT_JOINED: "You are not currently in this listening room.",
  INVALID_TRACK: "Choose a song before opening a listening room.",
  UNKNOWN: "The listening room could not be updated. Please try again.",
};

function domainError(code: ListeningRoomErrorCode): ListeningRoomServiceError {
  return new ListeningRoomServiceError(code, ERROR_COPY[code]);
}

function mapFailure(error: SupabaseFailure | null): ListeningRoomServiceError {
  const message = error?.message ?? "";
  if (error?.code === "23505" || message.includes("LISTENING_ROOM_ALREADY_ACTIVE")) {
    return domainError("ROOM_ALREADY_ACTIVE");
  }
  if (message.includes("LISTENING_ROOM_NOT_FOUND")) return domainError("ROOM_NOT_FOUND");
  if (message.includes("LISTENING_ROOM_ENDED")) return domainError("ROOM_ENDED");
  if (message.includes("LISTENING_ROOM_NOT_RELATIONSHIP_MEMBER")) {
    return domainError("NOT_RELATIONSHIP_MEMBER");
  }
  if (message.includes("LISTENING_ROOM_HOST_ONLY")) return domainError("HOST_ONLY");
  if (message.includes("LISTENING_ROOM_INVALID_STATE")) return domainError("INVALID_TRACK");
  return domainError("UNKNOWN");
}

function firstResult(value: unknown): unknown {
  return Array.isArray(value) ? value[0] : value;
}

export async function getActiveListeningRoom(
  relationshipId: string,
): Promise<ListeningRoom | null> {
  if (!relationshipId) return null;
  const supabase = createClient();
  const { data, error } = await supabase
    .from("listening_rooms")
    .select(
      "id,relationship_id,host_id,source_kind,video_id,playlist_id,playlist_index,playback_state,position_seconds,revision,state_changed_at,created_at,updated_at,ended_at,ended_by",
    )
    .eq("relationship_id", relationshipId)
    .is("ended_at", null)
    .maybeSingle();

  if (error) throw mapFailure(error);
  return mapListeningRoom(data);
}

export async function getListeningRoomParticipants(
  roomId: string,
): Promise<ListeningRoomParticipant[]> {
  if (!roomId) return [];
  const supabase = createClient();
  const { data, error } = await supabase
    .from("listening_room_participants")
    .select("room_id,profile_id,role,joined_at,left_at,created_at,updated_at")
    .eq("room_id", roomId)
    .order("created_at", { ascending: true });

  if (error) throw mapFailure(error);
  return (data ?? [])
    .map(mapListeningRoomParticipant)
    .filter((participant): participant is ListeningRoomParticipant => participant !== null);
}

export async function createListeningRoom(
  relationshipId: string,
  snapshot: ListeningRoomTrackSnapshot,
): Promise<ListeningRoom> {
  if (!relationshipId) throw domainError("NO_ACTIVE_RELATIONSHIP");
  if (!snapshot.videoId) throw domainError("INVALID_TRACK");

  const supabase = createClient();
  const { data, error } = await supabase.rpc("create_listening_room", {
    p_relationship_id: relationshipId,
    p_source_kind: snapshot.sourceKind,
    p_video_id: snapshot.videoId,
    p_playlist_id: snapshot.playlistId,
    p_playlist_index: snapshot.playlistIndex,
    p_playback_state: snapshot.playbackState,
    p_position_seconds: snapshot.positionSeconds,
  });

  if (error) throw mapFailure(error);
  const room = mapListeningRoom(firstResult(data));
  if (!room) throw domainError("UNKNOWN");
  return room;
}

export async function joinListeningRoom(roomId: string): Promise<ListeningRoomParticipant> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("join_listening_room", { p_room_id: roomId });
  if (error) throw mapFailure(error);
  const participant = mapListeningRoomParticipant(firstResult(data));
  if (!participant) throw domainError("UNKNOWN");
  return participant;
}

export async function leaveListeningRoom(
  roomId: string,
): Promise<ListeningRoomParticipant | null> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("leave_listening_room", { p_room_id: roomId });
  if (error) throw mapFailure(error);
  return mapListeningRoomParticipant(firstResult(data));
}

export async function endListeningRoom(roomId: string): Promise<ListeningRoom> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("end_listening_room", { p_room_id: roomId });
  if (error) throw mapFailure(error);
  const room = mapListeningRoom(firstResult(data));
  if (!room) throw domainError("UNKNOWN");
  return room;
}
