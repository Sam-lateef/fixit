import { useNavigation } from "@react-navigation/native";
import { router, type Href } from "expo-router";
import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { PostRemoteImage } from "@/components/PostRemoteImage";
import { ShopPremiumGate } from "@/components/ShopPremiumGate";
import { apiFetch, formatIqd } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { theme } from "@/lib/theme";

type SortOption = "newest" | "oldest";

type BidRow = {
  id: string;
  priceEstimate: number;
  message: string;
  status: "PENDING" | "ACCEPTED" | "WITHDRAWN";
  createdAt: string;
  post: {
    id: string;
    serviceType: string;
    description: string;
    status: string;
    carMake: string | null;
    carYear: number | null;
    photoUrls: string[];
  };
};

function statusTag(
  status: string,
  t: (k: "bidAccepted" | "bidWithdrawn" | "bidPending") => string,
): { bg: string; fg: string; label: string } {
  if (status === "ACCEPTED") {
    return { bg: "#dcfce7", fg: "#16a34a", label: t("bidAccepted") };
  }
  if (status === "WITHDRAWN") {
    return { bg: "#fef2f2", fg: "#dc2626", label: t("bidWithdrawn") };
  }
  return { bg: "#fef9c3", fg: "#ca8a04", label: t("bidPending") };
}

