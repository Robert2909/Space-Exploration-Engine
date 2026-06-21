import * as THREE from 'three';
import { Config } from '../../core/Config.js';
import { OSDManager } from '../../ui/OSDManager.js';
import { EventManager, EVENTS } from '../../core/EventManager.js';

export class SpaceControls {
    constructor(camera, domElement) {
        this.camera = camera;
        this.domElement = domElement;
        this.isLocked = false;

        this.velocity = new THREE.Vector3();
        this.cameraVelocity = new THREE.Vector2(); // Inercia del ratón
        this.currentRollSpeed = 0; // Inercia del alabeo
        this.cinematicMode = false;

        // Object Pooling para evitar Garbage Collection
        this._targetPos = new THREE.Vector3();
        this._matrix = new THREE.Matrix4();
        this._targetQuat = new THREE.Quaternion();
        this._dir = new THREE.Vector3();
        this._localDir = new THREE.Vector3();
        this._offset = new THREE.Vector3();
        this._yAxis = new THREE.Vector3(0, 1, 0);
        this._direction = new THREE.Vector3();
        this._camInverseQuat = new THREE.Quaternion();

        this.camera.rotation.set(0, 0, 0);

        this.speed = Config.PLAYER_SPEED;
        this.boostMultiplier = Config.PLAYER_BOOST_MULTIPLIER;
        this.friction = Config.PLAYER_FRICTION;

        this.keys = { w: false, a: false, s: false, d: false, q: false, e: false, shift: false, space: false };

        this.initEvents();
    }

    setAutoPilotTarget(target, retainState = false) {
        this.autoPilotTarget = target;
        if (target) {
            this.lastManualCameraMoveTime = 0;
            if (!retainState) this.autoPilotState = 'ALIGNING';
            this.autoLookTarget = null;
            this.lastAutoLookPos = null;
        } else {
            this.autoPilotState = 'NONE';
        }
    }

    initEvents() {
        this._onPointerLockChange = () => {
            this.isLocked = document.pointerLockElement === this.domElement;
        };
        this._onClick = (e) => {
            if (e && e.target && e.target.closest('#ui-layer')) return;
            if (!this.isLocked) {
                const promise = this.domElement.requestPointerLock();
                if (promise) promise.catch(e => console.warn("PointerLock:", e));
            }
        };
        this._onMouseMove = (e) => {
            if (!this.isLocked) return;
            const movementX = e.movementX || 0;
            const movementY = e.movementY || 0;

            if (Math.abs(movementX) > 100 || Math.abs(movementY) > 100) return;

            if (Math.abs(movementX) > 0 || Math.abs(movementY) > 0) {
                this.lastManualCameraMoveTime = performance.now();
                if (this.autoLookTarget) {
                    this.autoLookTarget = null;
                    this.lastAutoLookPos = null;
                }
            }

            if (this.cinematicMode) {
                this.cameraVelocity.x += movementX * Config.CINEMATIC_CAMERA_SENSITIVITY;
                this.cameraVelocity.y += movementY * Config.CINEMATIC_CAMERA_SENSITIVITY;
            } else {
                this.camera.rotateY(-movementX * Config.MOUSE_SENSITIVITY);
                this.camera.rotateX(-movementY * Config.MOUSE_SENSITIVITY);
            }
        };
        this._onKeyDown = (e) => this.onKey(e, true);
        this._onKeyUp = (e) => this.onKey(e, false);
        this._onWheel = (e) => {
            if (!this.isLocked) return;

            if (e.deltaY < 0) {
                this.speed = this.speed === 0 ? Config.PLAYER_SPEED_MIN_STEP : this.speed * Config.PLAYER_SPEED_SCROLL_MULT;
                this.speed = Math.min(this.speed, Config.PLAYER_SPEED_MAX);
            } else if (e.deltaY > 0) {
                this.speed = this.speed / Config.PLAYER_SPEED_SCROLL_MULT;
                if (this.speed < Config.PLAYER_SPEED_MIN_STEP) this.speed = 0;
            }

            EventManager.emit(EVENTS.OSD_MESSAGE, { message: `Velocidad base: ${Math.round(this.speed)} u/s`, type: 'info', duration: 1000 });
        };

        document.addEventListener('pointerlockchange', this._onPointerLockChange);
        this.domElement.addEventListener('click', this._onClick);
        document.addEventListener('mousemove', this._onMouseMove);
        document.addEventListener('keydown', this._onKeyDown);
        document.addEventListener('keyup', this._onKeyUp);
        document.addEventListener('wheel', this._onWheel);
    }

