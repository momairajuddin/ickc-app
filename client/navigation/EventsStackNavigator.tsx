import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { HeaderButton } from "@react-navigation/elements";
import { useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";

import EventsScreen from "@/screens/EventsScreen";
import { useScreenOptions } from "@/hooks/useScreenOptions";
import { useTheme } from "@/hooks/useTheme";

export type EventsStackParamList = {
  Events: undefined;
};

const Stack = createNativeStackNavigator<EventsStackParamList>();

function HomeButton() {
  const navigation = useNavigation<any>();
  const { theme } = useTheme();

  return (
    <HeaderButton
      onPress={() => {
        const parent = navigation.getParent();
        if (parent) {
          parent.navigate("HomeTab");
        } else {
          navigation.navigate("HomeTab");
        }
      }}
      pressColor="rgba(0,0,0,0.2)"
      testID="button-home-events"
    >
      <Feather name="home" size={22} color={theme.text} />
    </HeaderButton>
  );
}

export default function EventsStackNavigator() {
  const screenOptions = useScreenOptions();

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="Events"
        component={EventsScreen}
        options={{
          headerTitle: "Events",
          headerLeft: () => <HomeButton />,
        }}
      />
    </Stack.Navigator>
  );
}
