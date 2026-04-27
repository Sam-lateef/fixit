import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  GestureHandlerRootView,
  Pressable as GHPressable,
} from "react-native-gesture-handler";

import { theme } from "@/lib/theme";

export type MultiSelectPickerItem = { id: string; label: string };

type Props = {
  visible: boolean;
  title: string;
  items: MultiSelectPickerItem[];
  initialSelected: string[];
  onSave: (selectedIds: string[]) => void;
  onRequestClose: () => void;
  saveLabel: string;
  cancelLabel: string;
  searchPlaceholder: string;
  busy?: boolean;
  /** Optional empty-state text when no items match the query. */
  emptyLabel?: string;
  /** "multi" (default): tap toggles. "single": tap replaces selection. */
  mode?: "single" | "multi";
  /** When false, hides the search field (short lists, e.g. year picker). */
  showSearch?: boolean;
};

/**
 * Multi-select picker as a bottom sheet. Has search, multi-select rows,
 * and an explicit Save button. Wraps content in GestureHandlerRootView so
 * GHPressable rows still receive taps inside Modal on Android (Modal renders
 * in a separate native window which the app-level GestureHandlerRootView
 * doesn't reach into).
 */
export function MultiSelectPickerModal({
  visible,
  title,
  items,
  initialSelected,
  onSave,
  onRequestClose,
  saveLabel,
  cancelLabel,
  searchPlaceholder,
  busy,
  emptyLabel,
  mode = "multi",
  showSearch = true,
}: Props): React.ReactElement {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set(initialSelected));
  const isSingle = mode === "single";

  // When the modal opens, reseed the local selection from props and clear the
  // search field. When it closes, leave state alone — useEffect on `visible`
  // is enough.
  useEffect(() => {
    if (visible) {
      setSelected(new Set(initialSelected));
      setQuery("");
    }
  }, [visible, initialSelected]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length === 0) return items;
    return items.filter((it) => it.label.toLowerCase().includes(q));
  }, [items, query]);

  const toggle = (id: string): void => {
    if (isSingle) {
      // Single-select: replace previous selection. Tapping the same row
      // again is a no-op (single-select usually doesn't allow deselection).
      setSelected(new Set([id]));
      return;
    }
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      presentationStyle="overFullScreen"
      onRequestClose={onRequestClose}
    >
      <GestureHandlerRootView style={styles.root}>
        <KeyboardAvoidingView
          style={styles.backdrop}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={0}
        >
          <Pressable style={styles.dismissArea} onPress={onRequestClose} />
          <View style={styles.card}>
            <View style={styles.header}>
              <View style={{ width: 24 }} />
              <Text style={styles.title}>{title}</Text>
              <Pressable onPress={onRequestClose} hitSlop={8}>
                <Text style={styles.close}>✕</Text>
              </Pressable>
            </View>

            {showSearch ? (
              <TextInput
                style={styles.search}
                placeholder={searchPlaceholder}
                placeholderTextColor={theme.mutedLight}
                value={query}
                onChangeText={setQuery}
                autoCorrect={false}
                autoCapitalize="none"
              />
            ) : null}

            <ScrollView
              style={styles.list}
              contentContainerStyle={styles.listContent}
              keyboardShouldPersistTaps="always"
              keyboardDismissMode="none"
              // @ts-expect-error iOS-only
              delaysContentTouches={false}
            >
              {filtered.length === 0 && emptyLabel ? (
                <Text style={styles.empty}>{emptyLabel}</Text>
              ) : null}
              {filtered.map((it) => {
                const on = selected.has(it.id);
                return (
                  <GHPressable
                    key={it.id}
                    style={[styles.row, on && styles.rowOn]}
                    onPress={() => toggle(it.id)}
                  >
                    <Text style={[styles.rowText, on && styles.rowTextOn]}>
                      {it.label}
                    </Text>
                    {on ? <Text style={styles.rowCheck}>✓</Text> : null}
                  </GHPressable>
                );
              })}
            </ScrollView>

            {busy ? (
              <View style={styles.loading}>
                <ActivityIndicator color={theme.primaryMid} />
              </View>
            ) : null}

            <View style={styles.footer}>
              <Text style={styles.count}>
                {!isSingle && selected.size > 0
                  ? `${selected.size} selected`
                  : ""}
              </Text>
              <View style={styles.footerBtns}>
                <Pressable style={styles.cancelBtn} onPress={onRequestClose}>
                  <Text style={styles.cancelText}>{cancelLabel}</Text>
                </Pressable>
                <Pressable
                  style={styles.saveBtn}
                  onPress={() => onSave(Array.from(selected))}
                >
                  <Text style={styles.saveText}>{saveLabel}</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  dismissArea: { flex: 1 },
  card: {
    maxHeight: "85%",
    backgroundColor: theme.surface,
    borderTopLeftRadius: theme.radiusLg,
    borderTopRightRadius: theme.radiusLg,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.border,
  },
  title: { fontSize: 17, fontWeight: "700", color: theme.text },
  close: { fontSize: 18, color: theme.mutedLight, paddingHorizontal: 4 },
  search: {
    margin: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: theme.radiusMd,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: theme.text,
    backgroundColor: theme.bg,
  },
  list: { flexGrow: 0, flexShrink: 1 },
  listContent: { paddingHorizontal: 16, paddingBottom: 8 },
  empty: {
    paddingVertical: 24,
    textAlign: "center",
    color: theme.muted,
    fontSize: 14,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: theme.radiusMd,
    borderWidth: 1,
    borderColor: theme.border,
    marginBottom: 8,
    backgroundColor: theme.bg,
  },
  rowOn: {
    borderColor: theme.primaryMid,
    backgroundColor: "rgba(46, 125, 50, 0.08)",
  },
  rowText: { fontSize: 16, fontWeight: "600", color: theme.text, flex: 1 },
  rowTextOn: { color: theme.primaryMid },
  rowCheck: { fontSize: 16, fontWeight: "700", color: theme.primaryMid, marginLeft: 8 },
  loading: { paddingVertical: 12, alignItems: "center" },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.border,
  },
  count: { fontSize: 13, color: theme.muted, fontWeight: "600" },
  footerBtns: { flexDirection: "row", gap: 10 },
  cancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: theme.radiusMd,
    backgroundColor: theme.chip,
  },
  cancelText: { color: theme.text, fontWeight: "700", fontSize: 14 },
  saveBtn: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: theme.radiusMd,
    backgroundColor: theme.primaryMid,
  },
  saveText: { color: "#fff", fontWeight: "700", fontSize: 14 },
});
