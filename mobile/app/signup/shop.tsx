import { router, useLocalSearchParams, type Href } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { WizardProgressBar } from "@/components/WizardProgressBar";
import { useI18n } from "@/lib/i18n";
import type { ServiceCategory } from "@/lib/service-category";
import type { StringKey } from "@/lib/strings";
import { theme } from "@/lib/theme";

type ServiceId = "repair" | "parts" | "towing";

type ServiceDef = {
  id: ServiceId;
  labelKey: (isCars: boolean) => StringKey;
  bg: string;
  fg: string;
  carsOnly: boolean;
};

const SERVICES: ReadonlyArray<ServiceDef> = [
  {
    id: "repair",
    labelKey: (isCars) => (isCars ? "repair" : "serviceJob"),
    bg: theme.repairBg,
    fg: theme.repairText,
    carsOnly: false,
  },
  {
    id: "parts",
    labelKey: (isCars) => (isCars ? "parts" : "serviceSupplies"),
    bg: theme.partsBg,
    fg: theme.partsText,
    carsOnly: false,
  },
  {
    id: "towing",
    labelKey: () => "towing",
    bg: theme.towingBg,
    fg: theme.towingText,
    carsOnly: true,
  },
];

export default function ShopOfferStep(): React.ReactElement {
  const { t } = useI18n();
  const raw = useLocalSearchParams<{ data?: string }>();
  const prev: Record<string, unknown> = raw.data
    ? (JSON.parse(raw.data as string) as Record<string, unknown>)
    : {};
  const category = (prev.category as ServiceCategory | undefined) ?? "CARS";
  const isCars = category === "CARS";

  const [selected, setSelected] = useState<Set<ServiceId>>(new Set());

  function toggle(id: ServiceId): void {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleContinue(): void {
    const data = JSON.stringify({
      category,
      offersRepair: selected.has("repair"),
      offersParts: selected.has("parts"),
      offersTowing: isCars && selected.has("towing"),
      // Non-CARS shops have no make/category preferences
      carMakes: isCars ? undefined : [],
      repairCategories: isCars ? undefined : [],
      partsCategories: isCars ? undefined : [],
    });

    // Non-CARS shops: skip makes + category steps entirely → go straight to location
    const nextPath = isCars ? "/signup/shop-makes" : "/signup/shop-location";

    router.push({
      pathname: nextPath as Href,
      params: { data },
    } as never);
  }

  const visibleServices = SERVICES.filter((svc) => !svc.carsOnly || isCars);

  return (
    <ScrollView contentContainerStyle={s.container}>
      <WizardProgressBar step={2} />

      <Text style={s.heading}>{t("whatDoYouOffer")}</Text>
      <Text style={s.sub}>{t("selectAll")}</Text>

      <View style={s.cards}>
        {visibleServices.map((svc) => {
          const on = selected.has(svc.id);
          const label = t(svc.labelKey(isCars));
          return (
            <Pressable
              key={svc.id}
              style={[s.card, on && s.cardOn]}
              onPress={() => toggle(svc.id)}
            >
              <View style={[s.icon, { backgroundColor: svc.bg }]}>
                <Text style={{ color: svc.fg, fontSize: 20, fontWeight: "700" }}>
                  {label.charAt(0).toUpperCase()}
                </Text>
              </View>
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

      <Pressable
        style={[s.btn, selected.size === 0 && s.btnOff]}
        disabled={selected.size === 0}
        onPress={handleContinue}
      >
        <Text style={s.btnText}>{t("continue")}</Text>
      </Pressable>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { padding: 20, paddingBottom: 40, backgroundColor: theme.surface },
  heading: { fontSize: 22, fontWeight: "700", color: theme.text },
  sub: { fontSize: 14, color: theme.muted, marginTop: 4 },
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
  icon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cardLabel: { flex: 1, marginLeft: 14, fontSize: 16, color: theme.text, fontWeight: "600" },
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
  btn: {
    marginTop: 28,
    backgroundColor: theme.primaryMid,
    paddingVertical: 14,
    borderRadius: theme.radiusMd,
    alignItems: "center",
  },
  btnOff: { opacity: 0.4 },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
