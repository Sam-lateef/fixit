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

import { PostImageLightbox } from "@/components/PostImageLightbox";
import { ShopPremiumGate } from "@/components/ShopPremiumGate";
import { apiFetch, formatIqd } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import {
  ownerCityLabel,
  partsCategoryLabel,
  repairCategoryLabel,
} from "@/lib/taxonomy-labels";
import { theme } from "@/lib/theme";

type Post = {
  id: string;
  serviceType: string;
  title: string | null;
  repairCategory: string | null;
  partsCategory: string | null;
  carMake: string | null;
  carModel: string | null;
  carYear: number | null;
  conditionNew: boolean;
  conditionUsed: boolean;
  deliveryNeeded: boolean;
  towingFromAddress: string | null;
  towingToAddress: string | null;
  urgency: string | null;
  description: string;
  photoUrls: string[];
  status: string;
  createdAt: string;
  district: {
    name: string;
    nameAr: string | null;
    city: string;
  } | null;
  user: { name: string | null };
};

function serviceTagStyle(type: string): { bg: string; fg: string } {
  const upper = type.toUpperCase();
  if (upper === "PARTS") return { bg: theme.partsBg, fg: theme.partsText };
  if (upper === "TOWING") return { bg: theme.towingBg, fg: theme.towingText };
  return { bg: theme.repairBg, fg: theme.repairText };
}

