import { useQuery } from "@tanstack/react-query";
import { memoryService } from "@/services/memory";
import { mapDatabaseMemory } from "@/lib/mappers/memory.mapper";
import { createClient } from "@/lib/supabase/client";
import { MemoryListOptions } from "@/types/memory";

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
