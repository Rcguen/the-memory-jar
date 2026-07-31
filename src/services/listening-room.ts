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
  ListeningRoomPlaybackCommand,
  ListeningRoomTrackSnapshot,
} from "@/types/music";

type SupabaseFailure = {
  code?: string;
  message?: string;
};

type ListeningRoomOperation =
  | "get_active_room"
  | "get_participants"
  | "create_room"
  | "join_room"
  | "leave_room"
  | "end_room"
  | "apply_command";

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
  HOST_ONLY: "Only the host can guide this listening room.",
  NOT_JOINED: "You are not currently in this listening room.",
  INVALID_TRACK: "Choose a song before opening a listening room.",
  INVALID_COMMAND: "That shared music action could not be applied.",
  REVISION_CONFLICT: "The shared player changed. Please try that action again.",
  NOT_CONFIGURED: "Listening rooms are not available yet. Please try again later.",
  UNAUTHENTICATED: "Sign in again to open your listening room.",
  FORBIDDEN: "You do not have access to this listening room.",
  NETWORK_UNAVAILABLE: "The listening room could not connect. Check your connection and try again.",
  MALFORMED_RESPONSE: "The listening room returned an unexpected response.",
  DATA_INTEGRITY: "More than one listening room is open. Please try again later.",
  UNKNOWN: "The listening room could not be updated. Please try again.",
};

function domainError(code: ListeningRoomErrorCode): ListeningRoomServiceError {
  return new ListeningRoomServiceError(code, ERROR_COPY[code]);
}

function logFailure(
  operation: ListeningRoomOperation,
  code: string,
  status?: number,
): void {
  if (process.env.NODE_ENV !== "development") return;
  console.debug("[listening-room] operation failed", {
    operation,
    code,
    status: typeof status === "number" ? status : null,
  });
}

function loggedDomainError(
  code: ListeningRoomErrorCode,
  operation: ListeningRoomOperation,
  status?: number,
): ListeningRoomServiceError {
  logFailure(operation, code, status);
  return domainError(code);
}

function mapFailure(
  error: SupabaseFailure | null,
  operation: ListeningRoomOperation,
  status?: number,
): ListeningRoomServiceError {
  const message = error?.message ?? "";
  const normalizedMessage = message.toLowerCase();
  let code: ListeningRoomErrorCode;

  if (error?.code === "23505" || message.includes("LISTENING_ROOM_ALREADY_ACTIVE")) {
    code = "ROOM_ALREADY_ACTIVE";
  } else if (
    error?.code === "PGRST205"
    || error?.code === "PGRST202"
    || error?.code === "42P01"
    || error?.code === "42883"
  ) {
    code = "NOT_CONFIGURED";
  } else if (
    status === 401
    || error?.code === "PGRST301"
    || error?.code === "PGRST302"
  ) {
    code = "UNAUTHENTICATED";
  } else if (status === 403 || error?.code === "42501") {
    code = "FORBIDDEN";
  } else if (
    normalizedMessage.includes("failed to fetch")
    || normalizedMessage.includes("networkerror")
    || normalizedMessage.includes("network request failed")
    || normalizedMessage.includes("load failed")
  ) {
    code = "NETWORK_UNAVAILABLE";
  } else if (error?.code === "PGRST116") {
    code = "DATA_INTEGRITY";
  } else if (message.includes("LISTENING_ROOM_NOT_FOUND")) {
    code = "ROOM_NOT_FOUND";
  } else if (message.includes("LISTENING_ROOM_ENDED")) {
    code = "ROOM_ENDED";
  } else if (message.includes("LISTENING_ROOM_NOT_RELATIONSHIP_MEMBER")) {
    code = "NOT_RELATIONSHIP_MEMBER";
  } else if (message.includes("LISTENING_ROOM_HOST_ONLY")) {
    code = "HOST_ONLY";
  } else if (message.includes("LISTENING_ROOM_NOT_JOINED")) {
    code = "NOT_JOINED";
  } else if (message.includes("LISTENING_ROOM_REVISION_CONFLICT")) {
    code = "REVISION_CONFLICT";
  } else if (message.includes("LISTENING_ROOM_INVALID_COMMAND")) {
    code = "INVALID_COMMAND";
  } else if (message.includes("LISTENING_ROOM_UNAUTHENTICATED")) {
    code = "UNAUTHENTICATED";
  } else if (message.includes("LISTENING_ROOM_INVALID_STATE")) {
    code = "INVALID_TRACK";
  } else {
    code = "UNKNOWN";
  }

  logFailure(operation, error?.code ?? code, status);
  return domainError(code);
}

function firstResult(value: unknown): unknown {
  return Array.isArray(value) ? value[0] : value;
}

