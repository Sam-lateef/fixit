import { Stack } from "expo-router";

import { theme } from "@/lib/theme";

export default function ShopStackLayout(): React.ReactElement {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen
        name="bid/[postId]"
        options={{
          presentation: "modal",
          headerShown: true,
          headerStyle: { backgroundColor: theme.surface },
          headerTintColor: theme.text,
        }}
      />
      <Stack.Screen
        name="subscription"
        options={{
          presentation: "modal",
          headerShown: true,
          headerStyle: { backgroundColor: theme.surface },
          headerTintColor: theme.text,
        }}
      />
    </Stack>
  );
}
