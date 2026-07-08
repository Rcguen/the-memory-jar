import { Memory } from "@/types/memory";
import { differenceInDays } from "date-fns";

export type JarAtmosphere = "Warm" | "Calm" | "Quiet" | "Dreamy" | "Golden" | "Hopeful" | "Rainy";

export function determineJarWeather(memories: Memory[]): JarAtmosphere {
  if (!memories || memories.length === 0) return "Quiet";

  const now = new Date();
  let favorites = 0;
  let letters = 0;
  let capsulesWaiting = 0;
  let recentActivity = 0;
  let totalReactions = 0;

  for (const m of memories) {
    if (m.is_favorite) favorites++;
    if (m.type === "letter") letters++;
    if (m.unlock_at && new Date(m.unlock_at).getTime() > now.getTime()) capsulesWaiting++;
    
    if (m.created_at) {
      if (differenceInDays(now, new Date(m.created_at)) <= 7) {
        recentActivity++;
      }
    }

    if (m.reaction_counts) {
      totalReactions += Object.values(m.reaction_counts).reduce((a, b) => a + b, 0);
    }
  }

  const total = memories.length;

  if (recentActivity > 10 || totalReactions > total * 2) {
    return "Warm";
  }

  if (capsulesWaiting > 0) {
    return "Hopeful";
  }

  if (favorites > total * 0.3) {
    return "Golden";
  }

  if (letters > total * 0.4) {
    return "Dreamy";
  }

  if (recentActivity === 0 && total > 20) {
    return "Rainy"; // A bit melancholy, missing new memories
  }

  if (recentActivity === 0) {
    return "Quiet";
  }

  return "Calm";
}

export function getWeatherIcon(weather: JarAtmosphere): string {
  switch (weather) {
    case "Warm": return "☀️";
    case "Calm": return "🌤️";
    case "Quiet": return "🌙";
    case "Dreamy": return "✨";
    case "Golden": return "🌅";
    case "Hopeful": return "🌱";
    case "Rainy": return "🌧️";
    default: return "☁️";
  }
}
