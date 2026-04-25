import { router, Stack, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { ShopPremiumGate } from "@/components/ShopPremiumGate";
import { apiFetch } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { theme } from "@/lib/theme";

type Post = {
  id: string;
  serviceType: string;
  repairCategory: string | null;
  partsCategory: string | null;
  carMake: string | null;
  carYear: number | null;
  description: string;
  user: { name: string | null };
};

type DurationUnit = "HOURS" | "DAYS";

function serviceTagStyle(type: string): { bg: string; fg: string } {
  const upper = type.toUpperCase();
  if (upper === "PARTS") return { bg: theme.partsBg, fg: theme.partsText };
  if (upper === "TOWING") return { bg: theme.towingBg, fg: theme.towingText };
  return { bg: theme.repairBg, fg: theme.repairText };
}

export default function ShopBidScreen(): React.ReactElement {
  const { t } = useI18n();
  const { postId, bidId, initialPrice, initialMessage } = useLocalSearchParams<{
    postId: string;
    bidId?: string;
    initialPrice?: string;
    initialMessage?: string;
  }>();

  const isEditing = Boolean(bidId);

  const [post, setPost] = useState<Post | null>(null);
  const [price, setPrice] = useState(initialPrice ?? "");
  const [estimatedQty, setEstimatedQty] = useState("");
  const [durationUnit, setDurationUnit] = useState<DurationUnit>("HOURS");
  const [appointmentDate, setAppointmentDate] = useState("");
  const [appointmentTime, setAppointmentTime] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [deliveryWindow, setDeliveryWindow] = useState("");
  const [message, setMessage] = useState(initialMessage ?? "");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const loadPost = useCallback(async () => {
    if (!postId) return;
    try {
      const { post } = await apiFetch<{ post: Post }>(`/api/v1/posts/${postId}`);
      setPost(post);
    } catch {
      /* post context unavailable — still allow bid submission */
    }
  }, [postId]);

  useEffect(() => {
    void loadPost();
  }, [loadPost]);

  if (!postId) {
    router.back();
    return <View style={styles.screen} />;
  }

  const isParts = post?.serviceType.toUpperCase() === "PARTS";
  const tag = post ? serviceTagStyle(post.serviceType) : null;
  const category = post?.repairCategory ?? post?.partsCategory ?? null;

  const submit = (): void => {
    setErr("");
    const n = Number(price);
    const msg = message.trim();
    if (!n) {
      setErr(t("priceRequired"));
      return;
    }
    setBusy(true);
    void (async () => {
      try {
        const body: Record<string, unknown> = {
          priceEstimate: Math.round(n),
          message: msg || undefined,
        };
        if (estimatedQty) body.estimatedQty = Number(estimatedQty);
        if (estimatedQty) body.durationUnit = durationUnit;
        if (isParts) {
          if (deliveryDate) body.deliveryDate = deliveryDate;
          if (deliveryWindow) body.deliveryWindow = deliveryWindow;
        } else {
          if (appointmentDate) body.appointmentDate = appointmentDate;
          if (appointmentTime) body.appointmentTime = appointmentTime;
        }
        const url = isEditing
          ? `/api/v1/bids/${bidId}`
          : `/api/v1/posts/${postId}/bids`;
        await apiFetch(url, {
          method: isEditing ? "PUT" : "POST",
          body: JSON.stringify(body),
        });
        router.back();
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Failed");
      } finally {
        setBusy(false);
      }
    })();
  };

  return (
    <ShopPremiumGate>
      <Stack.Screen
        options={{
          title: isEditing ? t("editBid") : t("placeBid"),
          headerStyle: { backgroundColor: theme.surface },
          headerTintColor: theme.text,
        }}
      />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 88 : 0}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* Post summary card */}
          {post ? (
            <View style={styles.summaryCard}>
              <View style={styles.summaryTopRow}>
                {tag ? (
                  <View style={[styles.serviceTag, { backgroundColor: tag.bg }]}>
                    <Text style={[styles.serviceTagText, { color: tag.fg }]}>
                      {post.serviceType.charAt(0).toUpperCase() + post.serviceType.slice(1).toLowerCase()}
                      {category ? ` · ${category}` : ""}
                    </Text>
                  </View>
                ) : null}
              </View>
              {(post.carMake || post.carYear) ? (
                <Text style={styles.summaryCarInfo}>
                  {[post.carMake, post.carYear].filter(Boolean).join(" · ")}
                </Text>
              ) : null}
              {post.user.name ? (
                <Text style={styles.summaryOwner}>{post.user.name}</Text>
              ) : null}
              <Text style={styles.summaryDesc} numberOfLines={3}>
                {post.description}
              </Text>
            </View>
          ) : null}

          {/* Price */}
          <Text style={styles.label}>{t("priceIqd")}</Text>
          <TextInput
            style={[styles.input, styles.priceInput]}
            keyboardType="number-pad"
            placeholder="250,000"
            placeholderTextColor={theme.mutedLight}
            value={price}
            onChangeText={setPrice}
          />
          <Text style={styles.hint}>{t("canAdjust")}</Text>

          {/* Estimated time */}
          <Text style={styles.label}>{t("estimatedTime")}</Text>
          <View style={styles.timeRow}>
            <TextInput
              style={[styles.input, styles.timeInput]}
              keyboardType="number-pad"
              placeholder="2"
              placeholderTextColor={theme.mutedLight}
              value={estimatedQty}
              onChangeText={setEstimatedQty}
            />
            <Pressable
              style={[styles.unitChip, durationUnit === "HOURS" && styles.unitChipActive]}
              onPress={() => setDurationUnit("HOURS")}
            >
              <Text style={[styles.unitChipText, durationUnit === "HOURS" && styles.unitChipTextActive]}>
                {t("hours")}
              </Text>
            </Pressable>
            <Pressable
              style={[styles.unitChip, durationUnit === "DAYS" && styles.unitChipActive]}
              onPress={() => setDurationUnit("DAYS")}
            >
              <Text style={[styles.unitChipText, durationUnit === "DAYS" && styles.unitChipTextActive]}>
                {t("days")}
              </Text>
            </Pressable>
          </View>

          {/* Date/time fields — different labels for parts vs repair/towing */}
          {isParts ? (
            <>
              <Text style={styles.label}>{t("deliveryDate")}</Text>
              <TextInput
                style={styles.input}
                placeholder="2026-04-10"
                placeholderTextColor={theme.mutedLight}
                value={deliveryDate}
                onChangeText={setDeliveryDate}
              />
              <Text style={styles.label}>{t("deliveryWindow")}</Text>
              <TextInput
                style={styles.input}
                placeholder="10:00 AM – 2:00 PM"
                placeholderTextColor={theme.mutedLight}
                value={deliveryWindow}
                onChangeText={setDeliveryWindow}
              />
            </>
          ) : (
            <>
              <Text style={styles.label}>{t("appointmentDate")}</Text>
              <TextInput
                style={styles.input}
                placeholder="2026-04-10"
                placeholderTextColor={theme.mutedLight}
                value={appointmentDate}
                onChangeText={setAppointmentDate}
              />
              <Text style={styles.label}>{t("appointmentTime")}</Text>
              <TextInput
                style={styles.input}
                placeholder="11:00 AM"
                placeholderTextColor={theme.mutedLight}
                value={appointmentTime}
                onChangeText={setAppointmentTime}
              />
            </>
          )}

          {/* Message */}
          <Text style={styles.label}>{t("messageToCustomer")}</Text>
          <TextInput
            style={[styles.input, styles.area]}
            placeholder={t("message")}
            placeholderTextColor={theme.mutedLight}
            value={message}
            onChangeText={(v) => setMessage(v.slice(0, 500))}
            multiline
            maxLength={500}
          />
          <Text style={styles.charCount}>{message.length}/500</Text>

          {/* Submit */}
          <Pressable
            style={[styles.submitBtn, busy && styles.submitBtnDisabled]}
            disabled={busy}
            onPress={submit}
          >
            <Text style={styles.submitBtnText}>{t("submitBid")}</Text>
          </Pressable>
          {err ? <Text style={styles.err}>{err}</Text> : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </ShopPremiumGate>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: theme.bg },
  screen: { flex: 1, backgroundColor: theme.bg },
  scroll: { padding: 20, paddingBottom: 40 },

  summaryCard: {
    backgroundColor: theme.primaryLight,
    borderRadius: theme.radiusLg,
    padding: 14,
    marginBottom: 20,
  },
  summaryTopRow: { flexDirection: "row", marginBottom: 6 },
  serviceTag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  serviceTagText: { fontSize: 12, fontWeight: "700" },
  summaryCarInfo: { fontSize: 13, color: theme.primary, fontWeight: "600", marginTop: 4 },
  summaryOwner: { fontSize: 13, color: theme.muted, marginTop: 2 },
  summaryDesc: { fontSize: 14, color: theme.text, marginTop: 6, lineHeight: 20 },

  label: { fontSize: 15, fontWeight: "600", color: theme.text, marginBottom: 6, marginTop: 16, textAlign: "left" },
  hint: { fontSize: 12, color: theme.mutedLight, marginTop: 4, textAlign: "left" },

  input: {
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: theme.radiusMd,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: theme.text,
    backgroundColor: theme.surface,
    textAlign: "left",
  },
  priceInput: { fontSize: 22, fontWeight: "700", writingDirection: "ltr" },

  timeRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  timeInput: { flex: 1 },
  unitChip: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: theme.chip,
  },
  unitChipActive: { backgroundColor: theme.primary },
  unitChipText: { fontSize: 14, fontWeight: "600", color: theme.muted },
  unitChipTextActive: { color: "#fff" },

  area: { minHeight: 100, textAlignVertical: "top" },
  charCount: { fontSize: 12, color: theme.mutedLight, textAlign: "right", marginTop: 4 },

  submitBtn: {
    marginTop: 24,
    backgroundColor: theme.primaryMid,
    paddingVertical: 16,
    borderRadius: theme.radiusMd,
    alignItems: "center",
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: "#fff", fontWeight: "700", fontSize: 17 },
  err: { marginTop: 12, color: theme.danger, fontSize: 13, textAlign: "center" },
});
