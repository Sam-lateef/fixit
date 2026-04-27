import { router, type Href } from "expo-router";

import { hrefAuthWelcome } from "@/lib/routes-href";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { isDevNavHubEnabled } from "@/lib/dev-nav-hub";
import { devSessionLogin } from "@/lib/dev-session";
import { useI18n } from "@/lib/i18n";
import { theme } from "@/lib/theme";

type LinkDef = { label: string; onPress: () => void };

function Section(props: { title: string; links: LinkDef[] }): React.ReactElement {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{props.title}</Text>
      {props.links.map((l) => (
        <Pressable
          key={l.label}
          style={({ pressed }) => [styles.link, pressed && styles.linkPressed]}
          onPress={l.onPress}
        >
          <Text style={styles.linkText}>{l.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

/**
 * Dev-only route map: open any stack without logging in.
 * API calls may fail (no JWT); UI should still render.
 */
export default function DevNavHubScreen(): React.ReactElement {
  const { t } = useI18n();

  if (!isDevNavHubEnabled()) {
    return (
      <View style={styles.center}>
        <Text style={styles.warn}>
          Set EXPO_PUBLIC_DEV_NAV_HUB=true in mobile .env and restart Metro.
        </Text>
        <Pressable style={styles.link} onPress={() => router.replace("/")}>
          <Text style={styles.linkText}>Back to splash</Text>
        </Pressable>
      </View>
    );
  }

  const mockPhone = "+9647000000000";
  const mockPostId = "preview-post-id";

  function login(role: "OWNER" | "SHOP"): void {
    void (async () => {
      try {
        await devSessionLogin(role);
        const dest = (role === "OWNER" ? "/owner" : "/shop") as Href;
        router.replace(dest);
      } catch (e) {
        Alert.alert(
          "Dev session",
          e instanceof Error ? e.message : "Failed — is API running with DEV_ALLOW_SESSION_LOGIN?",
        );
      }
    })();
  }

  const session: LinkDef[] = [
    {
      label: t("devLoginOwner"),
      onPress: () => login("OWNER"),
    },
    {
      label: t("devLoginShop"),
      onPress: () => login("SHOP"),
    },
  ];

  const go = (href: Href): void => {
    router.navigate(href);
  };

  const auth: LinkDef[] = [
    {
      label: "Auth — phone number",
      onPress: () => go(hrefAuthWelcome),
    },
    {
      label: "Auth — OTP",
      onPress: () =>
        go({ pathname: "/auth/otp", params: { phone: mockPhone } }),
    },
    {
      label: "Auth — account type",
      onPress: () => go("/auth/account-type"),
    },
  ];

  const signup: LinkDef[] = [
    {
      label: "Signup — owner details",
      onPress: () => go("/signup/owner-details"),
    },
    {
      label: "Signup — owner location",
      onPress: () =>
        go({
          pathname: "/signup/owner-location",
          params: { city: "Baghdad" },
        }),
    },
    {
      label: "Signup — shop",
      onPress: () => go("/signup/shop"),
    },
  ];

  const owner: LinkDef[] = [
    {
      label: "Owner — home (tabs)",
      onPress: () => go("/owner"),
    },
    {
      label: "Owner — new post",
      onPress: () => go("/owner/create"),
    },
    {
      label: "Owner — inbox",
      onPress: () => go("/owner/inbox"),
    },
    {
      label: "Owner — profile",
      onPress: () => go("/owner/profile"),
    },
  ];

  const shop: LinkDef[] = [
    {
      label: "Shop — requests",
      onPress: () => go("/shop"),
    },
    {
      label: "Shop — bids",
      onPress: () => go("/shop/bids"),
    },
    {
      label: "Shop — inbox",
      onPress: () => go("/shop/inbox"),
    },
    {
      label: "Shop — profile",
      onPress: () => go("/shop/profile"),
    },
    {
      label: "Shop — bid modal (mock post)",
      onPress: () => go(`/shop/bid/${mockPostId}`),
    },
  ];

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
      nestedScrollEnabled
    >
      <Text style={styles.h1}>Dev navigation</Text>
      <Text style={styles.hint}>
        Use Session below for a real JWT, or open screens without a token (API
        may fail).
      </Text>
      <Section title="Session (skip OTP)" links={session} />
      <Text style={styles.subHint}>{t("devLoginHint")}</Text>
      <Section title="Auth" links={auth} />
      <Section title="Signup" links={signup} />
      <Section title="Owner" links={owner} />
      <Section title="Shop" links={shop} />
      <Pressable
        style={({ pressed }) => [styles.secondary, pressed && styles.linkPressed]}
        onPress={() => router.replace("/")}
      >
        <Text style={styles.secondaryText}>Restart app (splash / bootstrap)</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: theme.surface },
  scrollContent: { padding: 20, paddingBottom: 48 },
  center: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
    backgroundColor: theme.surface,
  },
  warn: { color: theme.danger, marginBottom: 16, fontSize: 15 },
  h1: { fontSize: 22, fontWeight: "700", color: theme.text, marginBottom: 8, textAlign: "left" },
  hint: { fontSize: 13, color: theme.muted, marginBottom: 12, textAlign: "left" },
  subHint: { fontSize: 12, color: theme.muted, marginBottom: 20, lineHeight: 18 },
  section: { marginBottom: 20 },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: theme.primaryMid,
    marginBottom: 8,
    textTransform: "uppercase",
  },
  link: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: theme.chip,
    borderRadius: theme.radiusMd,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: theme.border,
  },
  linkPressed: { opacity: 0.85 },
  linkText: { fontSize: 15, color: theme.text, fontWeight: "500" },
  secondary: {
    marginTop: 12,
    paddingVertical: 14,
    alignItems: "center",
    borderRadius: theme.radiusMd,
    borderWidth: 1,
    borderColor: theme.border,
  },
  secondaryText: { color: theme.muted, fontSize: 14 },
});
