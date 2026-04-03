import { categorySchema } from "./schemas/documents/category";
import { homePageSchema } from "./schemas/documents/home-page";
import { productSchema } from "./schemas/documents/product";
import { promoSettingsSchema } from "./schemas/documents/promo-settings";
import { siteSettingsSchema } from "./schemas/documents/site-settings";
import { staticPageSchema } from "./schemas/documents/static-page";
import { subcategorySchema } from "./schemas/documents/subcategory";
import { imageWithAltSchema } from "./schemas/objects/image-with-alt";
import { productAttributeSchema } from "./schemas/objects/product-attribute";
import { seoSchema } from "./schemas/objects/seo";

export const schemaTypes = [
  seoSchema,
  imageWithAltSchema,
  productAttributeSchema,
  categorySchema,
  subcategorySchema,
  productSchema,
  siteSettingsSchema,
  promoSettingsSchema,
  staticPageSchema,
  homePageSchema,
];
