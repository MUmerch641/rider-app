// ─── COLORS ──────────────────────────────────────────────────────────────────
export const Colors = {
  // Brand
  primary: "#7a4fe0",
  primaryLight: "#b29bc7",
  primaryGradient: ["#A855F7", "#4F18C8"],
  reject: "#67537C",

  // Accent
  accent: "#F5C518", // yellow — buttons, stars, icons
  accentBg: "#FFF8E1", // light yellow bg (Chat with Support card)

  // Semantic
  success: "#22C55E",
  successBg: "#DCFCE7",
  danger: "#EF4444",
  dangerBg: "#FEE2E2",
  warning: "#F97316",
  dark: "#1A1A1A",

  // Neutral
  background: "#FFFFFF", // global page bg
  card: "#FFFFFF",
  border: "#fff",
  borderButton: "#3f1a9681",
  inputBg: "#F3F4F6",
  divider: "#EEEEEE",

  // Text
  textPrimary: "#1A1A1A",
  textSecondary: "#6B7280",
  textMuted: "#9CA3AF",
  textInverse: "#FFFFFF",

  // Tab bar
  tabActive: "#3F1A96",
  tabInactive: "#3f1a96bb",

  // Overlay
  overlay: "rgba(0,0,0,0.45)",

  // Open / Closed status
  open: "#22C55E",
  closed: "#EF4444",
};

// ─── SPACING ─────────────────────────────────────────────────────────────────
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

// ─── BORDER RADIUS ───────────────────────────────────────────────────────────
export const Radius = {
  sm: 8,
  md: 12,
  lg: 24,
  xl: 33, // large modal / card from the Swift code
  full: 999,
};

// ─── FONT SIZES ──────────────────────────────────────────────────────────────
export const FontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 18,
  xl: 22,
  xxl: 28,
  display: 34,
};

// ─── FONT WEIGHTS ────────────────────────────────────────────────────────────
export const FontWeight = {
  regular: "400" as const,
  medium: "500" as const,
  semibold: "600" as const,
  bold: "700" as const,
  extrabold: "800" as const,
};

// ─── SHADOWS ─────────────────────────────────────────────────────────────────
export const Shadow = {
  // card shadow from Swift code (shadowRadius 23.4, offset y:4, opacity 0.15)
  card: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 23.4,
    elevation: 6,
  },
  // smaller shadow for inner cards (shadowRadius 24, opacity 0.1)
  soft: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 4,
  },
  // subtle for inputs / rows
  subtle: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  subtlePro: {
    shadowColor: "#cda0fa",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 5,
  },
  // outer shadow for elevated elements
  outer: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 32,
    elevation: 7,
  },
  // very big shadow spread around element
  xl: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 48,
    elevation: 12,
  },
};

// ─── ICON SIZES ──────────────────────────────────────────────────────────────
export const IconSize = {
  sm: 16,
  md: 20,
  lg: 24,
  xl: 32,
};

// ─── FONT FAMILY ─────────────────────────────────────────────────────────────
export const FontFamily = {
  regular: "Poppins_400Regular",
  medium: "Poppins_500Medium",
  semibold: "Poppins_600SemiBold",
  bold: "Poppins_700Bold",
  extrabold: "Poppins_800ExtraBold",

  // Kurdish / Arabic
  kuRegular: "Vazirmatn_400Regular",
  kuMedium: "Vazirmatn_500Medium",
  kuSemibold: "Vazirmatn_600SemiBold",
  kuBold: "Vazirmatn_700Bold",
};
