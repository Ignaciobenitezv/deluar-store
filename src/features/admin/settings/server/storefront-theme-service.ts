import { snapshotFromDocuments, type ThemeEditorSnapshot } from "@/features/theme/editor";
import {
  CUSTOM_THEME_PRESET,
  STOREFRONT_THEME_DOCUMENT_ID,
  STOREFRONT_THEME_DRAFT_ID,
  sanitizeStorefrontThemeFields,
  themeInputFromFields,
  type StorefrontThemeFields,
} from "@/features/theme/storefront-theme-document";
import { deriveThemeTokens } from "@/features/theme/derive";
import { validateThemeTokens } from "@/features/theme/validate";

// Save / publish / discard for the storefront palette. No Next or Sanity
// imports: the document store and the cache invalidation are injected, so the
// whole flow (validation, revision locking, conflicts) is unit-tested against
// an in-memory store. The Sanity-backed store lives in storefront-theme-store.ts.

/** Sanity mutation objects, as sent to /data/mutate (one atomic transaction). */
export type ThemeMutation =
  | { create: Record<string, unknown> & { _id: string; _type: string } }
  | { patch: { id: string; ifRevisionID?: string; set?: Record<string, unknown>; unset?: string[] } }
  | { delete: { id: string } };

export class ThemeRevisionConflictError extends Error {
  constructor(message = "The document changed since it was read.") {
    super(message);
    this.name = "ThemeRevisionConflictError";
  }
}

export type ThemeDocumentStore = {
  /** Raw stored documents (with _rev/_updatedAt), either may be null. */
  read(): Promise<{ published: unknown; draft: unknown }>;
  /** Atomic. Throws ThemeRevisionConflictError on a revision or existence mismatch. */
  commit(mutations: ThemeMutation[]): Promise<void>;
};

export type ThemeWriteInput = {
  draft: unknown;
  /** `_rev` of the published document the editor read, or null if none existed. */
  publishedRevision: unknown;
  /** `_rev` of the saved draft the editor read, or null if none existed. */
  savedRevision: unknown;
  /**
   * Publish only: the admin confirmed publishing despite WCAG AA warnings.
   * Required (server-side, not just in the UI) whenever the palette has any.
   */
  acknowledgeContrastWarnings?: unknown;
};

export type ThemeWriteResult =
  | { status: "success"; message: string; snapshot: ThemeEditorSnapshot | null }
  | { status: "conflict"; message: string; snapshot: ThemeEditorSnapshot }
  | { status: "invalid"; message: string; issues: string[] }
  /** Publish blocked until repeated with acknowledgeContrastWarnings: nothing was written. */
  | { status: "needs_confirmation"; message: string; issues: string[] }
  | { status: "forbidden"; message: string }
  | { status: "unavailable"; message: string }
  | { status: "error"; message: string };

const THEME_TYPE = "storefrontTheme";
const REVISION_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;
// Unsetting a field that never exists: a no-op patch whose only job is to
// carry ifRevisionID, so a delete in the same transaction is revision-checked.
const REVISION_GUARD_FIELD = "__revisionGuard";

const CONFLICT_MESSAGE =
  "Otro administrador cambió la paleta mientras editabas. Revisá la versión actual antes de continuar: no se sobrescribió nada.";

export const contrastWarningsLabel = (count: number) =>
  `${count} ${count === 1 ? "advertencia de contraste" : "advertencias de contraste"}`;

type ParsedRevision = { ok: true; value: string | null } | { ok: false };

function parseRevision(value: unknown): ParsedRevision {
  if (value === null || value === undefined || value === "") {
    return { ok: true, value: null };
  }

  return typeof value === "string" && REVISION_PATTERN.test(value) ? { ok: true, value } : { ok: false };
}

/** Patch body that turns the document into exactly these fields. */
function fieldsPatch(fields: StorefrontThemeFields) {
  return fields.preset === CUSTOM_THEME_PRESET
    ? { set: { preset: fields.preset, colors: fields.colors, overrides: fields.overrides } }
    : { set: { preset: fields.preset }, unset: ["colors", "overrides"] };
}

