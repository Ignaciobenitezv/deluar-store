import {
  DEFAULT_STOREFRONT_COPY,
  HERO_SLIDE_FIELDS,
  HERO_SLIDE_TEXT_KEYS,
  STOREFRONT_COPY_SECTION_IDS,
  sectionFields,
  type CopyFieldDefinition,
  type HeroSlideImageChoice,
  type HeroSlideOverride,
  type HeroSlideOverrides,
  type HeroSlideTexts,
  type ProductListId,
  type ProductLists,
  type StorefrontCopy,
  type StorefrontCopySectionId,
  HERO_PRODUCTS_MAX,
  HERO_SLIDES_MAX,
  HERO_SURFACES,
  type HeroSurfaceId,
  PRODUCT_LISTS,
  PRODUCT_LIST_IDS,
  SECTION_IMAGES,
  SECTION_IMAGE_IDS,
  type SectionImageId,
  type SectionImages,
  type ImageFraming,
} from "./fields";
import { isDefaultFraming, parseImageFraming } from "./framing";

/** Fixed _id of the Sanity singleton; its draft is "drafts.storefrontCopy". */
export const STOREFRONT_COPY_DOCUMENT_ID = "storefrontCopy";

/** Sanity id of the saved (unpublished) draft of the singleton. */
export const STOREFRONT_COPY_DRAFT_ID = `drafts.${STOREFRONT_COPY_DOCUMENT_ID}`;

/** Sanity array item type of a stored hero correction. */
export const HERO_SLIDE_COPY_TYPE = "heroSlideCopy";

type StoredImage = { _type: "image"; asset: { _type: "reference"; _ref: string } };

/**
 * One stored hero correction: the slide's `_key` plus only what was corrected.
 * The replacement photo is a real image reference, so Sanity knows the asset is in use.
 */
export type StoredHeroSlide = { _key: string; _type: typeof HERO_SLIDE_COPY_TYPE } & Partial<HeroSlideTexts> & {
    image?: StoredImage;
    imageRemoved?: true;
    surface?: HeroSurfaceId;
    imageFraming?: ImageFraming;
    custom?: true;
    products?: StoredProductRef[];
  };

/**
 * A picked product. Weak, so a product can still be deleted or archived from
 * Productos while a list points at it; the store just skips it then.
 */
type StoredProductRef = { _key: string; _type: "reference"; _ref: string; _weak: true };

// Published product ids only (never a "drafts." id).
const PRODUCT_ID_PATTERN = /^(?!drafts\.)[A-Za-z0-9._-]{1,128}$/;

export const isProductId = (value: unknown): value is string => typeof value === "string" && PRODUCT_ID_PATTERN.test(value);

const storedProductRefs = (ids: string[]): StoredProductRef[] =>
  ids.map((id, index) => ({ _key: `p${index}`, _type: "reference", _ref: id, _weak: true }));

type ProductRefsReading = { ids: string[]; problem: string | null };

/** Stored references (or plain ids from the editor) to unique valid ids; `problem` when something was off. */
function readProductRefs(raw: unknown, max: number): ProductRefsReading {
  if (raw === undefined || raw === null) {
    return { ids: [], problem: null };
  }

  if (!Array.isArray(raw)) {
    return { ids: [], problem: "no es una lista válida" };
  }

  const ids: string[] = [];
  let problem: string | null = null;

  for (const item of raw) {
    const id = typeof item === "string" ? item : isRecord(item) ? item._ref : undefined;

    if (!isProductId(id)) {
      problem = "tiene un producto inválido";
    } else if (!ids.includes(id)) {
      ids.push(id);
    }
  }

  if (ids.length > max) {
    problem = `admite hasta ${max} productos`;
  }

  return { ids: ids.slice(0, max), problem };
}

// Sanity image asset ids look like "image-<hash>-1800x1200-jpg".
const IMAGE_ASSET_REF_PATTERN = /^image-[A-Za-z0-9]+-\d+x\d+-[a-z0-9]+$/;

