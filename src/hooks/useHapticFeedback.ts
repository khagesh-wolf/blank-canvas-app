/**
 * Haptic Feedback Hook
 * Provides vibration feedback for different user interactions
 * 
 * Intensity levels:
 * - light: Quick tap feedback (add to cart, quantity change)
 * - medium: Moderate feedback (delete item)
 * - heavy: Strong feedback (order placed, important actions)
 */

type HapticIntensity = 'light' | 'medium' | 'heavy';

const vibrationPatterns: Record<HapticIntensity, number | number[]> = {
  light: 10,      // Very short pulse for quick actions
  medium: 25,     // Moderate pulse for deletions
  heavy: [50, 30, 50], // Strong double pulse for order success
};

export function useHapticFeedback() {
  const triggerHaptic = (intensity: HapticIntensity = 'light') => {
    // Check if vibration API is supported
    if (!navigator.vibrate) {
      return;
    }

    try {
      navigator.vibrate(vibrationPatterns[intensity]);
    } catch (error) {
      // Silently fail if vibration is not allowed
      console.debug('Haptic feedback not available:', error);
    }
  };

  // Convenience methods for specific actions
  const hapticAddToCart = () => triggerHaptic('light');
  const hapticQuantityChange = () => triggerHaptic('light');
  const hapticDeleteItem = () => triggerHaptic('medium');
  const hapticOrderPlaced = () => triggerHaptic('heavy');

  return {
    triggerHaptic,
    hapticAddToCart,
    hapticQuantityChange,
    hapticDeleteItem,
    hapticOrderPlaced,
  };
}

// Order success sound - plays a pleasant confirmation chime
export function playOrderSuccessSound() {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Create a pleasant success chime
    const playTone = (frequency: number, startTime: number, duration: number) => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = frequency;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0, audioContext.currentTime + startTime);
      gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + startTime + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + startTime + duration);
      
      oscillator.start(audioContext.currentTime + startTime);
      oscillator.stop(audioContext.currentTime + startTime + duration);
    };

    // Play a pleasant ascending chime (C5 -> E5 -> G5)
    playTone(523.25, 0, 0.15);     // C5
    playTone(659.25, 0.1, 0.15);   // E5
    playTone(783.99, 0.2, 0.25);   // G5
    
  } catch (error) {
    console.debug('Audio playback not available:', error);
  }
}
