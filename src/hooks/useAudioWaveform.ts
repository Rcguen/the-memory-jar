"use client";

import { useEffect, useState } from "react";

function downsampleChannel(data: Float32Array, bars: number) {
  if (data.length === 0) return Array.from({ length: bars }, () => 0.12);

  const blockSize = Math.floor(data.length / bars) || 1;
  const values: number[] = [];

  for (let index = 0; index < bars; index += 1) {
    const start = index * blockSize;
    const end = Math.min(data.length, start + blockSize);
    let total = 0;
    for (let cursor = start; cursor < end; cursor += 1) {
      total += Math.abs(data[cursor]);
    }
    const average = end > start ? total / (end - start) : 0;
    values.push(average);
  }

  const max = Math.max(...values, 0.01);
  return values.map((value) => Math.max(0.12, value / max));
}

export function useAudioWaveform(url: string, bars = 48) {
  const [samples, setSamples] = useState<number[]>(() => Array.from({ length: bars }, () => 0.18));

  useEffect(() => {
    let cancelled = false;

    const loadWaveform = async () => {
      try {
        const response = await fetch(url);
        const buffer = await response.arrayBuffer();
        const audioContext = new AudioContext();
        const decoded = await audioContext.decodeAudioData(buffer.slice(0));
        const channelData = decoded.getChannelData(0);
        const nextSamples = downsampleChannel(channelData, bars);
        if (!cancelled) {
          setSamples(nextSamples);
        }
        if (audioContext.state !== "closed") {
          await audioContext.close();
        }
      } catch {
        if (!cancelled) {
          setSamples(Array.from({ length: bars }, (_, index) => 0.2 + ((index % 6) / 18)));
        }
      }
    };

    void loadWaveform();

    return () => {
      cancelled = true;
    };
  }, [bars, url]);

  return samples;
}
