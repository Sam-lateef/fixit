import { router, type Href } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { ShopPremiumGate } from "@/components/ShopPremiumGate";
import { apiFetch, formatIqd } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { theme } from "@/lib/theme";

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
  const { t } = useI18n();
  const [bids, setBids] = useState<BidRow[]>([]);
  const [refreshing, setRefreshing] = useState(false);

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
        data={bids}
        keyExtractor={(b) => b.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <Text style={styles.empty}>{t("noBidsYet")}</Text>
        }
        renderItem={({ item: b }) => {
          const tag = statusTag(b.status, t);
          return (
            <View style={styles.card}>
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
              <Text style={styles.desc} numberOfLines={2}>
                {b.post.description}
              </Text>
              <Text style={styles.price}>{formatIqd(b.priceEstimate)}</Text>
              {b.message ? (
                <Text style={styles.msg} numberOfLines={2}>
                  {b.message}
                </Text>
              ) : null}
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
    </ShopPremiumGate>
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, paddingBottom: 32, backgroundColor: theme.bg },
  empty: { color: theme.muted, marginTop: 24, textAlign: "center" },
  card: {
    backgroundColor: theme.surface,
    borderRadius: theme.radiusLg,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.border,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  type: { fontWeight: "700", color: theme.text },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  badgeText: { fontSize: 12, fontWeight: "700" },
  carInfo: { marginTop: 4, fontSize: 13, color: theme.mutedLight, fontWeight: "600" },
  desc: { marginTop: 8, color: theme.muted, fontSize: 14 },
  price: { marginTop: 8, fontWeight: "700", color: theme.text, fontSize: 16 },
  msg: { marginTop: 4, color: theme.muted, fontSize: 13 },
  actions: { flexDirection: "row", gap: 8, marginTop: 10 },
  actionBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: theme.radiusMd,
    backgroundColor: theme.primaryMid,
  },
  actionText: { color: "#fff", fontWeight: "600", fontSize: 13 },
  withdrawBtn: { backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.danger },
  withdrawText: { color: theme.danger },
});
