import { copySnapshotFromDocuments, type CopyEditorSnapshot } from "@/features/storefront-copy/editor";
import {
  STOREFRONT_COPY_DOCUMENT_ID,
  STOREFRONT_COPY_DRAFT_ID,
  sanitizeStorefrontCopyFields,
  type StorefrontCopyFields,
} from "@/features/storefront-copy/storefront-copy-document";

// Save / publish / discard for the storefront texts. Same flow as the palette
// (storefront-theme-service.ts): no Next or Sanity imports, the document store
// and the cache invalidation are injected, every write is revision-locked and
// a conflict never overwrites. The Sanity-backed store is in storefront-copy-store.ts.

export type CopyMutation =
  | { create: Record<string, unknown> & { _id: string; _type: string } }
  | { patch: { id: string; ifRevisionID?: string; set?: Record<string, unknown>; unset?: string[] } }
  | { delete: { id: string } };

export class CopyRevisionConflictError extends Error {
  constructor(message = "The document changed since it was read.") {
    super(message);
    this.name = "CopyRevisionConflictError";
  }
}

export type CopyDocumentStore = {
  read(): Promise<{ published: unknown; draft: unknown }>;
  /** Atomic. Throws CopyRevisionConflictError on a revision or existence mismatch. */
  commit(mutations: CopyMutation[]): Promise<void>;
};

export type CopyWriteInput = {
  /** Section objects with the texts (full or only the changed ones). */
  draft: unknown;
  publishedRevision: unknown;
  savedRevision: unknown;
};

export type CopyWriteResult =
  | { status: "success"; message: string; snapshot: CopyEditorSnapshot | null }
  | { status: "conflict"; message: string; snapshot: CopyEditorSnapshot }
  | { status: "invalid"; message: string; issues: string[] }
  | { status: "forbidden"; message: string }
  | { status: "unavailable"; message: string }
  | { status: "error"; message: string };

const COPY_TYPE = "storefrontCopy";
const REVISION_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;
// A no-op unset whose only job is to carry ifRevisionID before a delete.
const REVISION_GUARD_FIELD = "__revisionGuard";

const CONFLICT_MESSAGE =
  "Otro administrador cambió los textos mientras editabas. Revisá la versión actual antes de continuar: no se sobrescribió nada.";

type ParsedRevision = { ok: true; value: string | null } | { ok: false };

function parseRevision(value: unknown): ParsedRevision {
  if (value === null || value === undefined || value === "") {
    return { ok: true, value: null };
  }

  return typeof value === "string" && REVISION_PATTERN.test(value) ? { ok: true, value } : { ok: false };
}

function writeDocument(id: string, fields: StorefrontCopyFields, revision: string | null): CopyMutation {
  if (revision === null) {
    // create fails if the document appeared meanwhile: a conflict, never an overwrite.
    return { create: { _id: id, _type: COPY_TYPE, ...fields } };
  }

  // `set` replaces each whole section object, so a restored text disappears from it.
  // The slide order is the one optional top-level field: gone means Studio decides again.
  return {
    patch: {
      id,
      ifRevisionID: revision,
      set: { ...fields },
      ...(fields.heroSlideOrder ? {} : { unset: ["heroSlideOrder"] }),
    },
  };
}

function deleteAtRevision(id: string, revision: string): CopyMutation[] {
  return [{ patch: { id, ifRevisionID: revision, unset: [REVISION_GUARD_FIELD] } }, { delete: { id } }];
}

export function buildCopySaveDraftMutations(fields: StorefrontCopyFields, savedRevision: string | null) {
  return [writeDocument(STOREFRONT_COPY_DRAFT_ID, fields, savedRevision)];
}

export function buildCopyPublishMutations(
  fields: StorefrontCopyFields,
  publishedRevision: string | null,
  savedRevision: string | null,
): CopyMutation[] {
  return [
    writeDocument(STOREFRONT_COPY_DOCUMENT_ID, fields, publishedRevision),
    ...(savedRevision ? deleteAtRevision(STOREFRONT_COPY_DRAFT_ID, savedRevision) : []),
  ];
}

async function readSnapshot(store: CopyDocumentStore) {
  const { published, draft } = await store.read();
  return copySnapshotFromDocuments(published, draft);
}

