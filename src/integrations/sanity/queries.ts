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

// NOTE: `stock` is required here — isProductStockAvailable / the JS-side
// `isVisibleProduct` filter in features/home/mappers.ts (used for the
// curated featuredProducts/campaignFeaturedProducts/spotlightProduct picks)
// reads variant/colorVariant stock straight off these projected objects.
// Without it every variant looked stock-less, which would have made any
// product with variants appear unavailable regardless of its real stock.
const variantCardProjection = groq`
  variants[]{
    _key,
    title,
    value,
    stock,
    isActive,
    ${logisticsProjection},
    attributes[]{
      name,
      value
    }
  },
  colorVariants[]{
    _key,
    title,
    value,
    stock
  }
`;

const variantDetailProjection = groq`
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
    thumbnail,
    images,
    sku,
    basePrice,
    transferPrice,
    stock
  }
`;

const variantStockProjection = groq`
  variants[]{
    _key,
    title,
    value,
    stock,
    isActive,
    sku,
    ${logisticsProjection}
  },
  colorVariants[]{
    _key,
    title,
    value,
    stock,
    sku
  }
`;

export const categoryTreeQuery = groq`
  *[_type == "category"] | order(coalesce(order, 999) asc, title asc) {
    _id,
    _type,
    title,
    slug,
    description,
    order,
    "subcategories": *[_type == "subcategory" && references(^._id)]
      | order(coalesce(order, 999) asc, title asc) {
        _id,
        _type,
        title,
        slug,
        description,
        order,
        "subcategories": *[_type == "subcategory" && references(^._id)]
          | order(coalesce(order, 999) asc, title asc) {
            _id,
            _type,
            title,
            slug,
            description,
            order
          }
      }
  }
`;

export const productCardQuery = groq`
  {
    _id,
    _rev,
    _type,
    _createdAt,
    title,
    slug,
    shortDescription,
    basePrice,
    transferPrice,
    stock,
    isActive,
    isFeatured,
    isOnOffer,
    showInNewIn,
    newInOrder,
    ${logisticsProjection},
    images,
    ${variantCardProjection},
    attributes[]{
      label,
      value
    },
    category->{
      _id,
      _type,
      title,
      slug
    },
    subcategory->{
      _id,
      _type,
      title,
      slug
    }
  }
`;

export const allProductsQuery = groq`
  *[_type == "product" && isActive != false && ${productAvailabilityClause}] | order(isFeatured desc, _createdAt desc)
  ${productCardQuery}
`;

export const searchProductsQuery = groq`
  *[
    _type == "product" &&
    isActive != false &&
    ${productAvailabilityClause} &&
    (
      $q == "" ||
    title match $pattern ||
    coalesce(shortDescription, "") match $pattern ||
    pt::text(description) match $pattern
  )
  ] | order(isFeatured desc, _createdAt desc)
  ${productCardQuery}
`;

export const categoryBySlugQuery = groq`
  *[_type == "category" && slug.current == $slug][0] {
    _id,
    _type,
    title,
    slug,
    description,
    order,
    "subcategories": *[_type == "subcategory" && references(^._id)]
      | order(coalesce(order, 999) asc, title asc) {
        _id,
        _type,
        title,
        slug,
        description,
        order,
        "subcategories": *[_type == "subcategory" && references(^._id)]
          | order(coalesce(order, 999) asc, title asc) {
            _id,
            _type,
            title,
            slug,
            description,
            order
          }
      }
  }
`;

export const productsByCategoryQuery = groq`
  *[
    _type == "product" &&
    isActive != false &&
    ${productAvailabilityClause} &&
    category->slug.current == $categorySlug &&
    ($subcategorySlug == "" || subcategory->slug.current == $subcategorySlug)
  ] | order(isFeatured desc, _createdAt desc) [0...48]
  ${productCardQuery}
`;

export const homeCategoryRepresentativeProductQuery = groq`
  *[
    _type == "product" &&
    isActive != false &&
    ${productAvailabilityClause} &&
    category->slug.current == $categorySlug &&
    count(images[defined(image.asset._ref) && image.asset._ref != $placeholderAssetRef]) > 0
  ] | order(isFeatured desc, _createdAt desc)[0]{
    "representativeImage": images[defined(image.asset._ref) && image.asset._ref != $placeholderAssetRef][0]
  }
`;

