"use client";

import { useState, useEffect } from "react";
import { Clock, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  dateOnlyInTimezoneToUtcIso,
  formatInTimezone,
  getNextAnniversary,
  normalizeTimezone,
  todayDateOnlyInTimezone,
  utcIsoToDateOnlyInTimezone,
} from "@/lib/timezone";

interface TimeCapsulePickerProps {
  value: string | undefined;
  onChange: (value: string | undefined) => void;
}

function addDaysToDateOnly(dateString: string, days: number): string {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().split("T")[0];
}

function addMonthsToDateOnly(dateString: string, months: number): string {
  const [year, month, day] = dateString.split("-").map(Number);
  const targetMonthIndex = month - 1 + months;
  const targetYear = year + Math.floor(targetMonthIndex / 12);
  const normalizedMonthIndex = ((targetMonthIndex % 12) + 12) % 12;
  const lastDayOfTargetMonth = new Date(Date.UTC(targetYear, normalizedMonthIndex + 1, 0)).getUTCDate();
  const clippedDay = Math.min(day, lastDayOfTargetMonth);

  return new Date(Date.UTC(targetYear, normalizedMonthIndex, clippedDay)).toISOString().split("T")[0];
}

export function TimeCapsulePicker({ value, onChange }: TimeCapsulePickerProps) {
  const [anniversaryDate, setAnniversaryDate] = useState<Date | null>(null);
  const [relationshipTimezone, setRelationshipTimezone] = useState<string>("UTC");
  const [isTimezoneReady, setIsTimezoneReady] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    async function fetchRelationshipSettings() {
      try {
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

        if (!relData) return;

        const tz = normalizeTimezone((relData as { relationship_timezone?: string }).relationship_timezone);
        setRelationshipTimezone(tz);

        if (relData.start_date) {
          const nextAnniversary = getNextAnniversary(relData.start_date, tz);
          setAnniversaryDate(nextAnniversary);
        }
      } finally {
        setIsTimezoneReady(true);
      }
    }

    fetchRelationshipSettings();
  }, []);

  const relationshipToday = todayDateOnlyInTimezone(relationshipTimezone);
  const nextWeekDate = addDaysToDateOnly(relationshipToday, 7);
  const nextMonthDate = addMonthsToDateOnly(relationshipToday, 1);

  const toUnlockIso = (dateString: string) => dateOnlyInTimezoneToUtcIso(dateString, relationshipTimezone);

  const presets = [
    { label: "Open Today", value: undefined, desc: "Not a time capsule", dateOnly: undefined },
    {
      label: "Next Week",
      value: toUnlockIso(nextWeekDate),
      desc: formatInTimezone(toUnlockIso(nextWeekDate), relationshipTimezone, { month: "short", day: "numeric", year: "numeric" }),
      dateOnly: nextWeekDate,
    },
    {
      label: "Next Month",
      value: toUnlockIso(nextMonthDate),
      desc: formatInTimezone(toUnlockIso(nextMonthDate), relationshipTimezone, { month: "short", day: "numeric", year: "numeric" }),
      dateOnly: nextMonthDate,
    },
    ...(anniversaryDate
      ? [{
          label: "Anniversary",
          value: anniversaryDate.toISOString(),
          desc: formatInTimezone(anniversaryDate.toISOString(), relationshipTimezone, {
            month: "short", day: "numeric", year: "numeric",
          }),
          dateOnly: utcIsoToDateOnlyInTimezone(anniversaryDate.toISOString(), relationshipTimezone),
        }]
      : []),
  ];

  const selectedDateOnly = value ? utcIsoToDateOnlyInTimezone(value, relationshipTimezone) : "";

  const handleSelect = (val: string | undefined) => {
    if (!isTimezoneReady && val) return;
    onChange(val);
    setIsOpen(false);
  };

  const handleDateSelect = (dateString: string) => {
    handleSelect(dateOnlyInTimezoneToUtcIso(dateString, relationshipTimezone));
  };

  const getLabel = () => {
    if (!value) return "No lock";

    const matchingPreset = presets.find((p) => p.dateOnly && p.dateOnly === selectedDateOnly);
    if (matchingPreset && matchingPreset.label !== "Open Today") {
      return matchingPreset.label;
    }

    return formatInTimezone(value, relationshipTimezone, { month: "long", day: "numeric", year: "numeric" });
  };

  return (
    <div className="space-y-1.5">
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger render={
          <Button
            variant="outline"
            disabled={!isTimezoneReady}
            className={cn(
              "w-full justify-start text-left font-normal bg-white/50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800",
              !value && "text-muted-foreground"
            )}
          />
        }>
          <Clock className="mr-2 h-4 w-4 opacity-50" />
          {!isTimezoneReady ? "Loading timezone..." : value ? getLabel() : "Open Today (No lock)"}
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="start">
          <div className="p-2 space-y-1">
            <p className="text-xs font-semibold text-zinc-500 uppercase px-2 py-1">Time Capsule</p>
            {presets.map((preset) => (
              <button
                key={preset.label}
                type="button"
                disabled={!isTimezoneReady}
                onClick={() => handleSelect(preset.value)}
                className="w-full flex items-center justify-between px-2 py-2 text-sm rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <div className="flex flex-col text-left">
                  <span className="font-medium">{preset.label}</span>
                  <span className="text-xs text-zinc-500">{preset.desc}</span>
                </div>
                {((!value && !preset.value) || (preset.dateOnly && preset.dateOnly === selectedDateOnly)) && (
                  <Check className="h-4 w-4 text-rose-500" />
                )}
              </button>
            ))}

            <div className="border-t border-zinc-100 dark:border-zinc-800 my-1 pt-1">
              <p className="text-xs font-semibold text-zinc-500 uppercase px-2 py-1">Custom Date</p>
              <div className="px-2 pb-2">
                <Input
                  type="date"
                  value={selectedDateOnly}
                  onChange={(e) => {
                    if (e.target.value) {
                      handleDateSelect(e.target.value);
                    }
                  }}
                  min={relationshipToday}
                  disabled={!isTimezoneReady}
                  className="h-8 text-sm bg-transparent"
                />
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
      <p className="px-2 text-[11px] leading-snug text-zinc-500 dark:text-zinc-400">
        {isTimezoneReady
          ? `Opens at 00:00 of the selected date using your relationship timezone (${relationshipTimezone}).`
          : "Loading your relationship timezone..."}
      </p>
    </div>
  );
}
