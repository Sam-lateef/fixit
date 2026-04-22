import { Stack, useLocalSearchParams } from "expo-router";
import type { ReactElement } from "react";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { ShopProfileHero } from "@/components/shop/ShopProfileHero";
import type { ShopProfilePayload } from "@/components/shop/shop-profile-model";
import { ShopServiceOverview } from "@/components/shop/ShopServiceOverview";
import { apiFetch } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import {
  ownerCityLabel,
} from "@/lib/taxonomy-labels";
import { theme } from "@/lib/theme";

function normalizeShopPayload(raw: ShopProfilePayload): ShopProfilePayload {
  return {
    ...raw,
    coverImageUrl: raw.coverImageUrl ?? null,
    user: {
      ...raw.user,
      address: raw.user.address ?? null,
    },
  };
}

export default function OwnerViewShopScreen(): ReactElement {
  const { shopId } = useLocalSearchParams<{ shopId: string }>();
  const { t, locale } = useI18n();
  const [shop, setShop] = useState<ShopProfilePayload | null>(null);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    if (!shopId) return;
    setErr("");
    try {
      const { shop: s } = await apiFetch<{ shop: ShopProfilePayload }>(
        `/api/v1/shops/by-id/${encodeURIComponent(shopId)}`,
      );
      setShop(normalizeShopPayload(s));
    } catch (e) {
      setShop(null);
      setErr(e instanceof Error ? e.message : t("updateFailed"));
    }
  }, [shopId, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const cityShown = shop?.user.city
    ? ownerCityLabel(shop.user.city, locale)
    : "";
  const districtShown =
    shop?.user.district &&
    (locale === "ar-iq" && shop.user.district.nameAr
      ? shop.user.district.nameAr
      : shop.user.district.name);
  const locationLine = [cityShown, districtShown].filter(Boolean).join(" · ");
  const contactName = shop?.user.name?.trim() || "";

  return (
    <>
      <Stack.Screen
        options={{
          title: shop?.name?.trim() ? shop.name : t("shopProfile"),
          headerStyle: { backgroundColor: theme.surface },
          headerTintColor: theme.text,
        }}
      />
      <ScrollView style={styles.root} contentContainerStyle={styles.scroll}>
        {shop ? (
          <>
            <ShopProfileHero
              coverImageUrl={shop.coverImageUrl}
              shopNameDraft={shop.name}
              onShopNameDraftChange={() => undefined}
              onCommitShopName={() => undefined}
              editable={false}
            />
            <View style={styles.contactCard}>
              {contactName.length > 0 ? (
                <>
                  <Text style={styles.label}>{t("name")}</Text>
                  <Text style={styles.value}>{contactName}</Text>
                </>
              ) : null}
              {shop.user.phone ? (
                <>
                  <Text style={[styles.label, styles.labelSpaced]}>
                    {t("phoneWhatsApp")}
                  </Text>
                  <Text style={styles.value}>{shop.user.phone}</Text>
                </>
              ) : null}
              {locationLine.length > 0 ? (
                <>
                  <Text style={[styles.label, styles.labelSpaced]}>
                    {t("city")} · {t("district")}
                  </Text>
                  <Text style={styles.value}>{locationLine}</Text>
                </>
              ) : null}
              {shop.user.address?.trim() ? (
                <>
                  <Text style={[styles.label, styles.labelSpaced]}>{t("address")}</Text>
                  <Text style={styles.value}>{shop.user.address.trim()}</Text>
                </>
              ) : null}
            </View>
            <ShopServiceOverview
              shop={shop}
              locale={locale}
              t={t}
              readOnly
              showServiceSummary
            />
          </>
        ) : err ? (
          <Text style={styles.err}>{err}</Text>
        ) : (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={theme.primaryMid} />
            <Text style={styles.muted}>{t("loading")}</Text>
          </View>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  scroll: { paddingBottom: 32 },
  contactCard: {
    backgroundColor: theme.surface,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: theme.radiusLg,
    padding: 16,
  },
  label: {
    fontSize: 11,
    fontWeight: "700",
    color: theme.muted,
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  labelSpaced: { marginTop: 14 },
  value: {
    marginTop: 6,
    fontSize: 16,
    fontWeight: "600",
    color: theme.text,
    lineHeight: 22,
  },
  center: {
    paddingTop: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  muted: { marginTop: 12, color: theme.muted },
  err: { padding: 24, color: theme.danger, fontSize: 15 },
});
