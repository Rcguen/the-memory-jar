"use client";

import { useEffect, useState, useTransition } from "react";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Compass, LayoutDashboard, LogOut, User, BookOpen, Loader2, RefreshCw } from "lucide-react";
import { useAuth } from "@/providers/auth-provider";
import { logoutAction } from "@/app/actions/auth";
import { clearPrivateClientData } from "@/lib/cache-cleanup";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import { GlassJar } from "@/components/jar/GlassJar";
import { CouplePresenceAvatars } from "@/components/jar/CouplePresenceAvatars";
import { AmbientParticles } from "@/components/ui/AmbientParticles";
import { RelationshipCounter } from "@/components/jar/RelationshipCounter";
import { DropMemoryButton } from "@/components/jar/DropMemoryButton";
import { WritingDesk } from "@/components/jar/WritingDesk";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { PwaInstallMenuItem } from "@/components/ui/PwaInstallMenuItem";
import { usePhysics } from "@/providers/physics-provider";
import { useMemoryModal } from "@/providers/memory-modal-provider";
import { useMemoryViewer } from "@/providers/memory-viewer-provider";
import { memoryService } from "@/services/memory";
import { createClient } from "@/lib/supabase/client";
import { MemoryType } from "@/types/memory";
import { useRelationshipContext } from "@/hooks/useRelationshipContext";
import { useAvatarUrl } from "@/hooks/useAvatarUrl";
import { useIntentRoutePrefetch } from "@/hooks/useRoutePrefetch";
import { useHomeAmbientMotion } from "@/hooks/useHomeAmbientMotion";
import { RelationshipAmbientBackdrop } from "@/components/experience/RelationshipAmbientBackdrop";
import { OnThisDayCard } from "@/components/experience/OnThisDayCard";
import { MobileBottomNav } from "@/components/mobile/MobileBottomNav";
import { TodayCard } from "@/components/home/TodayCard";
import { DailyReflection } from "@/components/home/DailyReflection";
import { ContinueReadingCard } from "@/components/home/ContinueReadingCard";
import { NextMomentCard } from "@/components/home/NextMomentCard";
import { MemoryReel } from "@/components/home/MemoryReel";
import { LittleMoments } from "@/components/home/LittleMoments";
import { RelationshipPlant } from "@/components/home/RelationshipPlant";
import { CozyDetails } from "@/components/home/CozyDetails";
import { DeskCat } from "@/components/home/DeskCat";
import { AmbientManager } from "@/components/home/AmbientManager";
import { JarWeather } from "@/components/home/JarWeather";
import { MemoryWhisper } from "@/components/home/MemoryWhisper";
import { MemoryOfTheDay } from "@/components/home/MemoryOfTheDay";
import { TodaysLetter } from "@/components/home/TodaysLetter";
import { LivingMemoryShelf } from "@/components/home/LivingMemoryShelf";
import { RelationshipOnboarding } from "@/components/onboarding/RelationshipOnboarding";
import { MusicLauncher } from "@/components/music/MusicLauncher";

const MotionLink = motion.create(Link);

const loadMusicExperience = () => import("@/components/music/MusicExperience").then((mod) => mod.MusicExperience);
const MusicExperience = dynamic(loadMusicExperience, { ssr: false });

const MemoryCommandCenter = dynamic(
  () => import("@/components/jar/MemoryCommandCenter").then((mod) => mod.MemoryCommandCenter),
  { ssr: false },
);

function OverlayChunkFallback({ label }: { label: string }) {
  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-[color-mix(in_srgb,var(--surface-dialog)_78%,transparent)] p-6"
      role="status"
      aria-live="polite"
    >
      <div className="surface-paper flex items-center gap-3 px-5 py-4 text-sm text-[var(--text-secondary)] shadow-[var(--shadow-3)]">
        <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none text-[var(--accent-primary)]" aria-hidden="true" />
        <span>{label}</span>
      </div>
    </div>
  );
}

const MemoryModal = dynamic(
  () => {
    const startedAt = process.env.NODE_ENV === "development" ? performance.now() : 0;
    if (process.env.NODE_ENV === "development") {
      console.debug("[home-overlay-chunk]", { overlay: "memory-modal", state: "start" });
    }

    return import("@/components/jar/MemoryModal").then((mod) => {
      if (process.env.NODE_ENV === "development") {
        console.debug("[home-overlay-chunk]", {
          overlay: "memory-modal",
          state: "ready",
          durationMs: Math.round(performance.now() - startedAt),
        });
      }
      return mod.MemoryModal;
    });
  },
  { ssr: false, loading: () => <OverlayChunkFallback label="Opening your keepsake..." /> },
);

