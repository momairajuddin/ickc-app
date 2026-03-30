import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { HeaderButton } from "@react-navigation/elements";
import { useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";

import ProfileScreen from "@/screens/ProfileScreen";
import { useScreenOptions } from "@/hooks/useScreenOptions";
import { useTheme } from "@/hooks/useTheme";

export type AboutStackParamList = {
  About: undefined;
};

const Stack = createNativeStackNavigator<AboutStackParamList>();

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
      testID="button-home-about"
    >
      <Feather name="home" size={22} color={theme.text} />
    </HeaderButton>
  );
}

export default function AboutStackNavigator() {
  const screenOptions = useScreenOptions();

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="About"
        component={ProfileScreen}
        options={{
          headerTitle: "About ICKC",
          headerLeft: () => <HomeButton />,
        }}
      />
    </Stack.Navigator>
  );
}
