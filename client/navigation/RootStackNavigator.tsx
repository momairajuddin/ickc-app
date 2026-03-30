import React, { useState, useEffect } from "react";
import { Platform, Pressable } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { HeaderButton } from "@react-navigation/elements";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Feather } from "@expo/vector-icons";

import { useNavigation } from "@react-navigation/native";
import * as Haptics from "expo-haptics";

import MainTabNavigator from "@/navigation/MainTabNavigator";
import DonateScreen from "@/screens/DonateScreen";
import WelcomeScreen from "@/screens/WelcomeScreen";
import RamadanTimetableScreen from "@/screens/RamadanTimetableScreen";
import ImamSignupScreen from "@/screens/ImamSignupScreen";
import EventSignupScreen from "@/screens/EventSignupScreen";
import { useScreenOptions } from "@/hooks/useScreenOptions";
import { useTheme } from "@/hooks/useTheme";

function HomeButton() {
  const navigation = useNavigation<any>();
  const { theme } = useTheme();

  const handlePress = () => {
    Haptics.selectionAsync();
    navigation.navigate("Main", { screen: "HomeTab" });
  };

  return (
    <HeaderButton onPress={handlePress} pressColor="rgba(0,0,0,0.2)" testID="button-home">
      <Feather name="home" size={22} color={theme.primary} />
    </HeaderButton>
  );
}

export type RootStackParamList = {
  Welcome: undefined;
  Main: undefined;
  Donate: undefined;
  RamadanTimetable: undefined;
  ImamSignup: undefined;
  EventSignup: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const ONBOARDING_KEY = "hasSeenWelcome";

export default function RootStackNavigator() {
  const screenOptions = useScreenOptions();
  const { theme } = useTheme();
  const [isLoading, setIsLoading] = useState(true);
  const [hasSeenWelcome, setHasSeenWelcome] = useState(false);

  useEffect(() => {
    checkOnboarding();
  }, []);

  const checkOnboarding = async () => {
    try {
      const value = await AsyncStorage.getItem(ONBOARDING_KEY);
      setHasSeenWelcome(value === "true");
    } catch (error) {
      console.error("Error checking onboarding:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleContinue = async () => {
    try {
      await AsyncStorage.setItem(ONBOARDING_KEY, "true");
      setHasSeenWelcome(true);
    } catch (error) {
      console.error("Error saving onboarding state:", error);
      setHasSeenWelcome(true);
    }
  };

  if (isLoading) {
    return null;
  }

  if (!hasSeenWelcome) {
    return <WelcomeScreen onContinue={handleContinue} />;
  }

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="Main"
        component={MainTabNavigator}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Donate"
        component={DonateScreen}
        options={({ navigation }) => ({
          presentation: Platform.OS === "ios" ? "modal" : "card",
          headerTitle: "Donate",
          headerTintColor: theme.text,
          headerBackVisible: false,
          headerLeft: () => (
            <HeaderButton
              onPress={() => navigation.goBack()}
              pressColor="rgba(0,0,0,0.2)"
              testID="button-close-donate"
            >
              <Feather name="x" size={24} color={theme.text} />
            </HeaderButton>
          ),
        })}
      />
      <Stack.Screen
        name="RamadanTimetable"
        component={RamadanTimetableScreen}
        options={{
          headerTitle: "Ramadan 2026",
          headerTintColor: theme.text,
          headerRight: () => <HomeButton />,
        }}
      />
      <Stack.Screen
        name="ImamSignup"
        component={ImamSignupScreen}
        options={{
          headerTitle: "Imam Sign-Up",
          headerTintColor: theme.text,
          headerRight: () => <HomeButton />,
        }}
      />
      <Stack.Screen
        name="EventSignup"
        component={EventSignupScreen}
        options={{
          headerTitle: "Event Signup",
          headerTintColor: theme.text,
          headerRight: () => <HomeButton />,
        }}
      />
    </Stack.Navigator>
  );
}
