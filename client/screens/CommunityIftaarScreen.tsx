import React, { useState, useEffect, useCallback } from "react";
import { View, StyleSheet, ScrollView, Pressable, TextInput, Modal, ActivityIndicator, FlatList, RefreshControl, Keyboard } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Shadows } from "@/constants/theme";
import { getApiUrl } from "@/lib/query-client";

const COLORS = {
  primary: "#00B4A0",
  primaryDark: "#009688",
  accent: "#00A5FF",
  purple: "#00B4A0",
  danger: "#C41E3A",
  gradient1: "#00B4A0",
  gradient2: "#009688",
  gradient3: "#00796B",
};

const EVENT_NAME = "Community Iftaar";

type ModalView = "none" | "rsvp" | "attendees" | "edit" | "delete";

interface DateInfo {
  date: string;
  isoDate: string;
  ramadanDay: number;
}

interface Rsvp {
  id: string;
  eventDate: string;
  eventName: string;
  attendeeName: string;
  guestCount: number;
  createdAt: string;
}

interface GroupedRsvps {
  [date: string]: {
    attendees: Rsvp[];
    totalCount: number;
  };
}

const RAMADAN_START = new Date(2026, 1, 17);

function getRamadanDay(isoDate: string): number {
  const d = new Date(isoDate + "T12:00:00");
  const diff = Math.floor((d.getTime() - RAMADAN_START.getTime()) / (1000 * 60 * 60 * 24));
  return diff + 1;
}

function apiDateToDateInfo(item: { date: string; label?: string | null }): DateInfo {
  const d = new Date(item.date + "T12:00:00");
  const formatted = d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
  return {
    date: formatted,
    isoDate: item.date,
    ramadanDay: getRamadanDay(item.date),
  };
}

