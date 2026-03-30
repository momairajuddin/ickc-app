import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { HeaderButton } from "@react-navigation/elements";
import { useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";

import NotificationsScreen from "@/screens/NotificationsScreen";
import { useScreenOptions } from "@/hooks/useScreenOptions";
import { useTheme } from "@/hooks/useTheme";

export type NotificationsStackParamList = {
  Notifications: undefined;
};

const Stack = createNativeStackNavigator<NotificationsStackParamList>();

function HomeButton() {
  const navigation = useNavigation<any>();
  const { theme } = useTheme();

  return (
    <HeaderButton
      onPress={() => navigation.navigate("HomeTab")}
      pressColor="rgba(0,0,0,0.2)"
      testID="button-home-alerts"
    >
      <Feather name="home" size={22} color={theme.text} />
    </HeaderButton>
  );
}

export default function NotificationsStackNavigator() {
  const screenOptions = useScreenOptions();

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{
          headerTitle: "Notifications",
          headerLeft: () => <HomeButton />,
        }}
      />
    </Stack.Navigator>
  );
}
