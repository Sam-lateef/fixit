import { router, type Href, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";

import { WizardProgressBar } from "@/components/WizardProgressBar";
import { useI18n } from "@/lib/i18n";
import {
  PARTS_CATEGORY_SLUGS,
  partsCategoryLabel,
} from "@/lib/taxonomy-labels";
import { theme } from "@/lib/theme";

export default function ShopPartsCatsStep(): React.ReactElement {
  const { t, locale } = useI18n();
  const raw = useLocalSearchParams<{ data?: string }>();
  const prev: Record<string, unknown> = raw.data
    ? (JSON.parse(raw.data as string) as Record<string, unknown>)
    : {};

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [delivery, setDelivery] = useState(false);

  useEffect(() => {
    if (!Boolean(prev.offersParts)) {
      router.replace({
        pathname: "/signup/shop-location" as Href,
        params: { data: raw.data as string },
      } as never);
    }
  }, []);

  function toggle(cat: string): void {
    setSelected((p) => {
      const next = new Set(p);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  }

  function handleContinue(): void {
    const merged = {
      ...prev,
      partsCategories: Array.from(selected),
      deliveryAvailable: delivery,
    };
    router.push({
      pathname: "/signup/shop-location" as Href,
      params: { data: JSON.stringify(merged) },
    } as never);
  }

  if (!Boolean(prev.offersParts)) {
    return <View />;
  }

  return (
    <ScrollView contentContainerStyle={s.container}>
      <WizardProgressBar step={4} />

      <Text style={s.heading}>{t("partsCategories")}</Text>

      <View style={s.chips}>
        {PARTS_CATEGORY_SLUGS.map((cat) => {
          const on = selected.has(cat);
          return (
            <Pressable
              key={cat}
              style={[s.chip, on && s.chipOn]}
              onPress={() => toggle(cat)}
            >
              <Text style={[s.chipText, on && s.chipTextOn]}>
                {partsCategoryLabel(cat, locale)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={s.toggleRow}>
        <Text style={s.toggleLabel}>{t("deliveryAvailable")}</Text>
        <Switch
          value={delivery}
          onValueChange={setDelivery}
          trackColor={{ false: theme.border, true: theme.primaryMid }}
          thumbColor="#fff"
          ios_backgroundColor={theme.border}
        />
      </View>

      <Pressable style={s.btn} onPress={handleContinue}>
        <Text style={s.btnText}>{t("continue")}</Text>
      </Pressable>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { padding: 20, paddingBottom: 40, backgroundColor: theme.surface },
  heading: { fontSize: 22, fontWeight: "700", color: theme.text, textAlign: "left" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 16 },
  chip: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: theme.chip,
  },
  chipOn: { backgroundColor: theme.primary },
  chipText: { fontSize: 14, color: theme.text },
  chipTextOn: { color: "#fff", fontWeight: "600" },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 24,
  },
  toggleLabel: { fontSize: 15, color: theme.text, fontWeight: "600" },
  btn: {
    marginTop: 28,
    backgroundColor: theme.primaryMid,
    paddingVertical: 14,
    borderRadius: theme.radiusMd,
    alignItems: "center",
  },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
