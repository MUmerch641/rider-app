import { Dimensions, PixelRatio, Platform, StatusBar } from "react-native";

// ─────────────────────────────────────────────
// BASE DESIGN DIMENSIONS
// Based on iPhone 13 Pro Max (your working device)
// All your designs are built around these values
// ─────────────────────────────────────────────
const BASE_WIDTH = 430;
const BASE_HEIGHT = 932;

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

// ─────────────────────────────────────────────
// SCREEN INFO
// ─────────────────────────────────────────────

/** Raw screen width in points */
export const screenWidth = SCREEN_WIDTH;

/** Raw screen height in points */
export const screenHeight = SCREEN_HEIGHT;

/** True if the screen is considered small (width < 360) */
export const isSmallDevice = SCREEN_WIDTH < 360;

/** True if the screen is considered large (width >= 414) */
export const isLargeDevice = SCREEN_WIDTH >= 414;

/** True if running on Android */
export const isAndroid = Platform.OS === "android";

/** True if running on iOS */
export const isIOS = Platform.OS === "ios";

/** Device pixel ratio (e.g. 2x, 3x) */
export const pixelRatio = PixelRatio.get();

// ─────────────────────────────────────────────
// CORE SCALE FUNCTIONS
// ─────────────────────────────────────────────

/**
 * scale(size)
 * Use for: widths, horizontal padding, horizontal margins, icon sizes, border radius
 * Scales linearly based on screen width vs base width.
 *
 * Example: scale(16) → 16 on base, ~13 on small Android, ~17 on large phone
 */
export const scale = (size) => {
  return Math.round(
    PixelRatio.roundToNearestPixel((SCREEN_WIDTH / BASE_WIDTH) * size),
  );
};

/**
 * verticalScale(size)
 * Use for: heights, vertical padding, vertical margins, top/bottom spacing
 * Scales linearly based on screen height vs base height.
 *
 * Example: verticalScale(24) → 24 on base, ~20 on short screens
 */
export const verticalScale = (size) => {
  return Math.round(
    PixelRatio.roundToNearestPixel((SCREEN_HEIGHT / BASE_HEIGHT) * size),
  );
};

/**
 * moderateScale(size, factor?)
 * Use for: font sizes, border radius, icon sizes — anything that shouldn't scale too aggressively
 * Factor 0 = no scaling, Factor 1 = same as scale(). Default factor = 0.5
 *
 * Example: moderateScale(16) → grows slower, stays readable on all screen sizes
 */
export const moderateScale = (size, factor = 0.5) => {
  return Math.round(
    PixelRatio.roundToNearestPixel(size + (scale(size) - size) * factor),
  );
};

/**
 * moderateVerticalScale(size, factor?)
 * Same as moderateScale but for vertical values.
 * Use for: line height, vertical paddings that shouldn't stretch too much
 */
export const moderateVerticalScale = (size, factor = 0.5) => {
  return Math.round(
    PixelRatio.roundToNearestPixel(
      size + (verticalScale(size) - size) * factor,
    ),
  );
};

// ─────────────────────────────────────────────
// FONT SCALING
// ─────────────────────────────────────────────

/**
 * scaledFont(size)
 * Use for: ALL fontSize values — this is the most important one for Android compatibility.
 * Uses moderateScale with factor 0.45 to prevent text from becoming too large on big screens
 * or too tiny on small/old Android devices.
 *
 * Example:
 *   fontSize: scaledFont(14)   → body text
 *   fontSize: scaledFont(18)   → subtitle
 *   fontSize: scaledFont(24)   → heading
 */
export const scaledFont = (size) => {
  const newSize = moderateScale(size, 0.45);
  // Clamp: never go below 11px (unreadable) or above 1.5x the original size
  return Math.min(Math.max(Math.round(newSize), 11), Math.round(size * 1.5));
};

// ─────────────────────────────────────────────
// SPACING SYSTEM
// ─────────────────────────────────────────────
// Pre-built spacing scale based on an 4pt base grid.
// Use these instead of raw numbers for consistent, responsive spacing.

export const spacing = {
  xxs: scale(2),
  xs: scale(4),
  sm: scale(8),
  md: scale(12),
  base: scale(16),
  lg: scale(20),
  xl: scale(24),
  xxl: scale(32),
  xxxl: scale(40),
  huge: scale(48),
};

// ─────────────────────────────────────────────
// BORDER RADIUS SYSTEM
// ─────────────────────────────────────────────

export const radius = {
  xs: scale(4),
  sm: scale(6),
  md: scale(8),
  lg: scale(12),
  xl: scale(16),
  xxl: scale(24),
  full: scale(999),
};

// ─────────────────────────────────────────────
// FONT SIZE SYSTEM
// ─────────────────────────────────────────────
// Pre-built type scale. Use these for consistent typography everywhere.