type ParsedInput =
  | { ok: true; fields: StorefrontCopyFields; publishedRevision: string | null; savedRevision: string | null }
  | { ok: false; result: CopyWriteResult };

function parseInput(input: CopyWriteInput): ParsedInput {
  const publishedRevision = parseRevision(input?.publishedRevision);
  const savedRevision = parseRevision(input?.savedRevision);

  if (!publishedRevision.ok || !savedRevision.ok) {
    return { ok: false, result: { status: "invalid", message: "La solicitud no es válida. Recargá la página.", issues: [] } };
  }

  const sanitized = sanitizeStorefrontCopyFields(input?.draft);

  if (!sanitized.ok) {
    return { ok: false, result: { status: "invalid", message: "Hay textos que no se pueden guardar.", issues: sanitized.issues } };
  }

  return { ok: true, fields: sanitized.fields, publishedRevision: publishedRevision.value, savedRevision: savedRevision.value };
}

async function commitOrConflict(
  store: CopyDocumentStore,
  mutations: CopyMutation[],
): Promise<{ ok: true } | { ok: false; result: CopyWriteResult }> {
  try {
    await store.commit(mutations);
    return { ok: true };
  } catch (error) {
    if (error instanceof CopyRevisionConflictError) {
      try {
        return { ok: false, result: { status: "conflict", message: CONFLICT_MESSAGE, snapshot: await readSnapshot(store) } };
      } catch {
        return { ok: false, result: { status: "error", message: CONFLICT_MESSAGE } };
      }
    }

    throw error;
  }
}

async function successAfterCommit(store: CopyDocumentStore, message: string): Promise<CopyWriteResult> {
  try {
    return { status: "success", message, snapshot: await readSnapshot(store) };
  } catch {
    return { status: "success", message: `${message} Recargá la página para ver el estado actualizado.`, snapshot: null };
  }
}

/** Writes only `drafts.storefrontCopy`; the store and its cache are untouched. */
export async function saveCopyDraft(store: CopyDocumentStore, input: CopyWriteInput): Promise<CopyWriteResult> {
  const parsed = parseInput(input);

  if (!parsed.ok) {
    return parsed.result;
  }

  const committed = await commitOrConflict(store, buildCopySaveDraftMutations(parsed.fields, parsed.savedRevision));

  return committed.ok ? successAfterCommit(store, "Borrador guardado. La tienda no cambió.") : committed.result;
}

/** Publishes and removes the saved draft in one transaction; the cache is invalidated only after the commit. */
export async function publishCopy(
  store: CopyDocumentStore,
  input: CopyWriteInput,
  onPublished: () => void,
): Promise<CopyWriteResult> {
  const parsed = parseInput(input);

  if (!parsed.ok) {
    return parsed.result;
  }

  const committed = await commitOrConflict(
    store,
    buildCopyPublishMutations(parsed.fields, parsed.publishedRevision, parsed.savedRevision),
  );

  if (!committed.ok) {
    return committed.result;
  }

  onPublished();

  return successAfterCommit(store, "Textos publicados. La tienda los muestra en la próxima visita.");
}

export async function discardCopyDraft(store: CopyDocumentStore, input: { savedRevision: unknown }): Promise<CopyWriteResult> {
  const savedRevision = parseRevision(input?.savedRevision);

  if (!savedRevision.ok || savedRevision.value === null) {
    return { status: "invalid", message: "No hay un borrador guardado para descartar.", issues: [] };
  }

  const committed = await commitOrConflict(store, deleteAtRevision(STOREFRONT_COPY_DRAFT_ID, savedRevision.value));

  return committed.ok ? successAfterCommit(store, "Borrador descartado.") : committed.result;
}

export async function readCopySnapshot(store: CopyDocumentStore) {
  return readSnapshot(store);
}

/** Permission first, then credentials; unexpected errors become a message. */
export async function guardCopyWrite(
  isAllowed: () => Promise<boolean>,
  store: CopyDocumentStore | null,
  run: (store: CopyDocumentStore) => Promise<CopyWriteResult>,
  onError: (error: unknown) => void = () => {},
): Promise<CopyWriteResult> {
  if (!(await isAllowed())) {
    return { status: "forbidden", message: "Tu usuario no tiene permiso para modificar los textos de la tienda." };
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
