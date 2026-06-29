import * as THREE from 'three';
import { Config } from '../../core/Config.js';
import { OSDManager } from '../../ui/OSDManager.js';
import { EventManager, EVENTS } from '../../core/EventManager.js';
import { MeasurementSystem } from '../../core/systems/MeasurementSystem.js';

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
            if (!retainState) {
                this.lastManualCameraMoveTime = 0;
                this.autoPilotState = 'ALIGNING';
                this._notifiedFinalApproach = false;
            }
            this.autoLookTarget = null;
            this.lastAutoLookPos = null;
        } else {
            this.autoPilotState = 'NONE';
            this._notifiedFinalApproach = false;
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
                // Nota: autoLookTarget YA NO se cancela al mover el mouse, 
                // permitiendo mirar libremente mientras orbitamos.
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

            EventManager.emit(EVENTS.OSD_MESSAGE, { message: `Velocidad base fijada: ${MeasurementSystem.formatSpeed(this.speed)}`, type: 'info', duration: 1000 });
        };

        document.addEventListener('pointerlockchange', this._onPointerLockChange);
        this.domElement.addEventListener('click', this._onClick);
        document.addEventListener('mousemove', this._onMouseMove);
        document.addEventListener('keydown', this._onKeyDown);
        document.addEventListener('keyup', this._onKeyUp);
        document.addEventListener('wheel', this._onWheel);
    }

    onKey(event, isDown) {
        if (isDown && [...Config.KEYS.FORWARD, ...Config.KEYS.BACKWARD, ...Config.KEYS.LEFT, ...Config.KEYS.RIGHT, ...Config.KEYS.ROLL_LEFT, ...Config.KEYS.ROLL_RIGHT, ...Config.KEYS.BRAKE].includes(event.code)) {
            this.lastManualCameraMoveTime = performance.now();
            if (this.autoLookTarget) {
                this.autoLookTarget = null;
                this.lastAutoLookPos = null;
                EventManager.emit(EVENTS.OSD_MESSAGE, { message: 'Órbita abandonada', type: 'warning', duration: 2000 });
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
                const distToTarget = this.camera.position.distanceTo(this._targetPos);
                const optimalOrbit = this.autoPilotTarget.radius * Config.AUTOPILOT_ARRIVAL_MULT;

                // Umbral de bloqueo: 15x la órbita, o al menos 2 segundos de viaje a máxima velocidad
                const lockDistance = Math.max(optimalOrbit * Config.AUTOPILOT_APPROACH_LOCK_MULT, Config.PLAYER_SPEED_MAX * 2);

                if (distToTarget < lockDistance) {
                    if (!this._notifiedFinalApproach) {
                        this._notifiedFinalApproach = true;
                        EventManager.emit(EVENTS.OSD_MESSAGE, { message: 'Aproximación final. Cámara fijada al objetivo.', type: 'warning', duration: 3000 });
                    }
                    shouldAlign = true;
                    // Bloqueo total: nulificamos el input del mouse para que la cámara no pelee
                    this.cameraVelocity.set(0, 0);
                } else {
                    // Tiempo de inactividad flexible para mirar alrededor (usando Config)
                    if (performance.now() - (this.lastManualCameraMoveTime || 0) <= Config.AUTOPILOT_FREELOOK_TIMEOUT) {
                        shouldAlign = false;
                    }
                }
            } else if (this.autoLookTarget) {
                // Permite mirar libremente durante unos segundos, luego re-enfoca suavemente
                if (performance.now() - (this.lastManualCameraMoveTime || 0) <= Config.AUTOPILOT_FREELOOK_TIMEOUT) {
                    shouldAlign = false;
                }
            }

            if (shouldAlign) {
                this.camera.quaternion.slerp(this._targetQuat, dt * 3.0);
            }

            if (this.autoPilotTarget) {
                this._dir.subVectors(this._targetPos, this.camera.position).normalize();
                const dist = this.camera.position.distanceTo(this._targetPos);
                const optimalDistance = this.autoPilotTarget.radius * Config.AUTOPILOT_ARRIVAL_MULT;
                const distToOrbit = Math.max(1, dist - optimalDistance);

                // Curva de frenado cinemático tipo SpaceEngine
                const approachPace = distToOrbit * 1.5; // Relación de velocidad a distancia restante

                let targetSpeed;
                // Min cruise speed can just be a small base
                const minCruiseSpeed = Config.AUTOPILOT_MIN_SPEED || Config.PLAYER_SPEED_MAX; 
                
                // El piloto automático usa su PROPIA velocidad máxima independiente.
                // Pero si usamos el hiperimpulsor (Shift), multiplicamos esa velocidad.
                const currentCruiseLimit = Config.AUTOPILOT_MAX_SPEED * (this.keys.shift ? Config.PLAYER_BOOST_MULTIPLIER : 1);

                if (distToOrbit > minCruiseSpeed) {
                    // Fase de crucero: Mantener velocidad alta
                    targetSpeed = Math.max(minCruiseSpeed, approachPace);
                    targetSpeed = Math.min(currentCruiseLimit, targetSpeed);
                } else {
                    // Fase final (Braking): Ceder totalmente a la curva para evitar overshoot
                    targetSpeed = approachPace;
                }
                // Velocidad base de traslación del planeta para igualarla y no quedarnos atrás
                let planetSpeed = 0;
                if (this.autoPilotTarget.orbitSpeed && this.autoPilotTarget.orbitRadius) {
                    planetSpeed = Math.abs(this.autoPilotTarget.orbitSpeed * this.autoPilotTarget.orbitRadius);
                }

                // Sumar la velocidad base (traslación del planeta) para que nuestro targetSpeed 
                // sea nuestra velocidad DE ACERCAMIENTO real, no la velocidad absoluta.
                // Math.max(10, ...) garantiza que rompemos la asíntota matemática y cruzamos la meta.
                targetSpeed = planetSpeed + Math.max(10, targetSpeed);

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
                    // Dirección matemática hacia el objetivo
                    this._camInverseQuat.copy(this.camera.quaternion).invert();
                    this._localDir.copy(this._dir).applyQuaternion(this._camInverseQuat);

                    const currentVelMag = this.velocity.length();

                    let newVelMag;
                    if (currentVelMag > targetSpeed) {
                        // Desaceleración estricta y rápida para no saltarnos la curva de frenado
                        newVelMag = THREE.MathUtils.lerp(currentVelMag, targetSpeed, dt * 15.0);
                    } else {
                        // Aceleración lineal cinemática (Fuerza G constante)
                        // Calculamos la aceleración para alcanzar la velocidad crucero en aprox 3.5 segundos
                        const accelRate = Math.max(1000, targetSpeed / 3.5);
                        newVelMag = currentVelMag + (accelRate * dt);
                        if (newVelMag > targetSpeed) newVelMag = targetSpeed;
                    }

                    this.velocity.copy(this._localDir).multiplyScalar(newVelMag);
                }

                // Cancelar con freno de emergencia
                if (this.keys.space) {
                    this.setAutoPilotTarget(null);
                    this.velocity.multiplyScalar(Config.PLAYER_BRAKE_FRICTION);
                    EventManager.emit(EVENTS.OSD_MESSAGE, { message: 'Piloto automático cancelado', type: 'warning', duration: 2000 });
                }
            } else {
                // Solo autoLook: orbitar el planeta aplicando VELOCIDAD REAL a la cámara
                if (this.lastAutoLookPos) {
                    // 1. Vector desde el objetivo anterior a nuestra cámara
                    this._offset.subVectors(this.camera.position, this.lastAutoLookPos);

                    // 2. Ajustar suavemente a la distancia orbital óptima
                    const optimalDistance = tgt.radius * Config.AUTOPILOT_ARRIVAL_MULT;
                    const currentDistance = this._offset.length();

                    if (Math.abs(optimalDistance - currentDistance) > 1.0) {
                        const adjustSpeed = Math.max(10, currentDistance * 0.5);
                        const step = (optimalDistance - currentDistance > 0 ? 1 : -1) * adjustSpeed * dt;

                        if (Math.abs(step) > Math.abs(optimalDistance - currentDistance)) {
                            this._offset.setLength(optimalDistance);
                        } else {
                            this._offset.setLength(currentDistance + step);
                        }
                    }

                    // 3. Rotación angular limitada
                    let orbitAngularSpeed = Config.CINEMATIC_ORBIT_SPEED;
                    const maxLinearSpeed = Config.PLAYER_SPEED_MAX; // Limitado a la velocidad top de la nave
                    if (orbitAngularSpeed * currentDistance > maxLinearSpeed) {
                        orbitAngularSpeed = maxLinearSpeed / currentDistance;
                    }
                    this._offset.applyAxisAngle(this._yAxis, orbitAngularSpeed * dt);

                    // 4. Posición deseada global (Centro actual del planeta + nuestro offset orbital)
                    const desiredGlobalPos = this._targetPos.clone().add(this._offset);

                    // 5. Convertir a un vector de velocidad local para inyectarlo en las físicas
                    if (dt > 0) {
                        const requiredGlobalVelocity = desiredGlobalPos.sub(this.camera.position).divideScalar(dt);
                        this._camInverseQuat.copy(this.camera.quaternion).invert();
                        this.velocity.copy(requiredGlobalVelocity).applyQuaternion(this._camInverseQuat);
                    }
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

                const targetVelZ = this._direction.z * currentSpeed;
                const targetVelX = this._direction.x * currentSpeed;

                // Aceleración independiente del framerate usando decaimiento exponencial
                const accelRate = 5.0; // Velocidad de aceleración/desaceleración
                const t = 1.0 - Math.exp(-accelRate * dt);

                this.velocity.z = THREE.MathUtils.lerp(this.velocity.z, targetVelZ === 0 ? 0 : -targetVelZ, t);
                this.velocity.x = THREE.MathUtils.lerp(this.velocity.x, targetVelX, t);

                const targetRoll = (Number(this.keys.q) - Number(this.keys.e)) * Config.ROLL_SPEED;
                this.currentRollSpeed += (targetRoll - this.currentRollSpeed) * dt * 5.0; // Lerp suave

                if (Math.abs(this.currentRollSpeed) > 0.001) {
                    this.camera.rotateZ(this.currentRollSpeed * dt);
                }

                if (this.keys.space) {
                    this.velocity.multiplyScalar(Math.pow(Config.PLAYER_BRAKE_FRICTION, dt * 60));
                }

                // Fricción solo aplica si no estamos acelerando en ese eje
                if (!this.keys.w && !this.keys.s) this.velocity.z *= Math.pow(this.friction, dt * 60);
                if (!this.keys.a && !this.keys.d) this.velocity.x *= Math.pow(this.friction, dt * 60);
                this.velocity.y *= Math.pow(this.friction, dt * 60);
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
