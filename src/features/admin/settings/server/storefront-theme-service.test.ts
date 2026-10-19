import assert from "node:assert/strict";
import test from "node:test";
import { STOREFRONT_THEME_DOCUMENT_ID, STOREFRONT_THEME_DRAFT_ID } from "../../../theme/storefront-theme-document";
import { resolveStorefrontTheme } from "../../../theme/storefront-theme-document";
import {
  ThemeRevisionConflictError,
  contrastWarningsOf,
  discardThemeDraft,
  guardThemeWrite,
  publishTheme,
  saveThemeDraft,
  type ThemeDocumentStore,
  type ThemeMutation,
} from "./storefront-theme-service";

// In-memory stand-in for Sanity with the semantics the flow relies on:
// atomic transactions, create fails on an existing id, patch fails on a
// missing document or a stale ifRevisionID (Sanity answers both with 409).
type Doc = Record<string, unknown> & { _id: string; _rev: string };

function createFakeStore(initial: Doc[] = []) {
  let docs = new Map(initial.map((doc) => [doc._id, { ...doc }]));
  let revisionCounter = 0;
  const commits: ThemeMutation[][] = [];
  const state = { failNextCommit: null as Error | null, failReads: false };

  const store: ThemeDocumentStore = {
    async read() {
      if (state.failReads) {
        throw new Error("read failed");
      }

      return { published: docs.get(STOREFRONT_THEME_DOCUMENT_ID) ?? null, draft: docs.get(STOREFRONT_THEME_DRAFT_ID) ?? null };
    },
    async commit(mutations) {
      if (state.failNextCommit) {
        const error = state.failNextCommit;
        state.failNextCommit = null;
        throw error;
      }

      const next = new Map([...docs].map(([id, doc]) => [id, { ...doc }]));

      for (const mutation of mutations) {
        if ("create" in mutation) {
          if (next.has(mutation.create._id)) {
            throw new ThemeRevisionConflictError("already exists");
          }

          next.set(mutation.create._id, { ...mutation.create, _rev: `rev${++revisionCounter}` });
        } else if ("patch" in mutation) {
          const doc = next.get(mutation.patch.id);

          if (!doc || (mutation.patch.ifRevisionID && doc._rev !== mutation.patch.ifRevisionID)) {
            throw new ThemeRevisionConflictError("revision mismatch");
          }

          const patched: Doc = { ...doc, ...mutation.patch.set, _rev: `rev${++revisionCounter}` };

          for (const key of mutation.patch.unset ?? []) {
            delete patched[key];
          }

          next.set(mutation.patch.id, patched);
        } else {
          next.delete(mutation.delete.id);
        }
      }

      docs = next;
      commits.push(mutations);
    },
  };

  return { store, state, commits, get: (id: string) => docs.get(id) ?? null };
}

const COLORS = { canvas: "#f2f0eb", surface: "#fcfbf8", ink: "#1f2a33", cta: "#1f2a33", brand: "#2f4a5c", promo: "#b3122e" };
const CUSTOM = { preset: "custom", colors: COLORS, overrides: {} };
const published = (fields: Record<string, unknown>, rev = "p1"): Doc => ({ _id: STOREFRONT_THEME_DOCUMENT_ID, _type: "storefrontTheme", _rev: rev, ...fields });
const draft = (fields: Record<string, unknown>, rev = "d1"): Doc => ({ _id: STOREFRONT_THEME_DRAFT_ID, _type: "storefrontTheme", _rev: rev, ...fields });

test("save draft: creates only drafts.storefrontTheme, published untouched, no cache refresh", async () => {
  const fake = createFakeStore([published({ preset: "deluar-editorial" })]);
  const result = await saveThemeDraft(fake.store, { draft: CUSTOM, publishedRevision: "p1", savedRevision: null });

  assert.equal(result.status, "success");
  assert.deepEqual(fake.get(STOREFRONT_THEME_DOCUMENT_ID), published({ preset: "deluar-editorial" }));
  assert.equal(fake.get(STOREFRONT_THEME_DRAFT_ID)?.preset, "custom");
  assert.equal(result.status === "success" && result.snapshot?.saved?.status, "valid");
  assert.ok(fake.commits.flat().every((mutation) => !("patch" in mutation && mutation.patch.id === STOREFRONT_THEME_DOCUMENT_ID)));
});

