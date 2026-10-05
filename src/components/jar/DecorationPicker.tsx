"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import { DECORATIONS } from "@/lib/memoryThemes";
import { DecorationID } from "@/types/memory";

interface DecorationPickerProps {
  selectedDecorations: DecorationID[];
  onChange: (decorations: DecorationID[]) => void;
}

export function DecorationPicker({ selectedDecorations, onChange }: DecorationPickerProps) {
  const toggleDecoration = (id: DecorationID) => {
    if (selectedDecorations.includes(id)) {
      onChange(selectedDecorations.filter(d => d !== id));
    } else {
      if (selectedDecorations.length < 4) {
        onChange([...selectedDecorations, id]);
      }
    }
  };

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-2">
        <label className="font-inter text-[11px] font-semibold uppercase tracking-wider text-stone-500">Decorations (Optional)</label>
        <span className="text-xs text-zinc-500">
          {selectedDecorations.length}/4 selected
        </span>
      </div>
      
            <div className="flex flex-wrap gap-3 mt-4">
        {DECORATIONS.map((deco) => {
          const isSelected = selectedDecorations.includes(deco.id);
          const isDisabled = !isSelected && selectedDecorations.length >= 4;
          
          return (
            <button
              key={deco.id}
              type="button"
              onClick={() => toggleDecoration(deco.id)}
              disabled={isDisabled}
              className={cn(
                "relative flex h-24 w-20 flex-col items-center justify-center gap-3 rounded-2xl border transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]",
                isSelected
                  ? "border-emerald-500/40 bg-emerald-50/50 shadow-[0_0_0_1px_rgba(16,185,129,0.2)] dark:bg-emerald-950/20"
                  : "border-[rgba(0,0,0,0.05)] bg-white/60 hover:bg-white hover:scale-105 hover:shadow-lg dark:border-white/10 dark:bg-zinc-900/50 dark:hover:bg-zinc-800",
                isDisabled && "cursor-not-allowed opacity-40 hover:scale-100 hover:shadow-none"
              )}
            >
              <div className="relative text-3xl">{deco.svg}</div>
              <span className={cn("text-[10px] font-medium tracking-wide uppercase", isSelected ? "text-emerald-700 dark:text-emerald-400" : "text-stone-500")}>
                {deco.label}
              </span>
              
              {isSelected && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white shadow-sm"
                >
                  <Check className="h-3 w-3" />
                </motion.div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
