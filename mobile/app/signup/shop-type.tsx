import { router, type Href } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { WizardProgressBar } from "@/components/WizardProgressBar";
import { useI18n } from "@/lib/i18n";
import type { ShopType } from "@/lib/shop-type";
import type { StringKey } from "@/lib/strings";
import { theme } from "@/lib/theme";

type ShopTypeCard = {
  id: ShopType;
  titleKey: StringKey;
  subKey: StringKey;
};

const CARDS: ReadonlyArray<ShopTypeCard> = [
  { id: "CAR", titleKey: "shopTypeCar", subKey: "shopTypeCarSub" },
  {
    id: "MOTORCYCLE",
    titleKey: "shopTypeMotorcycle",
    subKey: "shopTypeMotorcycleSub",
  },
  { id: "TOWING", titleKey: "shopTypeTowing", subKey: "shopTypeTowingSub" },
];

export default function ShopTypeStep(): React.ReactElement {
  const { t } = useI18n();
  const [selected, setSelected] = useState<ShopType | null>(null);

  function handleContinue(): void {
    if (!selected) return;

    if (selected === "TOWING") {
      // Towing shops skip the services/makes/categories steps entirely —
      // they go straight to location & area. Pre-fill the offer booleans
      // so downstream steps and the POST handler don't need branching.
      const data = JSON.stringify({
        shopType: "TOWING",
        category: "CARS",
        offersTowing: true,
        offersRepair: false,
        offersParts: false,
        carMakes: [],
        repairCategories: [],
        partsCategories: [],
      });
      router.push({
        pathname: "/signup/shop-location" as Href,
        params: { data },
      } as never);
      return;
    }

    // CAR / MOTORCYCLE → services screen picks repair / parts (≥1).
    const data = JSON.stringify({
      shopType: selected,
      category: "CARS",
    });
    router.push({
      pathname: "/signup/shop-services" as Href,
      params: { data },
    } as never);
  }

  return (
    <ScrollView contentContainerStyle={s.container}>
      <WizardProgressBar step={1} />

      <Text style={s.heading}>{t("shopTypeHeading")}</Text>
      <Text style={s.sub}>{t("shopTypeSubtitle")}</Text>

      <View style={s.cards}>
        {CARDS.map((card) => {
          const on = selected === card.id;
          return (
            <Pressable
              key={card.id}
              style={[s.card, on && s.cardOn]}
              onPress={() => setSelected(card.id)}
            >
              <View style={s.cardBody}>
                <Text style={[s.cardLabel, on && s.cardLabelOn]}>
                  {t(card.titleKey)}
                </Text>
                <Text style={s.cardSub}>{t(card.subKey)}</Text>
              </View>
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
        style={[s.btn, !selected && s.btnOff]}
        disabled={!selected}
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
  cardBody: { flex: 1 },
  cardLabel: { fontSize: 16, color: theme.text, fontWeight: "600", textAlign: "left" },
  cardLabelOn: { color: theme.primary, fontWeight: "700" },
  cardSub: { fontSize: 13, color: theme.muted, marginTop: 4, textAlign: "left" },
  check: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: theme.primary,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 12,
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