test("save draft: a draft failing AA can be saved (work in progress), invalid hex cannot", async () => {
  const fake = createFakeStore();

  assert.equal((await saveThemeDraft(fake.store, { draft: { ...CUSTOM, colors: { ...COLORS, ink: "#cfcac2" } }, publishedRevision: null, savedRevision: null })).status, "success");

  const invalid = await saveThemeDraft(fake.store, { draft: { ...CUSTOM, colors: { ...COLORS, ink: "red" } }, publishedRevision: null, savedRevision: "rev1" });
  assert.equal(invalid.status, "invalid");
  assert.equal(fake.commits.length, 1);
});

test("save draft: sanitised (normalised hex, preset leftovers dropped, unknown keys rejected)", async () => {
  const fake = createFakeStore([draft({ preset: "custom", colors: COLORS, overrides: { line: "#dddddd" } })]);

  await saveThemeDraft(fake.store, { draft: { preset: "actual", colors: { canvas: "#000" } }, publishedRevision: null, savedRevision: "d1" });
  const stored = fake.get(STOREFRONT_THEME_DRAFT_ID);
  assert.equal(stored?.preset, "actual");
  assert.equal("colors" in (stored ?? {}), false);
  assert.equal("overrides" in (stored ?? {}), false);

  const rejected = await saveThemeDraft(fake.store, {
    draft: { ...CUSTOM, overrides: { injected: "#000000" } },
    publishedRevision: null,
    savedRevision: stored?._rev,
  });
  assert.equal(rejected.status, "invalid");

  const badRevision = await saveThemeDraft(fake.store, { draft: CUSTOM, publishedRevision: "x\"}]", savedRevision: null });
  assert.equal(badRevision.status, "invalid");
});

test("save draft: stale draft revision or a draft created meanwhile is a conflict, never an overwrite", async () => {
  const fake = createFakeStore([draft({ preset: "actual" }, "d2")]);

  const stale = await saveThemeDraft(fake.store, { draft: CUSTOM, publishedRevision: null, savedRevision: "d1" });
  assert.equal(stale.status, "conflict");
  assert.equal(stale.status === "conflict" && stale.snapshot.saved?.revision, "d2");
  assert.equal(fake.get(STOREFRONT_THEME_DRAFT_ID)?.preset, "actual");

  const createdMeanwhile = await saveThemeDraft(fake.store, { draft: CUSTOM, publishedRevision: null, savedRevision: null });
  assert.equal(createdMeanwhile.status, "conflict");
  assert.equal(fake.get(STOREFRONT_THEME_DRAFT_ID)?.preset, "actual");
});

const LOW_CONTRAST = { ...CUSTOM, colors: { ...COLORS, ink: "#cfcac2" } };

test("scenario: valid and accessible palette publishes normally, no confirmation needed", async () => {
  const fake = createFakeStore([published({ preset: "deluar-editorial" })]);
  let invalidated = 0;

  assert.deepEqual(contrastWarningsOf({ preset: "custom", colors: COLORS, overrides: {} }), []);

  const result = await publishTheme(fake.store, { draft: CUSTOM, publishedRevision: "p1", savedRevision: null }, () => invalidated++);

  assert.equal(result.status, "success");
  assert.equal(result.status === "success" && result.message, "Paleta publicada. La tienda la muestra en la próxima visita.");
  assert.equal(fake.get(STOREFRONT_THEME_DOCUMENT_ID)?.preset, "custom");
  assert.equal(invalidated, 1);
});