    onKey(event, isDown) {
        if (isDown && [...Config.KEYS.FORWARD, ...Config.KEYS.BACKWARD, ...Config.KEYS.LEFT, ...Config.KEYS.RIGHT, ...Config.KEYS.ROLL_LEFT, ...Config.KEYS.ROLL_RIGHT].includes(event.code)) {
            this.lastManualCameraMoveTime = performance.now();
            if (this.autoLookTarget) {
                this.autoLookTarget = null;
                this.lastAutoLookPos = null;
            }
        }

        if (Config.KEYS.FORWARD.includes(event.code)) this.keys.w = isDown;
        if (Config.KEYS.LEFT.includes(event.code)) this.keys.a = isDown;
        if (Config.KEYS.BACKWARD.includes(event.code)) this.keys.s = isDown;
        if (Config.KEYS.RIGHT.includes(event.code)) this.keys.d = isDown;
        if (Config.KEYS.ROLL_LEFT.includes(event.code)) this.keys.q = isDown;
        if (Config.KEYS.ROLL_RIGHT.includes(event.code)) this.keys.e = isDown;
        if (Config.KEYS.BOOST.includes(event.code)) this.keys.shift = isDown;
        if (Config.KEYS.BRAKE.includes(event.code)) this.keys.space = isDown;

        if (isDown && Config.KEYS.TOGGLE_CINEMATIC.includes(event.code)) {
            this.cinematicMode = !this.cinematicMode;
            if (this.cinematicMode) {
                EventManager.emit(EVENTS.OSD_MESSAGE, { message: 'Cámara fluida activada', type: 'success', duration: 2000 });
            } else {
                EventManager.emit(EVENTS.OSD_MESSAGE, { message: 'Cámara fluida desactivada', type: 'warning', duration: 2000 });
            }
        }
    }

