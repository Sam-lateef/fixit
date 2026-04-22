import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { io, type Socket } from "socket.io-client";

import { apiFetch } from "@/lib/api";
import { getApiBaseUrl } from "@/lib/api-base";
import { getToken } from "@/lib/auth-storage";
import { useI18n } from "@/lib/i18n";
import { theme } from "@/lib/theme";

type Message = {
  id: string;
  senderId: string;
  content: string;
  createdAt: string;
};

type ThreadMeta = {
  counterpartyName: string | null;
  postContext: string | null;
  bidAccepted: boolean;
};

type ThreadFromApi = {
  id: string;
  bid: {
    status: string;
    post: {
      serviceType: string;
      repairCategory: string | null;
      partsCategory: string | null;
      carMake: string | null;
      description: string;
      user: { id: string; name: string | null };
    };
    shop: {
      name: string;
      user: { id: string; name: string | null };
    };
  };
};

function buildPostContext(bid: ThreadFromApi["bid"]): string {
  const parts: string[] = [];
  const type =
    bid.post.serviceType.charAt(0).toUpperCase() +
    bid.post.serviceType.slice(1).toLowerCase();
  parts.push(type);
  const cat = bid.post.repairCategory ?? bid.post.partsCategory;
  if (cat) parts.push(cat);
  if (bid.post.carMake) parts.push(bid.post.carMake);
  return parts.join(" · ");
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  const h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, "0");
  const ampm = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${m} ${ampm}`;
}

export default function ChatThreadScreen(): React.ReactElement {
  const { t } = useI18n();
  const { threadId } = useLocalSearchParams<{ threadId: string }>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [me, setMe] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [meta, setMeta] = useState<ThreadMeta | null>(null);
  const listRef = useRef<FlatList<Message>>(null);
  const socketRef = useRef<Socket | null>(null);

  const load = useCallback(async () => {
    if (!threadId) return;
    try {
      const { user } = await apiFetch<{ user: { id: string } }>("/api/v1/users/me");
      setMe(user.id);

      const [messagesRes, threadsRes] = await Promise.all([
        apiFetch<{ messages: Message[] }>(`/api/v1/threads/${threadId}/messages`),
        apiFetch<{ threads: ThreadFromApi[] }>("/api/v1/threads"),
      ]);

      setMessages(messagesRes.messages);

      const thread = threadsRes.threads.find((th) => th.id === threadId);
      if (thread) {
        // If current user is the post owner, the counterparty is the shop.
        // If the current user is the shop owner, the counterparty is the post owner.
        const isPostOwner = thread.bid.post.user.id === user.id;
        const counterpartyName = isPostOwner
          ? thread.bid.shop.name
          : (thread.bid.post.user.name ?? thread.bid.shop.name);
        setMeta({
          counterpartyName,
          postContext: buildPostContext(thread.bid),
          bidAccepted: thread.bid.status === "ACCEPTED",
        });
      }
    } catch {
      /* stay empty when API is unreachable */
    }
  }, [threadId]);

  // Connect Socket.IO on mount
  useEffect(() => {
    if (!threadId) return;
    let socket: Socket;

    void (async () => {
      const token = await getToken();
      if (!token) return;

      socket = io(getApiBaseUrl(), {
        auth: { token },
        transports: ["websocket"],
        reconnectionAttempts: 5,
      });

      socketRef.current = socket;

      socket.on("connect", () => {
        socket.emit("join-thread", threadId);
        socket.emit("mark-read", { threadId });
      });

      socket.on("new-message", (msg: Message) => {
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      });
    })();

    return () => {
      socket?.disconnect();
      socketRef.current = null;
    };
  }, [threadId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!threadId) {
    router.back();
    return <View style={styles.screen} />;
  }

  const send = (): void => {
    const text = draft.trim();
    if (!text || busy) return;
    setBusy(true);

    const socket = socketRef.current;
    if (socket?.connected) {
      // Send via Socket.IO for instant delivery
      socket.emit(
        "send-message",
        { threadId, content: text },
        (ack: { ok?: boolean; message?: Message; error?: string }) => {
          setBusy(false);
          if (ack?.ok && ack.message) {
            setMessages((prev) =>
              prev.some((m) => m.id === ack.message!.id)
                ? prev
                : [...prev, ack.message!],
            );
          }
        },
      );
      setDraft("");
    } else {
      // Fallback to REST if socket not connected
      void (async () => {
        try {
          await apiFetch(`/api/v1/threads/${threadId}/messages`, {
            method: "POST",
            body: JSON.stringify({ content: text }),
          });
          setDraft("");
          await load();
        } catch {
          /* silent */
        } finally {
          setBusy(false);
        }
      })();
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 88 : 0}
    >
      {/* Enhanced header */}
      <View style={styles.headerBar}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerName} numberOfLines={1}>
            {meta?.counterpartyName ?? t("chattingWith")}
          </Text>
          {meta?.postContext ? (
            <Text style={styles.headerContext} numberOfLines={1}>
              {meta.postContext}
            </Text>
          ) : null}
        </View>
        {meta?.bidAccepted ? (
          <View style={styles.acceptedBadge}>
            <Text style={styles.acceptedText}>{t("bidAccepted")}</Text>
          </View>
        ) : (
          <View style={styles.headerSpacer} />
        )}
      </View>

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        contentContainerStyle={styles.msgList}
        onContentSizeChange={() =>
          listRef.current?.scrollToEnd({ animated: true })
        }
        ListHeaderComponent={
          meta?.bidAccepted ? (
            <View style={styles.systemMsg}>
              <Text style={styles.systemMsgText}>
                ✓ {t("bidAcceptedSystem")}
              </Text>
            </View>
          ) : null
        }
        renderItem={({ item: m }) => {
          const mine = me !== null && m.senderId === me;
          return (
            <View
              style={[
                styles.bubbleWrap,
                mine ? styles.bubbleWrapMine : styles.bubbleWrapThem,
              ]}
            >
              <View style={[styles.bubble, mine && styles.bubbleMine]}>
                <Text style={[styles.bubbleText, mine && styles.bubbleTextMine]}>
                  {m.content}
                </Text>
              </View>
              <Text style={[styles.timestamp, mine && styles.timestampMine]}>
                {formatTime(m.createdAt)}
              </Text>
            </View>
          );
        }}
      />

      <View style={styles.composer}>
        <TextInput
          style={styles.input}
          value={draft}
          onChangeText={setDraft}
          placeholder={t("typeMessage")}
          placeholderTextColor={theme.mutedLight}
          multiline
          onSubmitEditing={send}
          blurOnSubmit={false}
        />
        <Pressable
          style={[styles.sendBtn, busy && styles.sendDisabled]}
          disabled={busy}
          onPress={send}
        >
          <Text style={styles.sendText}>{t("sendMessage")}</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: theme.bg },
  screen: { flex: 1, backgroundColor: theme.bg },

  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    backgroundColor: theme.surface,
    gap: 8,
  },
  backBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  backText: { fontSize: 22, color: theme.primaryMid, fontWeight: "700", marginTop: -2 },
  headerCenter: { flex: 1 },
  headerName: { fontWeight: "700", color: theme.text, fontSize: 16 },
  headerContext: { fontSize: 12, color: theme.mutedLight, marginTop: 2 },
  headerSpacer: { width: 48 },
  acceptedBadge: {
    backgroundColor: theme.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  acceptedText: { fontSize: 12, fontWeight: "700", color: theme.primary },

  msgList: { padding: 12, paddingBottom: 8 },
  bubbleWrap: { marginBottom: 8, maxWidth: "88%" },
  bubbleWrapMine: { alignSelf: "flex-end" },
  bubbleWrapThem: { alignSelf: "flex-start" },
  bubble: {
    backgroundColor: theme.surface,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.border,
  },
  bubbleMine: { backgroundColor: theme.primaryMid, borderColor: theme.primaryMid },
  bubbleText: { color: theme.text, fontSize: 15 },
  bubbleTextMine: { color: "#fff" },
  timestamp: { fontSize: 11, color: theme.mutedLight, marginTop: 3, alignSelf: "flex-start" },
  timestampMine: { alignSelf: "flex-end" },

  systemMsg: {
    alignSelf: "center",
    backgroundColor: theme.primaryLight,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 16,
  },
  systemMsgText: { fontSize: 12, color: theme.primary, fontWeight: "600" },

  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: 10,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: theme.border,
    backgroundColor: theme.surface,
  },
  input: {
    flex: 1,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: theme.radiusMd,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: theme.text,
  },
  sendBtn: {
    backgroundColor: theme.primaryMid,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: theme.radiusMd,
  },
  sendDisabled: { opacity: 0.5 },
  sendText: { color: "#fff", fontWeight: "700" },
});
