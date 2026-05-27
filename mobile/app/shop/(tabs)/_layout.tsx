import FontAwesome from "@expo/vector-icons/FontAwesome";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router, Tabs, type Href } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { apiFetch } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { theme } from "@/lib/theme";

type MeUserShape = {
  userType: "OWNER" | "SHOP";
  shop: { id: string } | null;
};

export default function ShopTabsLayout(): React.ReactElement {
  const { t } = useI18n();
  // Mirror the owner tab layout: grow the tab bar by the bottom safe-area
  // inset so icons don't hug the iPhone home indicator.
  const insets = useSafeAreaInsets();

  // Guard: a SHOP user with no shop record (mid-signup, cancelled wizard,
  // stale back-stack) must never see /shop tabs — every tab would surface
  // "Shop not found" because /shops/me, /bids/mine, /feed all 404 without
  // a shop. Bootstrap routes them to /signup/shop on cold start; this
  // mounted-guard catches the warm-state cases where bootstrap didn't run.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const { user } = await apiFetch<{ user: MeUserShape }>(
          "/api/v1/users/me",
        );
        if (cancelled) return;
        if (user.userType === "SHOP" && !user.shop) {
          router.replace("/signup/shop" as Href);
        }
      } catch {
        // apiFetch handles 401 by redirecting to /auth itself. Other
        // failures (transient network) — leave the tabs visible; per-tab
        // loaders will surface their own errors via loadError banners.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
    <StatusBar style="light" />
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.primaryMid,
        tabBarInactiveTintColor: theme.mutedLight,
        headerTransparent: false,
        headerStyle: { backgroundColor: theme.primary },
        headerTintColor: "#fff",
        headerTitleStyle: { color: "#fff", fontWeight: "700" },
        headerShadowVisible: false,
        tabBarStyle: {
          backgroundColor: theme.surface,
          borderTopColor: theme.border,
          height: 60 + insets.bottom,
          paddingBottom: 8 + insets.bottom,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t("feed"),
          tabBarIcon: ({ color }) => (
            <MaterialIcons name="format-list-bulleted" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="bids"
        options={{
          title: t("myBids"),
          tabBarIcon: ({ color }) => (
            <FontAwesome name="gavel" size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="inbox"
        options={{
          title: t("inbox"),
          tabBarIcon: ({ color }) => (
            <FontAwesome name="envelope" size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t("profile"),
          tabBarIcon: ({ color }) => (
            <FontAwesome name="user" size={22} color={color} />
          ),
        }}
      />
    </Tabs>
    </>
  );
}
