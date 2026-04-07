export type CatalogProductCard = {
  id: string;
  title: string;
  slug: string;
  shortDescription: string;
  basePrice: number;
  transferPrice?: number;
  imageUrl: string | null;
  imageAlt: string;
  categorySlug: string;
  categoryTitle: string;
  subcategorySlug?: string;
  productHref: string;
};

export type CatalogCategorySummary = {
  id: string;
  title: string;
  slug: string;
  description?: string;
  href: string;
};

export type CatalogPageData = {
  title: string;
  description?: string;
  products: CatalogProductCard[];
  categories: CatalogCategorySummary[];
};

export type ProductDetailImage = {
  url: string | null;
  alt: string;
};

export type ProductColorVariant = {
  id: string;
  title: string;
  value: string;
  thumbnailUrl: string | null;
  thumbnailAlt: string;
  images: ProductDetailImage[];
  primaryImageUrl: string | null;
  primaryImageAlt: string;
  sku?: string;
  basePrice?: number;
  transferPrice?: number;
  stock?: number;
};

export type ProductDetailAttribute = {
  label: string;
  value: string;
};

export type ProductDetailData = {
  id: string;
  title: string;
  slug: string;
  shortDescription: string;
  description: string[];
  basePrice: number;
  transferPrice?: number;
  stock: number;
  categoryTitle: string;
  categorySlug: string;
  subcategoryTitle?: string;
  attributes: ProductDetailAttribute[];
  images: ProductDetailImage[];
  primaryImageUrl: string | null;
  primaryImageAlt: string;
  colorVariants: ProductColorVariant[];
  productHref: string;
  relatedProducts: CatalogProductCard[];
};
