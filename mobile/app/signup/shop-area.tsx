import { router, type Href, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";

import { WizardProgressBar } from "@/components/WizardProgressBar";
import { apiFetch } from "@/lib/api";
import { friendlyApiError } from "@/lib/api-error";
import { fetchDistrictsForCity, type DistrictRow } from "@/lib/districts-fetch";
import { useI18n } from "@/lib/i18n";
import { asShopType } from "@/lib/shop-type";
import { parseSignupWizardData } from "@/lib/signup-wizard-data";
import { theme } from "@/lib/theme";

export default function ShopAreaStep(): React.ReactElement {
  const { t, locale } = useI18n();
  const raw = useLocalSearchParams<{ data?: string }>();
  const prev = parseSignupWizardData(raw.data);

  const shopType = asShopType(prev.shopType);
  const offersRepair = Boolean(prev.offersRepair);
  const offersParts = Boolean(prev.offersParts);
  const offersTowing = Boolean(prev.offersTowing);
  // TOWING shops (mobile providers) don't require a fixed address.
  const isTowingOnly = shopType === "TOWING";
  const cityFromPrev = (prev.city as string | undefined) ?? "";
  const homeDistrictId = (prev.districtId as string | undefined) ?? "";

  const [districts, setDistricts] = useState<DistrictRow[]>([]);
  const [districtsLoading, setDistrictsLoading] = useState(true);
  const [districtsError, setDistrictsError] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  // "Serve all districts" toggle. ON (default) saves servedDistrictIds: []
  // which the server treats as "serve whole city".
  const [serveAll, setServeAll] = useState(true);
  const [partsNationwide, setPartsNationwide] = useState(false);
  const [bio, setBio] = useState("");

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
    if (shopType == null) {
      // Stale back-stack — bounce the user to the start of the wizard.
      setErr(t("errorTitle"));
      router.replace("/signup/shop-type" as Href);
      return;
    }
    const addr = String(prev.address ?? "").trim();
    if (!isTowingOnly && addr.length === 0) {
      setErr(t("addressRequired"));
      return;
    }
    if (!serveAll && selected.size === 0 && !(offersParts && partsNationwide)) {
      setErr(t("servedDistrictsRequired"));
      return;
    }
    setBusy(true);

    const carYearMin = parseSignupYear(prev.yearFrom);
    const carYearMax = parseSignupYear(prev.yearTo);

    // MOTO and TOWING shops never get the car-only repair/parts category
    // pickers, so any leftover values from a stale wizard state are dropped.
    const bioTrimmed = bio.trim();
    const body: Record<string, unknown> = {
      name: prev.shopName,
      shopType,
      category: prev.category ?? "CARS",
      offersRepair,
      offersParts,
      offersTowing,
      carMakes: shopType === "CAR" ? (prev.makes as string[]) ?? [] : [],
      carYearMin: shopType === "CAR" ? carYearMin : undefined,
      carYearMax: shopType === "CAR" ? carYearMax : undefined,
      repairCategories:
        shopType === "CAR" && offersRepair
          ? (prev.repairCategories as string[]) ?? []
          : [],
      partsCategories:
        shopType === "CAR" && offersParts
          ? (prev.partsCategories as string[]) ?? []
          : [],
      city: prev.city,
      districtId: prev.districtId ?? null,
      address: addr,
      servedDistrictIds: serveAll ? [] : Array.from(selected),
      partsNationwide: offersParts ? partsNationwide : false,
    };
    if (bioTrimmed.length > 0) {
      body.bio = bioTrimmed;
    }
    // Forward phone collected on shop-location.tsx. API requires non-null
    // user.phone for shops so customers can contact them.
    if (typeof prev.phone === "string" && prev.phone.trim().length > 0) {
      body.phone = prev.phone.trim();
    }
    const wLat = prev.workshopLat;
    const wLng = prev.workshopLng;
    if (typeof wLat === "number" && typeof wLng === "number") {
      body.workshopLat = wLat;
      body.workshopLng = wLng;
    }

    void (async () => {
      try {
        await apiFetch("/api/v1/shops", {
          method: "POST",
          body: JSON.stringify(body),
        });
        router.replace("/shop");
      } catch (e) {
        setErr(friendlyApiError(e, t));
      } finally {
        setBusy(false);
      }
    })();
  }

  function districtLabel(d: DistrictRow): string {
    return locale === "ar-iq" && d.nameAr ? d.nameAr : d.name;
  }

  return (
    // KeyboardAwareScrollView keeps the focused field (bio multiline at
    // the bottom of this step) above the soft keyboard on Android +
    // iOS. Plain ScrollView leaves the bio TextInput hidden when tapped.
    <KeyboardAwareScrollView
      contentContainerStyle={s.container}
      keyboardShouldPersistTaps="handled"
      bottomOffset={24}
    >
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

        <View style={s.toggleRow}>
          <Text style={s.toggleLabel}>{t("serveAllDistricts")}</Text>
          <Switch
            value={serveAll}
            onValueChange={setServeAll}
            trackColor={{ false: theme.border, true: theme.primaryMid }}
            thumbColor="#fff"
            ios_backgroundColor={theme.border}
          />
        </View>

        {!serveAll ? (
          <>
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
          </>
        ) : null}
      </View>

      <View style={s.section}>
        <Text style={s.sectionTitle}>{t("bioLabel")}</Text>
        <TextInput
          style={s.bioInput}
          value={bio}
          onChangeText={(v) => setBio(v.slice(0, 500))}
          placeholder={t("bioPlaceholder")}
          placeholderTextColor={theme.mutedLight}
          multiline
          numberOfLines={4}
          maxLength={500}
          textAlignVertical="top"
        />
        <Text style={s.bioCounter}>{bio.length}/500</Text>
      </View>

      {err !== "" && <Text style={s.err}>{err}</Text>}

      <Pressable
        style={[s.btn, busy && s.btnOff]}
        disabled={busy}
        onPress={handleCreate}
      >
        <Text style={s.btnText}>{t("createMyShop")}</Text>
      </Pressable>
    </KeyboardAwareScrollView>
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
    // Extra horizontal padding + overflow:'visible' guards Arabic last-char
    // clipping on Samsung One UI 8 (RN underestimates Arabic text width).
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: theme.chip,
    borderWidth: 1,
    borderColor: theme.border,
    overflow: "visible",
  },
  chipOn: { backgroundColor: theme.primaryMid, borderColor: theme.primaryMid },
  chipText: { fontSize: 14, color: theme.text, fontWeight: "600" },
  chipTextOn: { color: "#fff" },
  bioInput: {
    minHeight: 96,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: theme.radiusMd,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: theme.text,
    backgroundColor: theme.surface,
    textAlign: "left",
  },
  bioCounter: {
    marginTop: 6,
    fontSize: 12,
    color: theme.muted,
    textAlign: "right",
  },
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