const MemoryViewer = dynamic(
  () => {
    const startedAt = process.env.NODE_ENV === "development" ? performance.now() : 0;
    if (process.env.NODE_ENV === "development") {
      console.debug("[home-overlay-chunk]", { overlay: "memory-viewer", state: "start" });
    }

    return import("@/components/viewer/MemoryViewer").then((mod) => {
      if (process.env.NODE_ENV === "development") {
        console.debug("[home-overlay-chunk]", {
          overlay: "memory-viewer",
          state: "ready",
          durationMs: Math.round(performance.now() - startedAt),
        });
      }
      return mod.MemoryViewer;
    });
  },
  { ssr: false, loading: () => <OverlayChunkFallback label="Opening your memory..." /> },
);

type JarLoadState = "pending" | "success" | "error";

function JarLoadFallback({ state, onRetry }: { state: JarLoadState; onRetry: () => void }) {
  const isError = state === "error";

  return (
    <div
      className="flex h-[21rem] w-[15.5rem] flex-col items-center justify-center gap-3 rounded-[2.5rem] border border-[var(--divider)] bg-[var(--surface-glass)]/50 px-5 text-center shadow-[var(--shadow-2)] sm:h-[25rem] sm:w-[20rem]"
      role={isError ? "alert" : "status"}
      aria-live="polite"
    >
      {isError ? (
        <>
          <p className="font-cormorant text-xl text-[var(--text-primary)]">The jar needs a moment.</p>
          <p className="text-sm text-[var(--text-secondary)]">Your shelf is still here. Try loading the jar again.</p>
          <button
            type="button"
            onClick={onRetry}
            className="focus-ring-premium inline-flex min-h-10 items-center gap-2 rounded-full border border-[var(--divider)] bg-[var(--surface-paper)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] transition-[transform,background-color] duration-200 hover:bg-[var(--surface-raised)] active:scale-[0.97]"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Try again
          </button>
        </>
      ) : (
        <>
          <Loader2 className="h-6 w-6 animate-spin motion-reduce:animate-none text-[var(--accent-primary)]" aria-hidden="true" />
          <p className="text-sm text-[var(--text-secondary)]">Settling your keepsakes into the jar.</p>
        </>
      )}
    </div>
  );
}

