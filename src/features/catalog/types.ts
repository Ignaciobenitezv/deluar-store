export type CatalogSort =
  | "price-asc"
  | "price-desc"
  | "title-asc"
  | "title-desc"
  | "newest"
  | "oldest"
  | "best-selling";

export type CatalogProductCard = {
  id: string;
  title: string;
  slug: string;
  shortDescription: string;
  basePrice: number;
  transferPrice?: number;
  stock: number;
  imageUrl: string | null;
  imageAlt: string;
  hoverImageUrl?: string | null;
  hoverImageAlt?: string;
  images: ProductDetailImage[];
  categorySlug: string;
  categoryTitle: string;
  subcategorySlug?: string;
  productHref: string;
  hasSelectableOptions: boolean;
};

export type CatalogCategorySummary = {
  id: string;
  title: string;
  slug: string;
  description?: string;
  href: string;
};

export type CatalogPagination = {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  hasPrevious: boolean;
  hasNext: boolean;
  previousPage: number | null;
  nextPage: number | null;
};

export type CatalogHierarchyNode = {
  _id: string;
  _type: "category" | "subcategory";
  title: string;
  slug: {
    current: string;
  };
  description?: string;
  order?: number;
  subcategories?: CatalogHierarchyNode[];
};

export type CatalogHierarchyResolution = {
  rootCategory: CatalogHierarchyNode;
  currentNode: CatalogHierarchyNode;
  ancestors: CatalogHierarchyNode[];
  descendantIds: string[];
  depth: 0 | 1 | 2;
  href: string;
  pathSegments: string[];
};

export type CatalogPageData = {
  title: string;
  description?: string;
  childCategories: CatalogCategorySummary[];
  subcategoryTreeRoot?: CatalogHierarchyNode;
  products: CatalogProductCard[];
  categories: CatalogCategorySummary[];
  pagination: CatalogPagination;
};

export type ProductDetailImage = {
  url: string | null;
  alt: string;
};

export type ProductVariantAttribute = {
  name: string;
  value: string;
};

export type ProductVariantViewModel = {
  id: string;
  title: string;
  value: string;
  attributes: ProductVariantAttribute[];
  attributeSummary: string;
  isActive: boolean;
  thumbnailUrl: string | null;
  thumbnailAlt: string;
  images: ProductDetailImage[];
  primaryImageUrl: string | null;
  primaryImageAlt: string;
  sku?: string;
  basePrice: number;
  transferPrice?: number;
  stock: number;
};

export type ProductColorVariant = ProductVariantViewModel;

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
  variants: ProductVariantViewModel[];
  productHref: string;
  relatedProducts: CatalogProductCard[];
};
