import { router, type Href, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { WizardProgressBar } from "@/components/WizardProgressBar";
import { useI18n } from "@/lib/i18n";
import { asShopType } from "@/lib/shop-type";
import { logSignup } from "@/lib/signup-log";
import { parseSignupWizardData } from "@/lib/signup-wizard-data";
import {
  REPAIR_CATEGORY_SLUGS,
  repairCategoryLabel,
} from "@/lib/taxonomy-labels";
import { theme } from "@/lib/theme";

export default function ShopRepairCatsStep(): React.ReactElement {
  const { t, locale } = useI18n();
  const raw = useLocalSearchParams<{ data?: string }>();
  const prev = parseSignupWizardData(raw.data);
  const shopType = asShopType(prev.shopType);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [err, setErr] = useState("");

  useEffect(() => {
    logSignup("shopRepairCats.mount", {
      shopType,
      offersRepair: Boolean(prev.offersRepair),
    });
    // prev is stable; we only need to log on mount + shopType change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shopType]);

  // Skip this screen for TOWING shops — the repair-category taxonomy does not
  // apply. Also skip if the user didn't opt-in to repair.
  useEffect(() => {
    const skipForType = shopType === "TOWING";
    if (skipForType || !Boolean(prev.offersRepair)) {
      const data = raw.data as string;
      if (!skipForType && Boolean(prev.offersParts)) {
        router.replace({ pathname: "/signup/shop-parts-cats" as Href, params: { data } } as never);
      } else {
        router.replace({ pathname: "/signup/shop-location" as Href, params: { data } } as never);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shopType]);

  function toggle(cat: string): void {
    setSelected((p) => {
      const next = new Set(p);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  }

  function handleContinue(): void {
    if (selected.size === 0) {
      setErr(t("repairCategoryRequired"));
      return;
    }
    setErr("");
    const merged = { ...prev, repairCategories: Array.from(selected) };
    const data = JSON.stringify(merged);

    if (Boolean(prev.offersParts)) {
      logSignup("shopRepairCats.continue", {
        to: "/signup/shop-parts-cats",
        count: selected.size,
      });
      router.push({ pathname: "/signup/shop-parts-cats" as Href, params: { data } } as never);
    } else {
      logSignup("shopRepairCats.continue", {
        to: "/signup/shop-location",
        count: selected.size,
      });
      router.push({ pathname: "/signup/shop-location" as Href, params: { data } } as never);
    }
  }

  if (!Boolean(prev.offersRepair) || shopType === "TOWING") {
    return <View />;
  }

  return (
    <ScrollView contentContainerStyle={s.container}>
      <WizardProgressBar step={3} />

      <Text style={s.heading}>{t("repairCategories")}</Text>

      <View style={s.chips}>
        {REPAIR_CATEGORY_SLUGS.map((cat) => {
          const on = selected.has(cat);
          return (
            <Pressable
              key={cat}
              style={[s.chip, on && s.chipOn]}
              onPress={() => toggle(cat)}
            >
              <Text style={[s.chipText, on && s.chipTextOn]}>
                {repairCategoryLabel(cat, locale)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {err !== "" ? <Text style={s.err}>{err}</Text> : null}

      <Pressable
        style={[s.btn, selected.size === 0 && s.btnOff]}
        disabled={selected.size === 0}
        onPress={handleContinue}
      >
        <Text style={s.btnText}>{t("continue")}</Text>
      </Pressable>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { padding: 20, paddingBottom: 40, backgroundColor: theme.surface },
  heading: { fontSize: 22, fontWeight: "700", color: theme.text, textAlign: "left" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 16 },
  chip: {
    paddingVertical: 10,
    // Extra horizontal padding + overflow:'visible' guards Arabic last-char
    // clipping on Samsung One UI 8 where RN measures text width slightly
    // narrower than it rasterizes (See chat/bubble + signup chip files).
    paddingHorizontal: 20,
    borderRadius: 20,
    backgroundColor: theme.chip,
    overflow: "visible",
  },
  chipOn: { backgroundColor: theme.primary },
  chipText: { fontSize: 14, color: theme.text },
  chipTextOn: { color: "#fff", fontWeight: "600" },
  btn: {
    marginTop: 28,
    backgroundColor: theme.primaryMid,
    paddingVertical: 14,
    borderRadius: theme.radiusMd,
    alignItems: "center",
  },
  btnOff: { opacity: 0.4 },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  err: { marginTop: 12, color: theme.danger, fontSize: 13 },
});
