"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { motion } from "framer-motion";
import { MemoryType } from "@/types/memory";
import { useMemoryDraft } from "@/hooks/useMemoryDraft";
import { MoodPicker } from "./MoodPicker";
import { AttachmentUploader } from "./AttachmentUploader";
import { TimeCapsulePicker } from "./TimeCapsulePicker";
import { ThemePicker } from "./ThemePicker";
import { DecorationPicker } from "./DecorationPicker";
import { MEMORY_THEMES, DECORATIONS } from "@/lib/memoryThemes";
import { MemoryThemeType, DecorationID } from "@/types/memory";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const validThemes = Object.keys(MEMORY_THEMES) as [MemoryThemeType, ...MemoryThemeType[]];
const validDecorations = DECORATIONS.map(d => d.id) as [DecorationID, ...DecorationID[]];

// The unified Zod schema for all memory types
const memorySchema = z.object({
  title: z.string().min(1, "Title is required").max(100),
  content: z.string().optional(),
  mood_id: z.string().min(1, "Please select a mood"),
  memory_date: z.string(), // ISO string
  unlock_at: z.string().nullable().optional(),
  is_collaborative: z.boolean(),
  theme: z.enum(validThemes),
  decorations: z.array(z.enum(validDecorations)).max(4, "Maximum 4 decorations allowed"),
});

export type MemoryFormData = z.infer<typeof memorySchema>;

interface DynamicMemoryFormProps {
  type: MemoryType;
  onSave: (data: MemoryFormData, files: File[]) => Promise<void>;
  onCancel: () => void;
  initialData?: Partial<MemoryFormData>;
  isEditing?: boolean;
  existingAttachments?: import("@/types/memory").MemoryAttachment[];
  onRemoveAttachment?: (id: string) => void;
}

