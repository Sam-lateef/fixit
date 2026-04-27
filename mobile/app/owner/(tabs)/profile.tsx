import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { SearchablePickerModal } from "@/components/SearchablePickerModal";
import { apiFetch } from "@/lib/api";
import { openAppNotificationSettings } from "@/lib/push-notifications";
import { isValidWhatsappE164 } from "@/lib/whatsapp-e164";
import { fetchDistrictsForCity } from "@/lib/districts-fetch";
import { promptDeleteAccount } from "@/lib/delete-account";
import { hrefAuthWelcome } from "@/lib/routes-href";
import { signOutFromApp } from "@/lib/sign-out";
import { useI18n } from "@/lib/i18n";
import { IRAQ_OWNER_CITIES, ownerCityLabel } from "@/lib/taxonomy-labels";
import { theme } from "@/lib/theme";
import type { LocaleId } from "@/lib/strings";

type DistrictRow = { id: string; name: string; nameAr: string; city: string };

type UserMe = {
  id: string;
  phone: string | null;
  name: string | null;
  city: string | null;
  address: string | null;
  districtId: string | null;
  district: { id: string; name: string; nameAr: string } | null;
};

export default function OwnerProfileScreen(): React.ReactElement {
  const { t, locale, setLocale } = useI18n();
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [user, setUser] = useState<UserMe | null>(null);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [districts, setDistricts] = useState<DistrictRow[]>([]);
  const [districtPreparing, setDistrictPreparing] = useState(false);
  const [savingDistrictId, setSavingDistrictId] = useState<string | null>(null);
  const [cityPickerOpen, setCityPickerOpen] = useState(false);
  const [districtPickerOpen, setDistrictPickerOpen] = useState(false);
  const [languagePickerOpen, setLanguagePickerOpen] = useState(false);
  const [savingCity, setSavingCity] = useState(false);
  // Inline address editor (matches shop profile pattern — no nav)
  const [addressEditorOpen, setAddressEditorOpen] = useState(false);
  const [editAddress, setEditAddress] = useState("");
  const [savingAddress, setSavingAddress] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const { user: u } = await apiFetch<{ user: UserMe }>("/api/v1/users/me");
      setUser(u);
      setEditName(u.name ?? "");
      setEditPhone(u.phone ?? "");
    } catch {
      /* stay empty */
    }
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void (async () => {
      try {
        await load();
      } finally {
        setRefreshing(false);
      }
    })();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  useEffect(() => {
    if (user) {
      setEditName(user.name ?? "");
      setEditPhone(user.phone ?? "");
    }
  }, [user?.id, user?.name, user?.phone]);

  const resolvedCity = user?.city?.trim() || "";

  const commitNameIfChanged = (): void => {
    if (!user || busy) return;
    const trimmed = editName.trim();
    const prev = (user.name ?? "").trim();
    if (trimmed === prev) return;
    if (!trimmed) {
      setEditName(prev);
      return;
    }
    setBusy(true);
    void (async () => {
      try {
        await apiFetch("/api/v1/users/me", {
          method: "PUT",
          body: JSON.stringify({ name: trimmed }),
        });
        await load();
      } catch (e) {
        Alert.alert(t("errorTitle"), e instanceof Error ? e.message : t("updateFailed"));
        setEditName(prev);
      } finally {
        setBusy(false);
      }
    })();
  };

  const commitPhoneIfChanged = (): void => {
    if (!user || busy) return;
    const trimmed = editPhone.trim();
    const prev = (user.phone ?? "").trim();
    if (trimmed === prev) return;
    if (!isValidWhatsappE164(trimmed)) {
      Alert.alert(t("errorTitle"), t("phoneInvalidFormat"));
      setEditPhone(prev);
      return;
    }
    setBusy(true);
    void (async () => {
      try {
        await apiFetch("/api/v1/users/me", {
          method: "PUT",
          body: JSON.stringify({ phone: trimmed }),
        });
        await load();
      } catch (e) {
        const msg = e instanceof Error ? e.message : "";
        const body =
          msg.includes("already") || msg.toLowerCase().includes("in use")
            ? t("phoneInUse")
            : msg.length > 0
              ? msg
              : t("updateFailed");
        Alert.alert(t("errorTitle"), body);
        setEditPhone(prev);
      } finally {
        setBusy(false);
      }
    })();
  };

  function selectProfileCity(cityValue: string): void {
    if (!user || savingCity) return;
    setSavingCity(true);
    void (async () => {
      try {
        await apiFetch("/api/v1/users/me", {
          method: "PUT",
          body: JSON.stringify({ city: cityValue }),
        });
        await load();
        setDistricts([]);
      } catch (e) {
        Alert.alert(
          t("errorTitle"),
          e instanceof Error ? e.message : t("updateFailed"),
        );
      } finally {
        setSavingCity(false);
      }
    })();
  }

  function openAddressEditor(): void {
    setEditAddress(user?.address ?? "");
    setAddressEditorOpen(true);
  }

  function saveAddressEdit(): void {
    if (!user || savingAddress) return;
    setSavingAddress(true);
    void (async () => {
      try {
        await apiFetch("/api/v1/users/me", {
          method: "PUT",
          body: JSON.stringify({ address: editAddress.trim() }),
        });
        await load();
        setAddressEditorOpen(false);
      } catch (e) {
        Alert.alert(
          t("errorTitle"),
          e instanceof Error ? e.message : t("updateFailed"),
        );
      } finally {
        setSavingAddress(false);
      }
    })();
  }

  function districtChipLabel(d: DistrictRow): string {
    return locale === "ar-iq" && d.nameAr ? d.nameAr : d.name;
  }

  function selectProfileDistrict(districtId: string): void {
    if (!user || savingDistrictId) return;
    setSavingDistrictId(districtId);
    void (async () => {
      try {
        await apiFetch("/api/v1/users/me", {
          method: "PUT",
          body: JSON.stringify({ districtId }),
        });
        await load();
      } catch (e) {
        Alert.alert(
          t("errorTitle"),
          e instanceof Error ? e.message : t("updateFailed"),
        );
      } finally {
        setSavingDistrictId(null);
      }
    })();
  }

  function openDistrictPicker(): void {
    if (!resolvedCity) {
      Alert.alert(t("city"), t("pickCityFirst"));
      return;
    }
    setDistrictPreparing(true);
    void (async () => {
      try {
        let list = await fetchDistrictsForCity(resolvedCity);
        const d = user?.district;
        if (d && !list.some((x) => x.id === d.id)) {
          list = [
            {
              id: d.id,
              name: d.name,
              nameAr: d.nameAr,
              city: resolvedCity,
            },
            ...list,
          ];
        }
        if (list.length === 0) {
          Alert.alert(t("district"), t("districtEmptyHelp"));
          return;
        }
        setDistricts(list);
        setDistrictPickerOpen(true);
      } catch (e) {
        Alert.alert(
          t("errorTitle"),
          e instanceof Error ? e.message : t("updateFailed"),
        );
      } finally {
        setDistrictPreparing(false);
      }
    })();
  }

  function onPickLanguage(id: string): void {
    if (id === "en" || id === "ar-iq") {
      setLocale(id as LocaleId);
    }
  }

  const selectedDistrictId = user?.districtId ?? user?.district?.id ?? null;

  const districtRowLabel = (): string => {
    if (!selectedDistrictId) return t("pickDistrict");
    const row = districts.find((x) => x.id === selectedDistrictId);
    if (row) return districtChipLabel(row);
    if (user?.district) {
      return locale === "ar-iq" && user.district.nameAr
        ? user.district.nameAr
        : user.district.name;
    }
    return t("pickDistrict");
  };

  return (
    <>
      <ScrollView
        style={styles.scrollRoot}
        contentContainerStyle={styles.scroll}
        alwaysBounceVertical
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={[styles.sectionCard, styles.sectionCardFirst]}>
          <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>{t("name")}</Text>
            <TextInput
              style={[
                styles.fieldInput,
                locale === "ar-iq"
                  ? { textAlign: "right", writingDirection: "rtl" }
                  : { textAlign: "left", writingDirection: "ltr" },
              ]}
              value={editName}
              onChangeText={setEditName}
              onEndEditing={commitNameIfChanged}
              onBlur={commitNameIfChanged}
              placeholder={t("name")}
              placeholderTextColor={theme.mutedLight}
              returnKeyType="done"
            />
          </View>
          <View style={styles.settingDivider} />
          <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>{t("phoneWhatsApp")}</Text>
            <TextInput
              style={styles.fieldInput}
              value={editPhone}
              onChangeText={setEditPhone}
              onEndEditing={commitPhoneIfChanged}
              onBlur={commitPhoneIfChanged}
              placeholder="+9647XXXXXXXXX"
              placeholderTextColor={theme.mutedLight}
              keyboardType="phone-pad"
              autoCorrect={false}
              returnKeyType="done"
            />
          </View>
          <View style={styles.settingDivider} />
          <Pressable
            style={styles.settingRow}
            onPress={() => setCityPickerOpen(true)}
          >
            <Text style={styles.settingLabel}>{t("city")}</Text>
            <Text style={styles.settingValue} numberOfLines={1}>
              {user?.city ? ownerCityLabel(user.city, locale) : "—"} ›
            </Text>
          </Pressable>
          <View style={styles.settingDivider} />
          <Pressable
            style={styles.settingRow}
            onPress={openDistrictPicker}
            disabled={districtPreparing}
          >
            <Text style={styles.settingLabel}>{t("district")}</Text>
            {districtPreparing ? (
              <ActivityIndicator color={theme.primaryMid} />
            ) : (
              <Text style={styles.settingValue} numberOfLines={1}>
                {districtRowLabel()} ›
              </Text>
            )}
          </Pressable>
          <View style={styles.settingDivider} />
          <Pressable style={styles.settingRow} onPress={openAddressEditor}>
            <Text style={styles.settingLabel}>{t("address")}</Text>
            <Text style={styles.settingValue} numberOfLines={1}>
              {user?.address?.trim() ? user.address.trim() : "—"} ›
            </Text>
          </Pressable>
        </View>

        <View style={styles.sectionCard}>
          <Pressable
            style={styles.settingRow}
            onPress={() => void openAppNotificationSettings()}
          >
            <Text style={styles.settingLabel}>{t("notifications")}</Text>
            <Text style={styles.settingChevron}>›</Text>
          </Pressable>
          <View style={styles.settingDivider} />
          <Pressable
            style={styles.settingRow}
            onPress={() => setLanguagePickerOpen(true)}
          >
            <Text style={styles.settingLabel}>{t("language")}</Text>
            <Text style={styles.settingValue}>
              {locale === "en" ? t("english") : t("arabic")} ›
            </Text>
          </Pressable>
        </View>

        <View style={styles.sectionCard}>
          <Pressable
            style={styles.settingRow}
            onPress={() => void Linking.openURL("https://fixitiq.com/privacy")}
          >
            <Text style={styles.settingLabel}>{t("privacyPolicy")}</Text>
            <Text style={styles.settingChevron}>›</Text>
          </Pressable>
          <View style={styles.settingDivider} />
          <Pressable
            style={styles.settingRow}
            onPress={() => void Linking.openURL("https://fixitiq.com/terms")}
          >
            <Text style={styles.settingLabel}>{t("termsOfService")}</Text>
            <Text style={styles.settingChevron}>›</Text>
          </Pressable>
        </View>

        <Pressable
          style={styles.deleteAccountCard}
          disabled={deleteBusy || busy}
          onPress={() => promptDeleteAccount(t, setLocale, setDeleteBusy)}
        >
          {deleteBusy ? (
            <ActivityIndicator color={theme.danger} />
          ) : (
            <Text style={styles.deleteAccountText}>{t("deleteAccount")}</Text>
          )}
        </Pressable>

        <Pressable
          style={styles.logoutCard}
          onPress={() => {
            void (async () => {
              await signOutFromApp();
              router.replace(hrefAuthWelcome);
            })();
          }}
        >
          <Text style={styles.logoutText}>{t("logout")}</Text>
        </Pressable>
      </ScrollView>

      <SearchablePickerModal
        visible={languagePickerOpen}
        title={t("language")}
        showSearch={false}
        searchPlaceholder={t("search")}
        selectedId={locale}
        items={[
          { id: "en", label: t("english") },
          { id: "ar-iq", label: t("arabic") },
        ]}
        onSelect={(id) => {
          onPickLanguage(id);
        }}
        onRequestClose={() => setLanguagePickerOpen(false)}
        cancelLabel={t("cancel")}
        busy={false}
      />

      <SearchablePickerModal
        visible={cityPickerOpen}
        title={t("city")}
        items={IRAQ_OWNER_CITIES.map((c) => ({
          id: c,
          label: ownerCityLabel(c, locale),
        }))}
        onSelect={(id) => {
          selectProfileCity(id);
          setCityPickerOpen(false);
        }}
        onRequestClose={() => setCityPickerOpen(false)}
        cancelLabel={t("cancel")}
        searchPlaceholder={t("search")}
        busy={savingCity}
      />

      <SearchablePickerModal
        visible={districtPickerOpen}
        title={t("district")}
        items={districts.map((d) => ({
          id: d.id,
          label: districtChipLabel(d),
        }))}
        onSelect={(id) => {
          setDistrictPickerOpen(false);
          selectProfileDistrict(id);
        }}
        onRequestClose={() => setDistrictPickerOpen(false)}
        cancelLabel={t("cancel")}
        searchPlaceholder={t("search")}
        busy={Boolean(savingDistrictId)}
      />

      {/* Inline address editor (matches shop profile pattern) */}
      <Modal
        visible={addressEditorOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setAddressEditorOpen(false)}
      >
        <KeyboardAvoidingView
          style={styles.addressOverlay}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <Pressable
            style={styles.addressDismissArea}
            onPress={() => setAddressEditorOpen(false)}
          />
          <SafeAreaView style={styles.addressSheet}>
            <View style={styles.addressHeader}>
              <View style={{ width: 24 }} />
              <Text style={styles.addressTitle}>{t("address")}</Text>
              <Pressable onPress={() => setAddressEditorOpen(false)} hitSlop={8}>
                <Text style={styles.addressClose}>✕</Text>
              </Pressable>
            </View>
            <ScrollView
              contentContainerStyle={styles.addressBody}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={styles.addressFieldLabel}>{t("address")}</Text>
              <TextInput
                style={[
                  styles.addressInput,
                  locale === "ar-iq"
                    ? { textAlign: "right", writingDirection: "rtl" }
                    : { textAlign: "left", writingDirection: "ltr" },
                ]}
                value={editAddress}
                onChangeText={setEditAddress}
                placeholder={t("address")}
                placeholderTextColor={theme.mutedLight}
                multiline
                maxLength={500}
                autoFocus
              />
            </ScrollView>
            <Pressable
              style={[styles.addressSaveBtn, savingAddress && { opacity: 0.6 }]}
              onPress={saveAddressEdit}
              disabled={savingAddress}
            >
              <Text style={styles.addressSaveBtnText}>{t("save")}</Text>
            </Pressable>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  scrollRoot: { flex: 1, backgroundColor: theme.bg },
  scroll: { paddingTop: 20, paddingBottom: 40 },

  // Inline address editor modal (mirrors shop profile location editor)
  addressOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  addressDismissArea: { flex: 1 },
  addressSheet: {
    backgroundColor: theme.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "75%",
  },
  addressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.border,
  },
  addressTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: theme.text,
    textAlign: "center",
  },
  addressClose: { fontSize: 24, color: theme.muted, fontWeight: "600" },
  addressBody: { paddingHorizontal: 18, paddingTop: 12, paddingBottom: 16 },
  addressFieldLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.muted,
    marginBottom: 6,
    textAlign: "left",
  },
  addressInput: {
    minHeight: 80,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: theme.radiusMd,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: theme.text,
    textAlignVertical: "top",
    backgroundColor: theme.surface,
  },
  addressSaveBtn: {
    backgroundColor: theme.primaryMid,
    paddingVertical: 14,
    marginHorizontal: 18,
    marginBottom: 16,
    borderRadius: theme.radiusMd,
    alignItems: "center",
  },
  addressSaveBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },

  fieldBlock: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  fieldLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: theme.text,
    marginBottom: 8,
    textAlign: "left",
  },
  fieldInput: {
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: theme.radiusMd,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: theme.text,
    backgroundColor: theme.surface,
    textAlign: "left",
  },
  sectionCard: {
    backgroundColor: theme.surface,
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: theme.radiusLg,
    borderWidth: 1,
    borderColor: theme.border,
    overflow: "hidden",
  },
  sectionCardFirst: {
    marginTop: 0,
  },
  settingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    minHeight: 48,
  },
  settingLabel: { fontSize: 17, fontWeight: "600", color: theme.text },
  settingValue: {
    fontSize: 15,
    color: theme.mutedLight,
    flexShrink: 1,
    marginLeft: 12,
    textAlign: "right",
  },
  settingChevron: { fontSize: 18, color: theme.mutedLight },
  settingDivider: { height: StyleSheet.hairlineWidth, backgroundColor: theme.border },

  deleteAccountCard: {
    backgroundColor: theme.surface,
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: theme.radiusLg,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: theme.danger,
    minHeight: 52,
    justifyContent: "center",
  },
  deleteAccountText: { color: theme.danger, fontWeight: "700", fontSize: 15 },

  logoutCard: {
    backgroundColor: theme.surface,
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: theme.radiusLg,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: theme.border,
  },
  logoutText: { color: theme.danger, fontWeight: "700", fontSize: 16 },
});
