"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useMemoryModal } from "@/providers/memory-modal-provider";
import { MemoryTypeSelector } from "./MemoryTypeSelector";
import { DynamicMemoryForm, MemoryFormData } from "./DynamicMemoryForm";
import { MemoryType, MemoryThemeType, DecorationID } from "@/types/memory";
import { memoryService } from "@/services/memory";
import { useMemoryDraft } from "@/hooks/useMemoryDraft";
import { usePhysics } from "@/providers/physics-provider";
import { uploadMemoryAttachments } from "@/lib/memory-upload";
import { useIsPhone } from "@/hooks/useIsPhone";

type ModalStep = "select_type" | "form" | "saving_animation";

export function MemoryModal() {
  const { isOpen, closeModal } = useMemoryModal();
  const { clearDraft } = useMemoryDraft();
  const { dropMemory } = usePhysics();
  const [step, setStep] = useState<ModalStep>("select_type");
  const [selectedType, setSelectedType] = useState<MemoryType | null>(null);
  const isPhone = useIsPhone();

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  const handleSelectType = (type: MemoryType) => {
    setSelectedType(type);
    setStep("form");
  };

  const handleCancel = () => {
    setStep("select_type");
    setSelectedType(null);
    closeModal();
  };

  const handleSave = async (data: MemoryFormData, files: File[]) => {
    if (!selectedType) return;
    
    // Save to database
    const memory = await memoryService.saveMemory({
      type: selectedType,
      title: data.title,
      content: data.content,
      mood_id: data.mood_id,
      memory_date: data.memory_date,
      unlock_at: data.unlock_at || null,
      is_collaborative: data.is_collaborative,
      theme: data.theme as MemoryThemeType,
      decorations: data.decorations as DecorationID[],
      paper_style: "letter",
      status: data.is_collaborative ? 'pending_partner' : 'sealed',
      capsule_style: data.unlock_at ? ['vintage_parcel', 'ribbon_box', 'wax_capsule', 'glass_capsule', 'wooden_box', 'silk_envelope'][Math.floor(Math.random() * 6)] as import("@/types/memory").CapsuleStyle : null,
    });

    await uploadMemoryAttachments(memory.id, files);

    clearDraft();
    setStep("saving_animation");

    // Wait for the cinematic animation to complete before dropping into physics engine
    setTimeout(() => {
      // Trigger the physical drop if it's not pending partner
      if (memory.status !== 'pending_partner') {
        dropMemory(memory.id, selectedType, {
          status: memory.status as import("@/lib/physics/EngineCore").NormalizedVisualState["status"],
          capsuleStyle: memory.capsule_style,
          unlockAt: memory.unlock_at,
          isCollaborative: memory.is_collaborative,
        });
      }
      
      handleCancel();
      toast.success(
        memory.status === 'pending_partner' 
          ? "Waiting for your partner at the writing desk." 
          : "Your memory has found its home.", 
        {
          className: "font-cormorant text-lg bg-zinc-900 text-white border-zinc-800",
          duration: 3000,
        }
      );
      // Dispatch a custom event to tell the GlassJar to glow
      window.dispatchEvent(new CustomEvent("memory-saved", { detail: { memory } }));
    }, 1500); // 1.5 seconds to match the snappier animation
  };

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <motion.div
          key="memory-modal-shell"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-auto"
        >
          {/* Background Darken & Blur */}
          <motion.div
            initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
            animate={{ opacity: 1, backdropFilter: "blur(12px)" }}
            exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0 bg-black/40 dark:bg-black/60 pointer-events-none"
          />

          {/* Modal Content Container */}
          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.985, filter: "blur(6px)" }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: 18, scale: 0.985, filter: "blur(8px)" }}
            transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
            className={isPhone ? "relative z-10 flex h-full w-full overflow-y-auto custom-scrollbar p-0" : "relative z-10 flex h-full w-full overflow-y-auto custom-scrollbar p-3 sm:p-8"}
          >
            <AnimatePresence mode="wait">
              {step === "select_type" && (
                <MemoryTypeSelector key="select_type" onSelect={handleSelectType} onCancel={handleCancel} />
              )}

              {step === "form" && selectedType && (
                <motion.div
                  key="form"
                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 20 }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className={isPhone ? "m-auto min-h-full w-full rounded-none border-y border-white/30 bg-white/92 p-4 pb-0 shadow-2xl backdrop-blur-2xl dark:border-zinc-800/40 dark:bg-zinc-950/92" : "m-auto w-full max-w-2xl rounded-[2rem] border border-white/40 bg-white/85 p-5 shadow-2xl backdrop-blur-2xl dark:border-zinc-800/50 dark:bg-zinc-950/85 md:p-10"}
                >
                  <DynamicMemoryForm 
                    type={selectedType} 
                    onSave={handleSave} 
                    onCancel={handleCancel} 
                  />
                </motion.div>
              )}

              {step === "saving_animation" && (
                <motion.div
                  key="saving_animation"
                  className="absolute inset-0 flex items-center justify-center pointer-events-none"
                >
                  {/* The Cinematic Fold, Shrink, and Move Animation */}
                  <motion.div
                    initial={{ opacity: 1, scale: 1, rotateX: 0, rotateY: 0 }}
                    animate={{
                      scale: [1, 0.8, 0.4, 0],
                      rotateX: [0, 45, 180, 180], // Folding effect
                      rotateZ: [0, -10, 45, 90],
                      y: [0, -20, 150, 300], // Moves down towards the jar
                      opacity: [1, 1, 0.8, 0],
                    }}
                    transition={{
                      duration: 1.5,
                      times: [0, 0.4, 0.8, 1],
                      ease: "backIn",
                    }}
                    className="w-64 h-80 bg-[#fdfbf7] rounded-md shadow-2xl relative overflow-hidden"
                  >
                    {/* Ribbon wrap simulation appearing mid-animation */}
                    <motion.div
                      initial={{ scaleX: 0, opacity: 0 }}
                      animate={{ scaleX: 1, opacity: 1 }}
                      transition={{ delay: 0.3, duration: 0.3 }}
                      className="absolute top-1/2 left-0 right-0 h-4 bg-rose-600/80 -translate-y-1/2"
                    />
                    <motion.div
                      initial={{ scaleY: 0, opacity: 0 }}
                      animate={{ scaleY: 1, opacity: 1 }}
                      transition={{ delay: 0.4, duration: 0.3 }}
                      className="absolute top-0 bottom-0 left-1/2 w-4 bg-rose-600/80 -translate-x-1/2"
                    />
                    {/* Wax seal */}
                    <motion.div
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.6, duration: 0.3, type: "spring", bounce: 0.6 }}
                      className="absolute top-1/2 left-1/2 w-12 h-12 bg-red-700 rounded-full -translate-x-1/2 -translate-y-1/2 shadow-inner flex items-center justify-center border-2 border-red-800/50"
                    >
                      <div className="w-8 h-8 rounded-full border border-red-800/30 opacity-50" />
                    </motion.div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
