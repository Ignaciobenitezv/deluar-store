import assert from "node:assert/strict";
import test from "node:test";
import {
  STOREFRONT_COPY_DOCUMENT_ID,
  STOREFRONT_COPY_DRAFT_ID,
} from "@/features/storefront-copy/storefront-copy-document";
import {
  CopyRevisionConflictError,
  discardCopyDraft,
  guardCopyWrite,
  publishCopy,
  saveCopyDraft,
  type CopyDocumentStore,
  type CopyMutation,
} from "./storefront-copy-service";

type Doc = Record<string, unknown> & { _id: string; _rev: string };

/** In-memory Sanity: revision checks, create-over-existing and patch-of-missing conflicts. */
function memoryStore(initial: Doc[] = []) {
  const docs = new Map(initial.map((doc) => [doc._id, doc]));
  let revision = 0;

  const store: CopyDocumentStore = {
    async read() {
      return { published: docs.get(STOREFRONT_COPY_DOCUMENT_ID) ?? null, draft: docs.get(STOREFRONT_COPY_DRAFT_ID) ?? null };
    },
    async commit(mutations: CopyMutation[]) {
      const next = new Map(docs);

      for (const mutation of mutations) {
        if ("create" in mutation) {
          if (next.has(mutation.create._id)) throw new CopyRevisionConflictError();
          next.set(mutation.create._id, { ...mutation.create, _rev: `r${++revision}` } as Doc);
        } else if ("patch" in mutation) {
          const current = next.get(mutation.patch.id);
          if (!current || (mutation.patch.ifRevisionID && current._rev !== mutation.patch.ifRevisionID)) {
            throw new CopyRevisionConflictError();
          }
          next.set(mutation.patch.id, { ...current, ...mutation.patch.set, _rev: `r${++revision}` });
        } else {
          next.delete(mutation.delete.id);
        }
      }

      docs.clear();
      for (const [id, doc] of next) docs.set(id, doc);
    },
  };

  return { store, docs };
}

const draft = { benefits: { paymentTitle: "30% OFF" } };

test("saving writes only the draft", async () => {
  const { store, docs } = memoryStore();
  const result = await saveCopyDraft(store, { draft, publishedRevision: null, savedRevision: null });

  assert.equal(result.status, "success");
  assert.equal(docs.has(STOREFRONT_COPY_DOCUMENT_ID), false);
  assert.deepEqual(docs.get(STOREFRONT_COPY_DRAFT_ID)?.benefits, { paymentTitle: "30% OFF" });
  assert.equal(result.status === "success" && result.snapshot?.saved?.copy.benefits.paymentTitle, "30% OFF");
});

test("publishing writes the document, removes the draft and invalidates the cache", async () => {
  const { store, docs } = memoryStore();
  await saveCopyDraft(store, { draft, publishedRevision: null, savedRevision: null });
  const savedRevision = docs.get(STOREFRONT_COPY_DRAFT_ID)?._rev;
  let invalidated = false;

  const result = await publishCopy(store, { draft, publishedRevision: null, savedRevision }, () => {
    invalidated = true;
  });

  assert.equal(result.status, "success");
  assert.equal(invalidated, true);
  assert.equal(docs.has(STOREFRONT_COPY_DRAFT_ID), false);
  assert.deepEqual(docs.get(STOREFRONT_COPY_DOCUMENT_ID)?.benefits, { paymentTitle: "30% OFF" });
});

test("a restored text disappears from the published document", async () => {
  const { store, docs } = memoryStore([
    { _id: STOREFRONT_COPY_DOCUMENT_ID, _rev: "a", benefits: { paymentTitle: "30% OFF", shippingTitle: "Gratis" } },
  ]);

  const result = await publishCopy(
    store,
    { draft: { benefits: { shippingTitle: "Gratis" } }, publishedRevision: "a", savedRevision: null },
    () => {},
  );

  assert.equal(result.status, "success");
  assert.deepEqual(docs.get(STOREFRONT_COPY_DOCUMENT_ID)?.benefits, { shippingTitle: "Gratis" });
});

test("a stale revision is a conflict and nothing is overwritten", async () => {
  const { store, docs } = memoryStore([{ _id: STOREFRONT_COPY_DOCUMENT_ID, _rev: "new", benefits: { paymentTitle: "40% OFF" } }]);
  let invalidated = false;

  const result = await publishCopy(store, { draft, publishedRevision: "old", savedRevision: null }, () => {
    invalidated = true;
  });

  assert.equal(result.status, "conflict");
  assert.equal(invalidated, false);
  assert.deepEqual(docs.get(STOREFRONT_COPY_DOCUMENT_ID)?.benefits, { paymentTitle: "40% OFF" });
  assert.equal(result.status === "conflict" && result.snapshot.published.copy.benefits.paymentTitle, "40% OFF");
});

test("invalid texts are rejected before any write", async () => {
  const { store, docs } = memoryStore();
  const result = await saveCopyDraft(store, {
    draft: { footer: { instagramUrl: "javascript:alert(1)" } },
    publishedRevision: null,
    savedRevision: null,
  });

  assert.equal(result.status, "invalid");
  assert.equal(docs.size, 0);
});

test("discarding needs the saved revision", async () => {
  const { store, docs } = memoryStore([{ _id: STOREFRONT_COPY_DRAFT_ID, _rev: "d1", offers: { title: "x" } }]);

  assert.equal((await discardCopyDraft(store, { savedRevision: "other" })).status, "conflict");
  assert.equal(docs.has(STOREFRONT_COPY_DRAFT_ID), true);
  assert.equal((await discardCopyDraft(store, { savedRevision: "d1" })).status, "success");
  assert.equal(docs.has(STOREFRONT_COPY_DRAFT_ID), false);
});

test("the permission check runs before anything else", async () => {
  let ran = false;
  const result = await guardCopyWrite(
    async () => false,
    memoryStore().store,
    async () => {
      ran = true;
      return { status: "error", message: "" };
    },
  );

  assert.equal(result.status, "forbidden");
  assert.equal(ran, false);
});
