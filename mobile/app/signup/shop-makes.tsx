import { router, type Href, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { SearchablePickerModal } from "@/components/SearchablePickerModal";
import { WizardProgressBar } from "@/components/WizardProgressBar";
import { apiFetch } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { theme } from "@/lib/theme";

type CatalogMake = { id: string; name: string; nameAr: string | null };

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

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS: number[] = [];
for (let y = CURRENT_YEAR + 1; y >= 1990; y--) YEAR_OPTIONS.push(y);

export default function ShopMakesStep(): React.ReactElement {
  const { t, locale } = useI18n();
  const raw = useLocalSearchParams<{ data?: string }>();
  const prev: Record<string, unknown> = raw.data
    ? (JSON.parse(raw.data as string) as Record<string, unknown>)
    : {};

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [yearFrom, setYearFrom] = useState("");
  const [yearTo, setYearTo] = useState("");

  // Full catalog for the searchable "more makes" picker
  const [allMakes, setAllMakes] = useState<CatalogMake[]>([]);
  const [makesPickerOpen, setMakesPickerOpen] = useState(false);
  const [yearFromPickerOpen, setYearFromPickerOpen] = useState(false);
  const [yearToPickerOpen, setYearToPickerOpen] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const data = await apiFetch<{ makes: CatalogMake[] }>(
          "/api/v1/catalog/makes?market=IQ",
          { skipAuth: true },
        );
        setAllMakes(data.makes);
      } catch {
        /* offline-tolerant — popular makes still work */
      }
    })();
  }, []);

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

  // Selected makes that aren't in the popular list — render as their own chips
  const extraSelected = Array.from(selected).filter(
    (m) => !POPULAR_MAKES.includes(m),
  );

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
        {extraSelected.map((make) => (
          <Pressable
            key={make}
            style={[s.chip, s.chipOn]}
            onPress={() => toggle(make)}
          >
            <Text style={[s.chipText, s.chipTextOn]}>{make}</Text>
          </Pressable>
        ))}
      </View>

      <Pressable style={s.searchBtn} onPress={() => setMakesPickerOpen(true)}>
        <Text style={s.searchBtnText}>+ {t("allMakesSearchPlaceholder")}</Text>
      </Pressable>

      <Text style={s.sectionLabel}>{t("yearRange")}</Text>
      <View style={s.yearRow}>
        <Pressable style={s.yearInput} onPress={() => setYearFromPickerOpen(true)}>
          <Text style={[s.yearInputText, !yearFrom && s.yearInputPlaceholder]}>
            {yearFrom || t("from")}
          </Text>
        </Pressable>
        <Text style={s.dash}>—</Text>
        <Pressable style={s.yearInput} onPress={() => setYearToPickerOpen(true)}>
          <Text style={[s.yearInputText, !yearTo && s.yearInputPlaceholder]}>
            {yearTo || t("to")}
          </Text>
        </Pressable>
      </View>

      <SearchablePickerModal
        visible={makesPickerOpen}
        title=""
        items={allMakes.map((m) => ({
          id: m.name,
          label: m.name,
        }))}
        onSelect={(id) => {
          toggle(id);
          setMakesPickerOpen(false);
        }}
        onRequestClose={() => setMakesPickerOpen(false)}
        cancelLabel={t("cancel")}
        searchPlaceholder={t("search")}
      />

      <SearchablePickerModal
        visible={yearFromPickerOpen}
        title=""
        items={YEAR_OPTIONS.map((y) => ({ id: String(y), label: String(y) }))}
        selectedId={yearFrom || undefined}
        showSearch={false}
        onSelect={(id) => {
          setYearFrom(id);
          setYearFromPickerOpen(false);
        }}
        onRequestClose={() => setYearFromPickerOpen(false)}
        cancelLabel={t("cancel")}
        searchPlaceholder={t("search")}
      />

      <SearchablePickerModal
        visible={yearToPickerOpen}
        title=""
        items={YEAR_OPTIONS.map((y) => ({ id: String(y), label: String(y) }))}
        selectedId={yearTo || undefined}
        showSearch={false}
        onSelect={(id) => {
          setYearTo(id);
          setYearToPickerOpen(false);
        }}
        onRequestClose={() => setYearToPickerOpen(false)}
        cancelLabel={t("cancel")}
        searchPlaceholder={t("search")}
      />

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
  heading: { fontSize: 22, fontWeight: "700", color: theme.text, textAlign: "left" },
  sub: { fontSize: 14, color: theme.muted, marginTop: 4, textAlign: "left" },
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
  searchBtn: {
    marginTop: 24,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: theme.radiusMd,
    borderWidth: 1,
    borderColor: theme.primaryMid,
    backgroundColor: theme.surface,
    alignItems: "center",
  },
  searchBtnText: { color: theme.primaryMid, fontWeight: "600", fontSize: 14 },
  sectionLabel: {
    marginTop: 24,
    fontSize: 15,
    fontWeight: "600",
    color: theme.text,
    textAlign: "left",
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
    paddingVertical: 12,
    backgroundColor: theme.surface,
  },
  yearInputText: { fontSize: 15, color: theme.text, textAlign: "center" },
  yearInputPlaceholder: { color: theme.mutedLight },
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
