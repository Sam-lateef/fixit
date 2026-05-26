import * as Device from "expo-device";
import { useCallback, useMemo, useRef, type ReactElement } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  type NativeSyntheticEvent,
  type TextLayoutEventData,
} from "react-native";

import {
  chatBubbleDevLog,
  chatBubbleLayoutDebugEnabled,
  computeLineMismatch,
  showChatBubbleLayoutAlert,
  tailCodePoints,
  type ChatBubbleLayoutSnapshot,
} from "@/lib/chat-bubble-layout-debug";
import { useI18n } from "@/lib/i18n";
import { presentMessageActions } from "@/lib/message-actions";
import type { LocaleId } from "@/lib/strings";
import { theme } from "@/lib/theme";

const ARABIC_SCRIPT_RE =
  /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;

type TextDirectionStyle = {
  textAlign: "left" | "right";
  writingDirection: "ltr" | "rtl";
};

function messageTextDirection(
  content: string,
  locale: LocaleId,
): TextDirectionStyle {
  const rtl = locale === "ar-iq" || ARABIC_SCRIPT_RE.test(content);
  return rtl
    ? { textAlign: "right", writingDirection: "rtl" }
    : { textAlign: "left", writingDirection: "ltr" };
}

type Props = {
  messageId: string;
  content: string;
  mine: boolean;
  locale: LocaleId;
};

/**
 * Chat thread bubble. Android 15+ text clip is fixed in react-native via
 * patches/react-native+0.81.5.patch (TextLayoutManager visual bounds — #54721).
 */
export function ChatMessageBubble({
  messageId,
  content,
  mine,
  locale,
}: Props): ReactElement {
  const { t } = useI18n();
  const dir = messageTextDirection(content, locale);
  const rtl = dir.writingDirection === "rtl";
  const debugLayout = chatBubbleLayoutDebugEnabled();

  const snapRef = useRef<ChatBubbleLayoutSnapshot>({
    messageId,
    contentLen: content.length,
    displayLen: content.length,
    tailCodePoints: tailCodePoints(content, 4),
    rtl,
    shellW: null,
    shellH: null,
    textBoxW: null,
    textBoxH: null,
    maxLineW: null,
    shellSlack: null,
    lines: [],
    mismatch: false,
  });

  const publishSnap = useCallback(() => {
    const snap = snapRef.current;
    const maxLineW =
      snap.lines.length > 0
        ? Math.max(...snap.lines.map((line) => line.width))
        : null;
    snap.maxLineW = maxLineW;
    snap.shellSlack =
      snap.shellW !== null && maxLineW !== null ? snap.shellW - maxLineW : null;
    snap.mismatch = computeLineMismatch(snap.shellW, snap.lines);
    chatBubbleDevLog("layout", {
      messageId: snap.messageId,
      shellW: snap.shellW,
      maxLineW: snap.maxLineW,
      shellSlack: snap.shellSlack,
      mismatch: snap.mismatch,
      lines: snap.lines,
      brand: Device.brand,
      model: Device.modelName,
      os: Device.osVersion,
    });
  }, []);

  const onShellLayout = useCallback(
    (w: number, h: number) => {
      snapRef.current.shellW = w;
      snapRef.current.shellH = h;
      publishSnap();
    },
    [publishSnap],
  );

  const onTextBoxLayout = useCallback(
    (w: number, h: number) => {
      snapRef.current.textBoxW = w;
      snapRef.current.textBoxH = h;
      publishSnap();
    },
    [publishSnap],
  );

  const onTextLayout = useCallback(
    (e: NativeSyntheticEvent<TextLayoutEventData>) => {
      snapRef.current.lines = e.nativeEvent.lines.map((line) => ({
        width: line.width,
        height: line.height,
        len: line.text.length,
        tail: line.text.slice(-8),
      }));
      publishSnap();
    },
    [publishSnap],
  );

  const showLayoutDebug = useCallback(() => {
    showChatBubbleLayoutAlert(snapRef.current);
  }, []);

  const onMessageLongPress = useCallback(() => {
    presentMessageActions({
      content,
      t,
      onLayoutDebug: debugLayout ? showLayoutDebug : undefined,
    });
  }, [content, t, debugLayout, showLayoutDebug]);

  const shellStyles = useMemo(
    () => [
      styles.shell,
      mine ? styles.shellMine : styles.shellThem,
    ],
    [mine],
  );

  const textStyles = useMemo(
    () => [
      styles.bubbleText,
      mine ? styles.bubbleTextMine : null,
      dir,
      Platform.OS === "android" ? styles.bubbleTextAndroid : null,
    ],
    [mine, dir],
  );

  return (
    <Pressable
      onLongPress={onMessageLongPress}
      delayLongPress={400}
      style={shellStyles}
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout;
        onShellLayout(width, height);
      }}
    >
      <Text
        style={textStyles}
        onLayout={(e) => {
          const { width, height } = e.nativeEvent.layout;
          onTextBoxLayout(width, height);
        }}
        onTextLayout={onTextLayout}
      >
        {content}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  shell: {
    alignSelf: "flex-start",
    overflow: "visible",
    paddingVertical: 10,
    paddingHorizontal: 14,
    maxWidth: "100%",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.surface,
  },
  shellMine: {
    backgroundColor: theme.primaryMid,
    borderColor: theme.primaryMid,
  },
  shellThem: {},
  bubbleText: {
    color: theme.text,
    fontSize: 15,
  },
  bubbleTextMine: {
    color: "#fff",
  },
  bubbleTextAndroid: {
    includeFontPadding: false,
    textBreakStrategy: "simple",
  },
});
