import type { ReactElement } from "react";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";

import { BrandHeaderGradient } from "@/components/BrandHeaderGradient";
import { PostRemoteImage } from "@/components/PostRemoteImage";
import { useI18n } from "@/lib/i18n";
import { shopDevLog, shopDevSummarizeUrl } from "@/lib/shop-profile-debug";
import { uploadPhotoUri } from "@/lib/upload-photo";
import { theme } from "@/lib/theme";

type ShopProfileHeroProps = {
  coverImageUrl: string | null;
  /** Editable: controlled shop / business name on the hero. */
  shopNameDraft: string;
  onShopNameDraftChange: (value: string) => void;
  onCommitShopName: () => void;
  editable: boolean;
  /** Called after a new cover image is uploaded (parent persists URL). */
  onCoverUrlCommitted?: (url: string) => Promise<void>;
};

/**
 * Full-width hero: cover image (or brand gradient), bottom scrim, shop name on top.
 * When `editable`, name is editable and a camera control updates the cover via upload.
 */
export function ShopProfileHero(props: ShopProfileHeroProps): ReactElement {
  const { t, isRtl } = useI18n();
  const inputDirection = isRtl
    ? ({ textAlign: "right", writingDirection: "rtl" } as const)
    : ({ textAlign: "left", writingDirection: "ltr" } as const);
  const { width } = useWindowDimensions();
  const height = useMemo(() => Math.min(300, Math.round(width * 0.52)), [width]);
  const [coverBusy, setCoverBusy] = useState(false);

  const pickCover = (): void => {
    if (!props.editable || !props.onCoverUrlCommitted) {
      return;
    }
    void (async () => {
      shopDevLog("hero pickCover: open picker");
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      shopDevLog("hero pickCover: mediaLibrary perm", { granted: perm.granted });
      if (!perm.granted) {
        Alert.alert(t("errorTitle"), t("photoPermissionNeeded"));
        return;
      }
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.85,
      });
      if (res.canceled || !res.assets[0]?.uri) {
        shopDevLog("hero pickCover: canceled or no uri", {
          canceled: res.canceled,
        });
        return;
      }
      const asset = res.assets[0];
      shopDevLog("hero pickCover: asset", {
        mimeType: asset.mimeType ?? "(none)",
        width: asset.width,
        height: asset.height,
      });
      setCoverBusy(true);
      try {
        const url = await uploadPhotoUri(asset.uri, {
          mimeType: asset.mimeType,
        });
        shopDevLog("hero pickCover: upload returned", {
          publicUrl: shopDevSummarizeUrl(url),
        });
        shopDevLog("hero pickCover: onCoverUrlCommitted start");
        await props.onCoverUrlCommitted?.(url);
        shopDevLog("hero pickCover: onCoverUrlCommitted done");
      } catch (e) {
        shopDevLog("hero pickCover: error", {
          message: e instanceof Error ? e.message : String(e),
        });
        Alert.alert(
          t("errorTitle"),
          e instanceof Error ? e.message : t("coverUploadFailed"),
        );
      } finally {
        setCoverBusy(false);
      }
    })();
  };

  const hasCover = Boolean(props.coverImageUrl?.trim());

  return (
    <View style={[styles.root, { height }]}>
      {hasCover && props.coverImageUrl ? (
        <PostRemoteImage
          key={props.coverImageUrl}
          uri={props.coverImageUrl}
          style={StyleSheet.absoluteFillObject}
          contentFit="cover"
        />
      ) : (
        <BrandHeaderGradient
          variant="hero"
          style={[StyleSheet.absoluteFillObject, { minHeight: height }]}
        />
      )}

      <LinearGradient
        colors={["rgba(0,0,0,0.05)", "rgba(0,0,0,0.78)"]}
        locations={[0.35, 1]}
        style={StyleSheet.absoluteFillObject}
      />

      {props.editable && props.onCoverUrlCommitted ? (
        <Pressable
          style={({ pressed }) => [
            styles.cameraFab,
            pressed && styles.cameraFabPressed,
            coverBusy && styles.cameraFabDisabled,
          ]}
          onPress={pickCover}
          disabled={coverBusy}
          accessibilityRole="button"
          accessibilityLabel={t("changeCoverPhoto")}
        >
          {coverBusy ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <FontAwesome name="camera" size={18} color="#fff" />
          )}
        </Pressable>
      ) : null}

      <View style={styles.bottomBlock}>
        {props.editable ? (
          <TextInput
            style={[styles.heroNameInput, inputDirection]}
            value={props.shopNameDraft}
            onChangeText={props.onShopNameDraftChange}
            onEndEditing={props.onCommitShopName}
            onBlur={props.onCommitShopName}
            onSubmitEditing={() => {
              props.onCommitShopName();
              Keyboard.dismiss();
            }}
            blurOnSubmit
            placeholder={t("shopNameOnHero")}
            placeholderTextColor="rgba(255,255,255,0.45)"
            returnKeyType="done"
            maxLength={120}
          />
        ) : (
          <Text style={styles.heroNameText} numberOfLines={2}>
            {props.shopNameDraft.trim().length > 0 ? props.shopNameDraft : "—"}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    width: "100%",
    position: "relative",
    backgroundColor: theme.primary,
  },
  bottomBlock: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingBottom: 22,
    paddingTop: 12,
  },
  heroNameInput: {
    fontSize: 26,
    fontWeight: "800",
    color: "#fff",
    paddingVertical: 4,
    paddingHorizontal: 0,
    textShadowColor: "rgba(0,0,0,0.35)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
    textAlign: "left",
  },
  heroNameText: {
    fontSize: 26,
    fontWeight: "800",
    color: "#fff",
    textShadowColor: "rgba(0,0,0,0.35)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
    textAlign: "left",
  },
  cameraFab: {
    position: "absolute",
    top: 16,
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
  },
  cameraFabPressed: { opacity: 0.85 },
  cameraFabDisabled: { opacity: 0.7 },
});
