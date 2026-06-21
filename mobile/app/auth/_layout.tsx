import { Stack } from "expo-router";
import { Platform } from "react-native";

import { HeaderBackButton, HeaderLogoutButton } from "@/components/SessionHeaderButtons";
import { useI18n } from "@/lib/i18n";
import { theme } from "@/lib/theme";

const flowHeader = {
  headerTitle: "" as const,
  headerLeft: () => <HeaderBackButton />,
  headerRight: () => <HeaderLogoutButton />,
};

export default function AuthLayout(): React.ReactElement {
  const { isRtl } = useI18n();

  // Android native-stack screens often ignore I18nManager for layout — set
  // direction on the stack content. iOS already mirrors via I18nManager;
  // adding direction there double-flips auth screens back to LTR.
  const stackContentStyle =
    Platform.OS === "android"
      ? {
          backgroundColor: theme.surface,
          direction: isRtl ? ("rtl" as const) : ("ltr" as const),
        }
      : { backgroundColor: theme.surface };

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
        contentStyle: stackContentStyle,
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
