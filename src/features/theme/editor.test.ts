import assert from "node:assert/strict";
import test from "node:test";
import { deriveThemeTokens } from "./derive";
import {
  draftToFields,
  evaluateDraft,
  hasLocalChanges,
  hasUnpublishedChanges,
  initialEditorState,
  presetDraft,
  publishedSnapshotFromDocument,
  snapshotFromDocuments,
  themeEditorReducer,
} from "./editor";
import { THEME_PRESETS } from "./presets";
import { resolveStorefrontTheme } from "./storefront-theme-document";

const COLORS = { canvas: "#f2f0eb", surface: "#fcfbf8", ink: "#1f2a33", cta: "#1f2a33", brand: "#2f4a5c", promo: "#b3122e" };

const stateFrom = (published: unknown, saved: unknown = null) => initialEditorState(snapshotFromDocuments(published, saved));

test("published snapshot: missing, invalid, preset and custom documents", () => {
  assert.equal(publishedSnapshotFromDocument(null).status, "missing");
  assert.deepEqual(publishedSnapshotFromDocument(null).draft, presetDraft("deluar-editorial"));

  const invalid = publishedSnapshotFromDocument({ preset: "custom", colors: { ...COLORS, ink: "red" }, _rev: "r1" });
  assert.equal(invalid.status, "invalid");
  assert.equal(invalid.revision, "r1");

  // Valid hex but missing AA: the store renders it, so it is simply "published".
  assert.equal(publishedSnapshotFromDocument({ preset: "custom", colors: { ...COLORS, ink: "#cfcac2" } }).status, "published");

  const actual = publishedSnapshotFromDocument({ preset: "actual", _rev: "r2", _updatedAt: "2026-10-10T12:00:00Z" });
  assert.deepEqual(actual, { status: "published", draft: presetDraft("actual"), revision: "r2", updatedAt: "2026-10-10T12:00:00Z" });

  const custom = publishedSnapshotFromDocument({ preset: "custom", colors: { ...COLORS, canvas: "#F2F0EB" }, overrides: { _type: "x", line: "#D9D4CC" } });
  assert.deepEqual(custom.draft, { preset: "custom", colors: COLORS, overrides: { line: "#d9d4cc" } });
});

test("a saved draft is what the editor opens on; an unreadable one is flagged, not used", () => {
  const withDraft = stateFrom({ preset: "actual", _rev: "p1" }, { preset: "custom", colors: COLORS, _rev: "d1" });

  assert.equal(withDraft.saved?.status, "valid");
  assert.equal(withDraft.saved?.revision, "d1");
  assert.equal(withDraft.draft.preset, "custom");
  assert.equal(hasLocalChanges(withDraft), false);
  assert.equal(hasUnpublishedChanges(withDraft), true);

  // A saved draft failing AA is still a valid draft (work in progress).
  assert.equal(stateFrom(null, { preset: "custom", colors: { ...COLORS, ink: "#cfcac2" } }).saved?.status, "valid");

  const unreadable = stateFrom({ preset: "actual" }, { preset: "custom", colors: { ...COLORS, ink: "red" }, _rev: "d2" });
  assert.equal(unreadable.saved?.status, "invalid");
  assert.equal(unreadable.saved?.revision, "d2");
  assert.deepEqual(unreadable.draft, presetDraft("actual"));
});

test("preview tokens use the shared derivation and match the storefront when publishable", () => {
  for (const id of ["actual", "deluar-editorial"] as const) {
    const evaluation = evaluateDraft(presetDraft(id));

    assert.deepEqual(evaluation.tokens, deriveThemeTokens(THEME_PRESETS[id]));
    assert.deepEqual(evaluation.storefront.tokens, evaluation.tokens);
  }

  const custom = { preset: "custom" as const, colors: COLORS, overrides: {} };
  assert.deepEqual(evaluateDraft(custom).tokens, resolveStorefrontTheme(draftToFields(custom)).tokens);
});

