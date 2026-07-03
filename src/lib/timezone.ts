/**
 * Centralized timezone utilities.
 * Uses Intl.DateTimeFormat only — no external dependencies.
 */

/**
 * Detect the viewer's IANA timezone.
 * Falls back to 'UTC' if detection fails or returns an invalid value.
 */
export function detectTimezone(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    // Validate that the returned string is a real IANA timezone
    // by attempting to use it. Invalid names throw a RangeError.
    Intl.DateTimeFormat("en", { timeZone: tz });
    return tz;
  } catch {
    return "UTC";
  }
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
  try {
    const safeOptions: Intl.DateTimeFormatOptions = { ...options, timeZone: tz };
    return new Intl.DateTimeFormat("en", safeOptions).format(new Date(isoString));
  } catch {
    // Fallback to browser locale if tz is invalid
    return new Intl.DateTimeFormat("en", options).format(new Date(isoString));
  }
}

/**
 * Calculate the number of whole days remaining until an unlock date.
 * Comparison is purely in UTC milliseconds — never local time strings.
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
 * This ensures both partners — wherever they live — share the same
 * anniversary date regardless of their personal local time.
 */
export function getNextAnniversary(startDateIso: string, relationshipTimezone: string): Date {
  const safeTimezone = (() => {
    try {
      Intl.DateTimeFormat("en", { timeZone: relationshipTimezone });
      return relationshipTimezone;
    } catch {
      return "UTC";
    }
  })();

  const startDate = new Date(startDateIso);

  // Extract month and day in the relationship timezone
  const monthFormatter = new Intl.DateTimeFormat("en", { month: "numeric", timeZone: safeTimezone });
  const dayFormatter   = new Intl.DateTimeFormat("en", { day: "numeric",   timeZone: safeTimezone });
  const yearFormatter  = new Intl.DateTimeFormat("en", { year: "numeric",  timeZone: safeTimezone });

  const month = parseInt(monthFormatter.format(startDate), 10); // 1-12
  const day   = parseInt(dayFormatter.format(startDate), 10);

  // Today in the relationship timezone
  const todayStr = new Intl.DateTimeFormat("en", {
    year: "numeric", month: "numeric", day: "numeric",
    timeZone: safeTimezone,
  }).format(new Date());

  const [todayMonthStr, todayDayStr, todayYearStr] = todayStr.split("/");
  const todayYear  = parseInt(todayYearStr, 10);
  const todayMonth = parseInt(todayMonthStr, 10);
  const todayDay   = parseInt(todayDayStr, 10);

  // Try this year's anniversary at midnight relationship-timezone
  let anniversaryYear = todayYear;
  const thisYearAnniversary = midnightInTimezone(anniversaryYear, month, day, safeTimezone);

  // If this year's anniversary is in the past (or today), use next year
  const todayMidnight = midnightInTimezone(todayYear, todayMonth, todayDay, safeTimezone);
  if (thisYearAnniversary < todayMidnight) {
    anniversaryYear = todayYear + 1;
  }

  return midnightInTimezone(anniversaryYear, month, day, safeTimezone);
}

/**
 * Return a UTC Date that represents midnight (00:00:00) on a given
 * year/month/day in the specified IANA timezone.
 */
function midnightInTimezone(year: number, month: number, day: number, tz: string): Date {
  // Build an ISO-style string and parse it as if it were local to `tz`
  // by using the Intl API to find the UTC offset at that point in time.
  const paddedMonth = String(month).padStart(2, "0");
  const paddedDay   = String(day).padStart(2, "0");
  // Create a Date at noon UTC first (avoids DST edge cases at midnight)
  const approxDate = new Date(`${year}-${paddedMonth}-${paddedDay}T12:00:00Z`);

  // Find what "midnight" in that timezone maps to in UTC
  // by computing the offset at noon (DST is never ambiguous at noon)
  const noonUtcMs = approxDate.getTime();
  const noonLocal = new Intl.DateTimeFormat("en", {
    hour: "numeric", minute: "numeric", second: "numeric",
    hour12: false,
    timeZone: tz,
  }).formatToParts(approxDate);

  const h = parseInt(noonLocal.find(p => p.type === "hour")!.value, 10);
  const m = parseInt(noonLocal.find(p => p.type === "minute")!.value, 10);
  const s = parseInt(noonLocal.find(p => p.type === "second")!.value, 10);

  // Offset in ms: noon local is hh:mm:ss local = 12:00:00 UTC - offset
  const localNoonMs = (h * 3600 + m * 60 + s) * 1000;
  const offsetMs    = (12 * 3600 * 1000) - localNoonMs;

  // Midnight = 00:00:00 local = UTC midnight + offsetMs
  const midnightUtcMs = Date.UTC(year, month - 1, day) + offsetMs;
  return new Date(midnightUtcMs);
}
