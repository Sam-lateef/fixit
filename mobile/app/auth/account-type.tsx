import { router, type Href } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { apiFetch } from "@/lib/api";
import { friendlyApiError } from "@/lib/api-error";
import { setToken } from "@/lib/auth-storage";
import { syncRevenueCatUser } from "@/lib/revenuecat";
import { useI18n } from "@/lib/i18n";
import { theme } from "@/lib/theme";

type Choice = "OWNER" | "SHOP";

export default function AccountTypeScreen(): React.ReactElement {
  const { t } = useI18n();
  const [choice, setChoice] = useState<Choice>("OWNER");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  // Towing providers used to be their own top-level choice with a fast-path
  // straight to /signup/shop-location. They're now a sub-type of SHOP that
  // the user picks on /signup/shop-type — one less place to keep aligned
  // with the offers* booleans.
  const cards: { id: Choice; title: string; sub: string }[] = [
    { id: "OWNER", title: t("carOwner"), sub: "Post repair / parts / towing requests" },
    {
      id: "SHOP",
      title: t("shop"),
      sub: "Receive requests and place bids (car / motorcycle / towing)",
    },
  ];

  return (
    <View style={styles.screen}>
      <Text style={styles.h1}>{t("accountType")}</Text>

      {cards.map((c) => (
        <Pressable
          key={c.id}
          style={[styles.card, choice === c.id && styles.cardOn]}
          onPress={() => setChoice(c.id)}
        >
          <Text style={[styles.cardTitle, choice === c.id && styles.cardTitleOn]}>
            {c.title}
          </Text>
          <Text style={styles.cardSub}>{c.sub}</Text>
        </Pressable>
      ))}

      <Pressable
        style={[styles.btn, busy && styles.btnDisabled]}
        disabled={busy}
        onPress={() => {
          setErr("");
          setBusy(true);
          void (async () => {
            try {
              await apiFetch("/api/v1/users/me", {
                method: "PUT",
                body: JSON.stringify({ userType: choice }),
              });
              const refreshed = await apiFetch<{
                token: string;
                user: { id: string; userType: "OWNER" | "SHOP" };
              }>("/api/v1/auth/refresh", { method: "POST" });
              await setToken(refreshed.token);
              await syncRevenueCatUser(refreshed.user);

              if (choice === "OWNER") {
                router.replace("/signup/owner-details");
              } else {
                // SHOP — every sub-type (Car / Motorcycle / Towing) starts
                // on the new shop-type picker. No more pre-baked shortcuts.
                router.replace("/signup/shop-type" as Href);
              }
            } catch (e) {
              setErr(friendlyApiError(e, t));
            } finally {
              setBusy(false);
            }
          })();
        }}
      >
        <Text style={styles.btnText}>{t("continue")}</Text>
      </Pressable>
      {err ? <Text style={styles.err}>{err}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 20, backgroundColor: theme.surface },
  h1: { fontSize: 22, fontWeight: "700", color: theme.text, marginBottom: 16, textAlign: "left" },
  card: {
    padding: 16,
    borderRadius: theme.radiusLg,
    borderWidth: 2,
    borderColor: theme.border,
    marginBottom: 12,
  },
  cardOn: {
    borderColor: theme.primaryMid,
    backgroundColor: theme.primaryLight,
  },
  cardTitle: { fontSize: 16, fontWeight: "700", color: theme.text, textAlign: "left" },
  cardTitleOn: { color: theme.primary },
  cardSub: { fontSize: 13, color: theme.muted, marginTop: 3, textAlign: "left" },
  btn: {
    marginTop: 16,
    backgroundColor: theme.primaryMid,
    paddingVertical: 14,
    borderRadius: theme.radiusMd,
    alignItems: "center",
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  err: { marginTop: 12, color: theme.danger, fontSize: 13 },
});
