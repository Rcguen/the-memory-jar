import { MemoryThemeType } from "@/types/memory";
import { MemoryThemeDefinition } from "./types";

import { modern } from "./modern";
import { vintage } from "./vintage";
import { romantic } from "./romantic";
import { dark } from "./dark";
import { sakura } from "./sakura";
import { typewriter } from "./typewriter";
import { nature } from "./nature";
import { dream } from "./dream";

export * from "./types";

export const THEME_DEFINITIONS: Record<MemoryThemeType, MemoryThemeDefinition> = Object.freeze({
  modern,
  vintage,
  romantic,
  dark,
  sakura,
  typewriter,
  nature,
  dream,
});
