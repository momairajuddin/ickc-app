import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { View, StyleSheet, Image } from "react-native";

import HomeScreen from "@/screens/HomeScreen";
import { ThemedText } from "@/components/ThemedText";
import { useScreenOptions } from "@/hooks/useScreenOptions";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, Typography } from "@/constants/theme";

export type HomeStackParamList = {
  Home: undefined;
};

const Stack = createNativeStackNavigator<HomeStackParamList>();

function HeaderTitle() {
  const { theme } = useTheme();

  return (
    <View style={styles.headerContainer}>
      <Image
        source={require("../../assets/images/ickc-logo.png")}
        style={styles.headerLogo}
        resizeMode="contain"
      />
      <ThemedText style={[styles.headerTitle, { color: theme.text }]}>
        ICKC
      </ThemedText>
    </View>
  );
}

export default function HomeStackNavigator() {
  const screenOptions = useScreenOptions();

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="Home"
        component={HomeScreen}
        options={{
          headerTitle: () => <HeaderTitle />,
        }}
      />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerLogo: {
    width: 32,
    height: 32,
    borderRadius: 6,
    marginRight: Spacing.sm,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    fontFamily: "Montserrat_700Bold",
  },
});
