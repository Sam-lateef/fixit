import { Stack } from "expo-router";

import { OwnerTabHeaderBackground } from "@/components/BrandHeaderGradient";
import { useI18n } from "@/lib/i18n";

export default function OwnerStackLayout(): React.ReactElement {
  const { t } = useI18n();
  const stackedScreenOptions = {
    headerShown: true,
    headerTransparent: true,
    headerBackground: () => <OwnerTabHeaderBackground />,
    headerStyle: { backgroundColor: "transparent" },
    headerTintColor: "#fff",
    headerTitleStyle: { color: "#fff", fontWeight: "700" as const },
    headerShadowVisible: false,
    headerBackTitle: t("back"),
  } as const;
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="post/[id]" options={stackedScreenOptions} />
      <Stack.Screen name="shop/[shopId]" options={stackedScreenOptions} />
    </Stack>
  );
}
