import { router, useLocalSearchParams, type Href } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { WizardProgressBar } from "@/components/WizardProgressBar";
import { useI18n } from "@/lib/i18n";
import { asShopType } from "@/lib/shop-type";
import { parseSignupWizardData } from "@/lib/signup-wizard-data";
import { theme } from "@/lib/theme";

type ServiceId = "repair" | "parts";

type ServiceDef = {
  id: ServiceId;
  bg: string;
  fg: string;
};

const SERVICES: ReadonlyArray<ServiceDef> = [
  { id: "repair", bg: theme.repairBg, fg: theme.repairText },
  { id: "parts", bg: theme.partsBg, fg: theme.partsText },
];

/**
 * Services step — only reachable when shopType is CAR or MOTORCYCLE. Towing
 * shops skip straight to shop-location from the type picker, so towing logic
 * is intentionally absent here. The user must pick at least one of repair /
 * parts before Continue activates.
 */
export default function ShopServicesStep(): React.ReactElement {
  const { t } = useI18n();
  const raw = useLocalSearchParams<{ data?: string }>();
  const prev = parseSignupWizardData(raw.data);
  const shopType = asShopType(prev.shopType);

  const [selected, setSelected] = useState<Set<ServiceId>>(new Set());

  function toggle(id: ServiceId): void {
    setSelected((p) => {
      const next = new Set(p);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleContinue(): void {
    if (selected.size === 0) return;
    const offersRepair = selected.has("repair");
    const offersParts = selected.has("parts");

    const data = JSON.stringify({
      ...prev,
      offersRepair,
      offersParts,
      offersTowing: false,
    });

    // Motorcycle shops skip the car-specific pickers entirely (no makes,
    // no repair/parts category chips — the taxonomy is car-only today).
    // They jump straight to location.
    if (shopType === "MOTORCYCLE") {
      router.push({ pathname: "/signup/shop-location" as Href, params: { data } } as never);
      return;
    }

    // CAR (and any legacy/unknown — defensive default): car makes + years first.
    router.push({ pathname: "/signup/shop-makes" as Href, params: { data } } as never);
  }

  const canContinue = selected.size > 0;

  return (
    <ScrollView contentContainerStyle={s.container}>
      <WizardProgressBar step={2} />

      <Text style={s.heading}>{t("whatDoYouOffer")}</Text>
      <Text style={s.sub}>{t("selectAll")}</Text>

      <View style={s.cards}>
        {SERVICES.map((svc) => {
          const on = selected.has(svc.id);
          // Re-use the existing top-level repair / parts labels — they read
          // identically in both EN and AR regardless of shopType.
          const label = svc.id === "repair" ? t("repair") : t("parts");
          return (
            <Pressable
              key={svc.id}
              style={[s.card, on && s.cardOn]}
              onPress={() => toggle(svc.id)}
            >
              <Text style={[s.cardLabel, on && s.cardLabelOn]}>{label}</Text>
              {on ? (
                <View style={s.check}>
                  <Text style={s.checkMark}>✓</Text>
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>

      {!canContinue ? (
        <Text style={s.hint}>{t("selectAtLeastOneRepairOrParts")}</Text>
      ) : null}

      <Pressable
        style={[s.btn, !canContinue && s.btnOff]}
        disabled={!canContinue}
        onPress={handleContinue}
      >
        <Text style={s.btnText}>{t("continue")}</Text>
      </Pressable>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { padding: 20, paddingBottom: 40, backgroundColor: theme.surface },
  heading: { fontSize: 22, fontWeight: "700", color: theme.text, textAlign: "left" },
  sub: { fontSize: 14, color: theme.muted, marginTop: 4, textAlign: "left" },
  cards: { marginTop: 20, gap: 12 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: theme.radiusLg,
    borderWidth: 1.5,
    borderColor: theme.border,
    backgroundColor: theme.surface,
  },
  cardOn: {
    borderColor: theme.primary,
    backgroundColor: theme.primaryLight,
  },
  cardLabel: { flex: 1, fontSize: 16, color: theme.text, fontWeight: "600", textAlign: "left" },
  cardLabelOn: { color: theme.primary, fontWeight: "700" },
  check: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: theme.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  checkMark: { color: "#fff", fontSize: 14, fontWeight: "700" },
  hint: { marginTop: 12, fontSize: 13, color: theme.muted, textAlign: "left" },
  btn: {
    marginTop: 20,
    backgroundColor: theme.primaryMid,
    paddingVertical: 14,
    borderRadius: theme.radiusMd,
    alignItems: "center",
  },
  btnOff: { opacity: 0.4 },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
