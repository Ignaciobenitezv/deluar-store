export const ADMIN_PRODUCT_IMAGES_COMMITTED_EVENT = "admin:product-images-committed";

export type AdminProductImagesCommittedEventDetail = {
  updatedAt: string;
  rev: string;
};
