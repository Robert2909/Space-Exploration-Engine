import * as THREE from 'three';
import { GameState } from '../GameState.js';
import { EventManager, EVENTS } from '../EventManager.js';
import { GasDiveControls } from '../../player/GasDiveControls.js';
import { ImprovedNoise } from 'https://unpkg.com/three@0.160.0/examples/jsm/math/ImprovedNoise.js';
import { Config } from '../Config.js';

export class GasDiveState extends GameState {
    constructor(engine) {
        super(engine);
        this.planet = null;
        this.biome = null;
        this.perlin = new ImprovedNoise();

        // Player configuration
        this.player = null;
        this.controls = null;
        this.cameraObj = new THREE.Object3D();

        // Atmosphere setup (Phase 1 basics)
        this.altitude = 0;
        this.maxAltitude = 10000; // Will be set in enter()
        this.minAltitude = 0;

        // Layers setup
        this.thermosphereAlt = 8000;
    }

    enter(payload) {
        this.planet = payload.body;
        this.biome = payload.biome;

        // Ampliar masivamente los rangos de atmósfera para una inmersión súper profunda
        this.maxAltitude = this.planet.radius * 8.0; // Incrementado sustancialmente
        this.thermosphereAlt = this.maxAltitude * 0.8;

        console.log(`[GasDiveState] Entering Gas Giant: ${this.planet.name} at alt ${this.thermosphereAlt}`);

        // Set up the scene basic visuals
        this.baseColor = new THREE.Color().setHSL(this.biome.hueBase, this.biome.sat, this.biome.lit);
        
        // Fase 3: Setup completo de la atmósfera (Nubes, Iluminación, Polvo)
        this.setupAtmosphere();

        // Spawn player near top of atmosphere
        this.player = this.engine.camera; 
        this.player.position.set(0, this.thermosphereAlt, 0); 
        this.player.rotation.set(0, 0, 0);

        this.controls = new GasDiveControls(this.player, document.body);
        if (document.pointerLockElement === document.body) this.controls.isLocked = true;
        this.engine.controls = this.controls;

        // We will listen for right click to exit manually in Phase 1
        this._onRightClick = this.onRightClick.bind(this);
        document.addEventListener('contextmenu', this._onRightClick);

        EventManager.emit(EVENTS.HUD_MESSAGE, { message: 'Inmersión Atmosférica Inicializada', type: 'info' });
    }

