import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { DynamicMemoryForm, MemoryFormData } from "./DynamicMemoryForm";
import { CapsuleStyle, DecorationID, Memory, MemoryThemeType } from "@/types/memory";
import { memoryService } from "@/services/memory";
import { useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import { usePhysics } from "@/providers/physics-provider";
import { NormalizedVisualState } from "@/lib/physics/EngineCore";
import { uploadMemoryAttachments } from "@/lib/memory-upload";

interface EditMemoryModalProps {
  memory: Memory;
  onClose: () => void;
}

const CAPSULE_STYLES: CapsuleStyle[] = [
  "vintage_parcel",
  "ribbon_box",
  "wax_capsule",
  "glass_capsule",
  "wooden_box",
  "silk_envelope",
];

function randomCapsuleStyle(): CapsuleStyle {
  return CAPSULE_STYLES[Math.floor(Math.random() * CAPSULE_STYLES.length)];
}

export function EditMemoryModal({ memory, onClose }: EditMemoryModalProps) {
  const queryClient = useQueryClient();
  const { updateMemoryMeta } = usePhysics();
  const [existingAttachments, setExistingAttachments] = useState(memory.attachments || []);
  const [removedAttachmentIds, setRemovedAttachmentIds] = useState<string[]>([]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  const handleRemoveExisting = (id: string) => {
    setExistingAttachments((prev) => prev.filter((a) => a.id !== id));
    setRemovedAttachmentIds((prev) => [...prev, id]);
  };

  const handleSave = async (data: MemoryFormData, files: File[]) => {
    try {
      const hasUnlockAt = !!data.unlock_at;
      const isFutureUnlock = hasUnlockAt && new Date(data.unlock_at!).getTime() > Date.now();

      let newStatus = memory.status;
      if (!hasUnlockAt) {
        newStatus = "unlocked";
      } else if (isFutureUnlock && (memory.status === "unlocked" || memory.status === "opening")) {
        newStatus = "sealed";
      }

      let newCapsuleStyle = memory.capsule_style;
      if (hasUnlockAt && !memory.capsule_style) {
        newCapsuleStyle = randomCapsuleStyle();
      } else if (!hasUnlockAt) {
        newCapsuleStyle = null;
      }

      await memoryService.updateMemory(memory.id, {
        title: data.title,
        content: data.content,
        mood_id: data.mood_id,
        memory_date: data.memory_date,
        unlock_at: data.unlock_at || null,
        is_collaborative: data.is_collaborative,
        theme: data.theme as MemoryThemeType,
        decorations: data.decorations as DecorationID[],
        status: newStatus,
        capsule_style: newCapsuleStyle,
      });

      for (const attId of removedAttachmentIds) {
        await memoryService.deleteAttachment(attId);
      }

      await uploadMemoryAttachments(memory.id, files, existingAttachments.length);

      const updatedMemory = await memoryService.getMemoryById(memory.id);
      if (updatedMemory) {
        queryClient.setQueryData(["memory", memory.id], updatedMemory);
        updateMemoryMeta(memory.id, {
          status: updatedMemory.status as NormalizedVisualState["status"],
          capsuleStyle: updatedMemory.capsule_style,
          unlockAt: updatedMemory.unlock_at,
          isCollaborative: updatedMemory.is_collaborative,
        });
      }
      queryClient.invalidateQueries({ queryKey: ["memories"] });

      toast.success("Memory updated successfully", {
        className: "font-cormorant text-lg bg-zinc-900 text-white border-zinc-800"
      });
      onClose();
    } catch (error: unknown) {
      console.error("Failed to edit memory:", error);
      toast.error(error instanceof Error ? error.message : "Failed to update memory");
    }
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="w-full max-w-2xl bg-white dark:bg-zinc-950 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center bg-zinc-50 dark:bg-zinc-900/50">
          <h2 className="text-xl font-semibold font-cormorant text-zinc-800 dark:text-zinc-100">
            Edit Memory
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-500 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar">
          <DynamicMemoryForm
            type={memory.type}
            onSave={handleSave}
            onCancel={onClose}
            initialData={memory as Partial<MemoryFormData>}
            isEditing={true}
            existingAttachments={existingAttachments}
            onRemoveAttachment={handleRemoveExisting}
          />
        </div>
      </motion.div>
    </div>
  );
}
