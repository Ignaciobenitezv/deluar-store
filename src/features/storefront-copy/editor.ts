import type { HomeHeroSurface } from "@/features/home/types";
import {
  DEFAULT_STOREFRONT_COPY,
  type HeroSlideImageChoice,
  type HeroSlideTextKey,
  type ProductListId,
  type HeroSurfaceId,
  type SectionImageId,
  type ImageFraming,
  HERO_SLIDES_MAX,
  type HeroSlideTexts,
  type StorefrontCopy,
  type StorefrontCopySectionId,
} from "./fields";
import { copyToFields, resolveStorefrontCopy } from "./storefront-copy-document";
import { isDefaultFraming } from "./framing";

// Admin texts editor model (Configuración → Textos). Pure, same shape as the
// palette editor (features/theme/editor.ts): server snapshot + local working
// copy + a conflict slot that is never applied automatically.

type DocumentSnapshot = {
  copy: StorefrontCopy;
  /** Sanity `_rev`, or null when the document does not exist. */
  revision: string | null;
  updatedAt: string | null;
};

export type CopyEditorSnapshot = {
  published: DocumentSnapshot;
  saved: DocumentSnapshot | null;
};

export type CopyEditorState = CopyEditorSnapshot & {
  /** Local working copy; survives any failed operation. */
  draft: StorefrontCopy;
  conflict: CopyEditorSnapshot | null;
};

export type CopyEditorAction =
  | { type: "setField"; section: StorefrontCopySectionId; key: string; value: string }
  | { type: "resetField"; section: StorefrontCopySectionId; key: string }
  /** `base` is the slide's own text in Studio: matching it (or blank) removes the correction. */
  | { type: "setHeroField"; slideId: string; key: HeroSlideTextKey; value: string; base: string }
  | { type: "resetHeroField"; slideId: string; key: HeroSlideTextKey }
  /** A new photo, no photo, or null to go back to the Studio one. */
  | { type: "setHeroImage"; slideId: string; image: HeroSlideImageChoice | null }
  /** Picked products in order; null (or empty) goes back to the automatic source. */
  | { type: "setHeroProducts"; slideId: string; products: string[] | null }
  | { type: "setProductList"; list: ProductListId; products: string[] | null }
  | { type: "setHeroSurface"; slideId: string; surface: HeroSurfaceId | null }
  /** A block's background photo; null goes back to the original file. */
  | { type: "setSectionImage"; id: SectionImageId; assetRef: string | null }
  /** Hand-set framing; null goes back to centred, no zoom. */
  | { type: "setHeroFraming"; slideId: string; framing: ImageFraming | null }
  | { type: "setSectionFraming"; id: SectionImageId; framing: ImageFraming | null }
  /**
   * Slide list. `studioIds`: Studio's slides in Studio's order, the list the
   * hero shows until the admin first changes it.
   */
  | { type: "addHeroSlide"; id: string; studioIds: string[] }
  | { type: "removeHeroSlide"; slideId: string; studioIds: string[] }
  | { type: "moveHeroSlide"; slideId: string; offset: -1 | 1; studioIds: string[] }
  | { type: "showHeroSlide"; slideId: string; studioIds: string[] }
  /** Back to Studio deciding the slides; created slides are dropped. */
  | { type: "resetHeroSlides" }
  | { type: "discardLocalChanges" }
  | { type: "synced"; snapshot: CopyEditorSnapshot }
  | { type: "conflict"; remote: CopyEditorSnapshot }
  | { type: "reloadRemote" }
  | { type: "keepLocalChanges" };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function documentSnapshot(document: unknown): DocumentSnapshot {
  const record = isRecord(document) ? document : null;

  return {
    copy: resolveStorefrontCopy(document),
    revision: typeof record?._rev === "string" ? record._rev : null,
    updatedAt: typeof record?._updatedAt === "string" ? record._updatedAt : null,
  };
}

/** Both stored documents (untrusted, either may be null) to the editor snapshot. */
export function copySnapshotFromDocuments(published: unknown, saved: unknown): CopyEditorSnapshot {
  return {
    published: documentSnapshot(published),
    saved: saved === null || saved === undefined ? null : documentSnapshot(saved),
  };
}

export function baselineCopy(snapshot: CopyEditorSnapshot) {
  return (snapshot.saved ?? snapshot.published).copy;
}

