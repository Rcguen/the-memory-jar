import { useQuery } from "@tanstack/react-query";
import { memoryService } from "@/services/memory";
import { useRelationshipContext } from "./useRelationshipContext";
import { YearRecapStats, MemoryHighlights } from "@/types/storybook";

export function useYearRecapStats(year: number | null) {
  const { data: relationship } = useRelationshipContext();

  return useQuery<YearRecapStats | null>({
    queryKey: ["year-recap-stats", year, relationship?.relationshipTimezone],
    queryFn: async () => {
      if (!year) return null;
      return memoryService.getYearRecapStats(year, relationship?.relationshipTimezone);
    },
    enabled: !!year && !!relationship?.relationshipTimezone,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useMemoryHighlights() {
  const { data: relationship } = useRelationshipContext();

  return useQuery<MemoryHighlights | null>({
    queryKey: ["memory-highlights", relationship?.relationshipTimezone],
    queryFn: async () => {
      return memoryService.getMemoryHighlights(relationship?.relationshipTimezone);
    },
    enabled: !!relationship?.relationshipTimezone,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
