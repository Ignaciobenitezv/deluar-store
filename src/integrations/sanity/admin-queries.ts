import groq from "groq";
import { productAvailabilityClause } from "@/features/catalog/product-availability";

const logisticsProjection = groq`
  logistics{
    weightGrams,
    heightCm,
    widthCm,
    depthCm
  }
`;

const adminCategoryTreeProjection = groq`
  _id,
  _type,
  title,
  slug,
  description,
  "subcategories": *[_type == "subcategory" && references(^._id)]
    | order(coalesce(order, 999) asc, title asc) {
      _id,
      _type,
      title,
      slug,
      description,
      "subcategories": *[_type == "subcategory" && references(^._id)]
        | order(coalesce(order, 999) asc, title asc) {
          _id,
          _type,
          title,
          slug,
          description
        }
    }
`;

const adminProductProjection = groq`
  _id,
  _rev,
  _updatedAt,
  title,
  "slug": slug.current,
  shortDescription,
  basePrice,
  transferPrice,
  stock,
  isActive,
  isOnOffer,
  showInNewIn,
  newInOrder,
  images,
  category->{
    _id,
    title,
    "slug": slug.current
  },
  subcategory->{
    _id,
    title,
    "slug": slug.current
  },
  variants[]{
    _key,
    title,
    value,
    stock,
    isActive,
    basePrice,
    transferPrice,
    ${logisticsProjection}
  },
  colorVariants[]{
    _key,
    title,
    value,
    stock,
    basePrice,
    transferPrice
  }
`;

export const adminProductsInventoryQuery = groq`
  *[_type == "product"] | order(_updatedAt desc, title asc) {
    _id,
    "sanityProductId": _id,
    title,
    "slug": slug.current,
    basePrice,
    transferPrice,
    stock,
    isActive,
    "categoryTitle": category->title,
    images,
    variants[]{
      _key,
      title,
      value,
      stock,
      isActive,
      basePrice,
      transferPrice,
      ${logisticsProjection}
    },
    colorVariants[]{
      _key,
      title,
      value,
      stock,
      basePrice,
      transferPrice
    }
  }
`;

export const adminProductQuickEditQuery = groq`
  *[_type == "product" && _id == $productId][0]{
    _id,
    _rev,
    _updatedAt,
    title,
    "slug": slug.current,
    basePrice,
    transferPrice,
    stock,
    isActive,
    isOnOffer,
    showInNewIn,
    newInOrder,
    ${logisticsProjection},
    images,
    category->{
      _id,
      title,
      "slug": slug.current
    },
    subcategory->{
      _id,
      title,
      "slug": slug.current
    },
    variants[]{
      _key,
      title,
      value,
      stock,
      isActive
    },
    colorVariants[]{
      _key,
      title,
      value,
      stock
    }
  }
`;

/**
 * \`_id in [$productId, "drafts." + $productId]\` — not \`_id == $productId\` —
 * so the same query resolves a product whether it's still a draft
 * mid-creation or already published, without the caller having to know
 * which. Safe for every existing anonymous caller too: an anonymous
 * (\`perspective: "published"\`, no token) client still can't see the
 * \`drafts.*\` half of that filter, so nothing changes for them — only
 * \`sanityAdminEditFetch\` (write token + \`perspective: "raw"\`) can ever
 * actually match the draft branch. See its doc comment in
 * src/integrations/sanity/client.ts for why that split exists.
 */
export const adminProductDetailQuery = groq`
  *[_type == "product" && _id in [$productId, "drafts." + $productId]][0]{
    _id,
    _rev,
    _updatedAt,
    title,
    "slug": slug.current,
    shortDescription,
    description,
    basePrice,
    transferPrice,
    stock,
    isActive,
    isFeatured,
    isOnOffer,
    showInNewIn,
    newInOrder,
    seo,
    ${logisticsProjection},
    images,
    "variantCount": count(variants) + count(colorVariants),
    variants[]{
      _key,
      _type,
      title,
      value,
      attributes[]{
        _key,
        _type,
        name,
        value
      },
      images,
      sku,
      basePrice,
      transferPrice,
      stock,
      isActive,
      ${logisticsProjection}
    },
    colorVariants[]{
      _key,
      _type,
      title,
      value,
      images,
      sku,
      basePrice,
      transferPrice,
      stock
    },
    category->{
      _id,
      title,
      "slug": slug.current
    },
    subcategory->{
      _id,
      title,
      "slug": slug.current
    }
  }
`;

/**
 * Deliberately lighter than adminProductProjection above — Inventario never
 * needs images/description/logistics/seo, only what a stock row actually
 * shows. `sku` is real data on variants/colorVariants (schema field), never
 * fabricated for the simple-product base row, which has no sku field at all
 * in this schema — that row falls back to the product's slug in the UI.
 */
const adminInventoryProjection = groq`
  _id,
  _rev,
  title,
  "slug": slug.current,
  basePrice,
  category->{ title },
  subcategory->{ title },
  stock,
  images,
  variants[]{ _key, title, value, sku, stock, isActive },
  colorVariants[]{ _key, title, value, sku, stock }
`;

/**
 * Read immediately before writing a stock change — never the page-listing
 * projection above, never a stale value from when Inventario first loaded.
 * Only the fields the delta math and the _key-existence check actually need.
 */
export const adminInventoryFreshProductQuery = groq`
  *[_type == "product" && _id == $productId][0]{
    _id,
    _rev,
    title,
    stock,
    variants[]{ _key, stock },
    colorVariants[]{ _key, stock }
  }
`;

export function buildAdminInventoryPageQuery(filterClause: string) {
  return groq`
  {
    "filteredTotal": count(*[
      _type == "product" &&
      ${filterClause}
    ]),
    "items": *[
      _type == "product" &&
      ${filterClause}
    ]
      | order(_updatedAt desc, title asc)
      [$offset...$offset + $limit]{
        ${adminInventoryProjection}
      }
  }
  `;
}

export function buildAdminProductsPageQuery(filterClause: string) {
  return groq`
  {
    "global": {
      "total": count(*[_type == "product"]),
      "visible": count(*[_type == "product" && isActive != false && ${productAvailabilityClause}]),
      "outOfStock": count(*[_type == "product" && isActive != false && !(${productAvailabilityClause})]),
      "onOffer": count(*[_type == "product" && isOnOffer == true])
    },
    "filteredTotal": count(*[
      _type == "product" &&
      ${filterClause}
    ]),
    "items": *[
      _type == "product" &&
      ${filterClause}
    ]
      | order(_updatedAt desc, title asc)
      [$offset...$offset + $limit]{
        ${adminProductProjection}
      },
    "categories": *[_type == "category"]
      | order(coalesce(order, 999) asc, title asc) {
        ${adminCategoryTreeProjection}
      }
  }
  `;
}
