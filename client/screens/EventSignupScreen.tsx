import React from "react";
import { View, StyleSheet, ScrollView, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { useNavigation } from "@react-navigation/native";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Shadows } from "@/constants/theme";

const COLORS = {
  primary: "#00B4A0",
  primaryDark: "#009688",
  accent: "#00A5FF",
  gradient1: "#00B4A0",
  gradient2: "#009688",
  gradient3: "#00796B",
};

export default function EventSignupScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme } = useTheme();
  const navigation = useNavigation<any>();

  const handleCommunityIftaar = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    navigation.navigate("CommunityIftaar");
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{
          paddingTop: headerHeight + Spacing.md,
          paddingBottom: insets.bottom + Spacing.xl,
          paddingHorizontal: Spacing.lg,
        }}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
      >
        <Animated.View entering={FadeInDown.delay(100).duration(600)}>
          <LinearGradient
            colors={[COLORS.gradient1, COLORS.gradient2, COLORS.gradient3]}
            style={styles.headerCard}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.headerGlow} />
            <View style={styles.geometricPattern}>
              {[...Array(6)].map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.geometricShape,
                    {
                      left: `${15 + i * 15}%`,
                      top: `${20 + (i % 3) * 25}%`,
                      transform: [{ rotate: `${i * 30}deg` }],
                    },
                  ]}
                />
              ))}
            </View>
            
            <View style={styles.headerContent}>
              <View style={styles.iconContainer}>
                <LinearGradient
                  colors={[COLORS.accent, "#B8860B"]}
                  style={styles.iconGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Feather name="calendar" size={28} color="#FFFFFF" />
                </LinearGradient>
              </View>
              <ThemedText type="h2" style={styles.headerTitle}>
                Events@ICKC
              </ThemedText>
              <ThemedText type="body" style={styles.headerSubtitle}>
                Community Event Signups
              </ThemedText>
            </View>

            <View style={styles.crescentDecor}>
              <View style={styles.crescentMoon} />
            </View>
          </LinearGradient>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(250).duration(600)}>
          <Pressable
            onPress={handleCommunityIftaar}
            style={({ pressed }) => [
              styles.eventButton,
              { opacity: pressed ? 0.9 : 1 },
            ]}
            testID="button-community-iftaar"
          >
            <LinearGradient
              colors={[COLORS.primary, "#5A3D8A"]}
              style={styles.eventButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <View style={styles.eventButtonLeft}>
                <View style={styles.eventButtonIcon}>
                  <Feather name="moon" size={24} color="#FFFFFF" />
                </View>
                <View style={styles.eventButtonText}>
                  <ThemedText type="h3" style={styles.eventButtonTitle}>
                    Community Iftaar RSVP
                  </ThemedText>
                  <ThemedText type="caption" style={styles.eventButtonSubtitle}>
                    Ramadan 2026 - Every Saturday
                  </ThemedText>
                </View>
              </View>
              <Feather name="chevron-right" size={24} color="rgba(255,255,255,0.8)" />
            </LinearGradient>
          </Pressable>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(400).duration(600)}>
          <View style={[styles.infoCard, { backgroundColor: theme.backgroundDefault }]}>
            <LinearGradient
              colors={["rgba(0, 180, 160, 0.1)", "rgba(0, 165, 255, 0.05)"]}
              style={styles.infoCardGradient}
            />
            <Feather name="info" size={20} color={COLORS.primary} />
            <ThemedText type="caption" style={[styles.infoCardText, { color: theme.textSecondary }]}>
              More events are added throughout the year. Pull down to refresh.
            </ThemedText>
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
  headerCard: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    marginBottom: Spacing.lg,
    overflow: "hidden",
    position: "relative",
  },
  headerGlow: {
    position: "absolute",
    top: -50,
    right: -50,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: "rgba(212, 175, 55, 0.15)",
  },
  geometricPattern: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.1,
  },
  geometricShape: {
    position: "absolute",
    width: 40,
    height: 40,
    borderWidth: 2,
    borderColor: "#FFFFFF",
    borderRadius: 8,
  },
  headerContent: {
    alignItems: "center",
    zIndex: 1,
  },
  iconContainer: {
    marginBottom: Spacing.md,
  },
  iconGradient: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    ...Shadows.medium,
  },
  headerTitle: {
    color: "#FFFFFF",
    textAlign: "center",
  },
  headerSubtitle: {
    color: "rgba(255, 255, 255, 0.8)",
    marginTop: Spacing.xs,
  },
  crescentDecor: {
    position: "absolute",
    bottom: 10,
    left: 20,
    opacity: 0.2,
  },
  crescentMoon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 4,
    borderColor: "#FFFFFF",
    borderRightColor: "transparent",
    transform: [{ rotate: "-45deg" }],
  },
  eventButton: {
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
    marginBottom: Spacing.lg,
    ...Shadows.medium,
  },
  eventButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.lg,
  },
  eventButtonLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    flex: 1,
  },
  eventButtonIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  eventButtonText: {
    flex: 1,
  },
  eventButtonTitle: {
    color: "#FFFFFF",
  },
  eventButtonSubtitle: {
    color: "rgba(255, 255, 255, 0.8)",
    marginTop: 2,
  },
  infoCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
    position: "relative",
  },
  infoCardGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  infoCardText: {
    flex: 1,
  },
});