export default function CommunityIftaarScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme } = useTheme();
  
  const [activeModal, setActiveModal] = useState<ModalView>("none");
  const [selectedDate, setSelectedDate] = useState<DateInfo | null>(null);
  const [selectedRsvp, setSelectedRsvp] = useState<Rsvp | null>(null);
  const [name, setName] = useState("");
  const [guests, setGuests] = useState("");
  const [editName, setEditName] = useState("");
  const [editGuests, setEditGuests] = useState("");
  const [deletePasscode, setDeletePasscode] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [groupedRsvps, setGroupedRsvps] = useState<GroupedRsvps>({});
  const [selectedDateRsvps, setSelectedDateRsvps] = useState<Rsvp[]>([]);
  const [toastMessage, setToastMessage] = useState("");
  const [iftaarDates, setIftaarDates] = useState<DateInfo[]>([]);
  const [datesLoading, setDatesLoading] = useState(true);

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(""), 3000);
  };

  const closeModal = () => {
    setActiveModal("none");
    setSelectedRsvp(null);
    setDeletePasscode("");
  };

  const fetchRsvps = useCallback(async () => {
    try {
      const baseUrl = getApiUrl();
      const url = new URL("/api/event-rsvps", baseUrl);
      url.searchParams.append("eventName", EVENT_NAME);
      
      const response = await fetch(url.toString());
      if (response.ok) {
        const data = await response.json();
        setGroupedRsvps(data.grouped || {});
      }
    } catch (error) {
      console.error("Error fetching RSVPs:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const fetchIftaarDates = useCallback(async () => {
    try {
      const baseUrl = getApiUrl();
      const url = new URL("/api/community-iftaar-dates", baseUrl);
      const response = await fetch(url.toString());
      if (response.ok) {
        const data = await response.json();
        setIftaarDates(data.map(apiDateToDateInfo));
      }
    } catch (error) {
      console.error("Error fetching iftaar dates:", error);
    } finally {
      setDatesLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchIftaarDates();
    fetchRsvps();
  }, [fetchIftaarDates, fetchRsvps]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchIftaarDates();
    fetchRsvps();
  }, [fetchIftaarDates, fetchRsvps]);

  const handleRSVP = (dateInfo: DateInfo) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedDate(dateInfo);
    setName("");
    setGuests("");
    setActiveModal("rsvp");
  };

  const handleViewAttendees = (dateInfo: DateInfo) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedDate(dateInfo);
    const dateData = groupedRsvps[dateInfo.isoDate];
    setSelectedDateRsvps(dateData ? dateData.attendees : []);
    setActiveModal("attendees");
  };

  const handleSubmit = async () => {
    if (!name.trim() || !selectedDate) return;
    
    setSubmitting(true);
    try {
      const baseUrl = getApiUrl();
      const url = new URL("/api/event-rsvps", baseUrl);
      
      const response = await fetch(url.toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventDate: selectedDate.isoDate,
          eventName: EVENT_NAME,
          attendeeName: name.trim(),
          guestCount: parseInt(guests) || 0,
        }),
      });
      
      if (response.ok) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        closeModal();
        showToast("RSVP submitted successfully!");
        fetchRsvps();
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        showToast("Failed to submit RSVP");
      }
    } catch (error) {
      console.error("Error submitting RSVP:", error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      showToast("Failed to submit RSVP");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditRsvp = (rsvp: Rsvp) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedRsvp(rsvp);
    setEditName(rsvp.attendeeName);
    setEditGuests(rsvp.guestCount.toString());
    setActiveModal("edit");
  };

  const handleDeleteRsvp = (rsvp: Rsvp) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedRsvp(rsvp);
    setDeletePasscode("");
    setActiveModal("delete");
  };

  const submitEdit = async () => {
    if (!editName.trim() || !selectedRsvp) return;
    
    setSubmitting(true);
    try {
      const baseUrl = getApiUrl();
      const url = new URL(`/api/event-rsvps/${selectedRsvp.id}`, baseUrl);
      
      const response = await fetch(url.toString(), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attendeeName: editName.trim(),
          guestCount: parseInt(editGuests) || 0,
        }),
      });
      
      if (response.ok) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        closeModal();
        showToast("RSVP updated successfully!");
        fetchRsvps();
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        showToast("Failed to update RSVP");
      }
    } catch (error) {
      console.error("Error updating RSVP:", error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      showToast("Failed to update RSVP");
    } finally {
      setSubmitting(false);
    }
  };

  const submitDelete = async () => {
    if (!deletePasscode.trim() || !selectedRsvp) return;
    
    setSubmitting(true);
    try {
      const baseUrl = getApiUrl();
      const url = new URL(`/api/event-rsvps/${selectedRsvp.id}`, baseUrl);
      
      const response = await fetch(url.toString(), {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode: deletePasscode }),
      });
      
      if (response.ok) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        closeModal();
        showToast("RSVP deleted successfully!");
        fetchRsvps();
      } else {
        const data = await response.json();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        showToast(data.error || "Failed to delete RSVP");
      }
    } catch (error) {
      console.error("Error deleting RSVP:", error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      showToast("Failed to delete RSVP");
    } finally {
      setSubmitting(false);
    }
  };

  const goBackToAttendees = () => {
    if (selectedDate) {
      const dateData = groupedRsvps[selectedDate.isoDate];
      setSelectedDateRsvps(dateData ? dateData.attendees : []);
    }
    setActiveModal("attendees");
  };

  const getAttendeeCount = (isoDate: string): number => {
    return groupedRsvps[isoDate]?.totalCount || 0;
  };

  const renderModalContent = () => {
    switch (activeModal) {
      case "rsvp":
        return (
          <View style={[styles.modalContent, { backgroundColor: theme.backgroundDefault }]}>
            <LinearGradient
              colors={[COLORS.primary, COLORS.primaryDark]}
              style={styles.modalHeader}
            >
              <ThemedText type="h3" style={styles.modalTitle}>RSVP</ThemedText>
              <ThemedText type="caption" style={styles.modalSubtitle}>
                {selectedDate?.date}
              </ThemedText>
            </LinearGradient>
            <View style={styles.modalBody}>
              <View style={styles.inputGroup}>
                <ThemedText type="small" style={[styles.inputLabel, { color: theme.textSecondary }]}>
                  Your Name *
                </ThemedText>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.surfaceElevated, color: theme.text, borderColor: theme.border }]}
                  value={name}
                  onChangeText={setName}
                  placeholder="Enter your name"
                  placeholderTextColor={theme.textSecondary}
                  testID="input-name"
                />
              </View>
              <View style={styles.inputGroup}>
                <ThemedText type="small" style={[styles.inputLabel, { color: theme.textSecondary }]}>
                  Number of Guests (optional)
                </ThemedText>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.surfaceElevated, color: theme.text, borderColor: theme.border }]}
                  value={guests}
                  onChangeText={setGuests}
                  placeholder="e.g., 3"
                  placeholderTextColor={theme.textSecondary}
                  keyboardType="number-pad"
                  returnKeyType="done"
                  blurOnSubmit
                  onSubmitEditing={() => Keyboard.dismiss()}
                  testID="input-guests"
                />
              </View>
              <View style={styles.modalActions}>
                <Pressable
                  onPress={closeModal}
                  style={[styles.cancelButton, { borderColor: theme.border }]}
                  testID="button-cancel-rsvp"
                >
                  <ThemedText type="button" style={{ color: theme.textSecondary }}>Cancel</ThemedText>
                </Pressable>
                <Pressable
                  onPress={handleSubmit}
                  disabled={!name.trim() || submitting}
                  style={[
                    styles.submitButton,
                    { backgroundColor: name.trim() && !submitting ? COLORS.primary : theme.border }
                  ]}
                  testID="button-submit-rsvp"
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <ThemedText type="button" style={{ color: "#FFFFFF" }}>Submit RSVP</ThemedText>
                  )}
                </Pressable>
              </View>
            </View>
          </View>
        );

      case "attendees":
        return (
          <View style={[styles.modalContent, { backgroundColor: theme.backgroundDefault, maxHeight: "80%" }]}>
            <LinearGradient
              colors={[COLORS.primary, COLORS.primaryDark]}
              style={styles.modalHeader}
            >
              <ThemedText type="h3" style={styles.modalTitle}>Attendees</ThemedText>
              <ThemedText type="caption" style={styles.modalSubtitle}>
                {selectedDate?.date} - {groupedRsvps[selectedDate?.isoDate || ""]?.totalCount || 0} total
              </ThemedText>
            </LinearGradient>
            <View style={styles.attendeeListContainer}>
              {selectedDateRsvps.length === 0 ? (
                <View style={styles.emptyAttendees}>
                  <Feather name="users" size={40} color={theme.textSecondary} />
                  <ThemedText type="body" style={{ color: theme.textSecondary, marginTop: Spacing.md }}>
                    No attendees yet
                  </ThemedText>
                </View>
              ) : (
                <FlatList
                  data={selectedDateRsvps}
                  keyExtractor={(item) => item.id}
                  nestedScrollEnabled={true}
                  scrollEnabled={true}
                  renderItem={({ item }) => (
                    <View style={[styles.attendeeRow, { borderBottomColor: theme.border }]}>
                      <View style={styles.attendeeInfo}>
                        <View style={[styles.attendeeAvatar, { backgroundColor: COLORS.primary }]}>
                          <ThemedText type="small" style={styles.avatarText}>
                            {item.attendeeName.charAt(0).toUpperCase()}
                          </ThemedText>
                        </View>
                        <View style={styles.attendeeDetails}>
                          <ThemedText type="body" style={{ color: theme.text }}>
                            {item.attendeeName}
                          </ThemedText>
                          <View style={styles.guestBadgeSmall}>
                            <Feather name="users" size={10} color={COLORS.accent} />
                            <ThemedText type="caption" style={{ color: COLORS.accent }}>
                              {1 + item.guestCount} {item.guestCount > 0 ? `(+${item.guestCount} guests)` : "person"}
                            </ThemedText>
                          </View>
                        </View>
                      </View>
                      <View style={styles.attendeeActions}>
                        <Pressable
                          onPress={() => handleEditRsvp(item)}
                          style={({ pressed }) => [
                            styles.actionButton, 
                            { backgroundColor: COLORS.primary, opacity: pressed ? 0.7 : 1 }
                          ]}
                          testID={`button-edit-${item.id}`}
                        >
                          <Feather name="edit-2" size={16} color="#FFFFFF" />
                        </Pressable>
                        <Pressable
                          onPress={() => handleDeleteRsvp(item)}
                          style={({ pressed }) => [
                            styles.actionButton, 
                            { backgroundColor: COLORS.danger, opacity: pressed ? 0.7 : 1 }
                          ]}
                          testID={`button-delete-${item.id}`}
                        >
                          <Feather name="trash-2" size={16} color="#FFFFFF" />
                        </Pressable>
                      </View>
                    </View>
                  )}
                />
              )}
            </View>
            <View style={styles.attendeeModalFooter}>
              <Pressable
                onPress={closeModal}
                style={[styles.closeButton, { backgroundColor: COLORS.primary }]}
                testID="button-close-attendees"
              >
                <ThemedText type="button" style={{ color: "#FFFFFF" }}>Close</ThemedText>
              </Pressable>
            </View>
          </View>
        );

      case "edit":
        return (
          <View style={[styles.modalContent, { backgroundColor: theme.backgroundDefault }]}>
            <LinearGradient
              colors={[COLORS.primary, COLORS.primaryDark]}
              style={styles.modalHeader}
            >
              <ThemedText type="h3" style={styles.modalTitle}>Edit RSVP</ThemedText>
              <ThemedText type="caption" style={styles.modalSubtitle}>
                Update attendance details
              </ThemedText>
            </LinearGradient>
            <View style={styles.modalBody}>
              <View style={styles.inputGroup}>
                <ThemedText type="small" style={[styles.inputLabel, { color: theme.textSecondary }]}>
                  Name *
                </ThemedText>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.surfaceElevated, color: theme.text, borderColor: theme.border }]}
                  value={editName}
                  onChangeText={setEditName}
                  placeholder="Enter name"
                  placeholderTextColor={theme.textSecondary}
                  testID="input-edit-name"
                />
              </View>
              <View style={styles.inputGroup}>
                <ThemedText type="small" style={[styles.inputLabel, { color: theme.textSecondary }]}>
                  Number of Guests
                </ThemedText>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.surfaceElevated, color: theme.text, borderColor: theme.border }]}
                  value={editGuests}
                  onChangeText={setEditGuests}
                  placeholder="e.g., 3"
                  placeholderTextColor={theme.textSecondary}
                  keyboardType="number-pad"
                  returnKeyType="done"
                  blurOnSubmit
                  onSubmitEditing={() => Keyboard.dismiss()}
                  testID="input-edit-guests"
                />
              </View>
              <View style={styles.modalActions}>
                <Pressable
                  onPress={goBackToAttendees}
                  style={[styles.cancelButton, { borderColor: theme.border }]}
                >
                  <ThemedText type="button" style={{ color: theme.textSecondary }}>Back</ThemedText>
                </Pressable>
                <Pressable
                  onPress={submitEdit}
                  disabled={!editName.trim() || submitting}
                  style={[
                    styles.submitButton,
                    { backgroundColor: editName.trim() && !submitting ? COLORS.primary : theme.border }
                  ]}
                  testID="button-submit-edit"
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <ThemedText type="button" style={{ color: "#FFFFFF" }}>Save Changes</ThemedText>
                  )}
                </Pressable>
              </View>
            </View>
          </View>
        );

      case "delete":
        return (
          <View style={[styles.modalContent, { backgroundColor: theme.backgroundDefault }]}>
            <LinearGradient
              colors={[COLORS.danger, "#8B0000"]}
              style={styles.modalHeader}
            >
              <ThemedText type="h3" style={styles.modalTitle}>Delete RSVP</ThemedText>
              <ThemedText type="caption" style={styles.modalSubtitle}>
                {selectedRsvp?.attendeeName}
              </ThemedText>
            </LinearGradient>
            <View style={styles.modalBody}>
              <View style={styles.deleteWarning}>
                <Feather name="alert-triangle" size={24} color={COLORS.danger} />
                <ThemedText type="body" style={[styles.deleteWarningText, { color: theme.text }]}>
                  This action cannot be undone. Enter the password to confirm deletion.
                </ThemedText>
              </View>
              <View style={styles.inputGroup}>
                <ThemedText type="small" style={[styles.inputLabel, { color: theme.textSecondary }]}>
                  Password *
                </ThemedText>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.surfaceElevated, color: theme.text, borderColor: theme.border }]}
                  value={deletePasscode}
                  onChangeText={setDeletePasscode}
                  placeholder="Enter password"
                  placeholderTextColor={theme.textSecondary}
                  secureTextEntry
                  testID="input-delete-passcode"
                />
              </View>
              <View style={styles.modalActions}>
                <Pressable
                  onPress={goBackToAttendees}
                  style={[styles.cancelButton, { borderColor: theme.border }]}
                >
                  <ThemedText type="button" style={{ color: theme.textSecondary }}>Back</ThemedText>
                </Pressable>
                <Pressable
                  onPress={submitDelete}
                  disabled={!deletePasscode.trim() || submitting}
                  style={[
                    styles.submitButton,
                    { backgroundColor: deletePasscode.trim() && !submitting ? COLORS.danger : theme.border }
                  ]}
                  testID="button-confirm-delete"
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <ThemedText type="button" style={{ color: "#FFFFFF" }}>Delete</ThemedText>
                  )}
                </Pressable>
              </View>
            </View>
          </View>
        );

      default:
        return null;
    }
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
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <Animated.View entering={FadeInDown.delay(100).duration(600)}>
          <LinearGradient
            colors={[COLORS.gradient1, COLORS.gradient2, COLORS.gradient3]}
            style={styles.headerCard}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.headerGlow} />
            <View style={styles.headerContent}>
              <View style={styles.iconContainer}>
                <LinearGradient
                  colors={[COLORS.accent, "#B8860B"]}
                  style={styles.iconGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Feather name="moon" size={28} color="#FFFFFF" />
                </LinearGradient>
              </View>
              <ThemedText type="h2" style={styles.headerTitle}>
                Community Iftaar RSVP
              </ThemedText>
              <ThemedText type="body" style={styles.headerSubtitle}>
                Ramadan 2026
              </ThemedText>
            </View>
          </LinearGradient>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(200).duration(600)}>
          <View style={[styles.eventBody, { backgroundColor: theme.backgroundDefault, borderRadius: BorderRadius.lg, ...Shadows.medium }]}>
            <View style={styles.infoRow}>
              <Feather name="info" size={16} color={COLORS.accent} />
              <ThemedText type="body" style={[styles.infoText, { color: theme.textSecondary }]}>
                Join us for a blessed community Iftaar during Ramadan. Please RSVP to help us prepare.
              </ThemedText>
            </View>

            {(loading || datesLoading) ? (
              <ActivityIndicator size="large" color={COLORS.primary} style={{ marginVertical: Spacing.xl }} />
            ) : iftaarDates.length === 0 ? (
              <View style={{ alignItems: "center", paddingVertical: Spacing.xl }}>
                <Feather name="calendar" size={40} color={theme.textSecondary} />
                <ThemedText type="body" style={{ color: theme.textSecondary, marginTop: Spacing.md, textAlign: "center" }}>
                  Community Iftaar dates will be displayed here during Ramadan.
                </ThemedText>
              </View>
            ) : (
              <View style={styles.datesContainer}>
                {iftaarDates.map((dateInfo, index) => {
                  const attendeeCount = getAttendeeCount(dateInfo.isoDate);
                  return (
                    <Animated.View
                      key={dateInfo.date}
                      entering={FadeInUp.delay(300 + index * 100).duration(400)}
                    >
                      <View
                        style={[
                          styles.dateCard,
                          {
                            backgroundColor: theme.backgroundDefault,
                            borderColor: theme.border,
                          },
                        ]}
                      >
                        <Pressable
                          onPress={() => attendeeCount > 0 ? handleViewAttendees(dateInfo) : null}
                          style={styles.dateInfo}
                          disabled={attendeeCount === 0}
                        >
                          <View style={[styles.dayBadge, { backgroundColor: COLORS.accent }]}>
                            <ThemedText type="small" style={styles.dayBadgeText}>
                              Day {dateInfo.ramadanDay}
                            </ThemedText>
                          </View>
                          <View style={styles.dateTextContainer}>
                            <ThemedText type="body" style={[styles.dateText, { color: theme.text }]}>
                              {dateInfo.date}
                            </ThemedText>
                            {attendeeCount > 0 ? (
                              <Pressable 
                                onPress={() => handleViewAttendees(dateInfo)}
                                style={styles.attendeeCountBadge}
                              >
                                <Feather name="users" size={12} color={COLORS.primary} />
                                <ThemedText type="small" style={[styles.attendeeCountText, { color: COLORS.primary }]}>
                                  {attendeeCount} attending
                                </ThemedText>
                                <Feather name="chevron-right" size={12} color={COLORS.primary} />
                              </Pressable>
                            ) : null}
                          </View>
                        </Pressable>
                        
                        <Pressable
                          onPress={() => handleRSVP(dateInfo)}
                          style={({ pressed }) => [
                            styles.rsvpButton,
                            { 
                              backgroundColor: COLORS.primary,
                              opacity: pressed ? 0.8 : 1,
                            }
                          ]}
                          testID={`button-rsvp-${index}`}
                        >
                          <Feather name="plus" size={16} color="#FFFFFF" />
                          <ThemedText type="small" style={styles.rsvpButtonText}>RSVP</ThemedText>
                        </Pressable>
                      </View>
                    </Animated.View>
                  );
                })}
              </View>
            )}
          </View>
        </Animated.View>
      </ScrollView>

      {toastMessage ? (
        <View style={[styles.toast, { backgroundColor: theme.text }]}>
          <ThemedText type="small" style={{ color: theme.backgroundDefault }}>
            {toastMessage}
          </ThemedText>
        </View>
      ) : null}

      <Modal
        visible={activeModal !== "none"}
        transparent
        animationType="fade"
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          {renderModalContent()}
        </View>
      </Modal>
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
  eventBody: {
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  infoRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  infoText: {
    flex: 1,
    lineHeight: 22,
  },
  datesContainer: {
    gap: Spacing.md,
  },
  dateCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  dateInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    flex: 1,
  },
  dateTextContainer: {
    flex: 1,
  },
  dayBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  dayBadgeText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  dateText: {
    fontWeight: "500",
  },
  attendeeCountBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  attendeeCountText: {
    fontWeight: "500",
  },
  rsvpButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  rsvpButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  toast: {
    position: "absolute",
    bottom: 100,
    left: Spacing.lg,
    right: Spacing.lg,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.lg,
  },
  modalContent: {
    width: "100%",
    maxWidth: 400,
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
    ...Shadows.large,
  },
  modalHeader: {
    padding: Spacing.lg,
    alignItems: "center",
  },
  modalTitle: {
    color: "#FFFFFF",
  },
  modalSubtitle: {
    color: "rgba(255, 255, 255, 0.8)",
    marginTop: 4,
  },
  modalBody: {
    padding: Spacing.lg,
  },
  inputGroup: {
    marginBottom: Spacing.md,
  },
  inputLabel: {
    marginBottom: Spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: 16,
  },
  modalActions: {
    flexDirection: "row",
    gap: Spacing.md,
    marginTop: Spacing.lg,
  },
  cancelButton: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    alignItems: "center",
  },
  submitButton: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: "center",
  },
  attendeeListContainer: {
    maxHeight: 300,
    paddingHorizontal: Spacing.lg,
  },
  emptyAttendees: {
    alignItems: "center",
    paddingVertical: Spacing.xl,
  },
  attendeeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  attendeeInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    flex: 1,
  },
  attendeeAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  guestBadgeSmall: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  attendeeActions: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  attendeeDetails: {
    flex: 1,
  },
  attendeeModalFooter: {
    padding: Spacing.lg,
  },
  closeButton: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: "center",
  },
  deleteWarning: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.md,
    marginBottom: Spacing.lg,
    padding: Spacing.md,
    backgroundColor: "rgba(196, 30, 58, 0.1)",
    borderRadius: BorderRadius.md,
  },
  deleteWarningText: {
    flex: 1,
    lineHeight: 22,
  },
});