export async function getActiveListeningRoom(
  relationshipId: string,
): Promise<ListeningRoom | null> {
  if (!relationshipId) return null;
  const supabase = createClient();
  const { data, error, status } = await supabase
    .from("listening_rooms")
    .select(
      "id,relationship_id,host_id,source_kind,video_id,playlist_id,playlist_index,playback_state,position_seconds,revision,state_changed_at,created_at,updated_at,ended_at,ended_by",
    )
    .eq("relationship_id", relationshipId)
    .is("ended_at", null)
    .limit(2);

  if (error) throw mapFailure(error, "get_active_room", status);
  if (!Array.isArray(data)) {
    throw loggedDomainError("MALFORMED_RESPONSE", "get_active_room", status);
  }
  if (data.length === 0) return null;
  if (data.length > 1) {
    throw loggedDomainError("DATA_INTEGRITY", "get_active_room", status);
  }

  const room = mapListeningRoom(data[0]);
  if (!room) throw loggedDomainError("MALFORMED_RESPONSE", "get_active_room", status);
  return room;
}

export async function getListeningRoomParticipants(
  roomId: string,
): Promise<ListeningRoomParticipant[]> {
  if (!roomId) return [];
  const supabase = createClient();
  const { data, error, status } = await supabase
    .from("listening_room_participants")
    .select("room_id,profile_id,role,joined_at,left_at,created_at,updated_at")
    .eq("room_id", roomId)
    .order("created_at", { ascending: true });

  if (error) throw mapFailure(error, "get_participants", status);
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
  const { data, error, status } = await supabase.rpc("create_listening_room", {
    p_relationship_id: relationshipId,
    p_source_kind: snapshot.sourceKind,
    p_video_id: snapshot.videoId,
    p_playlist_id: snapshot.playlistId,
    p_playlist_index: snapshot.playlistIndex,
    p_playback_state: snapshot.playbackState,
    p_position_seconds: snapshot.positionSeconds,
  });

  if (error) throw mapFailure(error, "create_room", status);
  const room = mapListeningRoom(firstResult(data));
  if (!room) throw loggedDomainError("MALFORMED_RESPONSE", "create_room", status);
  return room;
}

export async function joinListeningRoom(roomId: string): Promise<ListeningRoomParticipant> {
  const supabase = createClient();
  const { data, error, status } = await supabase.rpc("join_listening_room", { p_room_id: roomId });
  if (error) throw mapFailure(error, "join_room", status);
  const participant = mapListeningRoomParticipant(firstResult(data));
  if (!participant) throw loggedDomainError("MALFORMED_RESPONSE", "join_room", status);
  return participant;
}

export async function leaveListeningRoom(
  roomId: string,
): Promise<ListeningRoomParticipant | null> {
  const supabase = createClient();
  const { data, error, status } = await supabase.rpc("leave_listening_room", { p_room_id: roomId });
  if (error) throw mapFailure(error, "leave_room", status);
  return mapListeningRoomParticipant(firstResult(data));
}

export async function endListeningRoom(roomId: string): Promise<ListeningRoom> {
  const supabase = createClient();
  const { data, error, status } = await supabase.rpc("end_listening_room", { p_room_id: roomId });
  if (error) throw mapFailure(error, "end_room", status);
  const room = mapListeningRoom(firstResult(data));
  if (!room) throw loggedDomainError("MALFORMED_RESPONSE", "end_room", status);
  return room;
}

const playbackCommandCounters = {
  start: 0,
  success: 0,
  conflict: 0,
  error: 0,
};

function recordPlaybackCommand(
  event: "start" | "success" | "conflict" | "error",
  revision: number,
): void {
  if (process.env.NODE_ENV !== "development") return;
  playbackCommandCounters[event] += 1;
  console.debug("[listening-room] playback command", {
    event,
    count: playbackCommandCounters[event],
    revision,
  });
}

export async function applyListeningRoomCommand(
  roomId: string,
  command: ListeningRoomPlaybackCommand,
): Promise<ListeningRoom> {
  recordPlaybackCommand("start", command.expectedRevision);
  const trackCommand = command.kind === "track_change"
    || command.kind === "next"
    || command.kind === "previous";
  const seekCommand = command.kind === "seek";
  const supabase = createClient();
  const { data, error, status } = await supabase.rpc("apply_listening_room_command", {
    p_room_id: roomId,
    p_command: command.kind,
    p_expected_revision: command.expectedRevision,
    p_position_seconds: command.positionSeconds,
    p_resulting_state: seekCommand || trackCommand ? command.resultingState : null,
    p_source_kind: trackCommand ? command.sourceKind : null,
    p_video_id: trackCommand ? command.videoId : null,
    p_playlist_id: trackCommand ? command.playlistId : null,
    p_playlist_index: trackCommand ? command.playlistIndex : null,
  });

  if (error) {
    const mapped = mapFailure(error, "apply_command", status);
    recordPlaybackCommand(
      mapped.code === "REVISION_CONFLICT" ? "conflict" : "error",
      command.expectedRevision,
    );
    throw mapped;
  }

  const room = mapListeningRoom(firstResult(data));
  if (!room) {
    recordPlaybackCommand("error", command.expectedRevision);
    throw loggedDomainError("MALFORMED_RESPONSE", "apply_command", status);
  }

  recordPlaybackCommand("success", room.revision);
  return room;
}
