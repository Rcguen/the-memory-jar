"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  HeartHandshake,
  LoaderCircle,
  LogOut,
  Radio,
  RefreshCw,
  Users,
} from "lucide-react";
import { useListeningRoom } from "@/hooks/useListeningRoom";
import {
  createListeningRoomSnapshot,
  findLocalListeningRoomTrack,
  musicTrackFromListeningRoom,
} from "@/lib/music/listening-room";
import { useAuth } from "@/providers/auth-provider";
import type {
  ListeningRoom,
  ListeningRoomTrackSnapshot,
  MusicPlayerSnapshot,
  MusicTrack,
} from "@/types/music";
import { VinylRecord } from "./OrbitingTrackCard";

function errorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "The listening room could not be updated. Please try again.";
}

type StartRoomBlock = "no-track" | "no-relationship" | "invalid-source";

const startRoomCounters = {
  startButtonClick: 0,
  blockedNoTrack: 0,
  blockedNoRelationship: 0,
};

function recordStartRoomEvent(
  event: "startButtonClick" | "blockedNoTrack" | "blockedNoRelationship",
): void {
  if (process.env.NODE_ENV !== "development") return;
  startRoomCounters[event] += 1;
  console.debug("[listening-room] start interaction", {
    event,
    count: startRoomCounters[event],
  });
}

