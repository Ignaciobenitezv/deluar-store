export type Slug = {
  current: string;
};

export type SanityImageReference = {
  _type: "image";
  asset?: {
    _ref: string;
    _type: "reference";
  };
  alt?: string;
};

export type SanityImageWithAlt = {
  _type: "imageWithAlt";
  image: SanityImageReference;
  alt?: string;
};

export type HomeHeroSlideDocument = {
  _key?: string;
  _type: "homeHeroSlide";
  eyebrow?: string;
  title: string;
  text?: string;
  desktopImage: SanityImageWithAlt;
  mobileImage?: SanityImageWithAlt;
  primaryCtaLabel?: string;
  primaryCtaHref?: string;
  secondaryCtaLabel?: string;
  secondaryCtaHref?: string;
  isActive?: boolean;
};

export type ProductColorVariantDocument = {
  _key?: string;
  _type: "productColorVariant";
  title: string;
  value: string;
  thumbnail?: SanityImageWithAlt;
  images: SanityImageWithAlt[];
  sku?: string;
  basePrice?: number;
  transferPrice?: number;
  stock?: number;
};

export type Seo = {
  title?: string;
  description?: string;
};

export type SiteSettingsDocument = {
  _id: string;
  _type: "siteSettings";
  title: string;
  siteName: string;
  siteDescription: string;
  contactEmail?: string;
  whatsappNumber?: string;
  seo?: Seo;
};

export type PromoSettingsDocument = {
  _id: string;
  _type: "promoSettings";
  title: string;
  announcementEnabled?: boolean;
  announcementText?: string;
  announcementLinkLabel?: string;
  announcementLinkUrl?: string;
};

export type CategoryDocument = {
  _id: string;
  _type: "category";
  title: string;
  slug: Slug;
  description?: string;
  order?: number;
};

export type SubcategoryDocument = {
  _id: string;
  _type: "subcategory";
  title: string;
  slug: Slug;
  parentCategory: CategoryDocument;
  description?: string;
  order?: number;
};

export type ProductAttribute = {
  label: string;
  value: string;
};

export type ProductDocument = {
  _id: string;
  _type: "product";
  title: string;
  slug: Slug;
  shortDescription: string;
  description: unknown[];
  category: CategoryDocument;
  subcategory?: SubcategoryDocument;
  images: SanityImageWithAlt[];
  colorVariants?: ProductColorVariantDocument[];
  basePrice: number;
  transferPrice?: number;
  stock: number;
  isFeatured?: boolean;
  isOnOffer?: boolean;
  attributes?: ProductAttribute[];
  seo?: Seo;
};

export type HomePageDocument = {
  _id: string;
  _type: "homePage";
  title: string;
  heroTitle?: string;
  heroText?: string;
  heroImage?: SanityImageWithAlt;
  heroCtaLabel?: string;
  heroCtaHref?: string;
  heroSlides?: HomeHeroSlideDocument[];
  featuredCategories?: CategoryDocument[];
  featuredProducts?: ProductDocument[];
  campaignFeaturedTitle?: string;
  campaignFeaturedText?: string;
  campaignFeaturedCtaLabel?: string;
  campaignFeaturedCtaHref?: string;
  campaignFeaturedProducts?: ProductDocument[];
  spotlightProduct?: ProductDocument;
  promoTitle?: string;
  promoText?: string;
  promoCtaLabel?: string;
  promoCtaHref?: string;
  institutionalTitle?: string;
  institutionalText?: string;
  seo?: Seo;
};
