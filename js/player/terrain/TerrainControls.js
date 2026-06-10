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
        
        this.speed = 10; // 10 m/s (carrera humana rápida)
        this.jetpackBoost = 12; // Salto más realista
        this.gravity = 25; // Gravedad realista base (2.5G)
        this.planetScale = 1.0;
        
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
        this._onMouseMoveBound = (e) => this._onMouseMove(e);
        
        document.addEventListener('pointerlockchange', this._onPointerLockChange);
        document.addEventListener('mousemove', this._onMouseMoveBound);
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
    
    setGravityScale(scale) {
        this.planetScale = scale;
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
        
        // Gravedad y Jetpack adaptados al planeta
        if (this.keys.jump && this.camera.position.y <= this.getGroundHeight(this.camera.position.x, this.camera.position.z) + 2.1) {
            this.velocity.y = this.jetpackBoost; // El jetpack nos da la misma fuerza en cualquier planeta, lo que significa que saltamos altísimo en baja gravedad
        } else {
            this.velocity.y -= (this.gravity * this.planetScale) * dt;
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
        document.removeEventListener('mousemove', this._onMouseMoveBound);
        document.removeEventListener('keydown', this._onKeyDown);
        document.removeEventListener('keyup', this._onKeyUp);
    }
}