    update(dt) {
        if (!this.controls) return;

        // Físicas, Turbulencia y Peligro
        const time = performance.now() * 0.001;
        const depthRatio = Math.max(0, 1.0 - (this.altitude / this.thermosphereAlt));
        
        // Viento caótico con Simplex Noise (aumenta con la profundidad pero no excesivamente)
        const windX = this.perlin.noise(this.player.position.x * 0.001, time * 0.5, this.player.position.z * 0.001) * 200 * depthRatio;
        const windY = this.perlin.noise(this.player.position.y * 0.001, time * 0.5, this.player.position.x * 0.001) * 300 * depthRatio;
        const windZ = this.perlin.noise(this.player.position.z * 0.001, time * 0.5, this.player.position.y * 0.001) * 200 * depthRatio;
        
        this.controls.windForce.set(windX, windY, windZ);

        // Adaptar multiplicador de velocidad y arrastre según la altitud
        this.controls.drag = Math.max(0.1, 0.995 - (depthRatio * 0.095));
        this.controls.maxSpeedLimit = Math.max(100, 20000 - (depthRatio * 18000));
        
        if (this.controls.targetSpeed > this.controls.maxSpeedLimit) {
            this.controls.targetSpeed = this.controls.maxSpeedLimit;
        }

        this.controls.update(dt);

        // Phase 1: Track altitude (using Y axis for now)
        this.altitude = this.player.position.y;

        // Phase 2: Telemetry calculations
        const baseTemp = this.biome ? (this.biome.baseTemp || -50) : -50;
        const temperature = baseTemp + ((this.thermosphereAlt - this.altitude) * 0.05);
        let pressure = ((this.thermosphereAlt - this.altitude) / this.thermosphereAlt) * 100;
        if (pressure < 0) pressure = 0;

        const windSpeed = this.controls.windForce.length();
        let toxicLevel = this.biome && this.biome.isToxic ? (depthRatio * 100).toFixed(1) : 0;

        // Yaw y Pitch
        let dir = new THREE.Vector3(0,0,-1).applyQuaternion(this.controls.camera.quaternion);
        let yaw = Math.atan2(-dir.x, -dir.z) * (180 / Math.PI);
        if (yaw < 0) yaw += 360;
        let pitch = Math.asin(dir.y) * (180 / Math.PI);

        // Velocidad real actual ajustada para el HUD
        const actualSpeed = this.controls.velocity.length();
        const visualSpeedMS = actualSpeed * 0.34; // Convierte U a Mach 
        const speedForHUD = visualSpeedMS / (Config.SCALE_U_TO_KM * 1000);
        const windSpeedForHUD = (windSpeed * 0.34) / (Config.SCALE_U_TO_KM * 1000);

        EventManager.emit(EVENTS.HUD_GASDIVE_UPDATED, {
            altitude: this.altitude,
            thermosphereAlt: this.thermosphereAlt,
            vTerminal: speedForHUD,
            temperature: temperature,
            pressure: pressure,
            windSpeed: windSpeedForHUD,
            toxicLevel: toxicLevel,
            yaw: yaw,
            pitch: pitch,
            speed: speedForHUD, // HUD lee speed 
            pos: this.player.position
        });
        
        if (this.planet) {
            this.engine.updateTargetHUD(this.planet);
        }

        // Layer notifications
        let currentLayer = Math.floor((this.altitude / Math.max(1, this.thermosphereAlt)) * 10);
        if (this.lastLayer !== currentLayer) {
            if (currentLayer === 8) EventManager.emit(EVENTS.OSD_MESSAGE, { message: 'Entorno atmosférico actual: Termósfera Alta. Visibilidad clara.', type: 'info' });
            if (currentLayer === 6) EventManager.emit(EVENTS.OSD_MESSAGE, { message: 'Entorno atmosférico actual: Estratósfera. Densidad gaseosa en aumento.', type: 'warning' });
            if (currentLayer === 3) EventManager.emit(EVENTS.OSD_MESSAGE, { message: 'Entorno atmosférico actual: Tropósfera Profunda. Alta turbulencia.', type: 'warning' });
            if (currentLayer === 1) EventManager.emit(EVENTS.OSD_MESSAGE, { message: 'ADVERTENCIA CRÍTICA: Proximidad a Manto Supercrítico. Presión estructural inestable.', type: 'error' });
            this.lastLayer = currentLayer;
        }

        // Mecánica del Manto Supercrítico (Muerte al exceder presión con temporizador)
        if (pressure >= 100 && !this.isDead) {
            if (this.collapseTimer === undefined) {
                this.collapseTimer = 10.0;
                this.lastTimerSec = 10;
                EventManager.emit(EVENTS.OSD_MESSAGE, { message: '¡PELIGRO: ESTRUCTURA CEDIENDO! COLAPSO EN 10 SEGUNDOS', type: 'error' });
            }

            this.collapseTimer -= dt;
            let currentSec = Math.ceil(this.collapseTimer);
            if (currentSec !== this.lastTimerSec && currentSec > 0) {
                this.lastTimerSec = currentSec;
                EventManager.emit(EVENTS.OSD_MESSAGE, { message: `FALLO ESTRUCTURAL INMINENTE: ${currentSec}s`, type: 'error' });
            }

            if (this.collapseTimer <= 0) {
                this.isDead = true;
                this.collapseTimer = undefined;
                EventManager.emit(EVENTS.OSD_MESSAGE, { message: 'FALLO CATASTRÓFICO: EL NÚCLEO HA SIDO DESTRUIDO POR LA PRESIÓN', type: 'error' });
                EventManager.emit(EVENTS.PLAYER_DEATH, { cause: 'Crushed by supercritical pressure in Gas Giant' });
                this.engine.triggerLiftoff(true);
                // Hacemos que la nave pierda el control y gire caóticamente
                this.controls.windForce.set(Math.random()*50000, -100000, Math.random()*50000);
            }
        } else if (pressure < 100 && this.collapseTimer !== undefined && !this.isDead) {
            this.collapseTimer = undefined;
            EventManager.emit(EVENTS.OSD_MESSAGE, { message: 'Presión estabilizada. Colapso evitado.', type: 'success' });
        }

        if (this.isDead) {
            // Girar sin control al morir
            this.player.rotation.z += dt * 5;
            this.player.rotation.x += dt * 2;
        }

        // Phase 1: Automatic Exit Check
        if (this.altitude > this.maxAltitude) {
            this.escapeToOrbit();
        }

        // Phase 3: Update Atmosphere
        this.updateAtmosphere(dt, windX, windY, windZ);
    }

