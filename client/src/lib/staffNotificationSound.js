/** Short chimes for staff UIs (Order Gate / KDS). Uses Web Audio — no asset files. */

function playTone({ frequency, duration = 0.28, type = 'sine', gain = 0.28, sweep = 1.2 }) {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, audioCtx.currentTime);
    oscillator.frequency.setValueAtTime(frequency * sweep, audioCtx.currentTime + duration * 0.45);

    gainNode.gain.setValueAtTime(gain, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);

    oscillator.start(audioCtx.currentTime);
    oscillator.stop(audioCtx.currentTime + duration);
  } catch {
    /* AudioContext unavailable */
  }
}

/** New order pending (staff approval queue). */
export function playStaffOrderChime() {
  playTone({ frequency: 880, duration: 0.32, sweep: 1.25, gain: 0.3 });
}

/** Guest pressed Call waiter / service request — slightly sharper double ping. */
export function playGuestRequestChime() {
  playTone({ frequency: 1040, duration: 0.12, sweep: 1.15, gain: 0.22 });
  setTimeout(() => playTone({ frequency: 1320, duration: 0.14, sweep: 1.1, gain: 0.2 }), 95);
}
