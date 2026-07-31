"use client";

import { ChevronDown, HeartHandshake, Link2, ListMusic, Pause, Play, Plus, RefreshCw, Search, Settings2, SkipBack, SkipForward, Trash2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { FormEventHandler } from "react";
import { useListeningRoom } from "@/hooks/useListeningRoom";
import type { ListeningRoom, ListeningRoomPresence, ListeningRoomRealtimeStatus, MusicPlayerController, MusicPlayerSnapshot, MusicTrack, YouTubeMusicSearchResult } from "@/types/music";
import { ListenTogetherPanel } from "./ListenTogetherPanel";
import { MusicSearchPanel } from "./MusicSearchPanel";
import { VinylRecord } from "./OrbitingTrackCard";

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${remainder}`;
}

export function PersistentMusicPlayer({
  tracks,
  listeningRoom,
  realtimeStatus,
  partnerPresence,
  listenerReady,
  listenerBlocked,
  sharedControlsLocked,
  relationshipId,
  relationshipLoading,
  onLoadRoomTrack,
  onListenerReady,
  onAutoplayRecovery,
  selectedIndex,
  track,
  snapshot,
  controller,
  sourceInput,
  sourceError,
  sourceFeedback,
  queueStatus,
  expanded,
  hasPrevious,
  hasNext,
  onExpandedChange,
  onSourceInputChange,
  onSourceSubmit,
  onReplaceQueue,
  onAddSearchResult,
  onPlaySearchResult,
  onSelectTrack,
  onRemoveTrack,
  onClearQueue,
  onPrevious,
  onNext,
  onPlayPause,
  onSeekCommit,
  sharedControlPending,
  sharedControlError,
  onClose,
}: {
  tracks: MusicTrack[];
  listeningRoom: ReturnType<typeof useListeningRoom>;
  realtimeStatus: ListeningRoomRealtimeStatus;
  partnerPresence: ListeningRoomPresence | null;
  listenerReady: boolean;
  listenerBlocked: boolean;
  sharedControlsLocked: boolean;
  relationshipId: string | null | undefined;
  relationshipLoading: boolean;
  onLoadRoomTrack: (room: ListeningRoom) => void;
  onListenerReady: () => void;
  onAutoplayRecovery: () => void;
  selectedIndex: number;
  track: MusicTrack | null;
  snapshot: MusicPlayerSnapshot;
  controller: MusicPlayerController | null;
  sourceInput: string;
  sourceError: string | null;
  sourceFeedback: { message: string; tone: "success" | "notice" } | null;
  queueStatus: string;
  expanded: boolean;
  hasPrevious: boolean;
  hasNext: boolean;
  onExpandedChange: (expanded: boolean) => void;
  onSourceInputChange: (value: string) => void;
  onSourceSubmit: FormEventHandler<HTMLFormElement>;
  onReplaceQueue: () => void;
  onAddSearchResult: (result: YouTubeMusicSearchResult) => void;
  onPlaySearchResult: (result: YouTubeMusicSearchResult) => void;
  onSelectTrack: (index: number) => void;
  onRemoveTrack: (trackId: string) => void;
  onClearQueue: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onPlayPause: () => void;
  onSeekCommit: (seconds: number) => void;
  sharedControlPending: boolean;
  sharedControlError: Error | null;
  onClose: () => void;
}) {
  const [scrubbing, setScrubbing] = useState<number | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [activeSection, setActiveSection] = useState<"search" | "paste" | "queue" | "together">("search");
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const expandButtonRef = useRef<HTMLButtonElement | null>(null);
  const previousExpandedRef = useRef(expanded);
  const position = scrubbing ?? snapshot.currentTime;
  const playable = Boolean(track && !track.unavailable && snapshot.state !== "idle" && snapshot.state !== "error" && controller);
  const sharedControlDisabled = sharedControlsLocked || sharedControlPending;
  const isPlaying = snapshot.state === "playing" || snapshot.state === "buffering";
  const duration = Math.max(snapshot.duration, 0);

  useEffect(() => {
    const wasExpanded = previousExpandedRef.current;
    if (!expanded && wasExpanded) expandButtonRef.current?.focus();
    previousExpandedRef.current = expanded;
  }, [expanded]);

  useEffect(() => {
    if (!confirmClear) return;
    const timer = window.setTimeout(() => setConfirmClear(false), 4000);
    return () => window.clearTimeout(timer);
  }, [confirmClear]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      if (confirmClear) setConfirmClear(false);
      else if (expanded) onExpandedChange(false);
      else onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [confirmClear, expanded, onClose, onExpandedChange]);

  const changeSection = (section: "search" | "paste" | "queue" | "together") => {
    setActiveSection(section);
    if (section === "paste") {
      window.requestAnimationFrame(() => inputRef.current?.focus({ preventScroll: true }));
    }
  };

  const clearQueue = () => {
    if (sharedControlsLocked) return;
    if (!confirmClear) {
      setConfirmClear(true);
      return;
    }
    controller?.pause();
    onClearQueue();
    setConfirmClear(false);
  };

  return (
    <section className="persistent-music-player" data-expanded={expanded} aria-label="Music player">
      {expanded && (
        <div id="music-source-editor" className="music-player-source-editor">
          <div className="music-player-source-editor__header">
            <span className="music-player-source-editor__handle" aria-hidden="true" />
            <div>
              <span className="persistent-music-player__eyebrow">Our little radio</span>
              <strong>Find, paste, or arrange songs</strong>
            </div>
            <button type="button" className="music-player-collapse focus-ring-premium" onClick={() => onExpandedChange(false)} aria-label="Collapse player">
              <ChevronDown className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <div className="music-source-tabs" role="tablist" aria-label="Music sources">
            <button
              id="music-tab-search"
              type="button"
              role="tab"
              aria-selected={activeSection === "search"}
              aria-controls="music-panel-search"
              className="focus-ring-premium"
              onClick={() => changeSection("search")}
            >
              <Search aria-hidden="true" /> Search
            </button>
            <button
              id="music-tab-paste"
              type="button"
              role="tab"
              aria-selected={activeSection === "paste"}
              aria-controls="music-panel-paste"
              className="focus-ring-premium"
              onClick={() => changeSection("paste")}
            >
              <Link2 aria-hidden="true" /> Paste Link
            </button>
            <button
              id="music-tab-queue"
              type="button"
              role="tab"
              aria-selected={activeSection === "queue"}
              aria-controls="music-panel-queue"
              className="focus-ring-premium"
              onClick={() => changeSection("queue")}
            >
              <ListMusic aria-hidden="true" /> Queue <span>{tracks.length}</span>
            </button>
            <button
              id="music-tab-together"
              type="button"
              role="tab"
              aria-selected={activeSection === "together"}
              aria-controls="music-panel-together"
              className="focus-ring-premium"
              onClick={() => changeSection("together")}
            >
              <HeartHandshake aria-hidden="true" /> Together
            </button>
          </div>

          {activeSection === "search" && (
            sharedControlsLocked ? (
              <section id="music-panel-search" className="music-search-panel" role="tabpanel" aria-labelledby="music-tab-search">
                <div className="music-search-empty">
                  <HeartHandshake aria-hidden="true" />
                  <p>Your partner is guiding the shared song.</p>
                  <span>Open Together to add the room song, or leave the room to choose another track.</span>
                </div>
              </section>
            ) : (
              <MusicSearchPanel
                tracks={tracks}
                onAdd={onAddSearchResult}
                onPlayNow={onPlaySearchResult}
                onOpenPaste={() => changeSection("paste")}
              />
            )
          )}

          {activeSection === "paste" && (
            <section id="music-panel-paste" className="music-source-panel" role="tabpanel" aria-labelledby="music-tab-paste">
              <div className="music-source-panel__intro">
                <span className="persistent-music-player__eyebrow">Paste Link</span>
                <h3>Add a video or playlist you already love</h3>
              </div>
              <form onSubmit={onSourceSubmit} className="music-player-source-form">
                <label className="sr-only" htmlFor="music-youtube-url">One or more YouTube video or playlist links</label>
                <textarea
                  ref={inputRef}
                  id="music-youtube-url"
                  value={sourceInput}
                  onChange={(event) => onSourceInputChange(event.target.value)}
                  placeholder="Paste one or more YouTube links"
                  inputMode="url"
                  autoComplete="url"
                  rows={2}
                  aria-invalid={Boolean(sourceError)}
                  aria-describedby={sourceError ? "music-source-error" : sourceFeedback ? "music-source-feedback" : undefined}
                />
                <div className="music-player-source-form__actions">
                  <button type="submit" className="music-player-add focus-ring-premium" disabled={!sourceInput.trim()}>
                    <Plus className="h-4 w-4" aria-hidden="true" /> Add to queue
                  </button>
                  <button type="button" className="music-player-replace focus-ring-premium" onClick={onReplaceQueue} disabled={!sourceInput.trim() || sharedControlsLocked}>
                    <RefreshCw className="h-4 w-4" aria-hidden="true" /> Replace queue
                  </button>
                </div>
              </form>
              {sourceError && <p id="music-source-error" className="music-player-source-error" role="status">{sourceError}</p>}
              {sourceFeedback && <p id="music-source-feedback" className="music-player-source-feedback" data-tone={sourceFeedback.tone} role="status">{sourceFeedback.message}</p>}
            </section>
          )}

          {activeSection === "together" && (
            <ListenTogetherPanel
              listeningRoom={listeningRoom}
              realtimeStatus={realtimeStatus}
              partnerPresence={partnerPresence}
              listenerReady={listenerReady}
              listenerBlocked={listenerBlocked}
              relationshipId={relationshipId}
              relationshipLoading={relationshipLoading}
              currentTrack={track}
              snapshot={snapshot}
              tracks={tracks}
              onLoadRoomTrack={onLoadRoomTrack}
              onListenerReady={onListenerReady}
              onAutoplayRecovery={onAutoplayRecovery}
            />
          )}

          {activeSection === "queue" && (
            <section id="music-panel-queue" className="music-source-panel" role="tabpanel" aria-labelledby="music-tab-queue">
              <div className="music-queue">
                <div className="music-queue__header">
                  <div>
                    <span className="persistent-music-player__eyebrow">Queue</span>
                    <strong>{queueStatus}</strong>
                  </div>
                  {tracks.length > 0 && (
                    <button type="button" className="music-queue-clear focus-ring-premium disabled:cursor-not-allowed disabled:opacity-50" data-confirm={confirmClear} onClick={clearQueue} disabled={sharedControlsLocked}>
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                      {confirmClear ? "Confirm clear" : "Clear"}
                    </button>
                  )}
                </div>
                {tracks.length === 0 ? (
                  <div className="music-queue-empty">
                    <ListMusic className="h-5 w-5" aria-hidden="true" />
                    <span>Add a song to your little radio</span>
                  </div>
                ) : (
                  <ol className="music-queue-list" aria-label={`${tracks.length} songs in queue`}>
                    {tracks.map((queueTrack, index) => (
                      <li key={queueTrack.id} className="music-queue-row" data-selected={index === selectedIndex} data-unavailable={queueTrack.unavailable || undefined}>
                        <button type="button" className="music-queue-row__select focus-ring-premium disabled:cursor-not-allowed disabled:opacity-50" onClick={() => onSelectTrack(index)} disabled={sharedControlsLocked} aria-current={index === selectedIndex ? "true" : undefined}>
                          <VinylRecord track={queueTrack} selected={index === selectedIndex} playing={index === selectedIndex && isPlaying} compact />
                          <span className="music-queue-row__position">{index + 1}</span>
                          <span className="music-queue-row__copy">
                            <strong>{queueTrack.title}</strong>
                            <span>{queueTrack.unavailable ? "Unavailable" : queueTrack.artist ?? "YouTube"}</span>
                          </span>
                        </button>
                        <button type="button" className="music-queue-row__remove focus-ring-premium disabled:cursor-not-allowed disabled:opacity-50" onClick={() => onRemoveTrack(queueTrack.id)} disabled={sharedControlsLocked} aria-label={`Remove ${queueTrack.title} from queue`}>
                          <X className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            </section>
          )}
        </div>
      )}
      <div className="persistent-music-player__dock">
        <div className="persistent-music-player__vinyl">
          <VinylRecord track={track} selected={Boolean(track)} playing={isPlaying} compact />
        </div>
        <div className="persistent-music-player__copy">
          <span className="persistent-music-player__eyebrow">Our Little Radio</span>
          <strong>{track?.title ?? "Choose something to play"}</strong>
          <span>{track ? `${selectedIndex + 1} of ${tracks.length} - ${track.unavailable ? "Unavailable" : track.artist ?? "YouTube"}` : "Add a song to begin"}</span>
        </div>
        <div className="persistent-music-player__controls">
          <button type="button" className="music-player-icon focus-ring-premium" onClick={onPrevious} disabled={!hasPrevious || sharedControlDisabled} aria-label={sharedControlsLocked ? "Previous track controlled by your partner" : "Previous track"}><SkipBack className="h-4 w-4" aria-hidden="true" /></button>
          <button
            type="button"
            className="music-player-play focus-ring-premium"
            onClick={onPlayPause}
            disabled={!playable || sharedControlDisabled}
            aria-label={sharedControlsLocked ? "Playback controlled by your partner" : isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? <Pause className="h-4 w-4" fill="currentColor" aria-hidden="true" /> : <Play className="h-4 w-4" fill="currentColor" aria-hidden="true" />}
          </button>
          <button type="button" className="music-player-icon focus-ring-premium" onClick={onNext} disabled={!hasNext || sharedControlDisabled} aria-label={sharedControlsLocked ? "Next track controlled by your partner" : "Next track"}><SkipForward className="h-4 w-4" aria-hidden="true" /></button>
        </div>
        <button
          ref={expandButtonRef}
          type="button"
          className="music-player-change focus-ring-premium"
          onClick={() => {
            if (!expanded) setActiveSection("search");
            onExpandedChange(!expanded);
          }}
          aria-expanded={expanded}
          aria-controls="music-source-editor"
          aria-label={expanded ? "Collapse music queue" : "Open music queue"}
        >
          <Settings2 className="h-4 w-4" aria-hidden="true" />
          <span>Music & queue</span>
        </button>
        <button type="button" className="music-player-close focus-ring-premium" onClick={onClose} aria-label="Close music"><X className="h-4 w-4" aria-hidden="true" /></button>
        <div className="persistent-music-player__progress">
          <span>{formatTime(position)}</span>
          <input
            aria-label="Seek through track"
            type="range"
            min="0"
            max={duration || 1}
            step="0.1"
            value={Math.min(position, duration || 1)}
            disabled={!playable || duration === 0 || sharedControlDisabled}
            onChange={(event) => setScrubbing(Number(event.target.value))}
            onPointerUp={(event) => { onSeekCommit(Number((event.target as HTMLInputElement).value)); setScrubbing(null); }}
            onKeyUp={(event) => { onSeekCommit(Number((event.target as HTMLInputElement).value)); setScrubbing(null); }}
            onBlur={() => setScrubbing(null)}
          />
          <span>{formatTime(duration)}</span>
        </div>
        {sharedControlsLocked && (
          <p className="persistent-music-player__error listening-room-note" role="status">
            Your partner is guiding the music.
          </p>
        )}
        {snapshot.error && <p className="persistent-music-player__error" role="status">{snapshot.error}</p>}
        {sharedControlError && (
          <p className="persistent-music-player__error" role="status">
            {sharedControlError instanceof Error
              ? sharedControlError.message
              : "The shared player could not be updated."}
          </p>
        )}
      </div>
    </section>
  );
}