export const isImageAssetRef = (value: unknown): value is string =>
  typeof value === "string" && IMAGE_ASSET_REF_PATTERN.test(value);

const storedImage = (assetRef: string): StoredImage => ({
  _type: "image",
  asset: { _type: "reference", _ref: assetRef },
});

/** The photo choice of a stored entry: removed wins over a replacement. */
function imageChoiceOf(item: Record<string, unknown>): HeroSlideImageChoice | undefined | "invalid" {
  if (item.imageRemoved === true) {
    return "removed";
  }

  if (item.image === undefined || item.image === null) {
    return undefined;
  }

  const ref = isRecord(item.image) && isRecord(item.image.asset) ? item.image.asset._ref : undefined;

  return isImageAssetRef(ref) ? { assetRef: ref } : "invalid";
}

/**
 * The document fields as stored: per section, only the texts that differ from
 * their default (a field left out shows its default, so a text can always be
 * restored and a default changed in code reaches every untouched field), and
 * the hero corrections as a keyed array (Sanity's shape for lists).
 */
export type StorefrontCopyFields = {
  [Section in StorefrontCopySectionId]: Partial<SectionsCopy[Section]>;
} & {
  heroSlides: StoredHeroSlide[];
  /** Absent while Studio decides the slides; see StorefrontCopy.heroSlideOrder. */
  heroSlideOrder?: string[];
  productLists: Partial<Record<ProductListId, StoredProductRef[]>>;
  images: Partial<Record<SectionImageId, StoredImage>>;
  imageFraming: Partial<Record<SectionImageId, ImageFraming>>;
};

type SectionsCopy = Omit<StorefrontCopy, "heroSlides" | "heroSlideOrder" | "productLists" | "images" | "imageFraming">;
type SectionsFields = Omit<StorefrontCopyFields, "heroSlides" | "heroSlideOrder" | "productLists" | "images" | "imageFraming">;

export type CopySanitizeResult = { ok: true; fields: StorefrontCopyFields } | { ok: false; issues: string[] };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const PHONE_PATTERN = /^\+?[0-9 ()-]{6,}$/;
const SLIDE_KEY_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;
const MULTILINE_KINDS = new Set(["multiline", "list", "richtext"]);

/** One line, no control characters; multiline kinds keep line breaks (lists drop blank lines). */
function normalizeText(value: string, field: CopyFieldDefinition) {
  const withoutControls = value.replace(/\r\n?/g, "\n").replace(/[\u0000-\u0009\u000B-\u001F\u007F]/g, "");

  if (!MULTILINE_KINDS.has(field.kind ?? "text")) {
    return withoutControls.replace(/\s+/g, " ").trim();
  }

  const lines = withoutControls.split("\n").map((line) => line.replace(/\s+/g, " ").trim());

  return (field.kind === "list" ? lines.filter(Boolean).join("\n") : lines.join("\n").replace(/\n{3,}/g, "\n\n")).trim();
}

function isHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

/** A path inside the store ("/productos", not "//other.site") or an absolute http(s) link. */
function isStoreLink(value: string) {
  return (value.startsWith("/") && !value.startsWith("//") && !/\s/.test(value)) || isHttpUrl(value);
}

/** Null when the value is acceptable for the field, else what is wrong with it. */
export function copyFieldProblem(value: string, field: CopyFieldDefinition): string | null {
  if (value.length > field.maxLength) {
    return `supera los ${field.maxLength} caracteres`;
  }

  if (field.kind === "url" && !isHttpUrl(value)) {
    return "no es un enlace válido (debe empezar con https://)";
  }

  if (field.kind === "link" && !isStoreLink(value)) {
    return "no es un enlace válido (usá una ruta como /productos o un enlace https://)";
  }

  if (field.kind === "phone" && !PHONE_PATTERN.test(value)) {
    return "no es un número válido";
  }

  return null;
}

type FieldReading = { kind: "default" } | { kind: "value"; value: string } | { kind: "invalid"; problem: string };

