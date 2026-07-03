"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { getProfile } from "@/services/auth";
import { useTimezoneDetection } from "@/hooks/useTimezoneDetection";
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

  const refreshProfile = async () => {
    setIsLoading(true);
    try {
      const p = await getProfile();
      setProfile(p as UserProfile | null);
    } catch (e) {
      console.error("Failed to load profile", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!initialProfile) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      refreshProfile();
    }
  }, [initialProfile]);

  // Auto-detect and save timezone once when profile.timezone is NULL
  useTimezoneDetection(profile);

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
