import { MemoryFilter } from "@/types/memory";

export const MEMORY_FILTER_OPTIONS: Array<{ id: MemoryFilter; label: string }> = [
  { id: "all", label: "All" },
  { id: "photos", label: "Photos" },
  { id: "videos", label: "Videos" },
  { id: "letters", label: "Letters" },
  { id: "time_capsules", label: "Capsules" },
  { id: "locked", label: "Locked" },
  { id: "unlocked", label: "Unlocked" },
  { id: "mine", label: "Mine" },
  { id: "partner", label: "Partner" },
  { id: "favorites", label: "Favorites" },
  { id: "pinned", label: "Pinned" },
];
