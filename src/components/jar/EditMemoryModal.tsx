import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { MemoryTypeSelector } from "./MemoryTypeSelector";
import { DynamicMemoryForm, MemoryFormData } from "./DynamicMemoryForm";
import { Memory, MemoryType, MemoryThemeType, DecorationID } from "@/types/memory";
import { memoryService } from "@/services/memory";
import { useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";

interface EditMemoryModalProps {
  memory: Memory;
  onClose: () => void;
}

export function EditMemoryModal({ memory, onClose }: EditMemoryModalProps) {
  const queryClient = useQueryClient();
  const [existingAttachments, setExistingAttachments] = useState(memory.attachments || []);
  const [removedAttachmentIds, setRemovedAttachmentIds] = useState<string[]>([]);
  
  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  const handleRemoveExisting = (id: string) => {
    setExistingAttachments(prev => prev.filter(a => a.id !== id));
    setRemovedAttachmentIds(prev => [...prev, id]);
  };

  const handleSave = async (data: MemoryFormData, files: File[]) => {
    try {
      // 1. Update memory
      await memoryService.updateMemory(memory.id, {
        title: data.title,
        content: data.content,
        mood_id: data.mood_id,
        memory_date: data.memory_date,
        unlock_at: data.unlock_at || null,
        is_collaborative: data.is_collaborative,
        theme: data.theme as MemoryThemeType,
        decorations: data.decorations as DecorationID[],
      });

      // 2. Remove deleted attachments
      // Wait, memoryService needs a deleteAttachment helper or we can just delete from Supabase directly
      // I'll assume we can create it or just do it. Let's do it directly here using createClient if needed, 
      // but it's better to add a helper in memoryService.
      for (const attId of removedAttachmentIds) {
        // Ideally: await memoryService.deleteAttachment(attId);
        // We will implement this in memoryService shortly
        await memoryService.deleteAttachment(attId);
      }

      // 3. Upload new files
      if (files.length > 0) {
        let fileIndex = existingAttachments.length;
        for (const file of files) {
          let bucket: "memory-images" | "memory-voices" | "memory-videos" = "memory-images";
          let attachType: "photo" | "voice" | "video" = "photo";

          if (file.type.startsWith("video/")) { bucket = "memory-videos"; attachType = "video"; }
          else if (file.type.startsWith("audio/")) { bucket = "memory-voices"; attachType = "voice"; }

          const path = await memoryService.uploadAttachment(file, memory.id, bucket, fileIndex + 1);
          await memoryService.linkAttachmentToMemory(memory.id, attachType, path);
          fileIndex++;
        }
      }

      // Invalidate queries to reflect changes instantly
      queryClient.invalidateQueries({ queryKey: ['memory', memory.id] });
      queryClient.invalidateQueries({ queryKey: ['memories'] });
      
      toast.success("Memory updated successfully", {
        className: "font-cormorant text-lg bg-zinc-900 text-white border-zinc-800"
      });
      onClose();
    } catch (error: any) {
      console.error("Failed to edit memory:", error);
      toast.error(error.message || "Failed to update memory");
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
