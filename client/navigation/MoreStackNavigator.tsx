import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { HeaderButton } from "@react-navigation/elements";
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import * as Haptics from "expo-haptics";

import MoreScreen from "@/screens/MoreScreen";
import EventsScreen from "@/screens/EventsScreen";
import NotificationsScreen from "@/screens/NotificationsScreen";
import ProfileScreen from "@/screens/ProfileScreen";
import RamadanTimetableScreen from "@/screens/RamadanTimetableScreen";
import ImamSignupScreen from "@/screens/ImamSignupScreen";
import EventSignupScreen from "@/screens/EventSignupScreen";
import CommunityIftaarScreen from "@/screens/CommunityIftaarScreen";
import { useScreenOptions } from "@/hooks/useScreenOptions";
import { useTheme } from "@/hooks/useTheme";

export type MoreStackParamList = {
  More: undefined;
  Events: undefined;
  Notifications: undefined;
  Profile: undefined;
  RamadanTimetable: undefined;
  ImamSignup: undefined;
  EventSignup: undefined;
  CommunityIftaar: undefined;
};

const Stack = createNativeStackNavigator<MoreStackParamList>();

function HomeButton() {
  const navigation = useNavigation<any>();
  const { theme } = useTheme();

  const handlePress = () => {
    Haptics.selectionAsync();
    navigation.navigate("HomeTab");
  };

  return (
    <HeaderButton onPress={handlePress} pressColor="rgba(0,0,0,0.2)" testID="button-home">
      <Feather name="home" size={22} color={theme.primary} />
    </HeaderButton>
  );
}

export default function MoreStackNavigator() {
  const screenOptions = useScreenOptions();

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="More"
        component={MoreScreen}
        options={{
          headerTitle: "More",
        }}
      />
      <Stack.Screen
        name="Events"
        component={EventsScreen}
        options={{
          headerTitle: "Upcoming Events",
          headerRight: () => <HomeButton />,
        }}
      />
      <Stack.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{
          headerTitle: "Alerts",
          headerRight: () => <HomeButton />,
        }}
      />
      <Stack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          headerTitle: "Profile",
          headerRight: () => <HomeButton />,
        }}
      />
      <Stack.Screen
        name="RamadanTimetable"
        component={RamadanTimetableScreen}
        options={{
          headerTitle: "Ramadan 2026",
          headerRight: () => <HomeButton />,
        }}
      />
      <Stack.Screen
        name="ImamSignup"
        component={ImamSignupScreen}
        options={{
          headerTitle: "Imam Sign-Up",
          headerRight: () => <HomeButton />,
        }}
      />
      <Stack.Screen
        name="EventSignup"
        component={EventSignupScreen}
        options={{
          headerTitle: "Event Sign-Up",
          headerRight: () => <HomeButton />,
        }}
      />
      <Stack.Screen
        name="CommunityIftaar"
        component={CommunityIftaarScreen}
        options={{
          headerTitle: "Community Iftaar",
          headerRight: () => <HomeButton />,
        }}
      />
    </Stack.Navigator>
  );
}
