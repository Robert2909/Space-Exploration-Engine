import * as THREE from 'three';
import { Config } from './Config.js';
import { SpaceControls } from '../player/SpaceControls.js';
import { Universe } from '../world/universe/Universe.js';
import { LightingManager } from '../graphics/LightingManager.js';
import { UIManager } from '../ui/UIManager.js';
import { TerrainManager } from '../world/terrain/TerrainManager.js';
import { TerrainControls } from '../player/terrain/TerrainControls.js';
import { EventManager, EVENTS } from './EventManager.js';
import { SpaceState } from './states/SpaceState.js';
import { TerrainState } from './states/TerrainState.js';
import { RenderSystem } from './systems/RenderSystem.js';
import { InteractionSystem } from './systems/InteractionSystem.js';

export class Engine {
    constructor() {
        this.renderSystem = new RenderSystem();
        this.scene = this.renderSystem.scene;
        this.camera = this.renderSystem.camera;
        this.renderer = this.renderSystem.renderer;

        this.interactionSystem = new InteractionSystem(this);

        this.lighting = new LightingManager(this.scene);
        this.controls = new SpaceControls(this.camera, document.body);
        this.universe = new Universe(this.scene);
        this.ui = new UIManager(this.camera);

        this.states = {
            SPACE: new SpaceState(this),
            TERRAIN: new TerrainState(this)
        };
        this.currentState = this.states.SPACE;
        this.gameState = 'SPACE'; // 'SPACE' or 'TERRAIN' for legacy checks
        this.landingTarget = null; // Planeta en el que estamos actualmente
        this.currentOrbitBody = null;
        this.isTransitioning = false;

        this.clock = new THREE.Clock();

        // Linterna del modo Terrestre
        this.flashlight = new THREE.SpotLight(0xffeedd, 0, 50000, Math.PI / 6, 0.5, 1);
        this.flashlight.position.set(0, 0, 0);
        this.flashlight.target.position.set(0, 0, -1);
        this.camera.add(this.flashlight);
        this.camera.add(this.flashlight.target);
        this.scene.add(this.camera); // Necesario para que las luces adjuntas a la cámara funcionen

        this.isFlashlightOn = false;
        this.flashlightPower = 2; // Nivel de intensidad (scroll)

        const distSlider = document.getElementById('render-dist');
        if (distSlider) {
            distSlider.addEventListener('input', (e) => {
                const val = parseInt(e.target.value);
                document.getElementById('dist-val').innerText = val;
                this.universe.setRenderDistance(val);
                const viewDistance = val * this.universe.chunkSize;
                this.scene.fog.density = Config.RENDER_FOG_BASE / viewDistance;
                if (this.gameState === 'SPACE') {
                    this.camera.far = viewDistance * 1.5;
                    this.camera.near = 100;
                    this.camera.updateProjectionMatrix();
                }
            });
            distSlider.dispatchEvent(new Event('input'));
        }

        this.targetBody = null;
        document.addEventListener('keydown', (e) => {
            if (this.isTransitioning) return;

            if (Config.KEYS.TARGET.includes(e.code)) {
                this.interactionSystem.attemptTargeting();
            }
            if (Config.KEYS.AUTOPILOT.includes(e.code) && this.targetBody) {
                if (!this.controls.autoPilotTarget) {
                    this.controls.autoPilotTarget = this.targetBody;
                    EventManager.emit(EVENTS.OSD_MESSAGE, { message: `Autopilot engaged: Intercepting ${this.targetBody.name}`, type: 'warning', duration: 4000 });
                } else {
                    this.controls.autoPilotTarget = null;
                    EventManager.emit(EVENTS.OSD_MESSAGE, { message: `Autopilot aborted manually`, type: 'error' });
                }
            }
            if (Config.KEYS.TOGGLE_LANDING.includes(e.code)) {
                if (this.gameState === 'SPACE' && this.landingTarget) {
                    this.triggerLanding(this.landingTarget);
                } else if (this.gameState === 'TERRAIN') {
                    this.triggerLiftoff();
                }
            }
            if (Config.KEYS.TOGGLE_FLASHLIGHT && Config.KEYS.TOGGLE_FLASHLIGHT.includes(e.code)) {
                if (this.gameState === 'TERRAIN') {
                    this.isFlashlightOn = !this.isFlashlightOn;
                    this.flashlight.intensity = this.isFlashlightOn ? this.flashlightPower : 0;
                    EventManager.emit(EVENTS.OSD_MESSAGE, { message: this.isFlashlightOn ? 'Linterna ENCENDIDA' : 'Linterna APAGADA', type: 'info', duration: 2000 });
                }
            }
        });

        document.addEventListener('wheel', (e) => {
            if (this.gameState === 'TERRAIN' && this.isFlashlightOn) {
                // Ajustar intensidad con la rueda del ratón
                if (e.deltaY < 0) {
                    this.flashlightPower = Math.min(this.flashlightPower + 0.5, 15);
                } else {
                    this.flashlightPower = Math.max(this.flashlightPower - 0.5, 0.5);
                }
                this.flashlight.intensity = this.flashlightPower;
                // Incrementar también el alcance y el ángulo ligeramente según el poder
                this.flashlight.distance = 10000 + (this.flashlightPower * 2000);
            }
        });

        document.addEventListener('mousedown', (e) => {
            if (this.isTransitioning) return;
            if (document.pointerLockElement !== document.body) return; // Solo actuar si ya estamos lockeados

            if (this.gameState === 'SPACE') {
                if (e.button === 0) { // Clic Izquierdo = Enfocar
                    this.interactionSystem.attemptTargeting();
                } else if (e.button === 2) { // Clic Derecho = Aterrizar
                    if (this.landingTarget) {
                        this.triggerLanding(this.landingTarget);
                    } else if (this.targetBody) {
                        EventManager.emit(EVENTS.OSD_MESSAGE, { message: 'Demasiado lejos de ' + this.targetBody.name + ' para iniciar descenso', type: 'error' });
                    } else {
                        EventManager.emit(EVENTS.OSD_MESSAGE, { message: 'Órbita estable requerida para aterrizaje', type: 'error' });
                    }
                }
            } else if (this.gameState === 'TERRAIN') {
                if (e.button === 2) { // Clic Derecho = Despegar
                    this.triggerLiftoff();
                }
            }
        });

        this.animate = this.animate.bind(this);
        requestAnimationFrame(this.animate);
    }

