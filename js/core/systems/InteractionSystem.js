import * as THREE from 'three';
import { EventManager, EVENTS } from '../EventManager.js';

export class InteractionSystem {
    constructor(engine) {
        this.engine = engine;
        this.raycaster = new THREE.Raycaster();
    }

    attemptTargeting() {
        this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.engine.camera);
        let closest = null;
        let closestDist = Infinity;
        
        for (let body of this.engine.ui.lastNearby || []) {
            const vec = new THREE.Vector3(body.x, body.y, body.z);
            const toBody = vec.clone().sub(this.engine.camera.position);
            if (toBody.dot(this.raycaster.ray.direction) > 0) {
                const distToRay = this.raycaster.ray.distanceSqToPoint(vec);
                const hitThreshold = Math.max(body.radius * 3, 200) ** 2;
                if (distToRay < hitThreshold && body.distSq < closestDist) {
                    closestDist = body.distSq;
                    closest = body;
                }
            }
        }

        if (closest) {
            // Si el nuevo target es igual al actual, lo deseleccionamos
            if (this.engine.targetBody && this.engine.targetBody.name === closest.name) {
                this.engine.targetBody = null;
                document.getElementById('target-panel').style.display = 'none';
                if (this.engine.controls) {
                    this.engine.controls.autoPilotTarget = null;
                    this.engine.controls.autoLookTarget = null;
                    this.engine.controls.lastAutoLookPos = null;
                }
                EventManager.emit(EVENTS.TARGET_CLEARED);
            } else {
                this.engine.targetBody = closest;
                this.engine.updateTargetHUD(closest);
                EventManager.emit(EVENTS.TARGET_CHANGED, closest);
            }
        } else {
            if (this.engine.targetBody) {
                // Click en el vacío = Deseleccionar
                this.engine.targetBody = null;
                document.getElementById('target-panel').style.display = 'none';
                if (this.engine.controls) {
                    this.engine.controls.autoPilotTarget = null;
                    this.engine.controls.autoLookTarget = null;
                    this.engine.controls.lastAutoLookPos = null;
                }
                EventManager.emit(EVENTS.TARGET_CLEARED);
            } else {
                EventManager.emit(EVENTS.OSD_MESSAGE, { message: 'No valid target in sight', type: 'error' });
            }
        }
    }
}
