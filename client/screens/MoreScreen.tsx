import React from "react";
import {
  View,
  StyleSheet,
  Pressable,
  ScrollView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";

interface MenuItem {
  id: string;
  icon: keyof typeof Feather.glyphMap;
  label: string;
  description: string;
  route: string;
  colors: string[];
}

const MENU_ITEMS: MenuItem[] = [
  {
    id: "events",
    icon: "calendar",
    label: "Upcoming Events",
    description: "View community events and activities",
    route: "Events",
    colors: ["#00B4A0", "#00D4AA"],
  },
  {
    id: "alerts",
    icon: "bell",
    label: "Alerts & Notifications",
    description: "Manage your notification preferences",
    route: "Notifications",
    colors: ["#1E88E5", "#1565C0"],
  },
  {
    id: "ramadan",
    icon: "moon",
    label: "Ramadan 2026 Timetable",
    description: "Prayer schedule for Ramadan",
    route: "RamadanTimetable",
    colors: ["#9C27B0", "#7B1FA2"],
  },
  {
    id: "imam",
    icon: "users",
    label: "Imam Volunteer Sign-Up",
    description: "Sign up to lead prayers",
    route: "ImamSignup",
    colors: ["#FFB300", "#FFA000"],
  },
  {
    id: "eventSignup",
    icon: "edit-3",
    label: "Signup: Events@ICKC",
    description: "RSVP for community events",
    route: "EventSignup",
    colors: ["#8E24AA", "#6A1B9A"],
  },
];

export default function MoreScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  let tabBarHeight = 0;
  try { tabBarHeight = useBottomTabBarHeight(); } catch {}
  const navigation = useNavigation<any>();
  const { theme } = useTheme();

  const handlePress = (route: string) => {
    Haptics.selectionAsync();
    navigation.navigate(route);
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      contentContainerStyle={{
        paddingTop: headerHeight + Spacing.lg,
        paddingBottom: Math.max(tabBarHeight, insets.bottom) + Spacing["2xl"],
        paddingHorizontal: Spacing.lg,
      }}
      showsVerticalScrollIndicator={false}
    >
      <Animated.View entering={FadeInDown.delay(100).duration(500)}>
        <ThemedText type="h3" style={[styles.title, { color: theme.text }]}>
          More Options
        </ThemedText>
        <ThemedText type="body" style={[styles.subtitle, { color: theme.textSecondary }]}>
          Access additional features and settings
        </ThemedText>
      </Animated.View>

      <View style={styles.menuList}>
        {MENU_ITEMS.map((item, index) => (
          <Animated.View
            key={item.id}
            entering={FadeInDown.delay(150 + index * 50).duration(500)}
          >
            <Pressable
              onPress={() => handlePress(item.route)}
              style={({ pressed }) => [
                styles.menuItem,
                { backgroundColor: theme.backgroundDefault, opacity: pressed ? 0.8 : 1 },
              ]}
              testID={`menu-${item.id}`}
            >
              <LinearGradient
                colors={item.colors as [string, string]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.iconContainer}
              >
                <Feather name={item.icon} size={22} color="#FFFFFF" />
              </LinearGradient>
              <View style={styles.textContainer}>
                <ThemedText type="body" style={[styles.label, { color: theme.text }]}>
                  {item.label}
                </ThemedText>
                <ThemedText type="caption" style={[styles.description, { color: theme.textSecondary }]}>
                  {item.description}
                </ThemedText>
              </View>
              <Feather name="chevron-right" size={20} color={theme.textSecondary} />
            </Pressable>
          </Animated.View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  title: {
    marginBottom: Spacing.xs,
  },
  subtitle: {
    marginBottom: Spacing.xl,
  },
  menuList: {
    gap: Spacing.md,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  textContainer: {
    flex: 1,
  },
  label: {
    marginBottom: 2,
  },
  description: {
    fontSize: 12,
  },
});
