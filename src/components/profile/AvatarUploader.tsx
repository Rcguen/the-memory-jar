"use client";

import { useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Loader2, Upload, Trash2, Camera } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/providers/auth-provider";
import { cn } from "@/lib/utils";

interface AvatarUploaderProps {
  currentAvatarUrl: string | undefined;
  displayName: string | undefined;
  onAvatarChange: (url: string) => void;
}

export function AvatarUploader({ currentAvatarUrl, displayName, onAvatarChange }: AvatarUploaderProps) {
  const { profile } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const supabase = createClient();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Basic validation
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be smaller than 5MB.");
      return;
    }

    setIsUploading(true);

    try {
      const userId = profile?.id;
      if (!userId) throw new Error("User not authenticated");

      const fileExt = file.name.split(".").pop();
      // Keep it as avatar.webp or original extension
      const fileName = `avatar.${fileExt}`;
      const filePath = `${userId}/${fileName}`;

      // 1. Upload to Supabase Storage (replace if exists)
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // 2. Get Public URL for public bucket
      const { data: publicData } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      if (!publicData?.publicUrl) throw new Error("Could not generate public URL");

      // Add a timestamp cache-buster to force the browser to reload the new image
      const urlWithCacheBuster = `${publicData.publicUrl}?t=${Date.now()}`;
      onAvatarChange(urlWithCacheBuster);
      toast.success("Avatar updated successfully");

    } catch (error) {
      console.error("Avatar upload error:", error);
      toast.error("Failed to upload avatar. Please try again.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemove = async () => {
    if (!profile?.id) return;
    
    // Extract file path from current URL if possible, or just delete the common extensions
    try {
      // In a real app we might list files in the user's directory and delete them all,
      // but here we just pass empty string to clear the avatar in the DB.
      // We can also try deleting the physical file:
      await supabase.storage.from("avatars").remove([`${profile.id}/avatar.png`, `${profile.id}/avatar.jpg`, `${profile.id}/avatar.jpeg`, `${profile.id}/avatar.webp`]);
      
      onAvatarChange("");
      toast.success("Avatar removed");
    } catch (e) {
      console.error("Failed to remove avatar from storage", e);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative group">
        <Avatar data-size="lg" className="h-28 w-28 ring-4 ring-white/5 transition-all group-hover:ring-emerald-500/30">
          <AvatarImage src={currentAvatarUrl} alt={displayName || "Profile"} />
          <AvatarFallback className="bg-emerald-100 text-3xl text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
            {displayName?.charAt(0) ?? "M"}
          </AvatarFallback>
        </Avatar>

        <div className="absolute inset-0 rounded-full flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
          <Camera className="w-8 h-8 text-white/80" />
        </div>

        {isUploading && (
          <div className="absolute inset-0 rounded-full flex items-center justify-center bg-zinc-950/60 backdrop-blur-sm">
            <Loader2 className="w-6 h-6 text-emerald-400 animate-spin" />
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isUploading}
          onClick={() => fileInputRef.current?.click()}
          className="h-9 rounded-full border-white/10 bg-white/[0.03] text-zinc-100 hover:bg-white/[0.08]"
        >
          <Upload className="w-3.5 h-3.5 mr-2" />
          Upload
        </Button>
        
        {currentAvatarUrl && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={isUploading}
            onClick={handleRemove}
            className="h-9 rounded-full px-3 text-rose-400 hover:bg-rose-500/10 hover:text-rose-300"
          >
            <Trash2 className="w-4 h-4" />
            <span className="sr-only">Remove avatar</span>
          </Button>
        )}
      </div>
      <p className="text-xs text-zinc-500 text-center max-w-[12rem]">
        Supports JPG, PNG, or WEBP up to 5MB.
      </p>
    </div>
  );
}
