import * as THREE from 'three';
import { Config } from '../core/Config.js';
import { OSDManager } from '../ui/OSDManager.js';

export class SpaceControls {
    constructor(camera, domElement) {
        this.camera = camera;
        this.domElement = domElement;
        this.isLocked = false;

        this.velocity = new THREE.Vector3();
        this.cameraVelocity = new THREE.Vector2(); // Inercia del ratón
        this.currentRollSpeed = 0; // Inercia del alabeo
        this.cinematicMode = false;

        this.camera.rotation.set(0, 0, 0);

        this.speed = Config.PLAYER_SPEED;
        this.boostMultiplier = Config.PLAYER_BOOST_MULTIPLIER;
        this.friction = Config.PLAYER_FRICTION;

        this.keys = { w: false, a: false, s: false, d: false, q: false, e: false, shift: false, space: false };

        this.initEvents();
    }

    initEvents() {
        this._onPointerLockChange = () => {
            this.isLocked = document.pointerLockElement === this.domElement;
        };
        this._onClick = () => {
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
            
            OSDManager.show(`Throttle Base Speed: ${Math.round(this.speed)} u/s`, 'info', 1000);
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
                OSDManager.show('Cinematic Camera: ENABLED', 'success', 2000);
            } else {
                OSDManager.show('Cinematic Camera: DISABLED', 'warning', 2000);
            }
        }
    }

    update(dt) {
        if (this.cinematicMode) {
            this.camera.rotateY(-this.cameraVelocity.x);
            this.camera.rotateX(-this.cameraVelocity.y);
            this.cameraVelocity.multiplyScalar(Config.CINEMATIC_CAMERA_FRICTION);
        }

        if (!this.isLocked) {
            this.velocity.multiplyScalar(0.95);
        } else if (this.autoPilotTarget || this.autoLookTarget) {
            const tgt = this.autoPilotTarget || this.autoLookTarget;
            const targetPos = new THREE.Vector3(tgt.x, tgt.y, tgt.z);

            const matrix = new THREE.Matrix4().lookAt(this.camera.position, targetPos, this.camera.up);
            const targetQuat = new THREE.Quaternion().setFromRotationMatrix(matrix);
            this.camera.quaternion.slerp(targetQuat, dt * 3.0);

            if (this.autoPilotTarget) {
                const dir = new THREE.Vector3().subVectors(targetPos, this.camera.position).normalize();

                let targetSpeed = this.speed * this.boostMultiplier * 3.0;
                const dist = this.camera.position.distanceTo(targetPos);

                // Freno de salto cuántico: calculamos exactamente la distancia de frenado
                const brakeZone = Math.max(this.autoPilotTarget.radius * Config.AUTOPILOT_BRAKE_ZONE_MULT, 4000);

                if (dist < brakeZone) {
                    // Frenado violento y agresivo
                    targetSpeed = this.speed;
                    if (this.velocity.length() > targetSpeed) {
                        this.velocity.multiplyScalar(Config.AUTOPILOT_BRAKE_MULTIPLIER); // Desaceleración brutal estilo hiperespacio
                    }
                }

                this.velocity.lerp(dir.multiplyScalar(targetSpeed), dt * 5.0);

                // Cancelar con freno de emergencia
                if (this.keys.space) {
                    this.autoPilotTarget = null;
                    this.lastAutoLookPos = null;
                    this.velocity.multiplyScalar(Config.PLAYER_BRAKE_FRICTION);
                }
            } else {
                // Solo autoLook: acoplar nuestra posición a la órbita del planeta y girar lentamente
                if (this.lastAutoLookPos) {
                    // 1. Compensar el desplazamiento orbital del planeta
                    const dx = targetPos.x - this.lastAutoLookPos.x;
                    const dy = targetPos.y - this.lastAutoLookPos.y;
                    const dz = targetPos.z - this.lastAutoLookPos.z;

                    this.camera.position.x += dx;
                    this.camera.position.y += dy;
                    this.camera.position.z += dz;

                    // 2. Girar alrededor del planeta independientemente de las interacciones
                    const offset = new THREE.Vector3().subVectors(this.camera.position, targetPos);
                    
                    // 3. Ajustar suavemente a la distancia orbital óptima (multiplicador * radio)
                    const optimalDistance = tgt.radius * 3.0; // Distancia fija óptima
                    const currentDistance = offset.length();
                    if (Math.abs(optimalDistance - currentDistance) > 1.0) {
                        const adjustSpeed = Math.max(10, currentDistance * 0.5); // Velocidad de ajuste
                        const step = (optimalDistance - currentDistance > 0 ? 1 : -1) * adjustSpeed * dt;
                        
                        // Evitar pasarnos del objetivo
                        if (Math.abs(step) > Math.abs(optimalDistance - currentDistance)) {
                            offset.setLength(optimalDistance);
                        } else {
                            offset.setLength(currentDistance + step);
                        }
                    }

                    const orbitSpeed = Config.CINEMATIC_ORBIT_SPEED * dt;
                    offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), orbitSpeed);

                    this.camera.position.copy(targetPos).add(offset);
                }
                this.lastAutoLookPos = targetPos.clone();

                // mantener frenado normal si pulsamos espacio o desaceleramos
                if (this.keys.space) {
                    this.velocity.multiplyScalar(Config.PLAYER_BRAKE_FRICTION);
                } else {
                    this.velocity.multiplyScalar(this.friction);
                }
            }
        } else {
            const currentSpeed = this.speed * (this.keys.shift ? this.boostMultiplier : 1);

            const direction = new THREE.Vector3();
            direction.z = Number(this.keys.w) - Number(this.keys.s);
            direction.x = Number(this.keys.d) - Number(this.keys.a);
            direction.normalize();

            if (this.keys.w || this.keys.s) this.velocity.z -= direction.z * currentSpeed * dt;
            if (this.keys.a || this.keys.d) this.velocity.x += direction.x * currentSpeed * dt;

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
