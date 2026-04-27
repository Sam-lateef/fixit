import { router, type Href, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { SearchablePickerModal } from "@/components/SearchablePickerModal";
import { WizardProgressBar } from "@/components/WizardProgressBar";
import { fetchDistrictsForCity } from "@/lib/districts-fetch";
import { useI18n } from "@/lib/i18n";
import { IRAQ_OWNER_CITIES, ownerCityLabel } from "@/lib/taxonomy-labels";
import { theme } from "@/lib/theme";

type District = { id: string; name: string; nameAr: string; city: string };

export default function ShopLocationStep(): React.ReactElement {
  const { t, locale } = useI18n();
  const raw = useLocalSearchParams<{ data?: string }>();
  const prev: Record<string, unknown> = raw.data
    ? (JSON.parse(raw.data as string) as Record<string, unknown>)
    : {};

  const [shopName, setShopName] = useState("");
  const [city, setCity] = useState("");
  const [districtId, setDistrictId] = useState<string | null>(null);
  const [address, setAddress] = useState("");

  const [districts, setDistricts] = useState<District[]>([]);
  const [loadingDistricts, setLoadingDistricts] = useState(false);
  const [err, setErr] = useState("");
  const [cityPickerOpen, setCityPickerOpen] = useState(false);
  const [districtPickerOpen, setDistrictPickerOpen] = useState(false);

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
        const list = await fetchDistrictsForCity(city);
        setDistricts(list);
      } catch {
        setDistricts([]);
      } finally {
        setLoadingDistricts(false);
      }
    })();
  }, [city]);

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
    if (!districtId) {
      setErr(t("pickDistrict"));
      return;
    }

    const merged = {
      ...prev,
      shopName: shopName.trim(),
      city,
      districtId,
      address: address.trim(),
    };
    router.push({
      pathname: "/signup/shop-area" as Href,
      params: { data: JSON.stringify(merged) },
    } as never);
  }

  return (
    <>
      <ScrollView
        contentContainerStyle={s.container}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
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
                    if (!districtId) return t("pickDistrict");
                    const d = districts.find((x) => x.id === districtId);
                    return d ? districtLabel(d) : t("pickDistrict");
                  })()}
                </Text>
              </Pressable>
            )}
          </>
        )}

        <Text style={s.label}>{t("shopAddress")}</Text>
        <TextInput
          style={[
            s.input,
            locale === "ar-iq"
              ? { textAlign: "right", writingDirection: "rtl" }
              : { textAlign: "left", writingDirection: "ltr" },
          ]}
          value={address}
          onChangeText={setAddress}
          placeholder={t("shopAddress")}
          placeholderTextColor={theme.mutedLight}
        />

        {err !== "" && <Text style={s.err}>{err}</Text>}

        <Pressable style={s.btn} onPress={handleContinue}>
          <Text style={s.btnText}>{t("continue")}</Text>
        </Pressable>
      </ScrollView>

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
  err: { marginTop: 12, color: theme.danger, fontSize: 13 },
  btn: {
    marginTop: 28,
    backgroundColor: theme.primaryMid,
    paddingVertical: 14,
    borderRadius: theme.radiusMd,
    alignItems: "center",
  },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
