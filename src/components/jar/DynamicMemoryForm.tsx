"use client";

import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import type { FieldErrors } from "react-hook-form";
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
import { VoiceRecorder } from "./VoiceRecorder";
import { MEMORY_THEMES, DECORATIONS } from "@/lib/memoryThemes";
import { MemoryThemeType, DecorationID } from "@/types/memory";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useIsPhone } from "@/hooks/useIsPhone";
import { X } from "lucide-react";

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

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "object" && error) {
    const candidate = error as {
      message?: unknown;
      error_description?: unknown;
      details?: unknown;
    };
    if (typeof candidate.message === "string" && candidate.message) return candidate.message;
    if (typeof candidate.error_description === "string" && candidate.error_description) return candidate.error_description;
    if (typeof candidate.details === "string" && candidate.details) return candidate.details;
  }
  return "Failed to save memory";
}

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
  const { draft, saveDraft, flushDraft, isDraftSaved, isLoaded } = useMemoryDraft();
  const [files, setFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isPhone = useIsPhone();
  const renderCountRef = useRef(0);
  renderCountRef.current += 1;

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
      flushDraft();
      await onSave(data, files);
    } catch (error: unknown) {
      console.error("Save Memory Error:", error);
      toast.error(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const onInvalid = (errors: FieldErrors<MemoryFormData>) => {
    console.error("Form Validation Errors:", errors);
    toast.error("Please fill out all required fields.");
  };

  const handleCancel = () => {
    flushDraft();
    onCancel();
  };

  useEffect(() => {
    if (process.env.NODE_ENV === "development" && isDraftSaved && draft?.type === type) {
      console.debug("[memory-form] draft render snapshot", {
        renderCount: renderCountRef.current,
      });
    }
  }, [draft, isDraftSaved, type]);
  // Determine which fields to show based on type
  const showContent = ["letter", "promise", "wish", "gratitude", "random_thought", "travel"].includes(type);
  const showPhotos = ["photo", "travel"].includes(type);
  const showVoice = type === "voice";
  const showVideo = type === "video";

  return (
    <motion.form 
      onSubmit={form.handleSubmit(onSubmit, onInvalid)}
      className="flex w-full max-w-2xl flex-col pb-8 sm:pb-12"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
    >
      {/* Sticky Header with Close Button */}
      <div className={cn(
        "sticky top-0 z-50 flex items-center justify-between border-b border-stone-200/50 bg-[var(--surface-paper)] py-3",
        isPhone ? "pt-[calc(env(safe-area-inset-top)+1rem)] -mx-4 px-4" : "px-2 mb-6"
      )}>
        <div className="flex flex-col" aria-hidden="true">
          <span className="font-inter text-xs font-semibold uppercase tracking-wider text-stone-500">
            {type.replace("_", " ")}
          </span>
          {isLoaded && isDraftSaved && draft && draft.type === type && (
            <span className="font-inter text-[10px] text-stone-400">Draft saved locally</span>
          )}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={handleCancel}
          disabled={isSubmitting}
          className="h-11 w-11 rounded-full text-stone-500 hover:bg-stone-100 hover:text-stone-900 focus-visible:ring-2 focus-visible:ring-rose-500 dark:hover:bg-stone-800 dark:hover:text-stone-100"
          aria-label="Close memory form"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      <div className={cn("flex flex-col gap-6", isPhone ? "px-0 pt-4" : "px-2")}>
        {/* Title Field */}
        <div className="space-y-1">
          <Label htmlFor="title" className="sr-only">Title</Label>
          <Input 
            id="title"
            {...form.register("title")} 
            placeholder="Give this memory a title..." 
            className="h-auto rounded-none border-b border-transparent bg-transparent px-2 py-3 font-cormorant text-3xl font-medium leading-tight text-stone-900 shadow-none transition-colors placeholder:text-stone-400 hover:border-stone-200 focus-visible:border-rose-300 focus-visible:bg-stone-50/50 focus-visible:ring-0 dark:text-stone-100 dark:placeholder:text-stone-600 dark:hover:border-stone-800 dark:focus-visible:bg-stone-900/50"
          />
          {form.formState.errors.title && (
            <p className="text-red-500 text-xs mt-1 px-2">{form.formState.errors.title.message}</p>
          )}
        </div>

        {/* Content Field */}
        {showContent && (
          <div className="space-y-4">
            <Label htmlFor="content" className="sr-only">Letter Content</Label>
            <Textarea 
              id="content"
              {...form.register("content")} 
              placeholder="Pour your heart out here..." 
              className="min-h-[140px] max-h-[50vh] resize-y rounded-xl border border-stone-200 bg-stone-50/50 px-4 py-4 font-inter text-base leading-7 text-stone-800 transition-colors focus-visible:border-rose-300 focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-rose-500/20 dark:border-stone-800 dark:bg-stone-900/50 dark:text-stone-200 dark:focus-visible:bg-stone-950 sm:min-h-[220px]"
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
          <div className="space-y-3">
            <VoiceRecorder
              disabled={isSubmitting}
              onRecordingReady={(file) => setFiles((current) => [
                ...current.filter((item) => !item.type.startsWith("audio/")),
                file,
              ])}
            />
            <AttachmentUploader 
              accept="audio/*" 
              maxFiles={1}
              files={files} 
              onChange={setFiles} 
              label="Upload Existing Recording"
              existingAttachments={existingAttachments.filter(a => a.file_type === 'voice')}
              onRemoveExisting={onRemoveAttachment}
            />
          </div>
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
        <div className={cn("flex items-center justify-between pt-2 border-t border-stone-100 dark:border-stone-800/50 mt-4", isPhone && "flex-col gap-4 items-start")}>
          <div className={cn("flex w-1/2 flex-col gap-1.5 pr-2", isPhone && "w-full pr-0")}>
            <label htmlFor="memory_date" className="font-inter text-[11px] font-semibold uppercase tracking-wider text-stone-500">Date</label>
            <Input 
              id="memory_date"
              type="date" 
              {...form.register("memory_date")} 
              className="h-11 rounded-lg border-stone-200 bg-stone-50/50 px-3 font-inter text-sm shadow-none transition-colors focus-visible:border-rose-300 focus-visible:ring-2 focus-visible:ring-rose-500/20 dark:border-stone-800 dark:bg-stone-900/50"
            />
          </div>
          
          <div className={cn("flex w-1/2 flex-col gap-1.5 pl-4 sm:border-l sm:border-stone-200 sm:dark:border-stone-800", isPhone && "w-full pl-0")}>
            <label className="font-inter text-[11px] font-semibold uppercase tracking-wider text-stone-500">Time Capsule</label>
            <TimeCapsulePicker 
              value={form.watch("unlock_at") ?? undefined} 
              onChange={(val) => form.setValue("unlock_at", val, { shouldValidate: true })} 
            />
          </div>
        </div>

        {/* Seal Together */}
        {form.watch("unlock_at") && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }} 
            animate={{ opacity: 1, height: 'auto' }} 
            className="mt-2 flex items-center justify-between rounded-xl border border-rose-100 bg-rose-50/50 p-4 dark:border-rose-900/30 dark:bg-rose-950/20"
          >
            <div className="flex flex-col gap-1">
              <Label htmlFor="seal-together" className="font-inter text-sm font-medium text-rose-900 dark:text-rose-300">Seal Together</Label>
              <p className="font-inter text-xs leading-relaxed text-rose-700/70 dark:text-rose-400/70">Wait for your partner to add their message before sealing.</p>
            </div>
            <button
              id="seal-together"
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
      <div className={cn(
        "mt-8 flex items-center justify-end",
        isPhone ? "sticky bottom-0 z-50 -mx-4 border-t border-stone-200/50 bg-[var(--surface-paper)] px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-3 shadow-[0_-4px_12px_rgba(0,0,0,0.02)] dark:border-stone-800/50" : "border-t border-stone-100 pt-6 dark:border-stone-800/50"
      )}>
        <Button 
          type="submit" 
          disabled={isSubmitting}
          className="min-h-[44px] w-full rounded-full bg-rose-600 px-8 font-inter font-medium text-white shadow-sm transition-colors hover:bg-rose-700 focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2 motion-reduce:transition-none sm:w-auto"
        >
          {isSubmitting ? "Carefully placing your memory..." : "Save Memory"}
        </Button>
      </div>
    </motion.form>
  );
}
