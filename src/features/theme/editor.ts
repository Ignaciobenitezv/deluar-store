import { normalizeHex } from "@/features/theme/color";
import { deriveThemeTokens } from "@/features/theme/derive";
import { DEFAULT_THEME_PRESET_ID, THEME_PRESETS } from "@/features/theme/presets";
import {
  CUSTOM_THEME_PRESET,
  resolveStorefrontTheme,
  sanitizeStorefrontThemeFields,
  themeInputFromFields,
  type StorefrontThemeFields,
} from "@/features/theme/storefront-theme-document";
import type {
  DerivedTokenName,
  StorefrontTheme,
  ThemeBaseColors,
  ThemeInput,
  ThemePresetId,
  ThemeTokens,
} from "@/features/theme/types";
import { validateThemeTokens, type ThemeValidation } from "@/features/theme/validate";

// Admin palette editor model. Pure on purpose: the same functions the
// storefront uses (deriveThemeTokens, validateThemeTokens and, for "what would
// the store render", resolveStorefrontTheme) so the preview can never disagree
// with the published result.

export type ThemeEditorSelection = ThemePresetId | typeof CUSTOM_THEME_PRESET;

/** What the editor edits; maps 1:1 to the Sanity `storefrontTheme` fields. */
export type ThemeEditorDraft = {
  preset: ThemeEditorSelection;
  /** Always the six visible colours: a preset's own base, or the custom ones. */
  colors: ThemeBaseColors;
  /** Pinned derived tokens; only stored for a custom palette. */
  overrides: NonNullable<ThemeInput["overrides"]>;
};

/** A stored document as the editor sees it. `revision` is Sanity's `_rev`. */
type DocumentSnapshot = {
  draft: ThemeEditorDraft;
  revision: string | null;
  updatedAt: string | null;
};

/** What is live. "invalid": the store ignores it and shows the default preset. */
export type PublishedThemeSnapshot = DocumentSnapshot & { status: "published" | "missing" | "invalid" };

/**
 * The saved draft (`drafts.storefrontTheme`). "invalid": its values cannot be
 * read (written outside the panel); it can still be discarded by revision.
 */
export type SavedThemeDraft = DocumentSnapshot & { status: "valid" | "invalid" };

/** Server truth: what is published and what is saved, each with its revision. */
export type ThemeEditorSnapshot = {
  published: PublishedThemeSnapshot;
  saved: SavedThemeDraft | null;
};

export type ThemeEditorState = ThemeEditorSnapshot & {
  /** Local working copy; survives any failed operation. */
  draft: ThemeEditorDraft;
  /** Newer server state that rejected a write; never applied automatically. */
  conflict: ThemeEditorSnapshot | null;
};

export type ThemeEditorAction =
  | { type: "selectPreset"; preset: ThemePresetId }
  | { type: "selectCustom" }
  | { type: "setColor"; key: keyof ThemeBaseColors; value: string }
  | { type: "setOverride"; key: DerivedTokenName; value: string }
  | { type: "clearOverride"; key: DerivedTokenName }
  | { type: "discardLocalChanges" }
  /** After a successful write: new server state; the local draft is kept. */
  | { type: "synced"; snapshot: ThemeEditorSnapshot }
  | { type: "conflict"; remote: ThemeEditorSnapshot }
  /** Conflict resolution: take the remote state, dropping local edits. */
  | { type: "reloadRemote" }
  /** Conflict resolution: keep local edits on top of the remote revisions (explicit overwrite next). */
  | { type: "keepLocalChanges" };

export const THEME_BASE_COLOR_KEYS = ["canvas", "surface", "ink", "cta", "brand", "promo"] as const satisfies readonly (keyof ThemeBaseColors)[];

export function presetDraft(id: ThemePresetId): ThemeEditorDraft {
  return { preset: id, colors: { ...THEME_PRESETS[id].base }, overrides: {} };
}

export function draftFromFields(fields: StorefrontThemeFields): ThemeEditorDraft {
  return fields.preset === CUSTOM_THEME_PRESET
    ? { preset: CUSTOM_THEME_PRESET, colors: { ...fields.colors }, overrides: { ...fields.overrides } }
    : presetDraft(fields.preset);
}