export default function ShopBidsScreen(): React.ReactElement {
  const { t, isRtl } = useI18n();
  const navigation = useNavigation();
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const [bids, setBids] = useState<BidRow[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const sortedBids = useMemo(() => {
    const out = [...bids];
    out.sort((a, b) => {
      const aT = new Date(a.createdAt).getTime();
      const bT = new Date(b.createdAt).getTime();
      return sortBy === "newest" ? bT - aT : aT - bT;
    });
    return out;
  }, [bids, sortBy]);

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

  const load = useCallback(async () => {
    try {
      const { bids: list } = await apiFetch<{ bids: BidRow[] }>(
        "/api/v1/bids/mine",
      );
      setBids(list);
    } catch {
      /* screen stays empty if API unreachable */
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

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

  // Memoized RefreshControl (defensive — known iOS Fabric issue with
  // recreating it on every render). facebook/react-native#37308.
  const refreshControl = useMemo(
    () => <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />,
    [refreshing, onRefresh],
  );

  const withdraw = (bidId: string): void => {
    Alert.alert(t("withdrawBid"), "", [
      { text: t("back"), style: "cancel" },
      {
        text: t("withdrawBid"),
        style: "destructive",
        onPress: () => {
          void (async () => {
            try {
              await apiFetch(`/api/v1/bids/${bidId}`, { method: "DELETE" });
              await load();
            } catch (e) {
              Alert.alert("Error", e instanceof Error ? e.message : "Failed");
            }
          })();
        },
      },
    ]);
  };

  return (
    <ShopPremiumGate>
      <FlatList
        data={sortedBids}
        keyExtractor={(b) => b.id}
        contentContainerStyle={styles.list}
        refreshControl={refreshControl}
        ListEmptyComponent={
          <Text style={styles.empty}>{t("noBidsYet")}</Text>
        }
        renderItem={({ item: b }) => {
          const tag = statusTag(b.status, t);
          const photo = b.post.photoUrls?.[0];
          return (
            <View style={styles.card}>
              <Pressable
                onPress={() =>
                  router.push({
                    pathname: `/shop/bid/${b.post.id}` as Href,
                    params: {
                      view: "1",
                      bidId: b.id,
                      initialPrice: String(b.priceEstimate),
                      initialMessage: b.message ?? "",
                    },
                  } as never)
                }
                style={({ pressed }) => [
                  styles.cardBody,
                  pressed && styles.cardBodyPressed,
                ]}
              >
                <View
                  style={[
                    styles.headerRow,
                    isRtl && styles.headerRowRtl,
                  ]}
                >
                  {photo ? (
                    <PostRemoteImage uri={photo.trim()} style={styles.thumb} />
                  ) : null}
                  <View style={styles.headerText}>
                    <View style={styles.row}>
                      <Text style={styles.type}>
                        {b.post.serviceType === "REPAIR"
                          ? t("repair")
                          : b.post.serviceType === "PARTS"
                            ? t("parts")
                            : t("towing")}
                      </Text>
                      <View style={[styles.badge, { backgroundColor: tag.bg }]}>
                        <Text style={[styles.badgeText, { color: tag.fg }]}>
                          {tag.label}
                        </Text>
                      </View>
                    </View>
                    {(b.post.carMake || b.post.carYear) ? (
                      <Text style={styles.carInfo}>
                        {[b.post.carMake, b.post.carYear].filter(Boolean).join(" · ")}
                      </Text>
                    ) : null}
                  </View>
                </View>
                <Text style={styles.desc} numberOfLines={2}>
                  {b.post.description}
                </Text>
                <Text style={styles.price}>{formatIqd(b.priceEstimate)}</Text>
                {b.message ? (
                  <Text style={styles.msg} numberOfLines={2}>
                    {b.message}
                  </Text>
                ) : null}
              </Pressable>
              <View style={styles.actions}>
                {b.status === "PENDING" ? (
                  <>
                    <Pressable
                      style={styles.actionBtn}
                      onPress={() =>
                        router.push({
                          pathname: `/shop/bid/${b.post.id}` as Href,
                          params: {
                            bidId: b.id,
                            initialPrice: String(b.priceEstimate),
                            initialMessage: b.message ?? "",
                          },
                        } as never)
                      }
                    >
                      <Text style={styles.actionText}>{t("editBid")}</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.actionBtn, styles.withdrawBtn]}
                      onPress={() => withdraw(b.id)}
                    >
                      <Text style={[styles.actionText, styles.withdrawText]}>
                        {t("withdrawBid")}
                      </Text>
                    </Pressable>
                  </>
                ) : null}
                {b.status === "ACCEPTED" ? (
                  <Pressable
                    style={styles.actionBtn}
                    onPress={() => {
                      void (async () => {
                        try {
                          const { threads } = await apiFetch<{
                            threads: { id: string; bidId: string }[];
                          }>("/api/v1/threads");
                          const thread = threads.find(
                            (th) => th.bidId === b.id,
                          );
                          if (thread) {
                            router.push(`/chat/${thread.id}` as Href);
                          }
                        } catch {
                          /* ignore */
                        }
                      })();
                    }}
                  >
                    <Text style={styles.actionText}>{t("openChat")}</Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
          );
        }}
      />

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
            {(["newest", "oldest"] as const).map((opt, i) => {
              const active = sortBy === opt;
              const label = opt === "newest" ? t("sortNewest") : t("sortOldest");
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
  // flexGrow: 1 makes pull-to-refresh work when the list is short / empty
  // (same fix as InboxThreadList / shop Requests).
  list: { padding: 16, paddingTop: 24, paddingBottom: 32, backgroundColor: theme.bg, flexGrow: 1 },
  empty: { color: theme.muted, marginTop: 24, textAlign: "center" },
  card: {
    backgroundColor: theme.surface,
    borderRadius: theme.radiusLg,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.border,
    overflow: "hidden",
  },
  cardBody: { padding: 14 },
  cardBodyPressed: { opacity: 0.7 },
  headerRow: { flexDirection: "row", gap: 12 },
  // Under RTL, RN auto-flips "row" to right-to-left visually. Use "row-reverse"
  // there to keep the photo on the left so it doesn't compete with Arabic text.
  headerRowRtl: { flexDirection: "row-reverse" },
  thumb: {
    width: 64,
    height: 64,
    borderRadius: theme.radiusMd,
    backgroundColor: theme.chip,
  },
  headerText: { flex: 1, justifyContent: "center" },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  type: { fontWeight: "700", color: theme.text },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  badgeText: { fontSize: 12, fontWeight: "700" },
  carInfo: { marginTop: 4, fontSize: 13, color: theme.mutedLight, fontWeight: "600" },
  desc: { marginTop: 8, color: theme.muted, fontSize: 14, textAlign: "left" },
  price: { marginTop: 8, fontWeight: "700", color: theme.text, fontSize: 16, textAlign: "left" },
  msg: { marginTop: 4, color: theme.muted, fontSize: 13, textAlign: "left" },
  actions: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 14,
    paddingBottom: 14,
    paddingTop: 4,
  },
  actionBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: theme.radiusMd,
    backgroundColor: theme.primaryMid,
  },
  actionText: { color: "#fff", fontWeight: "600", fontSize: 13 },
  withdrawBtn: { backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.danger },
  withdrawText: { color: theme.danger },

  // Header-right sort button + bottom-sheet menu (matches the feed tab UX).
  headerSortBtn: { paddingHorizontal: 12, paddingVertical: 6 },
  headerSortText: { color: "#fff", fontWeight: "700", fontSize: 14 },
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
    minHeight: 240,
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
  sortHeaderTitle: { fontSize: 17, fontWeight: "700", color: theme.text },
  sortHeaderClose: { fontSize: 20, color: theme.muted, paddingHorizontal: 4 },
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
  sortOptionText: { fontSize: 16, color: theme.text, textAlign: "left" },
  sortOptionTextActive: { color: theme.primary, fontWeight: "700" },
  sortBottomSafe: { height: 36 },
});
