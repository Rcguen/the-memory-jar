import { Memory } from "@/types/memory";
import { StoryChapter, StoryChapterType } from "@/types/storybook";

/**
 * Generate story chapters deterministically based on memory dates and types.
 * 
 * Rules:
 * 1. "The Beginning": Memories in the first 30 days of the relationship.
 * 2. "First Anniversary": Memories around the 1-year mark (e.g., +/- 14 days).
 * 3. "Holidays": Memories in late December.
 * 4. "Spring", "Summer", "Autumn", "Winter": Based on the month of the memory.
 * 5. "Time Capsules": Memories with unlock_at dates.
 * 6. "Favorites": Memories marked as favorite or highly interacted.
 * 7. "Recent": Memories from the last 30 days.
 */

export function generateStoryChapters(
  memories: Memory[],
  relationshipStartDate?: string | null
): StoryChapter[] {
  if (memories.length === 0) return [];

  const chapters: Map<StoryChapterType, StoryChapter> = new Map();
  const sortedMemories = [...memories].sort(
    (a, b) => new Date(a.memory_date).getTime() - new Date(b.memory_date).getTime()
  );

  const getOrCreateChapter = (type: StoryChapterType, title: string, subtitle?: string) => {
    if (!chapters.has(type)) {
      chapters.set(type, {
        id: `chapter-${type}`,
        type,
        title,
        subtitle,
        memories: [],
      });
    }
    return chapters.get(type)!;
  };

  const startMs = relationshipStartDate ? new Date(relationshipStartDate).getTime() : null;
  const nowMs = Date.now();
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
  const oneYearMs = 365 * 24 * 60 * 60 * 1000;

  for (const memory of sortedMemories) {
    const memDate = new Date(memory.memory_date);
    const memMs = memDate.getTime();
    const month = memDate.getMonth(); // 0-11
    const day = memDate.getDate();

    let assigned = false;

    // 1. Time Capsules
    if (memory.unlock_at) {
      const ch = getOrCreateChapter("time_capsules", "Time Capsules", "Messages across time");
      ch.memories.push(memory);
      assigned = true;
    }

    // 2. The Beginning
    if (!assigned && startMs && memMs >= startMs && memMs <= startMs + thirtyDaysMs) {
      const ch = getOrCreateChapter("the_beginning", "The Beginning", "Where it all started");
      ch.memories.push(memory);
      assigned = true;
    }

    // 3. First Anniversary
    if (!assigned && startMs && Math.abs(memMs - (startMs + oneYearMs)) <= 14 * 24 * 60 * 60 * 1000) {
      const ch = getOrCreateChapter("first_anniversary", "First Anniversary", "One year together");
      ch.memories.push(memory);
      assigned = true;
    }

    // 4. Holidays
    if (!assigned && month === 11 && day >= 20) {
      const ch = getOrCreateChapter("holidays", "Holidays", "The most wonderful time");
      ch.memories.push(memory);
      assigned = true;
    }

    // 5. Recent
    if (!assigned && nowMs - memMs <= thirtyDaysMs) {
      const ch = getOrCreateChapter("recent", "Recent Memories", "The story continues");
      ch.memories.push(memory);
      assigned = true;
    }

    // 6. Seasons
    if (!assigned) {
      if (month >= 2 && month <= 4) {
        const ch = getOrCreateChapter("spring", "Spring", "A time of blossoming");
        ch.memories.push(memory);
      } else if (month >= 5 && month <= 7) {
        const ch = getOrCreateChapter("summer", "Summer", "Warm and bright days");
        ch.memories.push(memory);
      } else if (month >= 8 && month <= 10) {
        const ch = getOrCreateChapter("autumn", "Autumn", "Golden memories");
        ch.memories.push(memory);
      } else {
        const ch = getOrCreateChapter("winter", "Winter", "Cozy moments together");
        ch.memories.push(memory);
      }
    }
  }

  // Remove empty chapters
  for (const [type, chapter] of chapters.entries()) {
    if (chapter.memories.length === 0) {
      chapters.delete(type);
    }
  }

  // Define a nice ordering for chapters in the book
  const order: StoryChapterType[] = [
    "the_beginning",
    "first_anniversary",
    "spring",
    "summer",
    "autumn",
    "winter",
    "holidays",
    "favorites",
    "time_capsules",
    "recent",
  ];

  return Array.from(chapters.values()).sort((a, b) => order.indexOf(a.type) - order.indexOf(b.type));
}
