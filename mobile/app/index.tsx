import { router, type Href } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { BootstrapTransientError, resolveInitialRoute } from "@/lib/bootstrap";
import { friendlyApiError } from "@/lib/api-error";
import { getToken } from "@/lib/auth-storage";
import { isDevNavHubEnabled } from "@/lib/dev-nav-hub";
import { hasCompletedLocaleGate, setLocaleGateCompleted } from "@/lib/locale-gate";
import { useI18n } from "@/lib/i18n";
import { takeNotificationRoute } from "@/lib/notification-navigation";
import { signOutFromApp } from "@/lib/sign-out";
import { hrefAuthWelcome } from "@/lib/routes-href";
import { theme } from "@/lib/theme";

export default function IndexScreen(): React.ReactElement {
  const { t } = useI18n();
  const [transientError, setTransientError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);

  const runBootstrap = useCallback(async () => {
    setTransientError(null);
    if (isDevNavHubEnabled()) {
      router.replace("/dev");
      return;
    }
    let gateOk = await hasCompletedLocaleGate();
    if (!gateOk) {
      const token = await getToken();
      if (token) {
        await setLocaleGateCompleted();
        gateOk = true;
      }
    }
    if (!gateOk) {
      router.replace("/language-gate");
      return;
    }
    try {
      const target = await resolveInitialRoute();
      if (target.path === "/signup/owner-location") {
        router.replace({
          pathname: "/signup/owner-location",
          params: { city: target.params.city },
        });
        return;
      }
      router.replace(target.path as Href);
      const pending = takeNotificationRoute();
      if (pending) {
        router.push(pending);
      }
    } catch (e) {
      if (e instanceof BootstrapTransientError) {
        setTransientError(friendlyApiError(e, t, "bootstrapNetworkErrorBody"));
        return;
      }
      // Unknown error — re-throw so the Expo error boundary catches it instead
      // of leaving a blank splash.
      throw e;
    }
  }, [t]);

  useEffect(() => {
    void runBootstrap();
  }, [runBootstrap]);

  const onRetry = useCallback(() => {
    setRetrying(true);
    void (async () => {
      try {
        await runBootstrap();
      } finally {
        setRetrying(false);
      }
    })();
  }, [runBootstrap]);

  const onSignOut = useCallback(() => {
    void (async () => {
      try {
        await signOutFromApp();
      } finally {
        router.replace(hrefAuthWelcome);
      }
    })();
  }, []);

  if (transientError) {
    return (
      <View style={styles.wrap}>
        <Text style={styles.errTitle}>{t("bootstrapNetworkErrorTitle")}</Text>
        <Text style={styles.errBody}>{t("bootstrapNetworkErrorBody")}</Text>
        {__DEV__ ? (
          <Text style={styles.errDetail} numberOfLines={3}>
            {transientError}
          </Text>
        ) : null}
        <Pressable
          style={[styles.btn, retrying && styles.btnDisabled]}
          disabled={retrying}
          onPress={onRetry}
        >
          {retrying ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.btnText}>{t("retry")}</Text>
          )}
        </Pressable>
        <Pressable style={styles.btnSecondary} onPress={onSignOut}>
          <Text style={styles.btnSecondaryText}>{t("signOut")}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{t("appName")}</Text>
      <Text style={styles.tag}>{t("tagline")}</Text>
      <ActivityIndicator
        color={theme.primaryMid}
        style={styles.spin}
        size="large"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: theme.surface,
    padding: 24,
  },
  title: { fontSize: 26, fontWeight: "800", color: theme.primary, marginTop: 8, textAlign: "left" },
  tag: {
    fontSize: 14,
    color: theme.mutedLight,
    marginTop: 8,
    textAlign: "center",
  },
  spin: { marginTop: 32 },
  errTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: theme.text,
    textAlign: "center",
    marginBottom: 8,
  },
  errBody: {
    fontSize: 15,
    color: theme.muted,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 16,
    maxWidth: 320,
  },
  errDetail: {
    fontSize: 12,
    color: theme.mutedLight,
    textAlign: "center",
    marginBottom: 24,
    maxWidth: 320,
  },
  btn: {
    backgroundColor: theme.primaryMid,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: theme.radiusMd,
    alignItems: "center",
    minWidth: 140,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  btnSecondary: {
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 32,
  },
  btnSecondaryText: { color: theme.muted, fontSize: 14, fontWeight: "600" },
});
