import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { theme } from "@/lib/theme";

export type SearchablePickerItem = { id: string; label: string };

type Props = {
  visible: boolean;
  title: string;
  items: SearchablePickerItem[];
  onSelect: (id: string) => void;
  onRequestClose: () => void;
  cancelLabel: string;
  searchPlaceholder: string;
  busy?: boolean;
  /** When false, hides the search field (short lists, e.g. language). */
  showSearch?: boolean;
  /** Highlights the current selection in the list. */
  selectedId?: string;
};

export function SearchablePickerModal({
  visible,
  title,
  items,
  onSelect,
  onRequestClose,
  cancelLabel,
  searchPlaceholder,
  busy,
  showSearch,
  selectedId,
}: Props): React.ReactElement {
  const [query, setQuery] = useState("");
  const searchOn = showSearch !== false;

  useEffect(() => {
    if (!visible) {
      setQuery("");
    }
  }, [visible]);

  const q = query.trim().toLowerCase();
  const filtered =
    !searchOn || q.length === 0
      ? items
      : items.filter((it) => it.label.toLowerCase().includes(q));

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onRequestClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          {searchOn ? (
            <TextInput
              style={styles.search}
              placeholder={searchPlaceholder}
              placeholderTextColor={theme.mutedLight}
              value={query}
              onChangeText={setQuery}
            />
          ) : null}
          <ScrollView style={styles.list} keyboardShouldPersistTaps="handled">
            {filtered.map((it) => (
              <Pressable
                key={it.id}
                style={[
                  styles.row,
                  selectedId === it.id ? styles.rowSelected : null,
                ]}
                onPress={() => {
                  onSelect(it.id);
                  onRequestClose();
                }}
              >
                <Text style={styles.rowText}>{it.label}</Text>
                {selectedId === it.id ? (
                  <Text style={styles.rowCheck}>✓</Text>
                ) : null}
              </Pressable>
            ))}
          </ScrollView>
          {busy ? (
            <View style={styles.loading}>
              <ActivityIndicator color={theme.primaryMid} />
            </View>
          ) : null}
          <Pressable style={styles.cancelBtn} onPress={onRequestClose}>
            <Text style={styles.cancelText}>{cancelLabel}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "flex-end",
  },
  card: {
    maxHeight: "85%",
    backgroundColor: theme.surface,
    borderTopLeftRadius: theme.radiusLg,
    borderTopRightRadius: theme.radiusLg,
    padding: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: theme.text,
    marginBottom: 10,
  },
  search: {
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: theme.radiusMd,
    padding: 12,
    fontSize: 16,
    color: theme.text,
    marginBottom: 8,
    backgroundColor: theme.surface,
  },
  list: { maxHeight: 440 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  rowSelected: {
    backgroundColor: theme.primaryLight,
  },
  rowText: { fontSize: 16, color: theme.text, flex: 1 },
  rowCheck: {
    fontSize: 16,
    fontWeight: "700",
    color: theme.primaryMid,
    marginLeft: 8,
  },
  loading: { paddingVertical: 12, alignItems: "center" },
  cancelBtn: {
    marginTop: 12,
    paddingVertical: 12,
    borderRadius: theme.radiusMd,
    alignItems: "center",
    backgroundColor: theme.chip,
  },
  cancelText: { color: theme.text, fontWeight: "700" },
});
