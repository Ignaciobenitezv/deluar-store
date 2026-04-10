import { categorySchema } from "./schemas/documents/category";
import { homePageSchema } from "./schemas/documents/home-page";
import { productSchema } from "./schemas/documents/product";
import { promoSettingsSchema } from "./schemas/documents/promo-settings";
import { siteSettingsSchema } from "./schemas/documents/site-settings";
import { staticPageSchema } from "./schemas/documents/static-page";
import { subcategorySchema } from "./schemas/documents/subcategory";
import { imageWithAltSchema } from "./schemas/objects/image-with-alt";
import { productColorVariantSchema } from "./schemas/objects/product-color-variant";
import { productAttributeSchema } from "./schemas/objects/product-attribute";
import { seoSchema } from "./schemas/objects/seo";
import { homeHeroSlideSchema } from "./schemas/objects/home-hero-slide";

export const schemaTypes = [
  seoSchema,
  imageWithAltSchema,
  homeHeroSlideSchema,
  productColorVariantSchema,
  productAttributeSchema,
  categorySchema,
  subcategorySchema,
  productSchema,
  siteSettingsSchema,
  promoSettingsSchema,
  staticPageSchema,
  homePageSchema,
];
