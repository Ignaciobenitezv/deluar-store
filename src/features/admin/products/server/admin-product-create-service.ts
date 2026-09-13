import "server-only";

import crypto from "node:crypto";
import { revalidatePath } from "next/cache";
import groq from "groq";
import { logger } from "@/lib/logger";
import { sanityFreshFetch } from "@/integrations/sanity/client";
import { getAdminProductsWriteClient } from "./admin-products-write-client";
import type { AdminProductCreateFormValues } from "../validation/create-product";

export class AdminProductSlugTakenError extends Error {
  constructor(readonly slug: string) {
    super(`Ya existe un producto con la URL "${slug}".`);
    this.name = "AdminProductSlugTakenError";
  }
}

export class AdminProductCategoryMissingError extends Error {
  constructor() {
    super("La categoría elegida ya no existe.");
    this.name = "AdminProductCategoryMissingError";
  }
}

const slugTakenQuery = groq`count(*[_type == "product" && slug.current == $slug]) > 0`;
const categoryExistsQuery = groq`count(*[_type == "category" && _id == $categoryId]) > 0`;
const subcategoryExistsQuery = groq`count(*[_type == "subcategory" && _id == $subcategoryId]) > 0`;

/**
 * Sanity's own uniqueness rule runs inside the Studio, where a validation
 * context exists. Creating from our own UI has to make the same guarantee
 * here, before the document is written.
 */
export async function isAdminProductSlugTaken(slug: string) {
  return sanityFreshFetch<boolean>(slugTakenQuery, { slug });
}

/**
 * The plain textarea the admin typed becomes portable text: one block per
 * paragraph, which is exactly what the detail editor reads back. Nothing is
 * added to the text — blank lines are what separates one block from the next.
 */
function toPortableText(value: string) {
  return value
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => ({
      _type: "block" as const,
      _key: crypto.randomUUID().replace(/-/g, "").slice(0, 12),
      style: "normal" as const,
      markDefs: [],
      children: [
        {
          _type: "span" as const,
          _key: crypto.randomUUID().replace(/-/g, "").slice(0, 12),
          text: paragraph,
          marks: [],
        },
      ],
    }));
}

export type AdminProductCreateResult = {
  productId: string;
  slug: string;
};

/**
 * Creates the product hidden from the storefront. Images are the one required
 * field left open, so the product is not something a shopper should be able to
 * reach yet — the admin turns it visible from the detail page once it is ready.
 */
export async function createAdminProduct(
  values: AdminProductCreateFormValues,
): Promise<AdminProductCreateResult> {
  const writeClient = getAdminProductsWriteClient();

  const [slugTaken, categoryExists] = await Promise.all([
    isAdminProductSlugTaken(values.slug),
    sanityFreshFetch<boolean>(categoryExistsQuery, { categoryId: values.categoryId }),
  ]);

  if (slugTaken) {
    throw new AdminProductSlugTakenError(values.slug);
  }

  if (!categoryExists) {
    throw new AdminProductCategoryMissingError();
  }

  const subcategoryId = values.subcategoryId?.trim();
  const keepSubcategory =
    subcategoryId && subcategoryId.length > 0
      ? await sanityFreshFetch<boolean>(subcategoryExistsQuery, { subcategoryId })
      : false;

  const document = {
    _type: "product",
    title: values.title,
    slug: { _type: "slug", current: values.slug },
    category: { _type: "reference", _ref: values.categoryId },
    ...(keepSubcategory
      ? { subcategory: { _type: "reference", _ref: subcategoryId } }
      : {}),
    shortDescription: values.shortDescription,
    description: toPortableText(values.description),
    basePrice: values.basePrice,
    ...(typeof values.transferPrice === "number" ? { transferPrice: values.transferPrice } : {}),
    stock: values.stock,
    images: [],
    isActive: false,
    isFeatured: false,
    isOnOffer: false,
    showInNewIn: false,
  };

  const created = await writeClient.create(document);

  logger.info("admin.product.created", {
    productId: created._id,
    slug: values.slug,
  });

  revalidatePath("/admin/productos");

  return { productId: created._id, slug: values.slug };
}
