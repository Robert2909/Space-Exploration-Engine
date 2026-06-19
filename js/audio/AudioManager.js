import * as THREE from 'three';
import { EventManager, EVENTS } from '../core/EventManager.js';
import { ProceduralSynthesizer } from './ProceduralSynthesizer.js';
import { Config } from '../core/Config.js';

export class AudioManager {
    constructor(engine) {
        this.engine = engine;
        this.initialized = false;
        
        // El navegador requiere interacción humana para desbloquear AudioContext
        const initAudio = () => {
            if (!this.initialized) {
                this.init();
            }
            document.removeEventListener('click', initAudio);
            document.removeEventListener('keydown', initAudio);
        };
        document.addEventListener('click', initAudio);
        document.addEventListener('keydown', initAudio);

        EventManager.on(EVENTS.OSD_MESSAGE, (payload) => {
            if (this.synth) this.synth.playUIBlip(payload.type);
        });
        
        // Evento ficticio para cuando se acciona la linterna
        document.addEventListener('keydown', (e) => {
            if (Config.KEYS.TOGGLE_FLASHLIGHT && Config.KEYS.TOGGLE_FLASHLIGHT.includes(e.code)) {
                if (this.engine.gameState === 'TERRAIN' && this.synth) {
                    this.synth.playMechanicalClick();
                }
            }
        });
    }

    init() {
        // Listener estéreo acoplado a la cámara del jugador (Oídos del jugador)
        this.listener = new THREE.AudioListener();
        this.engine.camera.add(this.listener);
        
        this.ctx = this.listener.context;
        
        this.masterGain = this.ctx.createGain();
        this.masterGain.connect(this.ctx.destination);
        this.masterGain.gain.value = 0.5;

        this.synth = new ProceduralSynthesizer(this.ctx, this.masterGain);

        // Zumbido de propulsores en el espacio (Oscilador)
        this.thrusterGain = this.ctx.createGain();
        this.thrusterGain.gain.value = 0;
        this.thrusterGain.connect(this.masterGain);

        const spaceRumbleBuffer = this.synth.createNoiseBuffer(2.0);
        this.thrusterSource = this.ctx.createBufferSource();
        this.thrusterSource.buffer = spaceRumbleBuffer;
        this.thrusterSource.loop = true;
        
        this.thrusterFilter = this.ctx.createBiquadFilter();
        this.thrusterFilter.type = 'lowpass';
        this.thrusterFilter.frequency.value = 50; // Very deep bass rumble
        this.thrusterFilter.Q.value = 0.5;

        this.thrusterSource.connect(this.thrusterFilter);
        this.thrusterFilter.connect(this.thrusterGain);
        this.thrusterSource.start();

        // Jetpack Sound (Filtered noise)
        this.jetpackGain = this.ctx.createGain();
        this.jetpackGain.gain.value = 0;
        this.jetpackGain.connect(this.masterGain);

        const jetpackNoiseBuffer = this.synth.createNoiseBuffer(2.0);
        this.jetpackSource = this.ctx.createBufferSource();
        this.jetpackSource.buffer = jetpackNoiseBuffer;
        this.jetpackSource.loop = true;
        
        this.jetpackFilter = this.ctx.createBiquadFilter();
        this.jetpackFilter.type = 'lowpass';
        this.jetpackFilter.frequency.value = Config.AUDIO_JETPACK_FREQ;

        this.jetpackSource.connect(this.jetpackFilter);
        this.jetpackFilter.connect(this.jetpackGain);
        this.jetpackSource.start();

        // Rugido de Viento Atmosférico (Ruido blanco filtrado)
        this.windGain = this.ctx.createGain();
        this.windGain.gain.value = 0;
        this.windGain.connect(this.masterGain);

        const noiseBuffer = this.synth.createNoiseBuffer(5.0);
        this.windSource = this.ctx.createBufferSource();
        this.windSource.buffer = noiseBuffer;
        this.windSource.loop = true;
        
        this.windFilter = this.ctx.createBiquadFilter();
        this.windFilter.type = 'lowpass';
        this.windFilter.frequency.value = Config.AUDIO_WIND_FREQ_BASE;

        this.windSource.connect(this.windFilter);
        this.windFilter.connect(this.windGain);
        this.windSource.start();
        
        this.parkedShipAudio = null;

        EventManager.on(EVENTS.PLAYER_IMPACT, (payload) => {
            const level = payload.level || 0.5;
            if (this.synth) {
                this.synth.playImpact(level);
                if (level > 0.5) {
                    this.synth.playTinnitus(level);
                }
            }
        });

        // Eventos UI Adicionales
        EventManager.on(EVENTS.PLAYER_LANDED, () => {
            if (this.synth) this.synth.playUIBlip('success');
        });
        
        EventManager.on(EVENTS.PLAYER_LIFTOFF, () => {
            if (this.synth) this.synth.playUIBlip('success');
        });

        EventManager.on(EVENTS.OSD_MESSAGE, (payload) => {
            if (this.synth) {
                // Determine sound based on severity
                if (payload.type === 'error' || payload.type === 'fatal') {
                    this.synth.playUIBlip('error');
                } else if (payload.type === 'warning') {
                    this.synth.playUIBlip('warning');
                } else if (payload.type === 'success') {
                    this.synth.playUIBlip('success');
                } else {
                    this.synth.playUIBlip('info');
                }
            }
        });

        this.initialized = true;
    }

