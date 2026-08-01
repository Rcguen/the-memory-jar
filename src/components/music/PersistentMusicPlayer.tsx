"use client";

import { ChevronDown, HeartHandshake, Link2, ListMusic, Pause, Play, Plus, RefreshCw, Search, Settings2, SkipBack, SkipForward, Trash2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { FormEventHandler, KeyboardEvent as ReactKeyboardEvent } from "react";
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
  const [activeSection, setActiveSection] = useState<"discover" | "queue" | "together">("discover");
  const [discoverMode, setDiscoverMode] = useState<"search" | "paste">("search");
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const expandButtonRef = useRef<HTMLButtonElement | null>(null);
  const previousExpandedRef = useRef(expanded);
  const position = scrubbing ?? snapshot.currentTime;
  const playable = Boolean(track && !track.unavailable && snapshot.state !== "idle" && snapshot.state !== "error" && controller);
  const sharedControlDisabled = sharedControlsLocked || sharedControlPending;
  const isPlaying = snapshot.state === "playing" || snapshot.state === "buffering";
  const duration = Math.max(snapshot.duration, 0);
  const roomOpen = Boolean(listeningRoom.room);
  const dockStatus = realtimeStatus === "reconnecting" || realtimeStatus === "error"
    ? "Reconnecting"
    : roomOpen && partnerPresence
      ? "Listening together"
      : roomOpen
        ? "Room open"
        : snapshot.state === "buffering"
          ? "Catching up"
          : isPlaying
            ? "Playing"
            : "Private radio";

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
      if (discoverMode === "paste" && expanded) setDiscoverMode("search");
      else if (confirmClear) setConfirmClear(false);
      else if (expanded) onExpandedChange(false);
      else onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [confirmClear, discoverMode, expanded, onClose, onExpandedChange]);

  const changeSection = (section: "discover" | "queue" | "together") => {
    setActiveSection(section);
  };

  const changeDiscoverMode = (mode: "search" | "paste") => {
    setDiscoverMode(mode);
    if (mode === "paste") {
      window.requestAnimationFrame(() => inputRef.current?.focus({ preventScroll: true }));
    }
  };

  const onTabKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>, index: number) => {
    const sections = ["discover", "queue", "together"] as const;
    let nextIndex = index;
    if (event.key === "ArrowRight") nextIndex = (index + 1) % sections.length;
    else if (event.key === "ArrowLeft") nextIndex = (index - 1 + sections.length) % sections.length;
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = sections.length - 1;
    else return;

    event.preventDefault();
    changeSection(sections[nextIndex]);
    tabRefs.current[nextIndex]?.focus();
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
          <span className="music-player-source-editor__handle" aria-hidden="true" />

          <header className="music-dock-header">
            <div className="music-dock-header__record">
              <VinylRecord track={track} selected={Boolean(track)} playing={isPlaying} compact />
            </div>
            <div className="music-dock-header__copy">
              <span className="persistent-music-player__eyebrow">Our little radio</span>
              <h2>{track?.title ?? "Choose something for your little radio"}</h2>
              <p>
                {track
                  ? (track.unavailable ? "Unavailable" : track.artist ?? "YouTube") + " / " + (selectedIndex + 1) + " of " + tracks.length
                  : "Search for a song or paste a YouTube link."}
              </p>
              <span className="music-dock-status" data-state={dockStatus === "Reconnecting" ? "reconnecting" : roomOpen ? "together" : "local"}>
                <span aria-hidden="true" />
                {dockStatus}
              </span>
            </div>
            <button type="button" className="music-player-collapse focus-ring-premium" onClick={() => onExpandedChange(false)} aria-label="Collapse music player">
              <ChevronDown className="h-4 w-4" aria-hidden="true" />
            </button>
          </header>

          <div className="music-source-tabs" role="tablist" aria-label="Our little radio sections">
            {([
              { id: "discover", label: "Discover", icon: Search },
              { id: "queue", label: "Queue", icon: ListMusic },
              { id: "together", label: "Together", icon: HeartHandshake },
            ] as const).map((section, index) => {
              const Icon = section.icon;
              const selected = activeSection === section.id;
              return (
                <button
                  key={section.id}
                  ref={(node) => { tabRefs.current[index] = node; }}
                  id={"music-tab-" + section.id}
                  type="button"
                  role="tab"
                  tabIndex={selected ? 0 : -1}
                  aria-selected={selected}
                  aria-controls={"music-panel-" + section.id}
                  className="focus-ring-premium"
                  onClick={() => changeSection(section.id)}
                  onKeyDown={(event) => onTabKeyDown(event, index)}
                >
                  <Icon aria-hidden="true" />
                  <span>{section.label}</span>
                  {section.id === "queue" && <span className="music-source-tabs__count">{tracks.length}</span>}
                  {section.id === "together" && (
                    <>
                      <span
                        className="music-source-tabs__state"
                        data-state={realtimeStatus === "reconnecting" || realtimeStatus === "error" ? "reconnecting" : roomOpen ? "open" : "idle"}
                        aria-hidden="true"
                      />
                      <span className="sr-only">{roomOpen ? dockStatus : "No listening room"}</span>
                    </>
                  )}
                </button>
              );
            })}
          </div>

          <div className="music-dock-content" data-section={activeSection}>
            {activeSection === "discover" && (
              <section id="music-panel-discover" className="music-source-panel music-discover-panel" role="tabpanel" aria-labelledby="music-tab-discover">
                <div className="music-discover-modes" aria-label="Discover music">
                  <button
                    type="button"
                    className="focus-ring-premium"
                    aria-pressed={discoverMode === "search"}
                    onClick={() => changeDiscoverMode("search")}
                  >
                    <Search aria-hidden="true" /> Search songs
                  </button>
                  <button
                    type="button"
                    className="focus-ring-premium"
                    aria-pressed={discoverMode === "paste"}
                    onClick={() => changeDiscoverMode("paste")}
                  >
                    <Link2 aria-hidden="true" /> Paste a link
                  </button>
                </div>

                {discoverMode === "search" && (
                  sharedControlsLocked ? (
                    <div className="music-search-empty">
                      <HeartHandshake aria-hidden="true" />
                      <p>Your partner is guiding the shared song.</p>
                      <span>Open Together to follow the room, or leave it before choosing another track.</span>
                    </div>
                  ) : (
                    <MusicSearchPanel
                      tracks={tracks}
                      onAdd={onAddSearchResult}
                      onPlayNow={onPlaySearchResult}
                      onOpenPaste={() => changeDiscoverMode("paste")}
                    />
                  )
                )}

                {discoverMode === "paste" && (
                  <div className="music-paste-panel">
                    <div className="music-source-panel__intro">
                      <span className="persistent-music-player__eyebrow">Paste a link</span>
                      <h3>Bring in a video or playlist you already love</h3>
                      <p>Add one or more YouTube links without leaving your little radio.</p>
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
                  </div>
                )}
              </section>
            )}

            {activeSection === "queue" && (
              <section id="music-panel-queue" className="music-source-panel" role="tabpanel" aria-labelledby="music-tab-queue">
                <div className="music-queue">
                  <div className="music-queue__header">
                    <div>
                      <span className="persistent-music-player__eyebrow">{tracks.length} {tracks.length === 1 ? "song" : "songs"}</span>
                      <h3>Your queue</h3>
                      <p>{queueStatus}</p>
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
                      <VinylRecord track={null} selected={false} playing={false} compact />
                      <div>
                        <strong>Your radio is waiting for a song.</strong>
                        <button type="button" className="focus-ring-premium" onClick={() => changeSection("discover")}>Open Discover</button>
                      </div>
                    </div>
                  ) : (
                    <ol className="music-queue-list" aria-label={tracks.length + " songs in queue"}>
                      {tracks.map((queueTrack, index) => (
                        <li key={queueTrack.id} className="music-queue-row" data-selected={index === selectedIndex} data-unavailable={queueTrack.unavailable || undefined}>
                          <button type="button" className="music-queue-row__select focus-ring-premium disabled:cursor-not-allowed disabled:opacity-50" onClick={() => onSelectTrack(index)} disabled={sharedControlsLocked} aria-current={index === selectedIndex ? "true" : undefined}>
                            <span className="music-queue-row__position">{index + 1}</span>
                            <VinylRecord track={queueTrack} selected={index === selectedIndex} playing={index === selectedIndex && isPlaying} compact />
                            <span className="music-queue-row__copy">
                              <strong>{queueTrack.title}</strong>
                              <span>{queueTrack.unavailable ? "Unavailable" : queueTrack.artist ?? "YouTube"}</span>
                            </span>
                            {index === selectedIndex && <span className="music-queue-row__playing">{isPlaying ? "Playing" : "Selected"}</span>}
                          </button>
                          <button type="button" className="music-queue-row__remove focus-ring-premium disabled:cursor-not-allowed disabled:opacity-50" onClick={() => onRemoveTrack(queueTrack.id)} disabled={sharedControlsLocked} aria-label={"Remove " + queueTrack.title + " from queue"}>
                            <X className="h-4 w-4" aria-hidden="true" />
                          </button>
                        </li>
                      ))}
                    </ol>
                  )}
                </div>
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
          </div>
        </div>
      )}
      <div className="persistent-music-player__dock">
        <div className="persistent-music-player__vinyl">
          <VinylRecord track={track} selected={Boolean(track)} playing={isPlaying} compact />
        </div>
        <div className="persistent-music-player__copy">
          <strong>{track?.title ?? "Choose something for your little radio"}</strong>
          <span>
            {track
              ? (track.unavailable ? "Unavailable" : track.artist ?? "YouTube") + " / " + (selectedIndex + 1) + " of " + tracks.length
              : "Search or paste a YouTube link"}
          </span>
          <span className="persistent-music-player__shared-status" data-active={roomOpen || undefined}>
            <HeartHandshake aria-hidden="true" />
            {dockStatus}
          </span>
        </div>
        <div className="persistent-music-player__controls" aria-label="Playback controls">
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
            if (!expanded) {
              setActiveSection("discover");
              setDiscoverMode("search");
            }
            onExpandedChange(!expanded);
          }}
          aria-expanded={expanded}
          aria-controls="music-source-editor"
          aria-label={expanded ? "Collapse Our Little Radio" : "Open Our Little Radio"}
        >
          <Settings2 className="h-4 w-4" aria-hidden="true" />
          <span>{expanded ? "Collapse" : "Open radio"}</span>
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
            Your partner is guiding playback.
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
      </div>    </section>
  );
}
