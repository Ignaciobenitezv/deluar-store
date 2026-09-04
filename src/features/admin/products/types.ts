import type { ProductLogistics } from "@/features/catalog/logistics";

export type AdminProductSource = "variants" | "colorVariants";

export type AdminProductStockEditItem = {
  key: string;
  label: string;
  stock: number;
  kind: "base" | "variant";
  isActive?: boolean;
};

export type AdminProductListItem = {
  id: string;
  rev: string;
  updatedAt: string;
  title: string;
  slug: string;
  shortDescription?: string;
  imageUrl: string | null;
  imageAlt: string;
  categoryLabel: string;
  categorySlug: string | null;
  subcategoryLabel: string | null;
  subcategorySlug: string | null;
  basePrice: number;
  transferPrice: number | null;
  priceLabel: string;
  priceHint?: string;
  stockLabel: string;
  stockHint?: string;
  stockTone: "neutral" | "success" | "warning" | "danger";
  stockValue: number | null;
  stockItems: AdminProductStockEditItem[];
  variantLabel: string;
  variantCount: number;
  hasVariants: boolean;
  variantSource: AdminProductSource | null;
  visible: boolean;
  isOnOffer: boolean;
  showInNewIn: boolean;
  newInOrder: number | null;
};

export type AdminProductCategoryNode = {
  _id: string;
  _type: "category" | "subcategory";
  title: string;
  slug: {
    current: string;
  };
  description?: string;
  subcategories?: AdminProductCategoryNode[];
};

export type AdminProductsSummary = {
  total: number;
  visible: number;
  outOfStock: number;
  onOffer: number;
};

export type AdminProductsFilters = {
  q: string;
  status: "all" | "visible" | "hidden";
  stock: "all" | "with" | "without" | "low";
  offer: "all" | "on" | "off";
  newIn: "all" | "on" | "off";
  variants: "all" | "with" | "without";
  image: "all" | "with" | "without";
  category: string;
  subcategory: string;
  page: number;
};

export type AdminProductsPageData = {
  summary: AdminProductsSummary;
  filteredTotal: number;
  items: AdminProductListItem[];
  categories: AdminProductCategoryNode[];
  filters: AdminProductsFilters;
  page: number;
  pageSize: number;
  totalPages: number;
  totalItems: number;
};

export type AdminProductQuickEditField =
  | "stock"
  | "isActive"
  | "isOnOffer"
  | "showInNewIn"
  | "newInOrder"
  | "weightGrams"
  | "heightCm"
  | "widthCm"
  | "depthCm";

export type AdminProductQuickEditActionState =
  | {
      status: "idle";
      message?: string;
      fieldErrors?: Partial<Record<AdminProductQuickEditField | "productId" | "rev", string[]>>;
    }
  | {
      status: "success";
      message: string;
      rev: string;
      updatedAt: string;
      product: AdminProductListItem;
    }
  | {
      status: "error";
      message: string;
      fieldErrors?: Partial<Record<AdminProductQuickEditField | "productId" | "rev", string[]>>;
    }
  | {
      status: "conflict";
      message: string;
    };

export type AdminProductDetailField =
  | "productId"
  | "rev"
  | "title"
  | "slug"
  | "shortDescription"
  | "description"
  | "categoryId"
  | "subcategoryId"
  | "basePrice"
  | "transferPrice"
  | "stock"
  | "isActive"
  | "isFeatured"
  | "isOnOffer"
  | "showInNewIn"
  | "newInOrder"
  | "weightGrams"
  | "heightCm"
  | "widthCm"
  | "depthCm"
  | "seoTitle"
  | "seoDescription";

export type AdminProductVariantField =
  | "productId"
  | "rev"
  | "operation"
  | "variantKey"
  | "title"
  | "value"
  | "sku"
  | "basePrice"
  | "stock"
  | "isActive"
  | "logisticsMode"
  | "weightGrams"
  | "heightCm"
  | "widthCm"
  | "depthCm"
  | "variantImagesJson"
  | "attributesJson";