export function HomeClientExperience() {
  const { profile } = useAuth();
  const { data: relationship } = useRelationshipContext();
  const { data: avatarUrl } = useAvatarUrl(profile?.avatar);
  const { loadMemory } = usePhysics();
  const { isOpen: isMemoryModalOpen } = useMemoryModal();
  const { viewingMemoryId } = useMemoryViewer();
  const router = useRouter();
  const prefetchRoute = useIntentRoutePrefetch();
  const [memoryCount, setMemoryCount] = useState<number | null>(null);
  const [jarLoadState, setJarLoadState] = useState<JarLoadState>("pending");
  const [jarLoadAttempt, setJarLoadAttempt] = useState(0);
  const [isMusicOpen, setIsMusicOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const ambientMotion = useHomeAmbientMotion();

  useEffect(() => {
    let isCurrentAttempt = true;
    const startedAt = performance.now();
    if (process.env.NODE_ENV === "development") {
      console.debug("[home-jar-load]", { state: "pending" });
    }

    async function loadJar() {
      const supabase = createClient();

      // Fetch both visual states and their corresponding memory types, filtering out drafts, archived, and pending_partner
      const { data: memories, error } = await supabase
        .from("memories")
        .select("id, type, status, unlock_at, capsule_style, is_collaborative, memory_visual_state(position_x, position_y, rotation, scale, velocity_x, velocity_y, is_sleeping)")
        .in("status", ["sealed", "unlocked", "opening"])
        .is("deleted_at", null);

      if (error) {
        if (!isCurrentAttempt) return;
        setJarLoadState("error");
        if (process.env.NODE_ENV === "development") {
          console.debug("[home-jar-load]", {
            state: "error",
            durationMs: Math.round(performance.now() - startedAt),
          });
        }
        return;
      }

      const jarMemories = memories ?? [];
      if (!isCurrentAttempt) return;
      setMemoryCount(jarMemories.length);

      jarMemories.forEach((mem) => {
        const vs = mem.memory_visual_state as unknown as import("@/types/memory").MemoryVisualState | import("@/types/memory").MemoryVisualState[];
        const stateData = Array.isArray(vs) ? vs[0] : vs;

        if (stateData) {
          loadMemory(mem.id, mem.type as MemoryType, {
            id: mem.id,
            type: mem.type as MemoryType,
            status: mem.status as import("@/lib/physics/EngineCore").NormalizedVisualState["status"],
            capsuleStyle: mem.capsule_style as import("@/lib/physics/EngineCore").NormalizedVisualState["capsuleStyle"],
            unlockAt: mem.unlock_at,
            isCollaborative: mem.is_collaborative,
            x: stateData.position_x,
            y: stateData.position_y,
            rotation: stateData.rotation,
            scale: stateData.scale,
            vx: stateData.velocity_x,
            vy: stateData.velocity_y,
            isSleeping: stateData.is_sleeping,
          });
        } else {
          loadMemory(mem.id, mem.type as MemoryType, {
            id: mem.id,
            type: mem.type as MemoryType,
            status: mem.status as import("@/lib/physics/EngineCore").NormalizedVisualState["status"],
            capsuleStyle: mem.capsule_style as import("@/lib/physics/EngineCore").NormalizedVisualState["capsuleStyle"],
            unlockAt: mem.unlock_at,
            isCollaborative: mem.is_collaborative,
            x: 0.5,
            y: 0,
            rotation: 0,
            scale: 1,
            vx: 0,
            vy: 0,
            isSleeping: false,
          });
          // Asynchronously initialize missing visual state to ensure persistence
          memoryService.initializeVisualState(mem.id);
        }
      });

      setJarLoadState("success");
      if (process.env.NODE_ENV === "development") {
        console.debug("[home-jar-load]", {
          state: "success",
          durationMs: Math.round(performance.now() - startedAt),
          memoryCount: jarMemories.length,
        });
      }
    }

    void loadJar().catch(() => {
      if (!isCurrentAttempt) return;
      setJarLoadState("error");
      if (process.env.NODE_ENV === "development") {
        console.debug("[home-jar-load]", {
          state: "error",
          durationMs: Math.round(performance.now() - startedAt),
        });
      }
    });

    return () => {
      isCurrentAttempt = false;
    };
    // This query owns a deliberate one-shot physics hydration per retry attempt.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jarLoadAttempt]);
  const prefetchTimeline = () => prefetchRoute("/timeline");
  const prefetchDashboard = () => prefetchRoute("/dashboard");
  const prefetchBook = () => prefetchRoute("/memory-book");

  if (profile && !profile.active_relationship_id) {
    return <RelationshipOnboarding />;
  }

  return (
    <>
      {/* Client-owned ambient relationship state. Static room lighting lives in StaticHomeShell. */}
      {relationship?.relationshipTimezone && (
        <RelationshipAmbientBackdrop
          timezone={relationship.relationshipTimezone}
          motionActive={ambientMotion.isActive}
          isPhone={ambientMotion.isPhone}
        />
      )}

      {/* 2. Ambient Particles */}
      <AmbientParticles />

      {/* 3. Top Navigation */}
      <header className="pointer-events-none absolute inset-x-0 top-0 z-20 px-3 pt-3 sm:p-6">
        <div className="flex items-start justify-between gap-3">
        <div className="pointer-events-auto hidden items-center gap-2 md:flex">
            <MotionLink
              href="/timeline"
              prefetch={false}
              onMouseEnter={prefetchTimeline}
              onPointerDown={prefetchTimeline}
              onFocus={prefetchTimeline}
              whileTap={{ scale: 0.96 }}
              transition={{ type: "spring", bounce: 0, duration: 0.4 }}
              className="inline-flex items-center gap-2 rounded-full border border-[var(--divider)] bg-[var(--surface-wood)]/60 px-4 py-2 text-sm text-[var(--text-primary)] shadow-[var(--shadow-2)] backdrop-blur-xl transition-colors hover:bg-[var(--surface-wood)]/80 focus-ring-premium"
            >
            <Compass className="h-4 w-4 text-emerald-400" />
            Timeline
          </MotionLink>
            <MotionLink
              href="/dashboard"
              prefetch={false}
              onMouseEnter={prefetchDashboard}
              onPointerDown={prefetchDashboard}
              onFocus={prefetchDashboard}
              whileTap={{ scale: 0.96 }}
              transition={{ type: "spring", bounce: 0, duration: 0.4 }}
              className="inline-flex items-center gap-2 rounded-full border border-[var(--divider)] bg-[var(--surface-wood)]/60 px-4 py-2 text-sm text-[var(--text-primary)] shadow-[var(--shadow-2)] backdrop-blur-xl transition-colors hover:bg-[var(--surface-wood)]/80 focus-ring-premium"
            >
            <LayoutDashboard className="h-4 w-4 text-rose-300" />
            Dashboard
          </MotionLink>
            <MotionLink
              href="/memory-book"
              prefetch={false}
              onMouseEnter={prefetchBook}
              onPointerDown={prefetchBook}
              onFocus={prefetchBook}
              whileTap={{ scale: 0.96 }}
              transition={{ type: "spring", bounce: 0, duration: 0.4 }}
              className="inline-flex items-center gap-2 rounded-full border border-[var(--divider)] bg-[var(--surface-wood)]/60 px-4 py-2 text-sm text-[var(--text-primary)] shadow-[var(--shadow-2)] backdrop-blur-xl transition-colors hover:bg-[var(--surface-wood)]/80 focus-ring-premium"
            >
              <BookOpen className="h-4 w-4 text-amber-200" />
              Memory Book
            </MotionLink>
        </div>
        {profile && (
          <div className="pointer-events-auto ml-auto flex items-center gap-2 rounded-full border border-[var(--divider)] bg-[var(--surface-wood)]/50 px-1.5 py-1 shadow-[var(--shadow-2)] backdrop-blur-xl sm:gap-3 sm:bg-transparent sm:px-0 sm:py-0 sm:shadow-none sm:border-transparent">
          <NotificationBell />
          <DropdownMenu>
            <DropdownMenuTrigger className="relative h-10 flex items-center gap-2 rounded-full hover:bg-[var(--surface-raised)]/20 active:scale-[0.96] transition-[transform,background-color,border-color,box-shadow] pr-4 pl-1 outline-none focus-ring-premium">
              <Avatar className="h-8 w-8">
                {avatarUrl && <AvatarImage src={avatarUrl} alt={profile.display_name} />}
                <AvatarFallback className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
                  {profile.display_name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <span className="font-inter text-sm font-medium hidden sm:inline-block text-[var(--text-primary)]">
                {profile.display_name}
              </span>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end">
              <DropdownMenuGroup>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{profile.display_name}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      @{profile.username}
                    </p>
                  </div>
                </DropdownMenuLabel>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="cursor-pointer"
                onClick={() => router.push("/profile")}
              >
                <User className="mr-2 h-4 w-4" />
                <span>Profile</span>
              </DropdownMenuItem>
              <PwaInstallMenuItem />
              <DropdownMenuItem 
                className="cursor-pointer text-rose-600 dark:text-rose-400 focus:text-rose-600 dark:focus:text-rose-400" 
                onClick={() => startTransition(async () => { await clearPrivateClientData(); await logoutAction(); })}
                disabled={isPending}
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>{isPending ? "Logging out..." : "Log out"}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          </div>
        )}
        </div>
      </header>

      {/* 4. Main Content Area */}
      <div className={`home-center-column relative z-10 flex w-full max-w-[23rem] flex-col items-center px-3 pb-8 pt-20 sm:max-w-2xl sm:px-4 sm:pb-10 sm:pt-24 lg:pt-12 xl:pt-8 ${isMusicOpen ? "home-center-column--music-open" : ""}`}>
        
        {/* Title / Mood Text */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="mb-4 w-full text-center sm:mb-6 lg:mb-4"
        >
          <h1 className="font-cormorant text-[2rem] leading-none tracking-[0.18em] text-zinc-800 opacity-80 sm:text-3xl sm:tracking-widest md:text-4xl dark:text-zinc-200">
            The Memory Jar
          </h1>
          <p className="mt-2 text-[10px] uppercase tracking-[0.28em] text-zinc-500/90 dark:text-zinc-400/80 sm:hidden">
            Keep your little moments close
          </p>
        </motion.div>

        {/* Couple Presence Avatars */}
        <CouplePresenceAvatars motionActive={ambientMotion.isActive} />

        <div className="music-launcher-slot">
          <MusicLauncher
            isOpen={isMusicOpen}
            onOpen={() => setIsMusicOpen(true)}
            onIntentPrefetch={() => { void loadMusicExperience(); }}
          />
        </div>

        {/* The Physical Glass Jar */}
        {jarLoadState === "success" && memoryCount !== null ? (
          <div className="home-jar-stage">
            {isMusicOpen && <MusicExperience paused={!ambientMotion.isActive} onClose={() => setIsMusicOpen(false)} />}
            <div className="relative z-20">
              <ErrorBoundary fallbackMessage="The Jar engine crashed. Physics might be temporarily disabled.">
                <GlassJar
                  memoryCount={memoryCount}
                  ambientMotionActive={ambientMotion.isActive}
                  isPhone={ambientMotion.isPhone}
                />
              </ErrorBoundary>
            </div>
          </div>
        ) : <JarLoadFallback state={jarLoadState} onRetry={() => { setJarLoadState("pending"); setJarLoadAttempt((attempt) => attempt + 1); }} />}

        {/* Relationship Time Elapsed */}
        {relationship?.startDate && (
          <RelationshipCounter 
            startDate={new Date(relationship.startDate)} 
            className="-mt-4 sm:-mt-6 md:-mt-10 lg:-mt-12 mb-4 sm:mb-6" 
          />
        )}

        <OnThisDayCard className="mt-8" />

        {/* The Writing Desk (Staging Area) */}
        <ErrorBoundary fallbackMessage="The Writing Desk encountered an error.">
          <WritingDesk />
        </ErrorBoundary>

        {/* Call to Action */}
        <div className="hidden sm:block mt-0 relative z-10">
          <DropMemoryButton />
        </div>

      </div>

      {/* LEFT PANEL: Memory Shelf (Primary Actions) */}
      <div className="relative z-10 mt-8 w-full max-w-[23rem] px-3 sm:max-w-3xl sm:px-4 xl:absolute xl:bottom-6 xl:left-6 xl:top-24 xl:mt-0 xl:w-[24rem] xl:max-w-none xl:px-0 xl:pb-0 2xl:w-[34rem] xl:overflow-y-auto xl:[scrollbar-width:none] xl:[&::-webkit-scrollbar]:hidden">
        <div className="flex flex-col relative z-10 xl:pr-3 xl:pb-12 min-h-full">
          <LivingMemoryShelf className="home-shelf relative min-h-[500px] flex-1">
            <DeskCat motionActive={ambientMotion.isActive} isPhone={ambientMotion.isPhone} />
            <ErrorBoundary fallbackMessage="Memory tools failed to load.">
              <MemoryCommandCenter className="xl:mt-0 xl:max-w-none h-full" />
            </ErrorBoundary>
          </LivingMemoryShelf>
        </div>
      </div>

      {/* RIGHT PANEL: Storytelling & Ambient Cards */}
      <div className="relative z-10 mt-4 w-full max-w-[23rem] overflow-x-clip px-3 pb-32 sm:max-w-3xl sm:px-4 xl:absolute xl:bottom-6 xl:right-6 xl:top-24 xl:mt-0 xl:w-[24rem] xl:max-w-none xl:px-0 xl:pb-0 2xl:w-[32rem] xl:overflow-y-auto xl:[scrollbar-width:none] xl:[&::-webkit-scrollbar]:hidden">
        <CozyDetails motionActive={ambientMotion.isActive} isPhone={ambientMotion.isPhone} />
        <AmbientManager />
        
        <div className="home-desk relative z-10 grid min-w-0 grid-cols-1 gap-3 sm:gap-4 xl:min-h-full xl:grid-cols-2 xl:pl-3 xl:pr-2 xl:pb-12">
          
          <div className="flex justify-between items-end mb-1">
            <JarWeather />
          </div>

          <div className="xl:col-span-2"><MemoryWhisper /></div>
          <div className="xl:col-span-2"><MemoryOfTheDay /></div>
          <div className="grid grid-cols-1 gap-2.5 xl:col-span-2 xl:grid-cols-[1fr_0.72fr] [&>*:only-child]:col-span-full">
            <ContinueReadingCard />
            <NextMomentCard />
          </div>
          <div className="hidden xl:block xl:col-span-2"><TodaysLetter /></div>
          <div className="hidden xl:block xl:col-span-2"><DailyReflection /></div>
          <div className="xl:col-span-2"><MemoryReel /></div>
          <div className="grid min-w-0 grid-cols-1 items-center gap-2.5 border-t border-[var(--divider)] px-2 pb-4 pt-3 xl:col-span-2 xl:grid-cols-[minmax(0,1fr)_auto]">
            <LittleMoments />
            <RelationshipPlant />
          </div>
        </div>
      </div>

      <MobileBottomNav />

      {/* Global overlays stay unmounted until their lightweight providers signal an open state. */}
      {isMemoryModalOpen && (
        <ErrorBoundary fallbackMessage="Memory Creation failed to load.">
          <MemoryModal />
        </ErrorBoundary>
      )}
      {viewingMemoryId && (
        <ErrorBoundary fallbackMessage="Memory Viewer crashed. Try opening a different memory.">
          <MemoryViewer />
        </ErrorBoundary>
      )}
    </>
  );
}
