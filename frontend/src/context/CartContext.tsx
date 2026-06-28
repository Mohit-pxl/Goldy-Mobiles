import React, { createContext, useCallback, useContext, useState } from "react";

import { Product } from "@/services/api";

export interface CartItem {
  id: string; // unique cart item id
  product: Product;
  qty: number;
  identifiers?: string[];
}

interface CartContextType {
  items: CartItem[];
  addItem: (p: Product, identifier?: string) => void;
  removeItem: (id: string) => void;
  updateQty: (id: string, qty: number) => void;
  removeIdentifier: (productId: string, identifier: string) => void;
  clearCart: () => void;
  subtotal: number;
  gstAmount: number;
  total: number;
  isFixedQty?: boolean;
}

const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  const addItem = useCallback((p: Product, identifier?: string) => {
    setItems((prev) => {
      if (identifier || p.trackImei || p.trackSerial) {
        // IMEI/Serial logic: Do NOT group. Add as a separate row.
        const alreadyExists = prev.some(
          (x) => x.product._id === p._id && x.identifiers?.includes(identifier || "")
        );
        if (identifier && alreadyExists) return prev; // Do not add duplicate IMEI

        const cartItemId = identifier ? `${p._id}-${identifier}` : `${p._id}-${Date.now()}-${Math.random()}`;
        return [
          ...prev,
          { id: cartItemId, product: p, qty: 1, identifiers: identifier ? [identifier] : [] },
        ];
      } else {
        // Quantity logic: Group by product ID
        const idx = prev.findIndex((x) => x.product._id === p._id && (!x.identifiers || x.identifiers.length === 0));
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = { ...next[idx], qty: next[idx].qty + 1 };
          return next;
        }
        return [...prev, { id: p._id, product: p, qty: 1, identifiers: [] }];
      }
    });
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((x) => x.id !== id));
  }, []);

  const updateQty = useCallback((id: string, qty: number) => {
    if (qty <= 0) {
      setItems((prev) => prev.filter((x) => x.id !== id));
      return;
    }
    setItems((prev) => prev.map((x) => (x.id === id ? { ...x, qty } : x)));
  }, []);

  const removeIdentifier = useCallback((cartItemId: string, identifier: string) => {
    setItems((prev) => prev.map(x => {
      if (x.id === cartItemId && x.identifiers) {
        const newIdentifiers = x.identifiers.filter(id => id !== identifier);
        return { ...x, identifiers: newIdentifiers, qty: Math.max(0, x.qty - 1) };
      }
      return x;
    }).filter(x => x.qty > 0));
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const subtotal = items.reduce((s, i) => s + i.product.sellingPrice * i.qty, 0);
  const gstAmount = items.reduce(
    (s, i) => s + (i.product.sellingPrice * i.qty * (i.product.gstPercent ?? 0)) / 100,
    0
  );
  const total = subtotal + gstAmount;

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, updateQty, removeIdentifier, clearCart, subtotal, gstAmount, total }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