    // attemptTargeting moved to InteractionSystem.js

    updateTargetHUD(target) {
        if (!target) return;
        document.getElementById('target-panel').style.display = 'block';
        document.getElementById('target-name').innerText = "'" + target.name + "'";
        document.getElementById('target-type').innerText = "'" + target.type + "'";
        document.getElementById('target-radius').innerText = Math.round(target.radius);

        const targetAtmo = document.getElementById('target-atmo');
        const targetGravity = document.getElementById('target-gravity');
        const targetOrbit = document.getElementById('target-orbit');
        const targetRot = document.getElementById('target-rot');
        const targetTime = document.getElementById('target-time');
        const targetDist = document.getElementById('target-dist');
        const targetLat = document.getElementById('target-lat');
        const targetLon = document.getElementById('target-lon');

        if (targetAtmo) {
            if (target.type === 'Gas Giant') {
                targetAtmo.innerText = "'Densa/Tóxica'";
            } else if (target.atmosphereDensity > 0) {
                const densityPct = Math.round((target.atmosphereDensity / 0.0005) * 100);
                targetAtmo.innerText = `'Presente (${densityPct}%)'`;
            } else {
                targetAtmo.innerText = "'Nula'";
            }
        }
        if (targetGravity) {
            // Cálculo real usado en físicas: planet.radius / 2000
            let baseGravity = target.type === 'Gas Giant' ? 2.5 : 1.0;
            let radiusFactor = target.radius / 2000;
            let calculatedG = baseGravity * radiusFactor;
            targetGravity.innerText = calculatedG.toFixed(2) + ' G';
        }

        if (targetOrbit && target.orbitSpeed) {
            targetOrbit.innerText = `'${(Math.abs(target.orbitSpeed) * 1000).toFixed(1)} km/s'`;
        }
        if (targetRot && target.rotationSpeed) {
            targetRot.innerText = `'${(target.rotationSpeed * 1000).toFixed(1)} km/h'`;
        }

        // Calcular la hora local y actualizar la UI
        if (targetTime) {
            let rotationY = target.rotationY || 0;
            // Si estamos en terreno, usar la rotación local
            if (this.gameState === 'TERRAIN' && this.terrainManager) {
                rotationY = this.terrainManager.timeOfDay;
            }

            let timeOfDay = rotationY % (Math.PI * 2);
            if (timeOfDay < 0) timeOfDay += Math.PI * 2;
            let hours = (timeOfDay / (Math.PI * 2)) * 24 + 6;
            if (hours >= 24) hours -= 24;
            const hh = Math.floor(hours).toString().padStart(2, '0');
            const mm = Math.floor((hours % 1) * 60).toString().padStart(2, '0');
            targetTime.innerText = `'${hh}:${mm}'`;
        }

        if (targetDist) {
            if (this.gameState === 'TERRAIN') {
                targetDist.innerText = "'0u'";
            } else {
                const planetPos = new THREE.Vector3(target.x, target.y, target.z);
                const relativePos = new THREE.Vector3().subVectors(this.camera.position, planetPos);
                const dist = relativePos.length();
                targetDist.innerText = Math.round(dist) + 'u';

                if (targetLat && targetLon) {
                    const lat = Math.asin(Math.max(-1, Math.min(1, relativePos.y / dist)));
                    const lon = Math.atan2(relativePos.z, relativePos.x);
                    targetLat.innerText = (lat * (180 / Math.PI)).toFixed(2) + '°';
                    targetLon.innerText = (lon * (180 / Math.PI)).toFixed(2) + '°';
                }
            }
        }
    }

