import { router, useLocalSearchParams } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { io, type Socket } from "socket.io-client";

import { BrandHeaderGradient } from "@/components/BrandHeaderGradient";
import { apiFetch } from "@/lib/api";
import { getApiBaseUrl } from "@/lib/api-base";
import { getToken } from "@/lib/auth-storage";
import { useI18n } from "@/lib/i18n";
import { confirmAndSubmitReport } from "@/lib/report-content";
import type { LocaleId, StringKey } from "@/lib/strings";
import { openGoogleMapsAt } from "@/lib/open-google-maps";
import { theme } from "@/lib/theme";
import { partsCategoryLabel, repairCategoryLabel } from "@/lib/taxonomy-labels";

type Message = {
  id: string;
  senderId: string;
  content: string;
  createdAt: string;
};

type ThreadMeta = {
  counterpartyName: string | null;
  bidAccepted: boolean;
  isCompleted: boolean;
};

type JobReview = {
  reviewerUserId: string;
  revieweeUserId: string;
  stars: number;
  comment: string | null;
};

type ThreadPost = {
  serviceType: string;
  repairCategory: string | null;
  partsCategory: string | null;
  carMake: string | null;
  description: string;
  lat: number | null;
  lng: number | null;
  towingFromLat: number | null;
  towingFromLng: number | null;
  towingFromAddress: string | null;
  user: { id: string; name: string | null };
};

type ThreadDetail = {
  id: string;
  completedAt: string | null;
  bid: {
    status: string;
    post: ThreadPost;
    shop: {
      name: string;
      user: { id: string; name: string | null };
    };
  };
  reviews: JobReview[];
};

function towingPickupLatLng(post: ThreadPost): { lat: number; lng: number } | null {
  const tLat = post.towingFromLat;
  const tLng = post.towingFromLng;
  if (
    typeof tLat === "number" &&
    typeof tLng === "number" &&
    Number.isFinite(tLat) &&
    Number.isFinite(tLng)
  ) {
    return { lat: tLat, lng: tLng };
  }
  if (post.serviceType.toUpperCase() !== "TOWING") {
    return null;
  }
  const lat = post.lat;
  const lng = post.lng;
  if (
    typeof lat === "number" &&
    typeof lng === "number" &&
    Number.isFinite(lat) &&
    Number.isFinite(lng)
  ) {
    return { lat, lng };
  }
  return null;
}

