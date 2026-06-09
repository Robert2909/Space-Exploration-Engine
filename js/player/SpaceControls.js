import * as THREE from 'three';
import { Config } from '../core/Config.js';

export class SpaceControls {
    constructor(camera, domElement) {
        this.camera = camera;
        this.domElement = domElement; 
        this.isLocked = false;
        
        this.velocity = new THREE.Vector3();
        
        this.camera.rotation.set(0, 0, 0);
        
        this.speed = Config.PLAYER_SPEED;
        this.boostMultiplier = Config.PLAYER_BOOST_MULTIPLIER;
        this.friction = Config.PLAYER_FRICTION;
        
        this.keys = { w: false, a: false, s: false, d: false, q: false, e: false, shift: false, space: false };
        
        this.initEvents();
    }
    
    initEvents() {
        document.addEventListener('pointerlockchange', () => {
            this.isLocked = document.pointerLockElement === this.domElement;
        });
        
        const canvas = document.querySelector('canvas');
        if (canvas) {
            canvas.addEventListener('click', () => {
                if (!this.isLocked) this.domElement.requestPointerLock();
            });
        }
        
        document.addEventListener('mousemove', (e) => {
            if (!this.isLocked) return;
            const movementX = e.movementX || 0;
            const movementY = e.movementY || 0;
            
            if (Math.abs(movementX) > 100 || Math.abs(movementY) > 100) return;
            
            this.camera.rotateY(-movementX * Config.MOUSE_SENSITIVITY);
            this.camera.rotateX(-movementY * Config.MOUSE_SENSITIVITY);
        });
        
        document.addEventListener('keydown', (e) => this.onKey(e, true));
        document.addEventListener('keyup', (e) => this.onKey(e, false));
    }
    
    onKey(event, isDown) {
        switch(event.code) {
            case 'KeyW': case 'ArrowUp': this.keys.w = isDown; break;
            case 'KeyA': case 'ArrowLeft': this.keys.a = isDown; break;
            case 'KeyS': case 'ArrowDown': this.keys.s = isDown; break;
            case 'KeyD': case 'ArrowRight': this.keys.d = isDown; break;
            case 'KeyQ': this.keys.q = isDown; break;
            case 'KeyE': this.keys.e = isDown; break;
            case 'ShiftLeft': case 'ShiftRight': this.keys.shift = isDown; break;
            case 'Space': this.keys.space = isDown; break;
        }
    }
    
    update(dt) {
        if (!this.isLocked) {
            this.velocity.multiplyScalar(0.95);
        } else {
            const currentSpeed = this.speed * (this.keys.shift ? this.boostMultiplier : 1);
            
            const direction = new THREE.Vector3();
            direction.z = Number(this.keys.w) - Number(this.keys.s);
            direction.x = Number(this.keys.d) - Number(this.keys.a);
            direction.normalize();
            
            if (this.keys.w || this.keys.s) this.velocity.z -= direction.z * currentSpeed * dt;
            if (this.keys.a || this.keys.d) this.velocity.x += direction.x * currentSpeed * dt;
            
            const rollInput = Number(this.keys.q) - Number(this.keys.e);
            if (rollInput !== 0) {
                this.camera.rotateZ(rollInput * Config.ROLL_SPEED * dt);
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
}
