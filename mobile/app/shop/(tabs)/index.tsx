import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { router, type Href } from "expo-router";
import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  RefreshControl,
  SectionList,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { PostImageLightbox } from "@/components/PostImageLightbox";
import { ShopPremiumGate } from "@/components/ShopPremiumGate";
import { apiFetch } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import type { StringKey } from "@/lib/strings";
import {
  ownerCityLabel,
  partsCategoryLabel,
  repairCategoryLabel,
} from "@/lib/taxonomy-labels";
import { theme } from "@/lib/theme";

// Category labels kept for future use; banner hidden for first release
const _CATEGORY_LABEL: Record<string, string> = {
  CARS: "🚗 Cars",
  ELECTRICS: "⚡ Electrics",
  PLUMBING: "🔧 Plumbing",
  METAL: "🔩 Metal",
  WOOD: "🪵 Wood",
};

type Post = {
  id: string;
  serviceType: string;
  category: string;
  title: string | null;
  repairCategory: string | null;
  partsCategory: string | null;
  carMake: string | null;
  carModel: string | null;
  carYear: number | null;
  deliveryNeeded: boolean;
  towingToAddress: string | null;
  description: string;
  distanceKm: number | null;
  expiresAt: string;
  createdAt: string;
  photoUrls: string[];
  bids: Array<{ shopId: string }>;
  user: { name: string | null };
  districtId: string | null;
  district: {
    name: string;
    nameAr: string | null;
    city: string;
  } | null;
};

const NEW_THRESHOLD_HOURS = 2;

function isNew(createdAt: string): boolean {
  return Date.now() - new Date(createdAt).getTime() < NEW_THRESHOLD_HOURS * 3_600_000;
}

type ShopMe = {
  id: string;
  category: string;
  offersRepair: boolean;
  offersParts: boolean;
  offersTowing: boolean;
  carMakes: string[];
  carYearMin: number | null;
  carYearMax: number | null;
  yearFrom: number | null;
  yearTo: number | null;
  repairCategories: string[];
  partsCategories: string[];
  /** Districts the shop covers. Empty = whole city. */
  servedDistrictIds: string[];
  user: {
    city: string | null;
    // Server feed filter falls back to user.district.city when user.city is
    // empty (shops often have district set before city is duplicated on user).
    district: { city: string } | null;
  };
};

type FeedSection = {
  key: string;
  title: string;
  hint?: string;
  data: Post[];
};

type FilterTab = "ALL" | "REPAIR" | "PARTS" | "TOWING";
type SortOption = "newest" | "oldest" | "distance";