    update(dt) {
        if (this.cinematicMode) {
            this.camera.rotateY(-this.cameraVelocity.x);
            this.camera.rotateX(-this.cameraVelocity.y);
            this.cameraVelocity.multiplyScalar(Config.CINEMATIC_CAMERA_FRICTION);
        }

        if (this.autoPilotTarget || this.autoLookTarget) {
            const tgt = this.autoPilotTarget || this.autoLookTarget;
            this._targetPos.set(tgt.x, tgt.y, tgt.z);

            this._matrix.lookAt(this.camera.position, this._targetPos, this.camera.up);
            this._targetQuat.setFromRotationMatrix(this._matrix);

            const angleToTarget = this.camera.quaternion.angleTo(this._targetQuat);
            
            let shouldAlign = true;
            if (this.autoPilotTarget && this.autoPilotState === 'TRAVELING') {
                if (performance.now() - (this.lastManualCameraMoveTime || 0) <= 1500) {
                    shouldAlign = false;
                }
            } else if (this.autoLookTarget) {
                // Auto look also shouldn't fight mouse if we decide to keep it (but it's cancelled on mouse move anyway)
            }

            if (shouldAlign) {
                this.camera.quaternion.slerp(this._targetQuat, dt * 3.0);
            }

            if (this.autoPilotTarget) {
                this._dir.subVectors(this._targetPos, this.camera.position).normalize();
                const dist = this.camera.position.distanceTo(this._targetPos);
                // Velocidad dinámica basada en la distancia para un recorrido de X segundos
                let targetSpeed = Math.max(
                    Config.AUTOPILOT_MIN_SPEED,
                    Math.min(Config.AUTOPILOT_MAX_SPEED, dist / Config.AUTOPILOT_DESIRED_SECONDS)
                );

                if (this.autoPilotState === 'ALIGNING') {
                    // Stop sideways movement and rotate first
                    this.velocity.multiplyScalar(0.95);

                    if (angleToTarget < 0.05) {
                        this.autoPilotState = 'TRAVELING';
                        EventManager.emit(EVENTS.OSD_MESSAGE, { message: 'Alineación completa. Iniciando viaje.', type: 'success', duration: 2000 });
                    } else if (performance.now() - (this.lastManualCameraMoveTime || 0) <= 500) {
                        // User decided to look around manually during alignment, skip alignment wait
                        this.autoPilotState = 'TRAVELING';
                        EventManager.emit(EVENTS.OSD_MESSAGE, { message: 'Intervención manual. Iniciando viaje.', type: 'info', duration: 2000 });
                    }
                } else if (this.autoPilotState === 'TRAVELING') {
                    // Freno de salto cuántico: calculamos exactamente la distancia de frenado
                    const brakeZone = Math.max(this.autoPilotTarget.radius * Config.AUTOPILOT_BRAKE_ZONE_MULT, 4000);

                    if (dist < brakeZone) {
                        // Frenado violento y agresivo
                        targetSpeed = this.speed;
                        if (Math.abs(this.velocity.z) > targetSpeed) {
                            this.velocity.multiplyScalar(Config.AUTOPILOT_BRAKE_MULTIPLIER); // Desaceleración brutal estilo hiperespacio
                        }
                    }

                    // Para viajar en línea recta matemáticamente perfecta (sin importar si la rotación visual va un poco atrasada)
                    // transformamos el vector direccional global a espacio local de la cámara.
                    this._camInverseQuat.copy(this.camera.quaternion).invert();
                    this._localDir.copy(this._dir).applyQuaternion(this._camInverseQuat);

                    const currentVelMag = this.velocity.length();
                    const newVelMag = THREE.MathUtils.lerp(currentVelMag, targetSpeed, dt * 5.0);
                    this.velocity.copy(this._localDir).multiplyScalar(newVelMag);
                }

                // Cancelar con freno de emergencia
                if (this.keys.space) {
                    this.setAutoPilotTarget(null);
                    this.velocity.multiplyScalar(Config.PLAYER_BRAKE_FRICTION);
                    EventManager.emit(EVENTS.OSD_MESSAGE, { message: 'Piloto automático cancelado', type: 'warning', duration: 2000 });
                }
            } else {
                // Solo autoLook: acoplar nuestra posición a la órbita del planeta y girar lentamente
                if (this.lastAutoLookPos) {
                    // 1. Compensar el desplazamiento orbital del planeta
                    const dx = this._targetPos.x - this.lastAutoLookPos.x;
                    const dy = this._targetPos.y - this.lastAutoLookPos.y;
                    const dz = this._targetPos.z - this.lastAutoLookPos.z;

                    this.camera.position.x += dx;
                    this.camera.position.y += dy;
                    this.camera.position.z += dz;

                    // 2. Girar alrededor del planeta independientemente de las interacciones
                    this._offset.subVectors(this.camera.position, this._targetPos);

                    // 3. Ajustar suavemente a la distancia orbital óptima (multiplicador * radio) con límite máximo
                    const optimalDistance = Math.min(tgt.radius * Config.AUTOPILOT_ARRIVAL_MULT, tgt.radius + Config.AUTOPILOT_MAX_ARRIVAL_DISTANCE); // Distancia fija óptima
                    const currentDistance = this._offset.length();
                    if (Math.abs(optimalDistance - currentDistance) > 1.0) {
                        const adjustSpeed = Math.max(10, currentDistance * 0.5); // Velocidad de ajuste
                        const step = (optimalDistance - currentDistance > 0 ? 1 : -1) * adjustSpeed * dt;

                        // Evitar pasarnos del objetivo
                        if (Math.abs(step) > Math.abs(optimalDistance - currentDistance)) {
                            this._offset.setLength(optimalDistance);
                        } else {
                            this._offset.setLength(currentDistance + step);
                        }
                    }

                    const orbitSpeed = Config.CINEMATIC_ORBIT_SPEED * dt;
                    this._offset.applyAxisAngle(this._yAxis, orbitSpeed);

                    this.camera.position.copy(this._targetPos).add(this._offset);
                }
                if (!this.lastAutoLookPos) this.lastAutoLookPos = new THREE.Vector3();
                this.lastAutoLookPos.copy(this._targetPos);

                // mantener frenado normal si pulsamos espacio o desaceleramos
                if (this.keys.space) {
                    this.velocity.multiplyScalar(Config.PLAYER_BRAKE_FRICTION);
                } else {
                    this.velocity.multiplyScalar(this.friction);
                }
            }
        } else {
            if (!this.isLocked) {
                this.velocity.multiplyScalar(0.95);
            } else {
                const currentSpeed = this.speed * (this.keys.shift ? this.boostMultiplier : 1);

                this._direction.set(0, 0, 0);
                this._direction.z = Number(this.keys.w) - Number(this.keys.s);
                this._direction.x = Number(this.keys.d) - Number(this.keys.a);
                this._direction.normalize();

                if (this.keys.w || this.keys.s) this.velocity.z -= this._direction.z * currentSpeed * dt;
                if (this.keys.a || this.keys.d) this.velocity.x += this._direction.x * currentSpeed * dt;
                
                const targetRoll = (Number(this.keys.q) - Number(this.keys.e)) * Config.ROLL_SPEED;
                this.currentRollSpeed += (targetRoll - this.currentRollSpeed) * dt * 5.0; // Lerp suave

                if (Math.abs(this.currentRollSpeed) > 0.001) {
                    this.camera.rotateZ(this.currentRollSpeed * dt);
                }

                if (this.keys.space) {
                    this.velocity.multiplyScalar(Config.PLAYER_BRAKE_FRICTION);
                } else {
                    this.velocity.multiplyScalar(this.friction);
                }
            }
        }

        this.camera.translateX(this.velocity.x * dt);
        this.camera.translateY(this.velocity.y * dt);
        this.camera.translateZ(this.velocity.z * dt);
    }

    getObject() {
        return this.camera;
    }

    dispose() {
        document.removeEventListener('pointerlockchange', this._onPointerLockChange);
        this.domElement.removeEventListener('click', this._onClick);
        document.removeEventListener('mousemove', this._onMouseMove);
        document.removeEventListener('keydown', this._onKeyDown);
        document.removeEventListener('keyup', this._onKeyUp);
        document.removeEventListener('wheel', this._onWheel);
    }
}