function readField(raw: unknown, field: CopyFieldDefinition): FieldReading {
  if (raw === undefined || raw === null) {
    return { kind: "default" };
  }

  if (typeof raw !== "string") {
    return { kind: "invalid", problem: "no es texto" };
  }

  const value = normalizeText(raw, field);

  // Empty means "use the default": a text can be cleared, never left blank on the store.
  if (value === "" || value === field.default) {
    return { kind: "default" };
  }

  const problem = copyFieldProblem(value, field);

  return problem ? { kind: "invalid", problem } : { kind: "value", value };
}

type HeroReading = { slides: StoredHeroSlide[]; issues: string[] };

function readHeroSlides(raw: unknown): HeroReading {
  const slides: StoredHeroSlide[] = [];
  const issues: string[] = [];

  if (raw === undefined || raw === null) {
    return { slides, issues };
  }

  if (!Array.isArray(raw)) {
    return { slides, issues: ["Hero: no es válido."] };
  }

  const seen = new Set<string>();

  raw.forEach((item, index) => {
    const key = isRecord(item) ? item._key : undefined;

    if (typeof key !== "string" || !SLIDE_KEY_PATTERN.test(key) || seen.has(key)) {
      issues.push(`Hero: la diapositiva ${index + 1} no es válida.`);
      return;
    }

    seen.add(key);
    const slide: StoredHeroSlide = { _key: key, _type: HERO_SLIDE_COPY_TYPE };

    for (const textKey of HERO_SLIDE_TEXT_KEYS) {
      const field = HERO_SLIDE_FIELDS[textKey];
      const reading = readField((item as Record<string, unknown>)[textKey], field);

      if (reading.kind === "invalid") {
        issues.push(`Hero · ${field.label}: ${reading.problem}.`);
      } else if (reading.kind === "value") {
        slide[textKey] = reading.value;
      }
    }

    const image = imageChoiceOf(item as Record<string, unknown>);

    if (image === "invalid") {
      issues.push("Hero · Foto: la imagen no es válida.");
    } else if (image === "removed") {
      slide.imageRemoved = true;
    } else if (image) {
      slide.image = storedImage(image.assetRef);
    }

    const rawSurface = (item as Record<string, unknown>).surface;

    if (typeof rawSurface === "string" && Object.hasOwn(HERO_SURFACES, rawSurface)) {
      slide.surface = rawSurface as HeroSurfaceId;
    } else if (rawSurface !== undefined && rawSurface !== null) {
      issues.push("Hero · Color: no es válido.");
    }

    if ((item as Record<string, unknown>).custom === true) {
      slide.custom = true;
    }

    const rawFraming = (item as Record<string, unknown>).imageFraming;
    const framing = parseImageFraming(rawFraming);

    if (framing && !isDefaultFraming(framing)) {
      slide.imageFraming = framing;
    } else if (!framing && rawFraming !== undefined && rawFraming !== null) {
      issues.push("Hero · Encuadre: no es válido.");
    }

    const products = readProductRefs((item as Record<string, unknown>).products, HERO_PRODUCTS_MAX);

    if (products.problem) {
      issues.push(`Hero · Productos: ${products.problem}.`);
    }

    if (products.ids.length > 0) {
      slide.products = storedProductRefs(products.ids);
    }

    if (Object.keys(slide).length > 2) {
      slides.push(slide);
    }
  });

  return { slides: slides.sort((a, b) => a._key.localeCompare(b._key)), issues };
}

/**
 * Strict, for writes: untrusted input (an admin request) to clean fields, or
 * every problem found. Unknown sections and fields are ignored (Sanity
 * metadata, or a field removed from the definition since).
 */