export function DynamicMemoryForm({ 
  type, 
  onSave, 
  onCancel,
  initialData,
  isEditing = false,
  existingAttachments = [],
  onRemoveAttachment
}: DynamicMemoryFormProps) {
  const { draft, saveDraft, isLoaded } = useMemoryDraft();
  const [files, setFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<MemoryFormData>({
    resolver: zodResolver(memorySchema),
    defaultValues: {
      title: initialData?.title || "",
      content: initialData?.content || "",
      mood_id: initialData?.mood_id || "",
      memory_date: initialData?.memory_date ? initialData.memory_date.split("T")[0] : new Date().toISOString().split("T")[0],
      unlock_at: initialData?.unlock_at || undefined,
      is_collaborative: initialData?.is_collaborative || false,
      theme: initialData?.theme || "modern",
      decorations: initialData?.decorations || [],
    },
  });

  // Restore draft if exists and matches type (only if not editing)
  useEffect(() => {
    if (!isEditing && isLoaded && draft && draft.type === type) {
      form.reset({
        title: draft.title || "",
        content: draft.content || "",
        mood_id: draft.mood_id || "",
        memory_date: draft.memory_date || new Date().toISOString().split("T")[0],
        unlock_at: draft.unlock_at,
        is_collaborative: draft.is_collaborative || false,
        theme: (draft.theme as MemoryThemeType) || "modern",
        decorations: (draft.decorations as DecorationID[]) || [],
      });
    }
  }, [isLoaded, draft, type, form, isEditing]);

  // Auto-save draft on changes (only if not editing)
  useEffect(() => {
    if (isEditing) return;
    
    // eslint-disable-next-line react-hooks/incompatible-library
    const subscription = form.watch((value) => {
      saveDraft({ ...value, type } as unknown as import("@/hooks/useMemoryDraft").DraftState);
    });
    return () => subscription.unsubscribe();
  }, [form, saveDraft, type, isEditing]);

  const onSubmit = async (data: MemoryFormData) => {
    try {
      setIsSubmitting(true);
      await onSave(data, files);
    } catch (error: any) {
      console.error("Save Memory Error:", error);
      toast.error(error.message || error.error_description || error.details || "Failed to save memory");
    } finally {
      setIsSubmitting(false);
    }
  };

  const onInvalid = (errors: any) => {
    console.error("Form Validation Errors:", errors);
    toast.error("Please fill out all required fields.");
  };

  // Determine which fields to show based on type
  const showContent = ["letter", "promise", "wish", "gratitude", "random_thought", "travel"].includes(type);
  const showPhotos = ["photo", "travel"].includes(type);
  const showVoice = type === "voice";
  const showVideo = type === "video";

  return (
    <motion.form 
      onSubmit={form.handleSubmit(onSubmit, onInvalid)}
      layout
      className="flex flex-col gap-6 w-full max-w-2xl mx-auto pb-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
    >
      <div className="space-y-4">
        {/* Title Field */}
        <div>
          <Input 
            {...form.register("title")} 
            placeholder="Give this memory a title..." 
            className="text-2xl md:text-3xl font-cormorant border-none shadow-none focus-visible:ring-0 px-0 h-auto bg-transparent placeholder:text-zinc-400"
          />
          {form.formState.errors.title && (
            <p className="text-red-500 text-xs mt-1 px-2">{form.formState.errors.title.message}</p>
          )}
        </div>

        {/* Content Field */}
        {showContent && (
          <div className="space-y-6">
            <Textarea 
              {...form.register("content")} 
              placeholder="Pour your heart out here..." 
              className="min-h-[150px] resize-none font-inter border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 rounded-xl"
            />
            
            <ThemePicker 
              selectedTheme={form.watch("theme")} 
              onChange={(theme) => form.setValue("theme", theme, { shouldValidate: true })} 
            />
            
            <DecorationPicker 
              selectedDecorations={form.watch("decorations") as DecorationID[]} 
              onChange={(decorations) => form.setValue("decorations", decorations, { shouldValidate: true })} 
            />
          </div>
        )}

        {/* Attachments */}
        {showPhotos && (
          <AttachmentUploader 
            accept="image/*" 
            files={files} 
            onChange={setFiles} 
            label="Upload Photos"
            existingAttachments={existingAttachments.filter(a => a.file_type === 'photo')}
            onRemoveExisting={onRemoveAttachment}
          />
        )}
        
        {showVoice && (
          <AttachmentUploader 
            accept="audio/*" 
            maxFiles={1}
            files={files} 
            onChange={setFiles} 
            label="Upload Voice Recording"
            existingAttachments={existingAttachments.filter(a => a.file_type === 'voice')}
            onRemoveExisting={onRemoveAttachment}
          />
        )}

        {showVideo && (
          <AttachmentUploader 
            accept="video/*" 
            maxFiles={1}
            files={files} 
            onChange={setFiles} 
            label="Upload Video"
            existingAttachments={existingAttachments.filter(a => a.file_type === 'video')}
            onRemoveExisting={onRemoveAttachment}
          />
        )}

        {/* Mood Picker */}
        <div className="pt-4">
          <MoodPicker 
            selectedMoodId={form.watch("mood_id")} 
            onSelect={(mood) => form.setValue("mood_id", mood, { shouldValidate: true })} 
          />
          {form.formState.errors.mood_id && (
            <p className="text-red-500 text-xs mt-1 px-2">{form.formState.errors.mood_id.message}</p>
          )}
        </div>

        {/* Date */}
        <div className="pt-2 flex items-center justify-between">
          <div className="flex flex-col gap-1 w-1/2 pr-2">
            <label className="text-xs text-zinc-500 px-2 uppercase tracking-wider font-semibold">Date</label>
            <Input 
              type="date" 
              {...form.register("memory_date")} 
              className="bg-transparent border-none shadow-none font-inter text-sm"
            />
          </div>
          
          
          <div className="flex flex-col gap-1 w-1/2 pl-2 border-l border-zinc-200 dark:border-zinc-800">
            <label className="text-xs text-zinc-500 px-2 uppercase tracking-wider font-semibold">Time Capsule</label>
            <TimeCapsulePicker 
              value={form.watch("unlock_at")} 
              onChange={(val) => form.setValue("unlock_at", val, { shouldValidate: true })} 
            />
          </div>
        </div>

        {/* Seal Together */}
        {form.watch("unlock_at") && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }} 
            animate={{ opacity: 1, height: 'auto' }} 
            className="pt-2 flex items-center justify-between bg-rose-50/50 dark:bg-rose-950/20 p-3 rounded-lg border border-rose-100 dark:border-rose-900/30"
          >
            <div className="flex flex-col gap-0.5">
              <Label className="text-sm font-medium text-rose-900 dark:text-rose-300">Seal Together</Label>
              <p className="text-xs text-rose-700/70 dark:text-rose-400/70">Wait for your partner to add their message before sealing.</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={form.watch("is_collaborative")}
              onClick={() => form.setValue("is_collaborative", !form.watch("is_collaborative"))}
              className={cn(
                "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center justify-start rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed disabled:opacity-50",
                form.watch("is_collaborative") ? "bg-rose-600" : "bg-zinc-200 dark:bg-zinc-700"
              )}
            >
              <span
                className={cn(
                  "pointer-events-none block h-4 w-4 rounded-full bg-white shadow-lg ring-0 transition-transform",
                  form.watch("is_collaborative") ? "translate-x-4" : "translate-x-0"
                )}
              />
            </button>
          </motion.div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-6 border-t border-zinc-200 dark:border-zinc-800">
        <Button 
          type="button" 
          variant="ghost" 
          onClick={onCancel}
          disabled={isSubmitting}
          className="text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
        >
          Cancel
        </Button>
        <Button 
          type="submit" 
          disabled={isSubmitting}
          className="bg-rose-600 hover:bg-rose-700 text-white rounded-full px-8 shadow-md transition-all"
        >
          {isSubmitting ? "Carefully placing your memory..." : "Save Memory"}
        </Button>
      </div>
    </motion.form>
  );
}
