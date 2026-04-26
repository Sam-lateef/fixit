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
        headerShadowVisible: false,
        contentStyle: { backgroundColor: theme.surface },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="number" options={flowHeader} />
      <Stack.Screen name="otp" options={flowHeader} />
      <Stack.Screen name="account-type" options={flowHeader} />
    </Stack>
  );
}
