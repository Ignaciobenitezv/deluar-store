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

export const adminProductImageItemSchema = z.object({
  _key: requiredTrimmedString,
  _type: z.literal("imageWithAlt"),
  alt: optionalTrimmedString,
  image: z.object({
    _type: z.literal("image"),
    asset: productImageAssetSchema,
  }),
});

export const adminProductImageDraftExistingSchema = z.object({
  existing: z.literal(true),
  key: requiredTrimmedString,
  assetRef: requiredTrimmedString,
  alt: optionalTrimmedString,
});

export const adminProductImageDraftNewSchema = z.object({
  existing: z.literal(false),
  temporaryId: requiredTrimmedString,
  fileSignature: requiredTrimmedString,
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

export type AdminProductImageItem = z.infer<typeof adminProductImageItemSchema>;
export type AdminProductImageDraftExistingInput = z.infer<typeof adminProductImageDraftExistingSchema>;
export type AdminProductImageDraftNewInput = z.infer<typeof adminProductImageDraftNewSchema>;
export type AdminProductImageDraftSubmitInput = z.infer<typeof adminProductImageDraftSubmitSchema>;
export type AdminProductImageCommitFormValues = z.infer<typeof adminProductImageCommitFormSchema>;
