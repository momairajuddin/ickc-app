import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  Pressable,
  Image,
  Switch,
  Platform,
  Linking,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { getApiUrl } from "@/lib/query-client";

interface NotificationPreferences {
  prayerReminders: boolean;
  eventReminders: boolean;
  communityAnnouncements: boolean;
  ramadanReminders: boolean;
  donationCampaigns: boolean;
}

interface NotificationSetting {
  id: keyof NotificationPreferences;
  title: string;
  description: string;
  icon: keyof typeof Feather.glyphMap;
  color: string;
}

const NOTIFICATION_SETTINGS: NotificationSetting[] = [
  {
    id: "prayerReminders",
    title: "Prayer Reminders",
    description: "Get notified before prayer times",
    icon: "clock",
    color: "#00B4A0",
  },
  {
    id: "eventReminders",
    title: "Event Reminders",
    description: "Reminders for upcoming events (1 day before)",
    icon: "calendar",
    color: "#00A5FF",
  },
  {
    id: "communityAnnouncements",
    title: "Community Announcements",
    description: "Important updates from ICKC",
    icon: "message-circle",
    color: "#FFB300",
  },
  {
    id: "ramadanReminders",
    title: "Ramadan Reminders",
    description: "Iftar, Suhoor, and Taraweeh reminders",
    icon: "moon",
    color: "#9C27B0",
  },
  {
    id: "donationCampaigns",
    title: "Donation Campaigns",
    description: "Updates on fundraising campaigns",
    icon: "heart",
    color: "#C41E3A",
  },
];

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();

  const [pushEnabled, setPushEnabled] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [pushToken, setPushToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    prayerReminders: true,
    eventReminders: true,
    communityAnnouncements: true,
    ramadanReminders: true,
    donationCampaigns: false,
  });

  useEffect(() => {
    initializeNotifications();
  }, []);

  const initializeNotifications = async () => {
    setIsLoading(true);
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      setPushEnabled(existingStatus === "granted");
      setPermissionDenied(existingStatus === "denied");

      if (existingStatus === "granted") {
        await registerForPushNotifications();
      }

      const savedToken = await AsyncStorage.getItem("pushToken");
      if (savedToken) {
        setPushToken(savedToken);
        await loadPreferencesFromServer(savedToken);
      } else {
        await loadLocalPreferences();
      }
    } catch (error) {
      console.error("Error initializing notifications:", error);
      await loadLocalPreferences();
    } finally {
      setIsLoading(false);
    }
  };

  const loadLocalPreferences = async () => {
    try {
      const savedPrefs = await AsyncStorage.getItem("notificationPreferences");
      if (savedPrefs) {
        setPreferences(JSON.parse(savedPrefs));
      }
    } catch (error) {
      console.error("Error loading local preferences:", error);
    }
  };

  const loadPreferencesFromServer = async (token: string) => {
    try {
      const apiUrl = getApiUrl();
      const response = await fetch(
        new URL(`/api/notifications/preferences/${encodeURIComponent(token)}`, apiUrl).toString()
      );
      if (response.ok) {
        const prefs = await response.json();
        setPreferences(prefs);
        await AsyncStorage.setItem("notificationPreferences", JSON.stringify(prefs));
      }
    } catch (error) {
      console.error("Error loading preferences from server:", error);
      await loadLocalPreferences();
    }
  };

  const registerForPushNotifications = async () => {
    try {
      const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: projectId || undefined,
      });
      const token = tokenData.data;
      setPushToken(token);
      await AsyncStorage.setItem("pushToken", token);

      const apiUrl = getApiUrl();
      await fetch(new URL("/api/notifications/register", apiUrl).toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          platform: Platform.OS,
        }),
      });

      await loadPreferencesFromServer(token);
    } catch (error) {
      console.error("Error registering for push notifications:", error);
    }
  };

  const handlePushToggle = async () => {
    Haptics.selectionAsync();

    if (!pushEnabled) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();

      if (existingStatus === "denied") {
        if (Platform.OS !== "web") {
          try {
            await Linking.openSettings();
          } catch (error) {
            console.error("Error opening settings:", error);
          }
        }
        return;
      }

      const { status } = await Notifications.requestPermissionsAsync();
      if (status === "granted") {
        setPushEnabled(true);
        setPermissionDenied(false);
        await registerForPushNotifications();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        setPermissionDenied(true);
      }
    } else {
      if (Platform.OS !== "web") {
        try {
          await Linking.openSettings();
        } catch (error) {
          console.error("Error opening settings:", error);
        }
      }
    }
  };

  const handlePreferenceToggle = async (key: keyof NotificationPreferences) => {
    Haptics.selectionAsync();
    const newValue = !preferences[key];
    const updatedPrefs = { ...preferences, [key]: newValue };
    setPreferences(updatedPrefs);

    try {
      await AsyncStorage.setItem("notificationPreferences", JSON.stringify(updatedPrefs));

      if (pushToken) {
        setIsSaving(true);
        const apiUrl = getApiUrl();
        await fetch(
          new URL(`/api/notifications/preferences/${encodeURIComponent(pushToken)}`, apiUrl).toString(),
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ [key]: newValue }),
          }
        );
      }
    } catch (error) {
      console.error("Error saving preference:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const renderSettingItem = (setting: NotificationSetting, index: number) => (
    <Animated.View
      key={setting.id}
      entering={FadeInDown.delay(100 + index * 50).duration(400)}
    >
      <View style={[styles.settingItem, { backgroundColor: theme.backgroundDefault }]}>
        <View style={styles.settingLeft}>
          <View style={[styles.settingIcon, { backgroundColor: `${setting.color}20` }]}>
            <Feather name={setting.icon} size={20} color={setting.color} />
          </View>
          <View style={styles.settingTextContainer}>
            <ThemedText type="body" style={{ color: theme.text }}>
              {setting.title}
            </ThemedText>
            <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: 2 }}>
              {setting.description}
            </ThemedText>
          </View>
        </View>
        <Switch
          value={preferences[setting.id]}
          onValueChange={() => handlePreferenceToggle(setting.id)}
          trackColor={{ false: theme.backgroundSecondary, true: `${setting.color}80` }}
          thumbColor={preferences[setting.id] ? setting.color : theme.backgroundTertiary}
          disabled={!pushEnabled}
          testID={`switch-${setting.id}`}
        />
      </View>
    </Animated.View>
  );

  const renderHeader = () => (
    <View style={styles.headerSection}>
      <Animated.View entering={FadeInDown.delay(50).duration(400)}>
        <LinearGradient
          colors={["rgba(0,180,160,0.15)", "rgba(0,165,255,0.1)"]}
          style={styles.headerCard}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.headerContent}>
            <View style={[styles.headerIconContainer, { backgroundColor: theme.primary }]}>
              <Feather name="bell" size={28} color="#FFFFFF" />
            </View>
            <View style={styles.headerTextContainer}>
              <ThemedText type="h3" style={{ color: theme.text }}>
                Push Notifications
              </ThemedText>
              <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: 4 }}>
                {pushEnabled
                  ? "Notifications are enabled"
                  : permissionDenied
                  ? "Tap to open settings"
                  : "Enable to receive updates"}
              </ThemedText>
            </View>
            <Switch
              value={pushEnabled}
              onValueChange={handlePushToggle}
              trackColor={{ false: theme.backgroundSecondary, true: `${theme.primary}80` }}
              thumbColor={pushEnabled ? theme.primary : theme.backgroundTertiary}
              testID="switch-push-notifications"
            />
          </View>
          {permissionDenied && Platform.OS !== "web" ? (
            <Pressable
              onPress={handlePushToggle}
              style={[styles.openSettingsButton, { backgroundColor: theme.primary }]}
            >
              <Feather name="settings" size={16} color="#FFFFFF" />
              <ThemedText type="button" style={{ color: "#FFFFFF", marginLeft: 8 }}>
                Open Settings
              </ThemedText>
            </Pressable>
          ) : null}
        </LinearGradient>
      </Animated.View>

      <View style={styles.sectionHeader}>
        <ThemedText type="h3" style={{ color: theme.text }}>
          Notification Types
        </ThemedText>
        <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: 4 }}>
          Choose which notifications you want to receive
        </ThemedText>
      </View>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Image
        source={require("../../assets/images/empty-notifications.png")}
        style={styles.emptyImage}
        resizeMode="contain"
      />
      <ThemedText type="h3" style={[styles.emptyTitle, { color: theme.text }]}>
        Stay Connected
      </ThemedText>
      <ThemedText type="body" style={[styles.emptyText, { color: theme.textSecondary }]}>
        Enable push notifications to receive updates about events, prayer times, and community announcements.
      </ThemedText>
    </View>
  );

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.backgroundRoot }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <ThemedText type="body" style={{ color: theme.textSecondary, marginTop: Spacing.md }}>
          Loading settings...
        </ThemedText>
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
      data={NOTIFICATION_SETTINGS}
      renderItem={({ item, index }) => renderSettingItem(item, index)}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={renderHeader}
      ListFooterComponent={
        pushEnabled ? null : (
          <View style={{ marginTop: Spacing.xl }}>
            {renderEmptyState()}
          </View>
        )
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
  headerSection: {
    marginBottom: Spacing.md,
  },
  headerCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerIconContainer: {
    width: 52,
    height: 52,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  headerTextContainer: {
    flex: 1,
  },
  openSettingsButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    marginTop: Spacing.md,
  },
  sectionHeader: {
    marginBottom: Spacing.md,
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
  },
  settingLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  settingIcon: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  settingTextContainer: {
    flex: 1,
  },
  emptyState: {
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.xl,
  },
  emptyImage: {
    width: 150,
    height: 150,
    marginBottom: Spacing.lg,
    opacity: 0.8,
  },
  emptyTitle: {
    marginBottom: Spacing.sm,
    textAlign: "center",
  },
  emptyText: {
    textAlign: "center",
    lineHeight: 22,
  },
});
