/**
 * useHaptics hook — graceful wrapper around expo-haptics
 * Falls back silently if expo-haptics is not installed
 */
import { useCallback } from 'react';

let Haptics: any = null;
try { Haptics = require('expo-haptics'); } catch {}

export type HapticType =
  | 'selection'      // Light tap — for selection changes, toggles
  | 'light'          // Light impact — for button presses
  | 'medium'         // Medium impact — for confirmations
  | 'heavy'          // Heavy impact — for destructive actions
  | 'success'        // Success notification — for completed actions
  | 'warning'        // Warning notification — for alerts
  | 'error';         // Error notification — for failures

export function useHaptics() {
  const trigger = useCallback((type: HapticType = 'light') => {
    if (!Haptics) return;
    try {
      switch (type) {
        case 'selection':
          Haptics.selectionAsync();
          break;
        case 'light':
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          break;
        case 'medium':
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          break;
        case 'heavy':
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          break;
        case 'success':
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          break;
        case 'warning':
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          break;
        case 'error':
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          break;
      }
    } catch {}
  }, []);

  return { trigger };
}

export default useHaptics;
