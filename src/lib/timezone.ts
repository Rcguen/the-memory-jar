/**
 * Centralized timezone utilities.
 * Uses Intl.DateTimeFormat only - no external dependencies.
 */

/**
 * Detect the viewer's IANA timezone.
 * Falls back to 'UTC' if detection fails or returns an invalid value.
 */
export function detectTimezone(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;

    if (!tz) {
      return "UTC";
    }

    // Validate that the returned string is a real IANA timezone
    // by attempting to use it. Invalid names throw a RangeError.
    Intl.DateTimeFormat("en-US", {
      timeZone: tz,
    });

    return tz;
  } catch {
    return "UTC";
  }
}

export function isValidTimezone(tz: string | null | undefined): tz is string {
  if (!tz) return false;

  try {
    Intl.DateTimeFormat("en", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export function normalizeTimezone(tz: string | null | undefined): string {
  return isValidTimezone(tz) ? tz : "UTC";
}

export function getSupportedTimezones(): string[] {
  if (typeof Intl.supportedValuesOf === "function") {
    return Intl.supportedValuesOf("timeZone");
  }

  return [
    "UTC",
    "Asia/Ho_Chi_Minh",
    "Asia/Manila",
    "Asia/Tokyo",
    "Europe/London",
    "Europe/Paris",
    "America/Los_Angeles",
    "America/Denver",
    "America/Chicago",
    "America/New_York",
  ];
}

function parseDateOnly(dateString: string): { year: number; month: number; day: number } {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateString);
  if (!match) {
    throw new RangeError(`Expected date-only value in YYYY-MM-DD format, received "${dateString}"`);
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const utcDate = new Date(Date.UTC(year, month - 1, day));

  if (
    utcDate.getUTCFullYear() !== year ||
    utcDate.getUTCMonth() !== month - 1 ||
    utcDate.getUTCDate() !== day
  ) {
    throw new RangeError(`Invalid calendar date "${dateString}"`);
  }

  return { year, month, day };
}

function getTimezoneDateParts(date: Date, tz: string): {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
} {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const value = (type: Intl.DateTimeFormatPartTypes) => {
    const part = parts.find((p) => p.type === type);
    if (!part) throw new RangeError(`Missing ${type} while formatting timezone date`);
    return Number(part.value);
  };

  return {
    year: value("year"),
    month: value("month"),
    day: value("day"),
    hour: value("hour"),
    minute: value("minute"),
    second: value("second"),
  };
}

export function getDateTimePartsInTimezone(date: Date, tz: string | null | undefined) {
  const safeTimezone = normalizeTimezone(tz);
  return getTimezoneDateParts(date, safeTimezone);
}

function formatDateOnlyFromParts(parts: { year: number; month: number; day: number }): string {
  return [
    String(parts.year).padStart(4, "0"),
    String(parts.month).padStart(2, "0"),
    String(parts.day).padStart(2, "0"),
  ].join("-");
}

function localTimestampInTimezone(date: Date, tz: string): number {
  const parts = getTimezoneDateParts(date, tz);
  return Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
}

export function utcIsoToDateOnlyInTimezone(isoString: string, tz: string | null | undefined): string {
  const safeTimezone = normalizeTimezone(tz);
  return formatDateOnlyFromParts(getTimezoneDateParts(new Date(isoString), safeTimezone));
}

export function todayDateOnlyInTimezone(tz: string | null | undefined, now: Date = new Date()): string {
  const safeTimezone = normalizeTimezone(tz);
  return formatDateOnlyFromParts(getTimezoneDateParts(now, safeTimezone));
}

export function getMonthDayInTimezone(tz: string | null | undefined, now: Date = new Date()): string {
  const safeTimezone = normalizeTimezone(tz);
  const parts = getTimezoneDateParts(now, safeTimezone);
  return `${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

export function getTimezonePeriod(
  tz: string | null | undefined,
  now: Date = new Date()
): "morning" | "day" | "evening" | "night" {
  const safeTimezone = normalizeTimezone(tz);
  const hour = getTimezoneDateParts(now, safeTimezone).hour;

  if (hour >= 5 && hour < 11) return "morning";
  if (hour >= 11 && hour < 17) return "day";
  if (hour >= 17 && hour < 21) return "evening";
  return "night";
}

/**
 * Convert a date-only selection to the exact UTC instant for 00:00:00
 * at the start of that date in the supplied relationship timezone.
 */
export function dateOnlyInTimezoneToUtcIso(dateString: string, tz: string | null | undefined): string {
  const { year, month, day } = parseDateOnly(dateString);
  const safeTimezone = normalizeTimezone(tz);
  const targetLocalMs = Date.UTC(year, month - 1, day, 0, 0, 0, 0);

  let utcMs = targetLocalMs;
  for (let i = 0; i < 4; i += 1) {
    const localMs = localTimestampInTimezone(new Date(utcMs), safeTimezone);
    const delta = localMs - targetLocalMs;
    if (delta === 0) break;
    utcMs -= delta;
  }

  return new Date(utcMs).toISOString();
}

/**
 * Format a UTC ISO string into a human-readable date string
 * using a specific IANA timezone. Uses Intl.DateTimeFormat so
 * no additional packages are required.
 *
 * @param isoString  UTC ISO 8601 string (e.g. from Supabase timestamptz)
 * @param tz         IANA timezone string (e.g. "Asia/Ho_Chi_Minh")
 * @param options    Intl.DateTimeFormatOptions
 */
export function formatInTimezone(
  isoString: string,
  tz: string,
  options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "long",
    day: "numeric",
  }
): string {
  const safeTimezone = normalizeTimezone(tz);
  try {
    const safeOptions: Intl.DateTimeFormatOptions = { ...options, timeZone: safeTimezone };
    return new Intl.DateTimeFormat("en", safeOptions).format(new Date(isoString));
  } catch {
    return new Intl.DateTimeFormat("en", { ...options, timeZone: "UTC" }).format(new Date(isoString));
  }
}

/**
 * Calculate the number of whole days remaining until an unlock date.
 * Comparison is purely in UTC milliseconds - never local time strings.
 *
 * @param unlockAt  UTC ISO 8601 string
 * @returns  Positive integer, or 0 if already past
 */
export function daysUntil(unlockAt: string): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  const diff = new Date(unlockAt).getTime() - Date.now();
  return diff > 0 ? Math.ceil(diff / msPerDay) : 0;
}

/**
 * Given a relationship start date and an IANA relationship_timezone,
 * return the next anniversary as a Date set to midnight (00:00:00)
 * in that relationship timezone.
 *
 * This ensures both partners - wherever they live - share the same
 * anniversary date regardless of their personal local time.
 */
export function getNextAnniversary(startDateIso: string, relationshipTimezone: string): Date {
  const safeTimezone = normalizeTimezone(relationshipTimezone);
  const startDate = new Date(startDateIso);

  // Extract month and day in the relationship timezone
  const monthFormatter = new Intl.DateTimeFormat("en", { month: "numeric", timeZone: safeTimezone });
  const dayFormatter = new Intl.DateTimeFormat("en", { day: "numeric", timeZone: safeTimezone });

  const month = parseInt(monthFormatter.format(startDate), 10);
  const day = parseInt(dayFormatter.format(startDate), 10);

  // Today in the relationship timezone
  const todayStr = new Intl.DateTimeFormat("en", {
    year: "numeric", month: "numeric", day: "numeric",
    timeZone: safeTimezone,
  }).format(new Date());

  const [todayMonthStr, todayDayStr, todayYearStr] = todayStr.split("/");
  const todayYear = parseInt(todayYearStr, 10);
  const todayMonth = parseInt(todayMonthStr, 10);
  const todayDay = parseInt(todayDayStr, 10);

  let anniversaryYear = todayYear;
  const anniversaryDateOnly = `${anniversaryYear}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const thisYearAnniversary = new Date(dateOnlyInTimezoneToUtcIso(anniversaryDateOnly, safeTimezone));

  const todayDateOnly = `${todayYear}-${String(todayMonth).padStart(2, "0")}-${String(todayDay).padStart(2, "0")}`;
  const todayMidnight = new Date(dateOnlyInTimezoneToUtcIso(todayDateOnly, safeTimezone));
  if (thisYearAnniversary < todayMidnight) {
    anniversaryYear = todayYear + 1;
  }

  return new Date(dateOnlyInTimezoneToUtcIso(
    `${anniversaryYear}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
    safeTimezone
  ));
}
