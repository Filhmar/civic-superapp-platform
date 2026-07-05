/**
 * DESIGN_SPEC §3 shadows, approximated with RN shadow* + elevation.
 * Colored glows take the runtime brand color via the helper.
 */
import type { ViewStyle } from "react-native";

export const cardShadow: ViewStyle = {
  shadowColor: "#000",
  shadowOpacity: 0.07,
  shadowRadius: 22,
  shadowOffset: { width: 0, height: 8 },
  elevation: 4,
};

export const rowShadow: ViewStyle = {
  shadowColor: "#000",
  shadowOpacity: 0.04,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 4 },
  elevation: 2,
};

export const nearbyShadow: ViewStyle = {
  shadowColor: "#000",
  shadowOpacity: 0.06,
  shadowRadius: 16,
  shadowOffset: { width: 0, height: 6 },
  elevation: 3,
};

export const searchShadow: ViewStyle = {
  shadowColor: "#000",
  shadowOpacity: 0.12,
  shadowRadius: 20,
  shadowOffset: { width: 0, height: 8 },
  elevation: 6,
};

export const tileShadow: ViewStyle = {
  shadowColor: "#000",
  shadowOpacity: 0.05,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 4 },
  elevation: 2,
};

export const tabBarShadow: ViewStyle = {
  shadowColor: "#000",
  shadowOpacity: 0.05,
  shadowRadius: 24,
  shadowOffset: { width: 0, height: -6 },
  elevation: 12,
};

/** SOS bar red glow: 0 12px 26px rgba(229,57,53,.34). */
export const sosGlow: ViewStyle = {
  shadowColor: "#E53935",
  shadowOpacity: 0.34,
  shadowRadius: 26,
  shadowOffset: { width: 0, height: 12 },
  elevation: 8,
};

/** Primary CTA glow: 0 10px 22px rgba(primary,.28). */
export function primaryGlow(color: string): ViewStyle {
  return {
    shadowColor: color,
    shadowOpacity: 0.28,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  };
}
