import { useRouter } from "expo-router";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { Alert } from "react-native";

import { useAuth } from "./AuthContext";
import { Product, apiGet, apiPost, apiDelete } from "@/services/api";

interface WishlistContextType {
  items: Product[];
  addItem: (p: Product) => void;
  removeItem: (id: string) => void;
  isWishlisted: (id: string) => boolean;
  toggle: (p: Product) => void;
  isLoading: boolean;
}

const WishlistContext = createContext<WishlistContextType | null>(null);

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const router = useRouter();

  const fetchWishlist = useCallback(async () => {
    if (!user) {
      setItems([]);
      return;
    }
    
    try {
      setIsLoading(true);
      const res = await apiGet<Product[]>("/wishlist");
      if (res.success) {
        setItems(res.data);
      }
    } catch (error) {
      console.error("Failed to fetch wishlist:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchWishlist();
  }, [fetchWishlist]);

  const requireLogin = useCallback(() => {
    Alert.alert("Login Required", "Please log in to manage your wishlist.", [
      { text: "Cancel", style: "cancel" },
      { text: "Log In", onPress: () => router.push("/(auth)") }
    ]);
  }, [router]);

  const addItem = useCallback(
    (p: Product) => {
      if (!user) {
        requireLogin();
        return;
      }
      
      setItems((prev) => {
        if (prev.find((x) => x._id === p._id)) return prev;
        return [...prev, p];
      });

      // API Call
      apiPost("/wishlist", { productId: p._id }).catch((error) => {
        console.error("Failed to add to wishlist", error);
        // Rollback on failure (simplified)
        setItems((prev) => prev.filter((x) => x._id !== p._id));
      });
    },
    [user, requireLogin]
  );

  const removeItem = useCallback(
    (id: string) => {
      if (!user) {
        requireLogin();
        return;
      }

      let removedItem: Product | undefined;
      setItems((prev) => {
        removedItem = prev.find((x) => x._id === id);
        return prev.filter((x) => x._id !== id);
      });

      // API Call
      apiDelete(`/wishlist/${id}`).catch((error) => {
        console.error("Failed to remove from wishlist", error);
        // Rollback on failure
        if (removedItem) {
          setItems((prev) => [...prev, removedItem!]);
        }
      });
    },
    [user, requireLogin]
  );

  const isWishlisted = useCallback((id: string) => items.some((x) => x._id === id), [items]);

  const toggle = useCallback(
    (p: Product) => {
      if (!user) {
        requireLogin();
        return;
      }
      if (isWishlisted(p._id)) removeItem(p._id);
      else addItem(p);
    },
    [isWishlisted, addItem, removeItem, user, requireLogin]
  );

  return (
    <WishlistContext.Provider value={{ items, addItem, removeItem, isWishlisted, toggle, isLoading }}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error("useWishlist must be used within WishlistProvider");
  return ctx;
}