export function sanitizeStorefrontCopyFields(value: unknown): CopySanitizeResult {
  if (!isRecord(value)) {
    return { ok: false, issues: ["El contenido no es válido."] };
  }

  const issues: string[] = [];
  const fields = {} as Record<StorefrontCopySectionId, Record<string, string>>;

  for (const section of STOREFRONT_COPY_SECTION_IDS) {
    const rawSection = value[section];
    fields[section] = {};

    if (rawSection === undefined || rawSection === null) {
      continue;
    }

    if (!isRecord(rawSection)) {
      issues.push(`${section}: no es válido.`);
      continue;
    }

    for (const [key, field] of sectionFields(section)) {
      const reading = readField(rawSection[key], field);

      if (reading.kind === "invalid") {
        issues.push(`${field.label}: ${reading.problem}.`);
      } else if (reading.kind === "value") {
        fields[section][key] = reading.value;
      }
    }
  }

  const hero = readHeroSlides(value.heroSlides);
  issues.push(...hero.issues);

  const lists = readProductLists(value.productLists);
  issues.push(...lists.issues);

  const order = readHeroSlideOrder(value.heroSlideOrder);
  issues.push(...order.issues);

  const images = readSectionImages(value.images);
  issues.push(...images.issues);

  // A slide created in the admin has nothing under it: it needs its own title.
  (order.ids ?? []).forEach((id, index) => {
    const slide = hero.slides.find((item) => item._key === id);

    if (slide?.custom && !slide.title) {
      issues.push(`Hero: la diapositiva ${index + 1} necesita un título.`);
    }
  });

  // Created slides that left the list are dropped, not kept as orphans.
  const slides = hero.slides.filter((slide) => !slide.custom || (order.ids ?? []).includes(slide._key));

  return issues.length > 0
    ? { ok: false, issues }
    : {
        ok: true,
        fields: {
          ...(fields as SectionsFields),
          heroSlides: slides,
          ...(order.ids ? { heroSlideOrder: order.ids } : {}),
          productLists: storedProductLists(lists.lists),
          images: storedSectionImages(images.images),
          imageFraming: readSectionFraming(value.imageFraming),
        },
      };
}

/** Hand-set framing per block photo; invalid or default (centred, no zoom) entries are not kept. */
function readSectionFraming(raw: unknown): Partial<Record<SectionImageId, ImageFraming>> {
  const record = isRecord(raw) ? raw : {};

  return Object.fromEntries(
    SECTION_IMAGE_IDS.flatMap((id) => {
      const framing = parseImageFraming(record[id]);
      return framing && !isDefaultFraming(framing) ? [[id, framing]] : [];
    }),
  );
}

/** Replacement photos: an image asset per block (by its id, or as a stored image). */
function readSectionImages(raw: unknown): { images: SectionImages; issues: string[] } {
  const record = isRecord(raw) ? raw : {};
  const images: SectionImages = {};
  const issues: string[] = [];

  for (const id of SECTION_IMAGE_IDS) {
    const value = record[id];

    if (value === undefined || value === null) {
      continue;
    }

    const ref = typeof value === "string" ? value : isRecord(value) && isRecord(value.asset) ? value.asset._ref : undefined;

    if (isImageAssetRef(ref)) {
      images[id] = ref;
    } else {
      issues.push(`${SECTION_IMAGES[id].label}: la imagen no es válida.`);
    }
  }

  return { images, issues };
}

function storedSectionImages(images: SectionImages): StorefrontCopyFields["images"] {
  return Object.fromEntries(
    SECTION_IMAGE_IDS.filter((id) => images[id]).map((id) => [id, storedImage(images[id] as string)]),
  );
}

