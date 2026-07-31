"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { mapListeningRoom } from "@/lib/music/listening-room";
import { listeningRoomKeys } from "@/hooks/useListeningRoom";
import type {
  ListeningRoom,
  ListeningRoomParticipantRole,
  ListeningRoomPresence,
  ListeningRoomRealtimeStatus,
} from "@/types/music";

type PresenceState = Record<string, Array<Record<string, unknown>>>;

const realtimeCounters = {
  mount: 0,
  cleanup: 0,
  reconnect: 0,
  canonicalUpdate: 0,
  staleIgnored: 0,
  readyTransition: 0,
  bufferingTransition: 0,
};

function recordRealtime(
  event: keyof typeof realtimeCounters,
  status: ListeningRoomRealtimeStatus,
  revision?: number,
): void {
  if (process.env.NODE_ENV !== "development") return;
  realtimeCounters[event] += 1;
  console.debug("[listening-room] realtime", {
    event,
    count: realtimeCounters[event],
    status,
    revision: typeof revision === "number" ? revision : null,
  });
}

function parsePresence(value: unknown): ListeningRoomPresence | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const presence = value as Record<string, unknown>;
  if (presence.role !== "host" && presence.role !== "listener") return null;
  return {
    role: presence.role,
    ready: presence.ready === true,
    buffering: presence.buffering === true,
    blocked: presence.blocked === true,
  };
}

function findPartnerPresence(
  state: PresenceState,
  localRole: ListeningRoomParticipantRole,
): ListeningRoomPresence | null {
  for (const entries of Object.values(state)) {
    for (const entry of entries) {
      const presence = parsePresence(entry);
      if (presence && presence.role !== localRole) return presence;
    }
  }
  return null;
}

export function useListeningRoomRealtime({
  enabled,
  room,
  relationshipId,
  role,
  ready,
  buffering,
  blocked,
}: {
  enabled: boolean;
  room: ListeningRoom | null;
  relationshipId: string | null | undefined;
  role: ListeningRoomParticipantRole | null;
  ready: boolean;
  buffering: boolean;
  blocked: boolean;
}) {
  const queryClient = useQueryClient();
  const supabase = useMemo(() => createClient(), []);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const subscribedRef = useRef(false);
  const lastSeenRevisionRef = useRef(-1);
  const presenceRef = useRef<ListeningRoomPresence | null>(null);
  const previousReadyRef = useRef(ready);
  const previousBufferingRef = useRef(buffering);
  const roomRevisionRef = useRef(room?.revision ?? -1);
  const [channelState, setChannelState] = useState<{
    roomId: string | null;
    status: ListeningRoomRealtimeStatus;
  }>({ roomId: null, status: "idle" });
  const [partnerState, setPartnerState] = useState<{
    roomId: string | null;
    presence: ListeningRoomPresence | null;
  }>({ roomId: null, presence: null });
  const activeRoomId = enabled && room && relationshipId && role && !room.endedAt
    ? room.id
    : null;
  const status: ListeningRoomRealtimeStatus = activeRoomId
    ? channelState.roomId === activeRoomId
      ? channelState.status
      : "connecting"
    : "idle";
  const partnerPresence = activeRoomId
    && status === "connected"
    && partnerState.roomId === activeRoomId
    ? partnerState.presence
    : null;

  useEffect(() => {
    roomRevisionRef.current = room?.revision ?? -1;
  }, [room?.revision]);

  useEffect(() => {
    presenceRef.current = role ? { role, ready, buffering, blocked } : null;
    if (ready !== previousReadyRef.current) {
      previousReadyRef.current = ready;
      recordRealtime("readyTransition", status);
    }
    if (buffering !== previousBufferingRef.current) {
      previousBufferingRef.current = buffering;
      recordRealtime("bufferingTransition", status);
    }

    const channel = channelRef.current;
    if (!channel || !subscribedRef.current || !presenceRef.current) return;
    void channel.track(presenceRef.current).catch(() => {
      if (process.env.NODE_ENV === "development") {
        console.debug("[listening-room] realtime", {
          event: "presence-track-error",
          status,
        });
      }
    });
  }, [blocked, buffering, ready, role, status]);

  useEffect(() => {
    const roomId = room?.id;
    if (!enabled || !roomId || !relationshipId || !role || room.endedAt) {
      lastSeenRevisionRef.current = -1;
      return;
    }

    let active = true;
    let subscribedBefore = false;
    lastSeenRevisionRef.current = roomRevisionRef.current;
    recordRealtime("mount", "connecting", roomRevisionRef.current);

    const channel = supabase
      .channel(`listening-room-playback:${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "listening_rooms",
          filter: `id=eq.${roomId}`,
        },
        (payload) => {
          if (!active) return;
          const canonicalRoom = mapListeningRoom(payload.new);
          if (
            !canonicalRoom
            || canonicalRoom.id !== roomId
            || canonicalRoom.relationshipId !== relationshipId
          ) {
            return;
          }
          if (canonicalRoom.revision <= lastSeenRevisionRef.current) {
            recordRealtime("staleIgnored", "connected", canonicalRoom.revision);
            return;
          }

          lastSeenRevisionRef.current = canonicalRoom.revision;
          recordRealtime("canonicalUpdate", "connected", canonicalRoom.revision);
          queryClient.setQueryData<ListeningRoom | null>(
            listeningRoomKeys.active(relationshipId),
            canonicalRoom.endedAt ? null : canonicalRoom,
          );
        },
      )
      .on("presence", { event: "sync" }, () => {
        if (!active) return;
        setPartnerState({
          roomId,
          presence: findPartnerPresence(channel.presenceState() as PresenceState, role),
        });
      });

    channelRef.current = channel;
    channel.subscribe((nextStatus) => {
      if (!active) return;
      const nextChannelStatus: ListeningRoomRealtimeStatus = nextStatus === "SUBSCRIBED"
        ? "connected"
        : nextStatus === "TIMED_OUT"
          ? "reconnecting"
          : nextStatus === "CHANNEL_ERROR"
            ? "error"
            : "closed";

      if (process.env.NODE_ENV === "development") {
        console.debug("[listening-room] realtime", {
          event: "subscription-status",
          status: nextChannelStatus,
        });
      }
      setChannelState({ roomId, status: nextChannelStatus });

      if (nextStatus === "SUBSCRIBED") {
        subscribedRef.current = true;
        if (subscribedBefore) {
          recordRealtime("reconnect", "connected");
          void queryClient.refetchQueries({
            queryKey: listeningRoomKeys.active(relationshipId),
            type: "active",
          });
        }
        subscribedBefore = true;
        if (presenceRef.current) {
          void channel.track(presenceRef.current).catch(() => {
            if (process.env.NODE_ENV === "development") {
              console.debug("[listening-room] realtime", {
                event: "presence-track-error",
                status: "connected",
              });
            }
          });
        }
        return;
      }

      subscribedRef.current = false;
    });

    return () => {
      active = false;
      subscribedRef.current = false;
      channelRef.current = null;
      recordRealtime("cleanup", "closed", lastSeenRevisionRef.current);
      void channel.untrack().catch(() => undefined);
      void supabase.removeChannel(channel).catch(() => undefined);
    };
  }, [enabled, queryClient, relationshipId, role, room?.endedAt, room?.id, supabase]);

  return {
    status,
    partnerPresence,
  };
}