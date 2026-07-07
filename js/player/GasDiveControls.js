import * as THREE from 'three';
import { Config } from '../core/Config.js';
import { EventManager, EVENTS } from '../core/EventManager.js';

export class GasDiveControls {
    constructor(camera, domElement) {
        this.camera = camera;
        this.domElement = domElement;
        this.isLocked = false;

        this.velocity = new THREE.Vector3();
        this.cameraVelocity = new THREE.Vector2(); 
        this.currentRollSpeed = 0; 
        
        // Físicas GasDive
        this.drag = 0.95; 
        this.gravity = 50;
        this.windForce = new THREE.Vector3();
        
        // Controles de velocidad (usando Config según Arquitectura)
        this.targetSpeed = Config.GASDIVE_SPEED_BASE;
        this.minSpeed = Config.GASDIVE_SPEED_MIN_STEP;
        this.maxSpeedLimit = Config.GASDIVE_SPEED_MAX;
        this.boostMultiplier = Config.GASDIVE_BOOST_MULTIPLIER;

        this.keys = {
            forward: false, backward: false, left: false, right: false,
            up: false, down: false, rollLeft: false, rollRight: false,
            boost: false, brake: false
        };

        this._dir = new THREE.Vector3();
        this._localDir = new THREE.Vector3();

        this.initEvents();
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
        this.cinematicMode = false;
        
        this._onMouseMove = (e) => {
            if (!this.isLocked) return;
            const movementX = e.movementX || 0;
            const movementY = e.movementY || 0;
            if (Math.abs(movementX) > 100 || Math.abs(movementY) > 100) return;

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
            const delta = -Math.sign(e.deltaY);
            if (delta > 0) {
                this.targetSpeed = Math.min(this.maxSpeedLimit, this.targetSpeed * Config.GASDIVE_SPEED_SCROLL_MULT);
            } else {
                this.targetSpeed = Math.max(this.minSpeed, this.targetSpeed / Config.GASDIVE_SPEED_SCROLL_MULT);
            }
            // Emitir evento OSD de acuerdo a la Arquitectura
            const speedPct = Math.round((this.targetSpeed / this.maxSpeedLimit) * 100);
            EventManager.emit(EVENTS.OSD_MESSAGE, { message: `Velocidad Objetivo: ${speedPct}%`, type: 'info' });
        };
        
        document.addEventListener('pointerlockchange', this._onPointerLockChange);
        this.domElement.addEventListener('click', this._onClick);
        document.addEventListener('mousemove', this._onMouseMove);
        document.addEventListener('keydown', this._onKeyDown);
        document.addEventListener('keyup', this._onKeyUp);
        document.addEventListener('wheel', this._onWheel, { passive: true });
    }

    onKey(event, isDown) {
        if (Config.KEYS.FORWARD.includes(event.code)) this.keys.forward = isDown;
        if (Config.KEYS.BACKWARD.includes(event.code)) this.keys.backward = isDown;
        if (Config.KEYS.LEFT.includes(event.code)) this.keys.left = isDown;
        if (Config.KEYS.RIGHT.includes(event.code)) this.keys.right = isDown;
        if (Config.KEYS.ROLL_LEFT.includes(event.code)) this.keys.rollLeft = isDown;
        if (Config.KEYS.ROLL_RIGHT.includes(event.code)) this.keys.rollRight = isDown;
        if (Config.KEYS.BOOST.includes(event.code)) this.keys.boost = isDown;
        if (Config.KEYS.BRAKE.includes(event.code)) this.keys.brake = isDown;

        if (isDown && Config.KEYS.TOGGLE_CINEMATIC.includes(event.code)) {
            this.cinematicMode = !this.cinematicMode;
        }
    }

    update(dt) {
        if (!this.isLocked) {
            this.velocity.multiplyScalar(Math.pow(this.drag, dt * 60));
            this.velocity.y -= this.gravity * dt;
            this.camera.position.addScaledVector(this.velocity, dt);
            return;
        }

        if (this.cinematicMode) {
            this.camera.rotateY(-this.cameraVelocity.x);
            this.camera.rotateX(-this.cameraVelocity.y);
            this.cameraVelocity.multiplyScalar(Config.CINEMATIC_CAMERA_FRICTION);
        }

        let targetRollSpeed = 0;
        if (this.keys.rollLeft) targetRollSpeed = 1.0;
        if (this.keys.rollRight) targetRollSpeed = -1.0;
        this.currentRollSpeed += (targetRollSpeed - this.currentRollSpeed) * 5 * dt;
        this.camera.rotateZ(this.currentRollSpeed * dt);

        this._localDir.set(0, 0, 0);
        if (this.keys.forward) this._localDir.z -= 1;
        if (this.keys.backward) this._localDir.z += 1;
        if (this.keys.left) this._localDir.x -= 1;
        if (this.keys.right) this._localDir.x += 1;
        if (this.keys.up) this._localDir.y += 1;
        if (this.keys.down) this._localDir.y -= 1;

        if (this._localDir.lengthSq() > 0) {
            this._localDir.normalize();
        }

        this._dir.copy(this._localDir);
        this._dir.applyQuaternion(this.camera.quaternion);

        let accel = this.targetSpeed * 0.5; 
        if (this.keys.boost) accel *= this.boostMultiplier;

        if (this.keys.brake) {
            this.velocity.multiplyScalar(Math.pow(0.5, dt * 60)); 
        } else {
            this.velocity.addScaledVector(this._dir, accel * dt);
        }

        this.velocity.y -= this.gravity * dt;
        this.velocity.addScaledVector(this.windForce, dt);

        this.velocity.multiplyScalar(Math.pow(this.drag, dt * 60));

        let currentMax = this.targetSpeed;
        if (this.keys.boost) currentMax *= this.boostMultiplier;

        if (this.velocity.length() > currentMax) {
            this.velocity.setLength(currentMax);
        }

        this.camera.position.addScaledVector(this.velocity, dt);
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


