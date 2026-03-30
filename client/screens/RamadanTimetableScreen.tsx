import React from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  ImageBackground,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { useQuery } from "@tanstack/react-query";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Shadows } from "@/constants/theme";

interface TimetableDay {
  day: number;
  date: string;
  dayName: string;
  fajrIqama: string;
  ishaIqama: string;
  isSaturday: boolean;
  isDaylightChange: boolean;
}

const EID_COLORS = {
  bg: "#E8F5E9",
  accent: "#4CAF50",
};

const RAMADAN_COLORS = {
  primary: "#00B4A0",
  secondary: "#00A5FF",
  gold: "#D4AF37",
  goldDark: "#B8860B",
  verseBg: "#F0FBF9",
  purple: "#00A5FF",
  rowEven: "#F0FBF9",
  rowOdd: "#FFFFFF",
  saturdayBg: "#FFF3D4",
  saturdayAccent: "#D4AF37",
  daylightBg: "#E0F7FF",
  daylightAccent: "#00A5FF",
};

function subtractMinutes(timeStr: string, minutes: number): string {
  const match = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return timeStr;
  let hours = parseInt(match[1], 10);
  const mins = parseInt(match[2], 10);
  const period = match[3].toUpperCase();
  if (period === "PM" && hours !== 12) hours += 12;
  if (period === "AM" && hours === 12) hours = 0;
  let totalMins = hours * 60 + mins - minutes;
  if (totalMins < 0) totalMins += 24 * 60;
  const newHours = Math.floor(totalMins / 60) % 24;
  const newMins = totalMins % 60;
  const newPeriod = newHours >= 12 ? "PM" : "AM";
  const display = newHours % 12 || 12;
  return display + ":" + String(newMins).padStart(2, "0") + " " + newPeriod;
}

