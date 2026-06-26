import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { CartProvider } from "@/context/CartContext";
import { WishlistProvider } from "@/context/WishlistContext";
import { useColors } from "@/hooks/useColors";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function AuthGuard() {
  const { user, isGuest, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    const inAuth = segments[0] === "(auth)";
    const inStaff = segments[0] === "(staff)" || segments[0] === "staff";
    const inCustomer = segments[0] === "(tabs)";

    if (!user && !isGuest) {
      if (!inAuth) router.replace("/(auth)/login");
    } else if (user?.role === "staff" || user?.role === "admin") {
      if (inAuth || inCustomer) router.replace("/(staff)");
    } else {
      // logged-in customer OR guest — both allowed in (tabs)
      if (inAuth || inStaff) router.replace("/(tabs)");
    }
  }, [user, isGuest, isLoading, segments]);

  return null;
}

function RootLayoutNav() {
  const colors = useColors();

  return (
    <>
      <AuthGuard />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.foreground,
          headerTitleStyle: { fontFamily: "Inter_600SemiBold", fontSize: 16 },
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(staff)" options={{ headerShown: false }} />
        <Stack.Screen name="product/[id]" options={{ title: "Product", headerShown: false }} />
        <Stack.Screen name="category-products" options={{ headerShown: false }} />
        <Stack.Screen name="staff/add-product" options={{ title: "Add Product", headerShown: false }} />
        <Stack.Screen name="staff/invoice/[id]" options={{ title: "Invoice", headerShown: false }} />
        <Stack.Screen name="staff/stock/[productId]" options={{ title: "Stock Movements", headerShown: false }} />
        <Stack.Screen name="staff/khata" options={{ title: "Khata / Ledger", headerShown: false }} />
        <Stack.Screen name="staff/customer/[id]" options={{ title: "Customer Ledger", headerShown: false }} />
        <Stack.Screen name="staff/quotations" options={{ title: "Quotations", headerShown: false }} />
        <Stack.Screen name="staff/quotation/[id]" options={{ title: "Quotation", headerShown: false }} />
        <Stack.Screen name="staff/expenses" options={{ title: "Expenses", headerShown: false }} />
        <Stack.Screen name="staff/reports" options={{ title: "Reports", headerShown: false }} />
        <Stack.Screen name="staff/staff-mgmt" options={{ title: "Staff Management", headerShown: false }} />
        <Stack.Screen name="staff/users-mgmt" options={{ title: "User Management", headerShown: false }} />
        <Stack.Screen name="staff/banners" options={{ title: "Manage Banners", headerShown: false }} />
        <Stack.Screen
          name="staff/barcode-scanner"
          options={{
            title: "Scan Barcode",
            headerShown: false,
            presentation: "fullScreenModal",
          }}
        />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) SplashScreen.hideAsync();
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <AuthProvider>
              <WishlistProvider>
                <CartProvider>
                  <GestureHandlerRootView style={{ flex: 1 }}>
                    <KeyboardProvider>
                      <RootLayoutNav />
                    </KeyboardProvider>
                  </GestureHandlerRootView>
                </CartProvider>
              </WishlistProvider>
            </AuthProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