export function initialCopyEditorState(snapshot: CopyEditorSnapshot): CopyEditorState {
  return { ...snapshot, draft: baselineCopy(snapshot), conflict: null };
}

/** Same stored result: compares what would be written. */
export function isSameCopy(a: StorefrontCopy, b: StorefrontCopy) {
  return JSON.stringify(copyToFields(a)) === JSON.stringify(copyToFields(b));
}

export function hasLocalCopyChanges(state: CopyEditorState) {
  return !isSameCopy(state.draft, baselineCopy(state));
}

export function hasUnpublishedCopyChanges(state: CopyEditorState) {
  return state.saved !== null || !isSameCopy(state.draft, state.published.copy);
}

/** Fields whose text differs from the default, per section. */
export function customizedCount(copy: StorefrontCopy, section: StorefrontCopySectionId) {
  return Object.keys(copyToFields(copy)[section]).length;
}

/** What the product picker and the previews show of a product. */
export type ProductSummary = {
  id: string;
  title: string;
  imageUrl: string | null;
  basePrice: number;
  /** False when the store would skip it (archived, hidden or out of stock). */
  available: boolean;
};

/** A hero slide as the editor shows it: its Studio texts, to correct over. */
export type HeroSlideBase = {
  id: string;
  imageUrl: string | null;
  /** Colour panel used when the slide has no photo. */
  surface: HomeHeroSurface;
  /** The products it shows right now when none are picked (random on every visit). */
  automaticProducts: string[];
  texts: HeroSlideTexts;
};

/** Corrections on one slide: the photo plus texts (blank ones fall back to Studio, so they don't count). */
export function heroCorrectionCount(copy: StorefrontCopy, slideId: string) {
  // `custom` marks a created slide; it is not a correction.
  return Object.entries(copy.heroSlides[slideId] ?? {}).filter(
    ([key, value]) => key !== "custom" && (typeof value === "string" ? value.trim() !== "" : value !== undefined),
  ).length;
}

export function fieldValue(copy: StorefrontCopy, section: StorefrontCopySectionId, key: string) {
  return (copy[section] as Record<string, string>)[key] ?? "";
}

function withField(state: CopyEditorState, section: StorefrontCopySectionId, key: string, value: string): CopyEditorState {
  if (fieldValue(state.draft, section, key) === value) {
    return state;
  }

  return { ...state, draft: { ...state.draft, [section]: { ...state.draft[section], [key]: value } } };
}

function withHeroField(
  state: CopyEditorState,
  slideId: string,
  key: HeroSlideTextKey | "image" | "products" | "surface" | "imageFraming",
  value: string | string[] | HeroSlideImageChoice | ImageFraming | null,
): CopyEditorState {
  const slide = { ...state.draft.heroSlides[slideId] };

  if (value === null) {
    if (!(key in slide)) {
      return state;
    }

    delete slide[key];
  } else {
    if (JSON.stringify(slide[key]) === JSON.stringify(value)) {
      return state;
    }

    (slide as Record<string, unknown>)[key] = value;
  }

  const heroSlides = { ...state.draft.heroSlides };

  if (Object.keys(slide).length > 0) {
    heroSlides[slideId] = slide;
  } else {
    delete heroSlides[slideId];
  }

  return { ...state, draft: { ...state.draft, heroSlides } };
}

/** The slides the hero will show, in order: the managed list, else Studio's. */
export function heroSlideOrderOf(copy: StorefrontCopy, studioIds: string[]) {
  return copy.heroSlideOrder ?? studioIds;
}

function withHeroOrder(state: CopyEditorState, order: string[]): CopyEditorState {
  return { ...state, draft: { ...state.draft, heroSlideOrder: order } };
}

