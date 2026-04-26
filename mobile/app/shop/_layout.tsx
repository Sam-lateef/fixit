import { Stack } from "expo-router";

import { useI18n } from "@/lib/i18n";
import { theme } from "@/lib/theme";

const brandHeaderOptions = {
  headerShown: true,
  headerTransparent: false,
  headerStyle: { backgroundColor: theme.primary },
  headerTintColor: "#fff",
  headerTitleStyle: { color: "#fff", fontWeight: "700" as const },
  headerShadowVisible: false,
} as const;

export default function ShopStackLayout(): React.ReactElement {
  const { t } = useI18n();
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen
        name="bid/[postId]"
        options={{
          ...brandHeaderOptions,
          presentation: "modal",
          headerBackTitle: t("back"),
        }}
      />
      <Stack.Screen
        name="subscription"
        options={{
          ...brandHeaderOptions,
          presentation: "modal",
          headerBackTitle: t("back"),
        }}
      />
    </Stack>
  );
}
