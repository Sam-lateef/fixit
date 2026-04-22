import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useState, type ReactElement } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
  type StyleProp,
  type ImageStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PostRemoteImage } from "@/components/PostRemoteImage";
import { useI18n } from "@/lib/i18n";
import { theme } from "@/lib/theme";

type PostImageLightboxProps = {
  uri: string;
  thumbnailStyle: StyleProp<ImageStyle>;
};

/**
 * Thumbnail that opens a full-screen preview on tap (same loading/auth as {@link PostRemoteImage}).
 */
export function PostImageLightbox({
  uri,
  thumbnailStyle,
}: PostImageLightboxProps): ReactElement {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const { width: winW, height: winH } = useWindowDimensions();
  const [open, setOpen] = useState(false);

  const maxW = winW * 0.96;
  const maxH = winH * 0.84;

  const close = (): void => {
    setOpen(false);
  };

  return (
    <>
      <Pressable
        accessibilityRole="imagebutton"
        accessibilityLabel={t("viewPhotoFullSize")}
        onPress={() => {
          setOpen(true);
        }}
      >
        <PostRemoteImage uri={uri} style={thumbnailStyle} />
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={close}
        statusBarTranslucent
      >
        <View style={styles.modalRoot} accessibilityViewIsModal>
          <Pressable
            style={styles.backdrop}
            onPress={close}
            accessibilityLabel={t("closePhotoPreview")}
            accessibilityRole="button"
          />
          <View
            pointerEvents="box-none"
            style={styles.imageLayer}
            importantForAccessibility="no-hide-descendants"
          >
            <View
              onStartShouldSetResponder={() => true}
              style={styles.imageFrame}
            >
              <PostRemoteImage
                uri={uri}
                contentFit="contain"
                style={{ width: maxW, height: maxH }}
              />
            </View>
          </View>
          <Pressable
            onPress={close}
            style={[
              styles.closeFab,
              { top: insets.top + 10, right: 12 + insets.right },
            ]}
            accessibilityLabel={t("closePhotoPreview")}
            accessibilityRole="button"
          >
            <View style={styles.closeFabInner}>
              <FontAwesome name="times" size={20} color={theme.text} />
            </View>
          </Pressable>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.92)",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  imageLayer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },
  imageFrame: {
    maxWidth: "100%",
    maxHeight: "100%",
  },
  closeFab: {
    position: "absolute",
    zIndex: 2,
  },
  closeFabInner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.95)",
    alignItems: "center",
    justifyContent: "center",
  },
});
