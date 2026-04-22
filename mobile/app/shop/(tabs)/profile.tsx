import { router, type Href } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  Linking,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { SearchablePickerModal } from "@/components/SearchablePickerModal";
import { ShopProfileHero } from "@/components/shop/ShopProfileHero";
import type { ShopProfilePayload } from "@/components/shop/shop-profile-model";
import { ShopServiceOverview } from "@/components/shop/ShopServiceOverview";
import { useSubscription } from "@/hooks/useSubscription";
import { apiFetch } from "@/lib/api";
import { openAppNotificationSettings } from "@/lib/push-notifications";
import { promptDeleteAccount } from "@/lib/delete-account";
import { isValidWhatsappE164 } from "@/lib/whatsapp-e164";
import { hrefAuthWelcome } from "@/lib/routes-href";
import { signOutFromApp } from "@/lib/sign-out";
import { useI18n } from "@/lib/i18n";
import type { LocaleId, StringKey } from "@/lib/strings";
import {
  ownerCityLabel,
  partsCategoryLabel,
  repairCategoryLabel,
  PARTS_CATEGORY_SLUGS,
  REPAIR_CATEGORY_SLUGS,
} from "@/lib/taxonomy-labels";
import {
  shopDevLog,
  shopDevLogApiBase,
  shopDevLogShopSnapshot,
  shopDevSummarizeUrl,
} from "@/lib/shop-profile-debug";
import { theme } from "@/lib/theme";

type ShopMe = ShopProfilePayload;

function normalizeShopMe(raw: ShopProfilePayload): ShopMe {
  return {
    ...raw,
    coverImageUrl: raw.coverImageUrl ?? null,
    user: {
      ...raw.user,
      address: raw.user.address ?? null,
    },
  };
}

type CatalogMake = { id: string; name: string; nameAr: string | null };

type EditSection = "makes" | "repair" | "parts" | null;

const POPULAR_MAKES = [
  "Toyota", "Kia", "Hyundai", "Nissan", "Honda",
  "GMC", "Isuzu", "Mitsubishi", "Suzuki", "Chevrolet",
];

function optionsForSection(section: EditSection): string[] {
  if (section === "makes") return POPULAR_MAKES;
  if (section === "repair") return [...REPAIR_CATEGORY_SLUGS];
  if (section === "parts") return [...PARTS_CATEGORY_SLUGS];
  return [];
}

function labelForEditOption(
  section: EditSection,
  item: string,
  locale: LocaleId,
): string {
  if (section === "repair") {
    return repairCategoryLabel(item, locale);
  }
  if (section === "parts") {
    return partsCategoryLabel(item, locale);
  }
  return item;
}

function currentForSection(shop: ShopProfilePayload, section: EditSection): string[] {
  if (section === "makes") return shop.carMakes;
  if (section === "repair") return shop.repairCategories;
  if (section === "parts") return shop.partsCategories;
  return [];
}

function titleKeyForSection(section: EditSection): StringKey | null {
  if (section === "makes") return "carMakes";
  if (section === "repair") return "repairCategories";
  if (section === "parts") return "partsCategories";
  return null;
}