/** The managed slide list: unique valid ids, 1 to HERO_SLIDES_MAX; null while Studio decides. */
function readHeroSlideOrder(raw: unknown): { ids: string[] | null; issues: string[] } {
  if (raw === undefined || raw === null) {
    return { ids: null, issues: [] };
  }

  if (!Array.isArray(raw)) {
    return { ids: null, issues: ["Hero: el orden de las diapositivas no es válido."] };
  }

  const ids = raw.filter((id): id is string => typeof id === "string" && SLIDE_KEY_PATTERN.test(id));
  const unique = [...new Set(ids)];
  const issues: string[] = [];

  if (unique.length !== raw.length) {
    issues.push("Hero: el orden de las diapositivas no es válido.");
  }

  if (unique.length === 0) {
    issues.push("Hero: tiene que quedar al menos una diapositiva.");
  }

  if (unique.length > HERO_SLIDES_MAX) {
    issues.push(`Hero: admite hasta ${HERO_SLIDES_MAX} diapositivas.`);
  }

  return { ids: unique.length > 0 ? unique.slice(0, HERO_SLIDES_MAX) : null, issues };
}

function readProductLists(raw: unknown): { lists: ProductLists; issues: string[] } {
  const lists: ProductLists = {};
  const issues: string[] = [];
  const record = isRecord(raw) ? raw : {};

  for (const list of PRODUCT_LIST_IDS) {
    const reading = readProductRefs(record[list], PRODUCT_LISTS[list].max);

    if (reading.problem) {
      issues.push(`${PRODUCT_LISTS[list].label}: ${reading.problem}.`);
    }

    // An empty list is the automatic source, so it is not stored.
    if (reading.ids.length > 0) {
      lists[list] = reading.ids;
    }
  }

  return { lists, issues };
}

function storedProductLists(lists: ProductLists): StorefrontCopyFields["productLists"] {
  return Object.fromEntries(
    PRODUCT_LIST_IDS.filter((list) => lists[list]?.length).map((list) => [list, storedProductRefs(lists[list] ?? [])]),
  );
}

/**
 * Lenient, for reads: the published document (untrusted, possibly null) to
 * every text the storefront renders. Texts are independent of each other, so
 * an unreadable field falls back to its own default and the rest still apply.
 */
export function resolveStorefrontCopy(document: unknown): StorefrontCopy {
  const record = isRecord(document) ? document : {};
  const copy = {} as Record<StorefrontCopySectionId, Record<string, string>>;

  for (const section of STOREFRONT_COPY_SECTION_IDS) {
    const rawSection = isRecord(record[section]) ? record[section] : {};
    copy[section] = { ...(DEFAULT_STOREFRONT_COPY[section] as Record<string, string>) };

    for (const [key, field] of sectionFields(section)) {
      const reading = readField(rawSection[key], field);

      if (reading.kind === "value") {
        copy[section][key] = reading.value;
      }
    }
  }

  // Lenient here too: readHeroSlides skips a bad entry or text and keeps the rest.
  const heroSlides: HeroSlideOverrides = Object.fromEntries(
    readHeroSlides(record.heroSlides).slides.map((slide) => {
      const override: HeroSlideOverride = Object.fromEntries(
        HERO_SLIDE_TEXT_KEYS.filter((key) => key in slide).map((key) => [key, slide[key]]),
      );
      const image = imageChoiceOf(slide);

      if (image && image !== "invalid") {
        override.image = image;
      }

      if (slide.products?.length) {
        override.products = slide.products.map((product) => product._ref);
      }

      if (slide.surface) {
        override.surface = slide.surface;
      }

      if (slide.custom) {
        override.custom = true;
      }

      if (slide.imageFraming) {
        override.imageFraming = slide.imageFraming;
      }

      return [slide._key, override];
    }),
  );

  // Lenient: invalid entries are dropped and a list too long is cut.
  const { lists: productLists } = readProductLists(record.productLists);
  const { ids: heroSlideOrder } = readHeroSlideOrder(record.heroSlideOrder);

  const { images } = readSectionImages(record.images);

  const imageFraming = readSectionFraming(record.imageFraming);

  return { ...(copy as SectionsCopy), heroSlides, heroSlideOrder, productLists, images, imageFraming } as StorefrontCopy;
}

