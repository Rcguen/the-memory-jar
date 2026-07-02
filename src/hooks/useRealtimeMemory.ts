import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useRealtimeContext } from "@/providers/realtime-provider";

export function useRealtimeMemory(relationshipId: string | null) {
  const queryClient = useQueryClient();
  const { subscribePostgres, unsubscribePostgres } = useRealtimeContext();

  useEffect(() => {
    if (!relationshipId) return;

    const channelName = `memories_${relationshipId}`;
    
    const handlePostgresChange = (e: Event) => {
      const customEvent = e as CustomEvent;
      const payload = customEvent.detail;
      
      queryClient.invalidateQueries({ queryKey: ['memories'] });
      
      if (payload.new && 'id' in payload.new) {
        queryClient.invalidateQueries({ queryKey: ['memory', payload.new.id] });
      }
    };

    window.addEventListener(`postgres-${channelName}`, handlePostgresChange);
    
    // Subscribe
    subscribePostgres(channelName, '*', 'public', 'memories', undefined);

    return () => {
      window.removeEventListener(`postgres-${channelName}`, handlePostgresChange);
      unsubscribePostgres(channelName);
    };
  }, [relationshipId, queryClient, subscribePostgres, unsubscribePostgres]);
}
