import React, { useEffect, useState, useCallback, useRef } from "react";
import { View, StyleSheet, ScrollView, Image, Pressable, RefreshControl, ActivityIndicator, AppState, Platform, Linking, Dimensions, NativeSyntheticEvent, NativeScrollEvent } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Shadows } from "@/constants/theme";
import { getApiUrl } from "@/lib/query-client";

interface PrayerTime {
  name: string;
  adhan: string;
  iqamah: string;
  isNext?: boolean;
  isTomorrow?: boolean;
}

interface DayPrayerData {
  dayOffset: number;
  date: string;
  hijriDate: string;
  prayers: PrayerTime[];
}

const JUMMAH_TIMES = {
  khutba: "1:15 PM",
  salah: "1:45 PM",
};

const THEME = {
  teal: "#00B4A0",
  tealLight: "#00D4AA",
  blue: "#00A5FF",
  dark: "#0A0E1A",
  surface: "#1A1F2E",
  glow: "rgba(0,212,170,0.4)",
  glowBlue: "rgba(0,165,255,0.3)",
  gold: "#D4AF37",
};

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const PAGER_HORIZONTAL_PADDING = Spacing.lg * 2;
const PAGER_WIDTH = SCREEN_WIDTH - PAGER_HORIZONTAL_PADDING;