export default function RamadanTimetableScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const navigation = useNavigation<any>();
  const { theme } = useTheme();

  const { data, isLoading, error } = useQuery<{ timetable: TimetableDay[] }>({
    queryKey: ["/api/ramadan-timetable"],
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
  });

  const timetableData = data?.timetable ?? [];

  const handleGoHome = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate("Main");
  };

  const renderRow = (item: TimetableDay, index: number) => {
    let rowBgColor = index % 2 === 0 ? RAMADAN_COLORS.rowEven : RAMADAN_COLORS.rowOdd;
    let leftBorderColor = "transparent";
    let specialBadge = null;
    const isEid = item.day === 31;

    if (item.isSaturday) {
      rowBgColor = RAMADAN_COLORS.saturdayBg;
      leftBorderColor = RAMADAN_COLORS.saturdayAccent;
      specialBadge = (
        <View style={[styles.badge, { backgroundColor: RAMADAN_COLORS.gold }]}>
          <Feather name="users" size={10} color="#FFFFFF" />
          <ThemedText type="caption" style={styles.badgeText}>
            Community Iftaar
          </ThemedText>
        </View>
      );
    }

    if (item.isDaylightChange) {
      rowBgColor = RAMADAN_COLORS.daylightBg;
      leftBorderColor = RAMADAN_COLORS.daylightAccent;
      specialBadge = (
        <View style={[styles.badge, { backgroundColor: RAMADAN_COLORS.daylightAccent }]}>
          <Feather name="sun" size={10} color="#FFFFFF" />
          <ThemedText type="caption" style={styles.badgeText}>
            Daylight Saving
          </ThemedText>
        </View>
      );
    }

    if (isEid) {
      rowBgColor = EID_COLORS.bg;
      leftBorderColor = EID_COLORS.accent;
      specialBadge = (
        <View style={[styles.badge, { backgroundColor: EID_COLORS.accent }]}>
          <Feather name="star" size={10} color="#FFFFFF" />
          <ThemedText type="caption" style={styles.badgeText}>
            Eid ul-Fitr
          </ThemedText>
        </View>
      );
    }

    return (
      <Animated.View
        key={item.day}
        entering={FadeInDown.delay(index * 30).duration(300)}
      >
        <View
          style={[
            styles.tableRow,
            { backgroundColor: rowBgColor },
            leftBorderColor !== "transparent" && {
              borderLeftWidth: 4,
              borderLeftColor: leftBorderColor,
            },
          ]}
        >
          <View style={styles.dateCell}>
            <View style={[styles.dayCircle, { backgroundColor: isEid ? EID_COLORS.accent : (item.isSaturday ? RAMADAN_COLORS.saturdayAccent : RAMADAN_COLORS.primary) }]}>
              <ThemedText type="body" style={styles.dayNumber}>
                {isEid ? (
                  <Feather name="star" size={14} color="#FFFFFF" />
                ) : item.day}
              </ThemedText>
            </View>
            <View style={styles.dateInfo}>
              <ThemedText type="body" style={[styles.dateText, { color: isEid ? EID_COLORS.accent : "#1a1a1a" }]}>
                {item.date}
              </ThemedText>
              <ThemedText type="caption" style={[styles.dayText, { color: isEid ? EID_COLORS.accent : "#666666" }]}>
                {item.dayName}
              </ThemedText>
            </View>
          </View>
          {isEid ? (
            <View style={styles.eidMessageCell}>
              <ThemedText type="body" style={[styles.eidText, { color: EID_COLORS.accent }]}>
                {item.ishaIqama}
              </ThemedText>
            </View>
          ) : (
            <>
              <View style={styles.timeCell}>
                <ThemedText type="body" style={[styles.timeText, { color: "#666666" }]}>
                  {subtractMinutes(item.fajrIqama, 15)}
                </ThemedText>
              </View>
              <View style={styles.timeCell}>
                <ThemedText type="body" style={[styles.timeText, { color: RAMADAN_COLORS.primary }]}>
                  {item.fajrIqama}
                </ThemedText>
              </View>
              <View style={styles.timeCell}>
                <ThemedText type="body" style={[styles.timeText, { color: RAMADAN_COLORS.purple }]}>
                  {item.ishaIqama}
                </ThemedText>
              </View>
            </>
          )}
        </View>
        {specialBadge ? (
          <View style={styles.badgeRow}>
            {specialBadge}
          </View>
        ) : null}
      </Animated.View>
    );
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      contentContainerStyle={{
        paddingTop: headerHeight + Spacing.lg,
        paddingBottom: insets.bottom + Spacing.xl,
        paddingHorizontal: Spacing.lg,
      }}
      showsVerticalScrollIndicator={false}
    >
      <Animated.View entering={FadeInDown.delay(100).duration(600)}>
        <ImageBackground
          source={require("../../assets/images/ramadan-header.png")}
          style={styles.headerCard}
          imageStyle={styles.headerImage}
          resizeMode="cover"
        >
          <LinearGradient
            colors={["rgba(0, 180, 160, 0.85)", "rgba(0, 165, 255, 0.9)"]}
            style={styles.headerOverlay}
          >
            <View style={styles.headerContent}>
              <View style={styles.crescentContainer}>
                <Feather name="moon" size={48} color={RAMADAN_COLORS.gold} />
              </View>
              <ThemedText type="h1" style={styles.headerTitle}>
                Ramadan 2026
              </ThemedText>
              <ThemedText type="body" style={styles.headerSubtitle}>
                Prayer Timetable
              </ThemedText>
              <ThemedText type="caption" style={styles.headerLocation}>
                Islamic Center of Kane County
              </ThemedText>
            </View>
          </LinearGradient>
        </ImageBackground>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(200).duration(600)}>
        <View style={[styles.verseCard, { backgroundColor: RAMADAN_COLORS.verseBg, borderWidth: 1, borderColor: RAMADAN_COLORS.gold }]}>
          <View style={[styles.verseBorder, { backgroundColor: RAMADAN_COLORS.gold }]} />
          <View style={styles.verseContent}>
            <ThemedText type="body" style={[styles.verseText, { color: "#2D2D2D" }]}>
              "The month of Ramadan is that in which the Quran was revealed, a guidance for the people and clear proofs of guidance and criterion."
            </ThemedText>
            <ThemedText type="caption" style={[styles.verseReference, { color: RAMADAN_COLORS.goldDark }]}>
              Surah Al-Baqarah 2:185
            </ThemedText>
          </View>
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(300).duration(600)}>
        <View style={styles.legendContainer}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: RAMADAN_COLORS.gold }]} />
            <ThemedText type="caption" style={{ color: theme.textSecondary }}>
              Community Iftaar
            </ThemedText>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: RAMADAN_COLORS.daylightAccent }]} />
            <ThemedText type="caption" style={{ color: theme.textSecondary }}>
              Daylight Saving Starts
            </ThemedText>
          </View>
        </View>
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(400).duration(600)}>
        <View style={[styles.tableContainer, Shadows.medium]}>
          <LinearGradient
            colors={[RAMADAN_COLORS.primary, RAMADAN_COLORS.secondary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.tableHeader}
          >
            <View style={styles.headerDateCell}>
              <ThemedText type="small" style={styles.headerCellText}>
                Ramadan
              </ThemedText>
            </View>
            <View style={styles.headerTimeCell}>
              <ThemedText type="small" style={styles.headerCellText}>
                Fajr{"\n"}Salah
              </ThemedText>
            </View>
            <View style={styles.headerTimeCell}>
              <ThemedText type="small" style={styles.headerCellText}>
                Fajr{"\n"}Iqama
              </ThemedText>
            </View>
            <View style={styles.headerTimeCell}>
              <ThemedText type="small" style={styles.headerCellText}>
                Isha +{"\n"}Taraweeh
              </ThemedText>
            </View>
          </LinearGradient>
          
          <View style={styles.tableBody}>
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={RAMADAN_COLORS.primary} />
                <ThemedText type="caption" style={{ color: "#666", marginTop: Spacing.sm }}>
                  Loading timetable...
                </ThemedText>
              </View>
            ) : error ? (
              <View style={styles.loadingContainer}>
                <Feather name="alert-circle" size={24} color="#C41E3A" />
                <ThemedText type="caption" style={{ color: "#C41E3A", marginTop: Spacing.sm }}>
                  Could not load timetable
                </ThemedText>
              </View>
            ) : (
              timetableData.map((item, index) => renderRow(item, index))
            )}
          </View>
        </View>
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(500).duration(600)}>
        <View style={[styles.footerNote, { backgroundColor: theme.backgroundDefault }]}>
          <Feather name="info" size={16} color={theme.textSecondary} />
          <ThemedText type="caption" style={[styles.footerText, { color: theme.textSecondary }]}>
            Times are for St. Charles, IL. Daylight Saving Time begins March 8, 2026.
          </ThemedText>
        </View>
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(600).duration(600)}>
        <Pressable
          onPress={handleGoHome}
          style={({ pressed }) => [
            styles.backButton,
            { backgroundColor: theme.primary, opacity: pressed ? 0.85 : 1 },
            Shadows.medium,
          ]}
          testID="button-back-home"
        >
          <Feather name="home" size={20} color="#FFFFFF" />
          <ThemedText type="button" style={styles.backButtonText}>
            Back to Home
          </ThemedText>
        </Pressable>
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerCard: {
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.lg,
    overflow: "hidden",
  },
  headerImage: {
    borderRadius: BorderRadius.lg,
  },
  headerOverlay: {
    padding: Spacing["2xl"],
    alignItems: "center",
    borderRadius: BorderRadius.lg,
  },
  headerContent: {
    alignItems: "center",
  },
  crescentContainer: {
    marginBottom: Spacing.md,
  },
  headerTitle: {
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: Spacing.xs,
  },
  headerSubtitle: {
    color: "rgba(255,255,255,0.9)",
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  headerLocation: {
    color: RAMADAN_COLORS.gold,
    textAlign: "center",
    fontWeight: "600",
  },
  verseCard: {
    flexDirection: "row",
    borderRadius: BorderRadius.md,
    overflow: "hidden",
    marginBottom: Spacing.lg,
  },
  verseBorder: {
    width: 4,
  },
  verseContent: {
    flex: 1,
    padding: Spacing.lg,
  },
  verseText: {
    fontStyle: "italic",
    textAlign: "center",
    marginBottom: Spacing.sm,
    lineHeight: 24,
  },
  verseReference: {
    textAlign: "center",
    fontWeight: "600",
  },
  legendContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  tableContainer: {
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
    marginBottom: Spacing.lg,
  },
  tableHeader: {
    flexDirection: "row",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
  },
  headerDateCell: {
    flex: 1.8,
  },
  headerTimeCell: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
  },
  headerCellText: {
    color: "#FFFFFF",
    fontWeight: "600",
    textAlign: "center",
    fontSize: 11,
    lineHeight: 15,
  },
  tableBody: {
    backgroundColor: "#FFFFFF",
  },
  loadingContainer: {
    padding: Spacing["2xl"],
    alignItems: "center",
    justifyContent: "center",
  },
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    minHeight: 60,
  },
  dateCell: {
    flex: 1.8,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  dayCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  dayNumber: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 14,
  },
  dateInfo: {
    flex: 1,
  },
  dateText: {
    fontWeight: "600",
    fontSize: 14,
  },
  dayText: {
    fontSize: 11,
  },
  timeCell: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
  },
  timeIcon: {
    opacity: 0.8,
  },
  timeText: {
    fontWeight: "600",
    fontSize: 11,
  },
  eidMessageCell: {
    flex: 3,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.sm,
  },
  eidText: {
    fontWeight: "700",
    fontSize: 12,
    textAlign: "center",
  },
  badgeRow: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
    alignItems: "flex-start",
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "600",
  },
  footerNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
  },
  footerText: {
    flex: 1,
    lineHeight: 18,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    height: 50,
    borderRadius: BorderRadius.full,
    marginTop: Spacing.lg,
  },
  backButtonText: {
    color: "#FFFFFF",
  },
});