export const fontSize = {
  xxs: scaledFont(10),
  xs: scaledFont(11),
  sm: scaledFont(12),
  md: scaledFont(13),
  base: scaledFont(14),
  lg: scaledFont(16),
  xl: scaledFont(18),
  xxl: scaledFont(20),
  xxxl: scaledFont(24),
  title: scaledFont(28),
  hero: scaledFont(32),
};

// ─────────────────────────────────────────────
// ICON SIZES
// ─────────────────────────────────────────────

export const iconSize = {
  xs: scale(12),
  sm: scale(16),
  md: scale(20),
  lg: scale(24),
  xl: scale(32),
  xxl: scale(40),
};

// ─────────────────────────────────────────────
// LAYOUT HELPERS
// ─────────────────────────────────────────────

/**
 * wp(percentage)
 * Returns a value that is X% of the screen width.
 * Use for widths that should be proportional to screen width.
 *
 * Example: wp(90) → 90% of screen width
 */
export const wp = (percentage) => {
  return Math.round((SCREEN_WIDTH * percentage) / 100);
};

/**
 * hp(percentage)
 * Returns a value that is X% of the screen height.
 * Use for heights that should be proportional to screen height.
 *
 * Example: hp(50) → 50% of screen height
 */
export const hp = (percentage) => {
  return Math.round((SCREEN_HEIGHT * percentage) / 100);
};

// ─────────────────────────────────────────────
// SAFE AREA / STATUS BAR
// ─────────────────────────────────────────────

/**
 * statusBarHeight
 * The height of the status bar. On Android this is a real value; on iOS it's 0
 * because SafeAreaView handles it. Use this for manual top padding if needed.
 */
export const statusBarHeight =
  Platform.OS === "android" ? (StatusBar.currentHeight ?? 0) : 0;

/**
 * hitSlop(size?)
 * Returns a hitSlop object for touchable elements.
 * Makes small buttons/icons easier to tap on all devices.
 *
 * Example: <TouchableOpacity hitSlop={hitSlop(8)} />
 */
export const hitSlop = (size = 8) => ({
  top: scale(size),
  bottom: scale(size),
  left: scale(size),
  right: scale(size),
});

// ─────────────────────────────────────────────
// RESPONSIVE VALUE HELPER
// ─────────────────────────────────────────────

/**
 * responsiveValue({ small, medium, large, default: defaultVal })
 * Returns a different value depending on screen size category.
 * Use when you need completely different values per screen size.
 *
 * Screen categories:
 *   small  → width < 360  (old/small Android)
 *   medium → width 360–413
 *   large  → width >= 414 (iPhone Plus/Max, large Android)
 *
 * Example:
 *   columns: responsiveValue({ small: 1, medium: 2, large: 3, default: 2 })
 */
export const responsiveValue = ({
  small,
  medium,
  large,
  default: defaultVal,
}) => {
  if (SCREEN_WIDTH < 360 && small !== undefined) return small;
  if (SCREEN_WIDTH < 414 && medium !== undefined) return medium;
  if (SCREEN_WIDTH >= 414 && large !== undefined) return large;
  return defaultVal;
};

// ─────────────────────────────────────────────
// SHADOW HELPER (cross-platform)
// ─────────────────────────────────────────────

/**
 * shadow(level?)
 * Returns cross-platform shadow styles.
 * iOS uses shadow* props, Android uses elevation.
 * Levels: 'sm', 'md', 'lg'
 *
 * Example: ...shadow('md')
 */
export const shadow = (level = "md") => {
  const shadows = {
    sm: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: scale(1) },
      shadowOpacity: 0.1,
      shadowRadius: scale(2),
      elevation: 2,
    },
    md: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: scale(2) },
      shadowOpacity: 0.12,
      shadowRadius: scale(4),
      elevation: 4,
    },
    lg: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: scale(4) },
      shadowOpacity: 0.15,
      shadowRadius: scale(8),
      elevation: 8,
    },
  };
  return shadows[level] ?? shadows.md;
};

// ─────────────────────────────────────────────
// TEXT STYLE HELPER (fixes Android text bugs)
// ─────────────────────────────────────────────

/**
 * textStyle(size, weight?, color?)
 * Returns a complete, cross-platform-safe text style object.
 * Automatically fixes the most common Android text rendering bugs:
 *   - includeFontPadding: false  → fixes vertical clipping
 *   - textAlignVertical: 'center' → fixes vertical alignment
 *
 * Example:
 *   <Text style={textStyle(14, '600', '#333')}>Hello</Text>
 */
export const textStyle = (size, weight = "400", color = undefined) => ({
  fontSize: scaledFont(size),
  fontWeight: weight,
  includeFontPadding: false, // Android fix — removes extra top/bottom padding
  textAlignVertical: "center", // Android fix — centers text vertically in its box
  ...(color ? { color } : {}),
});
