export type EarconType = 'chime' | 'click' | 'listen';

let sharedContext: AudioContext | null = null;

/**
 * Resets the shared AudioContext. Used primarily for testing.
 */
export function resetSharedContext(): void {
  sharedContext = null;
}

export function playEarcon(type: EarconType): void {
  if (typeof window === 'undefined') return;

  try {
    if (!sharedContext) {
      const AudioContextClass =
        window.AudioContext ||
        (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return;
      sharedContext = new AudioContextClass();
    }
    
    const ctx = sharedContext;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;

    switch (type) {
      case 'chime':
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, now); 
        osc.frequency.setValueAtTime(1108.73, now + 0.1); 
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.1, now + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
        osc.start(now);
        osc.stop(now + 0.5);
        break;
      case 'click':
        osc.type = 'square';
        osc.frequency.setValueAtTime(150, now);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
        osc.start(now);
        osc.stop(now + 0.05);
        break;
      case 'listen':
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.setValueAtTime(554.37, now + 0.1); 
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
        break;
    }
  } catch (err) {
    console.error('Failed to play earcon:', err);
  }
}
