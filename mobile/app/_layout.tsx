import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import * as Notifications from "expo-notifications";
import { Stack, useRouter, type Href } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useRef } from "react";
import { useColorScheme, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
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
    <GestureHandlerRootView style={{ flex: 1 }}>
      <I18nProvider>
        <SubscriptionProvider>
          <RootLayoutNav />
        </SubscriptionProvider>
      </I18nProvider>
    </GestureHandlerRootView>
  );
}

function RootLayoutNav(): React.ReactElement {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const dark = colorScheme === "dark";
  const { isRtl } = useI18n();
  const lastOpenedThreadRef = useRef<string | null>(null);
  const lastOpenAtRef = useRef<number>(0);

  useEffect(() => {
    void SplashScreen.hideAsync().catch(() => undefined);
  }, []);

  useEffect(() => {
    function openThreadFromNotificationData(data: unknown): void {
      if (data === null || typeof data !== "object") {
        return;
      }
      const record = data as Record<string, unknown>;
      const type = typeof record.type === "string" ? record.type : "";
      const threadId = typeof record.threadId === "string" ? record.threadId.trim() : "";
      if (type !== "CHAT" || threadId.length === 0) {
        return;
      }
      const now = Date.now();
      if (
        lastOpenedThreadRef.current === threadId &&
        now - lastOpenAtRef.current < 2000
      ) {
        return;
      }
      lastOpenedThreadRef.current = threadId;
      lastOpenAtRef.current = now;
      router.push(`/chat/${threadId}` as Href);
    }

    void (async () => {
      const last = await Notifications.getLastNotificationResponseAsync();
      if (last) {
        openThreadFromNotificationData(last.notification.request.content.data);
      }
    })();

    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      openThreadFromNotificationData(response.notification.request.content.data);
    });

    return () => {
      sub.remove();
    };
  }, [router]);

  return (
    <ThemeProvider value={dark ? fixitDark : fixitLight}>
      <View style={{ flex: 1, direction: isRtl ? "rtl" : "ltr" }}>
        <StatusBar style={dark ? "light" : "dark"} />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="language-gate" />
          <Stack.Screen name="dev" />
          <Stack.Screen name="report" />
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
