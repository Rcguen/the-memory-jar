export const MEMORY_JAR_NOTIFICATION_TITLE = "The Memory Jar";

export type RomanticNotificationCategory =
  | "letter"
  | "photo_single"
  | "photo_multiple"
  | "voice"
  | "video"
  | "promise"
  | "travel"
  | "wish"
  | "gratitude"
  | "random_thought"
  | "capsule_sealed"
  | "capsule_collaborative"
  | "capsule_unlocked"
  | "unknown";

type CapsuleState = "sealed" | "collaborative" | "unlocked" | null;

interface ResolveCategoryInput {
  memoryType?: string | null;
  mediaCount?: number;
  capsuleState?: CapsuleState;
}

interface RomanticCopyInput {
  category: RomanticNotificationCategory;
  senderDisplayName?: string | null;
}

const CATEGORY_VALUES = new Set<RomanticNotificationCategory>([
  "letter",
  "photo_single",
  "photo_multiple",
  "voice",
  "video",
  "promise",
  "travel",
  "wish",
  "gratitude",
  "random_thought",
  "capsule_sealed",
  "capsule_collaborative",
  "capsule_unlocked",
  "unknown",
]);

function safeSenderName(value?: string | null): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed.slice(0, 80) : null;
}

function withSender(sender: string | null, named: string, anonymous: string) {
  return sender ? `${sender} ${named}` : `Someone ${anonymous}`;
}

export function resolveRomanticNotificationCategory({
  memoryType,
  mediaCount = 0,
  capsuleState = null,
}: ResolveCategoryInput): RomanticNotificationCategory {
  if (capsuleState === "unlocked") return "capsule_unlocked";
  if (capsuleState === "collaborative") return "capsule_collaborative";
  if (capsuleState === "sealed") return "capsule_sealed";

  switch (memoryType) {
    case "letter":
      return "letter";
    case "photo":
      return Number.isFinite(mediaCount) && mediaCount > 1 ? "photo_multiple" : "photo_single";
    case "voice":
      return "voice";
    case "video":
      return "video";
    case "promise":
      return "promise";
    case "travel":
      return "travel";
    case "wish":
      return "wish";
    case "gratitude":
      return "gratitude";
    case "random_thought":
      return "random_thought";
    default:
      return "unknown";
  }
}

export function readRomanticNotificationCategory(value: unknown): RomanticNotificationCategory | null {
  return typeof value === "string" && CATEGORY_VALUES.has(value as RomanticNotificationCategory)
    ? value as RomanticNotificationCategory
    : null;
}

export function getRomanticNotificationCopy({
  category,
  senderDisplayName,
}: RomanticCopyInput): { title: string; body: string } {
  const sender = safeSenderName(senderDisplayName);
  let body: string;

  switch (category) {
    case "letter":
      body = withSender(sender, "wrote you something from the heart", "wrote you something from the heart");
      break;
    case "photo_single":
      body = withSender(sender, "saved a little moment for you", "saved a little moment for you");
      break;
    case "photo_multiple":
      body = withSender(sender, "gathered a few moments for you", "gathered a few moments for you");
      break;
    case "voice":
      body = withSender(sender, "left a little voice note for you", "left a little voice note for you");
      break;
    case "video":
      body = withSender(sender, "shared a moment worth keeping", "shared a moment worth keeping");
      break;
    case "promise":
      body = withSender(sender, "left a promise for your future", "left a promise for your future");
      break;
    case "travel":
      body = withSender(sender, "saved a little adventure for you", "saved a little adventure for you");
      break;
    case "wish":
      body = withSender(sender, "made a little wish for the two of you", "made a little wish for the two of you");
      break;
    case "gratitude":
      body = withSender(sender, "left a little thank-you from the heart", "left a little thank-you from the heart");
      break;
    case "random_thought":
      body = withSender(sender, "was thinking of you", "was thinking of you");
      break;
    case "capsule_sealed":
      body = withSender(sender, "sealed a little piece of today for your future", "sealed a little piece of today for your future");
      break;
    case "capsule_collaborative":
      body = withSender(sender, "is waiting to finish something special with you", "is waiting to finish something special with you");
      break;
    case "capsule_unlocked":
      body = "A little memory has been waiting for you";
      break;
    default:
      body = withSender(sender, "left something special for you", "left something special for you");
  }

  return { title: MEMORY_JAR_NOTIFICATION_TITLE, body };
}
