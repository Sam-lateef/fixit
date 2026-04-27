import { Stack } from "expo-router";

import { StackBackButton } from "@/components/StackBackButton";
import { theme } from "@/lib/theme";

export default function OwnerStackLayout(): React.ReactElement {
  const stackedScreenOptions = {
    headerShown: true,
    headerTransparent: false,
    headerStyle: { backgroundColor: theme.primary },
    headerTintColor: "#fff",
    headerTitleStyle: { color: "#fff", fontWeight: "700" as const },
    headerTitleAlign: "center" as const,
    headerShadowVisible: false,
    // Hide native back so iOS doesn't mirror under RTL (renders `Back ›`).
    // Custom button below always renders `‹ Back` in LTR order.
    headerBackVisible: false,
    // Defensive: empty the native back title + minimal display mode so even
    // if headerBackVisible doesn't fully suppress on some iOS version, no
    // `‹ <prev-screen-title>` text can render next to our custom `‹ Back`.
    headerBackTitle: "",
    headerBackButtonDisplayMode: "minimal" as const,
    headerLeft: () => <StackBackButton />,
  } as const;
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="post/[id]" options={stackedScreenOptions} />
      <Stack.Screen name="shop/[shopId]" options={stackedScreenOptions} />
    </Stack>
  );
}
