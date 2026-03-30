import React from "react";
import {
  View,
  StyleSheet,
  FlatList,
  Image,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useQuery } from "@tanstack/react-query";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";

interface EventItem {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  category: string;
  signupEnabled: boolean;
  recurrence?: string;
}

export default function EventsScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();

  const { data: events = [], isLoading, refetch, isRefetching } = useQuery<EventItem[]>({
    queryKey: ["/api/events"],
    staleTime: 1000 * 60 * 5,
  });

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "Islamic Studies":
        return theme.primary;
      case "Health & Wellness":
        return "#10B981";
      case "Social Event":
        return theme.accent;
      case "Charity Event":
        return "#C41E3A";
      case "Youth Program":
        return "#8B5CF6";
      case "Sisters Program":
        return "#EC4899";
      case "Community":
        return "#F59E0B";
      default:
        return theme.primary;
    }
  };

  const renderEventItem = ({ item, index }: { item: EventItem; index: number }) => (
    <Animated.View
      entering={FadeInDown.delay(index * 100).duration(400)}
      style={[styles.eventCard, { backgroundColor: theme.backgroundDefault }]}
    >
      <View style={styles.eventHeader}>
        <View style={[styles.dateBox, { backgroundColor: theme.primary }]}>
          <ThemedText type="caption" style={styles.dateBoxMonth}>
            {item.date.split(" ")[0].substring(0, 3).toUpperCase()}
          </ThemedText>
          <ThemedText type="h2" style={styles.dateBoxDay}>
            {item.date.split(" ")[1].replace(",", "")}
          </ThemedText>
        </View>
        <View style={styles.eventDetails}>
          <View style={styles.badgeRow}>
            <View style={[styles.categoryBadge, { backgroundColor: `${getCategoryColor(item.category)}15` }]}>
              <ThemedText type="caption" style={{ color: getCategoryColor(item.category), fontWeight: "600" }}>
                {item.category}
              </ThemedText>
            </View>
            {item.recurrence && item.recurrence !== "none" ? (
              <View style={[styles.categoryBadge, { backgroundColor: "rgba(168,85,247,0.12)" }]}>
                <Feather name="repeat" size={10} color="#A855F7" style={{ marginRight: 3 }} />
                <ThemedText type="caption" style={{ color: "#A855F7", fontWeight: "600" }}>
                  {item.recurrence === "daily" ? "Daily" : item.recurrence === "weekly" ? "Weekly" : item.recurrence === "biweekly" ? "Bi-weekly" : item.recurrence === "monthly" ? "Monthly" : item.recurrence}
                </ThemedText>
              </View>
            ) : null}
          </View>
          <ThemedText type="h4" style={[{ color: theme.text }, styles.eventTitle]}>
            {item.title}
          </ThemedText>
          <View style={styles.eventMeta}>
            <Feather name="clock" size={14} color={theme.textSecondary} />
            <ThemedText type="caption" style={{ color: theme.textSecondary }}>
              {item.time}
            </ThemedText>
          </View>
          <View style={styles.eventMeta}>
            <Feather name="map-pin" size={14} color={theme.textSecondary} />
            <ThemedText type="caption" style={{ color: theme.textSecondary }}>
              {item.location}
            </ThemedText>
          </View>
        </View>
      </View>

      <ThemedText type="small" style={[styles.eventDescription, { color: theme.textSecondary }]}>
        {item.description}
      </ThemedText>
    </Animated.View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Image
        source={require("../../assets/images/empty-events.png")}
        style={styles.emptyImage}
        resizeMode="contain"
      />
      <ThemedText type="h3" style={[styles.emptyTitle, { color: theme.text }]}>
        Events
      </ThemedText>
      <ThemedText type="body" style={[styles.emptyText, { color: theme.textSecondary }]}>
        Community events and programs will appear here. Pull down to refresh.
      </ThemedText>
    </View>
  );

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.backgroundRoot }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <FlatList
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      contentContainerStyle={{
        paddingTop: headerHeight + Spacing.lg,
        paddingBottom: tabBarHeight + Spacing.xl,
        paddingHorizontal: Spacing.lg,
        flexGrow: 1,
      }}
      scrollIndicatorInsets={{ bottom: insets.bottom }}
      data={events}
      renderItem={renderEventItem}
      keyExtractor={(item) => item.id}
      ListEmptyComponent={renderEmptyState}
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} tintColor={theme.primary} />
      }
      showsVerticalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  eventCard: {
    borderRadius: BorderRadius.md,
    padding: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  eventHeader: {
    flexDirection: "row",
    marginBottom: Spacing.md,
  },
  dateBox: {
    width: 60,
    height: 70,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.lg,
  },
  dateBoxMonth: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 10,
    fontWeight: "600",
  },
  dateBoxDay: {
    color: "#FFFFFF",
    marginTop: -2,
  },
  eventDetails: {
    flex: 1,
  },
  badgeRow: {
    flexDirection: "row",
    gap: Spacing.xs,
    flexWrap: "wrap",
    marginBottom: Spacing.xs,
  },
  categoryBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.xs,
  },
  eventTitle: {
    marginBottom: Spacing.xs,
  },
  eventMeta: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: Spacing.xs,
    gap: Spacing.xs,
  },
  eventDescription: {
    marginBottom: Spacing.lg,
    lineHeight: 22,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.xl,
  },
  emptyImage: {
    width: 180,
    height: 180,
    marginBottom: Spacing.xl,
    opacity: 0.8,
  },
  emptyTitle: {
    marginBottom: Spacing.sm,
    textAlign: "center",
  },
  emptyText: {
    textAlign: "center",
  },
});