test("customising a preset keeps its look: pinned tones carried over as overrides", () => {
  for (const id of ["actual", "deluar-editorial"] as const) {
    const custom = themeEditorReducer(stateFrom({ preset: id }), { type: "selectCustom" });

    assert.equal(custom.draft.preset, "custom");
    assert.deepEqual(custom.draft.overrides, THEME_PRESETS[id].overrides);
    assert.deepEqual(evaluateDraft(custom.draft).tokens, deriveThemeTokens(THEME_PRESETS[id]));
  }

  const edited = themeEditorReducer(stateFrom({ preset: "actual" }), { type: "setColor", key: "promo", value: "#A1122A" });
  assert.equal(edited.draft.colors.promo, "#a1122a");
  // Only the edited colour changed; Actual's pinned line/accent stay.
  assert.equal(evaluateDraft(edited.draft).tokens.line, "#ddd0c2");
  assert.equal(evaluateDraft(edited.draft).tokens.accent, "#b69272");
});

test("overrides: only ThemeInput tokens, pinned and released", () => {
  const start = stateFrom(null);
  const pinned = themeEditorReducer(start, { type: "setOverride", key: "accent", value: "#C4AD8F" });

  assert.equal(pinned.draft.preset, "custom");
  assert.equal(pinned.draft.overrides.accent, "#c4ad8f");
  assert.equal(evaluateDraft(pinned.draft).tokens.accent, "#c4ad8f");
  assert.equal(themeEditorReducer(pinned, { type: "setOverride", key: "accent", value: "nope" }), pinned);

  const released = themeEditorReducer(pinned, { type: "clearOverride", key: "accent" });
  assert.equal("accent" in released.draft.overrides, false);
  assert.equal(evaluateDraft(released.draft).tokens.accent, deriveThemeTokens({ base: released.draft.colors }).accent);
});

test("invalid or unchanged colours leave the draft alone", () => {
  const start = stateFrom(null);

  assert.equal(themeEditorReducer(start, { type: "setColor", key: "ink", value: "#12" }), start);
  assert.equal(themeEditorReducer(start, { type: "setColor", key: "ink", value: "url(x)" }), start);
  assert.equal(themeEditorReducer(start, { type: "setColor", key: "ink", value: THEME_PRESETS["deluar-editorial"].base.ink }), start);
});

test("restoring a preset is only a local change; discarding returns to the baseline", () => {
  const start = stateFrom({ preset: "actual" });
  const restored = themeEditorReducer(start, { type: "selectPreset", preset: "deluar-editorial" });

  assert.equal(hasLocalChanges(restored), true);
  assert.equal(restored.published.draft.preset, "actual");
  assert.equal(hasLocalChanges(themeEditorReducer(restored, { type: "discardLocalChanges" })), false);
});

test("sync keeps local edits; conflicts are never applied until the admin chooses", () => {
  const start = stateFrom({ preset: "actual", _rev: "p1" });
  const edited = themeEditorReducer(start, { type: "setColor", key: "brand", value: "#2f4a5c" });
  const remote = snapshotFromDocuments({ preset: "deluar-editorial", _rev: "p2" }, null);

  const inConflict = themeEditorReducer(edited, { type: "conflict", remote });
  assert.equal(inConflict.published.revision, "p1");
  assert.deepEqual(inConflict.draft, edited.draft);

  const reloaded = themeEditorReducer(inConflict, { type: "reloadRemote" });
  assert.equal(reloaded.published.revision, "p2");
  assert.deepEqual(reloaded.draft, presetDraft("deluar-editorial"));
  assert.equal(reloaded.conflict, null);

  const kept = themeEditorReducer(inConflict, { type: "keepLocalChanges" });
  assert.equal(kept.published.revision, "p2");
  assert.deepEqual(kept.draft, edited.draft);
  assert.equal(kept.conflict, null);

  const saved = snapshotFromDocuments({ preset: "actual", _rev: "p1" }, { ...draftToFields(edited.draft), _rev: "d1" });
  const synced = themeEditorReducer(edited, { type: "synced", snapshot: saved });
  assert.equal(synced.saved?.revision, "d1");
  assert.equal(hasLocalChanges(synced), false);
});

test("a draft with WCAG AA warnings is previewed as is and is exactly what the storefront would render", () => {
  const state = themeEditorReducer(stateFrom(null), { type: "setColor", key: "ink", value: "#cfcac2" });
  const evaluation = evaluateDraft(state.draft);

  assert.equal(evaluation.tokens.ink, "#cfcac2");
  assert.equal(evaluation.validation.meetsAA, false);
  assert.ok(evaluation.validation.contrastIssues.length > 0);
  assert.deepEqual(evaluation.storefront.source, { kind: "custom" });
  assert.deepEqual(evaluation.storefront.tokens, evaluation.tokens);
});