function writeDocument(id: string, fields: StorefrontThemeFields, revision: string | null): ThemeMutation {
  if (revision === null) {
    // create fails if the document appeared meanwhile: a conflict, never an overwrite.
    return { create: { _id: id, _type: THEME_TYPE, ...fields } };
  }

  return { patch: { id, ifRevisionID: revision, ...fieldsPatch(fields) } };
}

function deleteAtRevision(id: string, revision: string): ThemeMutation[] {
  return [{ patch: { id, ifRevisionID: revision, unset: [REVISION_GUARD_FIELD] } }, { delete: { id } }];
}

export function buildSaveDraftMutations(fields: StorefrontThemeFields, savedRevision: string | null): ThemeMutation[] {
  return [writeDocument(STOREFRONT_THEME_DRAFT_ID, fields, savedRevision)];
}

export function buildPublishMutations(
  fields: StorefrontThemeFields,
  publishedRevision: string | null,
  savedRevision: string | null,
): ThemeMutation[] {
  return [
    writeDocument(STOREFRONT_THEME_DOCUMENT_ID, fields, publishedRevision),
    // The saved draft is what was published: remove it, only if nobody changed it since.
    ...(savedRevision ? deleteAtRevision(STOREFRONT_THEME_DRAFT_ID, savedRevision) : []),
  ];
}

export function buildDiscardDraftMutations(savedRevision: string): ThemeMutation[] {
  return deleteAtRevision(STOREFRONT_THEME_DRAFT_ID, savedRevision);
}

async function readSnapshot(store: ThemeDocumentStore): Promise<ThemeEditorSnapshot> {
  const { published, draft } = await store.read();

  return snapshotFromDocuments(published, draft);
}

type ParsedInput =
  | { ok: true; fields: StorefrontThemeFields; publishedRevision: string | null; savedRevision: string | null }
  | { ok: false; result: ThemeWriteResult };

function parseInput(input: ThemeWriteInput): ParsedInput {
  const publishedRevision = parseRevision(input?.publishedRevision);
  const savedRevision = parseRevision(input?.savedRevision);

  if (!publishedRevision.ok || !savedRevision.ok) {
    return { ok: false, result: { status: "invalid", message: "La solicitud no es válida. Recargá la página.", issues: ["revision"] } };
  }

  const sanitized = sanitizeStorefrontThemeFields(input?.draft);

  if (!sanitized.ok) {
    return {
      ok: false,
      result: {
        status: "invalid",
        message: "Hay colores inválidos. Usá valores hexadecimales, por ejemplo #465344.",
        issues: [sanitized.detail],
      },
    };
  }

  return { ok: true, fields: sanitized.fields, publishedRevision: publishedRevision.value, savedRevision: savedRevision.value };
}

async function commitOrConflict(
  store: ThemeDocumentStore,
  mutations: ThemeMutation[],
): Promise<{ ok: true } | { ok: false; result: ThemeWriteResult }> {
  try {
    await store.commit(mutations);
    return { ok: true };
  } catch (error) {
    if (error instanceof ThemeRevisionConflictError) {
      try {
        return { ok: false, result: { status: "conflict", message: CONFLICT_MESSAGE, snapshot: await readSnapshot(store) } };
      } catch {
        return { ok: false, result: { status: "error", message: CONFLICT_MESSAGE } };
      }
    }

    throw error;
  }
}

/** Success is reported only after the commit resolved; a failed re-read does not undo it. */
async function successAfterCommit(store: ThemeDocumentStore, message: string): Promise<ThemeWriteResult> {
  try {
    return { status: "success", message, snapshot: await readSnapshot(store) };
  } catch {
    return { status: "success", message: `${message} Recargá la página para ver el estado actualizado.`, snapshot: null };
  }
}

/**
 * Writes only `drafts.storefrontTheme`. Needs valid hex but not AA: a draft is
 * work in progress. The published document and the storefront cache are untouched.
 */
