import { Image as ExpoImage } from "expo-image";
import { useEffect, useState, type ReactElement } from "react";
import {
  Image as RNImage,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ImageStyle,
} from "react-native";

import { getToken } from "@/lib/auth-storage";
import {
  imageUriNeedsJwtAuth,
  rewriteR2DevImageUrlToApiProxy,
} from "@/lib/rewrite-r2-image-url";
import { theme } from "@/lib/theme";

type PostRemoteImageProps = {
  uri: string;
  style: StyleProp<ImageStyle>;
  /** Default `cover` (thumbnails). Use `contain` for full-screen preview. */
  contentFit?: "cover" | "contain";
};

const REMOTE_HEADERS: Record<string, string> = {
  Accept: "image/avif,image/webp,image/apng,image/jpeg,image/png,*/*;q=0.8",
  "User-Agent":
    "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36 FixIt/1.0",
};

type Loader = "expo" | "rn" | "failed";

/**
 * Remote post photos: prefers API proxy for broken r2.dev TLS, then expo-image, then RN Image.
 */
export function PostRemoteImage({
  uri,
  style,
  contentFit,
}: PostRemoteImageProps): ReactElement {
  const fit = contentFit === "contain" ? "contain" : "cover";
  const displayUri = rewriteR2DevImageUrlToApiProxy(uri);
  const needsAuth = imageUriNeedsJwtAuth(displayUri);
  const [authHeaders, setAuthHeaders] = useState<Record<string, string> | null>(
    needsAuth ? null : {},
  );
  const [loader, setLoader] = useState<Loader>("expo");

  useEffect(() => {
    if (!needsAuth) {
      setAuthHeaders({});
      return;
    }
    void (async () => {
      const t = await getToken();
      setAuthHeaders(t ? { Authorization: `Bearer ${t}` } : {});
    })();
  }, [needsAuth]);

  if (needsAuth && authHeaders === null) {
    return <View style={[style, styles.skeleton]} />;
  }

  const mergedHeaders = { ...REMOTE_HEADERS, ...authHeaders };

  if (loader === "failed") {
    return (
      <View style={[style, styles.fallback]}>
        <Text style={styles.fallbackText}>×</Text>
      </View>
    );
  }

  if (loader === "rn") {
    return (
      <RNImage
        accessibilityIgnoresInvertColors
        source={{ uri: displayUri, headers: mergedHeaders }}
        style={style}
        resizeMode={fit}
        onError={(e) => {
          if (__DEV__) {
            console.warn(
              "[PostRemoteImage] RN failed:",
              displayUri,
              e.nativeEvent.error,
            );
          }
          setLoader("failed");
        }}
      />
    );
  }

  return (
    <ExpoImage
      source={{ uri: displayUri, headers: mergedHeaders }}
      style={style}
      contentFit={fit}
      transition={0}
      cachePolicy="none"
      onError={(event) => {
        if (__DEV__) {
          console.warn(
            "[PostRemoteImage] expo-image failed, trying RN:",
            displayUri,
            event.error,
          );
        }
        setLoader("rn");
      }}
    />
  );
}

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: theme.chip,
  },
  fallback: {
    backgroundColor: theme.chip,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: theme.border,
  },
  fallbackText: {
    color: theme.muted,
    fontSize: 18,
    fontWeight: "700",
  },
});
