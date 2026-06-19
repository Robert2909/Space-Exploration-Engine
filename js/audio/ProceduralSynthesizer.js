export class ProceduralSynthesizer {
    constructor(audioContext, masterGain) {
        this.ctx = audioContext;
        this.masterGain = masterGain;
    }

    createNoiseBuffer(duration = 2.0) {
        const bufferSize = this.ctx.sampleRate * duration;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        return buffer;
    }

    playUIBlip(type = 'info') {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.masterGain);

        const now = this.ctx.currentTime;

        if (type === 'error') {
            // Serious double low click going down (opposite of success)
            osc.type = 'sine';
            osc.frequency.setValueAtTime(200, now);
            gain.gain.setValueAtTime(0.15, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
            osc.start(now);
            osc.stop(now + 0.05);

            const osc2 = this.ctx.createOscillator();
            const gain2 = this.ctx.createGain();
            osc2.type = 'sine';
            osc2.frequency.setValueAtTime(150, now + 0.08); // Pitch goes down
            gain2.gain.setValueAtTime(0.15, now + 0.08);
            gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.13);
            osc2.connect(gain2);
            gain2.connect(this.masterGain);
            osc2.start(now + 0.08);
            osc2.stop(now + 0.13);
        } else if (type === 'warning') {
            // Subtle mid-low buzz
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(120, now);
            gain.gain.setValueAtTime(0.15, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
            osc.start(now);
            osc.stop(now + 0.15);
        } else if (type === 'success') {
            // Serious short double low click
            osc.type = 'sine';
            osc.frequency.setValueAtTime(150, now);
            gain.gain.setValueAtTime(0.15, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
            osc.start(now);
            osc.stop(now + 0.05);

            const osc2 = this.ctx.createOscillator();
            const gain2 = this.ctx.createGain();
            osc2.type = 'sine';
            osc2.frequency.setValueAtTime(200, now + 0.08);
            gain2.gain.setValueAtTime(0.15, now + 0.08);
            gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.13);
            osc2.connect(gain2);
            gain2.connect(this.masterGain);
            osc2.start(now + 0.08);
            osc2.stop(now + 0.13);
        } else {
            // info / default (extremely subtle mechanical tick)
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(150, now);
            gain.gain.setValueAtTime(0.15, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
            osc.start(now);
            osc.stop(now + 0.08);
        }
    }

    playImpact(strength) {
        const now = this.ctx.currentTime;
        const duration = Math.min(2.0, 0.5 + strength * 1.5);

        // Deep sub-bass thump (much stronger)
        const osc = this.ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(60 + strength * 40, now);
        osc.frequency.exponentialRampToValueAtTime(5, now + duration);

        const oscGain = this.ctx.createGain();
        oscGain.gain.setValueAtTime(1.0 + strength * 2.0, now); // LOUDER
        oscGain.gain.exponentialRampToValueAtTime(0.01, now + duration);

        osc.connect(oscGain);
        oscGain.connect(this.masterGain);
        osc.start(now);
        osc.stop(now + duration);

        // Crash noise
        const noise = this.ctx.createBufferSource();
        noise.buffer = this.createNoiseBuffer(duration);

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(400 + strength * 800, now);
        filter.frequency.exponentialRampToValueAtTime(50, now + duration);

        const noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(0.6 + strength, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, now + duration);

        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(this.masterGain);

        noise.start(now);
    }

    playTinnitus(level) {
        const now = this.ctx.currentTime;
        const duration = Math.min(8.0, level * 5.0);

        // High pitched ringing sine wave
        const osc = this.ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(4500, now); // ~4.5kHz ringing

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.15 * level, now + 0.1); // Fade in
        gain.gain.exponentialRampToValueAtTime(0.01, now + duration); // Slow fade out

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(now);
        osc.stop(now + duration);
    }

    playMechanicalClick() {
        const now = this.ctx.currentTime;
        // Deep low frequency click for UI (serious terminal sound)
        const osc = this.ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(120, now);
        osc.frequency.exponentialRampToValueAtTime(40, now + 0.05);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(now);
        osc.stop(now + 0.05);
    }

    playFootstep() {
        const now = this.ctx.currentTime;
        // Heavy boot thump (low freq drop)
        const osc = this.ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(100, now);
        osc.frequency.exponentialRampToValueAtTime(20, now + 0.1);

        const oscGain = this.ctx.createGain();
        oscGain.gain.setValueAtTime(0.3, now);
        oscGain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

        osc.connect(oscGain);
        oscGain.connect(this.masterGain);
        osc.start(now);
        osc.stop(now + 0.1);

        // Very slight dirt scuff (filtered noise)
        const noise = this.ctx.createBufferSource();
        noise.buffer = this.createNoiseBuffer(0.05);

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 200;

        const noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(0.05, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(this.masterGain);

        noise.start(now);
    }
}
