"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type ReactNode,
} from "react";
import type { CartItem, CartProductInput, CartState, CartTotals } from "@/features/cart/types";

const CART_STORAGE_KEY = "deluar-cart";

type CartAction =
  | { type: "hydrate"; payload: CartItem[] }
  | { type: "add"; payload: CartProductInput & { quantity?: number } }
  | { type: "remove"; payload: { id: string } }
  | { type: "setQuantity"; payload: { id: string; quantity: number } }
  | { type: "clear" }
  | { type: "toggle" }
  | { type: "open" }
  | { type: "close" };

type CartContextValue = {
  items: CartItem[];
  totals: CartTotals;
  isOpen: boolean;
  isHydrated: boolean;
  addItem: (product: CartProductInput, quantity?: number) => CartQuantityResult;
  removeItem: (id: string) => void;
  setItemQuantity: (id: string, quantity: number) => CartQuantityResult;
  clearCart: () => void;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
};

type CartQuantityResult = {
  quantity: number;
  requestedQuantity: number;
  stockLimit?: number;
  wasLimited: boolean;
  wasRejected: boolean;
};

const initialState: CartState = {
  items: [],
  isOpen: false,
  isHydrated: false,
};

const CartContext = createContext<CartContextValue | null>(null);

function normalizeQuantity(value: number | undefined) {
  return value && value > 0 ? Math.trunc(value) : 1;
}

function normalizeStock(value: number | undefined) {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.trunc(value))
    : undefined;
}

function clampQuantityToStock(quantity: number, stock: number | undefined) {
  const normalizedQuantity = Math.max(0, Math.trunc(quantity));

  if (typeof stock !== "number") {
    return normalizedQuantity;
  }

  return Math.min(normalizedQuantity, stock);
}

function clampCartItemToStock(item: CartItem) {
  const stockLimit = normalizeStock(item.stock);

  return {
    ...item,
    stock: stockLimit,
    quantity: clampQuantityToStock(item.quantity, stockLimit),
  };
}

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case "hydrate":
      return {
        ...state,
        items: action.payload
          .map(clampCartItemToStock)
          .filter((item) => item.quantity > 0),
        isHydrated: true,
      };
    case "add": {
      const quantity = normalizeQuantity(action.payload.quantity);
      const existingItem = state.items.find((item) => item.id === action.payload.id);
      const stockLimit = normalizeStock(action.payload.stock ?? existingItem?.stock);

      if (existingItem) {
        const nextQuantity = clampQuantityToStock(
          existingItem.quantity + quantity,
          stockLimit,
        );

        return {
          ...state,
          isOpen: nextQuantity > 0 || state.isOpen,
          items: state.items.map((item) =>
            item.id === action.payload.id
              ? { ...item, ...action.payload, stock: stockLimit, quantity: nextQuantity }
              : item,
          ).filter((item) => item.quantity > 0),
        };
      }

      const nextQuantity = clampQuantityToStock(quantity, stockLimit);

      if (nextQuantity <= 0) {
        return state;
      }

      return {
        ...state,
        isOpen: true,
        items: [...state.items, { ...action.payload, stock: stockLimit, quantity: nextQuantity }],
      };
    }
    case "remove":
      return {
        ...state,
        items: state.items.filter((item) => item.id !== action.payload.id),
      };
    case "setQuantity":
      return {
        ...state,
        items: state.items
          .map((item) =>
            item.id === action.payload.id
              ? {
                  ...item,
                  quantity: clampQuantityToStock(
                    action.payload.quantity,
                    normalizeStock(item.stock),
                  ),
                }
              : item,
          )
          .filter((item) => item.quantity > 0),
      };
    case "clear":
      return {
        ...state,
        items: [],
        isOpen: false,
      };
    case "toggle":
      return {
        ...state,
        isOpen: !state.isOpen,
      };
    case "open":
      return {
        ...state,
        isOpen: true,
      };
    case "close":
      return {
        ...state,
        isOpen: false,
      };
    default:
      return state;
  }
}

type CartProviderProps = {
  children: ReactNode;
};

export function CartProvider({ children }: CartProviderProps) {
  const [state, dispatch] = useReducer(cartReducer, initialState);

  useEffect(() => {
    try {
      const storedCart = window.localStorage.getItem(CART_STORAGE_KEY);

      if (!storedCart) {
        dispatch({ type: "hydrate", payload: [] });
        return;
      }

      const parsedItems = JSON.parse(storedCart) as CartItem[];

      dispatch({
        type: "hydrate",
        payload: Array.isArray(parsedItems) ? parsedItems : [],
      });
    } catch {
      dispatch({ type: "hydrate", payload: [] });
    }
  }, []);

  useEffect(() => {
    if (!state.isHydrated) {
      return;
    }

    if (state.items.length === 0) {
      window.localStorage.removeItem(CART_STORAGE_KEY);
      return;
    }

    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(state.items));
  }, [state.isHydrated, state.items]);

  const value = useMemo<CartContextValue>(() => {
    const totals = state.items.reduce<CartTotals>(
      (accumulator, item) => ({
        itemCount: accumulator.itemCount + item.quantity,
        subtotal: accumulator.subtotal + item.basePrice * item.quantity,
      }),
      { itemCount: 0, subtotal: 0 },
    );

    return {
      items: state.items,
      totals,
      isOpen: state.isOpen,
      isHydrated: state.isHydrated,
      addItem: (product, quantity = 1) => {
        const requestedAddQuantity = normalizeQuantity(quantity);
        const existingItem = state.items.find((item) => item.id === product.id);
        const stockLimit = normalizeStock(product.stock ?? existingItem?.stock);
        const requestedQuantity = (existingItem?.quantity ?? 0) + requestedAddQuantity;
        const nextQuantity = clampQuantityToStock(requestedQuantity, stockLimit);

        dispatch({ type: "add", payload: { ...product, stock: stockLimit, quantity } });

        return {
          quantity: nextQuantity,
          requestedQuantity,
          stockLimit,
          wasLimited: nextQuantity < requestedQuantity,
          wasRejected: nextQuantity <= 0,
        };
      },
      removeItem: (id) => dispatch({ type: "remove", payload: { id } }),
      setItemQuantity: (id, quantity) => {
        const item = state.items.find((cartItem) => cartItem.id === id);
        const stockLimit = normalizeStock(item?.stock);
        const requestedQuantity = Math.max(0, Math.trunc(quantity));
        const nextQuantity = clampQuantityToStock(requestedQuantity, stockLimit);

        dispatch({ type: "setQuantity", payload: { id, quantity } });

        return {
          quantity: nextQuantity,
          requestedQuantity,
          stockLimit,
          wasLimited: nextQuantity < requestedQuantity,
          wasRejected: nextQuantity <= 0,
        };
      },
      clearCart: () => {
        window.localStorage.removeItem(CART_STORAGE_KEY);
        dispatch({ type: "clear" });
      },
      openCart: () => dispatch({ type: "open" }),
      closeCart: () => dispatch({ type: "close" }),
      toggleCart: () => dispatch({ type: "toggle" }),
    };
  }, [state]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }

  return context;
}
