/**
 * Plays a short, non-intrusive audio cue (earcon) using the Web Audio API.
 * @param type The type of event to signal ('success' | 'warning')
 */
export function playMedicationEarcon(type: 'success' | 'warning'): void {
  if (typeof window === 'undefined') return;

  try {
    const AudioContextClass = window.AudioContext || (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;

    if (type === 'success') {
      // Pleasant double-beep (major triad fragment)
      osc.frequency.setValueAtTime(880, now); // A5
      osc.frequency.setValueAtTime(1108.73, now + 0.1); // C#6
      
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      
      osc.start(now);
      osc.stop(now + 0.3);
    } else {
      // Lower, cautionary tone
      osc.frequency.setValueAtTime(440, now); // A4
      
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
      
      osc.start(now);
      osc.stop(now + 0.5);
    }
  } catch (err) {
    console.error('Failed to play earcon:', err);
  }
}
