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
        headerStyle: { backgroundColor: theme.surface },
        headerTintColor: theme.text,
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
