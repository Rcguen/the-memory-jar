"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

interface UnlockSchedulerContextType {
  now: Date;
}

const UnlockSchedulerContext = createContext<UnlockSchedulerContextType | undefined>(undefined);

export function UnlockSchedulerProvider({ children }: { children: ReactNode }) {
  // We only need minute-level precision for the countdowns to save battery and renders.
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    // Initial sync to the start of the next minute
    const syncTime = 60000 - (Date.now() % 60000);
    
    let intervalId: NodeJS.Timeout;

    const timeoutId = setTimeout(() => {
      setNow(new Date());
      intervalId = setInterval(() => {
        setNow(new Date());
      }, 60000);
    }, syncTime);

    return () => {
      clearTimeout(timeoutId);
      if (intervalId) clearInterval(intervalId);
    };
  }, []);

  return (
    <UnlockSchedulerContext.Provider value={{ now }}>
      {children}
    </UnlockSchedulerContext.Provider>
  );
}

export function useUnlockScheduler() {
  const context = useContext(UnlockSchedulerContext);
  if (context === undefined) {
    throw new Error("useUnlockScheduler must be used within an UnlockSchedulerProvider");
  }
  return context;
}
