import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Modal,
  TextInput,
  ActivityIndicator,
  Animated as RNAnimated,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown, FadeIn } from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Shadows } from "@/constants/theme";
import { getApiUrl } from "@/lib/query-client";

interface ImamSignup {
  id: string;
  date: string;
  salah: string;
  volunteerName: string;
  createdAt: string;
}

interface SlotInfo {
  date: string;
  salah: string;
  dateDisplay: string;
  dayName: string;
}

interface ToastState {
  visible: boolean;
  message: string;
  type: "success" | "error";
}

const SALAH_NAMES = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"] as const;

const SALAH_TIMES: Record<string, number> = {
  Fajr: 6,
  Dhuhr: 13,
  Asr: 16,
  Maghrib: 18,
  Isha: 20,
};

function isSalahInPast(dateStr: string, salah: string): boolean {
  const now = new Date();
  const today = now.toISOString().split("T")[0];
  
  if (dateStr < today) {
    return true;
  }
  
  if (dateStr === today) {
    const currentHour = now.getHours();
    const salahHour = SALAH_TIMES[salah] || 0;
    return currentHour >= salahHour;
  }
  
  return false;
}

const IMAM_COLORS = {
  primary: "#00B4A0",
  primaryDark: "#009688",
  secondary: "#00A5FF",
  gold: "#D4AF37",
  goldDark: "#B8860B",
  available: "#E8FAF8",
  availableBorder: "#80E0D4",
  availableText: "#00897B",
  taken: "#FFF3E0",
  takenBorder: "#FFE0B2",
  takenText: "#E65100",
  fridayDhuhr: "#FFEBEE",
  fridayDhuhrBorder: "#FFCDD2",
  fridayDhuhrText: "#C62828",
  past: "#F5F5F5",
  pastBorder: "#E0E0E0",
  pastText: "#9E9E9E",
  cardBg: "#FFFFFF",
  patternOverlay: "rgba(0, 180, 160, 0.03)",
};

function getNext14Days(): { date: string; display: string; dayName: string; isFriday: boolean; monthDay: string }[] {
  const days: { date: string; display: string; dayName: string; isFriday: boolean; monthDay: string }[] = [];
  const today = new Date();
  
  for (let i = 0; i < 14; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().split("T")[0];
    const dayName = d.toLocaleDateString("en-US", { weekday: "short" });
    const display = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const monthDay = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const isFriday = d.getDay() === 5;
    days.push({ date: dateStr, display, dayName, isFriday, monthDay });
  }
  return days;
}

