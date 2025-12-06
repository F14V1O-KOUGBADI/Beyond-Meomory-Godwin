class AudioService {
  private ctx: AudioContext | null = null;

  private getContext() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  // Crisp, high-tech click for buttons
  playClick() {
    try {
        const ctx = this.getContext();
        const t = ctx.currentTime;
        
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        // Sine wave sweeping up slightly for a "glassy" feel
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1200, t);
        osc.frequency.exponentialRampToValueAtTime(1800, t + 0.05);
        
        gain.gain.setValueAtTime(0.05, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
        
        osc.start(t);
        osc.stop(t + 0.05);
    } catch(e) {}
  }

  // Softer, lower frequency sound for navigation tabs
  playNav() {
    try {
        const ctx = this.getContext();
        const t = ctx.currentTime;
        
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        // Triangle wave for a bit of texture
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(300, t);
        osc.frequency.linearRampToValueAtTime(100, t + 0.1);
        
        gain.gain.setValueAtTime(0.03, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
        
        osc.start(t);
        osc.stop(t + 0.1);
    } catch(e) {}
  }

  // Harmonious chord for successful actions (Purchase, Upload)
  playSuccess() {
      try {
        const ctx = this.getContext();
        const t = ctx.currentTime;
        
        // Major chord arpeggio
        [523.25, 659.25, 783.99].forEach((freq, i) => { // C Major: C5, E5, G5
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            
            osc.connect(gain);
            gain.connect(ctx.destination);
            
            osc.type = 'sine';
            osc.frequency.value = freq;
            
            const start = t + (i * 0.08);
            gain.gain.setValueAtTime(0, start);
            gain.gain.linearRampToValueAtTime(0.05, start + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.001, start + 0.5);
            
            osc.start(start);
            osc.stop(start + 0.6);
        });
      } catch(e) {}
  }
  
  // Subtle "error" or "insufficient funds" sound
  playError() {
      try {
        const ctx = this.getContext();
        const t = ctx.currentTime;
        
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, t);
        osc.frequency.linearRampToValueAtTime(100, t + 0.15);
        
        gain.gain.setValueAtTime(0.05, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
        
        osc.start(t);
        osc.stop(t + 0.2);
      } catch(e) {}
  }
}

export const audioService = new AudioService();
