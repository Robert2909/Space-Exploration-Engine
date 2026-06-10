import * as THREE from 'three';
import { SpaceControls } from '../player/SpaceControls.js';
import { Universe } from '../world/universe/Universe.js';
import { LightingManager } from '../graphics/LightingManager.js';
import { UIManager } from '../ui/UIManager.js';
import { OSDManager } from '../ui/OSDManager.js';
import { Config } from './Config.js';
import { TerrainManager } from '../world/terrain/TerrainManager.js';
import { TerrainControls } from '../player/terrain/TerrainControls.js';

export class Engine {
    constructor() {
        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.FogExp2(0x000000, 0.00005);

        this.camera = new THREE.PerspectiveCamera(Config.RENDER_FOV, window.innerWidth / window.innerHeight, 100, 2000000);

        // TRUCO 2: Apagar el Antialiasing. El antialias multiplica por 4 el trabajo de la GPU.
        this.renderer = new THREE.WebGLRenderer({ antialias: Config.RENDER_ANTIALIAS, alpha: false, powerPreference: "high-performance" });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        // TRUCO EXTREMO: Los monitores 4K/Retina renderizan 4 veces más píxeles y hunden el rendimiento.
        // Limitamos el Pixel Ratio a 1.25 para que vuele en cualquier pantalla.
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, Config.RENDER_PIXEL_RATIO_MAX));
        document.body.appendChild(this.renderer.domElement);

        this.lighting = new LightingManager(this.scene);
        this.controls = new SpaceControls(this.camera, document.body);
        this.universe = new Universe(this.scene);
        this.ui = new UIManager(this.camera);

        this.gameState = 'SPACE'; // 'SPACE' or 'TERRAIN'
        this.landingTarget = null; // Planeta en el que estamos actualmente
        this.currentOrbitBody = null;
        this.isTransitioning = false;

        this.clock = new THREE.Clock();

        window.addEventListener('resize', () => this.onWindowResize());

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
                this.attemptTargeting();
            }
            if (Config.KEYS.AUTOPILOT.includes(e.code) && this.targetBody) {
                if (!this.controls.autoPilotTarget) {
                    this.controls.autoPilotTarget = this.targetBody;
                    OSDManager.show(`Autopilot engaged: Intercepting ${this.targetBody.name}`, 'warning', 4000);
                } else {
                    this.controls.autoPilotTarget = null;
                    OSDManager.show(`Autopilot aborted manually`, 'error');
                }
            }
            if (Config.KEYS.TOGGLE_LANDING.includes(e.code)) {
                if (this.gameState === 'SPACE' && this.landingTarget) {
                    this.triggerLanding(this.landingTarget);
                } else if (this.gameState === 'TERRAIN') {
                    this.triggerLiftoff();
                }
            }
        });

        document.addEventListener('mousedown', (e) => {
            if (this.isTransitioning) return;
            if (document.pointerLockElement !== document.body) return; // Solo actuar si ya estamos lockeados

            if (this.gameState === 'SPACE') {
                if (e.button === 0) { // Clic Izquierdo = Enfocar
                    this.attemptTargeting();
                } else if (e.button === 2) { // Clic Derecho = Aterrizar
                    if (this.landingTarget) {
                        this.triggerLanding(this.landingTarget);
                    } else if (this.targetBody) {
                        OSDManager.show('Demasiado lejos de ' + this.targetBody.name + ' para iniciar descenso', 'error');
                    } else {
                        OSDManager.show('Órbita estable requerida para aterrizaje', 'error');
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

    attemptTargeting() {
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
        let closest = null;
        let closestDist = Infinity;
        
        for (let body of this.ui.lastNearby || []) {
            const vec = new THREE.Vector3(body.x, body.y, body.z);
            const toBody = vec.clone().sub(this.camera.position);
            if (toBody.dot(raycaster.ray.direction) > 0) {
                const distToRay = raycaster.ray.distanceSqToPoint(vec);
                const hitThreshold = Math.max(body.radius * 3, 200) ** 2;
                if (distToRay < hitThreshold && body.distSq < closestDist) {
                    closestDist = body.distSq;
                    closest = body;
                }
            }
        }

        if (closest) {
            // Si el nuevo target es igual al actual, lo deseleccionamos
            if (this.targetBody && this.targetBody.name === closest.name) {
                this.targetBody = null;
                document.getElementById('target-panel').style.display = 'none';
                this.controls.autoPilotTarget = null;
                this.controls.autoLookTarget = null;
                this.controls.lastAutoLookPos = null;
                OSDManager.show('Targeting system disengaged', 'info');
            } else {
                this.targetBody = closest;
                this.updateTargetHUD(closest);
                OSDManager.show('Locked onto: ' + closest.name, 'success');
            }
        } else {
            if (this.targetBody) {
                // Click en el vacío = Deseleccionar
                this.targetBody = null;
                document.getElementById('target-panel').style.display = 'none';
                this.controls.autoPilotTarget = null;
                this.controls.autoLookTarget = null;
                this.controls.lastAutoLookPos = null;
                OSDManager.show('Targeting system disengaged', 'info');
            } else {
                OSDManager.show('No valid target in sight', 'error');
            }
        }
    }

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

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    triggerLanding(planet) {
        if (planet.type.includes('Gas')) {
            OSDManager.show('Planeta no explorable (Superficie no sólida)', 'error', 3000);
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

            OSDManager.show(`Aterrizaje exitoso en ${planet.name}`, 'success', 3000);

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
                // Destruir Terreno
                if (this.terrainManager) this.terrainManager.dispose();
                if (this.terrainControls) this.terrainControls.dispose();
                this.terrainManager = null;
                this.terrainControls = null;

                document.getElementById('jetpack-panel').style.display = 'none';

                // Restaurar luces espaciales
                this.lighting.systemLight.visible = true;
                this.lighting.ambientLight.visible = true;

                // Restaurar fondo y niebla espacial
                this.scene.background = new THREE.Color(0x000000);
                this.scene.fog.color.setHex(0x000000);

                // Restaurar controles del espacio
                this.controls = new SpaceControls(this.camera, document.body);
                if (document.pointerLockElement === document.body) this.controls.isLocked = true;

                // Restaurar posición en el espacio (calculando la nueva órbita)
                if (this.lastLandedPlanet) {
                    const tardisScale = 10;
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

        if (this.gameState === 'SPACE') {
            this.controls.update(dt);
            const pos = this.camera.position;

            this.universe.update(pos.x, pos.y, pos.z, dt);
            this.lighting.update(this.camera.position, this.universe);

            this.ui.updateHUD(this.controls.velocity.length(), pos);
            this.ui.updateLabels(this.universe);

            this.landingTarget = null;

            if (this.targetBody) {
                // Actualizar la referencia del objetivo en cada frame porque los planetas se mueven
                const freshBody = this.ui.lastNearby.find(b => b.name === this.targetBody.name);
                if (freshBody) {
                    this.targetBody = freshBody;
                    if (this.controls.autoPilotTarget) {
                        this.controls.autoPilotTarget = freshBody;
                    }
                    if (this.controls.autoLookTarget) {
                        this.controls.autoLookTarget = freshBody;
                    }
                }

                this.updateTargetHUD(this.targetBody);

                // Umbral de llegada relativo al tamaño del cuerpo (cinemático)
                const arrivalThreshold = Math.max(this.targetBody.radius * Config.AUTOPILOT_ARRIVAL_MULT, this.targetBody.radius + 30);

                // Detección de Overshoot (Tunneling de físicas): Si nos pasamos de largo por lag o velocidad excesiva
                let overshot = false;
                if (this.controls.autoPilotTarget && this.controls.lastCameraPos) {
                    // Matemáticamente perfecto: ¿El segmento de línea del último frame al actual cruza el umbral de llegada?
                    const A = this.controls.lastCameraPos;
                    const B = this.camera.position;
                    const C = new THREE.Vector3(this.targetBody.x, this.targetBody.y, this.targetBody.z);

                    const AB = new THREE.Vector3().subVectors(B, A);
                    const AC = new THREE.Vector3().subVectors(C, A);

                    const ab2 = AB.lengthSq();
                    if (ab2 > 0.001) {
                        let t = AC.dot(AB) / ab2;
                        t = Math.max(0, Math.min(1, t)); // Limitar al segmento entre el frame anterior y el actual

                        const closestPoint = new THREE.Vector3().copy(A).add(AB.multiplyScalar(t));
                        const distToSegment = closestPoint.distanceTo(C);

                        // Si el punto más cercano de nuestro movimiento de este frame estuvo dentro del umbral de llegada...
                        if (distToSegment < arrivalThreshold) {
                            // Y si realmente nos acercamos y luego nos alejamos (t > 0 significa que pasamos por el punto más cercano)
                            if (t > 0 && t <= 1) {
                                overshot = true;
                            }
                        }
                    }
                }

                // Guardar posición para el próximo frame
                if (!this.controls.lastCameraPos) this.controls.lastCameraPos = new THREE.Vector3();
                this.controls.lastCameraPos.copy(this.camera.position);

                const dist = this.camera.position.distanceTo(new THREE.Vector3(this.targetBody.x, this.targetBody.y, this.targetBody.z));
                if (this.controls.autoPilotTarget && (dist < arrivalThreshold || overshot)) {
                    this.controls.autoLookTarget = this.controls.autoPilotTarget;
                    this.controls.autoPilotTarget = null;
                    this.controls.velocity.set(0, 0, 0); // Freno perfecto absoluto
                    OSDManager.show(`Destination reached: ${this.targetBody.name}. Orbital insertion complete`, 'success', 5000);
                }
            } // Cierra if (this.targetBody)

            // Comprobar proximidad para aterrizar en cualquier cuerpo cercano (incluso sin Lock)
            let closestLandingBody = null;
            let minLandingDist = Infinity;
            let isGasGiant = false;

            if (this.ui.lastNearby && this.ui.lastNearby.length > 0) {
                for (const body of this.ui.lastNearby) {
                    // Filtrar estrellas (usando group) y agujeros negros, pero dejar gaseosos para advertir
                    if (body.group === 'Estrella' || (body.type && body.type.includes('Black Hole'))) continue;

                    const dist = this.camera.position.distanceTo(new THREE.Vector3(body.x, body.y, body.z));
                    const threshold = Math.max(body.radius * 5.0, body.radius + 3000);

                    if (dist < threshold && dist < minLandingDist) {
                        closestLandingBody = body;
                        minLandingDist = dist;
                        isGasGiant = body.type.includes('Gas');
                    }
                }
            }

            if (closestLandingBody && !this.controls.autoPilotTarget) {
                // Comparar por nombre ya que lastNearby regenera los objetos cada frame
                if (!this.currentOrbitBody || this.currentOrbitBody.name !== closestLandingBody.name) {
                    this.currentOrbitBody = closestLandingBody;
                    if (isGasGiant) {
                        OSDManager.show(`Órbita en ${closestLandingBody.name}: Superficie no sólida (Inhóspito)`, 'error', 0); // 0 = Persistente
                    } else {
                        OSDManager.show(`Órbita estable en ${closestLandingBody.name} [ENTER] Aterrizar`, 'info', 0); // Persistente
                    }
                }
                if (!isGasGiant) this.landingTarget = closestLandingBody;
            } else {
                if (this.currentOrbitBody) {
                    OSDManager.hide();
                }
                this.currentOrbitBody = null;
                this.landingTarget = null;
            }

        } else if (this.gameState === 'TERRAIN') {
            if (this.terrainControls && this.terrainManager) {
                this.terrainControls.update(dt);

                // Circunnavegación y Polos (Bucle finito planetario)
                if (this.lastLandedPlanet) {
                    const tardisScale = 10;
                    const terrainRadius = this.lastLandedPlanet.radius * tardisScale;
                    const circumference = Math.PI * 2 * terrainRadius;
                    const poleZ = (Math.PI / 2) * terrainRadius;

                    let px = this.camera.position.x;
                    let pz = this.camera.position.z;
                    let crossedPole = false;

                    // Cruzar los Polos (Norte/Sur)
                    if (pz > poleZ) {
                        pz = poleZ - (pz - poleZ);
                        px += circumference / 2;
                        crossedPole = true;
                    } else if (pz < -poleZ) {
                        pz = -poleZ - (pz + poleZ);
                        px += circumference / 2;
                        crossedPole = true;
                    }

                    // Bucle Este-Oeste (Ecuador/Longitud)
                    if (px > circumference / 2) px -= circumference;
                    else if (px < -circumference / 2) px += circumference;

                    if (crossedPole) {
                        // Girar cámara 180° horizontalmente al cruzar el polo
                        const euler = new THREE.Euler(0, 0, 0, 'YXZ');
                        euler.setFromQuaternion(this.camera.quaternion);
                        euler.y += Math.PI;
                        this.camera.quaternion.setFromEuler(euler);
                    }

                    this.camera.position.x = px;
                    this.camera.position.z = pz;
                }

                this.terrainManager.update(dt, this.camera.position);

                if (this.lastLandedPlanet) {
                    this.updateTargetHUD(this.lastLandedPlanet);
                }

                // Actualizar OSD Espacial (legado)
                document.getElementById('speed').innerText = Math.round(this.terrainControls.velocity.length()) + ' u/s';
                document.getElementById('pos-x').innerText = Math.round(this.camera.position.x);
                document.getElementById('pos-y').innerText = Math.round(this.camera.position.y);
                document.getElementById('pos-z').innerText = Math.round(this.camera.position.z);

                // Actualizar OSD Terreno (Navegación)
                if (this.lastLandedPlanet) {
                    const terrainRadius = this.lastLandedPlanet.radius * 10;
                    
                    const latDeg = (this.camera.position.z / terrainRadius) * (180 / Math.PI);
                    const lonDeg = (this.camera.position.x / terrainRadius) * (180 / Math.PI);
                    
                    document.getElementById('terr-lat').innerText = latDeg.toFixed(2) + '°';
                    document.getElementById('terr-lon').innerText = lonDeg.toFixed(2) + '°';
                    document.getElementById('terr-alt').innerText = Math.round(this.camera.position.y) + 'm';
                    
                    // Brújula
                    const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
                    // dir.z es positivo hacia el Norte (+Z) en nuestro sistema
                    let heading = Math.atan2(dir.x, dir.z) * (180 / Math.PI);
                    if (heading < 0) heading += 360;
                    
                    const cardinals = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
                    const index = Math.round(heading / 45) % 8;
                    document.getElementById('terr-compass').innerText = `'${cardinals[index]}'`;
                }

                if (this.camera.position.y > 100000) {
                    if (!this.showingLiftoffPrompt) {
                        OSDManager.show("Atmósfera Alta [ENTER] Despegar", 'warning', 5000);
                        this.showingLiftoffPrompt = true;
                    }
                } else {
                    this.showingLiftoffPrompt = false;
                }
            }
        }

        this.renderer.render(this.scene, this.camera);
    }
}
