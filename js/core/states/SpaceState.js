import * as THREE from 'three';
import { GameState } from '../GameState.js';
import { EventManager, EVENTS } from '../EventManager.js';
import { Config } from '../Config.js';

export class SpaceState extends GameState {
    constructor(engine) {
        super(engine);

        // Object Pooling
        this._bhPos = new THREE.Vector3();
        this._worldDir = new THREE.Vector3();
        this._localDir = new THREE.Vector3();
        this._sysPos = new THREE.Vector3();
        this._C = new THREE.Vector3();
        this._AB = new THREE.Vector3();
        this._AC = new THREE.Vector3();
        this._closestPoint = new THREE.Vector3();
        this._bodyPos = new THREE.Vector3();
        this._localPoint = new THREE.Vector3();
        this._normal = new THREE.Vector3();
        this._zAxis = new THREE.Vector3(0, 0, 1);
        this._camInverseQuat = new THREE.Quaternion();
        this.currentSystem = null;
    }

    enter(payload) {
        this.engine.gameState = 'SPACE';
        // Payload puede contener la velocidad conservada del despegue, etc.
    }

    update(dt) {
        const engine = this.engine;

        const pos = engine.camera.position;
        const closestBody = engine.universe.getClosestBody(pos);
        if (engine.controls.setProximityBody) {
            engine.controls.setProximityBody(closestBody);
        }

        // Dynamic Level of Detail (LOD) para planetas
        if (closestBody && closestBody.group === 'Planeta') {
            const bodyPos = new THREE.Vector3(closestBody.x, closestBody.y, closestBody.z);
            if (pos.distanceTo(bodyPos) < closestBody.radius * Config.LOD_HIGH_DISTANCE_MULT) {
                engine.universe.setHighLODPlanet(closestBody);
            } else {
                engine.universe.setHighLODPlanet(null);
            }
        } else {
            engine.universe.setHighLODPlanet(null);
        }

        engine.controls.update(dt);

        engine.universe.update(pos.x, pos.y, pos.z, dt);
        engine.lighting.update(engine.camera.position, engine.universe);

        const maxDist = Config.UI_LABEL_MAX_DISTANCE;
        const maxDistSq = maxDist * maxDist;
        const nearbyBodies = [];

        let maxPanic = 0;
        let closestStarSystem = null;
        let minStarDistSq = Infinity;

        for (let [key, chunk] of engine.universe.chunks.entries()) {
            if (chunk === 'pending') continue;
            const cx = chunk.group.position.x;
            const cy = chunk.group.position.y;
            const cz = chunk.group.position.z;

            for (let sys of chunk.systems) {
                // Agregar sys a nearbyBodies
                let dx = sys.lx + cx - pos.x;
                let dy = sys.ly + cy - pos.y;
                let dz = sys.lz + cz - pos.z;
                let distSq = dx * dx + dy * dy + dz * dz;

                let specificMaxDist = Math.max(maxDist, sys.radius * Config.UI_LABEL_DISTANCE_MULT);
                let allowDistSq = specificMaxDist * specificMaxDist;

                if (distSq < allowDistSq) {
                    nearbyBodies.push({ name: sys.name, type: sys.type, group: sys.group || 'Estrella', radius: sys.radius, x: sys.lx + cx, y: sys.ly + cy, z: sys.lz + cz, distSq: distSq });
                }

                if (distSq < minStarDistSq) {
                    minStarDistSq = distSq;
                    closestStarSystem = sys;
                }

                // Agregar planetas a nearbyBodies
                for (let p of sys.planets) {
                    dx = p.lx + cx - pos.x;
                    dy = p.ly + cy - pos.y;
                    dz = p.lz + cz - pos.z;
                    distSq = dx * dx + dy * dy + dz * dz;
                    let pMaxDist = Math.max(maxDist, p.radius * Config.UI_LABEL_DISTANCE_MULT);
                    if (distSq < pMaxDist * pMaxDist) {
                        nearbyBodies.push({
                            name: p.name, type: p.type, group: 'Planeta',
                            radius: p.radius, x: p.lx + cx, y: p.ly + cy, z: p.lz + cz,
                            distSq: distSq, color: p.color, atmosphereDensity: p.atmosphereDensity,
                            orbitRadius: p.orbitRadius, orbitSpeed: p.orbitSpeed, rotationSpeed: p.rotationSpeed, rotationY: p.rotationY,
                            mesh: p.mesh, terrainVariance: p.terrainVariance,
                            starX: sys.lx + cx, starY: sys.ly + cy, starZ: sys.lz + cz,
                            parentSystem: {
                                sunColor: sys.sunColor,
                                companion: sys.companion ? { sunColor: sys.companion.sunColor } : null
                            }
                        });
                    }
                }

                if (sys.group === 'BlackHole') {
                    this._bhPos.set(sys.lx + cx, sys.ly + cy, sys.lz + cz);
                    const dist = pos.distanceTo(this._bhPos);

                    const pullRadius = sys.radius * Config.BLACK_HOLE_PULL_RADIUS_MULT;
                    const panicRadius = sys.radius * Config.BLACK_HOLE_PANIC_RANGE_MULT;

                    if (dist < pullRadius) {
                        const normalizedDist = Math.max(0.005, dist / pullRadius);

                        // Gravedad estilo 1/r^2
                        let forceStr = (1 / (normalizedDist * normalizedDist)) * Config.BLACK_HOLE_GRAVITY_STRENGTH;

                        // Limitar la fuerza para evitar ser disparado a Narnia
                        forceStr = Math.min(forceStr, Config.PLAYER_SPEED_MAX * 0.8);

                        // El vector 'dir' está en espacio del mundo. La velocidad de la nave está en espacio local.
                        // Convertimos 'dir' a espacio local usando el cuaternión inverso de la cámara.
                        this._worldDir.subVectors(this._bhPos, pos).normalize();
                        this._camInverseQuat.copy(engine.camera.quaternion).invert();
                        this._localDir.copy(this._worldDir).applyQuaternion(this._camInverseQuat);

                        engine.controls.velocity.add(this._localDir.multiplyScalar(forceStr * dt));

                        // Fricción aplastante si cruzas el horizonte de eventos
                        if (dist < sys.radius * Config.BLACK_HOLE_EVENT_HORIZON_MULT) {
                            engine.controls.velocity.multiplyScalar(0.95);
                        }
                    }

                    const eventHorizon = sys.radius * Config.BLACK_HOLE_EVENT_HORIZON_MULT;

                    // Pánico visual (Glitches): Aumentamos el rango para que dé miedo antes
                    if (dist < panicRadius) {
                        let panicNorm = 0;
                        if (dist <= eventHorizon) {
                            panicNorm = 1.0;
                        } else {
                            // Normalizar: 0 en panicRadius, 1.0 en eventHorizon
                            panicNorm = 1 - ((dist - eventHorizon) / (panicRadius - eventHorizon));
                        }

                        // Curva exponencial: Empieza suave, y cuando estás muy cerca tiembla horriblemente
                        const panic = Math.pow(panicNorm, 3) * Config.BLACK_HOLE_PANIC_STRENGTH;
                        if (panic > maxPanic) maxPanic = panic;
                    }
                }

                // Efecto de escombros/polvo al atravesar cinturones de asteroides
                if (sys.asteroidBelt) {
                    this._sysPos.set(sys.lx + cx, sys.ly + cy, sys.lz + cz);
                    const distToSys = pos.distanceTo(this._sysPos);
                    const inBelt = distToSys > sys.asteroidBelt.innerRadius && distToSys < (sys.asteroidBelt.innerRadius + sys.asteroidBelt.width);

                    if (inBelt) {
                        // Calcular qué tan profundo estamos en el cinturón (0 en los bordes, 1 en el centro)
                        const beltCenter = sys.asteroidBelt.innerRadius + (sys.asteroidBelt.width / 2);
                        const depth = 1.0 - (Math.abs(distToSys - beltCenter) / (sys.asteroidBelt.width / 2));

                        // Si vamos rápido relativo a nuestra velocidad máxima, la nave tiembla levemente
                        const speed = engine.controls.velocity.length();
                        if (speed > Config.PLAYER_SPEED_MAX * 0.2) {
                            // Reducimos drásticamente la intensidad (de 0.05 a 0.005) para que no maree
                            const shakeLevel = depth * (speed / Config.PLAYER_SPEED_MAX) * 0.005;
                            engine.cameraBlurLevel += shakeLevel;

                            // Avisar al jugador con mucha menor frecuencia (de 0.02 a 0.001)
                            if (speed > Config.PLAYER_SPEED_MAX * 0.6 && Math.random() < 0.001) {
                                EventManager.emit(EVENTS.OSD_MESSAGE, { message: 'Alerta: Micro-impactos detectados en el exterior', type: 'warning', duration: 2000 });
                            }
                        }
                    }
                }
            }
        }

        nearbyBodies.sort((a, b) => a.distSq - b.distSq);

        if (closestStarSystem) {
            const dist = Math.sqrt(minStarDistSq);
            if (dist < closestStarSystem.systemRadius) {
                if (this.currentSystem !== closestStarSystem.name) {
                    this.currentSystem = closestStarSystem.name;
                    EventManager.emit(EVENTS.SYSTEM_ENTERED, { name: closestStarSystem.name });
                }
            } else {
                if (this.currentSystem !== null) {
                    this.currentSystem = null;
                    EventManager.emit(EVENTS.SYSTEM_EXITED);
                }
            }
        }

        // Notificar nivel de pánico al UI
        EventManager.emit(EVENTS.BLACKHOLE_PANIC, { level: maxPanic });
        // Almacenar en el engine para los sistemas (ej. InteractionSystem)
        engine.nearbyBodies = nearbyBodies;

        // Notificar la telemetría a la UI (Arquitectura Event-Driven, ciega)
        EventManager.emit(EVENTS.PLAYER_TELEMETRY_UPDATED, {
            speed: engine.controls.velocity.length(),
            pos: pos,
            nearby: nearbyBodies
        });
        // -----------------------------------

        engine.landingTarget = null;

        if (engine.targetBody) {
            // Actualizar la referencia del objetivo en cada frame porque los planetas se mueven
            const freshBody = nearbyBodies.find(b => b.name === engine.targetBody.name);
            if (freshBody) {
                engine.targetBody = freshBody;

                // Si teníamos un target y el usuario lo cambió por otro, cancelamos el autopilot/órbita
                if (engine.controls.autoPilotTarget) {
                    if (engine.controls.autoPilotTarget.name !== freshBody.name) {
                        engine.controls.setAutoPilotTarget(null);
                    } else {
                        engine.controls.setAutoPilotTarget(freshBody, true);
                    }
                }

                if (engine.controls.autoLookTarget) {
                    if (engine.controls.autoLookTarget.name !== freshBody.name) {
                        engine.controls.autoLookTarget = null;
                        engine.controls.lastAutoLookPos = null;
                    } else {
                        engine.controls.autoLookTarget = freshBody;
                    }
                }
            }

            engine.updateTargetHUD(engine.targetBody);

            // Umbral de llegada relativo al tamaño del cuerpo (cinemático), limitado para monstruosidades
            const idealRadius = engine.targetBody.radius * Config.AUTOPILOT_ARRIVAL_MULT;
            const arrivalThreshold = Math.max(idealRadius, engine.targetBody.radius + 30);

            // Detección de Overshoot (Tunneling de físicas): Si nos pasamos de largo por lag o velocidad excesiva
            let overshot = false;
            if (engine.controls.autoPilotTarget && engine.controls.lastCameraPos) {
                // Matemáticamente perfecto: ¿El segmento de línea del último frame al actual cruza el umbral de llegada?
                const A = engine.controls.lastCameraPos;
                const B = engine.camera.position;
                this._C.set(engine.targetBody.x, engine.targetBody.y, engine.targetBody.z);

                this._AB.subVectors(B, A);
                this._AC.subVectors(this._C, A);

                const ab2 = this._AB.lengthSq();
                if (ab2 > 0.001) {
                    let t = this._AC.dot(this._AB) / ab2;
                    t = Math.max(0, Math.min(1, t)); // Limitar al segmento entre el frame anterior y el actual

                    this._closestPoint.copy(A).add(this._AB.multiplyScalar(t));
                    const distToSegment = this._closestPoint.distanceTo(this._C);

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
            if (!engine.controls.lastCameraPos) engine.controls.lastCameraPos = new THREE.Vector3();
            engine.controls.lastCameraPos.copy(engine.camera.position);

            this._bodyPos.set(engine.targetBody.x, engine.targetBody.y, engine.targetBody.z);
            const dist = engine.camera.position.distanceTo(this._bodyPos);
            if (engine.controls.autoPilotTarget && (dist < arrivalThreshold || overshot)) {
                const tgt = engine.controls.autoPilotTarget;

                // Actualizar la velocidad base para igualar SIEMPRE la de traslación del planeta
                if (tgt.orbitRadius && tgt.orbitSpeed) {
                    const translationLinearSpeed = Math.abs(tgt.orbitSpeed * tgt.orbitRadius);
                    engine.controls.speed = translationLinearSpeed;
                }

                engine.controls.autoLookTarget = engine.controls.autoPilotTarget;
                engine.controls.setAutoPilotTarget(null);
                // No seteamos velocity a 0 aquí; el estado autoLook inyectará físicamente la inercia orbital y traslacional.

                EventManager.emit(EVENTS.OSD_MESSAGE, { message: `Destino ${engine.targetBody.name} alcanzado. Inserción orbital completa`, type: 'success', duration: 5000 });
            }
        }

        // Comprobar proximidad para aterrizar en cualquier cuerpo cercano (incluso sin Lock)
        let closestLandingBody = null;
        let minLandingDist = Infinity;
        let isGasGiant = false;

        if (nearbyBodies.length > 0) {
            for (const body of nearbyBodies) {
                // Filtrar estrellas (usando group) y agujeros negros, pero dejar gaseosos para advertir
                if (body.group === 'Estrella' || (body.type && body.type.includes('Agujero Negro'))) continue;

                this._bodyPos.set(body.x, body.y, body.z);
                const dist = engine.camera.position.distanceTo(this._bodyPos);
                const threshold = Math.max(body.radius * 5.0, body.radius + 3000);

                if (dist < threshold && dist < minLandingDist) {
                    closestLandingBody = body;
                    minLandingDist = dist;
                    const biome = Config.PLANET_BIOMES[body.type] || Config.PLANET_BIOMES['Planeta rocoso'];
                    isGasGiant = biome.isGasGiant === true;
                }
            }
        }

        // Actualizar posición del marcador de aterrizaje si existe
        if (engine.landingMarker && engine.interactionSystem.landingMarkerMesh) {
            const marker = engine.landingMarker;
            // Buscar el planeta al que pertenece el marcador en nearbyBodies
            const planet = nearbyBodies.find(b => b.name === marker.planetName);
            if (planet) {
                const rotY = planet.rotationY || 0;
                // La longitud estática original rotada en el espacio = marker.lon - rotY (porque el modelo rota y el punto gira)
                const currentLon = marker.lon - rotY;

                const localX = Math.cos(marker.lat) * Math.cos(currentLon) * planet.radius;
                const localY = Math.sin(marker.lat) * planet.radius;
                const localZ = Math.cos(marker.lat) * Math.sin(currentLon) * planet.radius;
                this._localPoint.set(localX, localY, localZ);

                this._normal.copy(this._localPoint).normalize();
                this._bodyPos.set(planet.x, planet.y, planet.z);
                engine.interactionSystem.landingMarkerMesh.position.copy(this._localPoint).add(this._bodyPos);
                engine.interactionSystem.landingMarkerMesh.quaternion.setFromUnitVectors(this._zAxis, this._normal);
            }
        }

        if (closestLandingBody && !engine.controls.autoPilotTarget) {
            // Comparar por nombre ya que lastNearby regenera los objetos cada frame
            if (!engine.currentOrbitBody || engine.currentOrbitBody.name !== closestLandingBody.name) {
                engine.currentOrbitBody = closestLandingBody;
                if (isGasGiant) {
                    EventManager.emit(EVENTS.OSD_MESSAGE, { message: `Órbita inestable en ${closestLandingBody.name}: Superficie no sólida`, type: 'error', duration: 0 });
                } else {
                    EventManager.emit(EVENTS.OSD_MESSAGE, { message: `Órbita estable en ${closestLandingBody.name}`, type: 'info', duration: 0 });
                }
            }
            if (!isGasGiant) engine.landingTarget = closestLandingBody;
        } else {
            if (engine.currentOrbitBody) {
                EventManager.emit(EVENTS.OSD_HIDE);
            }
            engine.currentOrbitBody = null;
            engine.landingTarget = null;
        }
    }

    exit() {
        // Limpieza al salir
    }
}
