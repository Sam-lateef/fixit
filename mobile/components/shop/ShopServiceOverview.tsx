import type { ReactElement } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { ShopProfilePayload } from "@/components/shop/shop-profile-model";
import type { LocaleId, StringKey } from "@/lib/strings";
import {
  partsCategoryLabel,
  repairCategoryLabel,
} from "@/lib/taxonomy-labels";
import { theme } from "@/lib/theme";

const SHOW_SHOP_RATINGS_UI = true;

type ShopServiceOverviewProps = {
  shop: ShopProfilePayload;
  locale: LocaleId;
  t: (key: StringKey) => string;
  readOnly: boolean;
  /** When true, shows a short “services offered” list (e.g. owner viewing a bidder). */
  showServiceSummary?: boolean;
  onEditMakes?: () => void;
  onEditRepair?: () => void;
  onEditParts?: () => void;
};

export function ShopServiceOverview(props: ShopServiceOverviewProps): ReactElement {
  const { shop, locale, t, readOnly } = props;
  const showServiceSummary = props.showServiceSummary === true;
  const yearFromShown = shop.carYearMin ?? shop.yearFrom ?? null;
  const yearToShown = shop.carYearMax ?? shop.yearTo ?? null;
  // Car makes & years only apply when the shop is a CAR shop. Motorcycle
  // shops have no per-make taxonomy yet, and towing shops are vehicle-agnostic
  // — neither benefits from the makes section.
  const isCarShop = shop.shopType === "CAR";

  return (
    <>
      <View style={styles.statsCard}>
        <View style={styles.stat}>
          <Text style={styles.statNum}>{shop.bidsWon}</Text>
          <Text style={styles.statLabel}>{t("bidsWon")}</Text>
        </View>
        {SHOW_SHOP_RATINGS_UI ? (
          <>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statNum}>{shop.reviewCount}</Text>
              <Text style={styles.statLabel}>{t("reviews")}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statNum}>{shop.rating.toFixed(1)}</Text>
              <Text style={styles.statLabel}>{t("rating")}</Text>
            </View>
          </>
        ) : null}
      </View>

      {isCarShop ? (
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t("carMakesYears")}</Text>
            {!readOnly && props.onEditMakes ? (
              <Pressable onPress={props.onEditMakes}>
                <Text style={styles.editLink}>{t("editCategories")}</Text>
              </Pressable>
            ) : null}
          </View>
          <View style={styles.chipRow}>
            {shop.carMakes.length > 0 ? (
              shop.carMakes.map((m) => (
                <View key={m} style={styles.chip}>
                  <Text style={styles.chipText}>{m}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.emptyHint}>—</Text>
            )}
          </View>
          {yearFromShown !== null || yearToShown !== null ? (
            <Text style={styles.yearRange}>
              {yearFromShown ?? "?"} – {yearToShown ?? "?"}
            </Text>
          ) : null}
        </View>
      ) : null}

      {isCarShop && shop.offersRepair ? (
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t("repairCategories")}</Text>
            {!readOnly && props.onEditRepair ? (
              <Pressable onPress={props.onEditRepair}>
                <Text style={styles.editLink}>{t("editCategories")}</Text>
              </Pressable>
            ) : null}
          </View>
          <View style={styles.chipRow}>
            {shop.repairCategories.length > 0 ? (
              shop.repairCategories.map((c) => (
                <View key={c} style={styles.chip}>
                  <Text style={styles.chipText}>{repairCategoryLabel(c, locale)}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.emptyHint}>—</Text>
            )}
          </View>
        </View>
      ) : null}

      {isCarShop && shop.offersParts ? (
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t("partsCategories")}</Text>
            {!readOnly && props.onEditParts ? (
              <Pressable onPress={props.onEditParts}>
                <Text style={styles.editLink}>{t("editCategories")}</Text>
              </Pressable>
            ) : null}
          </View>
          <View style={styles.chipRow}>
            {shop.partsCategories.length > 0 ? (
              shop.partsCategories.map((c) => (
                <View key={c} style={styles.chip}>
                  <Text style={styles.chipText}>{partsCategoryLabel(c, locale)}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.emptyHint}>—</Text>
            )}
          </View>
        </View>
      ) : null}

      {showServiceSummary ? (
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>{t("servicesOffered")}</Text>
          <View style={styles.serviceList}>
            {shop.offersRepair ? (
              <Text style={styles.serviceItem}>· {t("repair")}</Text>
            ) : null}
            {shop.offersParts ? (
              <Text style={styles.serviceItem}>· {t("parts")}</Text>
            ) : null}
            {shop.offersTowing ? (
              <Text style={styles.serviceItem}>· {t("towing_")}</Text>
            ) : null}
            {!shop.offersRepair && !shop.offersParts && !shop.offersTowing ? (
              <Text style={styles.emptyHint}>—</Text>
            ) : null}
          </View>
        </View>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  statsCard: {
    flexDirection: "row",
    backgroundColor: theme.surface,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: theme.radiusLg,
    paddingVertical: 16,
    alignItems: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
  },
  stat: { flex: 1, alignItems: "center" },
  statNum: { fontSize: 20, fontWeight: "700", color: theme.primaryMid },
  statLabel: { fontSize: 12, color: theme.muted, marginTop: 2 },
  statDivider: { width: 1, height: 32, backgroundColor: theme.border },

  sectionCard: {
    backgroundColor: theme.surface,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: theme.radiusLg,
    padding: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: theme.text },
  editLink: { fontSize: 14, color: theme.primaryMid, fontWeight: "600" },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    backgroundColor: theme.chip,
    // Extra horizontal padding + overflow:'visible' guards Arabic last-char
    // clipping on Samsung One UI 8 (RN underestimates Arabic text width).
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    overflow: "visible",
  },
  chipText: { fontSize: 13, color: theme.text, fontWeight: "500" },
  emptyHint: { fontSize: 14, color: theme.mutedLight },
  yearRange: { fontSize: 13, color: theme.muted, marginTop: 8 },
  serviceList: { marginTop: 4 },
  serviceItem: { fontSize: 15, color: theme.text, marginTop: 4 },
});
