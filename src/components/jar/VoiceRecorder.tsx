"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, Pause, Play, RotateCcw, SlidersHorizontal, Square, Trash2, Volume2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { getPreferredAudioMimeType } from "@/lib/media-processing";
import { cn } from "@/lib/utils";
import { useIsPhone } from "@/hooks/useIsPhone";
import { useNativeMicrophone } from "@/hooks/useNativeMicrophone";

const MAX_AUDIO_BYTES = 25 * 1024 * 1024;
const RECORDER_TIMESLICE_MS = 250;
const MIC_WARMUP_MS = 800;
const MIN_MIC_RMS = 0.002;
const LOW_MIC_RMS = 0.01;
const SELECTED_MIC_STORAGE_KEY = "memory-jar:selected-microphone-id";

interface VoiceRecorderProps {
  onRecordingReady: (file: File) => void;
  disabled?: boolean;
}

function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}:${rest.toString().padStart(2, "0")}`;
}

function getExtensionForAudioType(type: string) {
  const baseMime = type.split(";")[0].trim();
  if (baseMime.includes("mp4")) return "m4a";
  if (baseMime.includes("mpeg")) return "mp3";
  return "webm";
}

type AudioElementWithTracks = HTMLAudioElement & {
  audioTracks?: { length: number } | unknown;
};

async function inspectAudioObjectUrl(url: string) {
  const { audio, duration } = await new Promise<{ audio: AudioElementWithTracks; duration: number }>((resolve, reject) => {
    const audio = new Audio();
    let settled = false;
    let attemptedDurationFix = false;

    const cleanup = () => {
      settled = true;
      window.clearTimeout(timeout);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("durationchange", handleDurationChange);
      audio.removeEventListener("error", handleError);
    };

    const finish = (duration: number) => {
      cleanup();
      resolve({ audio, duration });
    };

    const readDuration = () => {
      if (Number.isFinite(audio.duration) && audio.duration > 0) {
        finish(audio.duration);
        return;
      }

      if (!attemptedDurationFix) {
        attemptedDurationFix = true;
        try {
          audio.currentTime = Number.MAX_SAFE_INTEGER;
        } catch {
          // Some browsers reject the WebM duration seek trick. The timeout will reject.
        }
      }
    };

    const handleLoadedMetadata = () => readDuration();
    const handleDurationChange = () => readDuration();
    const handleError = () => {
      cleanup();
      reject(new Error("Audio metadata could not be loaded."));
    };
    const timeout = window.setTimeout(() => {
      if (settled) return;
      cleanup();
      reject(new Error("Audio metadata timed out."));
    }, 3000);

    audio.preload = "metadata";
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("durationchange", handleDurationChange);
    audio.addEventListener("error", handleError);
    audio.src = url;
    audio.load();
  });

  let playError: unknown = null;
  try {
    audio.muted = true;
    audio.currentTime = 0;
    await audio.play();
    audio.pause();
    audio.currentTime = 0;
  } catch (error) {
    playError = error;
  }

  console.log("duration", duration);
  console.log("audioTracks", audio.audioTracks ?? null);
  console.log("play error", playError);
  audio.src = "";

  return { duration, playError };
}

export function VoiceRecorder({ onRecordingReady, disabled }: VoiceRecorderProps) {
  const isPhone = useIsPhone();
  const { canUseMicrophone } = useNativeMicrophone();
  const [isSupported, setIsSupported] = useState(true);
  const [status, setStatus] = useState<"idle" | "preparing" | "recording" | "paused" | "ready">("idle");
  const [duration, setDuration] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [canPauseRecorder, setCanPauseRecorder] = useState(false);
  const [inputLevel, setInputLevel] = useState(0);
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState(() => (
    typeof window === "undefined" ? "" : window.localStorage.getItem(SELECTED_MIC_STORAGE_KEY) ?? ""
  ));
  const [boostEnabled, setBoostEnabled] = useState(false);
  const [boostAmount, setBoostAmount] = useState<"2" | "3">("2");
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recordingStreamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const intervalRef = useRef<number | null>(null);
  const warmupTimeoutRef = useRef<number | null>(null);
  const recordingSessionRef = useRef(0);
  const previewUrlRef = useRef<string | null>(null);
  // Direct ref to the preview <audio> element so we can force-reset it
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const boostedDestinationRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const levelFrameRef = useRef<number | null>(null);
  const peakRmsRef = useRef(0);
  const lastLevelLogRef = useRef(0);

  const mimeType = useMemo(() => {
    if (typeof window === "undefined" || typeof MediaRecorder === "undefined") return "";
    return getPreferredAudioMimeType();
  }, []);

  const refreshAudioDevices = async () => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.enumerateDevices) return;
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const microphones = devices.filter((device) => device.kind === "audioinput");
      setAudioDevices(microphones);
      setSelectedDeviceId((current) => {
        if (!current || microphones.some((device) => device.deviceId === current)) return current;
        window.localStorage.removeItem(SELECTED_MIC_STORAGE_KEY);
        return "";
      });
    } catch (deviceError) {
      console.warn("[VoiceRecorder] Could not enumerate microphones:", deviceError);
    }
  };

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setIsSupported(typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== "undefined");
    }, 0);
    return () => window.clearTimeout(timeout);
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => {
      void refreshAudioDevices();
    }, 0);

    const handleDeviceChange = () => {
      void refreshAudioDevices();
    };
    navigator.mediaDevices?.addEventListener?.("devicechange", handleDeviceChange);
    return () => {
      window.clearTimeout(id);
      navigator.mediaDevices?.removeEventListener?.("devicechange", handleDeviceChange);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
      clearWarmupTimer();
      stopInputStream();
      cleanupAudioMonitor();
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    };
  }, []);

  // Whenever previewUrl changes, force the audio element to reload from position 0.
  // Blob URLs can load quickly, so the browser may fire loadedmetadata before
  // React attaches every handler.
  useEffect(() => {
    const audio = previewAudioRef.current;
    if (!audio || !previewUrl) return;

    // Give the browser one tick to attach the src, then force a clean reload.
    const id = window.setTimeout(() => {
      audio.load();
      audio.currentTime = 0;
      console.log("[VoiceRecorder] audio loaded. duration:", audio.duration, "currentTime:", audio.currentTime);
    }, 50);

    return () => window.clearTimeout(id);
  }, [previewUrl]);

  const startTimer = () => {
    if (intervalRef.current) window.clearInterval(intervalRef.current);
    intervalRef.current = window.setInterval(() => {
      setDuration((value) => value + 1);
    }, 1000);
  };

  const stopTimer = () => {
    if (intervalRef.current) window.clearInterval(intervalRef.current);
    intervalRef.current = null;
  };

  const clearWarmupTimer = () => {
    if (warmupTimeoutRef.current !== null) {
      window.clearTimeout(warmupTimeoutRef.current);
      warmupTimeoutRef.current = null;
    }
  };

  const waitForMicWarmup = (sessionId: number) => (
    new Promise<boolean>((resolve) => {
      clearWarmupTimer();
      warmupTimeoutRef.current = window.setTimeout(() => {
        warmupTimeoutRef.current = null;
        resolve(recordingSessionRef.current === sessionId);
      }, MIC_WARMUP_MS);
    })
  );

  function stopLevelMonitor() {
    if (levelFrameRef.current !== null) {
      cancelAnimationFrame(levelFrameRef.current);
      levelFrameRef.current = null;
    }
    setInputLevel(0);
  }

  function cleanupAudioMonitor() {
    stopLevelMonitor();
    gainNodeRef.current?.disconnect();
    gainNodeRef.current = null;
    boostedDestinationRef.current?.disconnect();
    boostedDestinationRef.current?.stream.getTracks().forEach((track) => track.stop());
    boostedDestinationRef.current = null;
    audioSourceRef.current?.disconnect();
    audioSourceRef.current = null;
    const audioContext = audioContextRef.current;
    audioContextRef.current = null;
    if (audioContext && audioContext.state !== "closed") {
      audioContext.close().catch(() => undefined);
    }
  }

  function stopInputStream() {
    if (recordingStreamRef.current && recordingStreamRef.current !== streamRef.current) {
      recordingStreamRef.current.getTracks().forEach((track) => track.stop());
    }
    recordingStreamRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }

  const setupAudioGraph = async (stream: MediaStream, gainBoost: number) => {
    const AudioContextCtor =
      window.AudioContext ||
      (window as Window & typeof globalThis & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextCtor) return stream;

    cleanupAudioMonitor();

    const audioContext = new AudioContextCtor();
    audioContextRef.current = audioContext;
    if (audioContext.state === "suspended") {
      await audioContext.resume();
    }

    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048;
    source.connect(analyser);
    audioSourceRef.current = source;

    let recordingStream = stream;
    if (gainBoost > 1) {
      const gainNode = audioContext.createGain();
      const destination = audioContext.createMediaStreamDestination();
      gainNode.gain.value = gainBoost;
      source.connect(gainNode);
      gainNode.connect(destination);
      gainNodeRef.current = gainNode;
      boostedDestinationRef.current = destination;
      recordingStream = destination.stream;
      console.log("[VoiceRecorder] boost enabled", gainBoost, destination.stream.getAudioTracks().map((track) => ({
        label: track.label,
        enabled: track.enabled,
        muted: track.muted,
        readyState: track.readyState,
        settings: track.getSettings(),
      })));
    }

    const samples = new Uint8Array(analyser.fftSize);
    peakRmsRef.current = 0;

    const monitor = () => {
      analyser.getByteTimeDomainData(samples);
      let sumSquares = 0;
      for (const sample of samples) {
        const normalized = (sample - 128) / 128;
        sumSquares += normalized * normalized;
      }
      const rms = Math.sqrt(sumSquares / samples.length);
      if (rms > peakRmsRef.current) peakRmsRef.current = rms;
      const currentLevel = Math.min(1, rms * 12);
      setInputLevel(currentLevel);
      const now = Date.now();
      if (now - lastLevelLogRef.current > 500) {
        console.log("mic level", currentLevel);
        lastLevelLogRef.current = now;
      }
      levelFrameRef.current = requestAnimationFrame(monitor);
    };
    monitor();
    return recordingStream;
  };

  const discard = () => {
    recordingSessionRef.current += 1;
    clearWarmupTimer();
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.ondataavailable = null;
      recorder.onstop = null;
      recorder.onerror = null;
      recorder.stop();
    }
    stopTimer();
    recorderRef.current = null;
    chunksRef.current = [];
    peakRmsRef.current = 0;
    stopInputStream();
    cleanupAudioMonitor();
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = null;
    setPreviewUrl(null);
    setDuration(0);
    setCanPauseRecorder(false);
    setStatus("idle");
    setError(null);
  };

  const startRecording = async () => {
    setError(null);
    if (!isSupported) return;

    try {
      discard();
      const sessionId = recordingSessionRef.current + 1;
      recordingSessionRef.current = sessionId;
      const audioConstraints: MediaTrackConstraints = {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        ...(selectedDeviceId ? { deviceId: { exact: selectedDeviceId } } : {}),
      };
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: audioConstraints,
      });
      streamRef.current = stream;
      chunksRef.current = [];
      peakRmsRef.current = 0;
      lastLevelLogRef.current = 0;
      void refreshAudioDevices();
      const audioTracks = stream.getAudioTracks();
      console.log("tracks", stream.getAudioTracks().map(t => ({
        label: t.label,
        enabled: t.enabled,
        muted: t.muted,
        readyState: t.readyState,
        settings: t.getSettings()
      })));
      console.log("[VoiceRecorder] audio tracks", audioTracks.map((track) => ({
        label: track.label,
        enabled: track.enabled,
        muted: track.muted,
        readyState: track.readyState,
        settings: track.getSettings(),
      })));
      if (audioTracks.length === 0) {
        throw new Error("No microphone track was provided by the browser.");
      }

      console.log("[VoiceRecorder] selected mimeType:", mimeType || "(browser default)");
      const gainBoost = boostEnabled ? Number(boostAmount) : 1;
      const recordingStream = await setupAudioGraph(stream, gainBoost);
      recordingStreamRef.current = recordingStream;
      console.log("[VoiceRecorder] recording stream tracks", stream.getAudioTracks().map((track) => ({
        label: track.label,
        enabled: track.enabled,
        muted: track.muted,
        readyState: track.readyState,
        settings: track.getSettings(),
      })));
      console.log("[VoiceRecorder] recorder input stream", {
        original: recordingStream === stream,
        boosted: gainBoost > 1,
        gainBoost,
        tracks: recordingStream.getAudioTracks().map((track) => ({
          label: track.label,
          enabled: track.enabled,
          muted: track.muted,
          readyState: track.readyState,
          settings: track.getSettings(),
        })),
      });

      setDuration(0);
      setStatus("preparing");
      const warmupComplete = await waitForMicWarmup(sessionId);
      if (!warmupComplete || streamRef.current !== stream) {
        stopInputStream();
        cleanupAudioMonitor();
        return;
      }

      const recorder = new MediaRecorder(recordingStream, mimeType ? { mimeType } : undefined);
      console.log("[VoiceRecorder] recorder uses original stream", recorder.stream === stream);
      recorderRef.current = recorder;
      setCanPauseRecorder(typeof recorder.pause === "function" && typeof recorder.resume === "function");

      recorder.ondataavailable = (event) => {
        console.log("chunk", event.data.size);
        console.log("[VoiceRecorder] ondataavailable chunk size:", event.data.size, "type:", event.data.type);
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      recorder.onerror = (event) => {
        console.error("[VoiceRecorder] recorder error:", event);
        setError("Recording failed. Please try again or upload an audio file.");
        toast.error("Recording failed. Please try again.");
      };

      recorder.onstop = async () => {
        stopTimer();
        const peakRms = peakRmsRef.current;
        console.log("[VoiceRecorder] peak rms", peakRms);

        // Preserve the full MIME type string INCLUDING codec (e.g. "audio/webm;codecs=opus").
        const recordedType = recorder.mimeType || mimeType || "audio/webm";
        console.log("recorder mime", recorder.mimeType);
        console.log("chunks", chunksRef.current.length);
        console.log("[VoiceRecorder] onstop chunks:", chunksRef.current.length, "recordedType:", recordedType);

        if (peakRms < MIN_MIC_RMS) {
          stopInputStream();
          cleanupAudioMonitor();
          setError("No voice detected. Please check microphone input.");
          toast.error("No voice detected. Please check microphone input.");
          setStatus("idle");
          return;
        }

        const blob = new Blob(chunksRef.current, { type: recordedType });
        console.log("blob", blob.size);
        console.log("[VoiceRecorder] media recorder blob size:", blob.size, "bytes, type:", blob.type);

        if (blob.size === 0) {
          stopInputStream();
          cleanupAudioMonitor();
          setError("The recording was empty. Please try recording again.");
          toast.error("The recording was empty. Please try again.");
          setStatus("idle");
          return;
        }

        if (blob.size > MAX_AUDIO_BYTES) {
          stopInputStream();
          cleanupAudioMonitor();
          setError("Recording is too large. Please record a shorter message.");
          toast.error("Recording exceeds the 25MB voice limit.");
          setStatus("idle");
          return;
        }

        const extension = getExtensionForAudioType(recordedType);
        const file = new File([blob], `voice-recording-${Date.now()}.${extension}`, {
          type: recordedType,
          lastModified: Date.now(),
        });
        console.log("file", file.name, file.type, file.size);
        console.log("[VoiceRecorder] file type:", file.type);

        if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
        const url = URL.createObjectURL(file);

        try {
          const { duration: audioDuration } = await inspectAudioObjectUrl(url);
          console.log("[VoiceRecorder] audio sanity duration:", audioDuration);
          if (audioDuration <= 0.3) {
            URL.revokeObjectURL(url);
            stopInputStream();
            cleanupAudioMonitor();
            setError("The recording is too short. Please record a little longer.");
            toast.error("The recording is too short.");
            setStatus("idle");
            return;
          }
        } catch (durationError) {
          URL.revokeObjectURL(url);
          stopInputStream();
          cleanupAudioMonitor();
          console.error("[VoiceRecorder] audio sanity check failed:", durationError);
          setError("This browser could not read the recording. Please try again or upload an audio file.");
          toast.error("Could not read the recording.");
          setStatus("idle");
          return;
        }

        previewUrlRef.current = url;
        console.log("[VoiceRecorder] blob URL created:", url);
        setPreviewUrl(url);
        onRecordingReady(file);
        setStatus("ready");
        if (peakRms < LOW_MIC_RMS) {
          const warning = "No clear voice was detected. Try speaking louder or choosing another microphone.";
          setError(warning);
          toast.warning(warning);
        }
        stopInputStream();
        cleanupAudioMonitor();
      };

      recorder.start(RECORDER_TIMESLICE_MS);
      startTimer();
      setStatus("recording");
    } catch (permissionError) {
      console.error("[VoiceRecorder] Microphone permission failed:", permissionError);
      clearWarmupTimer();
      stopInputStream();
      cleanupAudioMonitor();
      setError("Microphone access was blocked. You can still upload an audio file.");
      toast.error("Microphone access was blocked.");
      setStatus("idle");
    }
  };

  const handleDeviceChange = (deviceId: string) => {
    setSelectedDeviceId(deviceId);
    if (deviceId) {
      window.localStorage.setItem(SELECTED_MIC_STORAGE_KEY, deviceId);
    } else {
      window.localStorage.removeItem(SELECTED_MIC_STORAGE_KEY);
    }
  };

  const pauseRecording = () => {
    if (!recorderRef.current || recorderRef.current.state !== "recording") return;
    recorderRef.current.pause();
    stopTimer();
    setStatus("paused");
  };

  const resumeRecording = () => {
    if (!recorderRef.current || recorderRef.current.state !== "paused") return;
    recorderRef.current.resume();
    startTimer();
    setStatus("recording");
  };

  const stopRecording = () => {
    if (!recorderRef.current || recorderRef.current.state === "inactive") return;
    // stop() fires ondataavailable (with the complete buffer) then onstop.
    recorderRef.current.stop();
  };

  const controlsLocked = status === "preparing" || status === "recording" || status === "paused";
  const meterActive = status === "preparing" || status === "recording";
  const levelPercent = Math.round(inputLevel * 100);
  const helperText = status === "preparing"
    ? "Preparing microphone..."
    : "Your microphone is only requested when you start recording.";

  if (!isSupported || !canUseMicrophone) {
    return (
      <div className="rounded-2xl border border-amber-400/20 bg-amber-50/60 p-4 text-sm text-amber-900 dark:bg-amber-950/20 dark:text-amber-200">
        Recording is not supported on this browser. You can still upload an audio file.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-rose-200/70 bg-rose-50/60 p-4 shadow-sm shadow-rose-950/5 dark:border-rose-900/40 dark:bg-rose-950/15">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className={cn(
            "flex shrink-0 items-center justify-center rounded-full bg-rose-500/10 text-rose-600 ring-1 ring-rose-200/70 dark:bg-rose-400/10 dark:text-rose-200 dark:ring-rose-300/15",
            isPhone ? "h-11 w-11" : "h-10 w-10",
          )}>
            <Mic className="h-5 w-5" />
          </div>
          <div>
            <p className={cn("font-cormorant leading-none text-zinc-800 dark:text-zinc-100", isPhone ? "text-[1.8rem]" : "text-2xl")}>Record a voice keepsake</p>
            <p className={cn("mt-1 text-xs text-zinc-500", status === "preparing" && "text-rose-500 dark:text-rose-200")}>
              {helperText}
            </p>
          </div>
        </div>
        <div className={cn(
          "inline-flex h-10 shrink-0 items-center justify-center rounded-full border px-4 font-mono text-lg tabular-nums",
          status === "recording" || status === "preparing"
            ? "border-rose-300/70 bg-rose-500 text-white shadow-md shadow-rose-500/20"
            : "border-rose-100/80 bg-white/70 text-rose-600 dark:border-white/10 dark:bg-zinc-950/30 dark:text-rose-200"
        )}>
          {formatDuration(duration)}
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-white/60 bg-white/65 shadow-inner shadow-white/40 dark:border-white/10 dark:bg-zinc-950/25 dark:shadow-none">
        <div className="grid gap-0 md:grid-cols-[minmax(0,1fr)_16rem]">
          <div className="min-w-0 border-b border-rose-100/70 p-3 dark:border-white/10 md:border-b-0 md:border-r">
            <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-zinc-400">
              <SlidersHorizontal className="h-3.5 w-3.5 text-rose-400" />
              Input
            </div>
            <select
              aria-label="Microphone"
              value={selectedDeviceId}
              disabled={controlsLocked}
              onFocus={() => void refreshAudioDevices()}
              onChange={(event) => handleDeviceChange(event.target.value)}
              className="h-11 w-full min-w-0 rounded-xl border border-rose-100/80 bg-white/85 px-3 text-sm text-zinc-700 outline-none transition focus:border-rose-300 focus:ring-2 focus:ring-rose-200/60 disabled:opacity-60 dark:border-white/10 dark:bg-zinc-900/80 dark:text-zinc-200 dark:focus:border-rose-400/50 dark:focus:ring-rose-400/15"
            >
              <option value="">Default microphone</option>
              {audioDevices.map((device, index) => (
                <option key={device.deviceId || `mic-${index}`} value={device.deviceId}>
                  {device.label || `Microphone ${index + 1}`}
                </option>
              ))}
            </select>
          </div>

          <div className="p-3">
            <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-zinc-400">
              <Volume2 className="h-3.5 w-3.5 text-rose-400" />
              Voice
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={controlsLocked}
                aria-pressed={boostEnabled}
                onClick={() => setBoostEnabled((value) => !value)}
                className={cn(
                  "h-11 flex-1 rounded-xl border px-3 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-rose-200/70 disabled:opacity-60 dark:focus:ring-rose-400/15",
                  boostEnabled
                    ? "border-rose-300 bg-rose-500 text-white shadow-sm shadow-rose-500/20"
                    : "border-rose-100/80 bg-white/85 text-zinc-600 hover:text-rose-600 dark:border-white/10 dark:bg-zinc-900/80 dark:text-zinc-300"
                )}
              >
                Boost
              </button>
              <select
                aria-label="Microphone boost amount"
                value={boostAmount}
                disabled={!boostEnabled || controlsLocked}
                onChange={(event) => setBoostAmount(event.target.value === "3" ? "3" : "2")}
                className="h-11 w-20 rounded-xl border border-rose-100/80 bg-white/85 px-3 text-sm font-medium text-zinc-700 outline-none transition focus:border-rose-300 focus:ring-2 focus:ring-rose-200/60 disabled:opacity-50 dark:border-white/10 dark:bg-zinc-900/80 dark:text-zinc-200"
              >
                <option value="2">2x</option>
                <option value="3">3x</option>
              </select>
            </div>
          </div>
        </div>

        <div className="border-t border-rose-100/70 p-3 dark:border-white/10">
          <div className="mb-2 flex items-center justify-between text-xs text-zinc-500">
            <span>Level</span>
            <span className="font-mono tabular-nums">{levelPercent}%</span>
          </div>
          <div className="flex h-10 items-center gap-1.5 rounded-xl bg-zinc-950/[0.04] px-3 dark:bg-black/20">
            {Array.from({ length: 22 }).map((_, index) => {
              const waveOffset = 0.24 + ((index % 7) / 12);
              const levelScale = meterActive
                ? Math.max(0.12, Math.min(1.9, inputLevel * 1.8 + waveOffset))
                : 0.24;
              const active = meterActive && index / 22 <= Math.max(0.08, inputLevel);
              return (
                <motion.span
                  key={index}
                  className={cn(
                    "h-5 w-1 origin-center rounded-full transition-colors",
                    active ? "bg-rose-500 shadow-sm shadow-rose-500/40" : "bg-zinc-300/80 dark:bg-zinc-700/80"
                  )}
                  animate={{ scaleY: levelScale }}
                  transition={{ duration: 0.12, ease: "easeOut" }}
                />
              );
            })}
            <div className="ml-2 h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-zinc-200/80 dark:bg-zinc-800">
              <motion.div
                className="h-full rounded-full bg-rose-500"
                animate={{ width: `${levelPercent}%` }}
                transition={{ duration: 0.12, ease: "easeOut" }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {status === "idle" || status === "ready" ? (
          <Button type="button" onClick={startRecording} disabled={disabled} className={cn("rounded-full bg-rose-600 hover:bg-rose-700", isPhone && "min-h-12 px-5 text-sm")}>
            <Mic className="mr-2 h-4 w-4" />
            {status === "ready" ? "Re-record" : "Start recording"}
          </Button>
        ) : null}
        {status === "preparing" && (
          <Button type="button" disabled className={cn("rounded-full bg-rose-600 text-white", isPhone && "min-h-12 px-5 text-sm")}>
            <Mic className="mr-2 h-4 w-4 animate-pulse" />
            Preparing microphone...
          </Button>
        )}
        {status === "recording" && canPauseRecorder && (
          <Button type="button" variant="outline" onClick={pauseRecording} className={cn("rounded-full", isPhone && "min-h-12 px-5 text-sm")}>
            <Pause className="mr-2 h-4 w-4" />
            Pause
          </Button>
        )}
        {status === "paused" && (
          <Button type="button" variant="outline" onClick={resumeRecording} className={cn("rounded-full", isPhone && "min-h-12 px-5 text-sm")}>
            <Play className="mr-2 h-4 w-4" />
            Resume
          </Button>
        )}
        {(status === "recording" || status === "paused") && (
          <Button type="button" variant="outline" onClick={stopRecording} className={cn("rounded-full", isPhone && "min-h-12 px-5 text-sm")}>
            <Square className="mr-2 h-4 w-4" />
            Stop
          </Button>
        )}
        {status === "ready" && (
          <Button type="button" variant="ghost" onClick={discard} className={cn("rounded-full text-zinc-500 hover:text-rose-600", isPhone && "min-h-12 px-5 text-sm")}>
            <Trash2 className="mr-2 h-4 w-4" />
            Discard
          </Button>
        )}
        {status === "paused" && (
          <Button type="button" variant="ghost" onClick={discard} className={cn("rounded-full text-zinc-500 hover:text-rose-600", isPhone && "min-h-12 px-5 text-sm")}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset
          </Button>
        )}
      </div>

      <AnimatePresence>
        {previewUrl && status === "ready" && (
          <motion.div
            key={previewUrl}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mt-4 rounded-xl border border-white/50 bg-white/70 p-3 shadow-sm dark:border-white/10 dark:bg-zinc-950/40"
          >
            <p className="mb-2 text-xs font-medium text-zinc-500">Preview your recording before saving</p>
            <audio
              ref={previewAudioRef}
              controls
              preload="auto"
              src={previewUrl}
              className="w-full"
              onLoadedMetadata={(e) => {
                e.currentTarget.currentTime = 0;
                console.log("[VoiceRecorder] audio loadedmetadata duration:", e.currentTarget.duration, "currentTime:", e.currentTarget.currentTime);
              }}
              onCanPlay={(e) => {
                console.log("[VoiceRecorder] audio onCanPlay duration:", e.currentTarget.duration, "currentTime:", e.currentTarget.currentTime);
              }}
              onPlay={(e) => {
                const audio = e.currentTarget;
                if (Number.isFinite(audio.duration) && audio.duration > 0 && audio.currentTime >= audio.duration - 0.05) {
                  audio.currentTime = 0;
                }
              }}
              onEnded={(e) => {
                e.currentTarget.currentTime = 0;
              }}
              onError={(e) => {
                const err = e.currentTarget.error;
                console.error("[VoiceRecorder] audio element error:", err?.code, err?.message);
                setError("This browser could not preview the recording. Try re-recording or upload an audio file.");
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
      {error && <p className="mt-3 text-sm text-rose-600 dark:text-rose-300">{error}</p>}
    </div>
  );
}
