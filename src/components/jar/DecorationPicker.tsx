"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Bandage, Check, Circle, Coffee, Flower2, Heart, Leaf, Ribbon, Sparkles, Stamp } from "lucide-react";
import { DECORATIONS } from "@/lib/memoryThemes";
import { DecorationID } from "@/types/memory";

const DECORATION_ICONS: Record<DecorationID, typeof Heart> = {
  rose: Flower2,
  heart: Heart,
  stamp: Stamp,
  wax_seal: Circle,
  flower: Flower2,
  butterfly: Sparkles,
  sparkle: Sparkles,
  ribbon: Ribbon,
  postmark: Circle,
  polaroid_tape: Bandage,
  leaf: Leaf,
  coffee_stain: Coffee,
};

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
        <label className="font-inter text-xs font-medium text-[var(--text-secondary)]">Decorations <span className="font-normal text-[var(--text-tertiary)]">Optional</span></label>
        <span className="text-xs tabular-nums text-[var(--text-tertiary)]">
          {selectedDecorations.length}/4 selected
        </span>
      </div>
      
      <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
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
                "relative flex min-h-20 w-full flex-col items-center justify-center gap-2 rounded-xl border p-2 transition-[border-color,background-color,transform] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-color)]",
                isSelected
                  ? "border-[var(--accent-primary)] bg-[var(--accent-soft)]"
                  : "border-[var(--divider)] bg-[var(--surface-base)] hover:border-[var(--accent-primary)] hover:bg-[var(--surface-raised)]",
                isDisabled && "cursor-not-allowed opacity-40"
              )}
            >
              <div className={cn("relative", isSelected ? "text-[var(--accent-primary)]" : "text-[var(--text-secondary)]")}>
                {(() => {
                  const Icon = DECORATION_ICONS[deco.id];
                  return <Icon className="h-5 w-5" strokeWidth={1.7} aria-hidden="true" />;
                })()}
              </div>
              <span className={cn("text-[11px] font-medium", isSelected ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)]")}>
                {deco.label}
              </span>
              
              {isSelected && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--accent-primary)] text-white"
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
