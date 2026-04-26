import { router, type Href } from "expo-router";
import { useLayoutEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { WizardProgressBar } from "@/components/WizardProgressBar";
import { useI18n } from "@/lib/i18n";
import type { ServiceCategory } from "@/lib/service-category";
import { SERVICE_CATEGORIES_SIGNUP_VISIBLE } from "@/lib/service-category";
import type { StringKey } from "@/lib/strings";
import { theme } from "@/lib/theme";

const CATEGORY_ICONS: Record<ServiceCategory, string> = {
  CARS: "🚗",
  ELECTRICS: "⚡",
  PLUMBING: "🔧",
  METAL: "🔩",
  WOOD: "🪵",
};

const CATEGORY_I18N_KEY: Record<ServiceCategory, StringKey> = {
  CARS: "catCars",
  ELECTRICS: "catElectrics",
  PLUMBING: "catPlumbing",
  METAL: "catMetal",
  WOOD: "catWood",
};

export default function ShopCategoryStep(): React.ReactElement {
  const { t } = useI18n();
  const [selected, setSelected] = useState<ServiceCategory | null>(null);

  useLayoutEffect(() => {
    if (SERVICE_CATEGORIES_SIGNUP_VISIBLE.length === 1) {
      const only = SERVICE_CATEGORIES_SIGNUP_VISIBLE[0];
      router.replace({
        pathname: "/signup/shop" as Href,
        params: { data: JSON.stringify({ category: only }) },
      } as never);
    }
  }, []);

  if (SERVICE_CATEGORIES_SIGNUP_VISIBLE.length === 1) {
    return (
      <View style={s.skipWrap}>
        <ActivityIndicator size="large" color={theme.primaryMid} />
      </View>
    );
  }

  function handleContinue(): void {
    if (!selected) return;
    router.push({
      pathname: "/signup/shop" as Href,
      params: {
        data: JSON.stringify({ category: selected }),
      },
    } as never);
  }

  return (
    <ScrollView contentContainerStyle={s.container}>
      <WizardProgressBar step={1} />

      <Text style={s.heading}>{t("chooseCategoryTitle")}</Text>
      <Text style={s.sub}>{t("chooseCategorySubtitle")}</Text>

      <View style={s.cards}>
        {SERVICE_CATEGORIES_SIGNUP_VISIBLE.map((cat) => {
          const on = selected === cat;
          return (
            <Pressable
              key={cat}
              style={[s.card, on && s.cardOn]}
              onPress={() => setSelected(cat)}
            >
              <View style={[s.icon, on && s.iconOn]}>
                <Text style={s.iconText}>{CATEGORY_ICONS[cat]}</Text>
              </View>
              <Text style={[s.cardLabel, on && s.cardLabelOn]}>
                {t(CATEGORY_I18N_KEY[cat])}
              </Text>
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
  skipWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: theme.surface,
  },
  container: { padding: 20, paddingBottom: 40, backgroundColor: theme.surface },
  heading: { fontSize: 22, fontWeight: "700", color: theme.text },
  sub: { fontSize: 14, color: theme.muted, marginTop: 4, marginBottom: 4 },
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
    backgroundColor: theme.chip,
    alignItems: "center",
    justifyContent: "center",
  },
  iconOn: { backgroundColor: theme.primaryLight },
  iconText: { fontSize: 22 },
  cardLabel: {
    flex: 1,
    marginLeft: 14,
    fontSize: 16,
    color: theme.text,
    fontWeight: "600",
  },
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
