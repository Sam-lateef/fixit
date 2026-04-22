import { Stack } from "expo-router";

import { HeaderBackButton, HeaderLogoutButton } from "@/components/SessionHeaderButtons";
import { theme } from "@/lib/theme";

export default function SignupLayout(): React.ReactElement {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: theme.surface },
        headerTintColor: theme.text,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: theme.surface },
        headerTitle: "",
        headerLeft: () => <HeaderBackButton />,
        headerRight: () => <HeaderLogoutButton />,
      }}
    >
      <Stack.Screen name="owner-details" />
      <Stack.Screen name="owner-location" />
      <Stack.Screen name="shop-category" />
      <Stack.Screen name="shop" />
      <Stack.Screen name="shop-makes" />
      <Stack.Screen name="shop-repair-cats" />
      <Stack.Screen name="shop-parts-cats" />
      <Stack.Screen name="shop-location" />
      <Stack.Screen name="shop-area" />
    </Stack>
  );
}
