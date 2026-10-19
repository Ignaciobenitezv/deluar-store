"use server";

import { updateTag } from "next/cache";
import { getBetterAuthSession, isBetterAuthAdminRole } from "@/features/admin/better-auth";
import { STOREFRONT_THEME_CACHE_TAG } from "@/features/theme/server/get-storefront-theme";
import { logger } from "@/lib/logger";
import {
  discardThemeDraft,
  guardThemeWrite,
  publishTheme,
  readThemeSnapshot,
  saveThemeDraft,
  type ThemeWriteInput,
  type ThemeWriteResult,
} from "../server/storefront-theme-service";
import { createSanityThemeStore } from "../server/storefront-theme-store";

// Configuración → Apariencia writes. Owner and admin only (editor excluded):
// checked here, on every call, without redirecting, so a refused or failed
// call comes back as a result and the editor keeps its local changes.

async function isThemeAdmin() {
  const session = await getBetterAuthSession();

  return Boolean(session && isBetterAuthAdminRole(session.user.role));
}

const logFailure = (operation: string) => (error: unknown) =>
  logger.error(`admin.storefront_theme.${operation}_failed`, {
    error: error instanceof Error ? error.message : String(error),
  });

export async function saveStorefrontThemeDraftAction(input: ThemeWriteInput): Promise<ThemeWriteResult> {
  return guardThemeWrite(isThemeAdmin, createSanityThemeStore(), (store) => saveThemeDraft(store, input), logFailure("save_draft"));
}

export async function publishStorefrontThemeAction(input: ThemeWriteInput): Promise<ThemeWriteResult> {
  return guardThemeWrite(
    isThemeAdmin,
    createSanityThemeStore(),
    async (store) => {
      const result = await publishTheme(store, input, () => {
        // Server Action + immediate expiry: static and dynamic storefront
        // routes tagged through getStorefrontTheme re-read on their next request.
        updateTag(STOREFRONT_THEME_CACHE_TAG);
      });

      if (result.status === "success") {
        logger.info("admin.storefront_theme.published", { preset: result.snapshot?.published.draft.preset });
      }

      return result;
    },
    logFailure("publish"),
  );
}

export async function discardStorefrontThemeDraftAction(input: { savedRevision: unknown }): Promise<ThemeWriteResult> {
  return guardThemeWrite(isThemeAdmin, createSanityThemeStore(), (store) => discardThemeDraft(store, input), logFailure("discard_draft"));
}

/** "Recargar": the current server state, for conflict resolution. Same permission as writes. */
export async function reloadStorefrontThemeAction(): Promise<ThemeWriteResult> {
  return guardThemeWrite(
    isThemeAdmin,
    createSanityThemeStore(),
    async (store) => ({ status: "success", message: "Versión actual cargada.", snapshot: await readThemeSnapshot(store) }),
    logFailure("reload"),
  );
}
