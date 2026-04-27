import { useNavigation } from "@react-navigation/native";
import { router, type Href } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { apiFetch } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import {
  partsCategoryLabel,
  repairCategoryLabel,
} from "@/lib/taxonomy-labels";
import { theme } from "@/lib/theme";

export type InboxThreadListProps = {
  /** Extra top padding when the tab bar uses a transparent header (e.g. owner). */
  contentTopInset?: number;
};

type ThreadRow = {
  id: string;
  updatedAt: string;
  bid: {
    post: {
      description: string;
      userId: string;
      serviceType: string;
      repairCategory: string | null;
      partsCategory: string | null;
      carMake: string | null;
      carModel: string | null;
      carYear: number | null;
    };
    shop: { name: string; userId: string };
  };
  lastMessage: { content: string; createdAt: string; senderId: string } | null;
  unreadCount?: number;
};

function formatThreadTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffH = diffMs / 3_600_000;
  if (diffH < 1) return `${Math.max(1, Math.round(diffMs / 60_000))}m`;
  if (diffH < 24) return `${Math.round(diffH)}h`;
  if (diffH < 48) return "Yesterday";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function InboxThreadList(props: InboxThreadListProps): React.ReactElement {
  const contentTopInset = props.contentTopInset ?? 0;
  const { t, locale } = useI18n();
  const navigation = useNavigation();
  const [threads, setThreads] = useState<ThreadRow[]>([]);
  const [myUserId, setMyUserId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [threadsRes, meRes] = await Promise.all([
        apiFetch<{ threads: ThreadRow[] }>("/api/v1/threads"),
        apiFetch<{ user: { id: string } }>("/api/v1/users/me"),
      ]);
      setThreads(threadsRes.threads);
      setMyUserId(meRes.user.id);
    } catch {
      /* stay empty */
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Refresh when the tab regains focus so unread badges clear after the user
  // returns from a thread. Uses navigation.addListener instead of
  // useFocusEffect — the latter has known iOS Fabric issues with FlatList +
  // RefreshControl (facebook/react-native#37308).
  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      void load();
    });
    return unsubscribe;
  }, [navigation, load]);

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

  return (
    <FlatList
      data={threads}
      keyExtractor={(item) => item.id}
      contentContainerStyle={[styles.list, { paddingTop: 20 + contentTopInset }]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
      ListEmptyComponent={
        <Text style={styles.empty}>{t("noThreads")}</Text>
      }
      renderItem={({ item }) => {
        const isOwner =
          myUserId !== null && item.bid.post.userId === myUserId;
        const title = isOwner
          ? item.bid.shop.name
          : item.bid.post.description;
        const preview =
          item.lastMessage?.content ??
          (isOwner ? item.bid.post.description : item.bid.shop.name);
        const timeStr = item.lastMessage?.createdAt
          ? formatThreadTime(item.lastMessage.createdAt)
          : item.updatedAt
            ? formatThreadTime(item.updatedAt)
            : "";
        const hasUnread = (item.unreadCount ?? 0) > 0;

        const categoryLabel = (() => {
          const svc = item.bid.post.serviceType.toUpperCase();
          if (svc === "REPAIR" && item.bid.post.repairCategory) {
            return repairCategoryLabel(item.bid.post.repairCategory, locale);
          }
          if (svc === "PARTS" && item.bid.post.partsCategory) {
            return partsCategoryLabel(item.bid.post.partsCategory, locale);
          }
          if (svc === "TOWING") return t("towing");
          return null;
        })();
        const carLabel = [
          item.bid.post.carMake,
          item.bid.post.carModel,
          item.bid.post.carYear,
        ]
          .filter(Boolean)
          .join(" ")
          .trim();
        const subtitleParts = [categoryLabel, carLabel || null].filter(Boolean);
        const subtitle = subtitleParts.length > 0 ? subtitleParts.join(" · ") : null;
        return (
          <Pressable
            style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
            onPress={() => {
              // Optimistically clear the unread badge so the user sees an
              // immediate response. The server-side mark-read happens via
              // socket on the chat screen, and the next focus refresh will
              // confirm the count from the server.
              if ((item.unreadCount ?? 0) > 0) {
                setThreads((prev) =>
                  prev.map((th) =>
                    th.id === item.id ? { ...th, unreadCount: 0 } : th,
                  ),
                );
              }
              router.push(`/chat/${item.id}` as Href);
            }}
          >
            <View style={styles.content}>
              <View style={styles.topRow}>
                <Text style={[styles.title, hasUnread && styles.titleUnread]} numberOfLines={1}>
                  {title}
                </Text>
                <Text style={styles.time}>{timeStr}</Text>
              </View>
              {subtitle ? (
                <Text style={styles.subtitle} numberOfLines={1}>
                  {subtitle}
                </Text>
              ) : null}
              <View style={styles.bottomRow}>
                <Text style={[styles.preview, hasUnread && styles.previewUnread]} numberOfLines={1}>
                  {preview}
                </Text>
                {hasUnread ? (
                  <View style={styles.unreadBadge}>
                    <Text style={styles.unreadText}>{item.unreadCount}</Text>
                  </View>
                ) : null}
              </View>
            </View>
          </Pressable>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    paddingHorizontal: 16,
    paddingBottom: 32,
    flexGrow: 1,
    backgroundColor: theme.bg,
  },
  empty: { color: theme.muted, marginTop: 24, textAlign: "center" },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.surface,
    borderRadius: theme.radiusLg,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: theme.border,
    gap: 12,
  },
  cardPressed: { opacity: 0.85 },
  content: { flex: 1 },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { fontWeight: "600", color: theme.text, fontSize: 15, flex: 1, marginRight: 8, textAlign: "left" },
  titleUnread: { fontWeight: "700" },
  time: { fontSize: 12, color: theme.mutedLight, flexShrink: 0, textAlign: "left" },
  subtitle: {
    fontSize: 13,
    color: theme.primary,
    fontWeight: "600",
    marginTop: 2,
    textAlign: "left",
  },
  bottomRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 3 },
  preview: { fontSize: 14, color: theme.muted, flex: 1, marginRight: 8, textAlign: "left" },
  previewUnread: { color: theme.text },
  unreadBadge: {
    backgroundColor: theme.primaryMid,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  unreadText: { color: "#fff", fontSize: 11, fontWeight: "700" },
});
