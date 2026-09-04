export const ALLOWED_IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const MAX_PRODUCT_IMAGE_UPLOAD_BYTES = 10 * 1024 * 1024;
export const MAX_PRODUCT_IMAGE_UPLOAD_TOTAL_BYTES = 20 * 1024 * 1024;

export type AllowedProductImageMimeType = (typeof ALLOWED_IMAGE_MIME_TYPES)[number];

export function isAllowedProductImageMimeType(value: string): value is AllowedProductImageMimeType {
  return ALLOWED_IMAGE_MIME_TYPES.includes(value as AllowedProductImageMimeType);
}