function getDayLabel(dayOffset: number, dateStr: string): string {
  if (dayOffset === 0) return "Today";
  if (dayOffset === 1) return "Tomorrow";
  if (dateStr) {
    const parts = dateStr.split(",");
    if (parts.length >= 2) {
      return parts[0].trim() + "," + parts[1].trim();
    }
  }
  return `In ${dayOffset} days`;
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const navigation = useNavigation<any>();
  const { theme, isDark } = useTheme();

  const [multiDayData, setMultiDayData] = useState<DayPrayerData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentDate, setCurrentDate] = useState("");
  const [hijriDate, setHijriDate] = useState("");
  const [nextPrayer, setNextPrayer] = useState<PrayerTime | null>(null);
  const [countdown, setCountdown] = useState("");
  const [activePage, setActivePage] = useState(0);
  const pagerScrollRef = useRef<ScrollView>(null);

  const bgColor = isDark ? THEME.dark : "#FFFFFF";
  const cardBg = isDark ? THEME.surface : "#FFFFFF";

  const fetchPrayerTimes = async () => {
    try {
      const today = new Date();
      const dateStr = today.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      setCurrentDate(dateStr);

      const baseUrl = getApiUrl();
      const url = new URL("/api/prayer-times/multi-day", baseUrl);
      const response = await fetch(url.toString());

      if (!response.ok) {
        throw new Error("Failed to fetch prayer times");
      }

      const data = await response.json();
      const days: DayPrayerData[] = data.days || [];

      if (days.length > 0) {
        setHijriDate(days[0].hijriDate);

        const todayPrayers = days[0].prayers;
        const now = new Date();
        let foundNext = false;
        for (const prayer of todayPrayers) {
          const prayerDate = parseTime(prayer.iqamah);
          if (prayerDate > now && !foundNext) {
            prayer.isNext = true;
            setNextPrayer(prayer);
            foundNext = true;
          }
        }

        if (!foundNext) {
          if (days.length > 1 && days[1].prayers.length > 0) {
            const tomorrowFajr = { ...days[1].prayers[0], isNext: true, isTomorrow: true };
            setNextPrayer(tomorrowFajr);
          } else {
            setNextPrayer(null);
          }
        }
      }

      setMultiDayData(days.slice(0, 4));
    } catch (error) {
      console.error("Error fetching prayer times:", error);
      const fallbackPrayers: PrayerTime[] = [
        { name: "Fajr", adhan: "5:29 AM", iqamah: "5:44 AM" },
        { name: "Dhuhr", adhan: "12:07 PM", iqamah: "1:15 PM" },
        { name: "Asr", adhan: "3:46 PM", iqamah: "4:15 PM" },
        { name: "Maghrib", adhan: "5:29 PM", iqamah: "5:34 PM" },
        { name: "Isha", adhan: "6:46 PM", iqamah: "8:00 PM" },
      ];
      const now = new Date();
      let foundFallbackNext = false;
      for (const prayer of fallbackPrayers) {
        const prayerDate = parseTime(prayer.iqamah);
        if (prayerDate > now && !foundFallbackNext) {
          prayer.isNext = true;
          setNextPrayer(prayer);
          foundFallbackNext = true;
        }
      }
      if (!foundFallbackNext) {
        const tomorrowFajr = { ...fallbackPrayers[0], isNext: true, isTomorrow: true };
        setNextPrayer(tomorrowFajr);
      }
      setMultiDayData([{
        dayOffset: 0,
        date: currentDate,
        hijriDate: "",
        prayers: fallbackPrayers,
      }]);
      setHijriDate("");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const parseTime = (timeStr: string): Date => {
    const parts = timeStr.trim().split(/\s+/);
    const time = parts[0];
    const period = parts[1] || "";
    const [hours, minutes] = time.split(":").map(Number);
    const date = new Date();
    let hour = hours;
    if (period.toUpperCase() === "PM" && hours !== 12) hour += 12;
    if (period.toUpperCase() === "AM" && hours === 12) hour = 0;
    date.setHours(hour, minutes, 0, 0);
    return date;
  };

  useEffect(() => {
    fetchPrayerTimes();
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchPrayerTimes();
    }, [])
  );

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        fetchPrayerTimes();
      }
    });
    return () => subscription.remove();
  }, []);

  const todayPrayers = multiDayData.length > 0 ? multiDayData[0].prayers : [];
  const todayPrayersRef = useRef<PrayerTime[]>([]);
  todayPrayersRef.current = todayPrayers;

  useEffect(() => {
    if (!nextPrayer) return;

    const interval = setInterval(() => {
      const now = new Date();
      const prayerDate = parseTime(nextPrayer.iqamah);
      if (nextPrayer.isTomorrow) {
        prayerDate.setDate(prayerDate.getDate() + 1);
      }
      let diff = prayerDate.getTime() - now.getTime();

      if (diff <= 0) {
        const allPrayers = todayPrayersRef.current;
        const currentIndex = allPrayers.findIndex((p) => p.name === nextPrayer.name);
        if (currentIndex >= 0 && currentIndex < allPrayers.length - 1) {
          const next = { ...allPrayers[currentIndex + 1], isNext: true };
          setNextPrayer(next);
          const updated = allPrayers.map((p, i) => ({ ...p, isNext: i === currentIndex + 1 }));
          setMultiDayData(prev => {
            if (prev.length === 0) return prev;
            const newData = [...prev];
            newData[0] = { ...newData[0], prayers: updated };
            return newData;
          });
        } else {
          const allPrayersCleared = allPrayers.map((p) => ({ ...p, isNext: false }));
          setMultiDayData(prev => {
            if (prev.length === 0) return prev;
            const newData = [...prev];
            newData[0] = { ...newData[0], prayers: allPrayersCleared };
            if (newData.length > 1 && newData[1].prayers.length > 0) {
              const tomorrowFajr = { ...newData[1].prayers[0], isNext: true, isTomorrow: true };
              setNextPrayer(tomorrowFajr);
            } else {
              setNextPrayer(null);
              setCountdown("");
            }
            return newData;
          });
        }
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setCountdown(`${hours}h ${minutes}m ${seconds}s`);
    }, 1000);

    return () => clearInterval(interval);
  }, [nextPrayer]);

  const onRefresh = () => {
    setRefreshing(true);
    setActivePage(0);
    if (pagerScrollRef.current) {
      pagerScrollRef.current.scrollTo({ x: 0, animated: false });
    }
    fetchPrayerTimes();
  };

  const handlePagerScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const page = Math.round(offsetX / PAGER_WIDTH);
    if (page !== activePage && page >= 0 && page < multiDayData.length) {
      setActivePage(page);
      Haptics.selectionAsync();
    }
  };

  const renderPrayerTable = (dayData: DayPrayerData) => {
    const isToday = dayData.dayOffset === 0;
    return (
      <View key={dayData.dayOffset} style={{ width: PAGER_WIDTH }}>
        <View style={[styles.prayerTimesHeader, { borderBottomColor: isDark ? "rgba(0,180,160,0.15)" : theme.border }]}>
          <ThemedText type="caption" style={[styles.prayerColumnHeader, { color: theme.textSecondary }]}>
            Prayer
          </ThemedText>
          <ThemedText type="caption" style={[styles.prayerColumnHeader, { color: theme.textSecondary }]}>
            Adhan
          </ThemedText>
          <ThemedText type="caption" style={[styles.prayerColumnHeader, { color: theme.textSecondary }]}>
            Iqamah
          </ThemedText>
        </View>
        {dayData.prayers.map((prayer, index) => (
          <View
            key={prayer.name}
            style={[
              styles.prayerTimeRow,
              isToday && prayer.isNext && { backgroundColor: isDark ? "rgba(0,180,160,0.1)" : "rgba(0,180,160,0.08)" },
              index < dayData.prayers.length - 1 && {
                borderBottomWidth: 1,
                borderBottomColor: isDark ? "rgba(0,180,160,0.1)" : theme.border,
              },
            ]}
          >
            <View style={styles.prayerNameContainer}>
              {isToday && prayer.isNext ? (
                <View style={[styles.nextIndicator, { backgroundColor: THEME.tealLight }]} />
              ) : null}
              <ThemedText
                type="body"
                style={[
                  styles.prayerName,
                  { color: theme.text },
                  isToday && prayer.isNext && { color: THEME.teal, fontWeight: "600" },
                ]}
              >
                {prayer.name}
              </ThemedText>
            </View>
            <ThemedText type="small" style={[styles.prayerTime, { color: theme.textSecondary }]}>
              {prayer.adhan}
            </ThemedText>
            <ThemedText
              type="body"
              style={[
                styles.prayerTime,
                styles.iqamahTime,
                { color: theme.text },
                isToday && prayer.isNext && { color: THEME.teal, fontWeight: "700" },
              ]}
            >
              {prayer.iqamah}
            </ThemedText>
          </View>
        ))}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: bgColor }]}>
        <ActivityIndicator size="large" color={THEME.teal} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      {isDark ? (
        <LinearGradient
          colors={[THEME.dark, "#0D1424", THEME.dark]}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
      
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{
          paddingTop: headerHeight + Spacing.lg,
          paddingBottom: tabBarHeight + Spacing.xl,
          paddingHorizontal: Spacing.lg,
        }}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={THEME.teal} />
        }
      >
        <Animated.View entering={FadeInDown.delay(100).duration(600)} style={styles.logoSection}>
          <View style={styles.logoGlowOuter}>
            <View style={styles.logoWrapper}>
              <Image
                source={require("../../assets/images/ickc-logo.png")}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>
          </View>
          <ThemedText type="h2" style={[styles.centerName, { color: THEME.teal }]}>
            Islamic Center of Kane County
          </ThemedText>
          <Pressable
            onPress={() => {
              Haptics.selectionAsync();
              const query = encodeURIComponent("2315 Dean Street #600, St. Charles, IL 60174");
              const url = Platform.select({
                ios: `maps:0,0?q=${query}`,
                android: `geo:0,0?q=${query}`,
                default: `https://www.google.com/maps/search/?api=1&query=${query}`,
              });
              Linking.openURL(url).catch(() =>
                Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${query}`)
              );
            }}
            style={({ pressed }) => [styles.locationBadge, { opacity: pressed ? 0.6 : 1 }]}
            testID="button-location-map"
          >
            <Feather name="map-pin" size={12} color={THEME.tealLight} />
            <ThemedText type="caption" style={[styles.locationText, { color: THEME.tealLight }]}>
              St. Charles, IL
            </ThemedText>
          </Pressable>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(150).duration(600)} style={styles.dateContainer}>
          <ThemedText type="caption" style={[styles.dateText, { color: theme.textSecondary }]}>
            {currentDate}
          </ThemedText>
          <View style={styles.hijriBadge}>
            <Feather name="moon" size={12} color={THEME.tealLight} />
            <ThemedText type="small" style={[styles.hijriDate, { color: THEME.tealLight }]}>
              {hijriDate}
            </ThemedText>
          </View>
        </Animated.View>

        {nextPrayer ? (
          <Animated.View entering={FadeInDown.delay(200).duration(600)}>
            <View style={styles.nextPrayerCard}>
              <LinearGradient
                colors={[THEME.teal, THEME.blue]}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              />
              <View style={styles.nextPrayerGlow} />
              <View style={styles.nextPrayerContent}>
                <View style={styles.nextPrayerBadge}>
                  <Feather name="sunrise" size={14} color="#FFFFFF" />
                  <ThemedText type="caption" style={styles.nextPrayerLabel}>
                    {nextPrayer.isTomorrow ? "Next Prayer (Tomorrow)" : "Next Prayer"}
                  </ThemedText>
                </View>
                <ThemedText type="hero" style={styles.nextPrayerName}>
                  {nextPrayer.name}
                </ThemedText>
                <ThemedText type="h2" style={styles.nextPrayerTime}>
                  Iqamah: {nextPrayer.iqamah}
                </ThemedText>
                <View style={styles.countdownContainer}>
                  <Feather name="clock" size={14} color="rgba(255,255,255,0.9)" />
                  <ThemedText type="small" style={styles.countdownText}>
                    {countdown}
                  </ThemedText>
                </View>
              </View>
            </View>
          </Animated.View>
        ) : null}

        <Animated.View entering={FadeInDown.delay(300).duration(600)}>
          <View style={styles.sectionHeader}>
            <Feather name="clock" size={18} color={THEME.teal} />
            <ThemedText type="h3" style={[styles.sectionTitle, { color: theme.text }]}>
              Daily Prayer Times
            </ThemedText>
          </View>

          {multiDayData.length > 1 ? (
            <View>
              <View style={styles.dayLabelRow}>
                {activePage > 0 ? (
                  <Feather name="chevron-left" size={14} color={THEME.tealLight} />
                ) : <View style={{ width: 14 }} />}
                <View style={styles.dayLabelCenter}>
                  <ThemedText type="caption" style={[styles.dayLabel, { color: activePage === 0 ? THEME.teal : THEME.gold }]}>
                    {multiDayData[activePage] ? getDayLabel(multiDayData[activePage].dayOffset, multiDayData[activePage].date) : ""}
                  </ThemedText>
                  {activePage > 0 && multiDayData[activePage] ? (
                    <ThemedText type="small" style={[styles.dayDateSmall, { color: theme.textSecondary }]}>
                      {multiDayData[activePage].hijriDate}
                    </ThemedText>
                  ) : null}
                </View>
                {activePage < multiDayData.length - 1 ? (
                  <Feather name="chevron-right" size={14} color={THEME.tealLight} />
                ) : <View style={{ width: 14 }} />}
              </View>

              <View style={[styles.prayerTimesCard, { backgroundColor: cardBg, borderColor: isDark ? "rgba(0,180,160,0.2)" : theme.border }]}>
                <ScrollView
                  ref={pagerScrollRef}
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  onMomentumScrollEnd={handlePagerScroll}
                  scrollEventThrottle={16}
                  testID="pager-prayer-times"
                  nestedScrollEnabled
                >
                  {multiDayData.map((dayData) => renderPrayerTable(dayData))}
                </ScrollView>
              </View>

              <View style={styles.dotContainer}>
                {multiDayData.map((_, idx) => (
                  <View
                    key={idx}
                    style={[
                      styles.dot,
                      {
                        backgroundColor: idx === activePage ? THEME.teal : (isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.15)"),
                        width: idx === activePage ? 20 : 6,
                      },
                    ]}
                  />
                ))}
              </View>
            </View>
          ) : (
            <View style={[styles.prayerTimesCard, { backgroundColor: cardBg, borderColor: isDark ? "rgba(0,180,160,0.2)" : theme.border }]}>
              {multiDayData.length > 0 ? renderPrayerTable(multiDayData[0]) : null}
            </View>
          )}
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(400).duration(600)}>
          <View style={styles.sectionHeader}>
            <Feather name="users" size={18} color={THEME.teal} />
            <ThemedText type="h3" style={[styles.sectionTitle, { color: theme.text }]}>
              Jumu'ah Prayer
            </ThemedText>
          </View>
          <View style={[styles.jumuahCard, { backgroundColor: cardBg, borderColor: isDark ? "rgba(0,180,160,0.2)" : theme.border }]}>
            <View style={styles.jumuahRow}>
              <View style={styles.jumuahItem}>
                <ThemedText type="small" style={{ color: theme.textSecondary }}>
                  Khutbah
                </ThemedText>
                <ThemedText type="h2" style={{ color: THEME.teal }}>
                  {JUMMAH_TIMES.khutba}
                </ThemedText>
              </View>
              <View style={[styles.jumuahDivider, { backgroundColor: isDark ? "rgba(0,180,160,0.2)" : theme.border }]} />
              <View style={styles.jumuahItem}>
                <ThemedText type="small" style={{ color: theme.textSecondary }}>
                  Salah
                </ThemedText>
                <ThemedText type="h2" style={{ color: THEME.teal }}>
                  {JUMMAH_TIMES.salah}
                </ThemedText>
              </View>
            </View>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(450).duration(600)}>
          <View
            style={[styles.verseCard, { backgroundColor: isDark ? "rgba(0,180,160,0.08)" : "rgba(0,180,160,0.05)", borderColor: isDark ? "rgba(0,180,160,0.2)" : "rgba(0,180,160,0.15)" }]}
          >
            <View style={[styles.verseBorder, { backgroundColor: THEME.tealLight }]} />
            <View style={styles.verseContent}>
              <ThemedText type="body" style={[styles.verseText, { color: theme.text }]}>
                "Say, 'Indeed, my prayer, my rites of sacrifice, my living and my dying are for Allah, Lord of the worlds'"
              </ThemedText>
              <ThemedText type="caption" style={[styles.verseReference, { color: THEME.tealLight }]}>
                Surah Al-An'am 6:162
              </ThemedText>
            </View>
          </View>
        </Animated.View>


      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  logoSection: {
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  logoGlowOuter: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(0,212,170,0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.md,
  },
  logoWrapper: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#00D4AA",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  logo: {
    width: 85,
    height: 85,
    borderRadius: 42,
  },
  centerName: {
    textAlign: "center",
    fontSize: 18,
    marginBottom: Spacing.xs,
  },
  locationBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    backgroundColor: "rgba(0,212,170,0.1)",
  },
  locationText: {
    marginLeft: Spacing.xs,
  },
  dateContainer: {
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  dateText: {
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  hijriBadge: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: Spacing.sm,
    gap: Spacing.xs,
  },
  hijriDate: {
    fontWeight: "600",
  },
  nextPrayerCard: {
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
    marginBottom: Spacing.xl,
    shadowColor: "#00D4AA",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  nextPrayerGlow: {
    position: "absolute",
    top: -50,
    right: -50,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  nextPrayerContent: {
    alignItems: "center",
    padding: Spacing["2xl"],
  },
  nextPrayerBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    marginBottom: Spacing.md,
    gap: Spacing.xs,
  },
  nextPrayerLabel: {
    color: "#FFFFFF",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  nextPrayerName: {
    color: "#FFFFFF",
    marginBottom: Spacing.xs,
  },
  nextPrayerTime: {
    color: "#FFFFFF",
    marginBottom: Spacing.md,
  },
  countdownContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    backgroundColor: "rgba(0,0,0,0.2)",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  countdownText: {
    color: "#FFFFFF",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  sectionTitle: {},
  dayLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  dayLabelCenter: {
    alignItems: "center",
  },
  dayLabel: {
    textTransform: "uppercase",
    letterSpacing: 1.5,
    fontWeight: "700",
    fontSize: 13,
  },
  dayDateSmall: {
    fontSize: 11,
    marginTop: 2,
  },
  prayerTimesCard: {
    borderRadius: BorderRadius.md,
    overflow: "hidden",
    marginBottom: Spacing.sm,
    borderWidth: 1,
  },
  dotContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginBottom: Spacing.xl,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  prayerTimesHeader: {
    flexDirection: "row",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderBottomWidth: 1,
  },
  prayerColumnHeader: {
    flex: 1,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    fontSize: 11,
  },
  prayerTimeRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
  },
  prayerNameContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  nextIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: Spacing.sm,
  },
  prayerName: {
    flex: 1,
  },
  prayerTime: {
    flex: 1,
  },
  iqamahTime: {
    fontWeight: "600",
  },
  jumuahCard: {
    borderRadius: BorderRadius.md,
    overflow: "hidden",
    marginBottom: Spacing.xl,
    borderWidth: 1,
    padding: Spacing.xl,
  },
  jumuahRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  jumuahItem: {
    flex: 1,
    alignItems: "center",
  },
  jumuahDivider: {
    width: 1,
    height: 50,
    marginHorizontal: Spacing.lg,
  },
  verseCard: {
    flexDirection: "row",
    borderRadius: BorderRadius.md,
    overflow: "hidden",
    marginBottom: Spacing.xl,
    borderWidth: 1,
  },
  verseBorder: {
    width: 4,
  },
  verseContent: {
    flex: 1,
    padding: Spacing.xl,
  },
  verseText: {
    fontStyle: "italic",
    textAlign: "center",
    marginBottom: Spacing.md,
    lineHeight: 26,
  },
  verseReference: {
    textAlign: "center",
    fontWeight: "600",
  },
});