    setupAtmosphere() {
        // Extraer los colores generados por el shader del planeta (si existen) para unificar la gama de colores
        const hasShaderColors = this.planet && this.planet.shaderParams;
        const pColorLow = hasShaderColors ? this.planet.shaderParams.colorLow : this.baseColor;
        const pColorHigh = hasShaderColors ? this.planet.shaderParams.colorHigh : this.baseColor;
        const pCloudColor = hasShaderColors ? this.planet.shaderParams.cloudColor : this.baseColor;

        if (hasShaderColors) {
            // Actualizar el color base para influir en la iluminación ambiental
            this.baseColor = pColorLow.clone().lerp(pColorHigh, 0.5);
        }

        // Fase 3: Instanciar THREE.FogExp2 basándose en el bioma
        // El fog empieza MUY ligero para ver distancias inmensas, pero aumenta en la profundidad
        this.baseFogDensity = 0.000005; // Extremadamente bajo (decenas de kilómetros de vista inicial)
        this.engine.scene.fog = new THREE.FogExp2(this.baseColor, this.baseFogDensity);

        // --- SISTEMA 1: Nubes Macroscópicas ---
        this.totalCloudCount = 350; // Balanceado
        const cloudGeo = new THREE.BufferGeometry();
        this.cloudPositions = new Float32Array(this.totalCloudCount * 3);
        this.cloudColors = new Float32Array(this.totalCloudCount * 3);
        this.cloudBoxSize = 100000; // Modificado para comprimir la sensación de velocidad

        for (let i = 0; i < this.totalCloudCount; i++) {
            this.cloudPositions[i * 3] = (Math.random() - 0.5) * this.cloudBoxSize;
            
            // Distribuir nubes FÍSICAMENTE en el eje Y.
            const altitudeRatio = Math.pow(Math.random(), 2.5);
            this.cloudPositions[i * 3 + 1] = altitudeRatio * (this.thermosphereAlt * 0.85);
            this.cloudPositions[i * 3 + 2] = (Math.random() - 0.5) * this.cloudBoxSize;

            const color = new THREE.Color();
            if (hasShaderColors) {
                // Mezcla estocástica de los 3 colores procedimentales de la superficie/atmósfera externa del gigante gaseoso
                const r = Math.random();
                if (r < 0.33) {
                    color.copy(pColorLow).lerp(pColorHigh, Math.random());
                } else if (r < 0.66) {
                    color.copy(pColorHigh).lerp(pCloudColor, Math.random());
                } else {
                    color.copy(pCloudColor).lerp(pColorLow, Math.random());
                }
                // Oscurecer en la profundidad para mantener alto el contraste y la sensación abismal
                const lFactor = 0.15 + altitudeRatio * 0.85;
                color.multiplyScalar(lFactor);
            } else {
                // Fallback clásico
                let h = this.biome.hueBase + (Math.random() - 0.5) * 0.4;
                if (h < 0) h += 1; if (h > 1) h -= 1;
                let s = Math.max(0, Math.min(1, this.biome.sat + (Math.random() - 0.5) * 0.6));
                let l = this.biome.lit * (0.15 + altitudeRatio * 0.85); 
                color.setHSL(h, s, l);
            }
            
            this.cloudColors[i * 3] = color.r;
            this.cloudColors[i * 3 + 1] = color.g;
            this.cloudColors[i * 3 + 2] = color.b;
        }
        cloudGeo.setAttribute('position', new THREE.BufferAttribute(this.cloudPositions, 3));
        cloudGeo.setAttribute('color', new THREE.BufferAttribute(this.cloudColors, 3));

        // Ruido fractal procedural para nubes
        const cloudCanvas = document.createElement('canvas');
        cloudCanvas.width = 128; cloudCanvas.height = 128;
        const ctxCloud = cloudCanvas.getContext('2d');
        const imgData = ctxCloud.createImageData(128, 128);
        for(let x=0; x<128; x++) {
            for(let y=0; y<128; y++) {
                let dx = x - 64; let dy = y - 64;
                let dist = Math.sqrt(dx*dx + dy*dy);
                let alpha = dist > 64 ? 0 : 1 - (dist / 64);
                let n = (this.perlin.noise(x * 0.05, y * 0.05, 0) + 1) / 2; 
                let idx = (y * 128 + x) * 4;
                imgData.data[idx] = 255; imgData.data[idx+1] = 255; imgData.data[idx+2] = 255;
                imgData.data[idx+3] = Math.max(0, Math.min(255, (n * alpha * 255 * 0.7)));
            }
        }
        ctxCloud.putImageData(imgData, 0, 0);
        const cloudTexture = new THREE.CanvasTexture(cloudCanvas);

        // AdditiveBlending con opacidad baja, pero nubes más pequeñas para sensación de velocidad rápida
        this.cloudMat = new THREE.PointsMaterial({
            size: 25000, 
            map: cloudTexture,
            transparent: true,
            opacity: 0.12,
            depthWrite: false,
            vertexColors: true,
            blending: THREE.AdditiveBlending
        });

        this.cloudSystem = new THREE.Points(cloudGeo, this.cloudMat);
        this.cloudSystem.frustumCulled = false;
        this.engine.scene.add(this.cloudSystem);


        // --- SISTEMA 2: Escombros/Polvo Rápido (Pequeños) ---
        const particleCount = 8000;
        const geometry = new THREE.BufferGeometry();
        this.particlePositions = new Float32Array(particleCount * 3);
        this.particleVelocities = new Float32Array(particleCount * 3);
        this.particleBoxSize = 25000;

        for (let i = 0; i < particleCount; i++) {
            this.particlePositions[i * 3] = (Math.random() - 0.5) * this.particleBoxSize;
            this.particlePositions[i * 3 + 1] = this.thermosphereAlt + (Math.random() - 0.5) * this.particleBoxSize;
            this.particlePositions[i * 3 + 2] = (Math.random() - 0.5) * this.particleBoxSize;
            
            // Movimiento propio caótico base
            this.particleVelocities[i * 3] = (Math.random() - 0.5) * 200;
            this.particleVelocities[i * 3 + 1] = (Math.random() - 0.5) * 200;
            this.particleVelocities[i * 3 + 2] = (Math.random() - 0.5) * 200;
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(this.particlePositions, 3));

        const material = new THREE.PointsMaterial({
            color: 0xffffff,
            size: 20, // Pequeñas
            transparent: true,
            opacity: 0.6,
            depthWrite: false,
            blending: THREE.AdditiveBlending
        });

        this.particleSystem = new THREE.Points(geometry, material);
        this.particleSystem.frustumCulled = false;
        this.engine.scene.add(this.particleSystem);
        
        // Luz ambiental de tormenta
        this.ambientLight = new THREE.AmbientLight(this.baseColor, 0.4);
        this.engine.scene.add(this.ambientLight);

        // Variable para relámpagos ambientales
        this.lightningFlash = 0;
    }

