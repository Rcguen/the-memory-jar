import { useEffect, useMemo, useRef } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { memoryService } from "@/services/memory";
import { mapDatabaseMemory } from "@/lib/mappers/memory.mapper";
import { createClient } from "@/lib/supabase/client";
import { MemoryFilter, MemoryListOptions, MemorySort } from "@/types/memory";
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

const HOME_MEMORY_PAGE_SIZE = 12;
let developmentHomeObserverCount = 0;
let developmentHomeFirstPageRequests = 0;
let developmentHomeNextPageRequests = 0;
let developmentHomeSearchFilterResets = 0;

export function useHomeMemories(options: { search?: string; filter?: MemoryFilter; sort?: MemorySort } = {}) {
  const normalizedSearch = options.search?.trim().toLowerCase() ?? "";
  const filter = options.filter ?? "all";
  const sort = options.sort ?? "newest";
  const query = useInfiniteQuery({
    queryKey: ["home-memories", normalizedSearch, filter, sort, HOME_MEMORY_PAGE_SIZE],
    queryFn: async ({ pageParam }) => {
      if (process.env.NODE_ENV === "development") {
        if (pageParam === 0) developmentHomeFirstPageRequests += 1;
        else developmentHomeNextPageRequests += 1;
      }
      const page = await memoryService.listHomeMemoriesPage({
        offset: pageParam as number,
        limit: HOME_MEMORY_PAGE_SIZE,
        search: normalizedSearch,
        filter,
        sort,
      });
      if (process.env.NODE_ENV === "development") {
        console.debug("[home-memories] page", {
          firstPageRequests: developmentHomeFirstPageRequests,
          nextPageRequests: developmentHomeNextPageRequests,
          rows: page.memories.length,
          summaryAttachments: page.attachmentSummaryCount,
          legacyOriginalFallbacks: page.legacyOriginalFallbackCount,
        });
      }
      return page;
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextOffset,
    staleTime: 30 * 1000,
  });

  const queryShapeRef = useRef(`${normalizedSearch}|${filter}|${sort}`);

  useEffect(() => {
    const queryShape = `${normalizedSearch}|${filter}|${sort}`;
    if (process.env.NODE_ENV === "development" && queryShapeRef.current !== queryShape) {
      developmentHomeSearchFilterResets += 1;
      console.debug("[home-memories] search-filter-reset", { count: developmentHomeSearchFilterResets });
      queryShapeRef.current = queryShape;
    }
  }, [filter, normalizedSearch, sort]);

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    developmentHomeObserverCount += 1;
    console.debug("[home-memories] observer", { count: developmentHomeObserverCount });
    return () => {
      developmentHomeObserverCount = Math.max(0, developmentHomeObserverCount - 1);
    };
  }, []);

  const flattened = useMemo(() => {
    const allMemories = (query.data?.pages ?? []).flatMap((page) => page.memories);
    const memories = [...new Map(allMemories.map((memory) => [memory.id, memory])).values()];
    const duplicateIdsPrevented = allMemories.length - memories.length;
    if (process.env.NODE_ENV === "development") {
      console.debug("[home-memories] rendered", {
        loadedPages: query.data?.pages.length ?? 0,
        renderedCards: memories.length,
        duplicateIdsPrevented,
      });
    }
    return memories;
  }, [query.data?.pages]);

  return {
    ...query,
    data: flattened,
    totalCount: query.data?.pages[0]?.totalCount ?? 0,
    loadedPageCount: query.data?.pages.length ?? 0,
  };
}

export function useHomeMemoryStats() {
  return useQuery({
    queryKey: ["home-memory-stats"],
    queryFn: () => memoryService.getHomeMemoryStats(),
    staleTime: 60 * 1000,
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

export function useActivityFeed(enabled = true) {
  const requestCountRef = useRef(0);

  return useQuery({
    queryKey: ['activity-feed'],
    queryFn: () => {
      if (process.env.NODE_ENV === "development") {
        requestCountRef.current += 1;
        console.debug("[activity-feed] request", { count: requestCountRef.current });
      }
      return memoryService.getActivityFeed(30);
    },
    enabled,
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
  const requestCountRef = useRef(0);

  return useQuery({
    queryKey: ['unread-notification-count'],
    queryFn: () => {
      if (process.env.NODE_ENV === "development") {
        requestCountRef.current += 1;
        console.debug("[notification-unread-count] request", { count: requestCountRef.current });
      }
      return memoryService.getUnreadNotificationCount();
    },
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
      const limit = 60;
      const memories = await memoryService.listStorybookMemoriesPage({ limit, offset: pageParam as number });
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

