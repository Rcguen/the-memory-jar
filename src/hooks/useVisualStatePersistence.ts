import { useEffect, useRef } from "react";
import { EngineCore, NormalizedVisualState } from "@/lib/physics/EngineCore";
import { memoryService } from "@/services/memory";

export function useVisualStatePersistence(
  engineRef: React.MutableRefObject<EngineCore | null>,
  statesRef: React.MutableRefObject<NormalizedVisualState[]>
) {
  const saveQueue = useRef<Map<string, Parameters<typeof memoryService.saveVisualState>[0]>>(new Map());
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!engineRef.current) return;

    const processQueue = async () => {
      if (saveQueue.current.size === 0) return;
      
      const statesToSave = Array.from(saveQueue.current.values());
      saveQueue.current.clear();

      try {
        // Bulk upsert using Promise.all for now. Ideally, memoryService would have a bulkSaveVisualStates method.
        await Promise.all(
          statesToSave.map((state) => memoryService.saveVisualState(state))
        );
      } catch (err) {
        console.error("[useVisualStatePersistence] Failed to save batch", err);
      }
    };

    const scheduleSave = (state: NormalizedVisualState) => {
      saveQueue.current.set(state.id, {
        memory_id: state.id,
        position_x: state.x,
        position_y: state.y,
        rotation: state.rotation,
        scale: state.scale,
        velocity_x: state.vx,
        velocity_y: state.vy,
        is_sleeping: state.isSleeping,
        z_index: 1,
      });

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      timeoutRef.current = setTimeout(() => {
        processQueue();
      }, 500); // 500ms debounce
    };

    engineRef.current.onSleep((id, state) => {
      scheduleSave(state);
    });

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      processQueue(); // Flush on unmount
    };
  }, [engineRef, statesRef]);
}
