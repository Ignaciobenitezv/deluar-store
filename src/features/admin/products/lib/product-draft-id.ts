/**
 * Centralizes the one piece of string-mangling the draft-backed Crear
 * producto flow needs: Sanity stores a document mid-creation as
 * `drafts.<id>` and the same document, once finalized, as `<id>` — the app
 * should never have to re-derive this relationship inline. Everywhere else
 * in the editor (URLs, form fields, `AdminProductDetailData.id`) only ever
 * sees the clean, published-shaped id; only the server actions that talk to
 * Sanity's mutation API need the raw `drafts.` form, and only through these
 * two functions.
 */
export const DRAFT_ID_PREFIX = "drafts.";

export function toDraftId(id: string): string {
  return id.startsWith(DRAFT_ID_PREFIX) ? id : `${DRAFT_ID_PREFIX}${id}`;
}

export function toPublishedId(id: string): string {
  return id.startsWith(DRAFT_ID_PREFIX) ? id.slice(DRAFT_ID_PREFIX.length) : id;
}

export function isDraftId(id: string): boolean {
  return id.startsWith(DRAFT_ID_PREFIX);
}