    updateAtmosphere(dt, windX, windY, windZ) {
        if (!this.particleSystem || !this.cloudSystem) return;

        const depthRatio = Math.max(0, 1.0 - (this.altitude / this.thermosphereAlt));
        
        // Lógica de relámpagos (Flashing ambiental)
        // A mayor profundidad, mayor frecuencia e intensidad
        if (Math.random() < 0.2 * depthRatio * dt) {
            this.lightningFlash = Math.random() * 1.5; 
        } else {
            this.lightningFlash = Math.max(0, this.lightningFlash - dt * 8.0); // Decae muy rápido
        }

        const targetDensity = this.baseFogDensity + (depthRatio * 0.0002); 
        this.engine.scene.fog.density = Math.max(0.00001, targetDensity);
        
        // El relámpago aumenta la luminosidad del entorno y lo desatura hacia blanco
        const currentLit = Math.min(1.0, this.biome.lit * Math.max(0.1, (1.0 - depthRatio)) + this.lightningFlash);
        const currentSat = Math.max(0.0, this.biome.sat - (this.lightningFlash * 0.8));
        
        this.engine.scene.fog.color.setHSL(this.biome.hueBase, currentSat, currentLit);
        this.engine.scene.background.setHSL(this.biome.hueBase, currentSat, currentLit);

        // Incrementar opacidad de nubes con la profundidad
        if (this.cloudMat) {
            this.cloudMat.opacity = 0.05 + (depthRatio * 0.4); 
        }

        const camPos = this.player.position;

        // Actualizar Nubes (Lentas, pesadas)
        const cPositions = this.cloudSystem.geometry.attributes.position.array;
        const cHalfBox = this.cloudBoxSize / 2;
        
        for (let i = 0; i < cPositions.length; i += 3) {
            cPositions[i] += windX * dt * 0.5;
            // Las nubes suben lentamente o se mueven con el viento, pero sin exagerar
            cPositions[i + 1] += windY * dt * 0.1;
            cPositions[i + 2] += windZ * dt * 0.5;
            
            let dx = cPositions[i] - camPos.x;
            let dz = cPositions[i + 2] - camPos.z;

            // SOLO envolvemos X y Z. El eje Y (altitud) es físico y definitivo.
            if (Math.abs(dx) > cHalfBox) { cPositions[i] = camPos.x + dx - Math.round(dx / this.cloudBoxSize) * this.cloudBoxSize; }
            if (Math.abs(dz) > cHalfBox) { cPositions[i + 2] = camPos.z + dz - Math.round(dz / this.cloudBoxSize) * this.cloudBoxSize; }
        }
        this.cloudSystem.geometry.attributes.position.needsUpdate = true;

        // Actualizar Escombros/Polvo (Rápidos, con movimiento propio)
        const pPositions = this.particleSystem.geometry.attributes.position.array;
        const pHalfBox = this.particleBoxSize / 2;
        const chaosScale = 1.0 + (depthRatio * 8.0); // Multiplicador de caos masivo en la profundidad
        
        for (let i = 0; i < pPositions.length; i += 3) {
            pPositions[i] += (windX * 5 + this.particleVelocities[i] * chaosScale) * dt;
            pPositions[i + 1] += (windY * 5 + this.particleVelocities[i + 1] * chaosScale) * dt;
            pPositions[i + 2] += (windZ * 5 + this.particleVelocities[i + 2] * chaosScale) * dt;
            
            let dx = pPositions[i] - camPos.x;
            let dy = pPositions[i + 1] - camPos.y;
            let dz = pPositions[i + 2] - camPos.z;

            if (Math.abs(dx) > pHalfBox) { pPositions[i] = camPos.x + dx - Math.round(dx / this.particleBoxSize) * this.particleBoxSize; }
            if (Math.abs(dy) > pHalfBox) { pPositions[i + 1] = camPos.y + dy - Math.round(dy / this.particleBoxSize) * this.particleBoxSize; }
            if (Math.abs(dz) > pHalfBox) { pPositions[i + 2] = camPos.z + dz - Math.round(dz / this.particleBoxSize) * this.particleBoxSize; }
        }
        this.particleSystem.geometry.attributes.position.needsUpdate = true;
    }

