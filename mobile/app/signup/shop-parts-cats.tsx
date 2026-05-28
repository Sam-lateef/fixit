import { router, type Href, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { WizardProgressBar } from "@/components/WizardProgressBar";
import { useI18n } from "@/lib/i18n";
import { parseSignupWizardData } from "@/lib/signup-wizard-data";
import {
  PARTS_CATEGORY_SLUGS,
  partsCategoryLabel,
} from "@/lib/taxonomy-labels";
import { theme } from "@/lib/theme";

export default function ShopPartsCatsStep(): React.ReactElement {
  const { t, locale } = useI18n();
  const raw = useLocalSearchParams<{ data?: string }>();
  const prev = parseSignupWizardData(raw.data);

  const [selected, setSelected] = useState<Set<string>>(new Set());

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
    // Extra horizontal padding + overflow:'visible' guards Arabic last-char
    // clipping on Samsung One UI 8 (RN underestimates Arabic text width).
    paddingHorizontal: 20,
    borderRadius: 20,
    backgroundColor: theme.chip,
    overflow: "visible",
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
