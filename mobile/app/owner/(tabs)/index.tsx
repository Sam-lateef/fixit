import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useHeaderHeight } from "@react-navigation/elements";
import { useFocusEffect } from "@react-navigation/native";
import { router, type Href } from "expo-router";
import { useCallback, useState } from "react";
import {
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { PostImageLightbox } from "@/components/PostImageLightbox";
import { apiFetch, formatIqd } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { theme } from "@/lib/theme";

type Shop = { id: string; name: string; rating: number; coverImageUrl?: string | null };
type Bid = {
  id: string;
  priceEstimate: number;
  message: string;
  status: string;
  shop: Shop;
  chatThread?: { id: string };
};
type Post = {
  id: string;
  serviceType: string;
  category?: string;
  title: string | null;
  description: string;
  status: string;
  expiresAt: string;
  repairCategory: string | null;
  partsCategory: string | null;
  carMake: string | null;
  carYear: number | null;
  carModel: string | null;
  photoUrls: string[];
  bids: Bid[];
};

function tagColor(type: string): { bg: string; fg: string } {
  if (type === "REPAIR") return { bg: theme.repairBg, fg: theme.repairText };
  if (type === "PARTS") return { bg: theme.partsBg, fg: theme.partsText };
  return { bg: theme.towingBg, fg: theme.towingText };
}

function tagLabel(
  type: string,
  t: (k: "repair" | "parts" | "towing") => string,
): string {
  if (type === "REPAIR") return t("repair");
  if (type === "PARTS") return t("parts");
  return t("towing");
}

function categoryLabel(post: Post): string | null {
  if (post.serviceType === "REPAIR" && post.repairCategory) {
    return post.repairCategory;
  }
  if (post.serviceType === "PARTS" && post.partsCategory) {
    return post.partsCategory;
  }
  return null;
}

/** Implementation guide §16 — My Posts card: car make, model, year. */
function carDetailLine(post: Post): string | null {
  if (post.serviceType === "TOWING") return null;
  const parts: string[] = [];
  if (post.carMake?.trim()) parts.push(post.carMake.trim());
  if (post.carModel?.trim()) parts.push(post.carModel.trim());
  if (post.carYear != null) parts.push(String(post.carYear));
  if (parts.length === 0) return null;
  return parts.join(" · ");
}

export default function OwnerHomeScreen(): React.ReactElement {
  const headerHeight = useHeaderHeight();
  const { t } = useI18n();
  const [posts, setPosts] = useState<Post[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState("");

  const load = useCallback(async () => {
    setLoadError("");
    try {
      const { posts: list } = await apiFetch<{ posts: Post[] }>(
        "/api/v1/posts/mine",
      );
      setPosts(list.filter((p) => p.status !== "DELETED"));
    } catch (e) {
      setPosts([]);
      setLoadError(e instanceof Error ? e.message : "Failed to load");
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

  const deletePost = (id: string): void => {
    Alert.alert(t("deletePost"), "", [
      { text: t("cancel"), style: "cancel" },
      {
        text: t("delete"),
        style: "destructive",
        onPress: () => {
          void (async () => {
            try {
              await apiFetch(`/api/v1/posts/${id}`, { method: "DELETE" });
              await load();
            } catch (e) {
              Alert.alert(
                "Error",
                e instanceof Error ? e.message : "Failed",
              );
            }
          })();
        },
      },
    ]);
  };

  const acceptBid = (bidId: string): void => {
    void (async () => {
      try {
        const res = await apiFetch<{ chatThread: { id: string } }>(
          `/api/v1/bids/${bidId}/accept`,
          { method: "POST" },
        );
        await load();
        router.push(`/chat/${res.chatThread.id}` as Href);
      } catch (e) {
        Alert.alert("Error", e instanceof Error ? e.message : "Failed");
      }
    })();
  };

  return (
    <FlatList
      data={posts}
      keyExtractor={(item) => item.id}
      contentContainerStyle={[
        styles.list,
        { paddingTop: 8 + headerHeight },
      ]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
      ListHeaderComponent={null}
      ListEmptyComponent={
        loadError ? (
          <Text style={styles.emptyError}>{loadError}</Text>
        ) : (
          <Text style={styles.empty}>{t("noPosts")}</Text>
        )
      }
      ListFooterComponent={
        posts.length > 0 ? (
          <Text style={styles.hint}>{t("newPostHint")}</Text>
        ) : null
      }
      renderItem={({ item: p }) => {
        const tag = tagColor(p.serviceType);
        const label = tagLabel(p.serviceType, t);
        const cat = categoryLabel(p);
        const exp = new Date(p.expiresAt).getTime();
        const hrs = Math.max(0, Math.round((exp - Date.now()) / 3600000));
        const hasBids = p.bids.length > 0;
        const carLine = carDetailLine(p);
        const canEdit = p.status === "ACTIVE" && !hasBids;
        const openPost = (): void => {
          const href = canEdit
            ? `/owner/post/${p.id}`
            : `/owner/post/${p.id}?view=1`;
          router.push(href as Href);
        };

        return (
          <View style={styles.card}>
            {/* Top row: tag + category | time + delete — tappable to open the request */}
            <Pressable
              onPress={openPost}
              style={({ pressed }) => [
                styles.row,
                pressed ? styles.cardBodyPressed : null,
              ]}
            >
              <View style={styles.tagRow}>
                <View style={[styles.tag, { backgroundColor: tag.bg }]}>
                  <Text style={[styles.tagText, { color: tag.fg }]}>
                    {cat ? `${label} · ${cat}` : label}
                  </Text>
                </View>
              </View>
              <View style={styles.metaRow}>
                <View style={styles.timeRow}>
                  <View style={styles.greenDot} />
                  <Text style={styles.muted}>
                    {hrs}
                    {t("hrsLeft")}
                  </Text>
                </View>
                {hasBids ? (
                  <Text style={styles.bidCount}>
                    {p.bids.length} {t("bidsCount")}
                  </Text>
                ) : null}
                <Pressable
                  hitSlop={8}
                  onPress={() => deletePost(p.id)}
                  style={styles.deleteBtn}
                >
                  <FontAwesome name="times" size={16} color={theme.danger} />
                </Pressable>
              </View>
            </Pressable>

            <View style={styles.cardBody}>
              {p.photoUrls?.length > 0 ? (
                <View style={styles.cardBodyRow}>
                  {/* Thumbnail: right in English, left in Arabic (RTL mirrors row-reverse) */}
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
                  {/* Text content on the right */}
                  <Pressable
                    onPress={openPost}
                    style={({ pressed }) => [
                      styles.textFlex,
                      pressed ? styles.cardBodyPressed : null,
                    ]}
                  >
                    {carLine ? <Text style={styles.carLine}>{carLine}</Text> : null}
                    {p.title ? <Text style={styles.postTitle}>{p.title}</Text> : null}
                    <Text style={styles.desc}>{p.description}</Text>
                    {!hasBids && p.status === "ACTIVE" ? (
                      <Text style={styles.waiting}>{t("waitingForBids")}</Text>
                    ) : null}
                  </Pressable>
                </View>
              ) : (
                <Pressable
                  onPress={openPost}
                  style={({ pressed }) => [
                    pressed ? styles.cardBodyPressed : null,
                  ]}
                >
                  {carLine ? <Text style={styles.carLine}>{carLine}</Text> : null}
                  {p.title ? <Text style={styles.postTitle}>{p.title}</Text> : null}
                  <Text style={styles.desc}>{p.description}</Text>
                  {!hasBids && p.status === "ACTIVE" ? (
                    <Text style={styles.waiting}>{t("waitingForBids")}</Text>
                  ) : null}
                </Pressable>
              )}
            </View>

            {p.bids.map((b, i) => {
              const best = i === 0 && hasBids;
              return (
                <View
                  key={b.id}
                  style={[styles.bid, best ? styles.bidBest : styles.bidOther]}
                >
                  <Pressable
                    onPress={() =>
                      router.push(`/owner/shop/${b.shop.id}` as Href)
                    }
                    style={({ pressed }) => [
                      styles.bidTapArea,
                      pressed && styles.bidTapAreaPressed,
                    ]}
                  >
                    <Text style={styles.shopName}>{b.shop.name}</Text>
                    <Text style={styles.price}>{formatIqd(b.priceEstimate)}</Text>
                    {b.message ? (
                      <Text style={styles.msg}>{b.message}</Text>
                    ) : null}
                  </Pressable>
                  {b.status === "PENDING" && p.status === "ACTIVE" ? (
                    <View style={styles.btnRow}>
                      <Pressable
                        style={styles.acceptBtn}
                        onPress={() => acceptBid(b.id)}
                      >
                        <Text style={styles.btnTextWhite}>{t("accept")}</Text>
                      </Pressable>
                    </View>
                  ) : null}
                  {b.status === "ACCEPTED" && b.chatThread ? (
                    <View style={styles.btnRow}>
                      <Pressable
                        style={styles.messageBtn}
                        onPress={() =>
                          router.push(`/chat/${b.chatThread!.id}` as Href)
                        }
                      >
                        <Text style={styles.btnTextGreen}>{t("openChat")}</Text>
                      </Pressable>
                    </View>
                  ) : null}
                </View>
              );
            })}
          </View>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    paddingHorizontal: 16,
    paddingBottom: 32,
    backgroundColor: theme.bg,
  },
  empty: {
    color: theme.muted,
    marginTop: 24,
    textAlign: "center",
    fontSize: 15,
  },
  emptyError: {
    color: theme.danger,
    marginTop: 24,
    textAlign: "center",
    fontSize: 15,
  },
  hint: {
    color: theme.mutedLight,
    textAlign: "center",
    marginTop: 16,
    fontSize: 13,
  },
  card: {
    backgroundColor: theme.surface,
    borderRadius: theme.radiusLg,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.border,
  },
  cardBody: {
    marginTop: 4,
  },
  cardBodyPressed: {
    opacity: 0.92,
  },
  cardBodyRow: {
    flexDirection: "row-reverse",
    alignItems: "flex-start",
    gap: 10,
  },
  thumbWrap: {
    position: "relative",
  },
  thumb: {
    width: 76,
    height: 76,
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
  carLine: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.text,
    marginBottom: 6,
    textAlign: "left",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  tagRow: { flexDirection: "row", alignItems: "center", flexShrink: 1 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  tag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  tagText: { fontSize: 12, fontWeight: "700" },
  timeRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  greenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.primaryMid,
  },
  muted: { color: theme.muted, fontSize: 13, textAlign: "left" },
  bidCount: { color: theme.mutedLight, fontSize: 12, textAlign: "left" },
  deleteBtn: { padding: 4 },
  postTitle: { marginTop: 8, color: theme.text, fontSize: 15, fontWeight: "700", textAlign: "left" },
  desc: { marginTop: 4, color: theme.muted, fontSize: 14, textAlign: "left" },
  waiting: {
    marginTop: 12,
    color: theme.mutedLight,
    fontSize: 14,
    fontStyle: "italic",
    textAlign: "left",
  },
  bid: {
    marginTop: 10,
    padding: 12,
    borderRadius: theme.radiusMd,
    borderWidth: 1,
  },
  bidBest: {
    backgroundColor: "#D8F3DC",
    borderColor: theme.primaryMid,
  },
  bidOther: {
    backgroundColor: "#eee",
    borderColor: "#ddd",
  },
  bestPill: {
    alignSelf: "flex-end",
    backgroundColor: theme.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 6,
  },
  bestPillText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },
  bidTapArea: {
    borderRadius: theme.radiusMd - 2,
  },
  bidTapAreaPressed: { opacity: 0.88 },
  shopName: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.text,
    marginBottom: 2,
    textAlign: "left",
  },
  price: { fontWeight: "700", color: theme.text, fontSize: 15, textAlign: "left" },
  msg: { marginTop: 4, color: theme.muted, fontSize: 14, textAlign: "left" },
  btnRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
  },
  acceptBtn: {
    flex: 1,
    backgroundColor: theme.primaryMid,
    paddingVertical: 8,
    borderRadius: theme.radiusMd,
    alignItems: "center",
  },
  messageBtn: {
    flex: 1,
    backgroundColor: theme.surface,
    paddingVertical: 8,
    borderRadius: theme.radiusMd,
    alignItems: "center",
    borderWidth: 1,
    borderColor: theme.primaryMid,
  },
  btnTextWhite: { color: "#fff", fontWeight: "700", fontSize: 14 },
  btnTextGreen: { color: theme.primaryMid, fontWeight: "700", fontSize: 14 },
});