function Toast({ toast, onHide }: { toast: ToastState; onHide: () => void }) {
  const opacity = useRef(new RNAnimated.Value(0)).current;

  useEffect(() => {
    if (toast.visible) {
      RNAnimated.sequence([
        RNAnimated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        RNAnimated.delay(2500),
        RNAnimated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start(() => onHide());
    }
  }, [toast.visible]);

  if (!toast.visible) return null;

  return (
    <RNAnimated.View
      style={[
        styles.toast,
        { opacity, backgroundColor: toast.type === "success" ? IMAM_COLORS.primary : "#C62828" },
      ]}
    >
      <Feather name={toast.type === "success" ? "check-circle" : "alert-circle"} size={20} color="#FFFFFF" />
      <ThemedText type="body" style={styles.toastText}>{toast.message}</ThemedText>
    </RNAnimated.View>
  );
}

export default function ImamSignupScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme } = useTheme();

  const [signups, setSignups] = useState<ImamSignup[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<SlotInfo | null>(null);
  const [selectedSignup, setSelectedSignup] = useState<ImamSignup | null>(null);
  const [volunteerName, setVolunteerName] = useState("");
  const [passcode, setPasscode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState>({ visible: false, message: "", type: "success" });

  const days = getNext14Days();

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ visible: true, message, type });
  };

  const hideToast = () => {
    setToast((prev) => ({ ...prev, visible: false }));
  };

  const fetchSignups = useCallback(async () => {
    try {
      const response = await fetch(new URL("/api/imam-signups", getApiUrl()).toString());
      if (response.ok) {
        const data = await response.json();
        setSignups(data);
      }
    } catch (err) {
      console.error("Error fetching signups:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSignups();
    const interval = setInterval(fetchSignups, 8000);
    return () => clearInterval(interval);
  }, [fetchSignups]);

  const getSignupForSlot = (date: string, salah: string): ImamSignup | undefined => {
    return signups.find((s) => s.date === date && s.salah === salah);
  };

  const handleVolunteerPress = (day: typeof days[0], salah: string) => {
    if (day.isFriday && salah === "Dhuhr") return;
    
    const existing = getSignupForSlot(day.date, salah);
    if (existing) return;

    Haptics.selectionAsync();
    setSelectedSlot({
      date: day.date,
      salah,
      dateDisplay: `${day.dayName}, ${day.display}`,
      dayName: day.dayName,
    });
    setVolunteerName("");
    setError(null);
    setModalVisible(true);
  };

  const handleRemovePress = (signup: ImamSignup) => {
    Haptics.selectionAsync();
    setSelectedSignup(signup);
    setPasscode("");
    setError(null);
    setDeleteModalVisible(true);
  };

  const handleSubmit = async () => {
    if (!selectedSlot || !volunteerName.trim()) {
      setError("Please enter your name");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(new URL("/api/imam-signups", getApiUrl()).toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: selectedSlot.date,
          salah: selectedSlot.salah,
          volunteerName: volunteerName.trim(),
        }),
      });

      if (response.ok) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setModalVisible(false);
        showToast("Successfully signed up!", "success");
        fetchSignups();
      } else {
        const data = await response.json();
        if (response.status === 409) {
          showToast("Someone else just took that slot. Refreshing...", "error");
          setModalVisible(false);
          fetchSignups();
        } else {
          setError(data.error || "Failed to sign up");
        }
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } catch (err) {
      setError("Network error. Please try again.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedSignup || !passcode.trim()) {
      setError("Please enter the admin passcode");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(new URL(`/api/imam-signups/${selectedSignup.id}`, getApiUrl()).toString(), {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode: passcode.trim() }),
      });

      if (response.ok) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setDeleteModalVisible(false);
        showToast("Signup removed successfully", "success");
        fetchSignups();
      } else {
        const data = await response.json();
        setError(data.error || "Failed to remove signup");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } catch (err) {
      setError("Network error. Please try again.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setSubmitting(false);
    }
  };

  const renderSalahRow = (day: typeof days[0], salah: string, index: number) => {
    const isFridayDhuhr = day.isFriday && salah === "Dhuhr";
    const isPast = isSalahInPast(day.date, salah);
    const signup = getSignupForSlot(day.date, salah);
    const isTaken = !!signup;

    let bgColor = IMAM_COLORS.available;
    let borderColor = IMAM_COLORS.availableBorder;
    let textColor = IMAM_COLORS.availableText;
    let labelColor = IMAM_COLORS.primaryDark;

    if (isPast) {
      bgColor = IMAM_COLORS.past;
      borderColor = IMAM_COLORS.pastBorder;
      textColor = IMAM_COLORS.pastText;
      labelColor = IMAM_COLORS.pastText;
    } else if (isFridayDhuhr) {
      bgColor = IMAM_COLORS.fridayDhuhr;
      borderColor = IMAM_COLORS.fridayDhuhrBorder;
      textColor = IMAM_COLORS.fridayDhuhrText;
    } else if (isTaken) {
      bgColor = IMAM_COLORS.taken;
      borderColor = IMAM_COLORS.takenBorder;
      textColor = IMAM_COLORS.takenText;
    }

    return (
      <Animated.View
        key={`${day.date}-${salah}`}
        entering={FadeIn.delay(index * 50).duration(300)}
        style={[styles.salahRow, { backgroundColor: bgColor, borderColor }]}
      >
        <View style={styles.salahInfo}>
          <ThemedText type="body" style={[styles.salahLabel, { color: labelColor }]}>
            {salah}
          </ThemedText>
          
          {isPast ? (
            <View style={[styles.statusBadge, { backgroundColor: IMAM_COLORS.pastText }]}>
              <ThemedText type="caption" style={styles.statusBadgeText}>Past</ThemedText>
            </View>
          ) : isFridayDhuhr ? (
            <View style={[styles.statusBadge, { backgroundColor: IMAM_COLORS.fridayDhuhrText }]}>
              <ThemedText type="caption" style={styles.statusBadgeText}>Jumu'ah</ThemedText>
            </View>
          ) : isTaken ? (
            <View style={styles.takenInfo}>
              <View style={[styles.statusBadge, { backgroundColor: IMAM_COLORS.takenText }]}>
                <ThemedText type="caption" style={styles.statusBadgeText}>Taken</ThemedText>
              </View>
              <View style={styles.imamNameRow}>
                <Feather name="user" size={14} color={IMAM_COLORS.takenText} />
                <ThemedText type="body" style={[styles.imamName, { color: IMAM_COLORS.takenText }]}>
                  {signup.volunteerName}
                </ThemedText>
              </View>
            </View>
          ) : (
            <View style={[styles.statusBadge, { backgroundColor: IMAM_COLORS.availableText }]}>
              <ThemedText type="caption" style={styles.statusBadgeText}>Available</ThemedText>
            </View>
          )}
        </View>

        <View style={styles.salahActions}>
          {isPast || isFridayDhuhr ? null : isTaken ? (
            <Pressable
              onPress={() => handleRemovePress(signup)}
              style={({ pressed }) => [
                styles.removeButton,
                { opacity: pressed ? 0.7 : 1 },
              ]}
              testID={`button-remove-${day.date}-${salah}`}
            >
              <Feather name="x" size={16} color="#C62828" />
            </Pressable>
          ) : (
            <Pressable
              onPress={() => handleVolunteerPress(day, salah)}
              style={({ pressed }) => [
                styles.volunteerButton,
                { backgroundColor: IMAM_COLORS.primary, opacity: pressed ? 0.8 : 1 },
              ]}
              testID={`button-volunteer-${day.date}-${salah}`}
            >
              <ThemedText type="caption" style={styles.volunteerButtonText}>Volunteer</ThemedText>
            </Pressable>
          )}
        </View>
      </Animated.View>
    );
  };

  const renderDayCard = (day: typeof days[0], index: number) => {
    return (
      <Animated.View
        key={day.date}
        entering={FadeInDown.delay(index * 80).duration(500)}
        style={[styles.dayCard, Shadows.medium, { backgroundColor: IMAM_COLORS.cardBg }]}
      >
        <LinearGradient
          colors={day.isFriday ? [IMAM_COLORS.gold, IMAM_COLORS.goldDark] : [IMAM_COLORS.primary, IMAM_COLORS.primaryDark]}
          style={styles.dayCardHeader}
        >
          <ThemedText type="h4" style={styles.dayName}>{day.dayName}</ThemedText>
          <ThemedText type="body" style={styles.dayDate}>{day.monthDay}</ThemedText>
        </LinearGradient>

        <View style={styles.salahList}>
          {SALAH_NAMES.map((salah, i) => renderSalahRow(day, salah, i))}
        </View>
      </Animated.View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.backgroundRoot }]}>
        <ActivityIndicator size="large" color={IMAM_COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: headerHeight + Spacing.lg,
          paddingBottom: insets.bottom + Spacing.xl,
          paddingHorizontal: Spacing.md,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.delay(100).duration(600)}>
          <LinearGradient
            colors={[IMAM_COLORS.primary, IMAM_COLORS.primaryDark]}
            style={[styles.headerCard, Shadows.large]}
          >
            <View style={styles.headerPattern}>
              <View style={styles.geometricShape1} />
              <View style={styles.geometricShape2} />
              <View style={styles.geometricShape3} />
            </View>
            <View style={styles.headerContent}>
              <Feather name="users" size={36} color={IMAM_COLORS.gold} />
              <ThemedText type="h2" style={styles.headerTitle}>
                ICKC Imam Volunteer Sign-Up
              </ThemedText>
              <ThemedText type="body" style={styles.headerSubtitle}>
                Choose a day and salah to volunteer to lead prayer.
              </ThemedText>
              <View style={styles.headerNote}>
                <Feather name="info" size={14} color="rgba(255, 255, 255, 0.8)" />
                <ThemedText type="caption" style={styles.headerNoteText}>
                  Friday Dhuhr sign-up is disabled.
                </ThemedText>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(200).duration(600)}>
          <View style={[styles.legendContainer, { backgroundColor: theme.backgroundDefault }]}>
            <View style={styles.legendItem}>
              <View style={[styles.legendBadge, { backgroundColor: IMAM_COLORS.availableText }]} />
              <ThemedText type="caption" style={{ color: theme.textSecondary }}>Available</ThemedText>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendBadge, { backgroundColor: IMAM_COLORS.takenText }]} />
              <ThemedText type="caption" style={{ color: theme.textSecondary }}>Taken</ThemedText>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendBadge, { backgroundColor: IMAM_COLORS.pastText }]} />
              <ThemedText type="caption" style={{ color: theme.textSecondary }}>Past</ThemedText>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendBadge, { backgroundColor: IMAM_COLORS.fridayDhuhrText }]} />
              <ThemedText type="caption" style={{ color: theme.textSecondary }}>Jumu'ah</ThemedText>
            </View>
          </View>
        </Animated.View>

        <View style={styles.cardsContainer}>
          {days.map((day, index) => renderDayCard(day, index))}
        </View>
      </ScrollView>

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.backgroundDefault }]}>
            <LinearGradient colors={[IMAM_COLORS.primary, IMAM_COLORS.primaryDark]} style={styles.modalHeaderGradient}>
              <View style={styles.modalHeaderRow}>
                <ThemedText type="h3" style={styles.modalTitle}>Volunteer Sign-Up</ThemedText>
                <Pressable onPress={() => setModalVisible(false)} testID="button-close-modal">
                  <Feather name="x" size={24} color="#FFFFFF" />
                </Pressable>
              </View>
            </LinearGradient>

            {selectedSlot ? (
              <View style={styles.modalBody}>
                <View style={[styles.slotInfoCard, { backgroundColor: IMAM_COLORS.available, borderColor: IMAM_COLORS.availableBorder }]}>
                  <Feather name="calendar" size={24} color={IMAM_COLORS.primary} />
                  <View style={styles.slotInfoText}>
                    <ThemedText type="body" style={{ color: IMAM_COLORS.primary, fontWeight: "600" }}>
                      {selectedSlot.dateDisplay}
                    </ThemedText>
                    <ThemedText type="h4" style={{ color: IMAM_COLORS.primaryDark }}>
                      {selectedSlot.salah} Prayer
                    </ThemedText>
                  </View>
                </View>

                <ThemedText type="body" style={[styles.inputLabel, { color: theme.text }]}>
                  Your Name
                </ThemedText>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.backgroundRoot, color: theme.text, borderColor: theme.border }]}
                  placeholder="Enter your name"
                  placeholderTextColor={theme.textSecondary}
                  value={volunteerName}
                  onChangeText={setVolunteerName}
                  autoFocus
                  testID="input-volunteer-name"
                />

                {error ? (
                  <View style={styles.errorContainer}>
                    <Feather name="alert-circle" size={16} color="#C62828" />
                    <ThemedText type="caption" style={styles.errorText}>{error}</ThemedText>
                  </View>
                ) : null}

                <Pressable
                  onPress={handleSubmit}
                  disabled={submitting}
                  style={({ pressed }) => [
                    styles.submitButton,
                    { backgroundColor: IMAM_COLORS.primary, opacity: pressed || submitting ? 0.7 : 1 },
                  ]}
                  testID="button-confirm-signup"
                >
                  {submitting ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <>
                      <Feather name="check" size={20} color="#FFFFFF" />
                      <ThemedText type="button" style={styles.submitButtonText}>Confirm Sign-Up</ThemedText>
                    </>
                  )}
                </Pressable>
              </View>
            ) : null}
          </View>
        </View>
      </Modal>

      <Modal
        visible={deleteModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.backgroundDefault }]}>
            <LinearGradient colors={["#C62828", "#8B0000"]} style={styles.modalHeaderGradient}>
              <View style={styles.modalHeaderRow}>
                <ThemedText type="h3" style={styles.modalTitle}>Remove Signup</ThemedText>
                <Pressable onPress={() => setDeleteModalVisible(false)} testID="button-close-delete-modal">
                  <Feather name="x" size={24} color="#FFFFFF" />
                </Pressable>
              </View>
            </LinearGradient>

            {selectedSignup ? (
              <View style={styles.modalBody}>
                <View style={[styles.slotInfoCard, { backgroundColor: IMAM_COLORS.taken, borderColor: IMAM_COLORS.takenBorder }]}>
                  <Feather name="user" size={24} color={IMAM_COLORS.takenText} />
                  <View style={styles.slotInfoText}>
                    <ThemedText type="body" style={{ color: IMAM_COLORS.takenText, fontWeight: "600" }}>
                      {selectedSignup.volunteerName}
                    </ThemedText>
                    <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                      {selectedSignup.date} - {selectedSignup.salah}
                    </ThemedText>
                  </View>
                </View>

                <ThemedText type="body" style={[styles.inputLabel, { color: theme.text }]}>
                  Admin Passcode
                </ThemedText>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.backgroundRoot, color: theme.text, borderColor: theme.border }]}
                  placeholder="Enter admin passcode"
                  placeholderTextColor={theme.textSecondary}
                  value={passcode}
                  onChangeText={setPasscode}
                  secureTextEntry
                  autoFocus
                  testID="input-admin-passcode"
                />

                {error ? (
                  <View style={styles.errorContainer}>
                    <Feather name="alert-circle" size={16} color="#C62828" />
                    <ThemedText type="caption" style={styles.errorText}>{error}</ThemedText>
                  </View>
                ) : null}

                <Pressable
                  onPress={handleDelete}
                  disabled={submitting}
                  style={({ pressed }) => [
                    styles.submitButton,
                    { backgroundColor: "#C62828", opacity: pressed || submitting ? 0.7 : 1 },
                  ]}
                  testID="button-confirm-delete"
                >
                  {submitting ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <>
                      <Feather name="trash-2" size={20} color="#FFFFFF" />
                      <ThemedText type="button" style={styles.submitButtonText}>Remove Signup</ThemedText>
                    </>
                  )}
                </Pressable>
              </View>
            ) : null}
          </View>
        </View>
      </Modal>

      <Toast toast={toast} onHide={hideToast} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  headerCard: {
    borderRadius: BorderRadius.xl,
    marginBottom: Spacing.lg,
    overflow: "hidden",
    position: "relative",
  },
  headerPattern: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  geometricShape1: {
    position: "absolute",
    top: -30,
    right: -30,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(212, 175, 55, 0.15)",
  },
  geometricShape2: {
    position: "absolute",
    bottom: -20,
    left: -20,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  geometricShape3: {
    position: "absolute",
    top: 20,
    left: 20,
    width: 40,
    height: 40,
    borderRadius: 8,
    transform: [{ rotate: "45deg" }],
    backgroundColor: "rgba(212, 175, 55, 0.1)",
  },
  headerContent: {
    padding: Spacing["2xl"],
    alignItems: "center",
    zIndex: 1,
  },
  headerTitle: {
    color: "#FFFFFF",
    marginTop: Spacing.md,
    textAlign: "center",
    fontSize: 22,
  },
  headerSubtitle: {
    color: "rgba(255, 255, 255, 0.9)",
    marginTop: Spacing.xs,
    textAlign: "center",
    fontSize: 14,
  },
  headerNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    backgroundColor: "rgba(0, 0, 0, 0.2)",
    borderRadius: BorderRadius.full,
  },
  headerNoteText: {
    color: "rgba(255, 255, 255, 0.85)",
    fontSize: 12,
  },
  legendContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.lg,
    ...Shadows.small,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  legendBadge: {
    width: 12,
    height: 12,
    borderRadius: 4,
  },
  cardsContainer: {
    gap: Spacing.md,
  },
  dayCard: {
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
  },
  dayCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  dayName: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 18,
  },
  dayDate: {
    color: "rgba(255, 255, 255, 0.9)",
    fontSize: 14,
  },
  salahList: {
    padding: Spacing.sm,
    gap: Spacing.xs,
  },
  salahRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    minHeight: 56,
  },
  salahInfo: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    flexWrap: "wrap",
  },
  salahLabel: {
    fontWeight: "600",
    fontSize: 15,
    minWidth: 70,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  statusBadgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "600",
  },
  takenInfo: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    flexWrap: "wrap",
  },
  imamNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  imamName: {
    fontWeight: "600",
    fontSize: 14,
  },
  salahActions: {
    marginLeft: Spacing.sm,
  },
  volunteerButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  volunteerButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 12,
  },
  removeButton: {
    padding: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: "rgba(198, 40, 40, 0.1)",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.lg,
  },
  modalContent: {
    width: "100%",
    maxWidth: 400,
    borderRadius: BorderRadius.xl,
    overflow: "hidden",
    ...Shadows.large,
  },
  modalHeaderGradient: {
    padding: Spacing.lg,
  },
  modalHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  modalTitle: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  modalBody: {
    padding: Spacing.lg,
  },
  slotInfoCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
  },
  slotInfoText: {
    flex: 1,
  },
  inputLabel: {
    marginBottom: Spacing.xs,
    fontWeight: "600",
    fontSize: 14,
  },
  input: {
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    fontSize: 16,
    marginBottom: Spacing.md,
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    marginBottom: Spacing.md,
    padding: Spacing.sm,
    backgroundColor: "rgba(198, 40, 40, 0.1)",
    borderRadius: BorderRadius.md,
  },
  errorText: {
    color: "#C62828",
    flex: 1,
  },
  submitButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 15,
  },
  toast: {
    position: "absolute",
    bottom: 100,
    left: Spacing.lg,
    right: Spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    ...Shadows.large,
  },
  toastText: {
    color: "#FFFFFF",
    flex: 1,
    fontWeight: "500",
  },
});
