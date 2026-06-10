import * as THREE from 'three';
import { Config } from '../../core/Config.js';

export class TerrainControls {
    constructor(camera, domElement, getGroundHeight) {
        this.camera = camera;
        this.domElement = domElement;
        this.getGroundHeight = getGroundHeight || ((x, z) => 0);
        
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
        
        this.speed = 20; // 20 m/s (carrera espacial)
        this.jetpackBoost = 30;
        
        this._onClick = () => {
            if (!this.isLocked) {
                const promise = this.domElement.requestPointerLock();
                if (promise) promise.catch(e => console.warn("PointerLock:", e));
            }
        };
        this._onKeyDown = (e) => this._onKey(e, true);
        this._onKeyUp = (e) => this._onKey(e, false);
        
        document.addEventListener('click', this._onClick);
        document.addEventListener('keydown', this._onKeyDown);
        document.addEventListener('keyup', this._onKeyUp);
        
        this._onPointerLockChange = () => {
            this.isLocked = document.pointerLockElement === this.domElement;
        };
        document.addEventListener('pointerlockchange', this._onPointerLockChange);
        document.addEventListener('mousemove', (e) => this._onMouseMove(e));
    }
    
    _onMouseMove(event) {
        if (!this.isLocked) return;
        
        this.euler.y -= event.movementX * 0.002;
        this.euler.x -= event.movementY * 0.002;
        this.euler.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.euler.x));
        
        this.camera.quaternion.setFromEuler(this.euler);
    }
    
    _onKey(event, isDown) {
        switch (event.code) {
            case 'KeyW': this.keys.forward = isDown; break;
            case 'KeyS': this.keys.backward = isDown; break;
            case 'KeyA': this.keys.left = isDown; break;
            case 'KeyD': this.keys.right = isDown; break;
            case 'Space': this.keys.jump = isDown; break;
            case 'ShiftLeft':
            case 'ShiftRight': this.keys.sprint = isDown; break;
        }
    }
    
    update(dt) {
        if (!this.isLocked) return;
        
        this.direction.z = Number(this.keys.forward) - Number(this.keys.backward);
        this.direction.x = Number(this.keys.right) - Number(this.keys.left);
        this.direction.normalize();
        
        // Movimiento relativo a donde mira la cámara en Y (FPS mode)
        const moveVector = new THREE.Vector3(this.direction.x, 0, -this.direction.z);
        moveVector.applyQuaternion(new THREE.Quaternion().setFromEuler(new THREE.Euler(0, this.euler.y, 0)));
        
        // Multiplicador de sprint (x2 velocidad)
        const currentSpeed = this.keys.sprint ? this.speed * 2 : this.speed;
        
        this.velocity.x = moveVector.x * currentSpeed;
        this.velocity.z = moveVector.z * currentSpeed;
        
        // Gravedad y Jetpack
        if (this.keys.jump && this.camera.position.y <= this.getGroundHeight(this.camera.position.x, this.camera.position.z) + 2.1) {
            this.velocity.y = this.jetpackBoost; // Saltar solo si estamos en el suelo
        } else {
            this.velocity.y -= 25 * dt; // Gravedad realista (2.5G para buen gamefeel)
        }
        
        this.camera.position.addScaledVector(this.velocity, dt);
        
        // Suelo duro dinámico según el terreno
        const groundY = this.getGroundHeight(this.camera.position.x, this.camera.position.z) + 2;
        if (this.camera.position.y < groundY) {
            this.camera.position.y = groundY;
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
