export type Season = "Spring" | "Summer" | "Autumn" | "Winter";

export function getCurrentSeason(timezone?: string | null): Season {
  // Use timezone to get the current month, fallback to local
  const tz = timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    month: "numeric"
  });
  const month = parseInt(formatter.format(new Date()), 10);

  // Simple northern hemisphere season calculation for now
  // In a more complex app, we might check if the timezone is in the southern hemisphere
  if (month >= 3 && month <= 5) return "Spring";
  if (month >= 6 && month <= 8) return "Summer";
  if (month >= 9 && month <= 11) return "Autumn";
  return "Winter";
}
