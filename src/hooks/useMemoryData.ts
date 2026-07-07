import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { memoryService } from "@/services/memory";
import { mapDatabaseMemory } from "@/lib/mappers/memory.mapper";
import { createClient } from "@/lib/supabase/client";
import { MemoryFilter, MemoryListOptions } from "@/types/memory";
import { useRelationshipContext } from "./useRelationshipContext";

export function useMemory(id: string | null) {
  return useQuery({
    queryKey: ['memory', id],
    queryFn: async () => {
      if (!id) return null;
      return await memoryService.getMemoryById(id);
    },
    enabled: !!id,
    staleTime: 60 * 1000,
  });
}

export function usePendingMemories() {
  return useQuery({
    queryKey: ['memories', 'pending_partner'],
    queryFn: async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("memories")
        .select("*")
        .eq("status", "pending_partner")
        .is("deleted_at", null);
      
      return (data || []).map(mapDatabaseMemory);
    },
    staleTime: 60 * 1000,
  });
}

export function useMemories(options: MemoryListOptions = {}) {
  return useQuery({
    queryKey: ['memories', options],
    queryFn: () => memoryService.listMemories(options),
    staleTime: 30 * 1000,
  });
}

export function useDeletedMemories() {
  return useQuery({
    queryKey: ['memories', 'trash'],
    queryFn: () => memoryService.listDeletedMemories(),
    staleTime: 30 * 1000,
  });
}

export function useMemoryComments(memoryId: string | null) {
  return useQuery({
    queryKey: ['memory-comments', memoryId],
    queryFn: () => memoryService.getComments(memoryId!),
    enabled: !!memoryId,
    staleTime: 15 * 1000,
  });
}

export function useActivityFeed() {
  return useQuery({
    queryKey: ['activity-feed'],
    queryFn: () => memoryService.getActivityFeed(30),
    staleTime: 30 * 1000,
  });
}

export function useNotifications() {
  return useQuery({
    queryKey: ['notifications'],
    queryFn: () => memoryService.listNotifications(20),
    staleTime: 15 * 1000,
  });
}

export function useUnreadNotificationCount() {
  return useQuery({
    queryKey: ['unread-notification-count'],
    queryFn: () => memoryService.getUnreadNotificationCount(),
    staleTime: 15 * 1000,
  });
}

export function useOnThisDayMemories() {
  const { data: relationship } = useRelationshipContext();

  return useQuery({
    queryKey: ["on-this-day", relationship?.relationshipTimezone],
    queryFn: () => memoryService.getOnThisDayMemories(relationship?.relationshipTimezone),
    enabled: !!relationship?.relationshipTimezone,
    staleTime: 1000 * 60 * 10,
  });
}

export function useTimelineMemories(filter: MemoryFilter = "all") {
  return useInfiniteQuery({
    queryKey: ["timeline-memories", filter],
    queryFn: ({ pageParam }) => memoryService.listTimelineMemories({ filter, offset: pageParam as number }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextOffset,
    staleTime: 1000 * 30,
  });
}

export function useStorybookMemories() {
  return useInfiniteQuery({
    queryKey: ["storybook-memories"],
    queryFn: async ({ pageParam }) => {
      const limit = 500;
      const memories = await memoryService.listMemories({ sort: "oldest", limit, offset: pageParam as number });
      return {
        memories,
        nextOffset: memories.length === limit ? (pageParam as number) + limit : null,
      };
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextOffset,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });
}

export function useCoupleDashboardStats() {
  const { data: relationship } = useRelationshipContext();

  return useQuery({
    queryKey: ["dashboard-stats", relationship?.relationshipTimezone],
    queryFn: () => memoryService.getCoupleDashboardStats(relationship?.relationshipTimezone),
    enabled: !!relationship?.relationshipTimezone,
    staleTime: 1000 * 60,
  });
}