export const catalogProductsByHierarchyQuery = groq`
  *[
    _type == "product" &&
    isActive != false &&
    ${productAvailabilityClause} &&
    category->slug.current == $categorySlug &&
    (
      ($includeRootProducts == true && !defined(subcategory)) ||
      (defined(subcategory) && subcategory._ref in $subcategoryIds)
    )
  ] | order(isFeatured desc, _createdAt desc)
  ${productCardQuery}
`;

export const featuredProductsQuery = groq`
  *[_type == "product" && isActive != false && ${productAvailabilityClause} && isFeatured == true] | order(_createdAt desc) [0...8]
  ${productCardQuery}
`;

export const offerProductsQuery = groq`
  *[_type == "product" && isActive != false && ${productAvailabilityClause} && isOnOffer == true] | order(isFeatured desc, _updatedAt desc) [0...10]
  ${productCardQuery}
`;

export const newInProductsQuery = groq`
  *[_type == "product" && isActive != false && ${productAvailabilityClause} && showInNewIn == true]
    | order(coalesce(newInOrder, 9999) asc, _createdAt desc) [0...8]
  {
    _id,
    _type,
    title,
    slug,
    shortDescription,
    basePrice,
    transferPrice,
    stock,
    isActive,
    isFeatured,
    isOnOffer,
    showInNewIn,
    newInOrder,
    images,
    ${variantCardProjection},
    attributes,
    category->{
      _id,
      _type,
      title,
      slug
    },
    subcategory->{
      _id,
      _type,
      title,
      slug
    }
  }
`;

export const productBySlugQuery = groq`
  *[_type == "product" && slug.current == $slug && isActive != false && ${productAvailabilityClause}][0] {
    _id,
    _type,
    title,
    slug,
    shortDescription,
    description,
    basePrice,
    transferPrice,
    stock,
    isActive,
    isFeatured,
    isOnOffer,
    images,
    ${logisticsProjection},
    ${variantDetailProjection},
    attributes,
    seo,
    category->{
      _id,
      _type,
      title,
      slug,
      description
    },
    subcategory->{
      _id,
      _type,
      title,
      slug,
      description
    }
  }
`;

export const relatedProductFallbackGroupsQuery = groq`
  {
    "sameCategory": *[
      _type == "product" &&
      defined(slug.current) &&
      slug.current != $slug &&
      isActive != false &&
      ${productAvailabilityClause} &&
      $categorySlug != "" &&
      category->slug.current == $categorySlug
    ] | order(isFeatured desc, _createdAt desc) [0...4]
    ${productCardQuery},
    "featured": *[
      _type == "product" &&
      defined(slug.current) &&
      slug.current != $slug &&
      isActive != false &&
      ${productAvailabilityClause} &&
      isFeatured == true
    ] | order(_createdAt desc) [0...12]
    ${productCardQuery},
    "fallback": *[
      _type == "product" &&
      defined(slug.current) &&
      slug.current != $slug &&
      isActive != false &&
      ${productAvailabilityClause}
    ] | order(_createdAt desc) [0...24]
    ${productCardQuery}
  }
`;

export const productsBySlugsQuery = groq`
  *[_type == "product" && slug.current in $slugs] {
    _id,
    _rev,
    _type,
    title,
    slug,
    shortDescription,
    description,
    basePrice,
    transferPrice,
    stock,
    isFeatured,
    images,
    attributes,
    seo,
    ${variantStockProjection},
    category->{
      _id,
      _type,
      title,
      slug,
      description
    },
    subcategory->{
      _id,
      _type,
      title,
      slug,
      description
    }
  }
`;

export const inventoryProductsByIdsQuery = groq`
  *[_type == "product" && (_id in $ids || slug.current in $slugs)] {
    _id,
    _rev,
    slug,
    title,
    stock,
    ${variantStockProjection}
  }
`;

export const allProductSlugsQuery = groq`
  *[_type == "product" && defined(slug.current)]{
    "slug": slug.current
  }
`;

export const siteSettingsQuery = groq`
  *[_type == "siteSettings"][0]{
    _id,
    _type,
    title,
    siteName,
    siteDescription,
    contactEmail,
    whatsappNumber,
    seo
  }
`;

