"use client";

import { useMemo, useEffect, useState } from "react";
import { useMemories } from "@/hooks/useMemoryData";
import { useRelationshipContext } from "@/hooks/useRelationshipContext";
import { getMemoryOfTheDay } from "@/lib/memory-score";
import { differenceInDays } from "date-fns";

export function MemoryWhisper() {
  const { data: memories = [] } = useMemories({});
  const { data: relationshipContext } = useRelationshipContext();
  const [lastOpenedId, setLastOpenedId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLastOpenedId(localStorage.getItem("lastOpenedMemoryId"));
    }
  }, []);

  const whisper = useMemo(() => {
    const memory = getMemoryOfTheDay(
      memories, 
      relationshipContext?.relationshipTimezone || "UTC",
      lastOpenedId
    );
    if (!memory) return null;

    const sentences: string[] = [];
    const daysAsleep = differenceInDays(new Date(), new Date(memory.created_at));

    if (memory.is_favorite) {
      sentences.push("You smiled at this memory the most.");
    }

    if (daysAsleep > 100) {
      sentences.push(`This memory has been asleep for ${daysAsleep} days.`);
    }

    if (memory.type === "letter" && daysAsleep > 30) {
      sentences.push("This letter hasn't been opened for months.");
    }

    if (sentences.length === 0) {
      sentences.push("The jar remembered something today.");
      sentences.push("A forgotten page quietly waited.");
    }

    // Seed based on memory ID to keep it stable
    const seed = parseInt(memory.id.substring(0, 4), 16);
    return sentences[seed % sentences.length];

  }, [memories, relationshipContext?.relationshipTimezone, lastOpenedId]);

  if (!whisper) return null;

  return (
    <p className="type-meta mb-1 pl-1 font-cormorant normal-case tracking-[0.06em] text-[color:var(--text-tertiary)]">
      {whisper}
    </p>
  );
}
