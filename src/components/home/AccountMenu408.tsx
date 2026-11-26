/* Lucian UX/UI Prompt #408 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#408 */
"use client";

import React, { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { pwaStore } from "@/lib/pwa-store";
import { isAdminAuthorized } from "@/lib/permissions";
import "./account-menu-408.css";

interface DeferredInstallPrompt extends Event {
  prompt: () => void;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in window.navigator &&
      Boolean((window.navigator as unknown as { standalone?: boolean }).standalone))
  );
}

function isIosBrowser() {
  if (typeof window === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !("MSStream" in window);
}

function isChromiumBrowser() {
  if (typeof window === "undefined") return false;
  return /Chrome|Chromium|CriOS|Edg|OPR/.test(navigator.userAgent) && !isIosBrowser();
}

export interface AccountMenu408Props {
  profile: {
    id?: string;
    display_name: string;
    username: string;
    email?: string | null;
    avatar?: string | null;
  };
  avatarUrl?: string | null;
  isLoggingOut?: boolean;
  onLogout: () => void;
}

export function AccountMenu408({
  profile,
  avatarUrl,
  isLoggingOut,
  onLogout,
}: AccountMenu408Props) {
  const router = useRouter();
  const menuId = useId();
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const avRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // PWA install state
  const [deferredPrompt, setDeferredPrompt] = useState<Event | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [isChromium, setIsChromium] = useState(false);
  const [isPrompting, setIsPrompting] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setIsInstalled(isStandalone());
      setIsIos(isIosBrowser());
      setIsChromium(isChromiumBrowser());
    }, 0);
    const unsubscribe = pwaStore.subscribe(setDeferredPrompt);
    return () => {
      window.clearTimeout(timer);
      unsubscribe();
    };
  }, []);

  const hasNativePrompt = Boolean(deferredPrompt);
  const canInstall = !isInstalled && (hasNativePrompt || isIos || isChromium);

  const getMenuItems = () => {
    if (!menuRef.current) return [];
    return Array.from(menuRef.current.querySelectorAll<HTMLButtonElement>(".u408-it"));
  };

  const open = (focusAt?: number) => {
    setIsOpen(true);
    if (focusAt != null) {
      setTimeout(() => {
        const validItems = getMenuItems();
        if (validItems.length > 0) {
          const targetIndex = (focusAt + validItems.length) % validItems.length;
          validItems[targetIndex]?.focus({ preventScroll: true });
        }
      }, 50);
    }
  };

  const close = (back?: boolean) => {
    setIsOpen(false);
    if (back) {
      avRef.current?.focus({ preventScroll: true });
    }
  };

  const handleToggle = () => {
    if (isOpen) close();
    else open();
  };

  const handleTriggerKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      open(e.key === "ArrowDown" ? 0 : -1);
    } else if (e.key === "Escape" && isOpen) {
      e.stopPropagation();
      close();
    }
  };

  const handleMenuKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const validItems = getMenuItems();
    if (validItems.length === 0) return;
    const currentIndex = validItems.indexOf(document.activeElement as HTMLButtonElement);

    if (e.key === "ArrowDown") {
      e.preventDefault();
      validItems[(currentIndex + 1) % validItems.length]?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      validItems[(currentIndex - 1 + validItems.length) % validItems.length]?.focus();
    } else if (e.key === "Home") {
      e.preventDefault();
      validItems[0]?.focus();
    } else if (e.key === "End") {
      e.preventDefault();
      validItems[validItems.length - 1]?.focus();
    } else if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      close(true);
    } else if (e.key === "Tab") {
      close();
    }
  };

  // Close on outside pointerdown
  useEffect(() => {
    function handleOutsidePointer(e: PointerEvent) {
      if (!isOpen || !rootRef.current) return;
      if (!rootRef.current.contains(e.target as Node)) {
        close();
      }
    }
    document.addEventListener("pointerdown", handleOutsidePointer, true);
    return () => {
      document.removeEventListener("pointerdown", handleOutsidePointer, true);
    };
  }, [isOpen]);

  const handleProfile = () => {
    close(true);
    router.push("/profile");
  };

  const handleAdmin = () => {
    close(false);
    router.push("/admin");
  };

  const handleSettings = () => {
    close(true);
    router.push("/profile");
  };

  const handleInstall = async () => {
    const promptEvent = deferredPrompt as DeferredInstallPrompt | null;
    if (promptEvent) {
      setIsPrompting(true);
      try {
        promptEvent.prompt();
        pwaStore.clearPrompt();
        await promptEvent.userChoice;
      } finally {
        pwaStore.clearPrompt();
        setIsPrompting(false);
        close(true);
      }
      return;
    }

    window.dispatchEvent(
      new CustomEvent("tmj:open-install-guide", {
        detail: isIos ? "ios" : "chromium",
      })
    );
    close(true);
  };

  const handleHelp = () => {
    close(true);
    toast("The Memory Jar: A private space to keep cherished moments.", {
      description: "Need help? Tap Profile to manage your relationship, themes, and settings.",
    });
  };

  const handleLogout = () => {
    close(false);
    onLogout();
  };

  const pwaLabel = hasNativePrompt
    ? "Install app"
    : isIos
    ? "Add to Home Screen"
    : "How to install";

  return (
    <div className={`u408 ${isOpen ? "is-open" : ""}`} ref={rootRef}>
        <div className="u408-w">
          <button
            ref={avRef}
            type="button"
            className="u408-trigger"
            aria-label="Open account menu"
            aria-haspopup="menu"
            aria-expanded={isOpen}
            aria-controls={menuId}
            onClick={handleToggle}
            onKeyDown={handleTriggerKeyDown}
          >
            <div className="u408-av-box">
              <div className="u408-av">
                {avatarUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={avatarUrl}
                    alt={profile.display_name}
                    className="u408-av-img"
                  />
                ) : (
                  <span className="u408-av-fallback">
                    {profile.display_name.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <span className="u408-dot" aria-hidden="true" />
            </div>
            <span className="u408-name hidden sm:inline-block">
              {profile.display_name}
            </span>
          </button>

          <div
            id={menuId}
            ref={menuRef}
            className="u408-m"
            role="menu"
            aria-label="Account menu"
            onKeyDown={handleMenuKeyDown}
          >
            <div className="u408-hd" style={{ "--i": 0 } as React.CSSProperties}>
              <b>{profile.display_name}</b>
              <span>@{profile.username}</span>
            </div>

            <button
              type="button"
              className="u408-it"
              role="menuitem"
              tabIndex={-1}
              style={{ "--i": 1 } as React.CSSProperties}
              onClick={handleProfile}
            >
              <svg viewBox="0 0 18 18" aria-hidden="true">
                <circle cx="9" cy="6.2" r="3.2" />
                <path d="M3 16c.6-3.2 3-5 6-5s5.4 1.8 6 5" />
              </svg>
              <span>Profile</span>
            </button>

            {isAdminAuthorized(profile) && (
              <button
                type="button"
                className="u408-it"
                role="menuitem"
                tabIndex={-1}
                style={{ "--i": 1.5 } as React.CSSProperties}
                onClick={handleAdmin}
              >
                <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M9 1.5l6 2.5v4.5c0 4.2-2.8 7.3-6 8-3.2-.7-6-3.8-6-8V4l6-2.5z" />
                </svg>
                <span>Admin Console</span>
              </button>
            )}

            <button
              type="button"
              className="u408-it"
              role="menuitem"
              tabIndex={-1}
              style={{ "--i": 2 } as React.CSSProperties}
              onClick={handleSettings}
            >
              <svg viewBox="0 0 18 18" aria-hidden="true">
                <circle cx="9" cy="9" r="2.4" />
                <path d="M9 1.8v2M9 14.2v2M1.8 9h2M14.2 9h2M3.9 3.9l1.4 1.4M12.7 12.7l1.4 1.4M3.9 14.1l1.4-1.4M12.7 5.3l1.4-1.4" />
              </svg>
              <span>Settings</span>
            </button>

            {canInstall ? (
              <button
                type="button"
                className="u408-it"
                role="menuitem"
                tabIndex={-1}
                style={{ "--i": 3 } as React.CSSProperties}
                disabled={isPrompting}
                onClick={handleInstall}
              >
                <svg viewBox="0 0 18 18" aria-hidden="true">
                  <path d="M9 3v8m0 0 3-3m-3 3-3-3M3 14h12" />
                </svg>
                <span>{isPrompting ? "Opening install..." : pwaLabel}</span>
              </button>
            ) : (
              <button
                type="button"
                className="u408-it"
                role="menuitem"
                tabIndex={-1}
                style={{ "--i": 3 } as React.CSSProperties}
                onClick={handleHelp}
              >
                <svg viewBox="0 0 18 18" aria-hidden="true">
                  <circle cx="9" cy="9" r="7" />
                  <path d="M7 7a2 2 0 1 1 2.8 1.8c-.5.3-.8.7-.8 1.3v.4" />
                  <path d="M9 12.8v.1" />
                </svg>
                <span>Help</span>
              </button>
            )}

            <div className="u408-hr" role="separator" style={{ "--i": 4 } as React.CSSProperties} />

            <button
              type="button"
              className="u408-it is-out"
              role="menuitem"
              tabIndex={-1}
              style={{ "--i": 5 } as React.CSSProperties}
              disabled={isLoggingOut}
              onClick={handleLogout}
            >
              <svg viewBox="0 0 18 18" aria-hidden="true">
                <path d="M7 3H4.5A1.5 1.5 0 0 0 3 4.5v9A1.5 1.5 0 0 0 4.5 15H7" />
                <path d="M11.5 12.5 15 9l-3.5-3.5M15 9H7.5" />
              </svg>
              <span>{isLoggingOut ? "Logging out..." : "Log out"}</span>
            </button>
          </div>
        </div>
      </div>
    );
  }