function applySort(list: Post[], sortBy: SortOption): Post[] {
  const out = [...list];
  if (sortBy === "newest") {
    out.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } else if (sortBy === "oldest") {
    out.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  } else {
    // distance: posts with known distance first (ascending), then unknowns by recency
    out.sort((a, b) => {
      const da = a.distanceKm;
      const db = b.distanceKm;
      if (da == null && db == null) {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (da == null) return 1;
      if (db == null) return -1;
      return da - db;
    });
  }
  return out;
}

function serviceTagStyle(type: string): { bg: string; fg: string } {
  const upper = type.toUpperCase();
  if (upper === "PARTS") return { bg: theme.partsBg, fg: theme.partsText };
  if (upper === "TOWING") return { bg: theme.towingBg, fg: theme.towingText };
  return { bg: theme.repairBg, fg: theme.repairText };
}

function hoursLeft(expiresAt: string): number {
  return Math.max(0, Math.round((new Date(expiresAt).getTime() - Date.now()) / 3_600_000));
}

function serviceTypeLabel(
  type: string,
  t: (key: StringKey) => string,
): string {
  const u = type.toUpperCase();
  if (u === "REPAIR") {
    return t("repair");
  }
  if (u === "PARTS") {
    return t("parts");
  }
  if (u === "TOWING") {
    return t("towing");
  }
  return type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
}

type Mismatches = {
  city: boolean;
  district: boolean;
  carMake: boolean;
  carYear: boolean;
  category: boolean;
};

function computeMismatches(p: Post, shop: ShopMe | null): Mismatches {
  const empty = {
    city: false,
    district: false,
    carMake: false,
    carYear: false,
    category: false,
  };
  if (!shop) return empty;
  // Shop city — fall back to user.district.city when user.city is empty
  // (mirrors server-side resolveShopCityForFeed in api/services/feed-filter.ts).
  const shopCity = (
    shop.user.city?.trim() ||
    shop.user.district?.city?.trim() ||
    ""
  ).toLowerCase();
  const postCity = (p.district?.city.trim() ?? "").toLowerCase();
  const cityMismatch =
    shopCity.length > 0 && postCity.length > 0 && shopCity !== postCity;
  // District mismatch: when shop has a non-empty servedDistrictIds list
  // and the post's district isn't in it (only meaningful when cities match).
  const districtMismatch =
    !cityMismatch &&
    shop.servedDistrictIds.length > 0 &&
    p.districtId !== null &&
    !shop.servedDistrictIds.includes(p.districtId);
  // Car make: shop has restricted list AND post specifies a make not in it.
  const carMake = p.carMake?.trim().toLowerCase() ?? "";
  const shopMakes = shop.carMakes.map((m) => m.toLowerCase());
  const carMakeMismatch =
    carMake.length > 0 &&
    shopMakes.length > 0 &&
    !shopMakes.includes(carMake);
  // Car year: shop has a range AND post year is outside it. Use new
  // carYearMin/Max if present, else legacy yearFrom/yearTo.
  const yMin = shop.carYearMin ?? shop.yearFrom;
  const yMax = shop.carYearMax ?? shop.yearTo;
  const carYearMismatch =
    p.carYear !== null &&
    ((yMin != null && p.carYear < yMin) || (yMax != null && p.carYear > yMax));
  // Category: only when shop has a restrictive list for this service type.
  const svc = p.serviceType.toUpperCase();
  let categoryMismatch = false;
  if (svc === "REPAIR" && p.repairCategory && shop.repairCategories.length > 0) {
    categoryMismatch = !shop.repairCategories.includes(p.repairCategory);
  } else if (svc === "PARTS" && p.partsCategory && shop.partsCategories.length > 0) {
    categoryMismatch = !shop.partsCategories.includes(p.partsCategory);
  }
  return {
    city: cityMismatch,
    district: districtMismatch,
    carMake: carMakeMismatch,
    carYear: carYearMismatch,
    category: categoryMismatch,
  };
}

export default function ShopFeedScreen(): React.ReactElement {
  const { t, locale } = useI18n();
  const navigation = useNavigation();
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const [shopId, setShopId] = useState<string | null>(null);
  const [shop, setShop] = useState<ShopMe | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [morePosts, setMorePosts] = useState<Post[]>([]);
  const [moreCity, setMoreCity] = useState<string | null>(null);
  const [moreHasNational, setMoreHasNational] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterTab>("ALL");
  const [loadError, setLoadError] = useState("");

  const load = useCallback(
    async (activeFilter: FilterTab) => {
      setLoadError("");
      try {
        const { shop: s } = await apiFetch<{ shop: ShopMe }>("/api/v1/shops/me");
        setShopId(s.id);
        setShop(s);
      } catch (e) {
        setShopId(null);
        setShop(null);
        setPosts([]);
        setMorePosts([]);
        setMoreCity(null);
        setMoreHasNational(false);
        setLoadError(
          e instanceof Error && e.message.trim().length > 0
            ? e.message
            : t("feedCouldNotLoad"),
        );
        return;
      }
      try {
        const query = activeFilter === "ALL" ? "" : `?serviceType=${activeFilter}`;
        const res = await apiFetch<{
          posts: Post[] | undefined;
          morePosts?: Post[];
          moreCity?: string | null;
          moreHasNational?: boolean;
        }>(`/api/v1/feed${query}`);
        setPosts(Array.isArray(res.posts) ? res.posts : []);
        setMorePosts(Array.isArray(res.morePosts) ? res.morePosts : []);
        setMoreCity(
          typeof res.moreCity === "string" && res.moreCity.trim().length > 0
            ? res.moreCity.trim()
            : null,
        );
        setMoreHasNational(res.moreHasNational === true);
      } catch (e) {
        setPosts([]);
        setMorePosts([]);
        setMoreCity(null);
        setMoreHasNational(false);
        setLoadError(
          e instanceof Error && e.message.trim().length > 0
            ? e.message
            : t("feedCouldNotLoad"),
        );
      }
    },
    [t],
  );

  useEffect(() => {
    void load(filter);
  }, [load, filter]);

  useFocusEffect(
    useCallback(() => {
      void load(filter);
    }, [load, filter]),
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void (async () => {
      try {
        await load(filter);
      } finally {
        setRefreshing(false);
      }
    })();
  }, [load, filter]);

  // Memoize the RefreshControl element — known iOS Fabric bug where
  // recreating it on every render (during focus events) leaves it with a
  // stale native handler. facebook/react-native#37308.
  const refreshControl = useMemo(
    () => <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />,
    [refreshing, onRefresh],
  );

  const tabs: Array<{ key: FilterTab; label: string }> = [{ key: "ALL", label: t("all") }];
  if (shop?.offersRepair) tabs.push({ key: "REPAIR", label: t("repair") });
  if (shop?.offersParts) tabs.push({ key: "PARTS", label: t("parts") });
  if (shop?.offersTowing) tabs.push({ key: "TOWING", label: t("towing") });

  const categoryLabel = (p: Post): string | null => {
    if (p.serviceType.toUpperCase() === "REPAIR" && p.repairCategory) {
      return repairCategoryLabel(p.repairCategory, locale);
    }
    if (p.serviceType.toUpperCase() === "PARTS" && p.partsCategory) {
      return partsCategoryLabel(p.partsCategory, locale);
    }
    return null;
  };

  const hasMyBid = useCallback(
    (p: Post): boolean =>
      shopId !== null && p.bids.some((b) => b.shopId === shopId),
    [shopId],
  );

  const sections: FeedSection[] = useMemo(() => {
    const out: FeedSection[] = [
      { key: "matched", title: t("feedForYou"), data: applySort(posts, sortBy) },
    ];
    if (morePosts.length > 0) {
      out.push({
        key: "more",
        title: t("feedMoreSectionTitle"),
        hint: t("feedMoreSectionHint"),
        data: applySort(morePosts, sortBy),
      });
    }
    return out;
  }, [posts, morePosts, t, sortBy]);

  // Header-right sort button. Tapping opens the sort sheet.
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable
          onPress={() => setSortMenuOpen(true)}
          hitSlop={8}
          style={styles.headerSortBtn}
        >
          <Text style={styles.headerSortText}>{`⇅  ${t("sortLabel")}`}</Text>
        </Pressable>
      ),
    });
  }, [navigation, t]);

  return (
    <ShopPremiumGate>
      <View style={styles.screenRoot}>
      <SectionList
        style={styles.listFlex}
        sections={sections}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        stickySectionHeadersEnabled={false}
        refreshControl={refreshControl}
        ListHeaderComponent={
          <View>
            <View style={styles.tabRow}>
              {tabs.map((tab) => (
                <Pressable
                  key={tab.key}
                  style={[styles.tab, filter === tab.key && styles.tabActive]}
                  onPress={() => setFilter(tab.key)}
                >
                  <Text style={[styles.tabText, filter === tab.key && styles.tabTextActive]}>
                    {tab.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        }
        renderSectionHeader={({ section: sec }) => {
          // Matched section: the screen header already says "Requests".
          // Only render a header for the "More" section.
          if (sec.key === "matched") {
            return null;
          }
          return (
            <View style={styles.sectionHeaderWrap}>
              <Text style={styles.sectionHeaderTitle}>{sec.title}</Text>
              {sec.hint != null && sec.hint.length > 0 ? (
                <Text style={styles.sectionHeaderHint}>{sec.hint}</Text>
              ) : null}
            </View>
          );
        }}
        renderSectionFooter={({ section: sec }) => {
          if (sec.key === "matched" && sec.data.length === 0 && morePosts.length > 0) {
            return <Text style={styles.sectionFooterEmpty}>{t("feedNoMatchingPosts")}</Text>;
          }
          if (sec.key === "more" && sec.data.length === 0) {
            return <Text style={styles.sectionFooterEmpty}>{t("feedMoreEmpty")}</Text>;
          }
          return null;
        }}
        ListEmptyComponent={
          <Text style={[styles.empty, loadError ? styles.emptyError : null]}>
            {loadError.length > 0 ? loadError : t("noPosts")}
          </Text>
        }
        renderItem={({ item: p, section }) => {
          const inMoreSection = section.key === "more";
          const hasBid = shopId !== null && p.bids.some((b) => b.shopId === shopId);
          const tag = serviceTagStyle(p.serviceType);
          const cat = categoryLabel(p);
          const hrs = hoursLeft(p.expiresAt);
          const isTowing = p.serviceType.toUpperCase() === "TOWING";
          const postIsNew = isNew(p.createdAt);
          const mm = inMoreSection ? computeMismatches(p, shop) : null;

          const openBid = (): void => {
            router.push(`/shop/bid/${p.id}` as Href);
          };

          return (
            <View
              style={[
                styles.card,
                hasBid && styles.cardDimmed,
                inMoreSection && styles.cardMore,
              ]}
            >
              <Pressable onPress={openBid}>
              {/* Top row: service tag + badges + distance */}
              <View style={styles.cardTopRow}>
                <View style={styles.tagRow}>
                  <View
                    style={[
                      styles.serviceTag,
                      { backgroundColor: tag.bg },
                      mm?.category && styles.mismatchOutline,
                    ]}
                  >
                    <Text style={[styles.serviceTagText, { color: tag.fg }]}>
                      {serviceTypeLabel(p.serviceType, t)}
                      {cat ? ` · ${cat}` : ""}
                    </Text>
                  </View>
                  {isTowing ? (
                    <View style={styles.urgencyBadge}>
                      <Text style={styles.urgencyText}>⚡</Text>
                    </View>
                  ) : null}
                  {p.serviceType.toUpperCase() === "PARTS" && p.deliveryNeeded ? (
                    <View style={styles.deliveryBadge}>
                      <Text style={styles.deliveryBadgeText}>{t("deliveryRequested")}</Text>
                    </View>
                  ) : null}
                  {postIsNew && !hasBid ? (
                    <View style={styles.newBadge}>
                      <Text style={styles.newBadgeText}>{t("new_")}</Text>
                    </View>
                  ) : null}
                  {hasBid ? (
                    <View style={styles.bidSentBadgeTop}>
                      <Text style={styles.bidSentTextTop}>{t("bidSent")}</Text>
                    </View>
                  ) : null}
                </View>
                {p.distanceKm != null ? (
                  <View style={styles.distPill}>
                    <Text style={styles.distText}>{p.distanceKm} {t("distKm")}</Text>
                  </View>
                ) : null}
              </View>

              {/* User name */}
              <View style={styles.userRow}>
                <Text style={styles.userName} numberOfLines={1}>
                  {p.user.name ?? "—"}
                </Text>
              </View>

              {/* Title + description, thumbnail: right in English, left in Arabic (RTL mirrors row-reverse) */}
              {(() => {
                const carLine = [p.carMake, p.carModel, p.carYear]
                  .filter(Boolean)
                  .join(" · ");
                const showCar = carLine.length > 0;
                const cityLabel = p.district
                  ? ownerCityLabel(p.district.city, locale)
                  : "";
                const districtLabel = p.district
                  ? locale === "ar-iq" && p.district.nameAr
                    ? p.district.nameAr
                    : p.district.name
                  : "";
                const locationLine = [cityLabel, districtLabel]
                  .filter((s) => s.length > 0)
                  .join(" · ");
                const showLocation = locationLine.length > 0;
                const towToAddr =
                  p.serviceType.toUpperCase() === "TOWING"
                    ? p.towingToAddress?.trim() ?? ""
                    : "";
                const showTowTo = towToAddr.length > 0;
                const textBlock = (
                  <>
                    {p.title ? (
                      <Text style={styles.title} numberOfLines={1}>{p.title}</Text>
                    ) : null}
                    <Text style={styles.desc} numberOfLines={2}>
                      {p.description}
                    </Text>
                    {showCar ? (
                      <Text
                        style={[
                          styles.carInfo,
                          (mm?.carMake || mm?.carYear) && styles.mismatchOutlineText,
                        ]}
                        numberOfLines={1}
                      >
                        {carLine}
                      </Text>
                    ) : null}
                    {showLocation ? (
                      <Text
                        style={[
                          styles.locationInfo,
                          (mm?.city || mm?.district) && styles.mismatchOutlineText,
                        ]}
                        numberOfLines={1}
                      >
                        {locationLine}
                      </Text>
                    ) : null}
                    {showTowTo ? (
                      <Text style={styles.towToInfo} numberOfLines={2}>
                        {t("towToLabel")}: {towToAddr}
                      </Text>
                    ) : null}
                  </>
                );
                return p.photoUrls?.length > 0 ? (
                  <View style={styles.contentRow}>
                    <View style={styles.thumbWrap}>
                      <PostImageLightbox
                        uri={p.photoUrls[0].trim()}
                        thumbnailStyle={styles.thumb}
                      />
                      {p.photoUrls.length > 1 ? (
                        <View style={styles.moreOverlay}>
                          <Text style={styles.moreText}>+{p.photoUrls.length - 1}</Text>
                        </View>
                      ) : null}
                    </View>
                    <View style={styles.textFlex}>{textBlock}</View>
                  </View>
                ) : (
                  textBlock
                );
              })()}
              </Pressable>

              <Pressable onPress={openBid}>

              {/* Bottom row: bids + time left + button */}
              <View style={styles.bottomRow}>
                <View style={styles.metaRow}>
                  <Text style={styles.metaText}>
                    {p.bids.length} {t("bidsCount")}
                  </Text>
                  <Text style={styles.metaDot}>·</Text>
                  <Text style={styles.metaText}>{hrs}{t("hrsLeft")}</Text>
                </View>
                {!hasBid ? (
                  <Pressable
                    style={styles.bidBtn}
                    onPress={openBid}
                  >
                    <Text style={styles.bidBtnText}>{t("placeBid")}</Text>
                  </Pressable>
                ) : null}
              </View>
              </Pressable>
            </View>
          );
        }}
      />
      </View>

      {/* Sort menu */}
      <Modal
        visible={sortMenuOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setSortMenuOpen(false)}
      >
        <Pressable
          style={styles.sortBackdrop}
          onPress={() => setSortMenuOpen(false)}
        >
          <Pressable style={styles.sortSheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sortGrabber} />
            <View style={styles.sortHeader}>
              <Text style={styles.sortHeaderTitle}>{t("sortLabel")}</Text>
              <Pressable onPress={() => setSortMenuOpen(false)} hitSlop={8}>
                <Text style={styles.sortHeaderClose}>✕</Text>
              </Pressable>
            </View>
            {(["newest", "oldest", "distance"] as const).map((opt, i) => {
              const active = sortBy === opt;
              const label =
                opt === "newest"
                  ? t("sortNewest")
                  : opt === "oldest"
                    ? t("sortOldest")
                    : t("sortDistance");
              return (
                <Pressable
                  key={opt}
                  style={[
                    styles.sortOption,
                    i > 0 && styles.sortOptionDivider,
                    active && styles.sortOptionActive,
                  ]}
                  onPress={() => {
                    setSortBy(opt);
                    setSortMenuOpen(false);
                  }}
                >
                  <Text style={[styles.sortOptionText, active && styles.sortOptionTextActive]}>
                    {active ? "✓ " : "  "}
                    {label}
                  </Text>
                </Pressable>
              );
            })}
            <View style={styles.sortBottomSafe} />
          </Pressable>
        </Pressable>
      </Modal>
    </ShopPremiumGate>
  );
}

const styles = StyleSheet.create({
  screenRoot: { flex: 1, backgroundColor: theme.bg },
  /** SectionList must fill the tab or rows never get a scroll viewport (Android). */
  listFlex: { flex: 1 },
  // flexGrow: 1 makes pull-to-refresh work when the list is short / empty
  // (same fix as InboxThreadList).
  list: { padding: 16, paddingTop: 24, paddingBottom: 32, backgroundColor: theme.bg, flexGrow: 1 },

  sectionHeaderWrap: {
    marginTop: 8,
    marginBottom: 10,
    paddingTop: 4,
  },
  // textAlign:"left" auto-flips to right under I18nManager.isRTL — matches
  // the RTL pattern used elsewhere in the app.
  sectionHeaderTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: theme.text,
    textAlign: "left",
  },
  sectionHeaderHint: {
    fontSize: 12,
    color: theme.muted,
    marginTop: 4,
    lineHeight: 17,
    textAlign: "left",
  },
  // Header sort button (placed in headerRight)
  headerSortBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  headerSortText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
  // Sort menu (bottom-sheet modal)
  sortBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  sortSheet: {
    backgroundColor: theme.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 8,
    paddingHorizontal: 20,
    minHeight: 280,
  },
  sortGrabber: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.border,
    alignSelf: "center",
    marginTop: 8,
    marginBottom: 8,
  },
  sortHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    marginBottom: 4,
  },
  sortHeaderTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: theme.text,
  },
  sortHeaderClose: {
    fontSize: 20,
    color: theme.muted,
    paddingHorizontal: 4,
  },
  sortOption: {
    paddingVertical: 18,
    paddingHorizontal: 12,
    borderRadius: theme.radiusMd,
  },
  sortOptionDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.border,
    borderRadius: 0,
  },
  sortOptionActive: {
    backgroundColor: theme.primaryLight,
    borderRadius: theme.radiusMd,
    borderTopWidth: 0,
  },
  sortOptionText: {
    fontSize: 16,
    color: theme.text,
    textAlign: "left",
  },
  sortOptionTextActive: {
    color: theme.primary,
    fontWeight: "700",
  },
  // Pads beyond home indicator on iOS / nav bar on Android.
  sortBottomSafe: { height: 36 },

  // Applied to the post card field that fails to match the shop profile
  // in the More section. Two flavors: chip-wrapper (already padded) and
  // text-only (needs alignSelf + small padding to shrink to content width
  // instead of stretching the whole row).
  mismatchOutline: {
    borderWidth: 1,
    borderColor: theme.danger,
    borderRadius: theme.radiusMd,
  },
  mismatchOutlineText: {
    borderWidth: 1,
    borderColor: theme.danger,
    borderRadius: theme.radiusMd,
    alignSelf: "flex-start",
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  sectionFooterEmpty: {
    fontSize: 13,
    color: theme.muted,
    marginBottom: 14,
    fontStyle: "italic",
    // textAlign:"left" auto-flips to right under I18nManager.isRTL.
    textAlign: "left",
  },

  categoryBanner: {
    backgroundColor: theme.primaryLight,
    borderRadius: theme.radiusMd,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginBottom: 12,
    alignSelf: "flex-start",
  },
  categoryBannerText: { fontSize: 13, fontWeight: "700", color: theme.primary },

  tabRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: theme.chip,
  },
  tabActive: { backgroundColor: theme.primary },
  tabText: { fontSize: 14, fontWeight: "600", color: theme.muted },
  tabTextActive: { color: "#fff" },

  empty: { color: theme.muted, marginTop: 24, textAlign: "center" },
  emptyError: { color: theme.danger, fontWeight: "600" },

  card: {
    backgroundColor: theme.surface,
    borderRadius: theme.radiusLg,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.border,
  },
  cardMore: {
    backgroundColor: "rgba(46, 125, 50, 0.04)",
  },
  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  tagRow: { flexDirection: "row", alignItems: "center", gap: 6, flexShrink: 1 },
  serviceTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  serviceTagText: { fontSize: 12, fontWeight: "700" },
  urgencyBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: theme.towingBg,
    alignItems: "center",
    justifyContent: "center",
  },
  urgencyText: { fontSize: 12 },
  distPill: {
    backgroundColor: "#D8F3DC",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  distText: { fontSize: 12, fontWeight: "700", color: "#1B4332" },

  title: { marginTop: 10, color: theme.text, fontSize: 15, fontWeight: "700", lineHeight: 20, textAlign: "left" },
  desc: { marginTop: 4, color: theme.muted, fontSize: 14, lineHeight: 20, textAlign: "left" },
  carInfo: {
    marginTop: 6,
    fontSize: 14,
    fontWeight: "600",
    color: theme.text,
    textAlign: "left",
  },
  locationInfo: {
    marginTop: 2,
    fontSize: 13,
    color: theme.muted,
    textAlign: "left",
  },
  towToInfo: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: "600",
    color: theme.towingText,
    textAlign: "left",
  },

  bottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: theme.border,
  },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { fontSize: 13, color: theme.mutedLight },
  metaDot: { fontSize: 13, color: theme.mutedLight },

  bidBtn: {
    backgroundColor: theme.primaryMid,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: theme.radiusMd,
  },
  bidBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  bidSentBadge: {
    backgroundColor: theme.primaryLight,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: theme.radiusMd,
  },
  bidSentText: { color: theme.primary, fontWeight: "700", fontSize: 13 },

  cardDimmed: { opacity: 0.65 },

  deliveryBadge: {
    backgroundColor: "#E0F2FE",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  deliveryBadgeText: { fontSize: 11, fontWeight: "700", color: "#075985" },
  newBadge: {
    backgroundColor: "#D8F3DC",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  newBadgeText: { fontSize: 11, fontWeight: "700", color: "#1B4332" },

  bidSentBadgeTop: {
    backgroundColor: theme.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  bidSentTextTop: { fontSize: 11, fontWeight: "700", color: theme.primary },

  userRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
  },
  userName: { fontSize: 13, color: theme.muted, flex: 1 },
  contentRow: {
    flexDirection: "row-reverse",
    alignItems: "flex-start",
    gap: 10,
    marginTop: 6,
  },
  thumbWrap: {
    position: "relative",
  },
  thumb: {
    width: 72,
    height: 72,
    borderRadius: 8,
  },
  moreOverlay: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.55)",
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 5,
  },
  moreText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },
  textFlex: {
    flex: 1,
  },
});
