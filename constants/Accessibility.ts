/**
 * Accessibility tokens and small helpers for enforcing minimum touch targets
 * and contrast/typography guidance across the app (Story 9.1).
 *
 * Usage:
 * import { Accessibility, hitSlopFor } from '@/constants/Accessibility';
 * <TouchableOpacity hitSlop={hitSlopFor()} style={styles.myButton} />
 *
 * Notes:
 * - TOUCH_TARGET is dp (points) recommended minimum (48).
 * - OFF_WHITE_BACKGROUND / DARK_TEXT are suggested contrast tokens for app surfaces.
 */

export const Accessibility = {
  // Minimum recommended touch target in dp/points
  TOUCH_TARGET: 48,

  // Recommended background / text colors for high contrast (light theme)
  OFF_WHITE_BACKGROUND: '#f8fafc', // softer than pure white
  DARK_TEXT: '#111827', // near-black for high contrast

  // Default button minimum size in dp (width/height)
  BUTTON_MIN_SIZE: 48,

  // Small padding to use inside touchables so visual size + padding >= TOUCH_TARGET
  MIN_TOUCH_PADDING: 8,
};

/**
 * hitSlopFor(size = Accessibility.TOUCH_TARGET)
 * Returns a hitSlop object intended to ensure that the effective touch area meets
 * the recommended touch target. It assumes a visible control of ~24dp in size;
 * callers can pass the visible size to get tighter padding.
 *
 * Example:
 * <TouchableOpacity hitSlop={hitSlopFor(32)} ... />
 */
export function hitSlopFor(visibleSize = 24) {
  const target = Accessibility.TOUCH_TARGET;
  const pad = Math.max(0, Math.ceil((target - visibleSize) / 2));
  return { top: pad, bottom: pad, left: pad, right: pad };
}