    update(dt) {
        if (!this.initialized) return;

        const now = this.ctx.currentTime;

        if (this.engine.gameState === 'SPACE') {
            // Manejar sonido espacial de la nave (Global)
            const speed = this.engine.controls.velocity.length();
            
            // Usar PLAYER_SPEED_MAX para el rango (10M), para que haya un rango dinámico real
            const maxSpeed = Config.PLAYER_SPEED_MAX;
            const normalizedSpeed = Math.min(speed / maxSpeed, 1.0);
            
            // Baseline 0.1 at slow speeds, scaling up to 0.6 at max speed
            const targetGain = speed > 1000 ? 0.1 + (normalizedSpeed * 0.5) : 0; 
            
            this.thrusterGain.gain.setTargetAtTime(targetGain, now, 0.5);
            
            if (this.thrusterFilter) {
                // Sube de 50Hz a 400Hz (profundo -> rasposo fuerte espacial)
                this.thrusterFilter.frequency.setTargetAtTime(50 + (normalizedSpeed * 350), now, 0.5);
            }
            
            this.windGain.gain.setTargetAtTime(0, now, 0.1);
            this.jetpackGain.gain.setTargetAtTime(0, now, 0.1);

            if (this.parkedShipAudio && this.parkedShipAudio.isPlaying) {
                this.parkedShipAudio.stop();
            }

        } else if (this.engine.gameState === 'TERRAIN') {
            this.thrusterGain.gain.setTargetAtTime(0, now, 0.1);

            const atmDensity = this.engine.landingTarget ? this.engine.landingTarget.atmosphereDensity : 0;
            if (atmDensity > 0) {
                const speed = this.engine.terrainControls ? this.engine.terrainControls.velocity.length() : 0;
                const normalizedSpeed = Math.min(speed / 50, 1.0);
                
                const atmRatio = Math.min(atmDensity / 0.0005, 1.0);
                const targetGain = (atmRatio * 0.05) + (normalizedSpeed * 0.05);
                this.windGain.gain.setTargetAtTime(targetGain, now, 0.2);
                
                const lfo = Math.sin(Date.now() * 0.001) * Config.AUDIO_WIND_LFO_AMP;
                this.windFilter.frequency.setTargetAtTime(Config.AUDIO_WIND_FREQ_BASE + lfo + (normalizedSpeed * 600), now, 0.2);
            } else {
                this.windGain.gain.setTargetAtTime(0, now, 0.1);
            }
            
            const isGrounded = this.engine.terrainControls && this.engine.terrainControls.isGrounded;
            const jetpackActive = this.engine.terrainControls && this.engine.terrainControls.jetpackActive;
            const horizontalSpeed = this.engine.terrainControls ? Math.sqrt(this.engine.terrainControls.velocity.x**2 + this.engine.terrainControls.velocity.z**2) : 0;
            const normalizedSpeed = Math.min(horizontalSpeed / Config.TERRAIN_PLAYER_SPEED, 1.0);

            // Lógica de Jetpack vs Pisadas
            if (jetpackActive) {
                // Jetpack activo (en el aire o subiendo)
                const jetpackVol = Config.AUDIO_JETPACK_VOL_MAX; // Constante mientras está activo
                this.jetpackGain.gain.setTargetAtTime(jetpackVol, now, 0.1);
            } else {
                this.jetpackGain.gain.setTargetAtTime(0, now, 0.1);
            }
            
            // Pisadas solo cuando toca el suelo y se mueve
            if (isGrounded && horizontalSpeed > Config.AUDIO_FOOTSTEP_SPEED_MIN) {
                if (!this.lastFootstepTime) this.lastFootstepTime = now;
                // Velocidad de pisada depende de la velocidad del jugador
                const footstepInterval = Math.max(0.3, 0.8 - (normalizedSpeed * 0.5));
                if (now - this.lastFootstepTime > footstepInterval) {
                    this.synth.playFootstep();
                    this.lastFootstepTime = now;
                }
            }
            
            // Sonido posicional 3D de la nave aparcada
            const shipEntity = this.engine.states.TERRAIN.shipEntity;
            if (shipEntity) {
                if (!this.parkedShipAudio) {
                    this.parkedShipAudio = new THREE.PositionalAudio(this.listener);
                    this.parkedShipAudio.setRefDistance(Config.AUDIO_SHIP_REF_DIST); // Mayor alcance para que se escuche desde lejos
                    this.parkedShipAudio.setMaxDistance(Config.AUDIO_SHIP_MAX_DIST);
                    this.parkedShipAudio.setRolloffFactor(1);
                    this.parkedShipAudio.setVolume(Config.AUDIO_SHIP_VOL); // Más volumen
                    
                    // Zumbido procedural estacionario (Motor profundo)
                    const osc = this.ctx.createOscillator();
                    osc.type = 'sine';
                    osc.frequency.value = Config.AUDIO_SHIP_FREQ; // Motor en reposo profundo
                    
                    const lowpass = this.ctx.createBiquadFilter();
                    lowpass.type = 'lowpass';
                    lowpass.frequency.value = 150;
                    
                    osc.connect(lowpass);
                    osc.start();
                    
                    this.parkedShipAudio.setNodeSource(lowpass);
                    shipEntity.getMesh().add(this.parkedShipAudio);
                }
            }
        }
    }
}
