import { StyleSheet, Text, View } from "react-native";

import { useI18n } from "@/lib/i18n";
import { theme } from "@/lib/theme";

const DEFAULT_TOTAL_STEPS = 6;

export function WizardProgressBar({
  step,
  totalSteps,
}: {
  step: number;
  totalSteps?: number;
}): React.ReactElement {
  const { t } = useI18n();
  const n = totalSteps ?? DEFAULT_TOTAL_STEPS;
  return (
    <View style={s.wrap}>
      <Text style={s.label}>
        {t("step")} {step} {t("of")} {n}
      </Text>
      <View style={s.track}>
        {Array.from({ length: n }, (_, i) => (
          <View
            key={i}
            style={[s.segment, i < step ? s.filled : s.empty]}
          />
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { marginBottom: 20 },
  label: { color: theme.muted, fontSize: 13, fontWeight: "600", marginBottom: 8 },
  track: { flexDirection: "row", gap: 4 },
  segment: { flex: 1, height: 4, borderRadius: 2 },
  filled: { backgroundColor: theme.primaryMid },
  empty: { backgroundColor: theme.border },
});
