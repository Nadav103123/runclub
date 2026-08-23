// Stride Tribe design tokens — "Dark-First Utility" personality.
export const colors = {
  surface: "#101115",
  onSurface: "#FFFFFF",
  surfaceSecondary: "#1C1D24",
  onSurfaceSecondary: "#E0E0E0",
  surfaceTertiary: "#262831",
  onSurfaceTertiary: "#A0A0A5",
  surfaceInverse: "#FFFFFF",
  onSurfaceInverse: "#101115",
  brand: "#FF4D00",
  brandPrimary: "#FF4D00",
  onBrandPrimary: "#101115",
  brandSecondary: "#CC3D00",
  onBrandSecondary: "#FFFFFF",
  brandTertiary: "rgba(255, 77, 0, 0.15)",
  onBrandTertiary: "#FF4D00",
  success: "#00E676",
  onSuccess: "#101115",
  warning: "#FFC400",
  onWarning: "#101115",
  error: "#FF1744",
  onError: "#FFFFFF",
  border: "#2A2C35",
  borderStrong: "#3E414F",
  divider: "#2A2C35",
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  "2xl": 32,
  "3xl": 48,
} as const;

export const radius = {
  sm: 6,
  md: 12,
  lg: 20,
  pill: 999,
} as const;

// Font families registered in _layout.tsx via expo-font
export const fonts = {
  display: "BarlowCondensed-Bold",
  displaySemi: "BarlowCondensed-SemiBold",
  displayMedium: "BarlowCondensed-Medium",
  displayRegular: "BarlowCondensed-Regular",
  body: "IBMPlexSans-Regular",
  bodyMedium: "IBMPlexSans-Medium",
  bodySemi: "IBMPlexSans-SemiBold",
  bodyBold: "IBMPlexSans-Bold",
} as const;

export const font = {
  sm: 12,
  base: 14,
  lg: 16,
  xl: 20,
  "2xl": 24,
} as const;

export const CATEGORIES = ["Road", "Trail", "Beginner", "Marathon"] as const;
export const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

export const CATEGORY_COLORS: Record<string, string> = {
  Road: "#FF4D00",
  Trail: "#00E676",
  Beginner: "#FFC400",
  Marathon: "#7C4DFF",
};