export function ListenTogetherPanel({
  relationshipId,
  relationshipLoading,
  currentTrack,
  snapshot,
  tracks,
  onLoadRoomTrack,
}: {
  relationshipId: string | null | undefined;
  relationshipLoading: boolean;
  currentTrack: MusicTrack | null;
  snapshot: MusicPlayerSnapshot;
  tracks: MusicTrack[];
  onLoadRoomTrack: (room: ListeningRoom) => void;
}) {
  const { profile } = useAuth();
  const [confirmEnd, setConfirmEnd] = useState(false);
  const startPendingRef = useRef(false);
  const lastReportedBlockRef = useRef<StartRoomBlock | null>(null);
  const {
    room,
    participants,
    currentParticipant,
    roomQuery,
    participantsQuery,
    createRoom,
    joinRoom,
    leaveRoom,
    endRoom,
    isCreating,
    isJoining,
    isLeaving,
    isEnding,
    createError,
    actionError,
  } = useListeningRoom({
    relationshipId,
    profileId: profile?.id,
    enabled: true,
  });

  const roomSnapshot = useMemo(
    () => createListeningRoomSnapshot(currentTrack, snapshot),
    [currentTrack, snapshot],
  );
  const localRoomTrack = useMemo(
    () => room ? findLocalListeningRoomTrack(room, tracks) : null,
    [room, tracks],
  );
  const fallbackRoomTrack = useMemo(
    () => room ? musicTrackFromListeningRoom(room) : null,
    [room],
  );
  const displayedTrack = localRoomTrack ?? fallbackRoomTrack;
  const activeParticipants = participants.filter((participant) => participant.leftAt === null);
  const isHost = Boolean(room && profile?.id && room.hostId === profile.id);
  const isJoined = currentParticipant?.leftAt === null;
  const partnerIsPresent = activeParticipants.some(
    (participant) => participant.profileId !== profile?.id,
  );
  const pending = isCreating || isJoining || isLeaving || isEnding;
  const startBlock = useMemo<StartRoomBlock | null>(() => {
    if (relationshipLoading || !relationshipId) return "no-relationship";
    if (!currentTrack) return "no-track";
    if (!roomSnapshot) return "invalid-source";
    return null;
  }, [currentTrack, relationshipId, relationshipLoading, roomSnapshot]);
  const startBlockMessage = startBlock === "no-track"
    ? "Choose a song before opening the room."
    : startBlock === "no-relationship"
      ? relationshipLoading
        ? "Your relationship is still getting ready."
        : "Choose your relationship before opening the room."
      : startBlock === "invalid-source"
        ? "This song cannot open a listening room."
        : null;

  useEffect(() => {
    if (lastReportedBlockRef.current === startBlock) return;
    lastReportedBlockRef.current = startBlock;
    if (startBlock === "no-track") recordStartRoomEvent("blockedNoTrack");
    if (startBlock === "no-relationship") {
      recordStartRoomEvent("blockedNoRelationship");
    }
  }, [startBlock]);

  const submitStartRoom = useCallback(async (
    validSnapshot: ListeningRoomTrackSnapshot,
  ) => {
    recordStartRoomEvent("startButtonClick");
    if (startPendingRef.current) return;

    startPendingRef.current = true;
    try {
      await createRoom(validSnapshot);
    } catch {
      // The mutation exposes a sanitized error through createError.
    } finally {
      startPendingRef.current = false;
    }
  }, [createRoom]);

  if (relationshipId && roomQuery.isLoading) {
    return (
      <section id="music-panel-together" className="music-source-panel listening-room-panel" role="tabpanel" aria-labelledby="music-tab-together" aria-busy="true">
        <div className="listening-room-loading">
          <LoaderCircle aria-hidden="true" />
          <span>Opening your shared radio...</span>
        </div>
      </section>
    );
  }

  if (roomQuery.isError) {
    return (
      <section id="music-panel-together" className="music-source-panel listening-room-panel" role="tabpanel" aria-labelledby="music-tab-together">
        <div className="listening-room-empty">
          <Radio aria-hidden="true" />
          <h3>The room could not be opened</h3>
          <p>{errorMessage(roomQuery.error)}</p>
          <button type="button" className="listening-room-button listening-room-button--primary focus-ring-premium" onClick={() => void roomQuery.refetch()}>
            <RefreshCw aria-hidden="true" /> Retry
          </button>
        </div>
      </section>
    );
  }

  if (!room) {
    return (
      <section id="music-panel-together" className="music-source-panel listening-room-panel" role="tabpanel" aria-labelledby="music-tab-together">
        <div className="listening-room-empty">
          <HeartHandshake aria-hidden="true" />
          <span className="persistent-music-player__eyebrow">Listen Together</span>
          <h3>Open a little room for the two of you.</h3>
          <p>
            Your music keeps playing here as it does now. This room simply gives
            your partner a private place to join.
          </p>
          {startBlockMessage && (
            <p className="listening-room-note" role="status">
              {startBlockMessage}
            </p>
          )}
          <button
            type="button"
            className="listening-room-button listening-room-button--primary focus-ring-premium"
            disabled={Boolean(startBlock) || isCreating}
            onClick={() => {
              if (roomSnapshot) void submitStartRoom(roomSnapshot);
            }}
          >
            {isCreating ? <LoaderCircle aria-hidden="true" /> : <Radio aria-hidden="true" />}
            {isCreating ? "Opening room..." : "Start listening room"}
          </button>
          {createError && <p className="listening-room-error" role="status">{errorMessage(createError)}</p>}
        </div>
      </section>
    );
  }

  return (
    <section id="music-panel-together" className="music-source-panel listening-room-panel" role="tabpanel" aria-labelledby="music-tab-together">
      <div className="listening-room-card">
        <div className="listening-room-card__record" aria-hidden="true">
          <VinylRecord track={displayedTrack} selected playing={false} compact />
        </div>
        <div className="listening-room-card__copy">
          <span className="persistent-music-player__eyebrow">
            {isHost ? "Your listening room is open" : "Your partner opened a listening room"}
          </span>
          <h3>{localRoomTrack?.title ?? "A song is waiting in the room"}</h3>
          <p>
            {partnerIsPresent
              ? "Both of you are in the room."
              : isJoined
                ? "You are here. Your partner has not joined yet."
                : "Join when you are ready. Nothing will autoplay."}
          </p>
          <div className="listening-room-presence" aria-label={`${activeParticipants.length} active ${activeParticipants.length === 1 ? "participant" : "participants"}`}>
            <Users aria-hidden="true" />
            <span>{activeParticipants.length} here</span>
            <span className="listening-room-role">{isHost ? "Host" : "Listener"}</span>
          </div>
        </div>
      </div>

      {!localRoomTrack && fallbackRoomTrack && (
        <div className="listening-room-load">
          <p>This song is not in your local queue yet.</p>
          <button
            type="button"
            className="listening-room-button focus-ring-premium"
            onClick={() => onLoadRoomTrack(room)}
          >
            <Radio aria-hidden="true" /> Add to my queue
          </button>
        </div>
      )}

      <div className="listening-room-actions">
        {!isJoined && (
          <button
            type="button"
            className="listening-room-button listening-room-button--primary focus-ring-premium"
            disabled={pending}
            onClick={() => void joinRoom(room.id)}
          >
            {isJoining ? <LoaderCircle aria-hidden="true" /> : <HeartHandshake aria-hidden="true" />}
            {isJoining ? "Joining..." : isHost ? "Rejoin room" : "Join room"}
          </button>
        )}
        {isJoined && (
          <button
            type="button"
            className="listening-room-button focus-ring-premium"
            disabled={pending}
            onClick={() => void leaveRoom(room.id)}
          >
            {isLeaving ? <LoaderCircle aria-hidden="true" /> : <LogOut aria-hidden="true" />}
            {isLeaving ? "Leaving..." : "Leave room"}
          </button>
        )}
        {isHost && !confirmEnd && (
          <button
            type="button"
            className="listening-room-button listening-room-button--quiet focus-ring-premium"
            disabled={pending}
            onClick={() => setConfirmEnd(true)}
          >
            End room
          </button>
        )}
      </div>

      {isHost && confirmEnd && (
        <div className="listening-room-confirm" role="group" aria-label="Confirm ending listening room">
          <p>End this listening room for both of you?</p>
          <div>
            <button type="button" className="listening-room-button focus-ring-premium" disabled={isEnding} onClick={() => setConfirmEnd(false)}>
              Keep open
            </button>
            <button
              type="button"
              className="listening-room-button listening-room-button--danger focus-ring-premium"
              disabled={isEnding}
              onClick={() => void endRoom(room.id).then(() => setConfirmEnd(false))}
            >
              {isEnding ? <LoaderCircle aria-hidden="true" /> : null}
              {isEnding ? "Ending..." : "End for both"}
            </button>
          </div>
        </div>
      )}

      {participantsQuery.isFetching && (
        <span className="sr-only" role="status">Refreshing room participants</span>
      )}
      {actionError && <p className="listening-room-error" role="status">{errorMessage(actionError)}</p>}
    </section>
  );
}
