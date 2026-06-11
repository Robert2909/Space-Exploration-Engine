import * as THREE from 'three';
import { GameState } from '../GameState.js';
import { EventManager, EVENTS } from '../EventManager.js';
import { Config } from '../Config.js';
import { OSDManager } from '../../ui/OSDManager.js'; // Solo importamos para OSDManager genérico si es necesario, o EventManager

export class SpaceState extends GameState {
    constructor(engine) {
        super(engine);
    }

    enter(payload) {
        this.engine.gameState = 'SPACE';
        // Payload puede contener la velocidad conservada del despegue, etc.
    }

    update(dt) {
        const engine = this.engine;
        
        engine.controls.update(dt);
        const pos = engine.camera.position;

        engine.universe.update(pos.x, pos.y, pos.z, dt);
        engine.lighting.update(engine.camera.position, engine.universe);

        engine.ui.updateHUD(engine.controls.velocity.length(), pos);
        engine.ui.updateLabels(engine.universe);

        engine.landingTarget = null;

        if (engine.targetBody) {
            // Actualizar la referencia del objetivo en cada frame porque los planetas se mueven
            const freshBody = engine.ui.lastNearby.find(b => b.name === engine.targetBody.name);
            if (freshBody) {
                engine.targetBody = freshBody;
                if (engine.controls.autoPilotTarget) {
                    engine.controls.autoPilotTarget = freshBody;
                }
                if (engine.controls.autoLookTarget) {
                    engine.controls.autoLookTarget = freshBody;
                }
            }

            engine.updateTargetHUD(engine.targetBody);

            // Umbral de llegada relativo al tamaño del cuerpo (cinemático)
            const arrivalThreshold = Math.max(engine.targetBody.radius * Config.AUTOPILOT_ARRIVAL_MULT, engine.targetBody.radius + 30);

            // Detección de Overshoot (Tunneling de físicas): Si nos pasamos de largo por lag o velocidad excesiva
            let overshot = false;
            if (engine.controls.autoPilotTarget && engine.controls.lastCameraPos) {
                // Matemáticamente perfecto: ¿El segmento de línea del último frame al actual cruza el umbral de llegada?
                const A = engine.controls.lastCameraPos;
                const B = engine.camera.position;
                const C = new THREE.Vector3(engine.targetBody.x, engine.targetBody.y, engine.targetBody.z);

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
            if (!engine.controls.lastCameraPos) engine.controls.lastCameraPos = new THREE.Vector3();
            engine.controls.lastCameraPos.copy(engine.camera.position);

            const dist = engine.camera.position.distanceTo(new THREE.Vector3(engine.targetBody.x, engine.targetBody.y, engine.targetBody.z));
            if (engine.controls.autoPilotTarget && (dist < arrivalThreshold || overshot)) {
                engine.controls.autoLookTarget = engine.controls.autoPilotTarget;
                engine.controls.autoPilotTarget = null;
                engine.controls.velocity.set(0, 0, 0); // Freno perfecto absoluto
                EventManager.emit(EVENTS.OSD_MESSAGE, { message: `Destination reached: ${engine.targetBody.name}. Orbital insertion complete`, type: 'success', duration: 5000 });
            }
        }

        // Comprobar proximidad para aterrizar en cualquier cuerpo cercano (incluso sin Lock)
        let closestLandingBody = null;
        let minLandingDist = Infinity;
        let isGasGiant = false;

        if (engine.ui.lastNearby && engine.ui.lastNearby.length > 0) {
            for (const body of engine.ui.lastNearby) {
                // Filtrar estrellas (usando group) y agujeros negros, pero dejar gaseosos para advertir
                if (body.group === 'Estrella' || (body.type && body.type.includes('Black Hole'))) continue;

                const dist = engine.camera.position.distanceTo(new THREE.Vector3(body.x, body.y, body.z));
                const threshold = Math.max(body.radius * 5.0, body.radius + 3000);

                if (dist < threshold && dist < minLandingDist) {
                    closestLandingBody = body;
                    minLandingDist = dist;
                    isGasGiant = body.type.includes('Gas');
                }
            }
        }

        if (closestLandingBody && !engine.controls.autoPilotTarget) {
            // Comparar por nombre ya que lastNearby regenera los objetos cada frame
            if (!engine.currentOrbitBody || engine.currentOrbitBody.name !== closestLandingBody.name) {
                engine.currentOrbitBody = closestLandingBody;
                if (isGasGiant) {
                    EventManager.emit(EVENTS.OSD_MESSAGE, { message: `Órbita en ${closestLandingBody.name}: Superficie no sólida (Inhóspito)`, type: 'error', duration: 0 });
                } else {
                    EventManager.emit(EVENTS.OSD_MESSAGE, { message: `Órbita estable en ${closestLandingBody.name} [ENTER] Aterrizar`, type: 'info', duration: 0 });
                }
            }
            if (!isGasGiant) engine.landingTarget = closestLandingBody;
        } else {
            if (engine.currentOrbitBody) {
                // Removemos hide directo por un emit vacio temporal si necesitamos, o asumimos que OSD se limpia
                // Para 100% Cero Regresión llamamos OSDManager.hide() solo aquí como excepcion si es estrictamente necesario
                OSDManager.hide();
            }
            engine.currentOrbitBody = null;
            engine.landingTarget = null;
        }
    }

    exit() {
        // Limpieza al salir
    }
}
