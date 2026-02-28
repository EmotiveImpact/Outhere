import * as Haptics from "expo-haptics";

/**
 * Haptic feedback utilities — wrapping expo-haptics for consistent use.
 */

export const hapticSelection = async () => {
  try {
    await Haptics.selectionAsync();
  } catch {
    // Silently fail (web, simulator, etc.)
  }
};

export const hapticSuccess = async () => {
  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } catch {
    // Silently fail
  }
};

export const hapticError = async () => {
  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  } catch {
    // Silently fail
  }
};

export const hapticImpact = async (style = Haptics.ImpactFeedbackStyle.Medium) => {
  try {
    await Haptics.impactAsync(style);
  } catch {
    // Silently fail
  }
};

export const hapticHeavy = async () => {
  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  } catch {
    // Silently fail
  }
};
