import { Stack } from "expo-router";

import { StackBackButton } from "@/components/StackBackButton";
import { theme } from "@/lib/theme";

const brandHeaderOptions = {
  headerShown: true,
  headerTransparent: false,
  headerStyle: { backgroundColor: theme.primary },
  headerTintColor: "#fff",
  headerTitleStyle: { color: "#fff", fontWeight: "700" as const },
  headerShadowVisible: false,
  // Hide native back so iOS doesn't mirror under RTL (renders `Back ›`).
  // Custom button below always renders `‹ Back` in LTR order.
  headerBackVisible: false,
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