test("scenario: valid palette with WCAG warnings needs confirmation, then publishes as is", async () => {
  const fake = createFakeStore([published({ preset: "deluar-editorial" })]);
  let invalidated = 0;
  const input = { draft: LOW_CONTRAST, publishedRevision: "p1", savedRevision: null };

  // Without the acknowledgement (stale UI, direct call): nothing is written.
  const unconfirmed = await publishTheme(fake.store, input, () => invalidated++);
  assert.equal(unconfirmed.status, "needs_confirmation");
  assert.ok(unconfirmed.status === "needs_confirmation" && unconfirmed.issues.includes("Texto sobre fondo"));
  assert.match(unconfirmed.status === "needs_confirmation" ? unconfirmed.message : "", /\d+ advertencias de contraste/);
  assert.equal(fake.commits.length, 0);
  assert.equal(invalidated, 0);

  // Only a literal true counts as confirmation.
  const truthyString = await publishTheme(fake.store, { ...input, acknowledgeContrastWarnings: "true" }, () => invalidated++);
  assert.equal(truthyString.status, "needs_confirmation");

  const confirmed = await publishTheme(fake.store, { ...input, acknowledgeContrastWarnings: true }, () => invalidated++);
  assert.equal(confirmed.status, "success");
  assert.match(confirmed.status === "success" ? confirmed.message : "", /Paleta publicada con \d+ advertencias de contraste/);
  assert.equal((fake.get(STOREFRONT_THEME_DOCUMENT_ID)?.colors as Record<string, string>).ink, "#cfcac2");
  assert.equal(invalidated, 1);

  // The storefront renders exactly what was published, not the default preset.
  const rendered = resolveStorefrontTheme(fake.get(STOREFRONT_THEME_DOCUMENT_ID));
  assert.deepEqual(rendered.source, { kind: "custom" });
  assert.equal(rendered.tokens.ink, "#cfcac2");
  // The editor reads it back as published, not invalid.
  assert.equal(confirmed.status === "success" && confirmed.snapshot?.published.status, "published");
});

test("publish: invalid or incomplete data stays blocked, even when acknowledged", async () => {
  const fake = createFakeStore([published({ preset: "deluar-editorial" })]);
  const base = { publishedRevision: "p1", savedRevision: null, acknowledgeContrastWarnings: true };

  for (const draft of [
    { ...CUSTOM, colors: { ...COLORS, ink: "red" } },
    { ...CUSTOM, colors: { canvas: "#ffffff" } },
    { ...CUSTOM, colors: { ...COLORS, canvas: "#fff;}body{display:none" } },
    { ...CUSTOM, overrides: { injected: "#000000" } },
    { preset: "neon" },
  ]) {
    assert.equal((await publishTheme(fake.store, { ...base, draft }, () => {})).status, "invalid", JSON.stringify(draft));
  }

  assert.equal(fake.commits.length, 0);
});

test("publish with warnings keeps revision locking: a stale revision still conflicts", async () => {
  const fake = createFakeStore([published({ preset: "actual" }, "p2")]);

  const result = await publishTheme(
    fake.store,
    { draft: LOW_CONTRAST, publishedRevision: "p1", savedRevision: null, acknowledgeContrastWarnings: true },
    () => {},
  );

  assert.equal(result.status, "conflict");
  assert.equal(fake.get(STOREFRONT_THEME_DOCUMENT_ID)?.preset, "actual");
});

test("publish: replaces the published document, removes the saved draft, then refreshes the cache", async () => {
  const fake = createFakeStore([published({ preset: "deluar-editorial" }), draft(CUSTOM)]);
  const order: string[] = [];
  const store: ThemeDocumentStore = {
    read: fake.store.read,
    commit: async (mutations) => {
      await fake.store.commit(mutations);
      order.push("commit");
    },
  };

  const result = await publishTheme(store, { draft: CUSTOM, publishedRevision: "p1", savedRevision: "d1" }, () => order.push("invalidate"));

  assert.equal(result.status, "success");
  assert.deepEqual(order, ["commit", "invalidate"]);
  assert.equal(fake.get(STOREFRONT_THEME_DOCUMENT_ID)?.preset, "custom");
  assert.deepEqual(fake.get(STOREFRONT_THEME_DOCUMENT_ID)?.colors, COLORS);
  assert.equal(fake.get(STOREFRONT_THEME_DRAFT_ID), null);
  assert.equal(result.status === "success" && result.snapshot?.saved, null);
  assert.equal(fake.commits.length, 1, "one atomic transaction");
});

