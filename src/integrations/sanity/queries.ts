import groq from "groq";

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
        order
      }
  }
`;

export const productCardQuery = groq`
  {
    _id,
    _type,
    title,
    slug,
    shortDescription,
    basePrice,
    transferPrice,
    stock,
    isFeatured,
    images,
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
  *[_type == "product"] | order(isFeatured desc, _createdAt desc) [0...48]
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
        order
      }
  }
`;

export const productsByCategoryQuery = groq`
  *[
    _type == "product" &&
    category->slug.current == $categorySlug &&
    ($subcategorySlug == "" || subcategory->slug.current == $subcategorySlug)
  ] | order(isFeatured desc, _createdAt desc) [0...48]
  ${productCardQuery}
`;

export const featuredProductsQuery = groq`
  *[_type == "product" && isFeatured == true] | order(_createdAt desc) [0...8]
  ${productCardQuery}
`;

export const productBySlugQuery = groq`
  *[_type == "product" && slug.current == $slug][0] {
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
    images,
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
    },
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

export const relatedProductsByCategoryQuery = groq`
  *[
    _type == "product" &&
    category->slug.current == $categorySlug &&
    slug.current != $slug
  ] | order(isFeatured desc, _createdAt desc) [0...4]
  ${productCardQuery}
`;

export const productsBySlugsQuery = groq`
  *[_type == "product" && slug.current in $slugs] {
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
    images,
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
      images,
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
    promoTitle,
    promoText,
    promoCtaLabel,
    promoCtaHref,
    institutionalTitle,
    institutionalText
  }
`;