/** The draft as the Sanity document fields it will be stored as. */
export function draftToFields(draft: ThemeEditorDraft): StorefrontThemeFields {
  return draft.preset === CUSTOM_THEME_PRESET
    ? { preset: CUSTOM_THEME_PRESET, colors: { ...draft.colors }, overrides: { ...draft.overrides } }
    : { preset: draft.preset };
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function documentMeta(document: unknown) {
  const record = isRecord(document) ? document : null;

  return {
    revision: typeof record?._rev === "string" ? record._rev : null,
    updatedAt: typeof record?._updatedAt === "string" ? record._updatedAt : null,
  };
}

/** Published Sanity document (untrusted) to the snapshot the editor starts from. */
export function publishedSnapshotFromDocument(document: unknown): PublishedThemeSnapshot {
  const meta = documentMeta(document);
  const theme = resolveStorefrontTheme(document);
  const sanitized = sanitizeStorefrontThemeFields(document);

  if (theme.source.kind !== "fallback" && sanitized.ok) {
    return { status: "published", draft: draftFromFields(sanitized.fields), ...meta };
  }

  // Nothing (valid) published: the store shows the default preset, so does the editor.
  return {
    status: theme.source.kind === "fallback" && theme.source.reason === "missing" ? "missing" : "invalid",
    draft: presetDraft(DEFAULT_THEME_PRESET_ID),
    ...meta,
  };
}

/** Both stored documents (untrusted, either may be null) to the editor snapshot. */
export function snapshotFromDocuments(published: unknown, saved: unknown): ThemeEditorSnapshot {
  const publishedSnapshot = publishedSnapshotFromDocument(published);

  if (saved === null || saved === undefined) {
    return { published: publishedSnapshot, saved: null };
  }

  // A saved draft may fail AA (work in progress); it only has to be readable.
  const sanitized = sanitizeStorefrontThemeFields(saved);

  return {
    published: publishedSnapshot,
    saved: sanitized.ok
      ? { status: "valid", draft: draftFromFields(sanitized.fields), ...documentMeta(saved) }
      : { status: "invalid", draft: publishedSnapshot.draft, ...documentMeta(saved) },
  };
}

/** What the editor opens on: the saved draft when readable, else what is live. */
export function baselineDraft(snapshot: ThemeEditorSnapshot): ThemeEditorDraft {
  return snapshot.saved?.status === "valid" ? snapshot.saved.draft : snapshot.published.draft;
}

export function initialEditorState(snapshot: ThemeEditorSnapshot): ThemeEditorState {
  return { ...snapshot, draft: baselineDraft(snapshot), conflict: null };
}

export type DraftEvaluation = {
  /** Tokens of the draft itself, for the preview (even when it fails AA). */
  tokens: ThemeTokens;
  validation: ThemeValidation;
  /** What the storefront would render if this draft were published now. */
  storefront: StorefrontTheme;
};

export function evaluateDraft(draft: ThemeEditorDraft): DraftEvaluation {
  const tokens = deriveThemeTokens(themeInputFromFields(draftToFields(draft)));

  return {
    tokens,
    validation: validateThemeTokens(tokens),
    storefront: resolveStorefrontTheme(draftToFields(draft)),
  };
}

/** Same stored result: compares what would be written, not object identity. */
export function isSameDraft(a: ThemeEditorDraft, b: ThemeEditorDraft) {
  return JSON.stringify(canonical(draftToFields(a))) === JSON.stringify(canonical(draftToFields(b)));
}

function canonical(fields: StorefrontThemeFields) {
  return fields.preset === CUSTOM_THEME_PRESET
    ? { ...fields, overrides: Object.fromEntries(Object.entries(fields.overrides).sort(([a], [b]) => a.localeCompare(b))) }
    : fields;
}

/** Edits not yet saved as a draft. */
export function hasLocalChanges(state: ThemeEditorState) {
  return !isSameDraft(state.draft, baselineDraft(state));
}

/** Anything (saved draft or local edits) that differs from what is live. */
export function hasUnpublishedChanges(state: ThemeEditorState) {
  return state.saved !== null || !isSameDraft(state.draft, state.published.draft);
}

/**
 * A preset turned into a custom palette keeps the preset's pinned tones as
 * overrides, so the store looks exactly the same until a colour is changed.
 */
function asCustom(draft: ThemeEditorDraft): ThemeEditorDraft {
  if (draft.preset === CUSTOM_THEME_PRESET) {
    return draft;
  }

  return {
    preset: CUSTOM_THEME_PRESET,
    colors: { ...draft.colors },
    overrides: { ...THEME_PRESETS[draft.preset].overrides },
  };
}

function withDraft(state: ThemeEditorState, draft: ThemeEditorDraft): ThemeEditorState {
  return isSameDraft(draft, state.draft) && draft.preset === state.draft.preset ? state : { ...state, draft };
}

export function themeEditorReducer(state: ThemeEditorState, action: ThemeEditorAction): ThemeEditorState {
  switch (action.type) {
    case "selectPreset":
      return withDraft(state, presetDraft(action.preset));
    case "selectCustom":
      return withDraft(state, asCustom(state.draft));
    case "setColor": {
      const value = normalizeHex(action.value);

      if (!value || value === state.draft.colors[action.key]) {
        return state;
      }

      const custom = asCustom(state.draft);

      return { ...state, draft: { ...custom, colors: { ...custom.colors, [action.key]: value } } };
    }
    case "setOverride": {
      const value = normalizeHex(action.value);

      if (!value) {
        return state;
      }

      const custom = asCustom(state.draft);

      return withDraft(state, { ...custom, overrides: { ...custom.overrides, [action.key]: value } });
    }
    case "clearOverride": {
      if (state.draft.preset !== CUSTOM_THEME_PRESET || !(action.key in state.draft.overrides)) {
        return state;
      }

      const overrides = { ...state.draft.overrides };
      delete overrides[action.key];

      return { ...state, draft: { ...state.draft, overrides } };
    }
    case "discardLocalChanges":
      return { ...state, draft: baselineDraft(state) };
    case "synced":
      return { ...state, ...action.snapshot, conflict: null };
    case "conflict":
      return { ...state, conflict: action.remote };
    case "reloadRemote":
      return state.conflict ? initialEditorState(state.conflict) : state;
    case "keepLocalChanges":
      return state.conflict ? { ...state, ...state.conflict, conflict: null } : state;
  }
}
