import React, { useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Image,
  Platform,
  Alert,
  ActivityIndicator,
  Keyboard,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as WebBrowser from "expo-web-browser";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Shadows } from "@/constants/theme";
import { getApiUrl } from "@/lib/query-client";

const DONATION_TYPES = [
  { id: "sadaqah", label: "Sadaqah", amounts: [25, 50, 100, 200] },
  { id: "general", label: "General", amounts: [50, 100, 150, 200] },
  { id: "fitrana", label: "Fitrana", amounts: [10, 20, 30, 40] },
  { id: "zakath", label: "Zakath", amounts: [100, 200, 300, 500] },
];

const ZELLE_EMAIL = "ReachICKC@gmail.com";

export default function DonateScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme, isDark } = useTheme();

  const [selectedType, setSelectedType] = useState("sadaqah");
  const [selectedAmount, setSelectedAmount] = useState<number | null>(50);
  const [customAmount, setCustomAmount] = useState("");
  const [donationNote, setDonationNote] = useState("");
  const [coverFee, setCoverFee] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const currentType = DONATION_TYPES.find((t) => t.id === selectedType) || DONATION_TYPES[0];
  const presetAmounts = currentType.amounts;

  const handleTypeSelect = (typeId: string) => {
    Haptics.selectionAsync();
    setSelectedType(typeId);
    const newType = DONATION_TYPES.find((t) => t.id === typeId);
    if (newType && newType.amounts.length > 0) {
      setSelectedAmount(newType.amounts[1] || newType.amounts[0]);
    }
    setCustomAmount("");
  };

  const handleAmountSelect = (amount: number) => {
    Haptics.selectionAsync();
    setSelectedAmount(amount);
    setCustomAmount("");
  };

  const handleCustomAmountChange = (value: string) => {
    const numericValue = value.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1");
    setCustomAmount(numericValue);
    setSelectedAmount(null);
  };

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleDonate = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setErrorMessage(null);

    const amount = selectedAmount || parseFloat(customAmount) || 0;
    if (amount <= 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setErrorMessage("Please select or enter a donation amount.");
      return;
    }

    Keyboard.dismiss();
    setIsLoading(true);

    try {
      let apiUrl: string;
      try {
        apiUrl = getApiUrl();
      } catch {
        setErrorMessage("Unable to connect to the server. Please try again later or donate via Zelle at ReachICKC@gmail.com.");
        setIsLoading(false);
        return;
      }

      const feeNote = coverFee ? ` (includes $${feeAmount.toFixed(2)} CC fee coverage)` : "";
      const fullNote = donationNote.trim()
        ? `${donationNote.trim()}${feeNote}`
        : (coverFee ? `Donor covered 3% CC fee ($${feeAmount.toFixed(2)})` : undefined);

      const response = await fetch(new URL("/api/payments/create-checkout", apiUrl).toString(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: donationAmount,
          donationType: currentType.label,
          note: fullNote,
        }),
      });

      if (!response.ok) {
        let errorMsg = "Unable to process payment.";
        try {
          const data = await response.json();
          errorMsg = data.error || errorMsg;
        } catch {}
        throw new Error(errorMsg);
      }

      const data = await response.json();

      if (data.checkoutUrl) {
        await WebBrowser.openBrowserAsync(data.checkoutUrl);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        throw new Error("Unable to create payment link. Please try again.");
      }
    } catch (error: any) {
      console.error("Error creating payment:", error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setErrorMessage("Unable to process payment at this time. Please try again or donate via Zelle at ReachICKC@gmail.com.");
    } finally {
      setIsLoading(false);
    }
  };

  const baseAmount = selectedAmount || parseFloat(customAmount) || 0;
  const feeAmount = coverFee ? Math.round(baseAmount * 0.03 * 100) / 100 : 0;
  const donationAmount = Math.round((baseAmount + feeAmount) * 100) / 100;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      contentContainerStyle={{
        paddingTop: headerHeight + Spacing.lg,
        paddingBottom: insets.bottom + Spacing.xl,
        paddingHorizontal: Spacing.lg,
      }}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      onScrollBeginDrag={() => Keyboard.dismiss()}
    >
      <Animated.View entering={FadeInDown.delay(100).duration(600)}>
        <View style={[styles.verseCard, { backgroundColor: theme.backgroundDefault }]}>
          <LinearGradient
            colors={["rgba(10,77,104,0.08)", "rgba(30,136,229,0.05)"]}
            style={styles.verseGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
          <View style={[styles.verseBorder, { backgroundColor: "#0A4D68" }]} />
          <View style={styles.verseContent}>
            <ThemedText type="body" style={[styles.verseText, { color: theme.text }]}>
              "The example of those who spend their wealth in the way of Allah is like a seed which grows seven spikes; in each spike is a hundred grains."
            </ThemedText>
            <ThemedText type="caption" style={[styles.verseReference, { color: "#1E88E5" }]}>
              Surah Al-Baqarah 2:261
            </ThemedText>
          </View>
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(200).duration(600)}>
        <Image
          source={require("../../assets/images/charity-hands.png")}
          style={styles.charityImage}
          resizeMode="contain"
        />
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(300).duration(600)}>
        <ThemedText type="h3" style={[styles.sectionTitle, { color: theme.text }]}>
          Donation Type
        </ThemedText>
        <View style={styles.typesContainer}>
          {DONATION_TYPES.map((type) => (
            <Pressable
              key={type.id}
              onPress={() => handleTypeSelect(type.id)}
              style={[
                styles.typeChip,
                {
                  backgroundColor:
                    selectedType === type.id ? theme.primary : theme.backgroundDefault,
                  borderColor: selectedType === type.id ? theme.primary : theme.border,
                },
              ]}
              testID={`chip-${type.id}`}
            >
              <ThemedText
                type="small"
                style={{
                  color: selectedType === type.id ? "#FFFFFF" : theme.text,
                  fontWeight: selectedType === type.id ? "600" : "400",
                }}
              >
                {type.label}
              </ThemedText>
            </Pressable>
          ))}
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(400).duration(600)}>
        <ThemedText type="h3" style={[styles.sectionTitle, { color: theme.text }]}>
          Select Amount
        </ThemedText>
        <View style={styles.amountsGrid}>
          {presetAmounts.map((amount) => (
            <Pressable
              key={amount}
              onPress={() => handleAmountSelect(amount)}
              style={[
                styles.amountButton,
                {
                  backgroundColor:
                    selectedAmount === amount ? "#C41E3A" : theme.backgroundDefault,
                  borderColor: selectedAmount === amount ? "#C41E3A" : theme.border,
                },
              ]}
              testID={`amount-${amount}`}
            >
              <ThemedText
                type="h3"
                style={{
                  color: selectedAmount === amount ? "#FFFFFF" : theme.text,
                }}
              >
                ${amount}
              </ThemedText>
            </Pressable>
          ))}
        </View>

        <View style={styles.customAmountContainer}>
          <ThemedText type="small" style={[styles.customLabel, { color: theme.textSecondary }]}>
            Or enter custom amount
          </ThemedText>
          <View
            style={[
              styles.customInputContainer,
              {
                backgroundColor: theme.backgroundDefault,
                borderColor: customAmount ? "#C41E3A" : theme.border,
              },
            ]}
          >
            <ThemedText type="h3" style={[styles.dollarSign, { color: theme.textSecondary }]}>
              $
            </ThemedText>
            <TextInput
              style={[styles.customInput, { color: theme.text }]}
              value={customAmount}
              onChangeText={handleCustomAmountChange}
              placeholder="0.00"
              placeholderTextColor={theme.textSecondary}
              keyboardType="decimal-pad"
              returnKeyType="done"
              onSubmitEditing={() => Keyboard.dismiss()}
              testID="input-custom-amount"
            />
          </View>
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(450).duration(600)}>
        <ThemedText type="small" style={[styles.customLabel, { color: theme.textSecondary, marginBottom: Spacing.sm }]}>
          Add a note (optional)
        </ThemedText>
        <View
          style={[
            styles.customInputContainer,
            {
              backgroundColor: theme.backgroundDefault,
              borderColor: donationNote ? theme.primary : theme.border,
              height: 80,
              alignItems: "flex-start",
              paddingVertical: Spacing.sm,
            },
          ]}
        >
          <TextInput
            style={[styles.customInput, { color: theme.text, fontSize: 15, fontWeight: "400", textAlignVertical: "top" }]}
            value={donationNote}
            onChangeText={setDonationNote}
            placeholder="e.g. In memory of..., For masjid renovation..."
            placeholderTextColor={theme.textSecondary}
            multiline
            maxLength={200}
            returnKeyType="done"
            blurOnSubmit
            onSubmitEditing={() => Keyboard.dismiss()}
            testID="input-donation-note"
          />
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(475).duration(600)}>
        <Pressable
          onPress={() => {
            Haptics.selectionAsync();
            setCoverFee(!coverFee);
          }}
          style={[
            styles.feeToggle,
            {
              backgroundColor: coverFee
                ? (isDark ? "rgba(10,77,104,0.2)" : "rgba(10,77,104,0.08)")
                : theme.backgroundDefault,
              borderColor: coverFee ? "#0A4D68" : theme.border,
            },
          ]}
          testID="button-cover-fee"
        >
          <View style={[
            styles.feeCheckbox,
            {
              backgroundColor: coverFee ? "#0A4D68" : "transparent",
              borderColor: coverFee ? "#0A4D68" : theme.textSecondary,
            },
          ]}>
            {coverFee ? (
              <Feather name="check" size={14} color="#FFFFFF" />
            ) : null}
          </View>
          <View style={styles.feeTextContainer}>
            <ThemedText type="body" style={{ color: theme.text }}>
              I want to cover 3% CC processing fee
            </ThemedText>
            {baseAmount > 0 ? (
              <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: 2 }}>
                {coverFee
                  ? `+$${feeAmount.toFixed(2)} fee included`
                  : `Adds $${(Math.round(baseAmount * 0.03 * 100) / 100).toFixed(2)} to your donation`}
              </ThemedText>
            ) : null}
          </View>
        </Pressable>
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(500).duration(600)} style={styles.donateContainer}>
        <Pressable
          onPress={handleDonate}
          disabled={donationAmount <= 0 || isLoading}
          style={({ pressed }) => [
            styles.donateButton,
            {
              backgroundColor: donationAmount > 0 && !isLoading ? "#C41E3A" : theme.backgroundSecondary,
              opacity: (pressed && donationAmount > 0 && !isLoading) ? 0.85 : 1,
            },
            donationAmount > 0 && !isLoading && Shadows.medium,
          ]}
          testID="button-donate-submit"
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Feather
                name="heart"
                size={22}
                color={donationAmount > 0 ? "#FFFFFF" : theme.textSecondary}
              />
              <ThemedText
                type="button"
                style={{
                  color: donationAmount > 0 ? "#FFFFFF" : theme.textSecondary,
                  marginLeft: Spacing.sm,
                }}
              >
                {donationAmount > 0
                  ? `Donate $${donationAmount.toFixed(2)}`
                  : "Select an amount"}
              </ThemedText>
            </>
          )}
        </Pressable>

        {errorMessage ? (
          <View style={[styles.errorContainer, { backgroundColor: "rgba(196,30,58,0.1)", borderColor: "rgba(196,30,58,0.3)" }]}>
            <Feather name="alert-circle" size={16} color="#C41E3A" />
            <ThemedText type="caption" style={[styles.errorText, { color: "#C41E3A" }]}>
              {errorMessage}
            </ThemedText>
          </View>
        ) : null}

        <View style={styles.secureContainer}>
          <Feather name="lock" size={14} color={theme.textSecondary} />
          <ThemedText type="caption" style={{ color: theme.textSecondary, marginLeft: Spacing.xs }}>
            Secure payment powered by Square
          </ThemedText>
        </View>
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(700).duration(600)}>
        <View style={[styles.zelleCard, { backgroundColor: theme.backgroundDefault }]}>
          <LinearGradient
            colors={["rgba(10,77,104,0.08)", "rgba(30,136,229,0.05)"]}
            style={styles.zelleGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
          <View style={styles.zelleContent}>
            <View style={[styles.zelleIcon, { backgroundColor: "#6D1ED4" }]}>
              <ThemedText type="button" style={{ color: "#FFFFFF" }}>Z</ThemedText>
            </View>
            <View style={styles.zelleInfo}>
              <ThemedText type="h4" style={{ color: theme.text }}>
                Donate via Zelle
              </ThemedText>
              <ThemedText type="body" style={{ color: theme.primary, marginTop: Spacing.xs }}>
                {ZELLE_EMAIL}
              </ThemedText>
            </View>
          </View>
          <ThemedText type="caption" style={[styles.zelleNote, { color: theme.textSecondary }]}>
            Send directly from your bank app using the email above
          </ThemedText>
        </View>
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(800).duration(600)}>
        <View style={[styles.cashCheckCard, { backgroundColor: theme.backgroundDefault }]}>
          <Feather name="info" size={18} color={theme.accent} />
          <View style={styles.cashCheckInfo}>
            <ThemedText type="small" style={{ color: theme.text }}>
              Cash/Check donations can be brought to ICKC. Please make checks payable to "ICKC"
            </ThemedText>
          </View>
        </View>
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  verseCard: {
    flexDirection: "row",
    borderRadius: BorderRadius.md,
    overflow: "hidden",
    marginBottom: Spacing.xl,
  },
  verseGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
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
  charityImage: {
    width: "100%",
    height: 120,
    marginBottom: Spacing.xl,
    opacity: 0.9,
  },
  sectionTitle: {
    marginBottom: Spacing.md,
  },
  typesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  typeChip: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  amountsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  amountButton: {
    flex: 1,
    minWidth: "45%",
    height: 70,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  customAmountContainer: {
    marginBottom: Spacing.xl,
  },
  customLabel: {
    marginBottom: Spacing.sm,
  },
  customInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    height: 56,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.lg,
  },
  dollarSign: {
    marginRight: Spacing.xs,
  },
  customInput: {
    flex: 1,
    fontSize: 20,
    fontWeight: "600",
    fontFamily: "Montserrat_600SemiBold",
  },
  donateContainer: {
    marginBottom: Spacing.xl,
  },
  donateButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 56,
    borderRadius: BorderRadius.full,
    marginBottom: Spacing.lg,
  },
  secureContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  zelleCard: {
    borderRadius: BorderRadius.md,
    padding: Spacing.xl,
    marginBottom: Spacing.lg,
    overflow: "hidden",
  },
  zelleGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  zelleContent: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  zelleIcon: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.lg,
  },
  zelleInfo: {
    flex: 1,
  },
  zelleNote: {
    marginLeft: 60,
  },
  cashCheckCard: {
    flexDirection: "row",
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  cashCheckInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  errorText: {
    flex: 1,
    marginLeft: Spacing.sm,
  },
  feeToggle: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.xl,
  },
  feeCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  feeTextContainer: {
    flex: 1,
  },
});
