import { Platform } from "react-native";

const primaryTeal = "#00B4A0";
const primaryLightTeal = "#00D4AA";
const accentBlue = "#00A5FF";
const accentGold = "#D4AF37";

export const Colors = {
  light: {
    text: "#000000",
    textSecondary: "#5F6368",
    buttonText: "#FFFFFF",
    tabIconDefault: "#5F6368",
    tabIconSelected: primaryTeal,
    link: accentBlue,
    primary: primaryTeal,
    primaryLight: primaryLightTeal,
    accent: accentBlue,
    accentLight: "#33B8FF",
    accentGold: accentGold,
    success: "#4CAF50",
    error: "#FF6B6B",
    border: "#E0E0E0",
    backgroundRoot: "#FFFFFF",
    backgroundDefault: "#FFFFFF",
    backgroundSecondary: "#F5F7FA",
    backgroundTertiary: "#E8F5F3",
    surfaceElevated: "rgba(0,180,160,0.08)",
    surfaceTeal: "rgba(0,212,170,0.1)",
    surfaceBlue: "rgba(0,165,255,0.08)",
    glow: "rgba(0,212,170,0.4)",
    glowBlue: "rgba(0,165,255,0.3)",
  },
  dark: {
    text: "#FFFFFF",
    textSecondary: "#B0B8C8",
    buttonText: "#FFFFFF",
    tabIconDefault: "#9BA1A6",
    tabIconSelected: primaryLightTeal,
    link: accentBlue,
    primary: primaryTeal,
    primaryLight: primaryLightTeal,
    accent: accentBlue,
    accentLight: "#33B8FF",
    accentGold: accentGold,
    success: "#4CAF50",
    error: "#FF6B6B",
    border: "#2A3F5F",
    backgroundRoot: "#0A0E1A",
    backgroundDefault: "#1A1F2E",
    backgroundSecondary: "#252B3C",
    backgroundTertiary: "#2E3547",
    surfaceElevated: "rgba(0,180,160,0.12)",
    surfaceTeal: "rgba(0,212,170,0.15)",
    surfaceBlue: "rgba(0,165,255,0.12)",
    glow: "rgba(0,212,170,0.4)",
    glowBlue: "rgba(0,165,255,0.3)",
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  "3xl": 32,
  "4xl": 40,
  "5xl": 48,
  inputHeight: 48,
  buttonHeight: 52,
};

export const BorderRadius = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 30,
  "2xl": 40,
  "3xl": 50,
  full: 9999,
};

export const Typography = {
  hero: {
    fontSize: 32,
    lineHeight: 40,
    fontWeight: "700" as const,
    fontFamily: "Montserrat_700Bold",
  },
  h1: {
    fontSize: 24,
    lineHeight: 32,
    fontWeight: "600" as const,
    fontFamily: "Montserrat_600SemiBold",
  },
  h2: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: "600" as const,
    fontFamily: "Montserrat_600SemiBold",
  },
  h3: {
    fontSize: 18,
    lineHeight: 26,
    fontWeight: "600" as const,
    fontFamily: "Montserrat_600SemiBold",
  },
  h4: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "600" as const,
    fontFamily: "Montserrat_600SemiBold",
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "400" as const,
    fontFamily: "Montserrat_400Regular",
  },
  small: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "400" as const,
    fontFamily: "Montserrat_400Regular",
  },
  caption: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "400" as const,
    fontFamily: "Montserrat_400Regular",
  },
  button: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "600" as const,
    fontFamily: "Montserrat_600SemiBold",
  },
  link: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "400" as const,
    fontFamily: "Montserrat_400Regular",
  },
};

export const Shadows = {
  small: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  medium: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  large: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  glow: {
    shadowColor: primaryLightTeal,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 8,
  },
  glowBlue: {
    shadowColor: accentBlue,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 6,
  },
  teal: {
    shadowColor: primaryTeal,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: "system-ui",
    serif: "ui-serif",
    rounded: "ui-rounded",
    mono: "ui-monospace",
  },
  default: {
    sans: "normal",
    serif: "serif",
    rounded: "normal",
    mono: "monospace",
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded:
      "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
