/**
 * Notification title/body per recipient locale. Values match mobile `LocaleId`.
 */

export type PushLocale = "en" | "ar-iq";

/**
 * Maps stored DB value to a push locale; unknown/null defaults to English.
 */
export function resolvePushLocale(raw: string | null | undefined): PushLocale {
  return raw === "ar-iq" ? "ar-iq" : "en";
}

/**
 * Owner receives when a shop places a bid on their post.
 */
export function pushBidForOwner(loc: PushLocale): { title: string; body: string } {
  if (loc === "ar-iq") {
    return {
      title: "عرض جديد على طلبك",
      body: "قدّمت ورشة عرضاً على طلبك.",
    };
  }
  return {
    title: "New bid on your post",
    body: "A shop placed a bid on your request.",
  };
}

/**
 * Shop receives for nearby towing requests (body includes distance in km).
 */
export function pushTowingNearby(
  loc: PushLocale,
  distKm: string,
): { title: string; body: string } {
  if (loc === "ar-iq") {
    return {
      title: "طلب سحب قريب منك",
      body: `يحتاج أحد إلى سحب في منطقتك — على بعد ${distKm} كم من موقعك`,
    };
  }
  return {
    title: "Urgent towing needed nearby",
    body: `Someone needs a tow in your area — ${distKm} km from you`,
  };
}

/**
 * Shop receives when a repair/parts post matches (batched notify).
 */
export function pushNewRequestNearYou(loc: PushLocale): { title: string; body: string } {
  if (loc === "ar-iq") {
    return {
      title: "طلب جديد قربك",
      body: "نشر عميل طلباً جديداً قد يتناسب مع ورشتك.",
    };
  }
  return {
    title: "New request near you",
    body: "A customer posted a new job that may match your shop.",
  };
}

/**
 * Chat message notification title (body is the message preview).
 */
export function pushNewMessageTitle(loc: PushLocale): string {
  return loc === "ar-iq" ? "رسالة جديدة" : "New message";
}

/**
 * Shop receives when the owner accepts their bid.
 */
export function pushBidAccepted(loc: PushLocale): { title: string; body: string } {
  if (loc === "ar-iq") {
    return {
      title: "تم قبول عرضك",
      body: "قبل العميل عرضك. افتح المحادثة للتنسيق.",
    };
  }
  return {
    title: "Your bid was accepted",
    body: "The customer accepted your bid. Open chat to coordinate.",
  };
}
