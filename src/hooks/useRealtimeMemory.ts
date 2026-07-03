import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useRealtimeContext } from "@/providers/realtime-provider";
import { usePhysics } from "@/providers/physics-provider";
import { MemoryType } from "@/types/memory";
import { memoryService } from "@/services/memory";

export function useRealtimeMemory(relationshipId: string | null) {
  const queryClient = useQueryClient();
  const { subscribePostgres, unsubscribePostgres } = useRealtimeContext();
  const { loadMemory, removeMemory } = usePhysics();

  useEffect(() => {
    if (!relationshipId) return;

    const channelName = `memories_${relationshipId}`;
    
    const handlePostgresChange = async (e: Event) => {
      const customEvent = e as CustomEvent;
      const payload = customEvent.detail;
      const eventType = payload.eventType as string; // 'INSERT' | 'UPDATE' | 'DELETE'
      const record = payload.new || payload.old;

      // Always invalidate the list/detail queries
      queryClient.invalidateQueries({ queryKey: ['memories'] });
      if (record && 'id' in record) {
        queryClient.invalidateQueries({ queryKey: ['memory', record.id] });
      }

      // On INSERT: if the new memory is visible (sealed/unlocked/opening), drop it into the jar
      if (eventType === 'INSERT' && record && record.id) {
        const status = record.status as string;
        if (['sealed', 'unlocked', 'opening'].includes(status)) {
          // Fetch visual state if it exists, otherwise use defaults
          const visualState = await memoryService.getVisualState(record.id).catch(() => null);
          loadMemory(record.id, record.type as MemoryType, {
            id: record.id,
            type: record.type as MemoryType,
            status: status as 'sealed' | 'unlocked' | 'opening',
            capsuleStyle: record.capsule_style ?? null,
            unlockAt: record.unlock_at ?? null,
            isCollaborative: record.is_collaborative ?? false,
            x: visualState?.position_x ?? 0.5,
            y: visualState?.position_y ?? 0,
            rotation: visualState?.rotation ?? 0,
            scale: visualState?.scale ?? 1,
            vx: 0,
            vy: 0,
            isSleeping: false,
          });
        }
      }

      // On UPDATE: if status changed to a visible one, load it. If archived/deleted, remove it.
      if (eventType === 'UPDATE' && record && record.id) {
        const status = record.status as string;
        const deletedAt = record.deleted_at;

        if (deletedAt || status === 'archived' || status === 'draft' || status === 'pending_partner') {
          removeMemory(record.id);
          queryClient.removeQueries({ queryKey: ['memory', record.id] });
          window.dispatchEvent(new CustomEvent('viewer-force-close', { detail: { id: record.id } }));
        } else if (['sealed', 'unlocked', 'opening'].includes(status)) {
          // Status transition into visible — refresh physics meta but keep position
          const visualState = await memoryService.getVisualState(record.id).catch(() => null);
          loadMemory(record.id, record.type as MemoryType, {
            id: record.id,
            type: record.type as MemoryType,
            status: status as 'sealed' | 'unlocked' | 'opening',
            capsuleStyle: record.capsule_style ?? null,
            unlockAt: record.unlock_at ?? null,
            isCollaborative: record.is_collaborative ?? false,
            x: visualState?.position_x ?? 0.5,
            y: visualState?.position_y ?? 0,
            rotation: visualState?.rotation ?? 0,
            scale: visualState?.scale ?? 1,
            vx: 0,
            vy: 0,
            isSleeping: false,
          });
        }
      }

      // On DELETE: remove from physics, close viewer if open, purge cache
      if (eventType === 'DELETE' && payload.old && payload.old.id) {
        const deletedId = payload.old.id;
        removeMemory(deletedId);
        queryClient.removeQueries({ queryKey: ['memory', deletedId] });
        window.dispatchEvent(new CustomEvent('viewer-force-close', { detail: { id: deletedId } }));
      }
    };

    window.addEventListener(`postgres-${channelName}`, handlePostgresChange);
    
    // Subscribe
    subscribePostgres(channelName, '*', 'public', 'memories', undefined);

    return () => {
      window.removeEventListener(`postgres-${channelName}`, handlePostgresChange);
      unsubscribePostgres(channelName);
    };
  }, [relationshipId, queryClient, subscribePostgres, unsubscribePostgres, loadMemory, removeMemory]);
}
