import React, { useState } from "react";
import { View, StyleSheet, Pressable, Image, ImageBackground, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import { Feather, Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as WebBrowser from "expo-web-browser";
import * as Haptics from "expo-haptics";
import * as Linking from "expo-linking";
import * as Clipboard from "expo-clipboard";
import Constants from "expo-constants";
import Animated, { FadeInDown } from "react-native-reanimated";

import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";

interface MenuItem {
  id: string;
  icon: keyof typeof Feather.glyphMap;
  ionicon?: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  showArrow?: boolean;
}

const ICKC_EMAIL = "reachickc@gmail.com";
const ICKC_PHONE = "872-444-6850";
const ICKC_ADDRESS = "2315 Dean Street #600, St. Charles, IL 60174";
const MAPS_QUERY = encodeURIComponent("2315 Dean Street #600, St. Charles, IL 60174");

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const navigation = useNavigation();
  const { theme, isDark } = useTheme();
  const [copiedToast, setCopiedToast] = useState(false);

  const openMaps = async () => {
    Haptics.selectionAsync();
    const url = Platform.select({
      ios: `maps:0,0?q=${MAPS_QUERY}`,
      android: `geo:0,0?q=${MAPS_QUERY}`,
      default: `https://www.google.com/maps/search/?api=1&query=${MAPS_QUERY}`,
    });
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        await Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${MAPS_QUERY}`);
      }
    } catch {
      await Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${MAPS_QUERY}`);
    }
  };

  const copyAddress = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await Clipboard.setStringAsync(ICKC_ADDRESS);
    setCopiedToast(true);
    setTimeout(() => setCopiedToast(false), 2000);
  };

  const handleGoHome = () => {
    Haptics.selectionAsync();
    navigation.navigate("Home" as never);
  };

  const handleVisitWebsite = async () => {
    Haptics.selectionAsync();
    await WebBrowser.openBrowserAsync("https://ickc.info");
  };

  const handleContactUs = async () => {
    Haptics.selectionAsync();
    await Linking.openURL(`mailto:${ICKC_EMAIL}`);
  };

  const handlePrivacyPolicy = async () => {
    Haptics.selectionAsync();
    await WebBrowser.openBrowserAsync("https://ickc.info/privacy-policy");
  };


  const handleFeedback = async () => {
    Haptics.selectionAsync();
    await Linking.openURL(`mailto:${ICKC_EMAIL}?subject=ICKC App Feedback`);
  };

  const handleWhatsApp = async () => {
    Haptics.selectionAsync();
    await Linking.openURL("https://chat.whatsapp.com/DUGu6xUP03J8mYStVzgC4e");
  };

  const handleYouTube = async () => {
    Haptics.selectionAsync();
    await WebBrowser.openBrowserAsync("https://www.youtube.com/@IslamicCenterKaneCounty");
  };

  const handleInstagram = async () => {
    Haptics.selectionAsync();
    await WebBrowser.openBrowserAsync("https://www.instagram.com/ickc.info/");
  };

  const handleFacebook = async () => {
    Haptics.selectionAsync();
    await WebBrowser.openBrowserAsync("https://www.facebook.com/ICKCmosque/");
  };

  const menuItems: MenuItem[] = [
    {
      id: "website",
      icon: "globe",
      label: "Visit Our Website",
      onPress: handleVisitWebsite,
      showArrow: true,
    },
    {
      id: "contact",
      icon: "mail",
      label: "Contact Us",
      onPress: handleContactUs,
      showArrow: true,
    },
    {
      id: "feedback",
      icon: "message-circle",
      label: "Give Feedback",
      onPress: handleFeedback,
      showArrow: true,
    },
    {
      id: "whatsapp",
      icon: "message-square",
      ionicon: "logo-whatsapp",
      label: "Join WhatsApp Community",
      onPress: handleWhatsApp,
      showArrow: true,
    },
    {
      id: "facebook",
      icon: "facebook",
      ionicon: "logo-facebook",
      label: "ICKC Facebook",
      onPress: handleFacebook,
      showArrow: true,
    },
    {
      id: "instagram",
      icon: "instagram",
      ionicon: "logo-instagram",
      label: "ICKC Instagram",
      onPress: handleInstagram,
      showArrow: true,
    },
    {
      id: "youtube",
      icon: "youtube",
      ionicon: "logo-youtube",
      label: "ICKC YouTube",
      onPress: handleYouTube,
      showArrow: true,
    },
  ];

  const legalItems: MenuItem[] = [
    {
      id: "privacy",
      icon: "shield",
      label: "Privacy Policy",
      onPress: handlePrivacyPolicy,
      showArrow: true,
    },
  ];

  return (
    <KeyboardAwareScrollViewCompat
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      contentContainerStyle={{
        paddingTop: headerHeight + Spacing.lg,
        paddingBottom: tabBarHeight + Spacing.xl,
        paddingHorizontal: Spacing.lg,
      }}
      scrollIndicatorInsets={{ bottom: insets.bottom }}
    >
      <Animated.View entering={FadeInDown.delay(100).duration(600)} style={styles.headerSection}>
        <ImageBackground
          source={require("../../assets/images/profile-header.png")}
          style={styles.headerImageBg}
          imageStyle={styles.headerImage}
          resizeMode="cover"
        >
          <LinearGradient
            colors={["#00B4A0", "#00A5FF"]}
            style={styles.headerOverlay}
          >
            <Pressable
              onPress={handleGoHome}
              style={({ pressed }) => [
                styles.homeButton,
                { opacity: pressed ? 0.7 : 1 },
              ]}
              testID="button-go-home"
            >
              <Feather name="home" size={20} color="#FFFFFF" />
              <ThemedText type="body" style={styles.homeButtonText}>
                Home
              </ThemedText>
            </Pressable>
            <Image
              source={require("../../assets/images/ickc-logo.png")}
              style={styles.logo}
              resizeMode="contain"
            />
            <ThemedText type="h2" style={styles.centerName}>
              Islamic Center of Kane County
            </ThemedText>
            <Pressable
              onPress={openMaps}
              onLongPress={copyAddress}
              style={({ pressed }) => [
                styles.addressPressable,
                { opacity: pressed ? 0.7 : 1 },
              ]}
              testID="button-header-address"
            >
              <Feather name="navigation" size={14} color="rgba(255,255,255,0.9)" />
              <ThemedText type="body" style={styles.location}>
                {ICKC_ADDRESS}
              </ThemedText>
            </Pressable>
          </LinearGradient>
        </ImageBackground>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(200).duration(600)}>
        <ThemedText type="h4" style={[styles.sectionTitle, { color: theme.text }]}>
          Connect With Us
        </ThemedText>
        <View style={[styles.menuContainer, { backgroundColor: theme.backgroundDefault }]}>
          {menuItems.map((item, index) => (
            <Pressable
              key={item.id}
              onPress={item.onPress}
              style={({ pressed }) => [
                styles.menuItem,
                index < menuItems.length - 1 && {
                  borderBottomWidth: 1,
                  borderBottomColor: theme.border,
                },
                { opacity: pressed ? 0.7 : 1 },
              ]}
              testID={`menu-${item.id}`}
            >
              <View style={styles.menuItemLeft}>
                <View style={[styles.menuIconContainer, { backgroundColor: theme.surfaceElevated }]}>
                  {item.ionicon ? (
                    <Ionicons name={item.ionicon} size={18} color={theme.primary} />
                  ) : (
                    <Feather name={item.icon} size={18} color={theme.primary} />
                  )}
                </View>
                <ThemedText type="body" style={{ color: theme.text }}>
                  {item.label}
                </ThemedText>
              </View>
              {item.showArrow ? (
                <Feather name="chevron-right" size={20} color={theme.textSecondary} />
              ) : null}
            </Pressable>
          ))}
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(300).duration(600)} style={styles.contactSection}>
        <ThemedText type="h4" style={[styles.sectionTitle, { color: theme.text }]}>
          Location & Contact
        </ThemedText>
        <View style={[styles.contactCard, { backgroundColor: theme.backgroundDefault }]}>
          <Pressable
            onPress={openMaps}
            onLongPress={copyAddress}
            style={({ pressed }) => [
              styles.contactRow,
              { opacity: pressed ? 0.7 : 1 },
            ]}
            testID="button-contact-address"
          >
            <Feather name="map-pin" size={18} color={theme.primary} />
            <View style={styles.addressContainer}>
              <ThemedText type="body" style={[styles.contactText, { color: theme.text }]}>
                {ICKC_ADDRESS}
              </ThemedText>
              <View style={styles.addressHints}>
                <View style={[styles.addressHintBadge, { backgroundColor: `${theme.primary}15` }]}>
                  <Feather name="navigation" size={10} color={theme.primary} />
                  <ThemedText type="caption" style={{ color: theme.primary }}>Open Maps</ThemedText>
                </View>
                <View style={[styles.addressHintBadge, { backgroundColor: `${theme.primary}15` }]}>
                  <Feather name="copy" size={10} color={theme.primary} />
                  <ThemedText type="caption" style={{ color: theme.primary }}>Hold to Copy</ThemedText>
                </View>
              </View>
            </View>
            <Feather name="external-link" size={16} color={theme.primary} />
          </Pressable>
          <View style={[styles.contactDivider, { backgroundColor: theme.border }]} />
          <View style={styles.contactRow}>
            <Feather name="phone" size={18} color={theme.primary} />
            <ThemedText type="body" style={[styles.contactText, { color: theme.text }]}>
              {ICKC_PHONE}
            </ThemedText>
          </View>
          <View style={[styles.contactDivider, { backgroundColor: theme.border }]} />
          <View style={styles.contactRow}>
            <Feather name="mail" size={18} color={theme.primary} />
            <ThemedText type="body" style={[styles.contactText, { color: theme.text }]}>
              {ICKC_EMAIL}
            </ThemedText>
          </View>
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(400).duration(600)}>
        <ThemedText type="h4" style={[styles.sectionTitle, { color: theme.text }]}>
          Legal
        </ThemedText>
        <View style={[styles.menuContainer, { backgroundColor: theme.backgroundDefault }]}>
          {legalItems.map((item, index) => (
            <Pressable
              key={item.id}
              onPress={item.onPress}
              style={({ pressed }) => [
                styles.menuItem,
                index < legalItems.length - 1 && {
                  borderBottomWidth: 1,
                  borderBottomColor: theme.border,
                },
                { opacity: pressed ? 0.7 : 1 },
              ]}
              testID={`menu-${item.id}`}
            >
              <View style={styles.menuItemLeft}>
                <View style={[styles.menuIconContainer, { backgroundColor: theme.surfaceElevated }]}>
                  <Feather name={item.icon} size={18} color={theme.primary} />
                </View>
                <ThemedText type="body" style={{ color: theme.text }}>
                  {item.label}
                </ThemedText>
              </View>
              {item.showArrow ? (
                <Feather name="chevron-right" size={20} color={theme.textSecondary} />
              ) : null}
            </Pressable>
          ))}
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(500).duration(600)} style={styles.versionSection}>
        <ThemedText type="caption" style={{ color: theme.textSecondary, textAlign: "center" }}>
          ICKC App v{Constants.expoConfig?.version ?? "2.3.0"}
        </ThemedText>
        <ThemedText type="caption" style={{ color: theme.textSecondary, textAlign: "center", marginTop: Spacing.xs }}>
          Islamic Center of Kane County
        </ThemedText>
      </Animated.View>

      {copiedToast ? (
        <View style={[styles.copiedToast, { backgroundColor: theme.text }]}>
          <Feather name="check" size={14} color={theme.backgroundDefault} />
          <ThemedText type="small" style={{ color: theme.backgroundDefault }}>
            Address copied
          </ThemedText>
        </View>
      ) : null}
    </KeyboardAwareScrollViewCompat>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerSection: {
    marginBottom: Spacing.xl,
    overflow: "hidden",
    borderRadius: BorderRadius.lg,
  },
  headerImageBg: {
    width: "100%",
  },
  headerImage: {
    borderRadius: BorderRadius.lg,
  },
  headerOverlay: {
    padding: Spacing["2xl"],
    alignItems: "center",
    borderRadius: BorderRadius.lg,
  },
  homeButton: {
    position: "absolute",
    top: Spacing.lg,
    left: Spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
    gap: Spacing.xs,
  },
  homeButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  logo: {
    width: 100,
    height: 100,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
  },
  centerName: {
    textAlign: "center",
    marginBottom: Spacing.xs,
    color: "#FFFFFF",
  },
  location: {
    textAlign: "center",
    color: "rgba(255, 255, 255, 0.9)",
  },
  sectionTitle: {
    marginBottom: Spacing.md,
  },
  menuContainer: {
    borderRadius: BorderRadius.md,
    overflow: "hidden",
    marginBottom: Spacing.xl,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
  },
  menuItemLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  menuIconContainer: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  contactSection: {
    marginBottom: Spacing.xl,
  },
  contactCard: {
    borderRadius: BorderRadius.md,
    padding: Spacing.xl,
  },
  contactRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  contactText: {
    marginLeft: Spacing.md,
    flex: 1,
  },
  addressContainer: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  addressHints: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  addressHintBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.sm,
  },
  addressPressable: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    marginTop: Spacing.xs,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: BorderRadius.md,
  },
  contactDivider: {
    height: 1,
    marginVertical: Spacing.lg,
  },
  copiedToast: {
    position: "absolute",
    bottom: 120,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.full,
  },
  versionSection: {
    alignItems: "center",
    paddingVertical: Spacing.xl,
  },
});
