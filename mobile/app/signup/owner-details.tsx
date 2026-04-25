import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { SearchablePickerModal } from "@/components/SearchablePickerModal";
import { WizardProgressBar } from "@/components/WizardProgressBar";
import { apiFetch } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { IRAQ_OWNER_CITIES, ownerCityLabel } from "@/lib/taxonomy-labels";
import { theme } from "@/lib/theme";

export default function OwnerDetailsScreen(): React.ReactElement {
  const { t, locale } = useI18n();
  const { from } = useLocalSearchParams<{ from?: string }>();
  const fromProfile = from === "profile";
  const [name, setName] = useState("");
  const [city, setCity] = useState<string>(IRAQ_OWNER_CITIES[0]);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [cityPickerOpen, setCityPickerOpen] = useState(false);

  useEffect(() => {
    if (!fromProfile) {
      return;
    }
    void (async () => {
      try {
        const { user } = await apiFetch<{
          user: { name: string | null; city: string | null };
        }>("/api/v1/users/me");
        if (user.name) {
          setName(user.name);
        }
        const c = user.city?.trim();
        if (c && (IRAQ_OWNER_CITIES as readonly string[]).includes(c)) {
          setCity(c);
        } else if (c) {
          setCity("Other");
        }
      } catch {
        /* keep defaults */
      }
    })();
  }, [fromProfile]);

  return (
    <>
    <ScrollView contentContainerStyle={styles.screen}>
      {!fromProfile ? <WizardProgressBar step={1} totalSteps={2} /> : null}
      <Text style={styles.h1}>{t("name")}</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder={t("name")}
        placeholderTextColor={theme.mutedLight}
      />
      <Text style={styles.label}>{t("city")}</Text>
      <Pressable style={styles.select} onPress={() => setCityPickerOpen(true)}>
        <Text style={styles.selectText}>{ownerCityLabel(city, locale)}</Text>
      </Pressable>
      <Pressable
        style={[styles.btn, busy && styles.btnDisabled]}
        disabled={busy}
        onPress={() => {
          setErr("");
          const trimmed = name.trim();
          if (!trimmed) {
            setErr(t("nameRequired"));
            return;
          }
          setBusy(true);
          void (async () => {
            try {
              await apiFetch("/api/v1/users/me", {
                method: "PUT",
                body: JSON.stringify({ name: trimmed, city }),
              });
              router.push({
                pathname: "/signup/owner-location",
                params: fromProfile
                  ? { city, from: "profile" }
                  : { city },
              });
            } catch (e) {
              setErr(e instanceof Error ? e.message : "Failed");
            } finally {
              setBusy(false);
            }
          })();
        }}
      >
        <Text style={styles.btnText}>{t("continue")}</Text>
      </Pressable>
      {err ? <Text style={styles.err}>{err}</Text> : null}
    </ScrollView>
    <SearchablePickerModal
      visible={cityPickerOpen}
      title={t("city")}
      items={IRAQ_OWNER_CITIES.map((c) => ({
        id: c,
        label: ownerCityLabel(c, locale),
      }))}
      onSelect={(id) => {
        setCity(id);
        setCityPickerOpen(false);
      }}
      onRequestClose={() => setCityPickerOpen(false)}
      cancelLabel={t("cancel")}
      searchPlaceholder={t("search")}
    />
    </>
  );
}

const styles = StyleSheet.create({
  screen: { padding: 20, backgroundColor: theme.surface },
  h1: { fontSize: 22, fontWeight: "700", color: theme.text, textAlign: "left" },
  label: { marginTop: 16, color: theme.text, fontSize: 15, fontWeight: "600", textAlign: "left" },
  input: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: theme.radiusMd,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: theme.text,
    textAlign: "left",
  },
  select: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: theme.radiusMd,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: theme.surface,
  },
  selectText: { fontSize: 16, color: theme.text, textAlign: "left" },
  btn: {
    marginTop: 24,
    backgroundColor: theme.primaryMid,
    paddingVertical: 14,
    borderRadius: theme.radiusMd,
    alignItems: "center",
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  err: { marginTop: 12, color: theme.danger, fontSize: 13 },
});
