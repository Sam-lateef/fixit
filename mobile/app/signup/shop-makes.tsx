import { router, type Href, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { WizardProgressBar } from "@/components/WizardProgressBar";
import { useI18n } from "@/lib/i18n";
import { theme } from "@/lib/theme";

const POPULAR_MAKES = [
  "Toyota",
  "Kia",
  "Hyundai",
  "Nissan",
  "Honda",
  "GMC",
  "Isuzu",
  "Mitsubishi",
  "Suzuki",
  "Chevrolet",
];

export default function ShopMakesStep(): React.ReactElement {
  const { t } = useI18n();
  const raw = useLocalSearchParams<{ data?: string }>();
  const prev: Record<string, unknown> = raw.data
    ? (JSON.parse(raw.data as string) as Record<string, unknown>)
    : {};

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [yearFrom, setYearFrom] = useState("");
  const [yearTo, setYearTo] = useState("");

  function toggle(make: string): void {
    setSelected((p) => {
      const next = new Set(p);
      if (next.has(make)) next.delete(make);
      else next.add(make);
      return next;
    });
  }

  function clearAll(): void {
    setSelected(new Set());
  }

  function handleContinue(): void {
    const merged = {
      ...prev,
      makes: Array.from(selected),
      yearFrom,
      yearTo,
    };
    const data = JSON.stringify(merged);

    if (Boolean(prev.offersRepair)) {
      router.push({ pathname: "/signup/shop-repair-cats" as Href, params: { data } } as never);
    } else if (Boolean(prev.offersParts)) {
      router.push({ pathname: "/signup/shop-parts-cats" as Href, params: { data } } as never);
    } else {
      router.push({ pathname: "/signup/shop-location" as Href, params: { data } } as never);
    }
  }

  return (
    <ScrollView contentContainerStyle={s.container}>
      <WizardProgressBar step={2} />

      <Text style={s.heading}>{t("carMakesYears")}</Text>
      <Text style={s.sub}>{t("popularInIraq")}</Text>

      <View style={s.chips}>
        {POPULAR_MAKES.map((make) => {
          const on = selected.has(make);
          return (
            <Pressable
              key={make}
              style={[s.chip, on && s.chipOn]}
              onPress={() => toggle(make)}
            >
              <Text style={[s.chipText, on && s.chipTextOn]}>{make}</Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={s.sectionLabel}>{t("yearRange")}</Text>
      <View style={s.yearRow}>
        <TextInput
          style={s.yearInput}
          value={yearFrom}
          onChangeText={setYearFrom}
          placeholder={t("from")}
          placeholderTextColor={theme.mutedLight}
          keyboardType="number-pad"
          maxLength={4}
        />
        <Text style={s.dash}>—</Text>
        <TextInput
          style={s.yearInput}
          value={yearTo}
          onChangeText={setYearTo}
          placeholder={t("to")}
          placeholderTextColor={theme.mutedLight}
          keyboardType="number-pad"
          maxLength={4}
        />
      </View>

      {selected.size > 0 && (
        <View style={s.meta}>
          <Text style={s.metaCount}>{selected.size} selected</Text>
          <Pressable onPress={clearAll}>
            <Text style={s.clearAll}>Clear all</Text>
          </Pressable>
        </View>
      )}

      <Pressable style={s.btn} onPress={handleContinue}>
        <Text style={s.btnText}>{t("continue")}</Text>
      </Pressable>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { padding: 20, paddingBottom: 40, backgroundColor: theme.surface },
  heading: { fontSize: 22, fontWeight: "700", color: theme.text },
  sub: { fontSize: 14, color: theme.muted, marginTop: 4 },
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
  sectionLabel: {
    marginTop: 24,
    fontSize: 15,
    fontWeight: "600",
    color: theme.text,
  },
  yearRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 10,
  },
  yearInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: theme.radiusMd,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: theme.text,
    textAlign: "center",
  },
  dash: { color: theme.muted, fontSize: 18 },
  meta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 20,
  },
  metaCount: { fontSize: 14, color: theme.muted, fontWeight: "600" },
  clearAll: { fontSize: 14, color: theme.danger, fontWeight: "600" },
  btn: {
    marginTop: 20,
    backgroundColor: theme.primaryMid,
    paddingVertical: 14,
    borderRadius: theme.radiusMd,
    alignItems: "center",
  },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