    // onWindowResize moved to RenderSystem.js

    triggerLanding(planet) {
        if (planet.type.includes('Gas')) {
            EventManager.emit(EVENTS.OSD_MESSAGE, { message: 'Planeta no explorable (Superficie no sólida)', type: 'error', duration: 3000 });
            return;
        }

        if (this.isTransitioning) return;
        this.isTransitioning = true;

        const flash = document.getElementById('transition-flash');
        flash.style.backgroundColor = 'black';
        flash.style.opacity = '1';

        // Guardar estado de la nave ANTES de transicionar
        this.savedSpacePosition = this.camera.position.clone();
        this.savedSpaceQuaternion = this.camera.quaternion.clone();
        if (this.controls) {
            this.savedSpaceVelocity = this.controls.velocity.clone();
        }

        // 1. Calcular Lat/Lon de aterrizaje
        let startX = 0;
        let startZ = 0;
        let lon = 0;
        let lat = 0;

        if (planet) {
            const planetPos = new THREE.Vector3(planet.x, planet.y, planet.z);
            const relativePos = new THREE.Vector3().subVectors(this.camera.position, planetPos);
            const landingDist = relativePos.length();

            // Ángulos esféricos
            lon = Math.atan2(relativePos.z, relativePos.x); // -PI a PI
            lat = Math.asin(Math.max(-1, Math.min(1, relativePos.y / landingDist))); // -PI/2 a PI/2

            this.savedOrbitHeight = landingDist - planet.radius;

            const tardisScale = 10;
            const terrainRadius = planet.radius * tardisScale;

            startX = lon * terrainRadius;
            startZ = lat * terrainRadius;
        }

        setTimeout(() => {
            this.gameState = 'TERRAIN';
            this.currentState = this.states.TERRAIN;
            this.currentState.enter();

            // Destruir Universo (Congelar el espacio)
            this.universe.dispose();

            // Ocultar etiquetas espaciales para que no se queden flotando congeladas en pantalla
            this.ui.labelsContainer.classList.add('hidden');

            // Mostrar panel de Terreno
            document.getElementById('jetpack-panel').style.display = 'block';

            // Guardar planeta aterrizado para enfocarlo al despegar
            this.lastLandedPlanet = {
                name: planet.name,
                x: planet.x,
                y: planet.y,
                z: planet.z,
                radius: planet.radius,
                type: planet.type || '',
                color: planet.color,
                atmosphereDensity: planet.atmosphereDensity
            };

            EventManager.emit(EVENTS.OSD_MESSAGE, { message: `Aterrizaje exitoso en ${planet.name}`, type: 'success', duration: 3000 });

            // Inicializar la escena de terreno
            this.controls.dispose(); // Quita listeners del espacio

            // Instanciar el gestor de terreno primero para tener acceso al generador de alturas
            this.terrainManager = new TerrainManager(this.scene, planet, startX, startZ, lon, lat);

            this.terrainControls = new TerrainControls(this.camera, document.body, (x, z) => {
                return this.terrainManager.generator.getHeight(x, z);
            });

            // Apagar luces espaciales
            this.lighting.systemLight.visible = false;
            this.lighting.ambientLight.visible = false;

            // Gravedad Planetaria Dinámica
            // Asumiendo que 2000 es la gravedad "normal" de la Tierra para efectos de juego
            const earthRadius = 2000;
            const gravityScale = Math.max(0.1, planet.radius / earthRadius); // Planeta pequeño = 0.1 G mínimo
            this.terrainControls.setGravityScale(gravityScale);
            // Heredar estado de lock
            if (document.pointerLockElement === document.body) this.terrainControls.isLocked = true;

            // Ajustar planos y niebla para la escala del terreno humano
            this.camera.near = 0.1;
            this.camera.far = 40000;
            this.camera.updateProjectionMatrix();
            this.scene.fog.density = 2.5 / 4500; // Ocultar el pop-in de los chunks a los lados

            // Posicionar jugador en el punto exacto del terreno, garantizando que esté sobre el suelo
            const spawnY = this.terrainManager.generator.getHeight(startX, startZ) + 10;
            this.camera.position.set(startX, spawnY, startZ);
            this.camera.rotation.set(0, 0, 0);
            this.camera.quaternion.identity();

            // Quitar el flash
            setTimeout(() => {
                flash.style.opacity = '0';
                this.isTransitioning = false;
            }, 500);
        }, 1000); // 1 segundo fade in
    }

