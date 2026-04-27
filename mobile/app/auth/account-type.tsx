import { router, type Href } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { apiFetch } from "@/lib/api";
import { setToken } from "@/lib/auth-storage";
import { syncRevenueCatUser } from "@/lib/revenuecat";
import { useI18n } from "@/lib/i18n";
import { theme } from "@/lib/theme";

type Choice = "OWNER" | "SHOP" | "TOWING";

/** TOWING providers sign up as SHOP users but with towing pre-selected. */
const CHOICE_USER_TYPE: Record<Choice, "OWNER" | "SHOP"> = {
  OWNER: "OWNER",
  SHOP: "SHOP",
  TOWING: "SHOP",
};

export default function AccountTypeScreen(): React.ReactElement {
  const { t } = useI18n();
  const [choice, setChoice] = useState<Choice>("OWNER");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const cards: { id: Choice; title: string; sub: string }[] = [
    { id: "OWNER", title: t("carOwner"), sub: "Post repair / parts / towing requests" },
    { id: "SHOP", title: t("shop"), sub: "Receive requests and place bids" },
    { id: "TOWING", title: t("towingProvider"), sub: "Offer towing services and respond to tow requests" },
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
              const userType = CHOICE_USER_TYPE[choice];
              await apiFetch("/api/v1/users/me", {
                method: "PUT",
                body: JSON.stringify({ userType }),
              });
              const refreshed = await apiFetch<{
                token: string;
                user: { id: string; userType: "OWNER" | "SHOP" };
              }>("/api/v1/auth/refresh", { method: "POST" });
              await setToken(refreshed.token);
              await syncRevenueCatUser(refreshed.user);

              if (choice === "OWNER") {
                router.replace("/signup/owner-details");
              } else if (choice === "SHOP") {
                // Skip multi-category screen — first release is CARS only
                router.replace({
                  pathname: "/signup/shop" as Href,
                  params: { data: JSON.stringify({ category: "CARS" }) },
                } as never);
              } else {
                // Towing provider: skip service-selection + makes + category steps,
                // jump straight to name / location.
                router.replace({
                  pathname: "/signup/shop-location" as Href,
                  params: {
                    data: JSON.stringify({
                      category: "CARS",
                      offersTowing: true,
                      offersRepair: false,
                      offersParts: false,
                      carMakes: [],
                      repairCategories: [],
                      partsCategories: [],
                      deliveryAvailable: false,
                    }),
                  },
                } as never);
              }
            } catch (e) {
              setErr(e instanceof Error ? e.message : "Failed");
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
