import { z } from "zod";

function emptyToUndefined(value: unknown) {
  if (value === "" || value === null || value === undefined) {
    return undefined;
  }

  return value;
}

const requiredTrimmedString = z.string().trim().min(1);

const optionalTrimmedString = z.preprocess(
  emptyToUndefined,
  z
    .string()
    .trim()
    .max(200)
    .optional(),
);

const productImageAssetSchema = z.object({
  _type: z.literal("reference"),
  _ref: requiredTrimmedString,
});

// Sanity's native hotspot shape (options: { hotspot: true } on the `image`
// field) — the only source of truth for manual encuadre. Optional: absent
// for every image that was never adjusted.
export const adminImageHotspotSchema = z.object({
  _type: z.literal("sanity.imageHotspot"),
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  height: z.number().min(0).max(1),
  width: z.number().min(0).max(1),
});

export const adminProductImageItemSchema = z.object({
  _key: requiredTrimmedString,
  _type: z.literal("imageWithAlt"),
  alt: optionalTrimmedString,
  image: z.object({
    _type: z.literal("image"),
    asset: productImageAssetSchema,
    hotspot: adminImageHotspotSchema.optional(),
  }),
});

export const adminProductImageDraftExistingSchema = z.object({
  existing: z.literal(true),
  key: requiredTrimmedString,
  assetRef: requiredTrimmedString,
  alt: optionalTrimmedString,
  hotspot: adminImageHotspotSchema.optional(),
});

export const adminProductImageDraftNewSchema = z.object({
  existing: z.literal(false),
  temporaryId: requiredTrimmedString,
  fileSignature: requiredTrimmedString,
  uploadFileSignature: requiredTrimmedString.optional(),
  assetRef: requiredTrimmedString.optional(),
  alt: optionalTrimmedString,
});

export const adminProductImageDraftSubmitSchema = z.union([
  adminProductImageDraftExistingSchema,
  adminProductImageDraftNewSchema,
]);

export const adminProductImageCommitFormSchema = z.object({
  productId: requiredTrimmedString,
  rev: requiredTrimmedString,
  draftImagesJson: requiredTrimmedString,
});

export type AdminImageHotspot = z.infer<typeof adminImageHotspotSchema>;
export type AdminProductImageItem = z.infer<typeof adminProductImageItemSchema>;
export type AdminProductImageDraftExistingInput = z.infer<typeof adminProductImageDraftExistingSchema>;
export type AdminProductImageDraftNewInput = z.infer<typeof adminProductImageDraftNewSchema>;
export type AdminProductImageDraftSubmitInput = z.infer<typeof adminProductImageDraftSubmitSchema>;
export type AdminProductImageCommitFormValues = z.infer<typeof adminProductImageCommitFormSchema>;
