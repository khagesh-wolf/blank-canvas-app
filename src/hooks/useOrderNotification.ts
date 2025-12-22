import { useEffect, useRef } from 'react';
import { useStore } from '@/store/useStore';

export function useOrderNotification() {
  // Subscribe directly to orders from the store for real-time updates
  const orders = useStore((state) => state.orders);
  const previousOrderIdsRef = useRef<Set<string>>(new Set());
  const audioContextRef = useRef<AudioContext | null>(null);
  const isInitializedRef = useRef(false);

  const playNotificationSound = () => {
    try {
      // Create AudioContext on demand (required for browser autoplay policies)
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      
      const ctx = audioContextRef.current;
      
      // Create a pleasant notification sound
      const oscillator1 = ctx.createOscillator();
      const oscillator2 = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator1.connect(gainNode);
      oscillator2.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      // Two-tone bell sound
      oscillator1.frequency.setValueAtTime(880, ctx.currentTime); // A5
      oscillator2.frequency.setValueAtTime(1100, ctx.currentTime); // C#6
      
      oscillator1.type = 'sine';
      oscillator2.type = 'sine';
      
      // Volume envelope
      gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      
      oscillator1.start(ctx.currentTime);
      oscillator2.start(ctx.currentTime);
      oscillator1.stop(ctx.currentTime + 0.5);
      oscillator2.stop(ctx.currentTime + 0.5);

      // Play second chime
      setTimeout(() => {
        const osc3 = ctx.createOscillator();
        const osc4 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        
        osc3.connect(gain2);
        osc4.connect(gain2);
        gain2.connect(ctx.destination);
        
        osc3.frequency.setValueAtTime(1100, ctx.currentTime);
        osc4.frequency.setValueAtTime(1320, ctx.currentTime);
        
        osc3.type = 'sine';
        osc4.type = 'sine';
        
        gain2.gain.setValueAtTime(0.25, ctx.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
        
        osc3.start(ctx.currentTime);
        osc4.start(ctx.currentTime);
        osc3.stop(ctx.currentTime + 0.6);
        osc4.stop(ctx.currentTime + 0.6);
      }, 200);
      
      console.log('Notification sound played');
    } catch (error) {
      console.log('Audio notification failed:', error);
    }
  };

  useEffect(() => {
    const pendingOrders = orders.filter(o => o.status === 'pending');
    const currentPendingIds = new Set(pendingOrders.map(o => o.id));
    
    // Skip initial load - just store the current IDs
    if (!isInitializedRef.current) {
      previousOrderIdsRef.current = currentPendingIds;
      isInitializedRef.current = true;
      console.log('Order notification initialized with', currentPendingIds.size, 'pending orders');
      return;
    }
    
    // Check if there are NEW order IDs that weren't in the previous set
    let hasNewOrders = false;
    currentPendingIds.forEach(id => {
      if (!previousOrderIdsRef.current.has(id)) {
        hasNewOrders = true;
        console.log('New pending order detected:', id);
      }
    });
    
    if (hasNewOrders) {
      playNotificationSound();
    }
    
    previousOrderIdsRef.current = currentPendingIds;
  }, [orders]);

  // Enable audio on first user interaction
  useEffect(() => {
    const enableAudio = () => {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      if (audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume();
      }
      console.log('Audio context enabled');
    };
    
    document.addEventListener('click', enableAudio, { once: true });
    return () => document.removeEventListener('click', enableAudio);
  }, []);

  return { playNotificationSound };
}
