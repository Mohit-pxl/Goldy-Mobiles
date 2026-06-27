import React, { createContext, useCallback, useContext, useState } from "react";

import { Product } from "@/services/api";

export interface CartItem {
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
}

const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  const addItem = useCallback((p: Product, identifier?: string) => {
    setItems((prev) => {
      const idx = prev.findIndex((x) => x.product._id === p._id);
      if (idx >= 0) {
        const next = [...prev];
        const existingIdentifiers = next[idx].identifiers || [];
        
        if (identifier) {
          if (existingIdentifiers.includes(identifier)) {
            // Already added this specific IMEI/Serial
            return prev;
          }
          next[idx] = { 
            ...next[idx], 
            qty: next[idx].qty + 1,
            identifiers: [...existingIdentifiers, identifier]
          };
        } else {
          next[idx] = { ...next[idx], qty: next[idx].qty + 1 };
        }
        return next;
      }
      return [...prev, { product: p, qty: 1, identifiers: identifier ? [identifier] : [] }];
    });
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((x) => x.product._id !== id));
  }, []);

  const updateQty = useCallback((id: string, qty: number) => {
    if (qty <= 0) {
      setItems((prev) => prev.filter((x) => x.product._id !== id));
      return;
    }
    // We shouldn't randomly increase qty if identifiers are required, but for UI simplicity we allow it 
    // and rely on validation before checkout. For now just update the qty.
    setItems((prev) => prev.map((x) => (x.product._id === id ? { ...x, qty } : x)));
  }, []);

  const removeIdentifier = useCallback((productId: string, identifier: string) => {
    setItems((prev) => prev.map(x => {
      if (x.product._id === productId && x.identifiers) {
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
