export type CartItem = {
  id: string;
  slug: string;
  title: string;
  imageUrl: string | null;
  imageAlt: string;
  basePrice: number;
  transferPrice?: number;
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