    onRightClick(event) {
        event.preventDefault();
        // Allow manual escape only if in the Thermosphere ( > 80% of max alt)
        const altPercent = (this.altitude / Math.max(1, this.thermosphereAlt)) * 100;
        if (altPercent >= 80) {
            this.escapeToOrbit();
        } else {
            EventManager.emit(EVENTS.OSD_MESSAGE, { message: 'Altitud insuficiente para escape orbital. Ascienda a la Termósfera.', type: 'error' });
        }
    }

    escapeToOrbit() {
        console.log(`[GasDiveState] Escaping to orbit from ${this.planet.name}`);
        
        // Discard controls and listeners
        document.removeEventListener('contextmenu', this._onRightClick);
        if (this.controls) this.controls.dispose();

        // Transition back to space
        this.engine.triggerLiftoff(false);
    }

    exit() {
        console.log(`[GasDiveState] Exiting state`);
        document.removeEventListener('contextmenu', this._onRightClick);
        if (this.controls) this.controls.dispose();

        // Limpiar niebla
        this.engine.scene.fog = null;

        // Limpiar luz
        if (this.ambientLight) {
            this.engine.scene.remove(this.ambientLight);
            this.ambientLight = null;
        }

        // Limpiar sistema de partículas
        if (this.particleSystem) {
            this.engine.scene.remove(this.particleSystem);
            if (this.particleSystem.geometry) this.particleSystem.geometry.dispose();
            if (this.particleSystem.material) this.particleSystem.material.dispose();
            if (this.particleSystem.material.map) this.particleSystem.material.map.dispose();
            this.particleSystem = null;
            this.particlePositions = null;
            this.particleVelocities = null;
        }

        // Limpiar nubes
        if (this.cloudSystem) {
            this.engine.scene.remove(this.cloudSystem);
            if (this.cloudSystem.geometry) this.cloudSystem.geometry.dispose();
            if (this.cloudSystem.material) this.cloudSystem.material.dispose();
            if (this.cloudSystem.material.map) this.cloudSystem.material.map.dispose();
            this.cloudSystem = null;
            this.cloudPositions = null;
        }
    }
}