/** A new id for a slide created in the admin; Sanity-key safe and unique enough per document. */
export function newHeroSlideId() {
  return `slide-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export function copyEditorReducer(state: CopyEditorState, action: CopyEditorAction): CopyEditorState {
  switch (action.type) {
    case "setHeroField":
      // Kept while typing even if blank, so the field does not jump back to the Studio text.
      return withHeroField(state, action.slideId, action.key, action.value.trim() === action.base.trim() ? null : action.value);
    case "resetHeroField":
      return withHeroField(state, action.slideId, action.key, null);
    case "setHeroImage":
      // A new photo starts centred.
      return withHeroField(withHeroField(state, action.slideId, "imageFraming", null), action.slideId, "image", action.image);
    case "setHeroProducts":
      return withHeroField(state, action.slideId, "products", action.products?.length ? action.products : null);
    case "setSectionImage": {
      const images = { ...state.draft.images };
      // A framing set for one photo makes no sense for another: back to centred.
      const imageFraming = { ...state.draft.imageFraming };
      delete imageFraming[action.id];

      if (action.assetRef) {
        images[action.id] = action.assetRef;
      } else {
        delete images[action.id];
      }

      return { ...state, draft: { ...state.draft, images, imageFraming } };
    }
    case "setSectionFraming": {
      const imageFraming = { ...state.draft.imageFraming };

      if (action.framing && !isDefaultFraming(action.framing)) {
        imageFraming[action.id] = action.framing;
      } else {
        delete imageFraming[action.id];
      }

      return { ...state, draft: { ...state.draft, imageFraming } };
    }
    case "setHeroFraming":
      return withHeroField(
        state,
        action.slideId,
        "imageFraming",
        action.framing && !isDefaultFraming(action.framing) ? action.framing : null,
      );
    case "setHeroSurface":
      return withHeroField(state, action.slideId, "surface", action.surface);
    case "addHeroSlide": {
      const order = heroSlideOrderOf(state.draft, action.studioIds);

      if (order.length >= HERO_SLIDES_MAX || order.includes(action.id)) {
        return state;
      }

      return withHeroOrder(
        { ...state, draft: { ...state.draft, heroSlides: { ...state.draft.heroSlides, [action.id]: { custom: true, surface: "promo" } } } },
        [...order, action.id],
      );
    }
    case "removeHeroSlide": {
      const order = heroSlideOrderOf(state.draft, action.studioIds);

      // The hero always keeps one slide.
      if (order.length <= 1 || !order.includes(action.slideId)) {
        return state;
      }

      const next = withHeroOrder(state, order.filter((id) => id !== action.slideId));

      // A created slide has no other home: removing it deletes it. A Studio one keeps its corrections, hidden.
      if (state.draft.heroSlides[action.slideId]?.custom) {
        const heroSlides = { ...next.draft.heroSlides };
        delete heroSlides[action.slideId];
        return { ...next, draft: { ...next.draft, heroSlides } };
      }

      return next;
    }
    case "moveHeroSlide": {
      const order = [...heroSlideOrderOf(state.draft, action.studioIds)];
      const index = order.indexOf(action.slideId);
      const target = index + action.offset;

      if (index < 0 || target < 0 || target >= order.length) {
        return state;
      }

      [order[index], order[target]] = [order[target], order[index]];
      return withHeroOrder(state, order);
    }
    case "showHeroSlide": {
      const order = heroSlideOrderOf(state.draft, action.studioIds);

      if (order.length >= HERO_SLIDES_MAX || order.includes(action.slideId)) {
        return state;
      }

      return withHeroOrder(state, [...order, action.slideId]);
    }
    case "resetHeroSlides": {
      const heroSlides = Object.fromEntries(
        Object.entries(state.draft.heroSlides).filter(([, override]) => !override.custom),
      );

      return { ...state, draft: { ...state.draft, heroSlides, heroSlideOrder: null } };
    }
    case "setProductList": {
      const productLists = { ...state.draft.productLists };

      if (action.products?.length) {
        productLists[action.list] = action.products;
      } else {
        delete productLists[action.list];
      }

      return { ...state, draft: { ...state.draft, productLists } };
    }
    case "setField":
      return withField(state, action.section, action.key, action.value);
    case "resetField":
      return withField(state, action.section, action.key, fieldValue(DEFAULT_STOREFRONT_COPY, action.section, action.key));
    case "discardLocalChanges":
      return { ...state, draft: baselineCopy(state) };
    case "synced":
      return { ...state, ...action.snapshot, conflict: null };
    case "conflict":
      return { ...state, conflict: action.remote };
    case "reloadRemote":
      return state.conflict ? initialCopyEditorState(state.conflict) : state;
    case "keepLocalChanges":
      return state.conflict ? { ...state, ...state.conflict, conflict: null } : state;
  }
}