    triggerLiftoff() {
        if (this.isTransitioning) return;
        this.isTransitioning = true;

        const flash = document.getElementById('transition-flash');
        flash.style.backgroundColor = 'white';
        flash.style.opacity = '1';

        setTimeout(() => {
            try {
                this.gameState = 'SPACE';
                this.currentState = this.states.SPACE;
                this.currentState.enter();
                // Destruir Terreno
                if (this.terrainManager) this.terrainManager.dispose();
                if (this.terrainControls) this.terrainControls.dispose();
                this.terrainManager = null;
                this.terrainControls = null;

                document.getElementById('jetpack-panel').style.display = 'none';

                // Restaurar luces espaciales
                this.lighting.systemLight.visible = true;
                this.lighting.ambientLight.visible = true;

                // Apagar linterna
                this.isFlashlightOn = false;
                if (this.flashlight) this.flashlight.intensity = 0;

                // Restaurar fondo y niebla espacial
                this.scene.background = new THREE.Color(0x000000);
                this.scene.fog.color.setHex(0x000000);

                // Restaurar controles del espacio
                this.controls = new SpaceControls(this.camera, document.body);
                if (document.pointerLockElement === document.body) this.controls.isLocked = true;

                // Restaurar posición en el espacio (calculando la nueva órbita)
                if (this.lastLandedPlanet) {
                    const tardisScale = Config.TERRAIN_TARDIS_SCALE;
                    const terrainRadius = this.lastLandedPlanet.radius * tardisScale;

                    const currentX = this.camera.position.x;
                    const currentZ = this.camera.position.z;

                    // Extraer los nuevos ángulos de las coordenadas caminadas
                    const newLon = currentX / terrainRadius;
                    const newLat = currentZ / terrainRadius;

                    const planetPos = new THREE.Vector3(this.lastLandedPlanet.x, this.lastLandedPlanet.y, this.lastLandedPlanet.z);

                    // Vector de dirección desde el centro del planeta hacia el espacio
                    const dir = new THREE.Vector3(
                        Math.cos(newLat) * Math.cos(newLon),
                        Math.sin(newLat),
                        Math.cos(newLat) * Math.sin(newLon)
                    );

                    // Altura orbital original (escala masiva)
                    const orbitDist = this.lastLandedPlanet.radius + (this.savedOrbitHeight || 5000);

                    this.savedSpacePosition = planetPos.clone().add(dir.multiplyScalar(orbitDist));

                    // Hacer que la cámara aparezca mirando hacia el planeta
                    this.camera.position.copy(this.savedSpacePosition);
                    this.camera.lookAt(planetPos);
                    this.savedSpaceQuaternion = this.camera.quaternion.clone();
                } else if (this.savedSpacePosition) {
                    this.camera.position.copy(this.savedSpacePosition);
                    this.camera.quaternion.copy(this.savedSpaceQuaternion);
                }

                // Si aterrizamos manualmente, heredamos la inercia, 
                // de lo contrario, 0 para poder disfrutar de la órbita en paz
                if (!this.lastLandedPlanet && this.savedSpaceVelocity) {
                    this.controls.velocity.copy(this.savedSpaceVelocity);
                } else {
                    this.controls.velocity.set(0, 0, 0);
                }

                // Reconstruir Universo
                this.universe.rebuild();

                // Restaurar cámara a modo espacio
                const val = parseInt(document.getElementById('render-dist').value || 3);
                this.camera.far = val * Config.UNIVERSE_CHUNK_SIZE * 1.5;
                this.camera.near = 100;
                this.camera.updateProjectionMatrix();

                const viewDistance = val * Config.UNIVERSE_CHUNK_SIZE;
                this.scene.fog.density = Config.RENDER_FOG_BASE / viewDistance;

                this.ui.labelsContainer.classList.remove('hidden');

                // Activar el flujo natural de piloto automático fijado al planeta del que despegamos
                if (this.lastLandedPlanet) {
                    this.targetBody = this.lastLandedPlanet;
                    this.controls.autoPilotTarget = this.targetBody;
                    // Esto hará que el motor se encripte hacia el objetivo como si el usuario lo hubiera fijado
                }
            } catch (e) {
                console.error("Error during liftoff:", e);
                alert("Error during liftoff: " + e.message);
            }

            // Quitar el flash
            setTimeout(() => {
                flash.style.opacity = '0';
                this.isTransitioning = false;
            }, 500);
        }, 1000); // 1 segundo fade in
    }

    animate() {
        requestAnimationFrame(this.animate);
        const dt = this.clock.getDelta();

        if (this.currentState) {
            this.currentState.update(dt);
        }

        this.renderSystem.render();
    }
}