function buildPostContext(
  bid: { post: ThreadPost },
  locale: LocaleId,
  t: (key: StringKey) => string,
): string {
  const parts: string[] = [];
  const svc = bid.post.serviceType.toUpperCase();
  if (svc === "REPAIR") {
    parts.push(t("repair"));
  } else if (svc === "PARTS") {
    parts.push(t("parts"));
  } else if (svc === "TOWING") {
    parts.push(t("towing"));
  } else {
    parts.push(bid.post.serviceType);
  }
  const cat =
    svc === "REPAIR" && bid.post.repairCategory
      ? repairCategoryLabel(bid.post.repairCategory, locale)
      : svc === "PARTS" && bid.post.partsCategory
        ? partsCategoryLabel(bid.post.partsCategory, locale)
        : null;
  if (cat) {
    parts.push(cat);
  }
  if (bid.post.carMake) {
    parts.push(bid.post.carMake);
  }
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
  const { t, locale } = useI18n();
  const insets = useSafeAreaInsets();
  const { threadId } = useLocalSearchParams<{ threadId: string }>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [me, setMe] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [meta, setMeta] = useState<ThreadMeta | null>(null);
  const [thread, setThread] = useState<ThreadDetail | null>(null);
  const [counterpartyId, setCounterpartyId] = useState<string | null>(null);
  const [ratingStars, setRatingStars] = useState(5);
  const [ratingComment, setRatingComment] = useState("");
  const listRef = useRef<FlatList<Message>>(null);
  const socketRef = useRef<Socket | null>(null);

  const postContextLine = useMemo(() => {
    if (!thread) {
      return null;
    }
    return buildPostContext(thread.bid, locale, t);
  }, [thread, locale, t]);

  const towingPickupCoords = useMemo(() => {
    if (!thread || !me) {
      return null;
    }
    if (thread.bid.status !== "ACCEPTED") {
      return null;
    }
    if (thread.bid.shop.user.id !== me) {
      return null;
    }
    if (thread.bid.post.serviceType.toUpperCase() !== "TOWING") {
      return null;
    }
    return towingPickupLatLng(thread.bid.post);
  }, [thread, me]);

  const load = useCallback(async () => {
    if (!threadId) return;
    setLoadError("");
    try {
      const { user } = await apiFetch<{ user: { id: string } }>("/api/v1/users/me");
      setMe(user.id);

      const messagesRes = await apiFetch<{ messages: Message[]; thread: ThreadDetail }>(
        `/api/v1/threads/${threadId}/messages`,
      );

      setMessages(messagesRes.messages);
      setThread(messagesRes.thread);
      if (messagesRes.thread) {
        // If current user is the post owner, the counterparty is the shop.
        // If the current user is the shop owner, the counterparty is the post owner.
        const isPostOwner = messagesRes.thread.bid.post.user.id === user.id;
        const counterpartyName = isPostOwner
          ? messagesRes.thread.bid.shop.name
          : (messagesRes.thread.bid.post.user.name ?? messagesRes.thread.bid.shop.name);
        const nextCounterpartyId = isPostOwner
          ? messagesRes.thread.bid.shop.user.id
          : messagesRes.thread.bid.post.user.id;
        setMeta({
          counterpartyName,
          bidAccepted: messagesRes.thread.bid.status === "ACCEPTED",
          isCompleted: messagesRes.thread.completedAt !== null,
        });
        setCounterpartyId(nextCounterpartyId);
      }
    } catch {
      setLoadError(t("chatLoadFailed"));
    }
  }, [threadId, t]);

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
        if (msg.senderId !== me && meta?.isCompleted !== true) {
          socket.emit("mark-read", { threadId });
        }
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
  }, [threadId, me, meta?.isCompleted]);

  useFocusEffect(
    useCallback(() => {
      void load();
      const socket = socketRef.current;
      if (socket?.connected) {
        socket.emit("mark-read", { threadId });
      }
    }, [load, threadId]),
  );

  if (!threadId) {
    router.back();
    return <View style={styles.screen} />;
  }

  const send = (): void => {
    if (meta?.isCompleted) return;
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

  const completeJob = (): void => {
    Alert.alert(t("completeJob"), t("completeJobConfirm"), [
      { text: t("cancel"), style: "cancel" },
      {
        text: t("completeJob"),
        style: "destructive",
        onPress: () => {
          void (async () => {
            try {
              await apiFetch(`/api/v1/threads/${threadId}/complete`, { method: "POST" });
              Alert.alert(t("jobCompleted"));
              await load();
            } catch (e) {
              const msg = e instanceof Error ? e.message : t("updateFailed");
              Alert.alert(t("errorTitle"), msg);
            }
          })();
        },
      },
    ]);
  };

  const submitRating = (): void => {
    void (async () => {
      try {
        await apiFetch(`/api/v1/threads/${threadId}/reviews`, {
          method: "POST",
          body: JSON.stringify({
            stars: ratingStars,
            comment: ratingComment.trim(),
          }),
        });
        Alert.alert(t("ratingSubmitted"));
        await load();
      } catch (e) {
        const msg = e instanceof Error ? e.message : t("updateFailed");
        Alert.alert(t("errorTitle"), msg);
      }
    })();
  };

  const myReview = thread?.reviews.find((review) => review.reviewerUserId === me);
  const openReportMoreMenu = (
    targetType: "USER" | "MESSAGE",
    targetId: string,
  ): void => {
    Alert.alert("", "", [
      { text: t("cancel"), style: "cancel" },
      {
        text: targetType === "MESSAGE" ? t("reportThisMessage") : t("reportThisUser"),
        style: "destructive",
        onPress: () => confirmAndSubmitReport(t, targetType, targetId),
      },
    ]);
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={0}
    >
      {/* Brand green header — safe-area top padding pushes below status bar */}
      <BrandHeaderGradient variant="hero" style={{ paddingTop: insets.top }}>
        <View style={styles.headerBar}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
            <Text style={styles.backText}>‹</Text>
          </Pressable>
          <View style={styles.headerCenter}>
            <Text style={styles.headerName} numberOfLines={1}>
              {meta?.counterpartyName ?? t("chattingWith")}
            </Text>
            {postContextLine ? (
              <Text style={styles.headerContext} numberOfLines={1}>
                {postContextLine}
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
          {counterpartyId ? (
            <Pressable
              onPress={() => openReportMoreMenu("USER", counterpartyId)}
              hitSlop={12}
              style={styles.headerReportBtn}
            >
              <Text style={styles.headerReportText}>⋮</Text>
            </Pressable>
          ) : null}
        </View>
      </BrandHeaderGradient>

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        contentContainerStyle={styles.msgList}
        onContentSizeChange={() =>
          listRef.current?.scrollToEnd({ animated: true })
        }
        ListHeaderComponent={
          <View style={styles.headerStack}>
            {meta?.bidAccepted ? (
              <View style={styles.systemMsg}>
                <Text style={styles.systemMsgText}>
                  ✓ {t("bidAcceptedSystem")}
                </Text>
              </View>
            ) : null}
            {towingPickupCoords && meta?.bidAccepted ? (
              <View style={styles.towingPickupCard}>
                <Text style={styles.towingPickupTitle}>{t("towingCustomerPickup")}</Text>
                {thread?.bid.post.towingFromAddress?.trim() ? (
                  <Text style={styles.towingPickupAddr} numberOfLines={3}>
                    {thread.bid.post.towingFromAddress.trim()}
                  </Text>
                ) : null}
                <Pressable
                  style={styles.towingPickupBtn}
                  onPress={() =>
                    openGoogleMapsAt(towingPickupCoords.lat, towingPickupCoords.lng)
                  }
                >
                  <Text style={styles.towingPickupBtnText}>{t("openInGoogleMaps")}</Text>
                </Pressable>
              </View>
            ) : null}
            {!meta?.isCompleted ? (
              <Pressable style={styles.completeBtn} onPress={completeJob}>
                <Text style={styles.completeBtnText}>{t("completeJob")}</Text>
              </Pressable>
            ) : (
              <View style={styles.completedCard}>
                <Text style={styles.completedTitle}>{t("jobCompleted")}</Text>
                {myReview ? (
                  <Text style={styles.completedHint}>
                    {t("yourRating")}: {myReview.stars}/5
                  </Text>
                ) : (
                  <View style={styles.ratingForm}>
                    <Text style={styles.completedHint}>{t("rateCounterparty")}</Text>
                    <View style={styles.starsRow}>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <Pressable key={n} onPress={() => setRatingStars(n)} hitSlop={8}>
                          <Text style={styles.star}>{n <= ratingStars ? "★" : "☆"}</Text>
                        </Pressable>
                      ))}
                    </View>
                    <TextInput
                      style={styles.ratingInput}
                      value={ratingComment}
                      onChangeText={setRatingComment}
                      placeholder={t("ratingCommentOptional")}
                      placeholderTextColor={theme.mutedLight}
                      multiline
                    />
                    <Pressable style={styles.ratingSubmitBtn} onPress={submitRating}>
                      <Text style={styles.ratingSubmitText}>{t("submitRating")}</Text>
                    </Pressable>
                  </View>
                )}
              </View>
            )}
          </View>
        }
        ListEmptyComponent={
          loadError.length > 0 ? (
            <Pressable style={styles.errorState} onPress={() => void load()}>
              <Text style={styles.errorStateText}>{loadError}</Text>
              <Text style={styles.errorStateHint}>{t("retry")}</Text>
            </Pressable>
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
              {!mine ? (
                <Pressable
                  onPress={() => openReportMoreMenu("MESSAGE", m.id)}
                  style={styles.messageReportBtn}
                >
                  <Text style={styles.messageReportText}>⋮</Text>
                </Pressable>
              ) : null}
            </View>
          );
        }}
      />

      <View style={[styles.composer, { paddingBottom: 10 + insets.bottom }]}>
        <TextInput
          style={[
            styles.input,
            locale === "ar-iq"
              ? { textAlign: "right", writingDirection: "rtl" }
              : { textAlign: "left", writingDirection: "ltr" },
          ]}
          value={draft}
          onChangeText={setDraft}
          placeholder={meta?.isCompleted ? t("chatClosedAfterCompletion") : t("typeMessage")}
          placeholderTextColor={theme.mutedLight}
          multiline
          onSubmitEditing={send}
          blurOnSubmit={false}
          editable={!meta?.isCompleted}
        />
        <Pressable
          style={[styles.sendBtn, busy && styles.sendDisabled]}
          disabled={busy || meta?.isCompleted}
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
    gap: 8,
  },
  backBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  backText: { fontSize: 22, color: "#fff", fontWeight: "700", marginTop: -2 },
  headerCenter: { flex: 1 },
  headerName: { fontWeight: "700", color: "#fff", fontSize: 16, textAlign: "left" },
  headerContext: { fontSize: 12, color: "rgba(255,255,255,0.85)", marginTop: 2, textAlign: "left" },
  headerSpacer: { width: 48 },
  headerReportBtn: {
    backgroundColor: "rgba(255,255,255,0.22)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  headerReportText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  acceptedBadge: {
    backgroundColor: "rgba(255,255,255,0.9)",
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
    // Extra horizontal padding + overflow:'visible' guards Arabic last-char
    // clipping on Samsung One UI 8 (RN underestimates Arabic text width).
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.border,
    overflow: "visible",
  },
  bubbleMine: { backgroundColor: theme.primaryMid, borderColor: theme.primaryMid },
  bubbleText: { color: theme.text, fontSize: 15 },
  bubbleTextMine: { color: "#fff" },
  timestamp: { fontSize: 11, color: theme.mutedLight, marginTop: 3, alignSelf: "flex-start" },
  timestampMine: { alignSelf: "flex-end" },
  messageReportBtn: {
    alignSelf: "flex-start",
    marginTop: 4,
  },
  messageReportText: { fontSize: 11, color: theme.danger, fontWeight: "600" },
  errorState: {
    alignSelf: "center",
    marginTop: 24,
    borderWidth: 1,
    borderColor: theme.danger,
    borderRadius: theme.radiusMd,
    backgroundColor: theme.surface,
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignItems: "center",
    gap: 4,
  },
  errorStateText: { color: theme.danger, fontWeight: "700", textAlign: "center" },
  errorStateHint: { color: theme.text, fontSize: 12, textAlign: "center" },

  systemMsg: {
    alignSelf: "center",
    backgroundColor: theme.primaryLight,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 16,
  },
  systemMsgText: { fontSize: 12, color: theme.primary, fontWeight: "600" },
  towingPickupCard: {
    backgroundColor: theme.towingBg,
    borderRadius: theme.radiusMd,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.border,
  },
  towingPickupTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: theme.towingText,
    textAlign: "left",
  },
  towingPickupAddr: {
    marginTop: 6,
    fontSize: 13,
    color: theme.text,
    textAlign: "left",
    lineHeight: 18,
  },
  towingPickupBtn: {
    marginTop: 10,
    alignSelf: "flex-start",
    backgroundColor: theme.primaryMid,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: theme.radiusMd,
  },
  towingPickupBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  headerStack: { gap: 10, marginBottom: 14 },
  completeBtn: {
    alignSelf: "center",
    backgroundColor: theme.primaryMid,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: theme.radiusMd,
  },
  completeBtnText: { color: "#fff", fontWeight: "700" },
  completedCard: {
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: theme.radiusMd,
    backgroundColor: theme.surface,
    padding: 10,
    gap: 8,
  },
  completedTitle: { color: theme.text, fontWeight: "700", textAlign: "center" },
  completedHint: { color: theme.muted, textAlign: "center" },
  ratingForm: { gap: 8 },
  starsRow: { flexDirection: "row", justifyContent: "center", gap: 8 },
  star: { fontSize: 24, color: "#f59e0b" },
  ratingInput: {
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: theme.radiusMd,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: theme.text,
    textAlignVertical: "top",
    minHeight: 72,
  },
  ratingSubmitBtn: {
    alignSelf: "center",
    backgroundColor: theme.primaryMid,
    borderRadius: theme.radiusMd,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  ratingSubmitText: { color: "#fff", fontWeight: "700" },

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
    textAlign: "left",
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
