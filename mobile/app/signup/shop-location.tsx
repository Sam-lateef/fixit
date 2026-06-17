import * as Location from "expo-location";
import { router, type Href, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";

import { SearchablePickerModal } from "@/components/SearchablePickerModal";
import { WizardProgressBar } from "@/components/WizardProgressBar";
import { apiFetch } from "@/lib/api";
import { fetchDistrictsForCity } from "@/lib/districts-fetch";
import { useI18n } from "@/lib/i18n";
import { openGoogleMapsAt } from "@/lib/open-google-maps";
import { logSignup, logSignupStep } from "@/lib/signup-log";
import { parseSignupWizardData } from "@/lib/signup-wizard-data";
import { IRAQ_OWNER_CITIES, ownerCityLabel } from "@/lib/taxonomy-labels";
import { theme } from "@/lib/theme";
import { isValidWhatsappE164 } from "@/lib/whatsapp-e164";

type District = { id: string; name: string; nameAr: string; city: string };

export default function ShopLocationStep(): React.ReactElement {
  const { t, locale } = useI18n();
  const raw = useLocalSearchParams<{ data?: string }>();
  const prev = parseSignupWizardData(raw.data);

  // Towing-only shops are mobile providers — no fixed physical address is
  // required (city + optional district are still mandatory).
  const isTowingOnly =
    Boolean(prev.offersTowing) &&
    !Boolean(prev.offersRepair) &&
    !Boolean(prev.offersParts);

  const [shopName, setShopName] = useState("");
  const [city, setCity] = useState("");
  const [districtId, setDistrictId] = useState<string | null>(null);
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [workshopLat, setWorkshopLat] = useState<number | null>(null);
  const [workshopLng, setWorkshopLng] = useState<number | null>(null);

  const [districts, setDistricts] = useState<District[]>([]);
  const [loadingDistricts, setLoadingDistricts] = useState(false);
  const [err, setErr] = useState("");
  const [cityPickerOpen, setCityPickerOpen] = useState(false);
  const [districtPickerOpen, setDistrictPickerOpen] = useState(false);

  useEffect(() => {
    logSignup("shopLocation.mount", { isTowingOnly });
  }, [isTowingOnly]);

  // Pre-fill phone from existing user record. OTP-auth users already have a
  // phone here; Google sign-in users land with phone === null and must
  // enter one before completing shop signup (customers contact via phone).
  useEffect(() => {
    void (async () => {
      try {
        const { user } = await logSignupStep("shopLocation.prefillPhone", () =>
          apiFetch<{ user: { phone: string | null } }>("/api/v1/users/me"),
        );
        if (user.phone && user.phone.length > 0) {
          setPhone(user.phone);
        }
      } catch {
        // Network failure here is non-fatal — user can still type their
        // phone manually. If they leave it blank, handleContinue blocks them.
      }
    })();
  }, []);

  useEffect(() => {
    if (!city) {
      setDistricts([]);
      setDistrictId(null);
      return;
    }
    setLoadingDistricts(true);
    setDistrictId(null);
    void (async () => {
      try {
        const list = await logSignupStep(
          "shopLocation.fetchDistricts",
          () => fetchDistrictsForCity(city),
          { city },
        );
        setDistricts(list);
      } catch {
        setDistricts([]);
      } finally {
        setLoadingDistricts(false);
      }
    })();
  }, [city]);

  useEffect(() => {
    const la = prev.workshopLat;
    const lo = prev.workshopLng;
    if (typeof la === "number" && typeof lo === "number") {
      setWorkshopLat(la);
      setWorkshopLng(lo);
    }
  }, [raw.data]);

  function useDeviceWorkshopPin(): void {
    void (async () => {
      const { status } = await logSignupStep(
        "shopLocation.requestLocationPerm",
        () => Location.requestForegroundPermissionsAsync(),
      );
      if (status !== "granted") {
        Alert.alert(t("errorTitle"), t("locationPermissionNeeded"));
        return;
      }
      try {
        const pos = await logSignupStep("shopLocation.getCurrentPosition", () =>
          Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          }),
        );
        setWorkshopLat(pos.coords.latitude);
        setWorkshopLng(pos.coords.longitude);
      } catch {
        Alert.alert(t("errorTitle"), t("locationDetectFailed"));
      }
    })();
  }

  function districtLabel(d: District): string {
    return locale === "ar-iq" && d.nameAr ? d.nameAr : d.name;
  }

  function handleContinue(): void {
    setErr("");
    if (!shopName.trim()) {
      setErr(t("shopName"));
      return;
    }
    if (!city) {
      setErr(t("city"));
      return;
    }
    if (!isTowingOnly && !address.trim()) {
      setErr(t("addressRequired"));
      return;
    }
    const trimmedPhone = phone.trim();
    if (trimmedPhone.length === 0) {
      setErr(t("phoneRequired"));
      return;
    }
    if (!isValidWhatsappE164(trimmedPhone)) {
      setErr(t("phoneInvalidFormat"));
      return;
    }

    const merged: Record<string, unknown> = {
      ...prev,
      shopName: shopName.trim(),
      city,
      districtId: districtId ?? null,
      address: address.trim(),
      phone: trimmedPhone,
    };
    if (workshopLat != null && workshopLng != null) {
      merged.workshopLat = workshopLat;
      merged.workshopLng = workshopLng;
    }
    logSignup("shopLocation.continue", {
      to: "/signup/shop-area",
      hasPin: workshopLat != null && workshopLng != null,
    });
    router.push({
      pathname: "/signup/shop-area" as Href,
      params: { data: JSON.stringify(merged) },
    } as never);
  }

  return (
    <>
      {/*
        KeyboardAwareScrollView auto-scrolls the focused TextInput above
        the soft keyboard on both iOS + Android (edge-to-edge aware).
        Plain RN ScrollView + `automaticallyAdjustKeyboardInsets` is
        iOS-only, which is why the phone field (mid-screen, below address)
        was getting covered on Android. `bottomOffset` pushes the input a
        bit above the keyboard so the next field's label peeks under the
        cursor for context.
      */}
      <KeyboardAwareScrollView
        contentContainerStyle={s.container}
        keyboardShouldPersistTaps="handled"
        bottomOffset={24}
      >
        <WizardProgressBar step={5} />

        <Text style={s.label}>{t("shopName")}</Text>
        <TextInput
          style={[
            s.input,
            locale === "ar-iq"
              ? { textAlign: "right", writingDirection: "rtl" }
              : { textAlign: "left", writingDirection: "ltr" },
          ]}
          value={shopName}
          onChangeText={setShopName}
          placeholder={t("shopName")}
          placeholderTextColor={theme.mutedLight}
        />

        <Text style={s.label}>{t("city")}</Text>
        <Pressable style={s.select} onPress={() => setCityPickerOpen(true)}>
          <Text style={city ? s.selectText : s.selectPlaceholder}>
            {city ? ownerCityLabel(city, locale) : t("city")}
          </Text>
        </Pressable>

        {city !== "" && (
          <>
            <Text style={s.label}>{t("district")}</Text>
            <Text style={s.hintInline}>{t("districtOptionalHint")}</Text>
            {loadingDistricts ? (
              <ActivityIndicator
                color={theme.primaryMid}
                style={{ marginTop: 12 }}
              />
            ) : districts.length === 0 ? (
              <Text style={s.hint}>{t("districtEmptyHelp")}</Text>
            ) : (
              <Pressable
                style={s.select}
                onPress={() => setDistrictPickerOpen(true)}
              >
                <Text
                  style={districtId ? s.selectText : s.selectPlaceholder}
                >
                  {(() => {
                    if (!districtId) return t("districtOptionalPick");
                    const d = districts.find((x) => x.id === districtId);
                    return d ? districtLabel(d) : t("districtOptionalPick");
                  })()}
                </Text>
              </Pressable>
            )}
          </>
        )}

        <Text style={s.label}>
          {isTowingOnly ? t("addressOptional") : t("shopAddress")}
        </Text>
        <TextInput
          style={[
            s.input,
            locale === "ar-iq"
              ? { textAlign: "right", writingDirection: "rtl" }
              : { textAlign: "left", writingDirection: "ltr" },
          ]}
          value={address}
          onChangeText={setAddress}
          placeholder={isTowingOnly ? t("addressOptional") : t("shopAddress")}
          placeholderTextColor={theme.mutedLight}
        />

        <Text style={s.label}>{t("phoneWhatsApp")}</Text>
        <Text style={s.hintInline}>{t("phoneInvalidFormat")}</Text>
        <TextInput
          style={[s.input, { textAlign: "left", writingDirection: "ltr" }]}
          value={phone}
          onChangeText={setPhone}
          placeholder="+9647XXXXXXXXX"
          placeholderTextColor={theme.mutedLight}
          keyboardType="phone-pad"
          autoCapitalize="none"
          autoCorrect={false}
        />

        <Text style={s.label}>{t("workshopMapPin")}</Text>
        <Text style={s.hintInline}>{t("workshopMapPinHint")}</Text>
        <Pressable style={s.pinBtn} onPress={useDeviceWorkshopPin}>
          <Text style={s.pinBtnText}>{t("useCurrentLocationForPin")}</Text>
        </Pressable>
        {workshopLat != null && workshopLng != null ? (
          <View style={s.pinPreview}>
            <Text style={s.pinCoords} numberOfLines={1}>
              {workshopLat.toFixed(5)}, {workshopLng.toFixed(5)}
            </Text>
            <View style={s.pinRow}>
              <Pressable
                style={s.pinSecondary}
                onPress={() => {
                  setWorkshopLat(null);
                  setWorkshopLng(null);
                }}
              >
                <Text style={s.pinSecondaryText}>{t("clearWorkshopMapPin")}</Text>
              </Pressable>
              <Pressable
                style={s.pinSecondary}
                onPress={() => openGoogleMapsAt(workshopLat, workshopLng)}
              >
                <Text style={s.pinSecondaryText}>{t("openInGoogleMaps")}</Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        {err !== "" && <Text style={s.err}>{err}</Text>}

        <Pressable style={s.btn} onPress={handleContinue}>
          <Text style={s.btnText}>{t("continue")}</Text>
        </Pressable>
      </KeyboardAwareScrollView>

      <SearchablePickerModal
        visible={cityPickerOpen}
        title={t("city")}
        items={IRAQ_OWNER_CITIES.map((c) => ({
          id: c,
          label: ownerCityLabel(c, locale),
        }))}
        onSelect={(id) => {
          setCity(id);
          setCityPickerOpen(false);
        }}
        onRequestClose={() => setCityPickerOpen(false)}
        cancelLabel={t("cancel")}
        searchPlaceholder={t("search")}
      />
      <SearchablePickerModal
        visible={districtPickerOpen}
        title={t("district")}
        items={districts.map((d) => ({
          id: d.id,
          label: districtLabel(d),
        }))}
        onSelect={(id) => {
          setDistrictId(id);
          setDistrictPickerOpen(false);
        }}
        onRequestClose={() => setDistrictPickerOpen(false)}
        cancelLabel={t("cancel")}
        searchPlaceholder={t("search")}
      />
    </>
  );
}

const s = StyleSheet.create({
  container: { padding: 20, paddingBottom: 40, backgroundColor: theme.surface },
  heading: { fontSize: 22, fontWeight: "700", color: theme.text, textAlign: "left" },
  label: {
    marginTop: 20,
    fontSize: 15,
    fontWeight: "600",
    color: theme.text,
    textAlign: "left",
  },
  input: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: theme.radiusMd,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: theme.text,
    textAlign: "left",
  },
  select: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: theme.radiusMd,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: theme.surface,
  },
  selectText: { fontSize: 16, color: theme.text, textAlign: "left" },
  selectPlaceholder: { fontSize: 16, color: theme.mutedLight, textAlign: "left" },
  hint: { marginTop: 10, fontSize: 13, color: theme.muted, textAlign: "left" },
  hintInline: { marginTop: 6, fontSize: 13, color: theme.muted, textAlign: "left" },
  err: { marginTop: 12, color: theme.danger, fontSize: 13 },
  btn: {
    marginTop: 28,
    backgroundColor: theme.primaryMid,
    paddingVertical: 14,
    borderRadius: theme.radiusMd,
    alignItems: "center",
  },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  pinBtn: {
    marginTop: 10,
    backgroundColor: theme.primaryMid,
    paddingVertical: 12,
    borderRadius: theme.radiusMd,
    alignItems: "center",
  },
  pinBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  pinPreview: { marginTop: 12 },
  pinCoords: {
    fontSize: 12,
    color: theme.muted,
    fontVariant: ["tabular-nums"],
    textAlign: "left",
  },
  pinRow: { marginTop: 10, flexDirection: "row", flexWrap: "wrap", gap: 8 },
  pinSecondary: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: theme.radiusMd,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.surface,
  },
  pinSecondaryText: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.primaryMid,
    textAlign: "left",
  },
});
