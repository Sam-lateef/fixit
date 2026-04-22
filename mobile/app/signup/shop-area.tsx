import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";

import { WizardProgressBar } from "@/components/WizardProgressBar";
import { apiFetch } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { theme } from "@/lib/theme";

export default function ShopAreaStep(): React.ReactElement {
  const { t } = useI18n();
  const raw = useLocalSearchParams<{ data?: string }>();
  const prev: Record<string, unknown> = raw.data
    ? (JSON.parse(raw.data as string) as Record<string, unknown>)
    : {};

  const offersRepair = Boolean(prev.offersRepair);
  const offersParts = Boolean(prev.offersParts);
  const offersTowing = Boolean(prev.offersTowing);

  const [repairRadius, setRepairRadius] = useState("15");
  const [partsRadius, setPartsRadius] = useState("20");
  const [towingRadius, setTowingRadius] = useState("8");
  const [partsNationwide, setPartsNationwide] = useState(false);

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  function handleCreate(): void {
    setErr("");
    setBusy(true);

    const body = {
      name: prev.shopName,
      category: prev.category ?? "CARS",
      offersRepair,
      offersParts,
      offersTowing,
      carMakes: (prev.makes as string[]) ?? [],
      yearFrom: (prev.yearFrom as string) || undefined,
      yearTo: (prev.yearTo as string) || undefined,
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
      repairRadiusKm: offersRepair ? clampInt(repairRadius, 1, 50) : undefined,
      partsRadiusKm:
        offersParts && !partsNationwide
          ? clampInt(partsRadius, 1, 50)
          : undefined,
      towingRadiusKm: offersTowing
        ? clampInt(towingRadius, 1, 30)
        : undefined,
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

  return (
    <ScrollView contentContainerStyle={s.container}>
      <WizardProgressBar step={6} />

      <Text style={s.heading}>{t("serviceArea")}</Text>

      <View style={s.infoBanner}>
        <Text style={s.infoText}>{t("serviceAreaHint")}</Text>
      </View>

      {offersRepair && (
        <View style={s.section}>
          <Text style={s.sectionTitle}>{t("repair")}</Text>
          <View style={s.radiusRow}>
            <TextInput
              style={s.radiusInput}
              value={repairRadius}
              onChangeText={setRepairRadius}
              keyboardType="number-pad"
              maxLength={2}
            />
            <Text style={s.km}>km</Text>
            <Text style={s.range}>(1–50)</Text>
          </View>
        </View>
      )}

      {offersParts && (
        <View style={s.section}>
          <Text style={s.sectionTitle}>{t("parts")}</Text>
          <View style={s.toggleRow}>
            <Text style={s.toggleLabel}>{t("nationwide")}</Text>
            <Switch
              value={partsNationwide}
              onValueChange={setPartsNationwide}
              trackColor={{ false: theme.border, true: theme.primaryLight }}
              thumbColor={partsNationwide ? theme.primaryMid : "#f4f4f5"}
            />
          </View>
          {!partsNationwide && (
            <View style={s.radiusRow}>
              <TextInput
                style={s.radiusInput}
                value={partsRadius}
                onChangeText={setPartsRadius}
                keyboardType="number-pad"
                maxLength={2}
              />
              <Text style={s.km}>km</Text>
              <Text style={s.range}>(1–50)</Text>
            </View>
          )}
        </View>
      )}

      {offersTowing && (
        <View style={s.section}>
          <Text style={s.sectionTitle}>{t("towing")}</Text>
          <View style={s.radiusRow}>
            <TextInput
              style={s.radiusInput}
              value={towingRadius}
              onChangeText={setTowingRadius}
              keyboardType="number-pad"
              maxLength={2}
            />
            <Text style={s.km}>km</Text>
            <Text style={s.range}>(1–30)</Text>
          </View>
        </View>
      )}

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

/** Parse text to int and clamp between min/max. */
function clampInt(text: string, min: number, max: number): number {
  const n = parseInt(text, 10);
  if (Number.isNaN(n)) return min;
  return Math.max(min, Math.min(max, n));
}

const s = StyleSheet.create({
  container: { padding: 20, paddingBottom: 40, backgroundColor: theme.surface },
  heading: { fontSize: 22, fontWeight: "700", color: theme.text },
  infoBanner: {
    marginTop: 12,
    padding: 14,
    borderRadius: theme.radiusMd,
    backgroundColor: theme.primaryLight,
  },
  infoText: { color: theme.primary, fontSize: 14, lineHeight: 20 },
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
    marginBottom: 10,
  },
  radiusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
  },
  radiusInput: {
    width: 64,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: theme.radiusMd,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: theme.text,
    textAlign: "center",
    fontWeight: "700",
  },
  km: { fontSize: 15, color: theme.muted, fontWeight: "600" },
  range: { fontSize: 13, color: theme.mutedLight },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  toggleLabel: { fontSize: 15, color: theme.text },
  err: { marginTop: 12, color: theme.danger, fontSize: 13 },
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
