import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useRealtimeContext } from "@/providers/realtime-provider";
import { usePhysics } from "@/providers/physics-provider";
import { Memory, MemoryType } from "@/types/memory";
import { memoryService } from "@/services/memory";
import { useAuth } from "@/providers/auth-provider";

export function useRealtimeMemory(relationshipId: string | null, options?: { syncPhysics?: boolean }) {
  const queryClient = useQueryClient();
  const { subscribePostgres, unsubscribePostgres } = useRealtimeContext();
  const { dropMemory, loadMemory, removeMemory, updateMemoryMeta } = usePhysics();
  const { profile } = useAuth();
  const syncPhysics = options?.syncPhysics !== false;

  useEffect(() => {
    if (!relationshipId) return;

    // ── Channel 1: memories table ──────────────────────────────────────────
    const memoriesChannel = `memories_${relationshipId}`;

    const handleMemoryChange = async (e: Event) => {
      const customEvent = e as CustomEvent;
      const payload = customEvent.detail;
      const eventType = payload.eventType as string;
      const record = payload.new || payload.old;

      // ── INSERT ─────────────────────────────────────────────────────────
      if (eventType === 'INSERT' && record?.id) {
        const status = record.status as string;
        queryClient.invalidateQueries({ queryKey: ['memories'] });
        queryClient.invalidateQueries({ queryKey: ['on-this-day'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
        queryClient.invalidateQueries({ queryKey: ['timeline-memories'] });

        if (syncPhysics && ['sealed', 'unlocked', 'opening'].includes(status)) {
          // Use dropMemory for INSERT so the spawn animation (drop from top) plays
          // loadMemory would silently skip if body already exists (guard inside EngineCore)
          const visualState = await memoryService.getVisualState(record.id).catch(() => null);

          if (visualState) {
            // Has saved position — load at position (already settled once before)
            loadMemory(record.id, record.type as MemoryType, {
              id: record.id,
              type: record.type as MemoryType,
              status: status as 'sealed' | 'unlocked' | 'opening',
              capsuleStyle: record.capsule_style ?? null,
              unlockAt: record.unlock_at ?? null,
              isCollaborative: record.is_collaborative ?? false,
              x: visualState.position_x,
              y: visualState.position_y,
              rotation: visualState.rotation,
              scale: visualState.scale,
              vx: 0,
              vy: 0,
              isSleeping: false,
            });
          } else {
            // Brand new — use dropMemory for cinematic spawn from top
            // EngineCore.dropMemory starts the body above the jar and lets it fall in
            dropMemory(record.id, record.type as MemoryType, {
              status: status as 'sealed' | 'unlocked' | 'opening',
              capsuleStyle: record.capsule_style ?? null,
              unlockAt: record.unlock_at ?? null,
              isCollaborative: record.is_collaborative ?? false,
            });
          }
        }
      }

      // ── UPDATE ─────────────────────────────────────────────────────────
      if (eventType === 'UPDATE' && record?.id) {
        const status = record.status as string;
        const deletedAt = record.deleted_at;

        if (deletedAt || status === 'archived' || status === 'draft' || status === 'pending_partner') {
          // Invisible — remove from jar and close any open viewer
          if (syncPhysics) removeMemory(record.id);
          queryClient.removeQueries({ queryKey: ['memory', record.id] });
          queryClient.invalidateQueries({ queryKey: ['memories'] });
          queryClient.invalidateQueries({ queryKey: ['on-this-day'] });
          queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
          queryClient.invalidateQueries({ queryKey: ['timeline-memories'] });
          window.dispatchEvent(new CustomEvent('viewer-force-close', { detail: { id: record.id } }));
          return;
        }

        // Update physics metadata in-place (no body recreate, no position reset)
        if (syncPhysics) {
          updateMemoryMeta(record.id, {
            status: status as 'sealed' | 'unlocked' | 'opening',
            capsuleStyle: record.capsule_style ?? null,
            unlockAt: record.unlock_at ?? null,
            isCollaborative: record.is_collaborative ?? false,
          });
        }

        // Build a partial Memory from the realtime payload for instant cache update
        // Postgres realtime does NOT include joined tables (memory_attachments), so
        // we merge with existing cached data to avoid losing attachments.
        const existing = queryClient.getQueryData<Memory>(['memory', record.id]);
        const partialUpdate: Partial<Memory> = {
          status: status as Memory['status'],
          title: record.title ?? existing?.title ?? null,
          content: record.content ?? existing?.content ?? null,
          theme: record.theme ?? existing?.theme ?? null,
          decorations: record.decorations ?? existing?.decorations ?? [],
          unlock_at: record.unlock_at ?? null,
          is_collaborative: record.is_collaborative ?? existing?.is_collaborative ?? false,
          capsule_style: record.capsule_style ?? null,
          updated_at: record.updated_at ?? existing?.updated_at ?? '',
          memory_date: record.memory_date ?? existing?.memory_date ?? '',
        };

        if (existing) {
          // Merge: keep attachments from cache, update all other scalar fields
          queryClient.setQueryData<Memory>(['memory', record.id], {
            ...existing,
            ...partialUpdate,
          });
        } else {
          // No cache hit — need full fetch (will include attachments)
          queryClient.invalidateQueries({ queryKey: ['memory', record.id] });
        }

        // Also update the memories list
        queryClient.invalidateQueries({ queryKey: ['memories'] });
        queryClient.invalidateQueries({ queryKey: ['on-this-day'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
        queryClient.invalidateQueries({ queryKey: ['timeline-memories'] });
      }

      // ── DELETE ─────────────────────────────────────────────────────────
      if (eventType === 'DELETE' && payload.old?.id) {
        const deletedId = payload.old.id;
        if (syncPhysics) removeMemory(deletedId);
        queryClient.removeQueries({ queryKey: ['memory', deletedId] });
        queryClient.invalidateQueries({ queryKey: ['memories'] });
        queryClient.invalidateQueries({ queryKey: ['on-this-day'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
        queryClient.invalidateQueries({ queryKey: ['timeline-memories'] });
        window.dispatchEvent(new CustomEvent('viewer-force-close', { detail: { id: deletedId } }));
      }
    };

    window.addEventListener(`postgres-${memoriesChannel}`, handleMemoryChange);
    subscribePostgres(memoriesChannel, '*', 'public', 'memories', undefined);

    // ── Channel 2: memory_attachments table ───────────────────────────────
    // When attachments change, invalidate the memory detail cache to reload with fresh attachments
    const attachmentsChannel = `attachments_${relationshipId}`;

    const handleAttachmentChange = (e: Event) => {
      const customEvent = e as CustomEvent;
      const payload = customEvent.detail;
      const record = payload.new || payload.old;
      const memoryId: string | undefined = record?.memory_id;

      if (!memoryId) return;

      // Always need a full refetch for attachments because the realtime payload
      // does not contain signed URLs — we must re-fetch from service
      queryClient.invalidateQueries({ queryKey: ['memory', memoryId] });
      queryClient.invalidateQueries({ queryKey: ['memories'] });
      queryClient.invalidateQueries({ queryKey: ['timeline-memories'] });
    };

    window.addEventListener(`postgres-${attachmentsChannel}`, handleAttachmentChange);
    subscribePostgres(attachmentsChannel, '*', 'public', 'memory_attachments', undefined);

    const relatedTables = [
      { table: 'memory_favorites', channel: `favorites_${relationshipId}` },
      { table: 'memory_reactions', channel: `reactions_${relationshipId}` },
      { table: 'memory_comments', channel: `comments_${relationshipId}` },
      { table: 'activity_logs', channel: `activity_${relationshipId}` },
    ];

    const handleRelatedChange = (e: Event) => {
      const customEvent = e as CustomEvent;
      const payload = customEvent.detail;
      const record = payload.new || payload.old;
      const memoryId: string | undefined = record?.memory_id || record?.target_memory_id;

      if (memoryId) {
        queryClient.invalidateQueries({ queryKey: ['memory', memoryId] });
        queryClient.invalidateQueries({ queryKey: ['memory-comments', memoryId] });
      }

      queryClient.invalidateQueries({ queryKey: ['memories'] });
      queryClient.invalidateQueries({ queryKey: ['activity-feed'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['timeline-memories'] });
    };

    for (const entry of relatedTables) {
      window.addEventListener(`postgres-${entry.channel}`, handleRelatedChange);
      subscribePostgres(entry.channel, '*', 'public', entry.table, undefined);
    }

    const notificationsChannel = profile?.id ? `notifications_${profile.id}` : null;
    const handleNotificationChange = () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-notification-count'] });
    };

    if (notificationsChannel && profile?.id) {
      window.addEventListener(`postgres-${notificationsChannel}`, handleNotificationChange);
      subscribePostgres(notificationsChannel, '*', 'public', 'notifications', `user_id=eq.${profile.id}`);
    }

    return () => {
      window.removeEventListener(`postgres-${memoriesChannel}`, handleMemoryChange);
      window.removeEventListener(`postgres-${attachmentsChannel}`, handleAttachmentChange);
      unsubscribePostgres(memoriesChannel);
      unsubscribePostgres(attachmentsChannel);
      for (const entry of relatedTables) {
        window.removeEventListener(`postgres-${entry.channel}`, handleRelatedChange);
        unsubscribePostgres(entry.channel);
      }
      if (notificationsChannel) {
        window.removeEventListener(`postgres-${notificationsChannel}`, handleNotificationChange);
        unsubscribePostgres(notificationsChannel);
      }
    };
  }, [relationshipId, profile?.id, queryClient, subscribePostgres, unsubscribePostgres, dropMemory, loadMemory, removeMemory, syncPhysics, updateMemoryMeta]);
}
