"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { getProfile } from "@/services/auth";
import { useTimezoneDetection } from "@/hooks/useTimezoneDetection";
import { createClient } from "@/lib/supabase/client";
import { UserProfile } from "@/types/memory";

type AuthContextType = {
  profile: UserProfile | null;
  isLoading: boolean;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  profile: null,
  isLoading: true,
  refreshProfile: async () => {},
});

export function AuthProvider({ children, initialProfile }: { children: React.ReactNode, initialProfile?: UserProfile | null }) {
  const [profile, setProfile] = useState<UserProfile | null>(initialProfile || null);
  const [isLoading, setIsLoading] = useState(!initialProfile);
  const supabase = useMemo(() => createClient(), []);

  const refreshProfile = async () => {
    setIsLoading(true);
    try {
      const p = await getProfile();
      setProfile(p);
    } catch (e) {
      console.error("Failed to load profile", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (initialProfile !== undefined) {
      setProfile(initialProfile);
      setIsLoading(false);
    }
    
    if (initialProfile) return;

    const timeoutId = window.setTimeout(() => {
      void refreshProfile();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [initialProfile]);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session?.user) {
        setProfile(null);
        setIsLoading(false);
        return;
      }

      if (event === "SIGNED_IN" || event === "INITIAL_SESSION" || event === "USER_UPDATED") {
        void refreshProfile();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  useTimezoneDetection(profile, (detectedTz) => {
    setProfile((prev) => (prev ? { ...prev, timezone: detectedTz } : null));
  });

  return (
    <AuthContext.Provider value={{ profile, isLoading, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
