import type { ProductVariantAttribute } from "@/features/catalog/types";

export type CartItem = {
  id: string;
  productId?: string;
  slug: string;
  title: string;
  imageUrl: string | null;
  imageAlt: string;
  basePrice: number;
  transferPrice?: number;
  stock?: number;
  variantId?: string;
  variantLabel?: string;
  variantValue?: string;
  variantAttributes?: ProductVariantAttribute[];
  sku?: string;
  quantity: number;
  productHref: string;
};

export type CartProductInput = Omit<CartItem, "quantity">;

export type CartState = {
  items: CartItem[];
  isOpen: boolean;
  isHydrated: boolean;
};

export type CartTotals = {
  itemCount: number;
  subtotal: number;
};