/** Full texts (as the editor holds them) to the stored fields: only what differs from the defaults. */
export function copyToFields(copy: StorefrontCopy): StorefrontCopyFields {
  const fields = {} as Record<StorefrontCopySectionId, Record<string, string>>;

  for (const section of STOREFRONT_COPY_SECTION_IDS) {
    fields[section] = {};

    for (const [key, field] of sectionFields(section)) {
      const raw = (copy[section] as Record<string, string>)[key];
      // Invalid values are kept: the write validation reports them instead of dropping them silently.
      const value = typeof raw === "string" ? normalizeText(raw, field) : "";

      if (value !== "" && value !== field.default) {
        fields[section][key] = value;
      }
    }
  }

  const heroSlides: StoredHeroSlide[] = [];

  for (const [key, override] of Object.entries(copy.heroSlides ?? {}).sort(([a], [b]) => a.localeCompare(b))) {
    const slide: StoredHeroSlide = { _key: key, _type: HERO_SLIDE_COPY_TYPE };

    for (const textKey of HERO_SLIDE_TEXT_KEYS) {
      const raw = override[textKey];
      const value = typeof raw === "string" ? normalizeText(raw, HERO_SLIDE_FIELDS[textKey]) : "";

      if (value !== "") {
        slide[textKey] = value;
      }
    }

    if (override.image === "removed") {
      slide.imageRemoved = true;
    } else if (override.image) {
      // Kept even if malformed: the write validation reports it.
      slide.image = storedImage(override.image.assetRef);
    }

    if (override.products?.length) {
      slide.products = storedProductRefs(override.products);
    }

    if (override.surface) {
      slide.surface = override.surface;
    }

    if (override.custom) {
      slide.custom = true;
    }

    if (override.imageFraming && !isDefaultFraming(override.imageFraming)) {
      // Kept as is: the write validation clamps or reports it.
      slide.imageFraming = override.imageFraming;
    }

    if (Object.keys(slide).length > 2) {
      heroSlides.push(slide);
    }
  }

  // Kept as picked (even past the limit): the write validation reports problems.
  const productLists: ProductLists = Object.fromEntries(
    PRODUCT_LIST_IDS.filter((list) => copy.productLists?.[list]?.length).map((list) => [list, copy.productLists[list]]),
  );

  return {
    ...(fields as SectionsFields),
    heroSlides,
    // Kept as is (even empty or too long): the write validation reports it.
    ...(copy.heroSlideOrder ? { heroSlideOrder: [...copy.heroSlideOrder] } : {}),
    productLists: storedProductLists(productLists),
    // Kept even if malformed: the write validation reports it.
    images: Object.fromEntries(
      SECTION_IMAGE_IDS.filter((id) => copy.images?.[id]).map((id) => [id, storedImage(copy.images[id] as string)]),
    ),
    imageFraming: readSectionFraming(copy.imageFraming),
  } as StorefrontCopyFields;
}

/** wa.me link for the floating button. */
export function whatsappHref(copy: StorefrontCopy["whatsapp"]) {
  const number = copy.number.replace(/\D/g, "");
  return `https://wa.me/${number}?text=${encodeURIComponent(copy.message)}`;
}

type SlideImages = { imageUrl?: string | null; mobileImageUrl?: string | null };

/**
 * A slide with the admin's corrections applied over its Studio texts and photo.
 * `imageUrlsFor` turns a replacement asset into its desktop and mobile URLs.
 */
export function applyHeroOverrides<Slide extends { id: string } & Partial<HeroSlideTexts> & SlideImages>(
  slides: Slide[],
  overrides: HeroSlideOverrides,
  imageUrlsFor: (assetRef: string) => Required<SlideImages>,
): Slide[] {
  return slides.map((slide) => {
    const override = overrides[slide.id];

    if (!override) {
      return slide;
    }

    // Picked products are resolved to real products elsewhere (applyHomeProductPicks).
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { image, products: _productIds, ...texts } = override;
    const images: SlideImages =
      image === "removed" ? { imageUrl: null, mobileImageUrl: null } : image ? imageUrlsFor(image.assetRef) : {};

    return { ...slide, ...texts, ...images };
  });
}
