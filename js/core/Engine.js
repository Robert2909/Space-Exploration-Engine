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

        this.camera = new THREE.PerspectiveCamera(Config.RENDER_FOV, window.innerWidth / window.innerHeight, 0.1, 40000);

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
            });
            distSlider.dispatchEvent(new Event('input'));
        }

        this.targetBody = null;
        document.addEventListener('keydown', (e) => {
            if (this.isTransitioning) return;

            if (Config.KEYS.TARGET.includes(e.code)) {
                if (this.targetBody) {
                    this.targetBody = null;
                    document.getElementById('target-panel').style.display = 'none';
                    this.controls.autoPilotTarget = null;
                    this.controls.autoLookTarget = null;
                    this.controls.lastAutoLookPos = null;
                    OSDManager.show('Targeting system disengaged', 'info');
                } else {
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
                        this.targetBody = closest;
                        document.getElementById('target-panel').style.display = 'block';
                        document.getElementById('target-name').innerText = "'" + closest.name + "'";
                        document.getElementById('target-type').innerText = "'" + closest.type + "'";
                        document.getElementById('target-radius').innerText = Math.round(closest.radius);
                        OSDManager.show('Locked onto: ' + closest.name, 'success');
                    } else {
                        OSDManager.show('No valid target in sight', 'error');
                    }
                }
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

        this.animate = this.animate.bind(this);
        requestAnimationFrame(this.animate);
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

        // Guardar estado ANTES del timeout por si acaso
        this.savedSpacePosition = this.camera.position.clone();
        this.savedSpaceQuaternion = this.camera.quaternion.clone();
        if (this.controls) this.savedSpaceVelocity = this.controls.velocity.clone();

        setTimeout(() => {
            this.gameState = 'TERRAIN';

            // Destruir Universo (Congelar el espacio)
            this.universe.dispose();

            // Guardar planeta aterrizado para enfocarlo al despegar (lo guardamos como referencia para targetBody)
            this.lastLandedPlanet = {
                name: planet.name,
                x: planet.x,
                y: planet.y,
                z: planet.z,
                radius: planet.radius,
                type: planet.type || ''
            };

            OSDManager.show(`Aterrizaje exitoso en ${planet.name}`, 'success', 3000);

            // Inicializar la escena de terreno
            this.controls.dispose(); // Quita listeners del espacio
            this.terrainControls = new TerrainControls(this.camera, document.body);
            // Heredar estado de lock
            if (document.pointerLockElement === document.body) this.terrainControls.isLocked = true;
            this.terrainManager = new TerrainManager(this.scene);

            // Posicionar jugador y resetear la rotación para evitar empezar chueco
            this.camera.position.set(0, 100, 0);
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

                // Restaurar controles del espacio
                this.controls = new SpaceControls(this.camera, document.body);
                if (document.pointerLockElement === document.body) this.controls.isLocked = true;

                // Restaurar posición en el espacio
                if (this.savedSpacePosition) {
                    this.camera.position.copy(this.savedSpacePosition);
                    this.camera.quaternion.copy(this.savedSpaceQuaternion);

                    // Si aterrizamos manualmente, heredamos la inercia, 
                    // de lo contrario, 0 para poder disfrutar de la órbita en paz
                    if (!this.lastLandedPlanet && this.savedSpaceVelocity) {
                        this.controls.velocity.copy(this.savedSpaceVelocity);
                    } else {
                        this.controls.velocity.set(0, 0, 0);
                    }
                }

                // Reconstruir Universo
                this.universe.rebuild();

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

                const dist = this.camera.position.distanceTo(new THREE.Vector3(this.targetBody.x, this.targetBody.y, this.targetBody.z));
                document.getElementById('target-dist').innerText = Math.round(dist) + 'u';
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
                    const threshold = Math.max(body.radius * 5.0, body.radius + 30);

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
                this.terrainManager.update(dt, this.camera.position);

                // Actualizar OSD
                document.getElementById('speed').innerText = Math.round(this.terrainControls.velocity.length()) + ' u/s';
                document.getElementById('pos-x').innerText = Math.round(this.camera.position.x);
                document.getElementById('pos-y').innerText = Math.round(this.camera.position.y);
                document.getElementById('pos-z').innerText = Math.round(this.camera.position.z);

                if (this.camera.position.y > 1000) {
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