export async function saveThemeDraft(store: ThemeDocumentStore, input: ThemeWriteInput): Promise<ThemeWriteResult> {
  const parsed = parseInput(input);

  if (!parsed.ok) {
    return parsed.result;
  }

  const committed = await commitOrConflict(store, buildSaveDraftMutations(parsed.fields, parsed.savedRevision));

  return committed.ok ? successAfterCommit(store, "Borrador guardado. La tienda no cambió.") : committed.result;
}

/** WCAG AA pairings the palette misses, by label. Advisory: they never block on their own. */
export function contrastWarningsOf(fields: StorefrontThemeFields) {
  return validateThemeTokens(deriveThemeTokens(themeInputFromFields(fields))).contrastIssues.map((issue) => issue.label);
}

/**
 * Invalid data (hex, incomplete palette, unknown keys, bad revisions) is
 * rejected. Contrast below WCAG AA is not: it needs an explicit
 * acknowledgement and is then published as is; the storefront renders it.
 * Revision-locked on both documents, one transaction. The cache is
 * invalidated only once Sanity confirmed the commit.
 */
export async function publishTheme(
  store: ThemeDocumentStore,
  input: ThemeWriteInput,
  onPublished: () => void,
): Promise<ThemeWriteResult> {
  const parsed = parseInput(input);

  if (!parsed.ok) {
    return parsed.result;
  }

  const warnings = contrastWarningsOf(parsed.fields);

  if (warnings.length > 0 && input.acknowledgeContrastWarnings !== true) {
    return {
      status: "needs_confirmation",
      message: `La paleta tiene ${contrastWarningsLabel(warnings.length)}: algunos textos podrían resultar difíciles de leer. Confirmá para publicarla igualmente.`,
      issues: warnings,
    };
  }

  const committed = await commitOrConflict(
    store,
    buildPublishMutations(parsed.fields, parsed.publishedRevision, parsed.savedRevision),
  );

  if (!committed.ok) {
    return committed.result;
  }

  onPublished();

  return successAfterCommit(
    store,
    warnings.length > 0
      ? `Paleta publicada con ${contrastWarningsLabel(warnings.length)}. La tienda la muestra en la próxima visita.`
      : "Paleta publicada. La tienda la muestra en la próxima visita.",
  );
}

export async function discardThemeDraft(
  store: ThemeDocumentStore,
  input: { savedRevision: unknown },
): Promise<ThemeWriteResult> {
  const savedRevision = parseRevision(input?.savedRevision);

  if (!savedRevision.ok || savedRevision.value === null) {
    return { status: "invalid", message: "No hay un borrador guardado para descartar.", issues: ["savedRevision"] };
  }

  const committed = await commitOrConflict(store, buildDiscardDraftMutations(savedRevision.value));

  return committed.ok ? successAfterCommit(store, "Borrador descartado.") : committed.result;
}

export async function readThemeSnapshot(store: ThemeDocumentStore) {
  return readSnapshot(store);
}

/**
 * Every write goes through here: the permission check runs first and nothing
 * else does when it fails. Unexpected errors become a message; the client
 * keeps its local draft either way.
 */
export async function guardThemeWrite(
  isAllowed: () => Promise<boolean>,
  store: ThemeDocumentStore | null,
  run: (store: ThemeDocumentStore) => Promise<ThemeWriteResult>,
  onError: (error: unknown) => void = () => {},
): Promise<ThemeWriteResult> {
  if (!(await isAllowed())) {
    return { status: "forbidden", message: "Tu usuario no tiene permiso para modificar la paleta de la tienda." };
  }

  if (!store) {
    return { status: "unavailable", message: "Faltan las credenciales de escritura de Sanity en el servidor." };
  }

  try {
    return await run(store);
  } catch (error) {
    onError(error);
    return { status: "error", message: "No pudimos completar la operación. Tus cambios siguen en el editor; intentá de nuevo." };
  }
}