export default function ShopBidScreen(): React.ReactElement {
  const { t, locale } = useI18n();
  const { postId, bidId, initialPrice, initialMessage, view } =
    useLocalSearchParams<{
      postId: string;
      bidId?: string;
      initialPrice?: string;
      initialMessage?: string;
      view?: string;
    }>();

  const isEditing = Boolean(bidId);
  const readOnly = view === "1";

  const [post, setPost] = useState<Post | null>(null);
  const [price, setPrice] = useState(initialPrice ?? "");
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
  const categoryLabel = post
    ? post.repairCategory
      ? repairCategoryLabel(post.repairCategory, locale)
      : post.partsCategory
        ? partsCategoryLabel(post.partsCategory, locale)
        : null
    : null;
  const cityLabel = post?.district
    ? ownerCityLabel(post.district.city, locale)
    : null;
  const districtLabel = post?.district
    ? locale === "ar-iq" && post.district.nameAr
      ? post.district.nameAr
      : post.district.name
    : null;
  const bidPriceNumber = initialPrice ? Number(initialPrice) : NaN;
  const hasBidInfo =
    readOnly && bidId !== undefined && Number.isFinite(bidPriceNumber);

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
        if (isParts) {
          if (deliveryDate) body.deliveryDate = deliveryDate;
          if (deliveryWindow) body.deliveryWindow = deliveryWindow;
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
          title: readOnly
            ? t("viewPost")
            : isEditing
              ? t("editBid")
              : t("placeBid"),
        }}
      />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
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
                      {categoryLabel ? ` · ${categoryLabel}` : ""}
                    </Text>
                  </View>
                ) : null}
              </View>
              {post.title ? (
                <Text style={styles.summaryTitle}>{post.title}</Text>
              ) : null}
              {(post.carMake || post.carModel || post.carYear) ? (
                <Text style={styles.summaryCarInfo}>
                  {[post.carMake, post.carModel, post.carYear]
                    .filter(Boolean)
                    .join(" · ")}
                </Text>
              ) : null}
              {post.user.name ? (
                <Text style={styles.summaryOwner}>{post.user.name}</Text>
              ) : null}
              <Text style={styles.summaryDesc} numberOfLines={readOnly ? undefined : 3}>
                {post.description}
              </Text>
            </View>
          ) : null}

          {/* Read-only extra details mirroring owner's request screen */}
          {readOnly && post ? (
            <View style={styles.detailsBlock}>
              {(cityLabel || districtLabel) ? (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>{t("district")}</Text>
                  <Text style={styles.detailValue}>
                    {[cityLabel, districtLabel].filter(Boolean).join(" · ")}
                  </Text>
                </View>
              ) : null}

              {post.serviceType.toUpperCase() === "PARTS" ? (
                <>
                  {(post.conditionNew || post.conditionUsed) ? (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>{t("conditionNew")} / {t("conditionUsed")}</Text>
                      <Text style={styles.detailValue}>
                        {[
                          post.conditionNew ? t("conditionNew") : null,
                          post.conditionUsed ? t("conditionUsed") : null,
                        ].filter(Boolean).join(" · ")}
                      </Text>
                    </View>
                  ) : null}
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>{t("deliveryNeeded")}</Text>
                    <Text style={styles.detailValue}>
                      {post.deliveryNeeded ? t("yes") : t("no")}
                    </Text>
                  </View>
                </>
              ) : null}

              {post.serviceType.toUpperCase() === "TOWING" ? (
                <>
                  {post.towingFromAddress ? (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>{t("towingLocation")}</Text>
                      <Text style={styles.detailValue}>{post.towingFromAddress}</Text>
                    </View>
                  ) : null}
                  {post.towingToAddress ? (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>{t("towTo")}</Text>
                      <Text style={styles.detailValue}>{post.towingToAddress}</Text>
                    </View>
                  ) : null}
                  {post.urgency ? (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>{t("urgency")}</Text>
                      <Text style={styles.detailValue}>
                        {post.urgency === "WITHIN_HOUR" ? t("withinHour") : t("asap")}
                      </Text>
                    </View>
                  ) : null}
                </>
              ) : null}
            </View>
          ) : null}

          {/* Your bid price (shop-side only, read-only view) */}
          {hasBidInfo ? (
            <View style={styles.bidCard}>
              <Text style={styles.bidCardTitle}>{t("priceIqd")}</Text>
              <Text style={styles.bidCardPrice}>
                {formatIqd(bidPriceNumber)}
              </Text>
              {initialMessage ? (
                <Text style={styles.bidCardMessage}>{initialMessage}</Text>
              ) : null}
            </View>
          ) : null}

          {readOnly ? null : (
          <>
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
          ) : null}

          {/* Message */}
          <Text style={styles.label}>{t("messageToCustomer")}</Text>
          <TextInput
            style={[
              styles.input,
              styles.area,
              locale === "ar-iq"
                ? { textAlign: "right", writingDirection: "rtl" }
                : { textAlign: "left", writingDirection: "ltr" },
            ]}
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
          </>
          )}

          {/* Photos: full-width stacked at the bottom */}
          {post?.photoUrls && post.photoUrls.length > 0 ? (
            <View style={styles.photosBlock}>
              <Text style={styles.photosLabel}>{t("photos")}</Text>
              {post.photoUrls.map((url, i) => (
                <PostImageLightbox
                  key={`${url}-${i}`}
                  uri={url.trim()}
                  thumbnailStyle={styles.photoFull}
                />
              ))}
            </View>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </ShopPremiumGate>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: theme.bg },
  screen: { flex: 1, backgroundColor: theme.bg },
  scroll: { padding: 20, paddingBottom: 40 },

  photosBlock: { marginTop: 8 },
  photosLabel: {
    fontSize: 12,
    color: theme.mutedLight,
    fontWeight: "600",
    textTransform: "uppercase",
    marginBottom: 8,
    textAlign: "left",
  },
  photoFull: {
    width: "100%",
    aspectRatio: 4 / 3,
    borderRadius: theme.radiusLg,
    backgroundColor: theme.chip,
    marginBottom: 12,
  },

  summaryCard: {
    backgroundColor: theme.primaryLight,
    borderRadius: theme.radiusLg,
    padding: 14,
    marginBottom: 20,
  },
  summaryTopRow: { flexDirection: "row", marginBottom: 6 },
  serviceTag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  serviceTagText: { fontSize: 12, fontWeight: "700" },
  summaryTitle: { fontSize: 17, fontWeight: "700", color: theme.text, marginTop: 4, textAlign: "left" },
  summaryCarInfo: { fontSize: 13, color: theme.primary, fontWeight: "600", marginTop: 4, textAlign: "left" },
  summaryOwner: { fontSize: 13, color: theme.muted, marginTop: 2, textAlign: "left" },
  summaryDesc: { fontSize: 14, color: theme.text, marginTop: 6, lineHeight: 20, textAlign: "left" },

  detailsBlock: {
    backgroundColor: theme.surface,
    borderRadius: theme.radiusLg,
    borderWidth: 1,
    borderColor: theme.border,
    paddingHorizontal: 14,
    paddingVertical: 4,
    marginBottom: 20,
  },
  detailRow: {
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.border,
  },

  bidCard: {
    backgroundColor: theme.primaryLight,
    borderRadius: theme.radiusLg,
    padding: 14,
    marginBottom: 20,
  },
  bidCardTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: theme.primary,
    textTransform: "uppercase",
    marginBottom: 6,
    textAlign: "left",
  },
  bidCardPrice: {
    fontSize: 22,
    fontWeight: "700",
    color: theme.text,
    textAlign: "left",
  },
  bidCardMessage: {
    fontSize: 14,
    color: theme.muted,
    marginTop: 6,
    lineHeight: 20,
    textAlign: "left",
  },
  detailLabel: {
    fontSize: 12,
    color: theme.mutedLight,
    fontWeight: "600",
    textTransform: "uppercase",
    marginBottom: 2,
    textAlign: "left",
  },
  detailValue: {
    fontSize: 15,
    color: theme.text,
    textAlign: "left",
  },

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
