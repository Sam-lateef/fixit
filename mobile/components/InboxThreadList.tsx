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
import { theme } from "@/lib/theme";

export type InboxThreadListProps = {
  /** Extra top padding when the tab bar uses a transparent header (e.g. owner). */
  contentTopInset?: number;
};

type ThreadRow = {
  id: string;
  updatedAt: string;
  bid: {
    post: { description: string; userId: string };
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
  const { t } = useI18n();
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
      contentContainerStyle={[styles.list, { paddingTop: 12 + contentTopInset }]}
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
        return (
          <Pressable
            style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
            onPress={() => router.push(`/chat/${item.id}` as Href)}
          >
            {/* Avatar circle */}
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {(isOwner ? item.bid.shop.name : item.bid.post.description)
                  .trim()
                  .charAt(0)
                  .toUpperCase()}
              </Text>
            </View>

            <View style={styles.content}>
              <View style={styles.topRow}>
                <Text style={[styles.title, hasUnread && styles.titleUnread]} numberOfLines={1}>
                  {title}
                </Text>
                <Text style={styles.time}>{timeStr}</Text>
              </View>
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
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  avatarText: { fontSize: 18, fontWeight: "700", color: theme.primary },
  content: { flex: 1 },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { fontWeight: "600", color: theme.text, fontSize: 15, flex: 1, marginRight: 8, textAlign: "left" },
  titleUnread: { fontWeight: "700" },
  time: { fontSize: 12, color: theme.mutedLight, flexShrink: 0, textAlign: "left" },
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
