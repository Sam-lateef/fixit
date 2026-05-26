import * as Clipboard from "expo-clipboard";
import { ActionSheetIOS, Alert, Platform } from "react-native";

import type { StringKey } from "@/lib/strings";

type PresentMessageActionsParams = {
  content: string;
  t: (key: StringKey) => string;
  onLayoutDebug?: () => void;
};

/**
 * Long-press menu for chat bubbles. RN `selectable` on Android inside FlatList
 * often shows no system copy UI — we copy explicitly via expo-clipboard.
 */
export function presentMessageActions(
  params: PresentMessageActionsParams,
): void {
  const { content, t, onLayoutDebug } = params;

  const runCopy = (): void => {
    void Clipboard.setStringAsync(content).then(() => {
      Alert.alert(t("messageCopied"));
    });
  };

  if (Platform.OS === "ios") {
    const options = [
      t("copyMessage"),
      ...(onLayoutDebug !== undefined ? [t("layoutDebug")] : []),
      t("cancel"),
    ];
    const cancelButtonIndex = options.length - 1;
    ActionSheetIOS.showActionSheetWithOptions(
      {
        options,
        cancelButtonIndex,
        title: t("messageActionsTitle"),
      },
      (index) => {
        if (index === 0) {
          runCopy();
          return;
        }
        if (index === 1 && onLayoutDebug !== undefined) {
          onLayoutDebug();
        }
      },
    );
    return;
  }

  Alert.alert(t("messageActionsTitle"), undefined, [
    { text: t("copyMessage"), onPress: runCopy },
    ...(onLayoutDebug !== undefined
      ? [{ text: t("layoutDebug"), onPress: onLayoutDebug }]
      : []),
    { text: t("cancel"), style: "cancel" },
  ]);
}
