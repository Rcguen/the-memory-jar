"use client";

import { createContext, useContext, useEffect, useRef, useMemo } from "react";
import { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

export type PostgresChangeEvent = 'INSERT' | 'UPDATE' | 'DELETE' | '*';

interface ChannelEntry {
  channel: RealtimeChannel;
  refs: number;
}

interface RealtimeContextType {
  subscribePresence: (channelName: string) => void;
  unsubscribePresence: (channelName: string) => void;
  trackPresence: (channelName: string, payload: any) => Promise<void>;
  untrackPresence: (channelName: string) => Promise<void>;
  
  subscribePostgres: (channelName: string, event: PostgresChangeEvent, schema: string, table: string, filter?: string) => void;
  unsubscribePostgres: (channelName: string) => void;
}

const RealtimeContext = createContext<RealtimeContextType | null>(null);

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const supabase = useMemo(() => createClient(), []);
  const channelsRef = useRef<Map<string, ChannelEntry>>(new Map());

  useEffect(() => {
    const currentMap = channelsRef.current;
    return () => {
      Array.from(currentMap.values()).forEach(({ channel }) => {
        supabase.removeChannel(channel);
      });
      currentMap.clear();
    };
  }, [supabase]);

  const getOrCreateChannel = (name: string): ChannelEntry => {
    let entry = channelsRef.current.get(name);
    if (!entry) {
      entry = { channel: supabase.channel(name), refs: 0 };
      channelsRef.current.set(name, entry);
    }
    return entry;
  };

  const handleRelease = (name: string) => {
    setTimeout(() => {
      const entry = channelsRef.current.get(name);
      if (entry) {
        entry.refs -= 1;
        if (entry.refs <= 0) {
          supabase.removeChannel(entry.channel);
          channelsRef.current.delete(name);
        }
      }
    }, 150); // Debounce to survive React StrictMode unmount/remount
  };

  const subscribePresence = (channelName: string) => {
    const entry = getOrCreateChannel(channelName);
    if (entry.refs === 0) {
      entry.channel.on('presence', { event: 'sync' }, () => {
        window.dispatchEvent(new CustomEvent(`presence-${channelName}`, { 
          detail: entry.channel.presenceState() 
        }));
      });
      if (entry.channel.state !== 'joined' && entry.channel.state !== 'joining') {
        entry.channel.subscribe();
      }
    } else if (entry.channel.state === 'joined') {
      // Dispatch immediately for the new subscriber if already joined
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent(`presence-${channelName}`, { 
          detail: entry.channel.presenceState() 
        }));
      }, 50);
    }
    entry.refs += 1;
  };

  const trackPresence = async (channelName: string, payload: any) => {
    const entry = channelsRef.current.get(channelName);
    if (!entry) return;

    if (entry.channel.state === 'joined') {
      await entry.channel.track(payload);
    } else if (entry.channel.state === 'joining') {
      // Retry in 500ms if channel is currently joining
      setTimeout(() => {
        trackPresence(channelName, payload);
      }, 500);
    }
  };

  const untrackPresence = async (channelName: string) => {
    const entry = channelsRef.current.get(channelName);
    if (entry && entry.channel.state === 'joined') {
      await entry.channel.untrack();
    }
  };

  const subscribePostgres = (channelName: string, event: PostgresChangeEvent, schema: string, table: string, filter?: string) => {
    const entry = getOrCreateChannel(channelName);
    if (entry.refs === 0) {
      entry.channel.on('postgres_changes', { event, schema, table, filter }, (payload) => {
        window.dispatchEvent(new CustomEvent(`postgres-${channelName}`, { detail: payload }));
      });
      if (entry.channel.state !== 'joined' && entry.channel.state !== 'joining') {
        entry.channel.subscribe();
      }
    }
    entry.refs += 1;
  };

  const contextValue = useMemo(() => ({
    subscribePresence,
    unsubscribePresence: handleRelease,
    trackPresence,
    untrackPresence,
    subscribePostgres,
    unsubscribePostgres: handleRelease
  }), []);

  return (
    <RealtimeContext.Provider value={contextValue}>
      {children}
    </RealtimeContext.Provider>
  );
}

export function useRealtimeContext() {
  const ctx = useContext(RealtimeContext);
  if (!ctx) throw new Error("useRealtimeContext must be used within RealtimeProvider");
  return ctx;
}
