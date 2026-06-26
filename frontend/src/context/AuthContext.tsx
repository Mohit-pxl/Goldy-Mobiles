import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

import { apiPost, User } from "@/services/api";
import { useTheme } from "@/context/ThemeContext";

interface AuthContextType {
  user: User | null;
  isGuest: boolean;
  isLoading: boolean;
  sendOtp: (email: string) => Promise<void>;
  verifyOtp: (email: string, otp: string) => Promise<void>;
  login: (email: string, pass: string) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  enterGuestMode: () => void;
  devLogin: (role: "admin" | "staff" | "customer") => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { resetTheme } = useTheme();

  const loadUser = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem("auth_token");
      const stored = await AsyncStorage.getItem("auth_user");
      if (token && stored) {
        setUser(JSON.parse(stored));
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const sendOtp = useCallback(async (email: string) => {
    await apiPost<{ message: string }>("/auth/send-otp", { email });
  }, []);

  const verifyOtp = useCallback(async (email: string, otp: string) => {
    const res = await apiPost<{ token: string; user: User }>("/auth/verify-otp", { email, otp });
    await AsyncStorage.setItem("auth_token", res.data.token);
    await AsyncStorage.setItem("auth_user", JSON.stringify(res.data.user));
    setUser(res.data.user);
  }, []);

  const login = useCallback(async (email: string, pass: string) => {
    const res = await apiPost<{ token: string; user: User }>("/auth/login", { email, password: pass });
    await AsyncStorage.setItem("auth_token", res.data.token);
    await AsyncStorage.setItem("auth_user", JSON.stringify(res.data.user));
    setUser(res.data.user);
  }, []);

  const register = useCallback(async (data: any) => {
    const res = await apiPost<{ token: string; user: User }>("/auth/register", data);
    await AsyncStorage.setItem("auth_token", res.data.token);
    await AsyncStorage.setItem("auth_user", JSON.stringify(res.data.user));
    setUser(res.data.user);
  }, []);

  const enterGuestMode = useCallback(() => {
    setIsGuest(true);
  }, []);

  const devLogin = useCallback(async (role: "admin" | "staff" | "customer") => {
    const mockUser: User = {
      _id: `dev-${role}`,
      name: role === "admin" ? "Dev Admin" : role === "staff" ? "Dev Staff" : "Dev Customer",
      email: `dev-${role}@goldymobiles.local`,
      role,
      permissions: {
        canViewCostPrice: role !== "customer",
        canEditPrice: role === "admin",
        canViewReports: role !== "customer",
        canManageStaff: role === "admin",
      },
    };
    await AsyncStorage.setItem("auth_token", `dev-token-${role}`);
    await AsyncStorage.setItem("auth_user", JSON.stringify(mockUser));
    setIsGuest(false);
    setUser(mockUser);
  }, []);

  const logout = useCallback(async () => {
    await AsyncStorage.multiRemove(["auth_token", "auth_user"]);
    setUser(null);
    setIsGuest(false);
    await resetTheme();
    router.replace("/(auth)");
  }, [resetTheme]);

  const refreshUser = useCallback(async () => {
    const stored = await AsyncStorage.getItem("auth_user");
    if (stored) setUser(JSON.parse(stored));
  }, []);

  return (
    <AuthContext.Provider value={{ user, isGuest, isLoading, sendOtp, verifyOtp, login, register, logout, refreshUser, enterGuestMode, devLogin }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
