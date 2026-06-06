import { router, Stack, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";

import { PostImageLightbox } from "@/components/PostImageLightbox";
import { SearchablePickerModal, type SearchablePickerItem } from "@/components/SearchablePickerModal";
import { ShopPremiumGate } from "@/components/ShopPremiumGate";
import { apiFetch, formatIqd } from "@/lib/api";
import { friendlyApiError } from "@/lib/api-error";
import { useI18n } from "@/lib/i18n";
import { normalizeDigits } from "@/lib/numerals";
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

function parseYmd(raw: string | undefined): string {
  if (typeof raw !== "string") return "";
  const v = raw.trim();
  if (v.length === 0) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  if (/^\d{4}-\d{2}-\d{2}T/.test(v)) return v.slice(0, 10);
  const parsed = new Date(v);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 10);
}

export default function ShopBidScreen(): React.ReactElement {
  const { t, locale } = useI18n();
  const {
    postId,
    bidId,
    initialPrice,
    initialAppointmentDate,
    initialAppointmentTime,
    initialDeliveryDate,
    initialDeliveryWindow,
    initialMessage,
    view,
  } =
    useLocalSearchParams<{
      postId: string;
      bidId?: string;
      initialPrice?: string;
      initialAppointmentDate?: string;
      initialAppointmentTime?: string;
      initialDeliveryDate?: string;
      initialDeliveryWindow?: string;
      initialMessage?: string;
      view?: string;
    }>();

  const isEditing = Boolean(bidId);
  const readOnly = view === "1";

  const [post, setPost] = useState<Post | null>(null);
  const [price, setPrice] = useState(initialPrice ?? "");
  const [appointmentDate, setAppointmentDate] = useState(
    parseYmd(initialAppointmentDate),
  );
  const [appointmentTime, setAppointmentTime] = useState(
    typeof initialAppointmentTime === "string" ? initialAppointmentTime : "",
  );
  const [deliveryDate, setDeliveryDate] = useState(
    parseYmd(initialDeliveryDate),
  );
  const [deliveryWindow, setDeliveryWindow] = useState(
    typeof initialDeliveryWindow === "string" ? initialDeliveryWindow : "",
  );
  const [message, setMessage] = useState(initialMessage ?? "");
  const [priceError, setPriceError] = useState("");
  const [messageError, setMessageError] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const submitInFlightRef = useRef(false);

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

  useEffect(() => {
    if (!postId) {
      router.back();
    }
  }, [postId]);

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

  const toIsoDateTime = (raw: string): string | null => {
    const v = raw.trim();
    if (v.length === 0) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
      return `${v}T00:00:00.000Z`;
    }
    const parsed = new Date(v);
    if (Number.isNaN(parsed.getTime())) {
      return null;
    }
    return parsed.toISOString();
  };

  type PickerKey =
    | "appointmentDate"
    | "appointmentTime"
    | "deliveryDate"
    | "deliveryWindow";

  const [activePicker, setActivePicker] = useState<PickerKey | null>(null);
  const closePicker = (): void => {
    setActivePicker(null);
  };

  const dateItems = useMemo((): SearchablePickerItem[] => {
    // Build the 45-day window from the user's *local* "today" so the first
    // option always matches what their device calendar shows. The previous
    // UTC-based seed meant shops in Baghdad (UTC+3) could see "today"
    // disappear after 9pm local — and any value stored as YYYY-MM-DD was
    // interpreted as UTC midnight on the server, shifting it back a day.
    const now = new Date();
    const out: SearchablePickerItem[] = [];
    const count = 45;
    for (let i = 0; i < count; i++) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
      const ymd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
        2,
        "0",
      )}-${String(d.getDate()).padStart(2, "0")}`;
      out.push({ id: ymd, label: ymd });
    }
    return out;
  }, []);

  const formatTime12h = (totalMinutes: number): string => {
    const h24 = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    const ampm = h24 >= 12 ? "PM" : "AM";
    const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
    return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
  };

  const timeItemsBase = useMemo((): SearchablePickerItem[] => {
    const out: SearchablePickerItem[] = [];
    const start = 8 * 60;
    const end = 18 * 60;
    const step = 30;
    for (let mins = start; mins <= end; mins += step) {
      const label = formatTime12h(mins);
      out.push({ id: label, label });
    }
    return out;
  }, []);

  const deliveryWindowItemsBase = useMemo((): SearchablePickerItem[] => {
    const windows = [
      "08:00 AM - 11:00 AM",
      "11:00 AM - 02:00 PM",
      "02:00 PM - 05:00 PM",
      "05:00 PM - 08:00 PM",
    ];
    return windows.map((w) => ({ id: w, label: w }));
  }, []);

  const pickerItems = useMemo((): SearchablePickerItem[] => {
    if (!activePicker) return [];
    if (activePicker === "appointmentDate") {
      const current = appointmentDate.trim();
      const base = dateItems;
      return current.length > 0 && !base.some((it) => it.id === current)
        ? [{ id: current, label: current }, ...base]
        : base;
    }
    if (activePicker === "deliveryDate") {
      const current = deliveryDate.trim();
      const base = dateItems;
      return current.length > 0 && !base.some((it) => it.id === current)
        ? [{ id: current, label: current }, ...base]
        : base;
    }
    if (activePicker === "appointmentTime") {
      const current = appointmentTime.trim();
      const base = timeItemsBase;
      return current.length > 0 && !base.some((it) => it.id === current)
        ? [{ id: current, label: current }, ...base]
        : base;
    }
    const current = deliveryWindow.trim();
    const base = deliveryWindowItemsBase;
    return current.length > 0 && !base.some((it) => it.id === current)
      ? [{ id: current, label: current }, ...base]
      : base;
  }, [
    activePicker,
    appointmentDate,
    appointmentTime,
    deliveryDate,
    deliveryWindow,
    dateItems,
    timeItemsBase,
    deliveryWindowItemsBase,
  ]);

  const pickerSelectedId = useMemo((): string | undefined => {
    if (!activePicker) return undefined;
    if (activePicker === "appointmentDate") return appointmentDate.trim();
    if (activePicker === "deliveryDate") return deliveryDate.trim();
    if (activePicker === "appointmentTime") return appointmentTime.trim();
    return deliveryWindow.trim();
  }, [
    activePicker,
    appointmentDate,
    appointmentTime,
    deliveryDate,
    deliveryWindow,
  ]);

  const pickerTitle = useMemo((): string => {
    if (!activePicker) return "";
    if (activePicker === "appointmentDate") return t("appointmentDate");
    if (activePicker === "appointmentTime") return t("appointmentTime");
    if (activePicker === "deliveryDate") return t("deliveryDate");
    return t("deliveryWindow");
  }, [activePicker, t]);

  const onPick = (id: string): void => {
    if (!activePicker) return;
    if (activePicker === "appointmentDate") {
      setAppointmentDate(id);
      closePicker();
      return;
    }
    if (activePicker === "appointmentTime") {
      setAppointmentTime(id);
      closePicker();
      return;
    }
    if (activePicker === "deliveryDate") {
      setDeliveryDate(id);
      closePicker();
      return;
    }
    setDeliveryWindow(id);
    closePicker();
  };

  // Clears the currently-active picker's selection back to empty. Used by
  // SearchablePickerModal's Clear button so the shop can unset an optional
  // date/time after having picked one.
  const onClearActive = (): void => {
    if (!activePicker) return;
    if (activePicker === "appointmentDate") {
      setAppointmentDate("");
      return;
    }
    if (activePicker === "appointmentTime") {
      setAppointmentTime("");
      return;
    }
    if (activePicker === "deliveryDate") {
      setDeliveryDate("");
      return;
    }
    setDeliveryWindow("");
  };

  const submit = (): void => {
    if (submitInFlightRef.current) return;
    setErr("");
    setPriceError("");
    setMessageError("");
    // Accept Arabic-Indic / Persian numerals for price too — Iraqi keyboards
    // commonly produce those, and Number() can't parse them natively.
    const n = parseInt(normalizeDigits(price).trim(), 10);
    const msg = message.trim();
    let invalid = false;
    if (!Number.isFinite(n) || n <= 0) {
      setPriceError(t("priceRequired"));
      invalid = true;
    }
    if (msg.length === 0) {
      setMessageError(t("messageRequired"));
      invalid = true;
    }
    if (invalid) return;
    submitInFlightRef.current = true;
    setBusy(true);
    void (async () => {
      try {
        const body: Record<string, unknown> = {
          priceEstimate: Math.round(n),
          message: msg,
        };
        // On edit (PUT), explicitly send null for cleared values so the
        // server can clear the column instead of leaving the old value in
        // place. On create (POST), omit empty values entirely.
        if (isParts) {
          const deliveryDateIso = toIsoDateTime(deliveryDate);
          if (deliveryDateIso) {
            body.deliveryDate = deliveryDateIso;
          } else if (isEditing) {
            body.deliveryDate = null;
          }
          if (deliveryWindow.trim().length > 0) {
            body.deliveryWindow = deliveryWindow;
          } else if (isEditing) {
            body.deliveryWindow = null;
          }
        } else {
          const appointmentDateIso = toIsoDateTime(appointmentDate);
          if (appointmentDateIso) {
            body.appointmentDate = appointmentDateIso;
          } else if (isEditing) {
            body.appointmentDate = null;
          }
          if (appointmentTime.trim().length > 0) {
            body.appointmentTime = appointmentTime;
          } else if (isEditing) {
            body.appointmentTime = null;
          }
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
        setErr(friendlyApiError(e, t));
      } finally {
        setBusy(false);
        submitInFlightRef.current = false;
      }
    })();
  };

  // Placeholder render for stale back-stack (param missing); the effect above
  // schedules a router.back(). Kept AFTER all hooks so we don't violate the
  // Rules of Hooks by skipping later useState/useMemo when postId is absent.
  if (!postId) {
    return <View style={styles.screen} />;
  }

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
      <KeyboardAwareScrollView
        style={styles.flex}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        // Pushes the focused field 24px above the keyboard so its label
        // is visible. KeyboardProvider (root) drives the native frame
        // so this works under Android edge-to-edge.
        bottomOffset={24}
      >
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

          {/* Request photos — rendered up here (right under the summary card)
              so the shop sees the customer's attached images regardless of
              whether they opened this screen to place a new bid, edit one,
              or just view an existing bid in read-only mode. Tap a thumb to
              open the lightbox. */}
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
              {!isParts && appointmentDate ? (
                <Text style={styles.bidCardMeta}>
                  {t("appointmentDate")}: {appointmentDate}
                </Text>
              ) : null}
              {!isParts && appointmentTime ? (
                <Text style={styles.bidCardMeta}>
                  {t("appointmentTime")}: {appointmentTime}
                </Text>
              ) : null}
              {isParts && deliveryDate ? (
                <Text style={styles.bidCardMeta}>
                  {t("deliveryDate")}: {deliveryDate}
                </Text>
              ) : null}
              {isParts && deliveryWindow ? (
                <Text style={styles.bidCardMeta}>
                  {t("deliveryWindow")}: {deliveryWindow}
                </Text>
              ) : null}
            </View>
          ) : null}

          {readOnly ? null : (
          <>
          {/* Price */}
          <Text style={styles.label}>{t("priceIqd")}</Text>
          <TextInput
            style={[
              styles.input,
              styles.priceInput,
              priceError ? styles.inputError : null,
            ]}
            keyboardType="number-pad"
            placeholder="250,000"
            placeholderTextColor={theme.mutedLight}
            value={price}
            onChangeText={(v) => {
              setPrice(v);
              if (priceError) setPriceError("");
            }}
          />
          {priceError ? (
            <Text style={styles.inlineError}>{priceError}</Text>
          ) : (
            <Text style={styles.hint}>{t("canAdjust")}</Text>
          )}

          {/* Date/time fields — different labels for parts vs repair/towing.
              All four are optional: the shop can leave them empty and the
              owner will simply see "—" on their side. Use the Clear button
              inside the picker modal to reset a previously chosen value. */}
          {isParts ? (
            <>
              <Text style={styles.label}>
                {t("deliveryDate")}{" "}
                <Text style={styles.labelOptional}>({t("optional")})</Text>
              </Text>
              <Pressable
                style={styles.fieldPickerBtn}
                onPress={() => setActivePicker("deliveryDate")}
              >
                <Text
                  style={[
                    styles.fieldPickerValue,
                    locale === "ar-iq"
                      ? { textAlign: "right", writingDirection: "rtl" }
                      : { textAlign: "left", writingDirection: "ltr" },
                  ]}
                  numberOfLines={1}
                >
                  {deliveryDate.trim().length > 0 ? deliveryDate : "—"}
                </Text>
                <Text style={styles.fieldPickerChevron}>⌄</Text>
              </Pressable>
              <Text style={styles.label}>
                {t("deliveryWindow")}{" "}
                <Text style={styles.labelOptional}>({t("optional")})</Text>
              </Text>
              <Pressable
                style={styles.fieldPickerBtn}
                onPress={() => setActivePicker("deliveryWindow")}
              >
                <Text
                  style={[
                    styles.fieldPickerValue,
                    locale === "ar-iq"
                      ? { textAlign: "right", writingDirection: "rtl" }
                      : { textAlign: "left", writingDirection: "ltr" },
                  ]}
                  numberOfLines={1}
                >
                  {deliveryWindow.trim().length > 0 ? deliveryWindow : "—"}
                </Text>
                <Text style={styles.fieldPickerChevron}>⌄</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Text style={styles.label}>
                {t("appointmentDate")}{" "}
                <Text style={styles.labelOptional}>({t("optional")})</Text>
              </Text>
              <Pressable
                style={styles.fieldPickerBtn}
                onPress={() => setActivePicker("appointmentDate")}
              >
                <Text
                  style={[
                    styles.fieldPickerValue,
                    locale === "ar-iq"
                      ? { textAlign: "right", writingDirection: "rtl" }
                      : { textAlign: "left", writingDirection: "ltr" },
                  ]}
                  numberOfLines={1}
                >
                  {appointmentDate.trim().length > 0 ? appointmentDate : "—"}
                </Text>
                <Text style={styles.fieldPickerChevron}>⌄</Text>
              </Pressable>
              <Text style={styles.label}>
                {t("appointmentTime")}{" "}
                <Text style={styles.labelOptional}>({t("optional")})</Text>
              </Text>
              <Pressable
                style={styles.fieldPickerBtn}
                onPress={() => setActivePicker("appointmentTime")}
              >
                <Text
                  style={[
                    styles.fieldPickerValue,
                    locale === "ar-iq"
                      ? { textAlign: "right", writingDirection: "rtl" }
                      : { textAlign: "left", writingDirection: "ltr" },
                  ]}
                  numberOfLines={1}
                >
                  {appointmentTime.trim().length > 0 ? appointmentTime : "—"}
                </Text>
                <Text style={styles.fieldPickerChevron}>⌄</Text>
              </Pressable>
            </>
          )}

          {/* Message */}
          <Text style={styles.label}>{t("messageToCustomer")}</Text>
          <TextInput
            style={[
              styles.input,
              styles.area,
              messageError ? styles.inputError : null,
              locale === "ar-iq"
                ? { textAlign: "right", writingDirection: "rtl" }
                : { textAlign: "left", writingDirection: "ltr" },
            ]}
            placeholder={t("message")}
            placeholderTextColor={theme.mutedLight}
            value={message}
            onChangeText={(v) => {
              setMessage(v.slice(0, 500));
              if (messageError) setMessageError("");
            }}
            multiline
            maxLength={500}
          />
          {messageError ? (
            <Text style={styles.inlineError}>{messageError}</Text>
          ) : null}
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
      </KeyboardAwareScrollView>
      <SearchablePickerModal
        visible={activePicker !== null}
        title={pickerTitle}
        items={pickerItems}
        selectedId={pickerSelectedId}
        onSelect={onPick}
        onRequestClose={closePicker}
        cancelLabel={t("cancel")}
        searchPlaceholder={t("search")}
        // All four pickers (date, time, deliveryDate, deliveryWindow) are
        // short fixed lists — 45 dates, ~20 times, 4 delivery windows — so
        // a search field just adds noise. The shop scrolls instead.
        showSearch={false}
        onClear={onClearActive}
        clearLabel={t("clear")}
      />
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
  bidCardMeta: {
    fontSize: 13,
    color: theme.muted,
    marginTop: 6,
    lineHeight: 18,
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
  labelOptional: { fontSize: 13, fontWeight: "500", color: theme.mutedLight },
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
  fieldPickerBtn: {
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: theme.radiusMd,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: theme.text,
    backgroundColor: theme.surface,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 2,
    marginBottom: 8,
  },
  fieldPickerValue: { fontSize: 16, color: theme.text, flex: 1 },
  fieldPickerChevron: { marginLeft: 10, color: theme.mutedLight, fontSize: 18 },
  priceInput: { fontSize: 22, fontWeight: "700", writingDirection: "ltr" },
  inputError: { borderColor: theme.danger },
  inlineError: {
    color: theme.danger,
    fontSize: 13,
    marginTop: 4,
    marginBottom: 4,
    textAlign: "left",
  },

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
