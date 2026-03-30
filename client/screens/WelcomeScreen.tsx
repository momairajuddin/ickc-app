import React from "react";
import { View, StyleSheet, Image, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";

interface WelcomeScreenProps {
  onContinue: () => void;
}

const THEME = {
  teal: "#00B4A0",
  tealLight: "#00D4AA",
  blue: "#00A5FF",
  dark: "#0A0E1A",
  glow: "rgba(0,212,170,0.5)",
  glowBlue: "rgba(0,165,255,0.4)",
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function WelcomeScreen({ onContinue }: WelcomeScreenProps) {
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();
  const scale = useSharedValue(1);

  const animatedButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.96, { damping: 15, stiffness: 150 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 150 });
  };

  const handleContinue = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onContinue();
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[THEME.dark, "#0D1424", "#0A0E1A"]}
        style={StyleSheet.absoluteFill}
      />
      
      <LinearGradient
        colors={["rgba(0,180,160,0.15)", "rgba(0,165,255,0.08)", "transparent"]}
        style={styles.gradientOverlay}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0.8 }}
      />

      <View style={styles.patternOverlay} />

      <View style={[styles.content, { paddingTop: insets.top + Spacing["3xl"] }]}>
        <Animated.View entering={FadeInDown.delay(200).duration(800)} style={styles.logoContainer}>
          <View style={styles.logoGlowOuter}>
            <View style={styles.logoGlowInner}>
              <View style={styles.logoWrapper}>
                <Image
                  source={require("../../assets/images/ickc-logo.png")}
                  style={styles.logo}
                  resizeMode="contain"
                />
              </View>
            </View>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(400).duration(800)} style={styles.titleContainer}>
          <ThemedText type="body" style={styles.welcomeLabel}>
            Welcome to
          </ThemedText>
          <ThemedText type="hero" style={styles.centerName}>
            Islamic Center
          </ThemedText>
          <ThemedText type="hero" style={styles.centerName}>
            of Kane County
          </ThemedText>
          <View style={styles.locationBadge}>
            <Feather name="map-pin" size={14} color={THEME.tealLight} />
            <ThemedText type="small" style={styles.locationText}>
              St. Charles, IL
            </ThemedText>
          </View>
        </Animated.View>

        <Animated.View
          entering={FadeInUp.delay(600).duration(800)}
          style={styles.verseCard}
        >
          <LinearGradient
            colors={["rgba(0,180,160,0.12)", "rgba(0,165,255,0.08)"]}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
          <View style={styles.verseBorder} />
          <View style={styles.verseContent}>
            <ThemedText type="body" style={styles.verseText}>
              "Indeed, my prayer, my rites of sacrifice, my living and my dying are for Allah, Lord of the worlds"
            </ThemedText>
            <ThemedText type="caption" style={styles.verseReference}>
              Surah Al-An'am 6:162
            </ThemedText>
          </View>
        </Animated.View>
      </View>

      <Animated.View
        entering={FadeInUp.delay(800).duration(600)}
        style={[styles.buttonContainer, { paddingBottom: insets.bottom + Spacing.xl }]}
      >
        <AnimatedPressable
          onPress={handleContinue}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          style={[styles.continueButton, animatedButtonStyle]}
          testID="button-continue"
        >
          <LinearGradient
            colors={[THEME.teal, THEME.blue]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.buttonGradient}
          >
            <ThemedText type="button" style={styles.buttonText}>
              Get Started
            </ThemedText>
            <Feather name="arrow-right" size={20} color="#FFFFFF" style={{ marginLeft: Spacing.sm }} />
          </LinearGradient>
        </AnimatedPressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.dark,
  },
  gradientOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "60%",
  },
  patternOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.03,
  },
  content: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
  },
  logoContainer: {
    marginBottom: Spacing["2xl"],
  },
  logoGlowOuter: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(0,212,170,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  logoGlowInner: {
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "rgba(0,212,170,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  logoWrapper: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: THEME.tealLight,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 12,
  },
  logo: {
    width: 130,
    height: 130,
    borderRadius: 65,
  },
  titleContainer: {
    alignItems: "center",
    marginBottom: Spacing["3xl"],
  },
  welcomeLabel: {
    color: "rgba(255,255,255,0.7)",
    marginBottom: Spacing.sm,
    textTransform: "uppercase",
    letterSpacing: 2,
    fontSize: 14,
  },
  centerName: {
    textAlign: "center",
    color: "#FFFFFF",
    fontSize: 28,
    lineHeight: 36,
  },
  locationBadge: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: "rgba(0,212,170,0.1)",
    borderWidth: 1,
    borderColor: "rgba(0,212,170,0.2)",
  },
  locationText: {
    color: THEME.tealLight,
    marginLeft: Spacing.xs,
  },
  verseCard: {
    flexDirection: "row",
    borderRadius: BorderRadius.md,
    overflow: "hidden",
    marginHorizontal: Spacing.lg,
    borderWidth: 1,
    borderColor: "rgba(0,180,160,0.2)",
  },
  verseBorder: {
    width: 4,
    backgroundColor: THEME.tealLight,
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
    color: "rgba(255,255,255,0.9)",
  },
  verseReference: {
    textAlign: "center",
    fontWeight: "600",
    color: THEME.tealLight,
  },
  buttonContainer: {
    paddingHorizontal: Spacing.xl,
  },
  continueButton: {
    borderRadius: BorderRadius.full,
    overflow: "hidden",
    shadowColor: THEME.tealLight,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  buttonGradient: {
    flexDirection: "row",
    height: 56,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing["2xl"],
  },
  buttonText: {
    color: "#FFFFFF",
  },
});
