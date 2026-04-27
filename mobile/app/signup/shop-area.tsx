import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";

import { WizardProgressBar } from "@/components/WizardProgressBar";
import { apiFetch } from "@/lib/api";
import { fetchDistrictsForCity, type DistrictRow } from "@/lib/districts-fetch";
import { useI18n } from "@/lib/i18n";
import { theme } from "@/lib/theme";

export default function ShopAreaStep(): React.ReactElement {
  const { t, locale } = useI18n();
  const raw = useLocalSearchParams<{ data?: string }>();
  const prev: Record<string, unknown> = raw.data
    ? (JSON.parse(raw.data as string) as Record<string, unknown>)
    : {};

  const offersRepair = Boolean(prev.offersRepair);
  const offersParts = Boolean(prev.offersParts);
  const offersTowing = Boolean(prev.offersTowing);
  const cityFromPrev = (prev.city as string | undefined) ?? "";
  const homeDistrictId = (prev.districtId as string | undefined) ?? "";

  const [districts, setDistricts] = useState<DistrictRow[]>([]);
  const [districtsLoading, setDistrictsLoading] = useState(true);
  const [districtsError, setDistrictsError] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [partsNationwide, setPartsNationwide] = useState(false);

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!cityFromPrev) {
      setDistricts([]);
      setDistrictsLoading(false);
      setDistrictsError(t("pickCityFirst"));
      return;
    }
    setDistrictsLoading(true);
    setDistrictsError("");
    void (async () => {
      try {
        const list = await fetchDistrictsForCity(cityFromPrev);
        setDistricts(list);
        // Default-select the shop's own district (from previous step) so the
        // user starts with a sane scope and can extend.
        if (homeDistrictId && list.some((d) => d.id === homeDistrictId)) {
          setSelected(new Set([homeDistrictId]));
        }
      } catch (e) {
        setDistricts([]);
        setDistrictsError(e instanceof Error ? e.message : "Failed to load districts");
      } finally {
        setDistrictsLoading(false);
      }
    })();
  }, [cityFromPrev, homeDistrictId, t]);

  const toggle = (id: string): void => {
    setSelected((prev2) => {
      const next = new Set(prev2);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  function parseSignupYear(value: unknown): number | undefined {
    if (typeof value !== "string") return undefined;
    const v = value.trim();
    if (v.length === 0) return undefined;
    const n = parseInt(v, 10);
    return Number.isNaN(n) ? undefined : n;
  }

  function handleCreate(): void {
    setErr("");
    if (selected.size === 0 && !(offersParts && partsNationwide)) {
      setErr(t("servedDistrictsRequired"));
      return;
    }
    setBusy(true);

    const carYearMin = parseSignupYear(prev.yearFrom);
    const carYearMax = parseSignupYear(prev.yearTo);

    const body = {
      name: prev.shopName,
      category: prev.category ?? "CARS",
      offersRepair,
      offersParts,
      offersTowing,
      carMakes: (prev.makes as string[]) ?? [],
      carYearMin,
      carYearMax,
      repairCategories: offersRepair
        ? (prev.repairCategories as string[]) ?? []
        : [],
      partsCategories: offersParts
        ? (prev.partsCategories as string[]) ?? []
        : [],
      deliveryAvailable: Boolean(prev.deliveryAvailable),
      city: prev.city,
      districtId: prev.districtId,
      address: (prev.address as string) || undefined,
      servedDistrictIds: Array.from(selected),
      partsNationwide: offersParts ? partsNationwide : false,
    };

    void (async () => {
      try {
        await apiFetch("/api/v1/shops", {
          method: "POST",
          body: JSON.stringify(body),
        });
        router.replace("/shop");
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Failed");
      } finally {
        setBusy(false);
      }
    })();
  }

  function districtLabel(d: DistrictRow): string {
    return locale === "ar-iq" && d.nameAr ? d.nameAr : d.name;
  }

  return (
    <ScrollView contentContainerStyle={s.container}>
      <WizardProgressBar step={6} />

      <Text style={s.heading}>{t("serviceArea")}</Text>

      <View style={s.infoBanner}>
        <Text style={s.infoText}>{t("serviceAreaHint")}</Text>
      </View>

      {offersParts ? (
        <View style={s.section}>
          <Text style={s.sectionTitle}>{t("parts")}</Text>
          <View style={s.toggleRow}>
            <Text style={s.toggleLabel}>{t("nationwide")}</Text>
            <Switch
              value={partsNationwide}
              onValueChange={setPartsNationwide}
              trackColor={{ false: theme.border, true: theme.primaryMid }}
              thumbColor="#fff"
              ios_backgroundColor={theme.border}
            />
          </View>
        </View>
      ) : null}

      <View style={s.section}>
        <Text style={s.sectionTitle}>{t("servedDistricts")}</Text>
        <Text style={s.sectionHint}>{t("servedDistrictsHint")}</Text>

        {districtsLoading ? (
          <ActivityIndicator color={theme.primaryMid} style={{ marginTop: 16 }} />
        ) : districtsError ? (
          <Text style={s.err}>{districtsError}</Text>
        ) : districts.length === 0 ? (
          <Text style={s.err}>{t("districtEmptyHelp")}</Text>
        ) : (
          <View style={s.chips}>
            {districts.map((d) => {
              const on = selected.has(d.id);
              return (
                <Pressable
                  key={d.id}
                  style={[s.chip, on && s.chipOn]}
                  onPress={() => toggle(d.id)}
                >
                  <Text style={[s.chipText, on && s.chipTextOn]}>
                    {districtLabel(d)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}
      </View>

      {err !== "" && <Text style={s.err}>{err}</Text>}

      <Pressable
        style={[s.btn, busy && s.btnOff]}
        disabled={busy}
        onPress={handleCreate}
      >
        <Text style={s.btnText}>{t("createMyShop")}</Text>
      </Pressable>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { padding: 20, paddingBottom: 40, backgroundColor: theme.surface },
  heading: { fontSize: 22, fontWeight: "700", color: theme.text, textAlign: "left" },
  infoBanner: {
    marginTop: 12,
    padding: 14,
    borderRadius: theme.radiusMd,
    backgroundColor: theme.primaryLight,
  },
  infoText: { color: theme.primary, fontSize: 14, lineHeight: 20, textAlign: "left" },
  section: {
    marginTop: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: theme.text,
    marginBottom: 6,
    textAlign: "left",
  },
  sectionHint: {
    fontSize: 13,
    color: theme.muted,
    marginBottom: 12,
    textAlign: "left",
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  toggleLabel: { fontSize: 15, color: theme.text },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: theme.chip,
    borderWidth: 1,
    borderColor: theme.border,
  },
  chipOn: { backgroundColor: theme.primaryMid, borderColor: theme.primaryMid },
  chipText: { fontSize: 14, color: theme.text, fontWeight: "600" },
  chipTextOn: { color: "#fff" },
  err: { marginTop: 12, color: theme.danger, fontSize: 13, textAlign: "left" },
  btn: {
    marginTop: 28,
    backgroundColor: theme.primaryMid,
    paddingVertical: 14,
    borderRadius: theme.radiusMd,
    alignItems: "center",
  },
  btnOff: { opacity: 0.5 },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
