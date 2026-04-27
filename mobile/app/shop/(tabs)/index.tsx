import { useFocusEffect } from "@react-navigation/native";
import { router, type Href } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
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
  towingToAddress: string | null;
  description: string;
  distanceKm: number | null;
  expiresAt: string;
  createdAt: string;
  photoUrls: string[];
  bids: Array<{ shopId: string }>;
  user: { name: string | null };
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
};

type FeedSection = {
  key: string;
  title: string;
  hint?: string;
  data: Post[];
};

type FilterTab = "ALL" | "REPAIR" | "PARTS" | "TOWING";

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

export default function ShopFeedScreen(): React.ReactElement {
  const { t, locale } = useI18n();
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

  /** Sort: posts where this shop already placed an offer come first (so the
   *  shop sees their active conversations at the top). Stable for the rest. */
  const sortMyBidsFirst = useCallback(
    (list: Post[]): Post[] => {
      const mine = list.filter(hasMyBid);
      const rest = list.filter((p) => !hasMyBid(p));
      return [...mine, ...rest];
    },
    [hasMyBid],
  );

  const sections: FeedSection[] = useMemo(() => {
    const out: FeedSection[] = [
      { key: "matched", title: t("feedForYou"), data: sortMyBidsFirst(posts) },
    ];
    if (morePosts.length > 0) {
      const moreTitle =
        moreCity !== null
          ? t("feedMoreSectionTitle").replace(/\{\{city\}\}/g, moreCity)
          : t("feedMoreNationalTitle");
      const moreHint = moreHasNational
        ? t("feedMoreSectionHintNational")
        : t("feedMoreSectionHint");
      out.push({
        key: "more",
        title: moreTitle,
        hint: moreHint,
        data: sortMyBidsFirst(morePosts),
      });
    }
    return out;
  }, [posts, morePosts, moreCity, moreHasNational, t, sortMyBidsFirst]);

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
          if (sec.key === "matched" && morePosts.length === 0) {
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
                  <View style={[styles.serviceTag, { backgroundColor: tag.bg }]}>
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
                      <Text style={styles.carInfo} numberOfLines={1}>
                        {carLine}
                      </Text>
                    ) : null}
                    {showLocation ? (
                      <Text style={styles.locationInfo} numberOfLines={1}>
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
  sectionHeaderTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: theme.text,
  },
  sectionHeaderHint: {
    fontSize: 12,
    color: theme.muted,
    marginTop: 4,
    lineHeight: 17,
  },
  sectionFooterEmpty: {
    fontSize: 13,
    color: theme.muted,
    marginBottom: 14,
    fontStyle: "italic",
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
