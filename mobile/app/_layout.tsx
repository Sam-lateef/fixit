import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import * as Notifications from "expo-notifications";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useRef } from "react";
import { useColorScheme, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SubscriptionProvider } from "@/hooks/useSubscription";
import { I18nProvider, useI18n } from "@/lib/i18n";
import { extractPushEventType } from "@/lib/parse-push-notification-data";
import {
  notificationHrefFromData,
  stashNotificationRoute,
} from "@/lib/notification-navigation";
import { pushEvents } from "@/lib/push-events";
import { configureForegroundNotifications } from "@/lib/push-notifications";
import { theme } from "@/lib/theme";

function emitPushEventFromNotificationData(data: unknown): void {
  const type = extractPushEventType(data);
  if (type) {
    pushEvents.emit(type);
  }
}

function handleNotificationOpen(
  data: unknown,
  router: ReturnType<typeof useRouter>,
  dedupe: { last: string | null; at: number },
): void {
  emitPushEventFromNotificationData(data);
  const href = notificationHrefFromData(data);
  if (!href) {
    return;
  }
  const hrefKey = typeof href === "string" ? href : JSON.stringify(href);
  const now = Date.now();
  if (dedupe.last === hrefKey && now - dedupe.at < 2000) {
    return;
  }
  dedupe.last = hrefKey;
  dedupe.at = now;
  stashNotificationRoute(href);
  router.push(href);
}

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
      {/* KeyboardProvider powers react-native-keyboard-controller's
          edge-to-edge-aware keyboard handling. Required because Expo SDK
          54 enables edge-to-edge by default on Android 15+, where the
          stock `adjustResize` + KeyboardAvoidingView combination no
          longer works reliably (composer hides under keyboard / phantom
          gaps after show/hide cycles — chat bug 2026-05-28). */}
      <KeyboardProvider>
        <I18nProvider>
          <SubscriptionProvider>
            <RootLayoutNav />
          </SubscriptionProvider>
        </I18nProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}

function RootLayoutNav(): React.ReactElement {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const dark = colorScheme === "dark";
  const { isRtl } = useI18n();
  const lastNavRef = useRef<{ last: string | null; at: number }>({
    last: null,
    at: 0,
  });

  useEffect(() => {
    const dedupe = lastNavRef.current;
    void (async () => {
      const last = await Notifications.getLastNotificationResponseAsync();
      if (last) {
        handleNotificationOpen(last.notification.request.content.data, router, dedupe);
      }
    })();

    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      handleNotificationOpen(response.notification.request.content.data, router, dedupe);
    });

    // Foreground receipts: when a push arrives while the app is open, emit a
    // typed event so screens showing affected data can refetch without the
    // user pulling-to-refresh.
    const receivedSub = Notifications.addNotificationReceivedListener((notif) => {
      emitPushEventFromNotificationData(notif.request.content.data);
    });

    return () => {
      sub.remove();
      receivedSub.remove();
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
