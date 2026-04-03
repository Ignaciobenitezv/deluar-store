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
  | { type: "toggle" }
  | { type: "open" }
  | { type: "close" };

type CartContextValue = {
  items: CartItem[];
  totals: CartTotals;
  isOpen: boolean;
  isHydrated: boolean;
  addItem: (product: CartProductInput, quantity?: number) => void;
  removeItem: (id: string) => void;
  setItemQuantity: (id: string, quantity: number) => void;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
};

const initialState: CartState = {
  items: [],
  isOpen: false,
  isHydrated: false,
};

const CartContext = createContext<CartContextValue | null>(null);

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case "hydrate":
      return {
        ...state,
        items: action.payload,
        isHydrated: true,
      };
    case "add": {
      const quantity = action.payload.quantity && action.payload.quantity > 0
        ? action.payload.quantity
        : 1;
      const existingItem = state.items.find((item) => item.id === action.payload.id);

      if (existingItem) {
        return {
          ...state,
          isOpen: true,
          items: state.items.map((item) =>
            item.id === action.payload.id
              ? { ...item, quantity: item.quantity + quantity }
              : item,
          ),
        };
      }

      return {
        ...state,
        isOpen: true,
        items: [...state.items, { ...action.payload, quantity }],
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
              ? { ...item, quantity: action.payload.quantity }
              : item,
          )
          .filter((item) => item.quantity > 0),
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
      addItem: (product, quantity = 1) =>
        dispatch({ type: "add", payload: { ...product, quantity } }),
      removeItem: (id) => dispatch({ type: "remove", payload: { id } }),
      setItemQuantity: (id, quantity) =>
        dispatch({ type: "setQuantity", payload: { id, quantity } }),
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
