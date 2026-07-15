"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
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
import { notifyPushEvent } from "@/lib/push/client-events";

type ModalStep = "select_type" | "form" | "saving_animation";

const MAX_PRESENTATION_DELAY_MS = 300;
const isDevelopment = process.env.NODE_ENV === "development";

function elapsedMs(startedAt: number): number {
  return Math.round((performance.now() - startedAt) * 10) / 10;
}

export function MemoryModal() {
  const { isOpen, closeModal } = useMemoryModal();
  const { clearDraft } = useMemoryDraft();
  const { dropMemory, pausePhysics, resumePhysics } = usePhysics();
  const [step, setStep] = useState<ModalStep>("select_type");
  const [selectedType, setSelectedType] = useState<MemoryType | null>(null);
  const saveInFlightRef = useRef(false);
  const isPhone = useIsPhone();
  const shouldReduceMotion = useReducedMotion();

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

  useEffect(() => {
    if (!isOpen) return;

    pausePhysics("memory-modal");
    return () => resumePhysics("memory-modal");
  }, [isOpen, pausePhysics, resumePhysics]);

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
    if (!selectedType || saveInFlightRef.current) return;
    saveInFlightRef.current = true;

    try {
    const submissionStartedAt = isDevelopment ? performance.now() : 0;
    let memorySaveMs = 0;
    let uploadPipelineMs = 0;
    let draftClearMs = 0;
    const submittedFiles = files.length;

    // Save to database
    const memorySaveStartedAt = isDevelopment ? performance.now() : 0;
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
    if (isDevelopment) {
      memorySaveMs = elapsedMs(memorySaveStartedAt);
    }

    const uploadStartedAt = isDevelopment ? performance.now() : 0;
    await uploadMemoryAttachments(memory.id, files, 0, memory.relationship_id);
    if (isDevelopment) {
      uploadPipelineMs = elapsedMs(uploadStartedAt);
    }

    if (isDevelopment) {
      const pushStartedAt = performance.now();
      void notifyPushEvent("partner_created_memory", memory.id).then(
        () => {
          console.debug("[memory-submit] push notification timing", {
            pushNotificationMs: elapsedMs(pushStartedAt),
          });
        },
        () => {
          console.debug("[memory-submit] push notification timing", {
            pushNotificationMs: elapsedMs(pushStartedAt),
          });
        },
      );
    } else {
      notifyPushEvent("partner_created_memory", memory.id);
    }

    const draftClearStartedAt = isDevelopment ? performance.now() : 0;
    clearDraft();
    if (isDevelopment) {
      draftClearMs = elapsedMs(draftClearStartedAt);
    }

    setStep("saving_animation");
    const presentationStartedAt = isDevelopment ? performance.now() : 0;
    const presentationDelayMs = shouldReduceMotion ? 0 : MAX_PRESENTATION_DELAY_MS;

    // Keep the existing visual handoff brief, then drop, close, and confirm.
    setTimeout(() => {
      let physicsDropMs = 0;
      if (memory.status !== 'pending_partner') {
        const physicsDropStartedAt = isDevelopment ? performance.now() : 0;
        dropMemory(memory.id, selectedType, {
          status: memory.status as import("@/lib/physics/EngineCore").NormalizedVisualState["status"],
          capsuleStyle: memory.capsule_style,
          unlockAt: memory.unlock_at,
          isCollaborative: memory.is_collaborative,
        });
        if (isDevelopment) {
          physicsDropMs = elapsedMs(physicsDropStartedAt);
        }
      }

      const modalCloseStartedAt = isDevelopment ? performance.now() : 0;
      handleCancel();
      const modalCloseMs = isDevelopment ? elapsedMs(modalCloseStartedAt) : 0;
      saveInFlightRef.current = false;
      if (isDevelopment) {
        console.debug("[memory-submit] completion timing", {
          totalSubmissionMs: elapsedMs(submissionStartedAt),
          memorySaveMs,
          uploadPipelineMs,
          submittedFiles,
          draftClearMs,
          presentationDelayTargetMs: presentationDelayMs,
          presentationDelayMs: elapsedMs(presentationStartedAt),
          physicsDropMs,
          modalCloseMs,
        });
      }

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
    }, presentationDelayMs);
    } catch (error) {
      saveInFlightRef.current = false;
      throw error;
    }
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
          role="dialog"
          aria-modal="true"
          aria-label="Create a Memory"
        >
          {/* Background Wash */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="absolute inset-0 bg-stone-900/80 dark:bg-black/85 pointer-events-none"
          />

          {/* Modal Content Container */}
          <motion.div
            initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 18, scale: shouldReduceMotion ? 1 : 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: shouldReduceMotion ? 0 : 18, scale: shouldReduceMotion ? 1 : 0.985 }}
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
                  initial={{ opacity: 0, scale: shouldReduceMotion ? 1 : 0.95, y: shouldReduceMotion ? 0 : 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: shouldReduceMotion ? 1 : 0.95, y: shouldReduceMotion ? 0 : 20 }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                  className={isPhone ? "m-auto min-h-full w-full rounded-none bg-[var(--surface-paper)] p-4 pb-0 shadow-2xl dark:bg-[var(--surface-paper)]" : "m-auto w-full max-w-2xl rounded-3xl border border-[rgba(58,49,39,0.08)] bg-[var(--surface-paper)] p-5 shadow-[var(--shadow-modal)] dark:border-white/5 dark:bg-[var(--surface-paper)] md:p-10"}
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
                    initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, scale: 1, rotateX: 0, rotateY: 0 }}
                    animate={
                      shouldReduceMotion
                        ? { opacity: [1, 1, 0.5, 0] }
                        : {
                            scale: [1, 0.8, 0.4, 0],
                            rotateX: [0, 45, 180, 180],
                            rotateZ: [0, -10, 45, 90],
                            y: [0, -20, 150, 300],
                            opacity: [1, 1, 0.8, 0],
                          }
                    }
                    transition={{
                      duration: 1.5,
                      times: [0, 0.4, 0.8, 1],
                      ease: shouldReduceMotion ? "easeInOut" : "backIn",
                    }}
                    className="w-64 h-80 bg-[var(--surface-paper)] rounded-md shadow-[var(--shadow-floating)] relative overflow-hidden border border-[rgba(58,49,39,0.1)] flex items-center justify-center"
                    role="status"
                    aria-live="polite"
                  >
                    <span className="sr-only">Carefully placing your memory into the jar</span>
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
