import { Memory } from "@/types/memory";


// A simple deterministic pseudo-random number generator
function seededRandom(seed: number) {
  const x = Math.sin(seed++) * 10000;
  return x - Math.floor(x);
}

export function getMemoryOfTheDay(
  memories: Memory[],
  relationshipTimezone: string,
  lastOpenedMemoryId?: string | null
): Memory | null {
  if (!memories || memories.length === 0) return null;

  // 1. Filter out invalid/locked memories
  const validMemories = memories.filter(m => {
    if (m.deleted_at) return false;
    if (m.status === "draft" || m.status === "pending_partner") return false;
    if (m.unlock_at && new Date(m.unlock_at).getTime() > Date.now()) return false;
    if (!m.title && !m.content && !m.attachments?.length) return false; // missing required fields
    return true;
  });

  if (validMemories.length === 0) return null;

  // 2. Generate daily seed based on relationship timezone
  // This ensures the seed only changes at midnight in their timezone
  const tz = relationshipTimezone || "UTC";
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
  const dateStr = formatter.format(new Date()); // YYYY-MM-DD
  const seed = parseInt(dateStr.replace(/-/g, ""), 10);

  // 3. Score memories
  const scoredMemories = validMemories.map(m => {
    let score = 0;
    
    // Add deterministic randomness so it's not always the exact same order for ties
    const randomBoost = seededRandom(seed + parseInt(m.id.substring(0, 8), 16)) * 10;
    score += randomBoost;

    // Favorites get a boost
    if (m.is_favorite) score += 30;

    // Reactions & comments boost
    const reactionCount = m.reaction_counts ? Object.values(m.reaction_counts).reduce((a, b) => a + b, 0) : 0;
    score += reactionCount * 2;
    score += (m.comment_count || 0) * 5;

    // Older memories get slightly higher scores to encourage rediscovery
    const daysOld = (Date.now() - new Date(m.created_at).getTime()) / (1000 * 60 * 60 * 24);
    score += Math.min(daysOld * 0.1, 20); // Cap age boost at 20 points

    // Penalize if it's the exact one that was just opened
    if (lastOpenedMemoryId === m.id) {
      score -= 100; 
    }

    return { memory: m, score };
  });

  // 4. Sort by score descending
  scoredMemories.sort((a, b) => b.score - a.score);

  return scoredMemories[0]?.memory || null;
}
