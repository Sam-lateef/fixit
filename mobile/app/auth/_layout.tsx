import { Stack } from "expo-router";

import { HeaderBackButton, HeaderLogoutButton } from "@/components/SessionHeaderButtons";
import { theme } from "@/lib/theme";

const flowHeader = {
  headerTitle: "" as const,
  headerLeft: () => <HeaderBackButton />,
  headerRight: () => <HeaderLogoutButton />,
};

export default function AuthLayout(): React.ReactElement {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerTransparent: false,
        headerStyle: { backgroundColor: theme.primary },
        headerTintColor: "#fff",
        headerTitleStyle: { color: "#fff", fontWeight: "700" as const },
        headerTitleAlign: "center",
        headerShadowVisible: false,
        contentStyle: { backgroundColor: theme.surface },
        // Suppress native iOS back button + any auto back-title so only the
        // custom `‹ Back` from HeaderBackButton ever renders.
        headerBackVisible: false,
        headerBackTitle: "",
        headerBackButtonDisplayMode: "minimal",
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="number" options={flowHeader} />
      <Stack.Screen name="otp" options={flowHeader} />
      <Stack.Screen name="account-type" options={flowHeader} />
    </Stack>
  );
}
