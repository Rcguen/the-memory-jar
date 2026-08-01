"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Headphones,
  HeartHandshake,
  LoaderCircle,
  LogOut,
  Play,
  Radio,
  RefreshCw,
  UserRound,
  Wifi,
  WifiOff,
} from "lucide-react";
import { useListeningRoom } from "@/hooks/useListeningRoom";
import {
  createListeningRoomSnapshot,
  findLocalListeningRoomTrack,
  musicTrackFromListeningRoom,
} from "@/lib/music/listening-room";
import type {
  ListeningRoom,
  ListeningRoomPresence,
  ListeningRoomRealtimeStatus,
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

type ListeningRoomModel = ReturnType<typeof useListeningRoom>;
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
  listeningRoom,
  realtimeStatus,
  partnerPresence,
  listenerReady,
  listenerBlocked,
  relationshipId,
  relationshipLoading,
  currentTrack,
  snapshot,
  tracks,
  onLoadRoomTrack,
  onListenerReady,
  onAutoplayRecovery,
}: {
  listeningRoom: ListeningRoomModel;
  realtimeStatus: ListeningRoomRealtimeStatus;
  partnerPresence: ListeningRoomPresence | null;
  listenerReady: boolean;
  listenerBlocked: boolean;
  relationshipId: string | null | undefined;
  relationshipLoading: boolean;
  currentTrack: MusicTrack | null;
  snapshot: MusicPlayerSnapshot;
  tracks: MusicTrack[];
  onLoadRoomTrack: (room: ListeningRoom) => void;
  onListenerReady: () => void;
  onAutoplayRecovery: () => void;
}) {
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
  } = listeningRoom;

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
  const isHost = currentParticipant?.role === "host";
  const isJoined = currentParticipant?.leftAt === null;
  const isListener = currentParticipant?.role === "listener";
  const partnerIsPresent = activeParticipants.some(
    (participant) => participant.role !== currentParticipant?.role,
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
        <div className="listening-room-loading" aria-label="Opening your shared radio">
          <span className="listening-room-loading__avatars" aria-hidden="true"><i /><i /></span>
          <span className="listening-room-loading__line" aria-hidden="true" />
          <span className="sr-only">Opening your shared radio...</span>
        </div>
      </section>
    );
  }

  if (roomQuery.isError) {
    return (
      <section id="music-panel-together" className="music-source-panel listening-room-panel" role="tabpanel" aria-labelledby="music-tab-together">
        <div className="listening-room-empty" data-tone="error">
          <Radio aria-hidden="true" />
          <span className="persistent-music-player__eyebrow">Listen together</span>
          <h3>The room could not be opened</h3>
          <p>The listening room is unavailable right now.</p>
          <button type="button" className="listening-room-button listening-room-button--primary focus-ring-premium" onClick={() => void roomQuery.refetch()}>
            <RefreshCw aria-hidden="true" /> Try again
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
          <span className="persistent-music-player__eyebrow">Listen together</span>
          <h3>Open a room for the two of you</h3>
          <p>Choose a song, open the room, and invite your partner into the same moment.</p>
          {startBlockMessage && (
            <p className="listening-room-note" role="status">
              {startBlock === "no-track" ? "Choose a song first." : startBlockMessage}
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
            {isCreating ? "Opening room..." : "Open listening room"}
          </button>
          {createError && <p className="listening-room-error" role="status">{errorMessage(createError)}</p>}
        </div>
      </section>
    );
  }
  const partnerConnected = Boolean(partnerPresence || partnerIsPresent);
  const connectionInterrupted = realtimeStatus === "reconnecting" || realtimeStatus === "error";
  const togetherState = connectionInterrupted && isJoined
    ? {
        eyebrow: "Room open",
        heading: "Reconnecting the room",
        body: "Your listening room is still open.",
        detail: "Live controls are reconnecting",
      }
    : partnerPresence?.buffering
      ? {
          eyebrow: "Listening together",
          heading: "Catching up",
          body: "The music will continue in a moment.",
          detail: "Partner catching up",
        }
      : isListener && !isJoined
        ? {
            eyebrow: "Your partner opened a room",
            heading: "A song is waiting for you",
            body: "Join when you are ready. Nothing will autoplay.",
            detail: "Private room for two",
          }
        : isListener && listenerBlocked
          ? {
              eyebrow: "Listening together",
              heading: "Tap to keep listening",
              body: "Your partner is guiding the music.",
              detail: "Playback is waiting for you",
            }
          : isListener && !listenerReady
            ? {
                eyebrow: "Your partner opened a room",
                heading: "A song is waiting for you",
                body: "Tap when you're ready to let the music begin.",
                detail: "Getting ready",
              }
            : isListener
              ? {
                  eyebrow: "Listening together",
                  heading: "Listening together",
                  body: "Your partner is guiding the music.",
                  detail: "Connected",
                }
              : !partnerConnected
                ? {
                    eyebrow: "Room open",
                    heading: "Waiting for your partner",
                    body: "The room is ready. The music will begin when both of you are here.",
                    detail: "1 of 2 here",
                  }
                : partnerPresence?.ready
                  ? {
                      eyebrow: "Both here",
                      heading: "Both of you are ready",
                      body: "You're guiding the music.",
                      detail: "Live controls connected",
                    }
                  : {
                      eyebrow: "Both here",
                      heading: "Your partner joined",
                      body: "They're getting ready to listen.",
                      detail: "2 of 2 here / Getting ready",
                    };

  return (
    <section id="music-panel-together" className="music-source-panel listening-room-panel" role="tabpanel" aria-labelledby="music-tab-together">
      <div className="listening-room-hero" data-state={connectionInterrupted ? "reconnecting" : partnerPresence?.buffering ? "buffering" : "connected"}>
        <div className="listening-room-hero__copy">
          <span className="persistent-music-player__eyebrow">{togetherState.eyebrow}</span>
          <h3>{togetherState.heading}</h3>
          <p>{togetherState.body}</p>
        </div>

        <div
          className="listening-room-connection"
          data-connected={partnerConnected || undefined}
          data-ready={partnerPresence?.ready || undefined}
          data-interrupted={connectionInterrupted || undefined}
          aria-label={togetherState.detail}
        >
          <span className="listening-room-avatar">
            <UserRound aria-hidden="true" />
            <span>You</span>
          </span>
          <span className="listening-room-connection__line" aria-hidden="true">
            {connectionInterrupted ? <WifiOff /> : <HeartHandshake />}
          </span>
          <span className="listening-room-avatar" data-connected={partnerConnected || undefined}>
            <UserRound aria-hidden="true" />
            <span>Partner</span>
          </span>
        </div>

        <div className="listening-room-state">
          {connectionInterrupted ? <WifiOff aria-hidden="true" /> : <Wifi aria-hidden="true" />}
          <span>{togetherState.detail}</span>
          <span className="listening-room-role">{isHost ? "Guide" : "Listening"}</span>
        </div>

        <div className="listening-room-track">
          <div className="listening-room-track__record" aria-hidden="true">
            <VinylRecord track={displayedTrack} selected playing={false} compact />
          </div>
          <div>
            <span>In the room</span>
            <strong>{localRoomTrack?.title ?? "A song is waiting in the room"}</strong>
          </div>
        </div>
      </div>

      {!localRoomTrack && fallbackRoomTrack && (
        <div className="listening-room-load">
          <p>This room song is not in your queue yet.</p>
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
        {isJoined && isListener && !listenerReady && (
          <button
            type="button"
            className="listening-room-button listening-room-button--primary focus-ring-premium"
            onClick={onListenerReady}
          >
            <Headphones aria-hidden="true" /> Ready to listen
          </button>
        )}
        {isJoined && isListener && listenerBlocked && (
          <button
            type="button"
            className="listening-room-button listening-room-button--primary focus-ring-premium"
            onClick={onAutoplayRecovery}
          >
            <Play aria-hidden="true" /> Tap to continue listening
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
