"use client";

import { useMemo, useState } from "react";
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
  MusicPlayerSnapshot,
  MusicTrack,
} from "@/types/music";
import { VinylRecord } from "./OrbitingTrackCard";

function errorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "The listening room could not be updated. Please try again.";
}

export function ListenTogetherPanel({
  relationshipId,
  currentTrack,
  snapshot,
  tracks,
  onLoadRoomTrack,
}: {
  relationshipId: string | null | undefined;
  currentTrack: MusicTrack | null;
  snapshot: MusicPlayerSnapshot;
  tracks: MusicTrack[];
  onLoadRoomTrack: (room: ListeningRoom) => void;
}) {
  const { profile } = useAuth();
  const [confirmEnd, setConfirmEnd] = useState(false);
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

  if (!relationshipId) {
    return (
      <section id="music-panel-together" className="music-source-panel listening-room-panel" role="tabpanel" aria-labelledby="music-tab-together">
        <div className="listening-room-empty">
          <HeartHandshake aria-hidden="true" />
          <h3>Listen together</h3>
          <p>Choose your relationship before opening a room for the two of you.</p>
        </div>
      </section>
    );
  }

  if (roomQuery.isLoading) {
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
          {!roomSnapshot && (
            <p className="listening-room-note" role="status">
              Choose a song first. A playlist also needs to finish loading its current song.
            </p>
          )}
          <button
            type="button"
            className="listening-room-button listening-room-button--primary focus-ring-premium"
            disabled={!roomSnapshot || isCreating}
            onClick={() => {
              if (roomSnapshot) void createRoom(roomSnapshot);
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
