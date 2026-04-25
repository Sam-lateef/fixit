import { router, useLocalSearchParams, useNavigation } from "expo-router";
import { useEffect, useLayoutEffect } from "react";
import { View } from "react-native";

import { OwnerPostEditor } from "@/components/OwnerPostEditor";
import { useI18n } from "@/lib/i18n";

export default function OwnerEditPostScreen(): React.ReactElement {
  const { id, view } = useLocalSearchParams<{
    id: string | string[];
    view?: string;
  }>();
  const navigation = useNavigation();
  const { t } = useI18n();
  const postId = Array.isArray(id) ? id[0] : id;
  const readOnly = view === "1";

  useLayoutEffect(() => {
    navigation.setOptions({ title: readOnly ? t("viewPost") : t("editPost") });
  }, [navigation, t, readOnly]);

  useEffect(() => {
    if (!postId || typeof postId !== "string") {
      router.back();
    }
  }, [postId]);

  if (!postId || typeof postId !== "string") {
    return <View style={{ flex: 1 }} />;
  }

  return <OwnerPostEditor editPostId={postId} readOnly={readOnly} />;
}
