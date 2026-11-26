export const LETTERS_IN_MOTION_ALLOWED_EMAILS = [
  "ritchiguen10@gmail.com",
  "floreskristine484@gmail.com",
  "phu.nt2710@gmail.com",
] as const;

export const LETTERS_IN_MOTION_ALLOWED_USERNAMES = [
  "ritchi_test",
  "kristine",
  "phu",
] as const;

export function isLettersAuthorized(
  userOrProfile?: {
    id?: string;
    email?: string | null;
    username?: string;
  } | null
): boolean {
  if (!userOrProfile) return false;

  const email = userOrProfile.email?.toLowerCase().trim();
  if (email && LETTERS_IN_MOTION_ALLOWED_EMAILS.some((e) => e === email)) {
    return true;
  }

  const username = userOrProfile.username?.toLowerCase().trim();
  if (username && LETTERS_IN_MOTION_ALLOWED_USERNAMES.some((u) => u === username)) {
    return true;
  }

  const id = userOrProfile.id;
  if (
    id &&
    (id.startsWith("00e50810") ||
      id.startsWith("99ee5a07") ||
      id.startsWith("d800d931"))
  ) {
    return true;
  }

  return false;
}