export default function ShopProfileScreen(): React.ReactElement {
  const { t, locale, setLocale } = useI18n();
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [languagePickerOpen, setLanguagePickerOpen] = useState(false);
  const [servicePicker, setServicePicker] = useState<
    null | "offersTowing" | "deliveryAvailable"
  >(null);
  const { isSubscribed, isLoading: subLoading } = useSubscription();
  const [shop, setShop] = useState<ShopMe | null>(null);
  const [editSection, setEditSection] = useState<EditSection>(null);
  const [pendingSelection, setPendingSelection] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [shopNameDraft, setShopNameDraft] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editUserName, setEditUserName] = useState("");
  const [catalogMakes, setCatalogMakes] = useState<CatalogMake[]>([]);
  const [catalogMakesLoading, setCatalogMakesLoading] = useState(false);
  const [makeSearchQuery, setMakeSearchQuery] = useState("");

  const load = useCallback(async () => {
    shopDevLog("GET /api/v1/shops/me start");
    shopDevLogApiBase();
    try {
      const { shop: s } = await apiFetch<{ shop: ShopProfilePayload }>(
        "/api/v1/shops/me",
      );
      shopDevLogShopSnapshot("GET /api/v1/shops/me ok", s);
      setShop(normalizeShopMe(s));
    } catch (e) {
      shopDevLog("GET /api/v1/shops/me fail", {
        message: e instanceof Error ? e.message : String(e),
      });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    shopDevLog("ShopProfile tab: screen mounted / focused render");
  }, []);

  // Hero business name: only seed from the server when this shop row first loads (id set / changes).
  // Do NOT key on shop.name — any `load()` (stale GET, category save, etc.) would overwrite the
  // TextInput while the user is editing or right after a successful rename.
  useEffect(() => {
    shopDevLog("effect seedHeroNameDraft", {
      shopId: shop?.id ?? null,
      serverName: shop?.name ?? null,
    });
    if (!shop) {
      setShopNameDraft("");
      return;
    }
    setShopNameDraft(shop.name);
  }, [shop?.id]);

  useEffect(() => {
    if (!shop) {
      setEditPhone("");
      setEditUserName("");
      return;
    }
    setEditPhone(shop.user.phone ?? "");
    setEditUserName(shop.user.name ?? "");
  }, [shop?.id, shop?.user.phone, shop?.user.name]);

  useEffect(() => {
    if (editSection !== "makes") {
      return;
    }
    setMakeSearchQuery("");
    setCatalogMakesLoading(true);
    void (async () => {
      try {
        const data = await apiFetch<{ makes: CatalogMake[] }>(
          "/api/v1/catalog/makes?market=IQ",
        );
        setCatalogMakes(data.makes);
      } catch {
        setCatalogMakes([]);
      } finally {
        setCatalogMakesLoading(false);
      }
    })();
  }, [editSection]);

  const filteredCatalogMakes = useMemo(() => {
    const q = makeSearchQuery.trim().toLowerCase();
    return catalogMakes.filter((m) => {
      if (q.length === 0) {
        return true;
      }
      if (m.name.toLowerCase().includes(q)) {
        return true;
      }
      if (m.nameAr?.toLowerCase().includes(q)) {
        return true;
      }
      return false;
    });
  }, [catalogMakes, makeSearchQuery]);

  const sortedFilteredCatalogMakes = useMemo(() => {
    const list = [...filteredCatalogMakes];
    list.sort((a, b) => {
      const la = locale === "ar-iq" && a.nameAr ? a.nameAr : a.name;
      const lb = locale === "ar-iq" && b.nameAr ? b.nameAr : b.name;
      return la.localeCompare(lb, locale === "ar-iq" ? "ar" : "en");
    });
    return list;
  }, [filteredCatalogMakes, locale]);

  const openEdit = (section: EditSection): void => {
    if (!shop) return;
    setPendingSelection(new Set(currentForSection(shop, section)));
    setEditSection(section);
  };

  const togglePending = (item: string): void => {
    setPendingSelection((prev) => {
      const next = new Set(prev);
      if (next.has(item)) next.delete(item);
      else next.add(item);
      return next;
    });
  };

  const saveEdit = (): void => {
    if (!shop || !editSection) return;
    setSaving(true);
    const items = Array.from(pendingSelection);
    void (async () => {
      try {
        const body: Record<string, unknown> = {};
        if (editSection === "makes") body.carMakes = items;
        if (editSection === "repair") body.repairCategories = items;
        if (editSection === "parts") body.partsCategories = items;
        await apiFetch("/api/v1/shops/me", {
          method: "PUT",
          body: JSON.stringify(body),
        });
        shopDevLog("saveEdit chips PUT ok → load()", { section: editSection });
        await load();
        shopDevLog("saveEdit load() finished");
      } catch {
        /* silent — local state stays unchanged */
      } finally {
        setSaving(false);
        setEditSection(null);
      }
    })();
  };

  const commitShopPhoneIfChanged = (): void => {
    if (!shop || saving) return;
    const trimmed = editPhone.trim();
    const prev = (shop.user.phone ?? "").trim();
    if (trimmed === prev) return;
    if (!isValidWhatsappE164(trimmed)) {
      Alert.alert(t("errorTitle"), t("phoneInvalidFormat"));
      setEditPhone(prev);
      return;
    }
    setSaving(true);
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
        setSaving(false);
      }
    })();
  };

  const commitUserNameIfChanged = (): void => {
    if (!shop || saving) return;
    const trimmed = editUserName.trim();
    const prev = (shop.user.name ?? "").trim();
    if (trimmed === prev) return;
    if (!trimmed) {
      setEditUserName(shop.user.name ?? "");
      return;
    }
    setSaving(true);
    void (async () => {
      try {
        await apiFetch("/api/v1/users/me", {
          method: "PUT",
          body: JSON.stringify({ name: trimmed }),
        });
        await load();
      } catch (e) {
        Alert.alert(t("errorTitle"), e instanceof Error ? e.message : t("updateFailed"));
        setEditUserName(shop.user.name ?? "");
      } finally {
        setSaving(false);
      }
    })();
  };

  const commitCoverImageUrl = async (url: string): Promise<void> => {
    if (!shop) return;
    shopDevLog("commitCover: PUT /shops/me start", {
      coverUrl: shopDevSummarizeUrl(url),
      currentShopCover: shopDevSummarizeUrl(shop.coverImageUrl),
    });
    const putBody = JSON.stringify({ coverImageUrl: url });
    shopDevLog("commitCover: JSON body", {
      byteLength: putBody.length,
      preview: putBody.slice(0, 160),
    });
    setSaving(true);
    try {
      const { shop: updated } = await apiFetch<{ shop: ShopProfilePayload }>(
        "/api/v1/shops/me",
        {
          method: "PUT",
          body: putBody,
        },
      );
      const normalized = normalizeShopMe(updated);
      shopDevLogShopSnapshot("commitCover: PUT ok, applying state", normalized);
      // Apply server shop immediately. Do not call load() here — an overlapping GET can overwrite
      // coverImageUrl before the DB write is visible, or return a URL the client cannot resolve.
      setShop(normalized);
    } catch (e) {
      shopDevLog("commitCover: PUT fail", {
        message: e instanceof Error ? e.message : String(e),
      });
      Alert.alert(t("errorTitle"), e instanceof Error ? e.message : t("updateFailed"));
    } finally {
      setSaving(false);
    }
  };

  const commitShopNameIfChanged = (): void => {
    shopDevLog("commitName: invoked", {
      hasShop: Boolean(shop),
      saving,
      draftPreview: shopNameDraft.trim().slice(0, 48),
      draftLen: shopNameDraft.trim().length,
      shopName: shop?.name ?? null,
    });
    if (!shop || saving) {
      shopDevLog("commitName: skip", { reason: !shop ? "no-shop" : "saving" });
      return;
    }
    const trimmed = shopNameDraft.trim();
    const prev = shop.name.trim();
    if (trimmed === prev) {
      shopDevLog("commitName: noop", { reason: "draft matches shop.name" });
      return;
    }
    if (!trimmed) {
      shopDevLog("commitName: noop", { reason: "empty draft, reset to shop.name" });
      setShopNameDraft(shop.name);
      return;
    }
    setSaving(true);
    shopDevLog("commitName: PUT /shops/me start", { name: trimmed });
    void (async () => {
      try {
        const { shop: updated } = await apiFetch<{ shop: ShopProfilePayload }>(
          "/api/v1/shops/me",
          {
            method: "PUT",
            body: JSON.stringify({ name: trimmed }),
          },
        );
        const normalized = normalizeShopMe(updated);
        shopDevLogShopSnapshot("commitName: PUT ok, applying state", normalized);
        setShop(normalized);
        setShopNameDraft(normalized.name);
      } catch (e) {
        shopDevLog("commitName: PUT fail", {
          message: e instanceof Error ? e.message : String(e),
        });
        Alert.alert(t("errorTitle"), e instanceof Error ? e.message : t("updateFailed"));
        setShopNameDraft(shop.name);
      } finally {
        setSaving(false);
      }
    })();
  };

  const putServiceField = (
    field: "offersTowing" | "deliveryAvailable",
    value: boolean,
  ): void => {
    const body =
      field === "offersTowing"
        ? { offersTowing: value }
        : { deliveryAvailable: value };
    void (async () => {
      try {
        await apiFetch("/api/v1/shops/me", {
          method: "PUT",
          body: JSON.stringify(body),
        });
        await load();
      } catch (e) {
        Alert.alert(t("errorTitle"), e instanceof Error ? e.message : t("updateFailed"));
      }
    })();
  };

  const shopCityShown = shop?.user.city
    ? ownerCityLabel(shop.user.city, locale)
    : "";
  const shopDistrictShown =
    shop?.user.district &&
    (locale === "ar-iq" && shop.user.district.nameAr
      ? shop.user.district.nameAr
      : shop.user.district.name);
  const locationText = [shopCityShown, shopDistrictShown]
    .filter(Boolean)
    .join(" · ");
  const options = optionsForSection(editSection);

  return (
    <>
      <ScrollView
        style={styles.scrollRoot}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {shop ? (
          <ShopProfileHero
            coverImageUrl={shop.coverImageUrl}
            shopNameDraft={shopNameDraft}
            onShopNameDraftChange={setShopNameDraft}
            onCommitShopName={commitShopNameIfChanged}
            editable
            onCoverUrlCommitted={commitCoverImageUrl}
          />
        ) : null}

        {shop &&
        shopNameDraft.trim() !== shop.name.trim() &&
        shopNameDraft.trim().length > 0 ? (
          <Pressable
            style={[styles.heroSaveRow, saving && styles.heroSaveRowDisabled]}
            disabled={saving}
            onPress={() => {
              Keyboard.dismiss();
              commitShopNameIfChanged();
            }}
          >
            <Text style={styles.heroSaveText}>{t("save")}</Text>
          </Pressable>
        ) : null}

        {shop ? (
          <View style={styles.contactCard}>
            <Text style={styles.fieldLabel}>{t("shopProfilePersonalName")}</Text>
            <TextInput
              style={styles.fieldInput}
              value={editUserName}
              onChangeText={setEditUserName}
              onEndEditing={commitUserNameIfChanged}
              onBlur={commitUserNameIfChanged}
              placeholder={t("name")}
              placeholderTextColor={theme.mutedLight}
              returnKeyType="done"
            />
            <Text style={[styles.fieldLabel, styles.fieldLabelSpaced]}>
              {t("phoneWhatsApp")}
            </Text>
            <TextInput
              style={styles.fieldInput}
              value={editPhone}
              onChangeText={setEditPhone}
              onEndEditing={commitShopPhoneIfChanged}
              onBlur={commitShopPhoneIfChanged}
              placeholder="+9647XXXXXXXXX"
              placeholderTextColor={theme.mutedLight}
              keyboardType="phone-pad"
              autoCorrect={false}
              returnKeyType="done"
            />
            {locationText.length > 0 ? (
              <>
                <Text style={[styles.fieldLabel, styles.fieldLabelSpaced]}>
                  {t("city")} · {t("district")}
                </Text>
                <Text style={styles.fieldStatic} numberOfLines={3}>
                  {locationText}
                </Text>
              </>
            ) : null}
            {shop.user.address?.trim() ? (
              <>
                <Text style={[styles.fieldLabel, styles.fieldLabelSpaced]}>
                  {t("address")}
                </Text>
                <Text style={styles.fieldStatic} numberOfLines={4}>
                  {shop.user.address.trim()}
                </Text>
              </>
            ) : null}
          </View>
        ) : null}

        {shop ? (
          <ShopServiceOverview
            shop={shop}
            locale={locale}
            t={t}
            readOnly={false}
            showServiceSummary={false}
            onEditMakes={() => openEdit("makes")}
            onEditRepair={() => openEdit("repair")}
            onEditParts={() => openEdit("parts")}
          />
        ) : null}

        {/* Settings */}
        <View style={styles.sectionCard}>
          {shop?.offersTowing !== undefined ? (
            <Pressable
              style={styles.settingRow}
              onPress={() => setServicePicker("offersTowing")}
            >
              <Text style={styles.settingLabel}>{t("towing_")}</Text>
              <Text style={[styles.settingValue, shop.offersTowing && styles.settingOn]}>
                {shop.offersTowing ? t("on") : t("off")} ›
              </Text>
            </Pressable>
          ) : null}
          {shop?.deliveryAvailable !== undefined ? (
            <>
              <View style={styles.settingDivider} />
              <Pressable
                style={styles.settingRow}
                onPress={() => setServicePicker("deliveryAvailable")}
              >
                <Text style={styles.settingLabel}>{t("delivery")}</Text>
                <Text
                  style={[styles.settingValue, shop.deliveryAvailable && styles.settingOn]}
                >
                  {shop.deliveryAvailable ? t("on") : t("off")} ›
                </Text>
              </Pressable>
            </>
          ) : null}
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
          <View style={styles.settingDivider} />
          <Pressable
            style={styles.settingRow}
            onPress={() => {
              if (Platform.OS === "web") {
                return;
              }
              router.push("/shop/subscription" as Href);
            }}
          >
            <Text style={styles.settingLabel}>{t("shopSubscriptionSection")}</Text>
            <Text style={styles.settingValue}>
              {subLoading ? t("loading") : isSubscribed ? t("on") : t("openSubscriptionPlans")}{" "}
              ›
            </Text>
          </Pressable>
          <View style={styles.settingDivider} />
          <Pressable
            style={styles.settingRow}
            onPress={() => void openAppNotificationSettings()}
          >
            <Text style={styles.settingLabel}>{t("notifications")}</Text>
            <Text style={styles.settingChevron}>›</Text>
          </Pressable>
        </View>

        {/* Links */}
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
          disabled={deleteBusy || saving}
          onPress={() => promptDeleteAccount(t, setLocale, setDeleteBusy)}
        >
          {deleteBusy ? (
            <ActivityIndicator color={theme.danger} />
          ) : (
            <Text style={styles.deleteAccountText}>{t("deleteAccount")}</Text>
          )}
        </Pressable>

        {/* Logout */}
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
        title={t("chooseLanguageTitle")}
        showSearch={false}
        searchPlaceholder={t("search")}
        selectedId={locale}
        items={[
          { id: "en", label: t("english") },
          { id: "ar-iq", label: t("arabic") },
        ]}
        onSelect={(id) => {
          if (id === "en" || id === "ar-iq") {
            setLocale(id as LocaleId);
          }
        }}
        onRequestClose={() => setLanguagePickerOpen(false)}
        cancelLabel={t("cancel")}
        busy={false}
      />

      <SearchablePickerModal
        visible={servicePicker !== null && shop !== null}
        title={
          servicePicker === "deliveryAvailable"
            ? t("delivery")
            : servicePicker === "offersTowing"
              ? t("towing_")
              : ""
        }
        showSearch={false}
        searchPlaceholder={t("search")}
        selectedId={
          shop && servicePicker
            ? (servicePicker === "offersTowing"
                ? shop.offersTowing
                : shop.deliveryAvailable)
              ? "on"
              : "off"
            : undefined
        }
        items={[
          { id: "on", label: t("on") },
          { id: "off", label: t("off") },
        ]}
        onSelect={(id) => {
          if (!shop || servicePicker === null) {
            return;
          }
          const next = id === "on";
          const current =
            servicePicker === "offersTowing"
              ? shop.offersTowing
              : shop.deliveryAvailable;
          setServicePicker(null);
          if (next === current) {
            return;
          }
          putServiceField(servicePicker, next);
        }}
        onRequestClose={() => setServicePicker(null)}
        cancelLabel={t("cancel")}
        busy={false}
      />

      {/* Edit chip picker modal */}
      <Modal
        visible={editSection !== null}
        animationType="slide"
        transparent
        onRequestClose={() => setEditSection(null)}
      >
        <View style={styles.modalOverlay}>
          <SafeAreaView style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {titleKeyForSection(editSection) ? t(titleKeyForSection(editSection)!) : ""}
              </Text>
              <Pressable onPress={() => setEditSection(null)} hitSlop={8}>
                <Text style={styles.modalClose}>✕</Text>
              </Pressable>
            </View>
            {editSection === "makes" ? (
              <>
                <TextInput
                  style={styles.modalSearch}
                  value={makeSearchQuery}
                  onChangeText={setMakeSearchQuery}
                  placeholder={t("allMakesSearchPlaceholder")}
                  placeholderTextColor={theme.mutedLight}
                  autoCorrect={false}
                />
                {catalogMakesLoading ? (
                  <View style={styles.modalLoading}>
                    <ActivityIndicator color={theme.primaryMid} />
                  </View>
                ) : null}
                <ScrollView
                  style={styles.modalMakesScroll}
                  contentContainerStyle={styles.modalMakesScrollContent}
                  keyboardShouldPersistTaps="handled"
                >
                  <Text style={styles.modalSubheading}>{t("popularInIraq")}</Text>
                  <View style={styles.modalChips}>
                    {POPULAR_MAKES.map((item) => {
                      const on = pendingSelection.has(item);
                      return (
                        <Pressable
                          key={item}
                          style={[styles.modalChip, on && styles.modalChipOn]}
                          onPress={() => togglePending(item)}
                        >
                          <Text style={[styles.modalChipText, on && styles.modalChipTextOn]}>
                            {item}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                  <Text style={[styles.modalSubheading, styles.modalSubheadingSpaced]}>
                    {t("carMakes")}
                  </Text>
                  {sortedFilteredCatalogMakes.map((m) => {
                    const canonical = m.name;
                    const on = pendingSelection.has(canonical);
                    const label =
                      locale === "ar-iq" && m.nameAr ? m.nameAr : m.name;
                    return (
                      <Pressable
                        key={m.id}
                        style={[styles.modalMakeRow, on && styles.modalMakeRowOn]}
                        onPress={() => togglePending(canonical)}
                      >
                        <Text style={[styles.modalMakeRowText, on && styles.modalMakeRowTextOn]}>
                          {label}
                        </Text>
                        {on ? <Text style={styles.modalMakeCheck}>✓</Text> : null}
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </>
            ) : (
              <ScrollView contentContainerStyle={styles.modalChips}>
                {options.map((item) => {
                  const on = pendingSelection.has(item);
                  return (
                    <Pressable
                      key={item}
                      style={[styles.modalChip, on && styles.modalChipOn]}
                      onPress={() => togglePending(item)}
                    >
                      <Text style={[styles.modalChipText, on && styles.modalChipTextOn]}>
                        {labelForEditOption(editSection, item, locale)}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}
            <Pressable
              style={[styles.modalSaveBtn, saving && styles.modalSaveBtnDisabled]}
              disabled={saving}
              onPress={saveEdit}
            >
              <Text style={styles.modalSaveBtnText}>{t("save")}</Text>
            </Pressable>
          </SafeAreaView>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  scrollRoot: { flex: 1, backgroundColor: theme.bg },
  scroll: { paddingBottom: 40 },

  heroSaveRow: {
    marginHorizontal: 16,
    marginTop: 10,
    alignSelf: "flex-start",
    backgroundColor: theme.primaryMid,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: theme.radiusMd,
  },
  heroSaveRowDisabled: { opacity: 0.55 },
  heroSaveText: { color: "#fff", fontWeight: "700", fontSize: 15 },

  contactCard: {
    backgroundColor: theme.surface,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: theme.radiusLg,
    padding: 16,
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 10,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: theme.muted,
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  fieldLabelSpaced: { marginTop: 14 },
  fieldInput: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: theme.radiusMd,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: theme.text,
    backgroundColor: theme.bg,
  },
  fieldStatic: {
    marginTop: 6,
    fontSize: 15,
    fontWeight: "600",
    color: theme.text,
    lineHeight: 22,
  },
  settingOn: { color: theme.primaryMid },
  settingDivider: { height: StyleSheet.hairlineWidth, backgroundColor: theme.border },

  sectionCard: {
    backgroundColor: theme.surface,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: theme.radiusLg,
    padding: 16,
  },

  settingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
  },
  settingLabel: { fontSize: 15, color: theme.text },
  settingValue: { fontSize: 15, color: theme.mutedLight },
  settingChevron: { fontSize: 18, color: theme.mutedLight },

  deleteAccountCard: {
    backgroundColor: theme.surface,
    marginHorizontal: 16,
    marginTop: 16,
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
    marginTop: 16,
    borderRadius: theme.radiusLg,
    padding: 16,
    alignItems: "center",
  },
  logoutText: { color: theme.danger, fontWeight: "700", fontSize: 16 },

  /* Modal */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: theme.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "75%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  modalTitle: { fontSize: 17, fontWeight: "700", color: theme.text },
  modalClose: { fontSize: 18, color: theme.mutedLight },
  modalChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 18,
  },
  modalSearch: {
    marginHorizontal: 18,
    marginTop: 4,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: theme.radiusMd,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: theme.text,
    backgroundColor: theme.bg,
  },
  modalLoading: { paddingVertical: 24, alignItems: "center" },
  modalMakesScroll: { maxHeight: 360 },
  modalMakesScrollContent: { paddingBottom: 24 },
  modalSubheading: {
    paddingHorizontal: 18,
    fontSize: 12,
    fontWeight: "700",
    color: theme.muted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  modalSubheadingSpaced: { marginTop: 8 },
  modalMakeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: 18,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: theme.radiusMd,
    borderWidth: 1,
    borderColor: theme.border,
    marginBottom: 8,
    backgroundColor: theme.bg,
  },
  modalMakeRowOn: {
    borderColor: theme.primaryMid,
    backgroundColor: "rgba(46, 125, 50, 0.08)",
  },
  modalMakeRowText: { fontSize: 15, fontWeight: "600", color: theme.text, flex: 1 },
  modalMakeRowTextOn: { color: theme.primaryMid },
  modalMakeCheck: { fontSize: 16, fontWeight: "700", color: theme.primaryMid },
  modalChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: theme.chip,
    borderWidth: 1,
    borderColor: theme.border,
  },
  modalChipOn: { backgroundColor: theme.primaryMid, borderColor: theme.primaryMid },
  modalChipText: { fontSize: 14, fontWeight: "600", color: theme.text },
  modalChipTextOn: { color: "#fff" },
  modalSaveBtn: {
    margin: 18,
    marginTop: 8,
    backgroundColor: theme.primaryMid,
    paddingVertical: 14,
    borderRadius: theme.radiusMd,
    alignItems: "center",
  },
  modalSaveBtnDisabled: { opacity: 0.6 },
  modalSaveBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
