import * as THREE from 'three';
import { Config } from './Config.js';
import { SpaceControls } from '../player/space/SpaceControls.js';
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
import { AudioManager } from '../audio/AudioManager.js';
import { Chunk } from '../world/universe/Chunk.js';

export class Engine {
    constructor() {
        this.renderSystem = new RenderSystem();
        this.scene = this.renderSystem.scene;
        this.camera = this.renderSystem.camera;
        this.renderer = this.renderSystem.renderer;

        this.interactionSystem = new InteractionSystem(this);
        this.audioManager = new AudioManager(this);

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
        this.flashlight = new THREE.SpotLight(0xffeedd, 0, Config.TERRAIN_FLASHLIGHT_DISTANCE, Config.TERRAIN_FLASHLIGHT_ANGLE, Config.TERRAIN_FLASHLIGHT_PENUMBRA, Config.TERRAIN_FLASHLIGHT_DECAY);
        this.flashlight.position.set(0, 0, 0);
        this.flashlight.target.position.set(0, 0, -1);
        this.camera.add(this.flashlight);
        this.camera.add(this.flashlight.target);
        this.scene.add(this.camera); // Necesario para que las luces adjuntas a la cámara funcionen

        this.isFlashlightOn = false;
        this.flashlightPower = Config.TERRAIN_FLASHLIGHT_POWER_DEFAULT; // Nivel de intensidad (scroll)

        EventManager.on(EVENTS.RENDER_DISTANCE_CHANGED, (val) => {
            this.universe.setRenderDistance(val);
            const viewDistance = val * this.universe.chunkSize;
            this.scene.fog.density = Config.RENDER_FOG_BASE / viewDistance;
            if (this.gameState === 'SPACE') {
                this.camera.far = viewDistance * 1.5;
                this.camera.near = Config.RENDER_NEAR_PLANE;
                this.camera.updateProjectionMatrix();
            }
        });

        EventManager.on(EVENTS.LOCATOR_SCAN_REQUESTED, async (criteria) => {
            if (this.gameState !== 'SPACE') {
                EventManager.emit(EVENTS.OSD_MESSAGE, { message: 'El escáner solo funciona en el espacio', type: 'error' });
                return;
            }

            const { mainType, subType, extraRange } = criteria;
            const results = [];
            const pos = this.camera.position;
            const chunksToProcess = [];

            for (let [key, chunk] of this.universe.chunks.entries()) {
                if (chunk === 'pending') {
                    const [cx, cy, cz] = key.split(',').map(Number);
                    chunksToProcess.push({ cx, cy, cz });
                } else {
                    chunksToProcess.push({ chunkObj: chunk });
                }
            }

            if (extraRange && extraRange > 0) {
                const px = Math.floor(pos.x / Config.UNIVERSE_CHUNK_SIZE);
                const py = Math.floor(pos.y / Config.UNIVERSE_CHUNK_SIZE);
                const pz = Math.floor(pos.z / Config.UNIVERSE_CHUNK_SIZE);
                const scanRange = this.universe.renderDistance + extraRange;

                for (let x = -scanRange; x <= scanRange; x++) {
                    for (let y = -scanRange; y <= scanRange; y++) {
                        for (let z = -scanRange; z <= scanRange; z++) {
                            const cx = px + x;
                            const cy = py + y;
                            const cz = pz + z;
                            const key = `${cx},${cy},${cz}`;
                            if (!this.universe.chunks.has(key)) {
                                chunksToProcess.push({ cx, cy, cz });
                            }
                        }
                    }
                }
            }

            // Procesar en lotes asíncronos para no congelar la UI
            const batchSize = 1000;
            const totalChunks = chunksToProcess.length;

            for (let i = 0; i < totalChunks; i++) {
                const task = chunksToProcess[i];
                let systems = [];
                let cx, cy, cz;

                if (task.chunkObj) {
                    systems = task.chunkObj.systems;
                    cx = task.chunkObj.cx; cy = task.chunkObj.cy; cz = task.chunkObj.cz;
                } else {
                    systems = Chunk.getMockSystemsData(task.cx, task.cy, task.cz, Config.UNIVERSE_CHUNK_SIZE);
                    cx = task.cx; cy = task.cy; cz = task.cz;
                }

                const cxW = cx * Config.UNIVERSE_CHUNK_SIZE;
                const cyW = cy * Config.UNIVERSE_CHUNK_SIZE;
                const czW = cz * Config.UNIVERSE_CHUNK_SIZE;

                for (let sys of systems) {
                    let sysX, sysY, sysZ;

                    // Star/BlackHole world coordinates
                    if (sys.x !== undefined && !sys.isMock) {
                        sysX = sys.x;
                        sysY = sys.y;
                        sysZ = sys.z;
                    } else {
                        let slx = sys.lx || 0;
                        let sly = sys.ly || 0;
                        let slz = sys.lz || 0;
                        sysX = slx + cxW;
                        sysY = sly + cyW;
                        sysZ = slz + czW;
                    }

                    let dx = sysX - pos.x;
                    let dy = sysY - pos.y;
                    let dz = sysZ - pos.z;
                    let distSq = dx * dx + dy * dy + dz * dz;

                    // Agujeros negros don't have planets
                    if (sys.group === 'BlackHole') {
                        this._checkAndAddLocatorResult(sys, 'BlackHole', 'Agujero Negro', distSq, results, sysX, sysY, sysZ, criteria);
                    } else {
                        // It's a Star
                        this._checkAndAddLocatorResult(sys, 'Star', sys.type, distSq, results, sysX, sysY, sysZ, criteria);

                        if (sys.planets) {
                            for (let planet of sys.planets) {
                                let pWorldX, pWorldY, pWorldZ;

                                if (planet.x !== undefined && !planet.isMock) {
                                    pWorldX = planet.x;
                                    pWorldY = planet.y;
                                    pWorldZ = planet.z;
                                } else {
                                    // For mock planets, planet.lx is already relative to the chunk center (it includes parent star's lx)
                                    let plx = planet.lx || 0;
                                    let ply = planet.ly || 0;
                                    let plz = planet.lz || 0;
                                    pWorldX = cxW + plx;
                                    pWorldY = cyW + ply;
                                    pWorldZ = czW + plz;
                                }

                                let pdx = pWorldX - pos.x;
                                let pdy = pWorldY - pos.y;
                                let pdz = pWorldZ - pos.z;
                                let pdistSq = pdx * pdx + pdy * pdy + pdz * pdz;

                                this._checkAndAddLocatorResult(planet, 'Planet', planet.type, pdistSq, results, pWorldX, pWorldY, pWorldZ, criteria);
                            }
                        }
                    }
                }

                // Yield to main thread for progress update
                if (i > 0 && i % batchSize === 0) {
                    const progress = Math.round((i / totalChunks) * 100);
                    EventManager.emit(EVENTS.LOCATOR_SCAN_PROGRESS, { pct: progress, current: i, total: totalChunks });
                    await new Promise(resolve => setTimeout(resolve, 0));
                }
            }

            EventManager.emit(EVENTS.LOCATOR_SCAN_PROGRESS, { pct: 100, current: totalChunks, total: totalChunks });

            // Ordenar por distancia inicialmente
            results.sort((a, b) => a.distSq - b.distSq);

            EventManager.emit(EVENTS.LOCATOR_RESULTS_READY, { results: results, total: results.length });
            EventManager.emit(EVENTS.OSD_MESSAGE, { message: `Escaneo completado. ${results.length} coincidencias.`, type: 'info', duration: 3000 });
        });

        EventManager.on(EVENTS.TARGET_CHANGED, (target) => {
            this.targetBody = target;
        });

        EventManager.on(EVENTS.TARGET_CLEARED, () => {
            this.targetBody = null;
        });

        EventManager.on(EVENTS.PLAYER_DEATH, () => {
            if (this.gameState === 'TERRAIN') {
                if (this.terrainControls) this.terrainControls.isDead = true;
                this.triggerLiftoff(true);
            }
        });

        this.cameraBlurLevel = 0;
        EventManager.on(EVENTS.PLAYER_IMPACT, (payload) => {
            this.cameraBlurLevel += payload.level || 0;
        });

        EventManager.on(EVENTS.LOCATOR_TRAVEL_REQUESTED, (body) => {
            if (this.gameState === 'SPACE' && this.controls) {
                this.targetBody = body;
                this.updateTargetHUD(body);
                EventManager.emit(EVENTS.TARGET_CHANGED, body);
                this.controls.setAutoPilotTarget(this.targetBody);
                EventManager.emit(EVENTS.OSD_MESSAGE, { message: `Piloto Automático remoto activado hacia ${this.targetBody.name}`, type: 'info', duration: 3000 });
            }
        });

        this.targetBody = null;
        document.addEventListener('keydown', (e) => {
            if (this.isTransitioning) return;
            if (e.repeat) return; // Prevenir spam en las teclas de toggle

            // Procesar TOGGLE_FOCUS en keydown es OBLIGATORIO.
            if (Config.KEYS.TOGGLE_FOCUS.includes(e.code)) {
                if (document.activeElement && document.activeElement.tagName === 'INPUT') return;

                if (document.pointerLockElement) {
                    document.exitPointerLock();
                }
            }

            if (Config.KEYS.AUTOPILOT.includes(e.code) && this.targetBody) {
                if (!this.controls.autoPilotTarget) {
                    this.controls.setAutoPilotTarget(this.targetBody);
                    EventManager.emit(EVENTS.OSD_MESSAGE, { message: `Piloto Automático activado hacia ${this.targetBody.name}`, type: 'info', duration: 3000 });
                } else {
                    this.controls.setAutoPilotTarget(null);
                    EventManager.emit(EVENTS.OSD_MESSAGE, { message: `Piloto Automático desactivado`, type: 'warning', duration: 3000 });
                }
            }
            if (Config.KEYS.TOGGLE_LANDING.includes(e.code)) {
                if (this.gameState === 'SPACE' && this.landingTarget) {
                    this.interactionSystem.attemptLandingZone(this.landingTarget);
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
                    this.flashlightPower = Math.min(this.flashlightPower + Config.TERRAIN_FLASHLIGHT_POWER_STEP, Config.TERRAIN_FLASHLIGHT_POWER_MAX);
                } else {
                    this.flashlightPower = Math.max(this.flashlightPower - Config.TERRAIN_FLASHLIGHT_POWER_STEP, Config.TERRAIN_FLASHLIGHT_POWER_STEP);
                }
                this.flashlight.intensity = this.flashlightPower;
                // Incrementar también el alcance y el ángulo ligeramente según el poder
                this.flashlight.distance = Config.TERRAIN_FLASHLIGHT_DISTANCE_BASE + (this.flashlightPower * Config.TERRAIN_FLASHLIGHT_DISTANCE_STEP);
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
                        this.interactionSystem.attemptLandingZone(this.landingTarget);
                    } else if (this.targetBody) {
                        EventManager.emit(EVENTS.OSD_MESSAGE, { message: 'Imposible iniciar descenso en ' + this.targetBody.name, type: 'error' });
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
        EventManager.emit(EVENTS.HUD_TARGET_UPDATED, {
            target: target,
            gameState: this.gameState,
            cameraPos: this.camera.position,
            terrainManager: this.terrainManager,
            landingMarker: this.landingMarker
        });
    }

    // onWindowResize moved to RenderSystem.js

    triggerLanding(planet, fixedLat, fixedLon) {
        if (planet.type.includes('Gas')) {
            EventManager.emit(EVENTS.OSD_MESSAGE, { message: 'Planeta no explorable (Superficie no sólida)', type: 'error', duration: 3000 });
            return;
        }

        if (this.isTransitioning) return;
        this.isTransitioning = true;

        EventManager.emit(EVENTS.TRANSITION_START, { color: 'black' });

        // Guardar estado de la nave ANTES de transicionar
        this.savedSpacePosition = this.camera.position.clone();
        this.savedSpaceQuaternion = this.camera.quaternion.clone();
        if (this.controls) {
            this.savedSpaceVelocity = this.controls.velocity.clone();
            this.savedSpaceSpeed = this.controls.speed;
        }

        // 1. Calcular Lat/Lon de aterrizaje
        let startX = 0;
        let startZ = 0;

        if (planet) {
            const planetPos = new THREE.Vector3(planet.x, planet.y, planet.z);
            const landingDist = this.camera.position.distanceTo(planetPos);

            // Coordenadas calculadas y fijadas desde el marcador
            const lat = fixedLat;
            const lon = fixedLon;

            this.savedOrbitHeight = landingDist - planet.radius;

            const tardisScale = 10;
            const terrainRadius = planet.radius * tardisScale;

            // La coordenada física del terreno es la longitud estática (ya calculada como 'lon')
            startX = lon * terrainRadius;
            startZ = lat * terrainRadius;
        }

        setTimeout(() => {
            if (this.currentState) this.currentState.exit();
            this.gameState = 'TERRAIN';
            EventManager.emit(EVENTS.STATE_CHANGED, this.gameState);

            this.currentState = this.states.TERRAIN;
            this.currentState.enter({ planet, startX, startZ });

            // Destruir Universo (Congelar el espacio)
            this.universe.dispose();

            // Guardar planeta aterrizado para enfocarlo al despegar
            this.lastLandedPlanet = {
                name: planet.name,
                x: planet.x,
                y: planet.y,
                z: planet.z,
                radius: planet.radius,
                type: planet.type || '',
                color: planet.color,
                atmosphereDensity: planet.atmosphereDensity,
                orbitSpeed: planet.orbitSpeed,
                orbitRadius: planet.orbitRadius,
                rotationSpeed: planet.rotationSpeed,
                terrainVariance: planet.terrainVariance
            };

            EventManager.emit(EVENTS.OSD_MESSAGE, { message: `Aterrizaje exitoso en ${planet.name}`, type: 'success', duration: 3000 });

            // Inicializar la escena de terreno
            this.controls.dispose(); // Quita listeners del espacio

            // Instanciar el gestor de terreno primero para tener acceso al generador de alturas
            const starAngle = Math.atan2(planet.starZ - planet.z, planet.starX - planet.x);
            const currentWorldLon = fixedLon - (planet.rotationY || 0);
            this.landingTimeOfDay = (starAngle - currentWorldLon) + Math.PI / 2;

            this.terrainManager = new TerrainManager(this.scene, planet, startX, startZ, this.landingTimeOfDay, fixedLat);

            this.terrainControls = new TerrainControls(this.camera, document.body, (x, z) => {
                return this.terrainManager.generator.getVisualHeightAt(x, z);
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
            this.scene.fog.density = 2.5 / Config.TERRAIN_FOG_DIVISOR; // Ocultar el pop-in de los chunks a los lados

            // Posicionar jugador en el punto exacto del terreno, garantizando que esté sobre el suelo
            const spawnY = this.terrainManager.generator.getVisualHeightAt(startX, startZ) + 10;
            this.camera.position.set(startX, spawnY, startZ);
            this.camera.rotation.set(0, 0, 0);
            this.camera.quaternion.identity();

            // Quitar el flash
            setTimeout(() => {
                EventManager.emit(EVENTS.TRANSITION_END);
                this.isTransitioning = false;
            }, 500);
        }, 1000); // 1 segundo fade in
    }

    triggerLiftoff(isDeath = false) {
        if (this.isTransitioning) return;
        this.isTransitioning = true;

        const flashColor = isDeath ? '#550000' : 'white';
        const transitionWait = isDeath ? 3000 : 0; // Esperar 3s si es muerte para leer la OSD
        const liftOffDelay = isDeath ? 1500 : 1000;

        setTimeout(() => {
            EventManager.emit(EVENTS.TRANSITION_START, { color: flashColor });

            setTimeout(() => {
                try {
                    if (this.currentState) this.currentState.exit();
                    this.gameState = 'SPACE';
                    EventManager.emit(EVENTS.STATE_CHANGED, this.gameState);

                    this.currentState = this.states.SPACE;
                    this.currentState.enter();
                    // Destruir Terreno
                    if (this.terrainManager) this.terrainManager.dispose();
                    if (this.terrainControls) this.terrainControls.dispose();
                    this.terrainManager = null;
                    this.terrainControls = null;

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
                    const savedSpeed = this.controls ? this.controls.speed : null;
                    this.controls = new SpaceControls(this.camera, document.body);
                    if (savedSpeed !== null) this.controls.speed = savedSpeed;
                    if (document.pointerLockElement === document.body) this.controls.isLocked = true;

                    // Restaurar posición en el espacio (calculando la nueva órbita)
                    if (this.lastLandedPlanet) {
                        const tardisScale = Config.TERRAIN_TARDIS_SCALE;
                        const terrainRadius = this.lastLandedPlanet.radius * tardisScale;

                        const currentX = this.camera.position.x;
                        const currentZ = this.camera.position.z;

                        // Extraer los nuevos ángulos de las coordenadas caminadas
                        const staticLon = currentX / terrainRadius;
                        const newLat = currentZ / terrainRadius;

                        const planetPos = new THREE.Vector3(this.lastLandedPlanet.x, this.lastLandedPlanet.y, this.lastLandedPlanet.z);

                        // Convertimos la longitud estática a longitud mundial
                        const currentWorldLon = staticLon - (this.lastLandedPlanet.rotationY || 0);

                        // Vector de dirección desde el centro del planeta hacia el espacio
                        const dir = new THREE.Vector3(
                            Math.cos(newLat) * Math.cos(currentWorldLon),
                            Math.sin(newLat),
                            Math.cos(newLat) * Math.sin(currentWorldLon)
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

                    if (this.savedSpaceSpeed !== undefined) {
                        this.controls.speed = this.savedSpaceSpeed;
                    }

                    // Reconstruir Universo
                    this.universe.rebuild();

                    // Restaurar cámara a modo espacio
                    // Restaurar cámara a modo espacio
                    const val = this.universe.renderDistance || 3;
                    this.camera.far = val * Config.UNIVERSE_CHUNK_SIZE * 1.5;
                    this.camera.near = Config.RENDER_NEAR_PLANE;
                    this.camera.updateProjectionMatrix();

                    const viewDistance = val * Config.UNIVERSE_CHUNK_SIZE;
                    this.scene.fog.density = Config.RENDER_FOG_BASE / viewDistance;

                    // Activar el flujo natural de piloto automático fijado al planeta del que despegamos
                    if (this.lastLandedPlanet) {
                        this.targetBody = this.lastLandedPlanet;
                        this.controls.setAutoPilotTarget(this.targetBody);
                        // Esto hará que el motor se encripte hacia el objetivo como si el usuario lo hubiera fijado
                    }
                } catch (e) {
                    console.error("Error during liftoff:", e);
                    EventManager.emit(EVENTS.OSD_MESSAGE, { message: "Error al despegar: " + e.message, type: 'error', duration: 5000 });
                }

                // Quitar el flash
                setTimeout(() => {
                    EventManager.emit(EVENTS.TRANSITION_END);
                    this.isTransitioning = false;
                    this.cameraBlurLevel = 0; // Limpiar el blur al reaparecer
                }, 500);
            }, liftOffDelay);
        }, transitionWait);
    }

    animate() {
        requestAnimationFrame(this.animate);
        const dt = this.clock.getDelta();

        if (this.currentState) {
            this.currentState.update(dt);
        }

        if (this.audioManager) {
            this.audioManager.update(dt);
        }

        if (this.cameraBlurLevel > 0) {
            this.cameraBlurLevel -= dt * 0.3; // Lento desvanecimiento de conmoción
            if (this.cameraBlurLevel < 0.01) this.cameraBlurLevel = 0;
            const blurAmount = this.cameraBlurLevel * 15; // Hasta 15px de blur
            const sepiaAmount = Math.min(this.cameraBlurLevel * 80, 100);
            this.renderSystem.renderer.domElement.style.filter = `blur(${blurAmount}px) sepia(${sepiaAmount}%) saturate(${100 - sepiaAmount}%)`;
        } else {
            this.renderSystem.renderer.domElement.style.filter = 'none';
        }

        this.renderSystem.render();
    }

    _checkAndAddLocatorResult(body, actualMainType, actualSubType, distSq, resultsArr, wx, wy, wz, criteria) {
        if (criteria.mainType !== 'ALL' && criteria.mainType !== actualMainType) return;
        if (criteria.subType !== 'ALL' && criteria.subType !== actualSubType) return;

        if (body.isMock) {
            body.x = wx; body.y = wy; body.z = wz;
        }

        // Distancia real aproximada
        const dist = Math.sqrt(distSq);

        resultsArr.push({
            id: body.name + '_' + wx, // ID único temporal
            name: body.name,
            type: actualSubType,
            mainType: actualMainType,
            distSq: distSq,
            distance: Math.round(dist),
            radius: body.radius,
            orbitSpeed: body.orbitSpeed || 0,
            rotationSpeed: body.rotationSpeed || 0,
            orbitRadius: body.orbitRadius || 0,
            x: wx, y: wy, z: wz,
            group: body.group || actualMainType, // para que sea compatible con target
            bodyRef: body // Guardamos la referencia para el sistema de interacción
        });
    }
}
