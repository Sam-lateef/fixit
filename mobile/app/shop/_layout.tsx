import { Stack } from "expo-router";

import { StackBackButton } from "@/components/StackBackButton";
import { theme } from "@/lib/theme";

const brandHeaderOptions = {
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
  // Defensive: even if `headerBackVisible: false` doesn't fully suppress the
  // native button on some iOS version, force-empty the back title and set
  // minimal display mode so it can never render `‹ <prev-screen-title>`
  // next to our custom `‹ Back`.
  headerBackTitle: "",
  headerBackButtonDisplayMode: "minimal" as const,
  headerLeft: () => <StackBackButton />,
} as const;

export default function ShopStackLayout(): React.ReactElement {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen
        name="bid/[postId]"
        options={{
          ...brandHeaderOptions,
          presentation: "modal",
        }}
      />
      <Stack.Screen
        name="subscription"
        options={{
          ...brandHeaderOptions,
          presentation: "modal",
        }}
      />
    </Stack>
  );
}
