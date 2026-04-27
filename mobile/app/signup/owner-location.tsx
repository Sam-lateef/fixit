import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { SearchablePickerModal } from "@/components/SearchablePickerModal";
import { WizardProgressBar } from "@/components/WizardProgressBar";
import { apiFetch } from "@/lib/api";
import { friendlyApiError } from "@/lib/api-error";
import { fetchDistrictsForCity, routeCityParam } from "@/lib/districts-fetch";
import { useI18n } from "@/lib/i18n";
import { ownerCityLabel } from "@/lib/taxonomy-labels";
import { theme } from "@/lib/theme";

type District = { id: string; name: string; nameAr: string; city: string };

export default function OwnerLocationScreen(): React.ReactElement {
  const { t, locale } = useI18n();
  const { city: cityParam, from } = useLocalSearchParams<{
    city?: string | string[];
    from?: string;
  }>();
  const fromProfile = from === "profile";
  const city = routeCityParam(cityParam, "Baghdad");
  const [districts, setDistricts] = useState<District[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [address, setAddress] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [loadErr, setLoadErr] = useState("");
  const [districtPickerOpen, setDistrictPickerOpen] = useState(false);

  useEffect(() => {
    setSelected(null);
  }, [city]);

  useEffect(() => {
    if (!fromProfile) {
      return;
    }
    void (async () => {
      try {
        const { user } = await apiFetch<{
          user: {
            districtId: string | null;
            address: string | null;
          };
        }>("/api/v1/users/me");
        if (user.address) {
          setAddress(user.address);
        }
        if (user.districtId) {
          setSelected(user.districtId);
        }
      } catch {
        /* ignore */
      }
    })();
  }, [fromProfile]);

  useEffect(() => {
    setLoadErr("");
    setDistricts([]);
    void (async () => {
      try {
        let list = await fetchDistrictsForCity(city);
        if (fromProfile) {
          try {
            const { user } = await apiFetch<{
              user: {
                district: { id: string; name: string; nameAr: string; city: string } | null;
              };
            }>("/api/v1/users/me");
            if (user.district && !list.some((d) => d.id === user.district!.id)) {
              list = [user.district, ...list];
            }
          } catch {
            /* ignore */
          }
        }
        setDistricts(list);
      } catch (e) {
        setLoadErr(friendlyApiError(e, t));
      }
    })();
  }, [city, fromProfile]);

  useEffect(() => {
    if (!selected || districts.length === 0) {
      return;
    }
    if (!districts.some((d) => d.id === selected)) {
      setSelected(null);
    }
  }, [districts, selected]);

  function districtLabel(d: District): string {
    return locale === "ar-iq" && d.nameAr ? d.nameAr : d.name;
  }

  function goChangeCity(): void {
    if (fromProfile) {
      router.replace({
        pathname: "/signup/owner-details",
        params: { from: "profile" },
      });
      return;
    }
    router.replace("/signup/owner-details");
  }

  return (
    <ScrollView contentContainerStyle={styles.screen}>
      {!fromProfile ? <WizardProgressBar step={2} totalSteps={2} /> : null}
      <Text style={styles.h1}>{t("district")}</Text>
      <Text style={styles.sub}>{ownerCityLabel(city, locale)}</Text>
      {city === "Other" ? (
        <Text style={styles.hint}>{t("districtOtherHint")}</Text>
      ) : null}
      {loadErr ? <Text style={styles.err}>{loadErr}</Text> : null}
      {!loadErr && districts.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.hint}>{t("districtEmptyHelp")}</Text>
          <Pressable style={styles.secondaryBtn} onPress={goChangeCity}>
            <Text style={styles.secondaryBtnText}>{t("changeCity")}</Text>
          </Pressable>
        </View>
      ) : null}
      {!loadErr && districts.length > 0 ? (
        <>
          <Pressable
            style={styles.select}
            onPress={() => setDistrictPickerOpen(true)}
          >
            <Text style={selected ? styles.selectText : styles.selectPlaceholder}>
              {(() => {
                if (!selected) return t("pickDistrict");
                const d = districts.find((x) => x.id === selected);
                return d ? districtLabel(d) : t("pickDistrict");
              })()}
            </Text>
          </Pressable>
          <SearchablePickerModal
            visible={districtPickerOpen}
            title={t("district")}
            items={districts.map((d) => ({
              id: d.id,
              label: districtLabel(d),
            }))}
            onSelect={(id) => {
              setSelected(id);
              setDistrictPickerOpen(false);
            }}
            onRequestClose={() => setDistrictPickerOpen(false)}
            cancelLabel={t("cancel")}
            searchPlaceholder={t("search")}
          />
        </>
      ) : null}
      <TextInput
        style={[
          styles.input,
          locale === "ar-iq"
            ? { textAlign: "right", writingDirection: "rtl" }
            : { textAlign: "left", writingDirection: "ltr" },
        ]}
        value={address}
        onChangeText={setAddress}
        placeholder={t("addressOptional")}
        placeholderTextColor={theme.mutedLight}
      />
      <Pressable
        style={[styles.btn, busy && styles.btnDisabled]}
        disabled={busy}
        onPress={() => {
          setErr("");
          if (!selected) {
            setErr(t("pickDistrict"));
            return;
          }
          setBusy(true);
          void (async () => {
            try {
              await apiFetch("/api/v1/users/me", {
                method: "PUT",
                body: JSON.stringify({
                  districtId: selected,
                  address:
                    address.trim().length > 0 ? address.trim() : undefined,
                }),
              });
              if (fromProfile) {
                router.replace("/owner/profile");
              } else {
                router.replace("/owner");
              }
            } catch (e) {
              setErr(friendlyApiError(e, t));
            } finally {
              setBusy(false);
            }
          })();
        }}
      >
        <Text style={styles.btnText}>
          {fromProfile ? t("save") : t("finishSetup")}
        </Text>
      </Pressable>
      {err ? <Text style={styles.err}>{err}</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { padding: 20, backgroundColor: theme.surface },
  h1: { fontSize: 22, fontWeight: "700", color: theme.text, textAlign: "left" },
  sub: { marginTop: 6, color: theme.muted, fontSize: 14, textAlign: "left" },
  select: {
    marginTop: 16,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: theme.radiusMd,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: theme.surface,
  },
  selectText: { fontSize: 16, color: theme.text, textAlign: "left" },
  selectPlaceholder: { fontSize: 16, color: theme.mutedLight, textAlign: "left" },
  input: {
    marginTop: 16,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: theme.radiusMd,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
    color: theme.text,
    textAlign: "left",
  },
  btn: {
    marginTop: 20,
    backgroundColor: theme.primaryMid,
    paddingVertical: 14,
    borderRadius: theme.radiusMd,
    alignItems: "center",
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  err: { marginTop: 12, color: theme.danger, fontSize: 13 },
  hint: {
    marginTop: 10,
    fontSize: 13,
    color: theme.muted,
    lineHeight: 19,
    textAlign: "left",
  },
  emptyBox: { marginTop: 12, gap: 12 },
  secondaryBtn: {
    alignSelf: "flex-start",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: theme.radiusMd,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.surface,
  },
  secondaryBtnText: { color: theme.text, fontWeight: "600", fontSize: 15 },
});
