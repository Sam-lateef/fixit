import { router, useLocalSearchParams, type Href } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { WizardProgressBar } from "@/components/WizardProgressBar";
import { useI18n } from "@/lib/i18n";
import type { ServiceCategory } from "@/lib/service-category";
import { parseSignupWizardData } from "@/lib/signup-wizard-data";
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
  const prev = parseSignupWizardData(raw.data);
  const category = (prev.category as ServiceCategory | undefined) ?? "CARS";
  const isCars = category === "CARS";

  const [selected, setSelected] = useState<Set<ServiceId>>(new Set());
  const [servicesMotorcycles, setServicesMotorcycles] = useState(false);

  function toggle(id: ServiceId): void {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleContinue(): void {
    // Moto-only path: user toggled "Tuktuk / Motor" but didn't pick any of
    // Repair / Parts / Towing. Treat them as full-service for motorcycles
    // and skip the car-specific signup steps (makes, repair-cats,
    // parts-cats). They route straight to shop-location.
    const isMotoOnly = isCars && servicesMotorcycles && selected.size === 0;

    const data = JSON.stringify({
      category,
      offersRepair: selected.has("repair") || isMotoOnly,
      offersParts: selected.has("parts") || isMotoOnly,
      offersTowing: isCars && (selected.has("towing") || isMotoOnly),
      // Moto-only shop explicitly does NOT service cars. Other shops keep
      // the default true (they service cars; motorcycles is additive).
      servicesCars: isMotoOnly ? false : true,
      servicesMotorcycles: isCars ? servicesMotorcycles : false,
      // Moto-only and non-CARS shops have no car-make/category preferences.
      carMakes: isCars && !isMotoOnly ? undefined : [],
      repairCategories: isCars && !isMotoOnly ? undefined : [],
      partsCategories: isCars && !isMotoOnly ? undefined : [],
    });

    // Routing:
    //   non-CARS  → straight to location (no car taxonomy applies)
    //   moto-only → straight to location (car make/category not relevant)
    //   regular   → through car make + repair-cats + parts-cats first
    const nextPath =
      !isCars || isMotoOnly ? "/signup/shop-location" : "/signup/shop-makes";

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

      {isCars ? (
        <View style={s.motoSection}>
          <Pressable
            style={[s.card, servicesMotorcycles && s.cardOn]}
            onPress={() => setServicesMotorcycles((v) => !v)}
          >
            <Text style={[s.cardLabel, servicesMotorcycles && s.cardLabelOn]}>
              {t("servicesMotorcyclesToggle")}
            </Text>
            {servicesMotorcycles ? (
              <View style={s.check}>
                <Text style={s.checkMark}>✓</Text>
              </View>
            ) : null}
          </Pressable>
          <Text style={s.motoHint}>{t("servicesMotorcyclesHint")}</Text>
        </View>
      ) : null}

      <Pressable
        style={[
          s.btn,
          selected.size === 0 && !servicesMotorcycles && s.btnOff,
        ]}
        disabled={selected.size === 0 && !servicesMotorcycles}
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
  btn: {
    marginTop: 28,
    backgroundColor: theme.primaryMid,
    paddingVertical: 14,
    borderRadius: theme.radiusMd,
    alignItems: "center",
  },
  btnOff: { opacity: 0.4 },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  motoSection: { marginTop: 12, gap: 8 },
  motoHint: { fontSize: 12, color: theme.muted, textAlign: "left" },
});
