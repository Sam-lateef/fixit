import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { useColorScheme, View } from "react-native";
import { SubscriptionProvider } from "@/hooks/useSubscription";
import { I18nProvider, useI18n } from "@/lib/i18n";
import { configureForegroundNotifications } from "@/lib/push-notifications";
import { theme } from "@/lib/theme";

export { ErrorBoundary } from "expo-router";

// Splash uses keep-awake on Android; if the activity is not foregrounded during startup, activation can
// reject (expo/expo#23390). Recommended: call preventAutoHideAsync in module scope — still swallow rejection.
void SplashScreen.preventAutoHideAsync().catch(() => undefined);

// Set notification display behaviour once at startup
configureForegroundNotifications();

const fixitLight = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: theme.primaryMid,
    background: theme.bg,
    card: theme.surface,
    text: theme.text,
    border: theme.border,
    notification: theme.primary,
  },
};

const fixitDark = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: theme.primaryLight,
    background: "#0f172a",
    card: "#1e293b",
    text: "#f8fafc",
    border: "#334155",
    notification: theme.primaryMid,
  },
};

export default function RootLayout(): React.ReactElement {
  return (
    <I18nProvider>
      <SubscriptionProvider>
        <RootLayoutNav />
      </SubscriptionProvider>
    </I18nProvider>
  );
}

function RootLayoutNav(): React.ReactElement {
  const colorScheme = useColorScheme();
  const dark = colorScheme === "dark";
  const { isRtl } = useI18n();

  useEffect(() => {
    void SplashScreen.hideAsync().catch(() => undefined);
  }, []);

  return (
    <ThemeProvider value={dark ? fixitDark : fixitLight}>
      <View
        style={{
          flex: 1,
          direction: isRtl ? "rtl" : "ltr",
        }}
      >
        <StatusBar style={dark ? "light" : "dark"} />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="language-gate" />
          <Stack.Screen name="dev" />
          <Stack.Screen name="chat" />
          <Stack.Screen name="auth" />
          <Stack.Screen name="signup" />
          <Stack.Screen name="owner" />
          <Stack.Screen name="shop" />
        </Stack>
      </View>
    </ThemeProvider>
  );
}
