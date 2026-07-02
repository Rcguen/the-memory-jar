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
        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
          Decorations (Optional)
        </label>
        <span className="text-xs text-zinc-500">
          {selectedDecorations.length}/4 selected
        </span>
      </div>
      
      <div className="flex flex-wrap gap-3">
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
                "relative flex flex-col items-center justify-center p-3 rounded-xl transition-all outline-none",
                "border-2 hover:bg-zinc-50 dark:hover:bg-zinc-900 focus-visible:ring-2 focus-visible:ring-emerald-500",
                isSelected 
                  ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30" 
                  : "border-transparent bg-zinc-100/50 dark:bg-zinc-800/50",
                isDisabled && "opacity-50 cursor-not-allowed"
              )}
            >
              <div className="text-4xl drop-shadow-md group-hover:scale-110 transition-transform">
                {deco.svg}
              </div>
              <span className="text-[10px] font-medium text-zinc-600 dark:text-zinc-400 mt-1">
                {deco.label}
              </span>
              
              {isSelected && (
                <motion.div 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1.5 -right-1.5 bg-emerald-500 text-white rounded-full p-0.5"
                >
                  <Check className="w-3 h-3" />
                </motion.div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
