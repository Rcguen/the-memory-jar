"use client";

import { useState, useEffect } from "react";
import { format, isSameDay, addDays, addMonths } from "date-fns";
import { Clock, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { getNextAnniversary, formatInTimezone } from "@/lib/timezone";

interface TimeCapsulePickerProps {
  value: string | undefined;
  onChange: (value: string | undefined) => void;
}

export function TimeCapsulePicker({ value, onChange }: TimeCapsulePickerProps) {
  const [anniversaryDate, setAnniversaryDate] = useState<Date | null>(null);
  const [relationshipTimezone, setRelationshipTimezone] = useState<string>("UTC");
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    async function fetchAnniversary() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: memberData } = await supabase
        .from("relationship_members")
        .select("relationship_id")
        .eq("profile_id", user.id)
        .single();
        
      if (!memberData) return;

      const { data: relData } = await supabase
        .from("relationship_settings")
        .select("start_date, relationship_timezone")
        .eq("id", memberData.relationship_id)
        .single();

      if (relData && relData.start_date) {
        // Use relationship_timezone for anniversary so both partners share the same date.
        // If the column hasn't been migrated yet, fall back gracefully to 'UTC'.
        const tz: string = (relData as any).relationship_timezone || "UTC";
        setRelationshipTimezone(tz);

        // Anniversary is set to midnight (00:00) in the relationship timezone,
        // not the viewer's local clock.
        const nextAnniversary = getNextAnniversary(relData.start_date, tz);
        setAnniversaryDate(nextAnniversary);
      }
    }
    fetchAnniversary();
  }, []);

  const presets = [
    { label: "Open Today", value: undefined, desc: "Not a time capsule" },
    { label: "Next Week",  value: addDays(new Date(), 7).toISOString(),  desc: "In 7 days" },
    { label: "Next Month", value: addMonths(new Date(), 1).toISOString(), desc: "In 1 month" },
    ...(anniversaryDate
      ? [{
          label: "Anniversary",
          value: anniversaryDate.toISOString(),
          desc: formatInTimezone(anniversaryDate.toISOString(), relationshipTimezone, {
            month: "short", day: "numeric", year: "numeric",
          }),
        }]
      : []),
  ];

  const handleSelect = (val: string | undefined) => {
    onChange(val);
    setIsOpen(false);
  };

  const getLabel = () => {
    if (!value) return "No lock";
    const d = new Date(value);
    
    // Check if it matches a preset exactly (by calendar day)
    const matchingPreset = presets.find(p => p.value && isSameDay(new Date(p.value), d));
    if (matchingPreset && matchingPreset.label !== "Open Today") {
      return matchingPreset.label;
    }
    
    return format(d, "PPP");
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger render={
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal bg-white/50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800",
            !value && "text-muted-foreground"
          )}
        />
      }>
        <Clock className="mr-2 h-4 w-4 opacity-50" />
        {value ? getLabel() : "Open Today (No lock)"}
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <div className="p-2 space-y-1">
          <p className="text-xs font-semibold text-zinc-500 uppercase px-2 py-1">Time Capsule</p>
          {presets.map((preset) => (
            <button
              key={preset.label}
              onClick={() => handleSelect(preset.value)}
              className="w-full flex items-center justify-between px-2 py-2 text-sm rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <div className="flex flex-col text-left">
                <span className="font-medium">{preset.label}</span>
                <span className="text-xs text-zinc-500">{preset.desc}</span>
              </div>
              {((!value && !preset.value) || (value && preset.value && isSameDay(new Date(value), new Date(preset.value)))) && (
                <Check className="h-4 w-4 text-rose-500" />
              )}
            </button>
          ))}
          
          <div className="border-t border-zinc-100 dark:border-zinc-800 my-1 pt-1">
            <p className="text-xs font-semibold text-zinc-500 uppercase px-2 py-1">Custom Date</p>
            <div className="px-2 pb-2">
              <Input
                type="date"
                value={value ? new Date(value).toISOString().split('T')[0] : ""}
                onChange={(e) => {
                  if (e.target.value) {
                    handleSelect(new Date(e.target.value).toISOString());
                  }
                }}
                min={new Date().toISOString().split('T')[0]}
                className="h-8 text-sm bg-transparent"
              />
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