export type AdminProductDetailActionState =
  | {
      status: "idle";
      message?: string;
      fieldErrors?: Partial<Record<AdminProductDetailField, string[]>>;
    }
  | {
      status: "success";
      message: string;
      rev: string;
      updatedAt: string;
      product: AdminProductDetailData;
    }
  | {
      status: "error";
      message: string;
      fieldErrors?: Partial<Record<AdminProductDetailField, string[]>>;
    }
  | {
      status: "conflict";
      message: string;
    };

export type AdminProductImageField =
  | "productId"
  | "rev"
  | "files"
  | "draftImagesJson";

export type AdminProductImageActionState =
  | {
      status: "idle";
      message?: string;
      fieldErrors?: Partial<Record<AdminProductImageField, string[]>>;
    }
  | {
      status: "success";
      message: string;
      rev: string;
      updatedAt: string;
      images: AdminProductImageData[];
    }
  | {
      status: "partial";
      message: string;
      fieldErrors?: Partial<Record<AdminProductImageField, string[]>>;
    }
  | {
      status: "error";
      message: string;
      fieldErrors?: Partial<Record<AdminProductImageField, string[]>>;
    }
  | {
      status: "conflict";
      message: string;
    };

export type AdminProductImageData = {
  key: string;
  alt: string;
  url: string | null;
  assetRef: string;
};

export type AdminProductImageDraftExistingItem = {
  id: string;
  existing: true;
  key: string;
  assetRef: string;
  imageUrl: string | null;
  alt: string;
  previewUrl?: string | null;
};

export type AdminProductImageDraftNewItem = {
  id: string;
  existing: false;
  temporaryId: string;
  fileSignature: string;
  file: File;
  previewUrl: string;
  alt: string;
};

export type AdminProductImageDraftItem = AdminProductImageDraftExistingItem | AdminProductImageDraftNewItem;

export type AdminProductImageDraftSubmitExistingItem = {
  existing: true;
  key: string;
  assetRef: string;
  alt: string;
};

export type AdminProductImageDraftSubmitNewItem = {
  existing: false;
  temporaryId: string;
  fileSignature: string;
  alt: string;
};

export type AdminProductImageDraftSubmitItem = AdminProductImageDraftSubmitExistingItem | AdminProductImageDraftSubmitNewItem;

export type AdminProductDetailData = {
  id: string;
  rev: string;
  updatedAt: string;
  title: string;
  slug: string;
  shortDescription: string;
  description: unknown[];
  imageUrl: string | null;
  imageAlt: string;
  images: AdminProductImageData[];
  logistics: ProductLogistics | null;
  categoryId: string;
  categoryLabel: string;
  categorySlug: string;
  subcategoryId: string | null;
  subcategoryLabel: string | null;
  subcategorySlug: string | null;
  basePrice: number;
  transferPrice: number | null;
  stock: number;
  stockLabel: string;
  stockTone: "neutral" | "success" | "warning" | "danger";
  variantLabel: string;
  variantCount: number;
  hasVariants: boolean;
  variantSource: "variants" | "colorVariants" | null;
  legacyColorVariantCount: number;
  variants: import("./lib/variant-editor").AdminProductVariantData[];
  visible: boolean;
  isFeatured: boolean;
  isOnOffer: boolean;
  showInNewIn: boolean;
  newInOrder: number | null;
  seoTitle: string;
  seoDescription: string;
};

export type AdminProductVariantActionState =
  | {
      status: "idle";
      message?: string;
      fieldErrors?: Partial<Record<AdminProductVariantField, string[]>>;
    }
  | {
      status: "success";
      message: string;
      rev: string;
      updatedAt: string;
      variants: import("./lib/variant-editor").AdminProductVariantData[];
      variantSource: "variants" | "colorVariants" | null;
      legacyColorVariantCount: number;
    }
  | {
      status: "error";
      message: string;
      fieldErrors?: Partial<Record<AdminProductVariantField, string[]>>;
    }
  | {
      status: "conflict";
      message: string;
    };