test("publish: first publication creates the document; a concurrent first publication conflicts", async () => {
  const fake = createFakeStore();

  assert.equal((await publishTheme(fake.store, { draft: { preset: "actual" }, publishedRevision: null, savedRevision: null }, () => {})).status, "success");
  assert.equal(fake.get(STOREFRONT_THEME_DOCUMENT_ID)?.preset, "actual");

  // Second admin also believed nothing was published.
  const second = await publishTheme(fake.store, { draft: CUSTOM, publishedRevision: null, savedRevision: null }, () => {});
  assert.equal(second.status, "conflict");
  assert.equal(fake.get(STOREFRONT_THEME_DOCUMENT_ID)?.preset, "actual");
});

test("publish: stale published or draft revision conflicts atomically, no cache refresh", async () => {
  const fake = createFakeStore([published({ preset: "actual" }, "p2"), draft(CUSTOM, "d1")]);
  let invalidated = 0;

  const stalePublished = await publishTheme(fake.store, { draft: CUSTOM, publishedRevision: "p1", savedRevision: "d1" }, () => invalidated++);
  assert.equal(stalePublished.status, "conflict");

  // Published revision is right but the draft changed: nothing is published either.
  const staleDraft = await publishTheme(fake.store, { draft: CUSTOM, publishedRevision: "p2", savedRevision: "d0" }, () => invalidated++);
  assert.equal(staleDraft.status, "conflict");
  assert.equal(fake.get(STOREFRONT_THEME_DOCUMENT_ID)?.preset, "actual");
  assert.ok(fake.get(STOREFRONT_THEME_DRAFT_ID));
  assert.equal(invalidated, 0);
  assert.equal(fake.commits.length, 0);
});

test("publish: Sanity failure is reported as an error, not success, and nothing is invalidated", async () => {
  const fake = createFakeStore([published({ preset: "actual" })]);
  fake.state.failNextCommit = new Error("network down");
  let invalidated = 0;

  const result = await guardThemeWrite(
    async () => true,
    fake.store,
    (store) => publishTheme(store, { draft: CUSTOM, publishedRevision: "p1", savedRevision: null }, () => invalidated++),
  );

  assert.equal(result.status, "error");
  assert.equal(invalidated, 0);
  assert.equal(fake.get(STOREFRONT_THEME_DOCUMENT_ID)?.preset, "actual");
});

test("publish: success is reported once committed even if the re-read fails", async () => {
  const fake = createFakeStore([published({ preset: "actual" })]);
  const store: ThemeDocumentStore = {
    read: fake.store.read,
    commit: async (mutations) => {
      await fake.store.commit(mutations);
      fake.state.failReads = true;
    },
  };

  const result = await publishTheme(store, { draft: CUSTOM, publishedRevision: "p1", savedRevision: null }, () => {});
  assert.equal(result.status, "success");
  assert.equal(result.status === "success" && result.snapshot, null);
});

test("discard draft: deletes only the draft, revision-checked", async () => {
  const fake = createFakeStore([published({ preset: "actual" }), draft(CUSTOM, "d3")]);

  assert.equal((await discardThemeDraft(fake.store, { savedRevision: "d1" })).status, "conflict");
  assert.ok(fake.get(STOREFRONT_THEME_DRAFT_ID));

  assert.equal((await discardThemeDraft(fake.store, { savedRevision: "d3" })).status, "success");
  assert.equal(fake.get(STOREFRONT_THEME_DRAFT_ID), null);
  assert.equal(fake.get(STOREFRONT_THEME_DOCUMENT_ID)?.preset, "actual");

  assert.equal((await discardThemeDraft(fake.store, { savedRevision: null })).status, "invalid");
});

test("permissions: a refused user never reaches the store", async () => {
  const fake = createFakeStore();
  let ran = false;

  const result = await guardThemeWrite(async () => false, fake.store, async () => {
    ran = true;
    return { status: "success", message: "", snapshot: null };
  });

  assert.equal(result.status, "forbidden");
  assert.equal(ran, false);
  assert.equal(fake.commits.length, 0);

  assert.equal((await guardThemeWrite(async () => true, null, async () => ({ status: "success", message: "", snapshot: null }))).status, "unavailable");
});
