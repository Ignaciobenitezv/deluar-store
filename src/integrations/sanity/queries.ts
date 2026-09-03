import groq from "groq";

const logisticsProjection = groq`
  logistics{
    weightGrams,
    heightCm,
    widthCm,
    depthCm
  }
`;

const variantCardProjection = groq`
  variants[]{
    _key,
    title,
    value,
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
    value
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
  *[_type == "product" && isActive != false] | order(isFeatured desc, _createdAt desc)
  ${productCardQuery}
`;

export const searchProductsQuery = groq`
  *[
    _type == "product" &&
    isActive != false &&
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
    category->slug.current == $categorySlug &&
    ($subcategorySlug == "" || subcategory->slug.current == $subcategorySlug)
  ] | order(isFeatured desc, _createdAt desc) [0...48]
  ${productCardQuery}
`;

export const homeCategoryRepresentativeProductQuery = groq`
  *[
    _type == "product" &&
    isActive != false &&
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
    category->slug.current == $categorySlug &&
    (
      ($includeRootProducts == true && !defined(subcategory)) ||
      (defined(subcategory) && subcategory._ref in $subcategoryIds)
    )
  ] | order(isFeatured desc, _createdAt desc)
  ${productCardQuery}
`;

export const featuredProductsQuery = groq`
  *[_type == "product" && isActive != false && isFeatured == true] | order(_createdAt desc) [0...8]
  ${productCardQuery}
`;

export const offerProductsQuery = groq`
  *[_type == "product" && isActive != false && isOnOffer == true] | order(isFeatured desc, _updatedAt desc) [0...10]
  ${productCardQuery}
`;

export const newInProductsQuery = groq`
  *[_type == "product" && isActive != false && showInNewIn == true]
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
  *[_type == "product" && slug.current == $slug && isActive != false][0] {
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
      stock > 0 &&
      isActive != false &&
      $categorySlug != "" &&
      category->slug.current == $categorySlug
    ] | order(isFeatured desc, _createdAt desc) [0...4]
    ${productCardQuery},
    "featured": *[
      _type == "product" &&
      defined(slug.current) &&
      slug.current != $slug &&
      stock > 0 &&
      isActive != false &&
      isFeatured == true
    ] | order(_createdAt desc) [0...12]
    ${productCardQuery},
    "fallback": *[
      _type == "product" &&
      defined(slug.current) &&
      slug.current != $slug &&
      stock > 0 &&
      isActive != false
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