// Fixed singleton _id: the draft ("drafts.storefrontTheme") can never match,
// whatever perspective or token the client uses.
export const storefrontThemeQuery = groq`
  *[_type == "storefrontTheme" && _id == "storefrontTheme"][0]{
    preset,
    colors,
    overrides
  }
`;

// Admin editor only (raw perspective, authenticated): the published document
// and the saved draft, each with the revision the write flow locks on.
export const storefrontThemeAdminQuery = groq`
  *[_type == "storefrontTheme" && _id in [$publishedId, $draftId]]{
    _id,
    _rev,
    _updatedAt,
    preset,
    colors,
    overrides
  }
`;

// Storefront texts (Configuración → Textos). Same singleton rules as the theme:
// the public query is pinned to the published _id.
export const storefrontCopyQuery = groq`
  *[_type == "storefrontCopy" && _id == "storefrontCopy"][0]
`;

// Products hand-picked for the home (Configuración → Textos), by published id.
// Visibility is checked in applyHomeProductPicks, like the home's own picks.
export const productsByIdsQuery = groq`
  *[_type == "product" && _id in $ids]
  ${productCardQuery}
`;

// Admin product picker: published products whose title matches, for adding to a list.
export const productPickerSearchQuery = groq`
  *[_type == "product" && !(_id in path("drafts.**")) && isActive != false && title match $term]
    | order(title asc) [0...20]
  ${productCardQuery}
`;

export const storefrontCopyAdminQuery = groq`
  *[_type == "storefrontCopy" && _id in [$publishedId, $draftId]]
`;

export const promoSettingsQuery = groq`
  *[_type == "promoSettings"][0]{
    _id,
    _type,
    title,
    announcementEnabled,
    announcementText,
    announcementLinkLabel,
    announcementLinkUrl
  }
`;

export const staticPageBySlugQuery = groq`
  *[_type == "staticPage" && slug.current == $slug][0]{
    _id,
    _type,
    title,
    slug,
    excerpt,
    body,
    seo
  }
`;

export const homePageQuery = groq`
  *[_type == "homePage"][0]{
    _id,
    _type,
    title,
    heroTitle,
    heroImage,
    heroText,
    heroCtaLabel,
    heroCtaHref,
    heroSlides[]{
      _key,
      _type,
      eyebrow,
      title,
      text,
      desktopImage,
      mobileImage,
      primaryCtaLabel,
      primaryCtaHref,
      secondaryCtaLabel,
      secondaryCtaHref,
      isActive
    },
    featuredCategories[]->{
      _id,
      _type,
      title,
      slug,
      description,
      order
    },
    seo,
    featuredProducts[]->{
      _id,
      _type,
      title,
      slug,
      shortDescription,
      basePrice,
      transferPrice,
      stock,
      isFeatured,
      isOnOffer,
      showInNewIn,
      newInOrder,
      images,
      ${variantCardProjection},
      category->{
        _id,
        _type,
        title,
        slug
      },
      subcategory->{
        _id,
        _type,
        title,
        slug
      }
    },
    campaignFeaturedTitle,
    campaignFeaturedText,
    campaignFeaturedCtaLabel,
    campaignFeaturedCtaHref,
    campaignFeaturedProducts[]->{
      _id,
      _type,
      title,
      slug,
      shortDescription,
      basePrice,
      transferPrice,
      stock,
      isActive,
      attributes[]{
        label,
        value
      },
      isFeatured,
      isOnOffer,
      showInNewIn,
      newInOrder,
      images,
      ${variantCardProjection},
      category->{
        _id,
        _type,
        title,
        slug
      },
      subcategory->{
        _id,
        _type,
        title,
        slug
      }
    },
    spotlightProduct->{
      _id,
      _type,
      title,
      slug,
      shortDescription,
      description,
      basePrice,
      transferPrice,
      stock,
      isFeatured,
      isOnOffer,
      showInNewIn,
      newInOrder,
      images,
      ${variantDetailProjection},
      attributes,
      seo,
      category->{
        _id,
        _type,
        title,
        slug,
        description
      },
      subcategory->{
        _id,
        _type,
        title,
        slug,
        description
      }
    },
    promoTitle,
    promoText,
    promoCtaLabel,
    promoCtaHref,
    institutionalTitle,
    institutionalText
  }
`;
