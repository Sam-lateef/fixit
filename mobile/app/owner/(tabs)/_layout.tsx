import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Tabs } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { type GestureResponderEvent, Pressable, StyleSheet, View } from "react-native";

import { OwnerTabHeaderBackground } from "@/components/BrandHeaderGradient";
import { useI18n } from "@/lib/i18n";
import { theme } from "@/lib/theme";

export default function OwnerTabsLayout(): React.ReactElement {
  const { t } = useI18n();

  return (
    <>
      <StatusBar style="light" />
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: theme.primaryMid,
          tabBarInactiveTintColor: theme.mutedLight,
          headerTransparent: true,
          headerBackground: () => <OwnerTabHeaderBackground />,
          headerStyle: { backgroundColor: "transparent" },
          headerTintColor: "#fff",
          headerTitleStyle: { color: "#fff", fontWeight: "700" },
          headerShadowVisible: false,
        tabBarStyle: {
          backgroundColor: theme.surface,
          borderTopColor: theme.border,
          height: 60,
          paddingBottom: 8,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t("myPosts"),
          tabBarIcon: ({ color }) => (
            <FontAwesome name="list-alt" size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="create"
        options={{
          title: t("newPost"),
          tabBarButton: ({ onPress }) => (
            <Pressable
              style={styles.fabWrap}
              onPress={(e: GestureResponderEvent) => onPress?.(e)}
            >
              <View style={styles.fab}>
                <FontAwesome name="plus" size={20} color="#fff" />
              </View>
            </Pressable>
          ),
        }}
      />
      <Tabs.Screen
        name="inbox"
        options={{
          title: t("inbox"),
          tabBarIcon: ({ color }) => (
            <FontAwesome name="envelope" size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t("profile"),
          tabBarIcon: ({ color }) => (
            <FontAwesome name="user" size={22} color={color} />
          ),
        }}
      />
      </Tabs>
    </>
  );
}

const styles = StyleSheet.create({
  fabWrap: {
    top: -14,
    justifyContent: "center",
    alignItems: "center",
  },
  fab: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#1B4332",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
});
