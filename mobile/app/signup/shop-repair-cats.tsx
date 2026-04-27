import { router, type Href, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { WizardProgressBar } from "@/components/WizardProgressBar";
import { useI18n } from "@/lib/i18n";
import {
  REPAIR_CATEGORY_SLUGS,
  repairCategoryLabel,
} from "@/lib/taxonomy-labels";
import { theme } from "@/lib/theme";

export default function ShopRepairCatsStep(): React.ReactElement {
  const { t, locale } = useI18n();
  const raw = useLocalSearchParams<{ data?: string }>();
  const prev: Record<string, unknown> = raw.data
    ? (JSON.parse(raw.data as string) as Record<string, unknown>)
    : {};

  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!Boolean(prev.offersRepair)) {
      const data = raw.data as string;
      if (Boolean(prev.offersParts)) {
      router.replace({ pathname: "/signup/shop-parts-cats" as Href, params: { data } } as never);
    } else {
      router.replace({ pathname: "/signup/shop-location" as Href, params: { data } } as never);
      }
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
    const merged = { ...prev, repairCategories: Array.from(selected) };
    const data = JSON.stringify(merged);

    if (Boolean(prev.offersParts)) {
      router.push({ pathname: "/signup/shop-parts-cats" as Href, params: { data } } as never);
    } else {
      router.push({ pathname: "/signup/shop-location" as Href, params: { data } } as never);
    }
  }

  if (!Boolean(prev.offersRepair)) {
    return <View />;
  }

  return (
    <ScrollView contentContainerStyle={s.container}>
      <WizardProgressBar step={3} />

      <Text style={s.heading}>{t("repairCategories")}</Text>

      <View style={s.chips}>
        {REPAIR_CATEGORY_SLUGS.map((cat) => {
          const on = selected.has(cat);
          return (
            <Pressable
              key={cat}
              style={[s.chip, on && s.chipOn]}
              onPress={() => toggle(cat)}
            >
              <Text style={[s.chipText, on && s.chipTextOn]}>
                {repairCategoryLabel(cat, locale)}
              </Text>
            </Pressable>
          );
        })}
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
  btn: {
    marginTop: 28,
    backgroundColor: theme.primaryMid,
    paddingVertical: 14,
    borderRadius: theme.radiusMd,
    alignItems: "center",
  },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
