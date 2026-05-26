import * as Device from "expo-device";
import { Alert, Platform } from "react-native";

const PREFIX = "[FixIt:ChatBubble]";

export type ChatBubbleLayoutSnapshot = {
  messageId: string;
  contentLen: number;
  displayLen: number;
  tailCodePoints: string;
  rtl: boolean;
  shellW: number | null;
  shellH: number | null;
  textBoxW: number | null;
  textBoxH: number | null;
  maxLineW: number | null;
  shellSlack: number | null;
  lines: Array<{ width: number; height: number; len: number; tail: string }>;
  mismatch: boolean;
};

/**
 * Enable in preview/test APKs: set in eas.json preview `env` or mobile/.env
 *   EXPO_PUBLIC_DEBUG_CHAT_BUBBLE_LAYOUT=true
 * Restart Metro / rebuild. Logs use console.warn (visible in Metro; on device use long-press).
 */
export function chatBubbleLayoutDebugEnabled(): boolean {
  const flag = process.env.EXPO_PUBLIC_DEBUG_CHAT_BUBBLE_LAYOUT?.trim().toLowerCase();
  return flag === "1" || flag === "true";
}

export function tailCodePoints(text: string, count: number): string {
  const chars = [...text];
  const slice = chars.slice(-count);
  return slice
    .map((ch) => {
      const cp = ch.codePointAt(0);
      const hex = cp !== undefined ? cp.toString(16).toUpperCase() : "?";
      return `${ch}(U+${hex})`;
    })
    .join(" ");
}

export function chatBubbleDevLog(
  event: string,
  data?: Record<string, unknown>,
): void {
  if (!chatBubbleLayoutDebugEnabled()) {
    return;
  }
  if (data !== undefined) {
    console.warn(PREFIX, event, data);
  } else {
    console.warn(PREFIX, event);
  }
}

export function computeLineMismatch(
  shellW: number | null,
  lines: ChatBubbleLayoutSnapshot["lines"],
): boolean {
  if (shellW === null || lines.length === 0) {
    return false;
  }
  return lines.some((line) => line.width > shellW + 0.5);
}

export function showChatBubbleLayoutAlert(
  snap: ChatBubbleLayoutSnapshot,
): void {
  const device = [
    Device.brand ?? "?",
    Device.modelName ?? "?",
    Device.osName ?? Platform.OS,
    Device.osVersion ?? "?",
  ].join(" · ");

  const verdict =
    !snap.mismatch && snap.shellSlack !== null && snap.shellSlack > 8
      ? "glyph-overhang — use endSlop build"
      : snap.mismatch
        ? "box-too-narrow"
        : "unknown";

  const body = [
    `device: ${device}`,
    `id: ${snap.messageId}`,
    `len: ${snap.contentLen} display: ${snap.displayLen} rtl: ${snap.rtl}`,
    `shell: ${snap.shellW ?? "?"}×${snap.shellH ?? "?"}`,
    `textBox: ${snap.textBoxW ?? "?"}×${snap.textBoxH ?? "?"}`,
    `maxLineW: ${snap.maxLineW?.toFixed(1) ?? "?"}`,
    `shellSlack: ${snap.shellSlack?.toFixed(1) ?? "?"}`,
    `line>W: ${snap.mismatch}`,
    `verdict: ${verdict}`,
    ...snap.lines.map(
      (l, i) =>
        `  L${i + 1}: w=${l.width.toFixed(1)} len=${l.len} …${l.tail}`,
    ),
    `tail: ${snap.tailCodePoints}`,
    "",
    "Long-press → Copy. Full clipboard + cut bubble = glyph overhang.",
  ].join("\n");

  Alert.alert("Chat bubble layout", body, [{ text: "OK" }]);
}
