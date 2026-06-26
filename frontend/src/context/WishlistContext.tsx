import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

import { Product } from "@/services/api";

const STORAGE_KEY = "wishlist_items";

interface WishlistContextType {
  items: Product[];
  addItem: (p: Product) => void;
  removeItem: (id: string) => void;
  isWishlisted: (id: string) => boolean;
  toggle: (p: Product) => void;
}

const WishlistContext = createContext<WishlistContextType | null>(null);

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<Product[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) setItems(JSON.parse(raw));
    });
  }, []);

  const persist = useCallback((next: Product[]) => {
    setItems(next);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const addItem = useCallback((p: Product) => {
    setItems((prev) => {
      if (prev.find((x) => x._id === p._id)) return prev;
      const next = [...prev, p];
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => {
      const next = prev.filter((x) => x._id !== id);
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const isWishlisted = useCallback((id: string) => items.some((x) => x._id === id), [items]);

  const toggle = useCallback(
    (p: Product) => {
      if (isWishlisted(p._id)) removeItem(p._id);
      else addItem(p);
    },
    [isWishlisted, addItem, removeItem]
  );

  return (
    <WishlistContext.Provider value={{ items, addItem, removeItem, isWishlisted, toggle, persist } as WishlistContextType & { persist: (items: Product[]) => void }}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error("useWishlist must be used within WishlistProvider");
  return ctx;
}
