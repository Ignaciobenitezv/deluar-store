import { deriveThemeTokens } from "@/features/theme/derive";
import { DEFAULT_THEME_PRESET_ID, THEME_PRESETS } from "@/features/theme/presets";
import type { ThemeTokens } from "@/features/theme/types";

/**
 * The default preset, resolved. Pure (no server-only import), so client
 * error boundaries can apply the same theme as the storefront layout.
 */
export const DEFAULT_THEME_TOKENS: ThemeTokens = deriveThemeTokens(THEME_PRESETS[DEFAULT_THEME_PRESET_ID]);
