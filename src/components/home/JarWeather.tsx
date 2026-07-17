"use client";

import { useMemo } from "react";
import { useHomeMemories } from "@/hooks/useMemoryData";
import { determineJarWeather, getWeatherIcon } from "@/lib/jar-weather";

export function JarWeather({ className }: { className?: string }) {
  const { data: memories = [] } = useHomeMemories();

  const weather = useMemo(() => {
    return determineJarWeather(memories);
  }, [memories]);

  const icon = getWeatherIcon(weather);

  return (
    <div className={`flex items-center gap-1.5 type-meta text-[color:var(--text-tertiary)] ${className || ""}`}>
      <span className="text-sm">{icon}</span>
      <span>{weather}</span>
    </div>
  );
}
