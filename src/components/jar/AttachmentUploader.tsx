"use client";

import { useState, useRef } from "react";
import { UploadCloud, X, FileAudio, FileVideo, Image as ImageIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

import { MemoryAttachment } from "@/types/memory";

interface AttachmentUploaderProps {
  accept: string;
  maxFiles?: number;
  files: File[];
  onChange: (files: File[]) => void;
  existingAttachments?: MemoryAttachment[];
  onRemoveExisting?: (id: string) => void;
  label?: string;
}

export function AttachmentUploader({ 
  accept, 
  maxFiles = 5, 
  files, 
  onChange,
  existingAttachments = [],
  onRemoveExisting,
  label = "Add Attachments"
}: AttachmentUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(Array.from(e.target.files));
    }
    // Reset input so the same file can be selected again if removed
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const addFiles = (newFiles: File[]) => {
    const validFiles: File[] = [];

    for (const file of newFiles) {
      // Validate Mime Types and Sizes
      const isImage = file.type.startsWith("image/");
      const isAudio = file.type.startsWith("audio/");
      const isVideo = file.type.startsWith("video/");

      const MB = 1024 * 1024;
      const MAX_IMAGE_MB = 10;
      const MAX_AUDIO_MB = 25;
      const MAX_VIDEO_MB = 100;

      if (isImage && file.size > MAX_IMAGE_MB * MB) {
        toast.error(`Image "${file.name}" exceeds ${MAX_IMAGE_MB}MB limit.`);
        continue;
      }
      if (isAudio && file.size > MAX_AUDIO_MB * MB) {
        toast.error(`Audio "${file.name}" exceeds ${MAX_AUDIO_MB}MB limit.`);
        continue;
      }
      if (isVideo && file.size > MAX_VIDEO_MB * MB) {
        toast.error(`Video "${file.name}" exceeds ${MAX_VIDEO_MB}MB limit.`);
        continue;
      }
      if (!isImage && !isAudio && !isVideo) {
        toast.error(`File "${file.name}" has an unsupported format.`);
        continue;
      }

      validFiles.push(file);
    }

    const totalCurrent = files.length + existingAttachments.length;
    const filesToAdd = validFiles.slice(0, maxFiles - totalCurrent);
    
    if (validFiles.length > filesToAdd.length) {
      toast.error(`You can only upload up to ${maxFiles} files max.`);
    }

    onChange([...files, ...filesToAdd]);
  };

  const removeFile = (indexToRemove: number) => {
    onChange(files.filter((_, idx) => idx !== indexToRemove));
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith("image/")) return <ImageIcon className="w-5 h-5 text-rose-500" />;
    if (file.type.startsWith("video/")) return <FileVideo className="w-5 h-5 text-blue-500" />;
    if (file.type.startsWith("audio/")) return <FileAudio className="w-5 h-5 text-amber-500" />;
    return <UploadCloud className="w-5 h-5 text-zinc-500" />;
  };

  return (
    <div className="w-full flex flex-col gap-3">
      <div 
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`w-full relative border-2 border-dashed rounded-xl p-6 md:p-8 flex flex-col items-center justify-center cursor-pointer transition-all duration-300 ${
          isDragging 
            ? "border-rose-400 bg-rose-50 dark:bg-rose-950/20" 
            : "border-zinc-300 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 bg-white/40 dark:bg-zinc-900/40"
        }`}
      >
        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          accept={accept}
          multiple={maxFiles > 1}
          onChange={handleFileChange}
        />
        
        <div className="bg-zinc-100 dark:bg-zinc-800 p-3 rounded-full mb-3">
          <UploadCloud className="w-6 h-6 text-zinc-500 dark:text-zinc-400" />
        </div>
        <p className="font-inter text-sm font-medium text-zinc-700 dark:text-zinc-300 text-center">
          {label}
        </p>
        <p className="font-inter text-xs text-zinc-500 dark:text-zinc-500 mt-1 text-center">
          Drag and drop or click to browse
        </p>
      </div>

      {/* Beautiful Preview Section */}
      <AnimatePresence>
        {(files.length > 0 || existingAttachments.length > 0) && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="flex flex-col gap-2 overflow-hidden"
          >
            {files.map((file, idx) => (
              <motion.div 
                key={`${file.name}-${idx}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="flex items-center justify-between bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-3 pr-2 shadow-sm"
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="bg-zinc-100 dark:bg-zinc-800 p-2 rounded-md shrink-0">
                    {getFileIcon(file)}
                  </div>
                  <div className="flex flex-col overflow-hidden">
                    <span className="font-inter text-sm font-medium text-zinc-800 dark:text-zinc-200 truncate">
                      {file.name}
                    </span>
                    <span className="font-inter text-xs text-zinc-500 dark:text-zinc-500">
                      {(file.size / (1024 * 1024)).toFixed(2)} MB
                    </span>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="shrink-0 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(idx);
                  }}
                >
                  <X className="w-4 h-4" />
                </Button>
              </motion.div>
            ))}
            {/* Existing Attachments */}
            {existingAttachments.map((attachment) => (
              <motion.div 
                key={`existing-${attachment.id}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="flex items-center justify-between bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-3 pr-2 shadow-sm"
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="bg-zinc-100 dark:bg-zinc-800 p-2 rounded-md shrink-0">
                    {attachment.file_type === "photo" && <ImageIcon className="w-5 h-5 text-rose-500" />}
                    {attachment.file_type === "video" && <FileVideo className="w-5 h-5 text-blue-500" />}
                    {attachment.file_type === "voice" && <FileAudio className="w-5 h-5 text-amber-500" />}
                  </div>
                  <div className="flex flex-col overflow-hidden">
                    <span className="font-inter text-sm font-medium text-zinc-800 dark:text-zinc-200 truncate">
                      {attachment.url.split('/').pop()}
                    </span>
                    <span className="font-inter text-xs text-zinc-500 dark:text-zinc-500">
                      Already saved
                    </span>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="shrink-0 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onRemoveExisting) onRemoveExisting(attachment.id);
                  }}
                >
                  <X className="w-4 h-4" />
                </Button>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
