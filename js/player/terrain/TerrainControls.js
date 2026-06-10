import * as THREE from 'three';
import { Config } from '../../core/Config.js';

export class TerrainControls {
    constructor(camera, domElement) {
        this.camera = camera;
        this.domElement = domElement;
        
        this.velocity = new THREE.Vector3();
        this.direction = new THREE.Vector3();
        this.euler = new THREE.Euler(0, 0, 0, 'YXZ');
        
        this.isLocked = false;
        
        this.keys = {
            forward: false,
            backward: false,
            left: false,
            right: false,
            jump: false
        };
        
        this.speed = 50; // Unidades por segundo a pie
        this.jetpackBoost = 200;
        
        this._onClick = () => {
            if (!this.isLocked) {
                const promise = this.domElement.requestPointerLock();
                if (promise) promise.catch(e => console.warn("PointerLock:", e));
            }
        };
        this._onPointerLockChange = () => {
            this.isLocked = document.pointerLockElement === this.domElement;
        };
        this._onMouseMove = (e) => {
            if (!this.isLocked) return;
            this.euler.y -= e.movementX * Config.MOUSE_SENSITIVITY;
            this.euler.x -= e.movementY * Config.MOUSE_SENSITIVITY;
            this.euler.x = Math.max(-Math.PI/2, Math.min(Math.PI/2, this.euler.x));
            this.camera.quaternion.setFromEuler(this.euler);
        };
        this._onKeyDown = (e) => this.onKey(e, true);
        this._onKeyUp = (e) => this.onKey(e, false);
        
        this.domElement.addEventListener('click', this._onClick);
        document.addEventListener('pointerlockchange', this._onPointerLockChange);
        document.addEventListener('mousemove', this._onMouseMove);
        document.addEventListener('keydown', this._onKeyDown);
        document.addEventListener('keyup', this._onKeyUp);
    }
    
    onKey(e, isDown) {
        if (Config.KEYS.FORWARD.includes(e.code)) this.keys.forward = isDown;
        if (Config.KEYS.BACKWARD.includes(e.code)) this.keys.backward = isDown;
        if (Config.KEYS.LEFT.includes(e.code)) this.keys.left = isDown;
        if (Config.KEYS.RIGHT.includes(e.code)) this.keys.right = isDown;
        if (Config.KEYS.BRAKE.includes(e.code)) this.keys.jump = isDown; // Spacebar to jetpack
    }
    
    update(dt) {
        if (!this.isLocked) return;
        
        this.direction.z = Number(this.keys.forward) - Number(this.keys.backward);
        this.direction.x = Number(this.keys.right) - Number(this.keys.left);
        this.direction.normalize();
        
        // Movimiento relativo a donde mira la cámara en Y (FPS mode)
        const moveVector = new THREE.Vector3(this.direction.x, 0, -this.direction.z);
        moveVector.applyQuaternion(new THREE.Quaternion().setFromEuler(new THREE.Euler(0, this.euler.y, 0)));
        
        this.velocity.x = moveVector.x * this.speed;
        this.velocity.z = moveVector.z * this.speed;
        
        // Gravedad y Jetpack
        if (this.keys.jump) {
            this.velocity.y = this.jetpackBoost; // Ascender
        } else {
            this.velocity.y -= 300 * dt; // Gravedad cayendo
        }
        
        this.camera.position.addScaledVector(this.velocity, dt);
        
        // Suelo duro temporal en Y = 2 (altura humana)
        if (this.camera.position.y < 2) {
            this.camera.position.y = 2;
            this.velocity.y = 0;
        }
    }
    
    dispose() {
        this.domElement.removeEventListener('click', this._onClick);
        document.removeEventListener('pointerlockchange', this._onPointerLockChange);
        document.removeEventListener('mousemove', this._onMouseMove);
        document.removeEventListener('keydown', this._onKeyDown);
        document.removeEventListener('keyup', this._onKeyUp);
    }
}
