"use client";

/* eslint-disable @next/next/no-img-element */
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";

const EMOJI_FONT_FAMILY = '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", "Twemoji Mozilla", sans-serif';
const EMOJI_ASSET_SIZE = 64;
const EMOJI_BASE =
  "(?:[\\u00A9\\u00AE\\u203C\\u2049\\u2122\\u2139\\u2194-\\u21AA\\u231A-\\u231B\\u2328\\u23CF\\u23E9-\\u23F3\\u23F8-\\u23FA\\u24C2\\u25AA-\\u25AB\\u25B6\\u25C0\\u25FB-\\u25FE\\u2600-\\u27BF\\u2934-\\u2935\\u2B05-\\u2B55\\u3030\\u303D\\u3297\\u3299]|\\uD83C[\\uDC00-\\uDFFF]|\\uD83D[\\uDC00-\\uDFFF]|\\uD83E[\\uDD00-\\uDFFF]|\\p{Extended_Pictographic})";
const EMOJI_SEQUENCE_REGEX = new RegExp(
  `(\\p{Regional_Indicator}{2}|[#*0-9]\\uFE0F?\\u20E3|${EMOJI_BASE}(?:\\uFE0F|\\uFE0E|\\p{Emoji_Modifier})?(?:\\u200D${EMOJI_BASE}(?:\\uFE0F|\\uFE0E|\\p{Emoji_Modifier})?)*)`,
  "gu",
);
const BOX_PLACEHOLDER_REGEX = /[\u25A0-\u25A3\u25A9\u25AB\u25AD-\u25AF\u25B1\u25FB-\u25FE\u2610\u2B1C\uFFFD]+/gu;
const BOX_BEFORE_PINCH_REGEX = /[\u25A0-\u25A3\u25A9\u25AB\u25AD-\u25AF\u25B1\u25FB-\u25FE\u2610\u2B1C\uFFFD]+(?=\s*\u{1FAF0})/gu;

interface EmojiTextProps {
  text: string;
  className?: string;
}

function emojiCodepoints(emoji: string) {
  return Array.from(emoji)
    .map((char) => char.codePointAt(0)?.toString(16))
    .filter((codepoint): codepoint is string => !!codepoint && codepoint !== "fe0e" && codepoint !== "fe0f")
    .join("-");
}

function EmojiGlyph({ emoji }: { emoji: string }) {
  const [sourceIndex, setSourceIndex] = useState(0);
  const codepoints = emojiCodepoints(emoji);
  const sources = [
    `https://cdn.jsdelivr.net/npm/emoji-datasource-google@16.0.0/img/google/${EMOJI_ASSET_SIZE}/${codepoints}.png`,
    `https://cdn.jsdelivr.net/npm/emoji-datasource-apple@16.0.0/img/apple/${EMOJI_ASSET_SIZE}/${codepoints}.png`,
    `https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/${codepoints}.svg`,
  ];

  if (sourceIndex >= sources.length) {
    return (
      <span style={{ fontFamily: EMOJI_FONT_FAMILY }} aria-label={emoji}>
        {emoji}
      </span>
    );
  }

  return (
    <img
      src={sources[sourceIndex]}
      alt={emoji}
      loading="lazy"
      decoding="async"
      className="mx-[0.05em] inline-block h-[1.05em] w-[1.05em] translate-y-[-0.08em] align-middle"
      onError={() => setSourceIndex((current) => current + 1)}
    />
  );
}

function normalizeEmojiText(text: string) {
  return text
    .replace(BOX_BEFORE_PINCH_REGEX, "\u{1F644}")
    .replace(BOX_PLACEHOLDER_REGEX, "\u2661");
}

export function EmojiText({ text, className }: EmojiTextProps) {
  const cleanedText = normalizeEmojiText(text);
  const parts = useMemo(() => {
    const tokens: Array<{ value: string; emoji: boolean }> = [];
    let lastIndex = 0;

    for (const match of cleanedText.matchAll(EMOJI_SEQUENCE_REGEX)) {
      const index = match.index ?? 0;
      if (index > lastIndex) {
        tokens.push({ value: cleanedText.slice(lastIndex, index), emoji: false });
      }
      tokens.push({ value: match[0], emoji: true });
      lastIndex = index + match[0].length;
    }

    if (lastIndex < cleanedText.length) {
      tokens.push({ value: cleanedText.slice(lastIndex), emoji: false });
    }

    return tokens;
  }, [cleanedText]);

  return (
    <span className={cn("break-words", className)}>
      {parts.map((part, index) =>
        part.emoji ? <EmojiGlyph key={`${part.value}-${index}`} emoji={part.value} /> : <span key={index}>{part.value}</span>,
      )}
    </span>
  );
}
