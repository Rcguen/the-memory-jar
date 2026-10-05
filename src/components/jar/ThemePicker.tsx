"use client";
import { useState } from "react";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { MEMORY_THEMES } from "@/lib/memoryThemes";
import { Check } from "lucide-react";

import { MemoryThemeType } from "@/types/memory";
import type { MemoryThemeDefinition } from "@/lib/themeDefinitions/types";

interface ThemePickerProps {
  selectedTheme: MemoryThemeType;
  onChange: (theme: MemoryThemeType) => void;
}

function ThemeCard({ theme, isSelected, onClick }: { theme: MemoryThemeDefinition; isSelected: boolean; onClick: () => void }) {
  const [imgError, setImgError] = useState(false);

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative flex-shrink-0 w-36 h-44 rounded-2xl overflow-hidden snap-center outline-none transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]",
        "border focus-visible:ring-2 focus-visible:ring-emerald-500",
        isSelected 
          ? "border-emerald-500/40 shadow-[0_8px_30px_rgb(16,185,129,0.15)] ring-1 ring-emerald-500/50 scale-[1.02]" 
          : "border-black/5 dark:border-white/5 opacity-80 hover:opacity-100 hover:scale-[1.02] hover:shadow-xl"
      )}
    >
      {theme.previewThumbnail && !imgError ? (
        <img 
          src={theme.previewThumbnail} 
          alt={theme.label} 
          className="absolute inset-0 w-full h-full object-cover"
          onError={() => setImgError(true)}
        />
      ) : (
        <>
          <div className={cn("absolute inset-0 w-full h-full", theme.backgroundClass)}>
          </div>
          
          <div className={cn(
            "absolute inset-x-4 top-4 bottom-10 rounded-md border flex flex-col p-2 pt-3",
            theme.backgroundClass,
            theme.borderClass,
          )}>
            {/* Simulated text lines */}
            <div className={cn("w-3/4 h-1.5 rounded-sm mb-2", theme.textClass, "bg-current opacity-70")} />
            <div className={cn("w-full h-1.5 rounded-sm mb-1.5", theme.textClass, "bg-current opacity-40")} />
            <div className={cn("w-5/6 h-1.5 rounded-sm mb-1.5", theme.textClass, "bg-current opacity-40")} />
          </div>
        </>
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-100" />
      
      <div className="absolute bottom-2 inset-x-0 flex items-center justify-center gap-2">
        <span className="text-white text-xs font-medium tracking-wide drop-shadow-md">
          {theme.label}
        </span>
        {isSelected && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center"
          >
            <Check className="w-3 h-3 text-white" />
          </motion.div>
        )}
      </div>
    </button>
  );
}

export function ThemePicker({ selectedTheme, onChange }: ThemePickerProps) {
  const themes = Object.values(MEMORY_THEMES);

  return (
    <div className="w-full">
      <label className="text-sm font-medium leading-none mb-1 block">
        Letter Theme
      </label>
      
      <div className="flex overflow-x-auto items-center min-h-[190px] py-4 gap-4 snap-x hide-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
        {themes.map((theme) => {
          const isSelected = selectedTheme === theme.id;
          
          return (
            <ThemeCard 
              key={theme.id}
              theme={theme}
              isSelected={isSelected}
              onClick={() => onChange(theme.id)}
            />
          );
        })}
      </div>
    </div>
  );
}
