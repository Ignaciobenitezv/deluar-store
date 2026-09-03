import groq from "groq";

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
    ${logisticsProjection}
  },
  colorVariants[]{
    _key,
    title,
    value,
    stock
  }
`;

export const adminProductsInventoryQuery = groq`
  *[_type == "product"] | order(_updatedAt desc, title asc) {
    _id,
    title,
    "slug": slug.current,
    basePrice,
    transferPrice,
    stock,
    images,
    variants[]{
      _key,
      title,
      value,
      stock,
      isActive,
      ${logisticsProjection}
    },
    colorVariants[]{
      _key,
      title,
      value,
      stock
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

export const adminProductDetailQuery = groq`
  *[_type == "product" && _id == $productId][0]{
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

export function buildAdminProductsPageQuery(filterClause: string, outOfStockClause: string) {
  return groq`
  {
    "global": {
      "total": count(*[_type == "product"]),
      "visible": count(*[_type == "product" && isActive != false]),
      "outOfStock": count(*[_type == "product" && ${outOfStockClause}]),
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
