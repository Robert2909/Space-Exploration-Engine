import * as THREE from 'three';
import { Config } from '../../core/Config.js';
import { OSDManager } from '../../ui/OSDManager.js';
import { EventManager, EVENTS } from '../../core/EventManager.js';

export class TerrainControls {
    constructor(camera, domElement, getGroundHeight) {
        this.camera = camera;
        this.domElement = domElement;
        this.getGroundHeight = getGroundHeight || ((x, z) => 0);

        this.velocity = new THREE.Vector3();
        this.direction = new THREE.Vector3();
        this.euler = new THREE.Euler(0, 0, 0, 'YXZ');

        // Object Pooling
        this._moveVector = new THREE.Vector3();
        this._yEuler = new THREE.Euler(0, 0, 0, 'YXZ');
        this._yQuat = new THREE.Quaternion();

        this.isLocked = false;

        this.keys = {
            forward: false,
            backward: false,
            left: false,
            right: false,
            jump: false
        };

        this.speed = Config.TERRAIN_PLAYER_SPEED;
        this.jetpackBoost = Config.TERRAIN_JUMP_FORCE;
        this.gravity = Config.TERRAIN_BASE_GRAVITY;
        this.planetScale = 1.0;

        // Físicas del Jetpack
        this.maxFuel = Config.TERRAIN_JETPACK_MAX_FUEL;
        this.currentFuel = this.maxFuel;
        this.fuelConsumeRate = Config.TERRAIN_JETPACK_CONSUME;
        this.fuelRefillRate = Config.TERRAIN_JETPACK_REFILL;
        this.isGrounded = false;
        this.jetpackActive = false;
        this.jetpackCooldown = 0;

        // Fall Damage tracking
        this.highestPoint = 0;

        this._onClick = (e) => {
            if (e && e.target && e.target.closest('#ui-layer')) return;
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

        const movementX = event.movementX || 0;
        const movementY = event.movementY || 0;

        // Evitar tirones extremos e inestabilidades de la API de PointerLock
        if (Math.abs(movementX) > 100 || Math.abs(movementY) > 100) return;

        this.euler.y -= movementX * Config.TERRAIN_MOUSE_SENSITIVITY;
        this.euler.x -= movementY * Config.TERRAIN_MOUSE_SENSITIVITY;
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

        this.jetpackActive = false;

        if (!this.isDead) {
            this.direction.z = Number(this.keys.forward) - Number(this.keys.backward);
            this.direction.x = Number(this.keys.right) - Number(this.keys.left);
            this.direction.normalize();

            this._moveVector.set(this.direction.x, 0, -this.direction.z);
            this._yEuler.set(0, this.euler.y, 0, 'YXZ');
            this._yQuat.setFromEuler(this._yEuler);
            this._moveVector.applyQuaternion(this._yQuat);

            const currentSpeed = this.keys.sprint ? this.speed * Config.TERRAIN_PLAYER_SPRINT_MULT : this.speed;

            this.velocity.x = this._moveVector.x * currentSpeed;
            this.velocity.z = this._moveVector.z * currentSpeed;
        } else {
            // Fricción rápida si está muerto para detener el deslizamiento
            this.velocity.x -= this.velocity.x * 10.0 * dt;
            this.velocity.z -= this.velocity.z * 10.0 * dt;
        }

        const actualGravity = this.gravity * this.planetScale;

        if (!this.jumpTimer) this.jumpTimer = 0;

        // Salto normal y Jetpack Mechanics
        if (this.keys.jump && this.isGrounded) {
            // Salto inicial físico (no gasta combustible)
            this.velocity.y = this.jetpackBoost;
            this.isGrounded = false;
            this.jumpTimer = 0;
        } else if (this.keys.jump && !this.isGrounded && this.currentFuel > 0) {
            this.jumpTimer += dt;
            // El Jetpack se activa después de 0.3 segundos del salto inicial
            if (this.jumpTimer > 0.3) {
                this.jetpackActive = true;
                this.jetpackCooldown = 2.0; // 2 segundos de enfriamiento antes de poder recargar

                const thrust = this.gravity * 2.5;
                this.velocity.y += thrust * dt;

                // Limitar la velocidad máxima de subida
                this.velocity.y = Math.min(this.velocity.y, this.jetpackBoost * 1.5);

                this.currentFuel -= this.fuelConsumeRate * dt;
            }
        } else {
            // Si soltamos el botón o no hay combustible
            if (!this.keys.jump) {
                this.jumpTimer = 0;
            }
        }

        // La gravedad siempre aplica
        this.velocity.y -= actualGravity * dt;

        // Lógica de enfriamiento y recarga
        if (!this.jetpackActive) {
            if (this.jetpackCooldown > 0) {
                this.jetpackCooldown -= dt;
            } else {
                this.currentFuel = Math.min(this.maxFuel, this.currentFuel + this.fuelRefillRate * dt);
            }
        }

        // Track highest point for fall damage
        if (!this.isGrounded && this.velocity.y < 0) {
            // We are falling
        } else if (!this.isGrounded && this.velocity.y > 0) {
            this.highestPoint = Math.max(this.highestPoint, this.camera.position.y);
        }

        // Move
        this.camera.position.addScaledVector(this.velocity, dt);

        // Ground Collision
        const groundY = this.getGroundHeight(this.camera.position.x, this.camera.position.z) + 2;
        if (this.camera.position.y <= groundY) {
            // Impact!
            if (!this.isGrounded) {
                const impactVelocity = Math.abs(this.velocity.y);

                if (impactVelocity > 20) {
                    const shakeLevel = Math.min((impactVelocity - 15) / 170, 1.0);
                    this.shakeIntensity = shakeLevel * 0.4;
                    EventManager.emit(EVENTS.PLAYER_IMPACT, { level: shakeLevel });
                }

                if (impactVelocity > 170) {
                    EventManager.emit(EVENTS.OSD_MESSAGE, { message: "IMPACTO FATAL: Peligro de muerte. Retirada de emergencia.", type: 'error', duration: 6000 });
                    EventManager.emit(EVENTS.PLAYER_DEATH);
                } else if (impactVelocity > 150) {
                    EventManager.emit(EVENTS.OSD_MESSAGE, { message: "DAÑO SEVERO: Impacto a velocidad extrema. Múltiples fracturas.", type: 'error', duration: 5000 });
                } else if (impactVelocity > 130) {
                    EventManager.emit(EVENTS.OSD_MESSAGE, { message: "PELIGRO: Desaceleración violenta. Rupturas internas.", type: 'error', duration: 4500 });
                } else if (impactVelocity > 95) {
                    EventManager.emit(EVENTS.OSD_MESSAGE, { message: "ALERTA: Integridad ósea comprometida. Hemorragia detectada.", type: 'error', duration: 4000 });
                } else if (impactVelocity > 80) {
                    EventManager.emit(EVENTS.OSD_MESSAGE, { message: "ADVERTENCIA: Sobrecarga cinética. Amortiguadores rebasados.", type: 'warning', duration: 3500 });
                } else if (impactVelocity > 65) {
                    EventManager.emit(EVENTS.OSD_MESSAGE, { message: "PRECAUCIÓN: Aterrizaje agresivo. Picos de estrés térmico y mecánico.", type: 'warning', duration: 3000 });
                } else if (impactVelocity > 50) {
                    EventManager.emit(EVENTS.OSD_MESSAGE, { message: "AVISO: Fuerte impacto. Compensadores estabilizados. Constantes vitales normales.", type: 'info', duration: 2500 });
                }
            }

            this.camera.position.y = groundY;
            this.velocity.y = 0;
            this.isGrounded = true;
            this.highestPoint = groundY;
        } else {
            this.isGrounded = false;
        }

        // UI Update (via events)
        const fuelPct = (this.currentFuel / this.maxFuel) * 100;
        const statusText = this.currentFuel <= 0 ? "'Agotado'" : (this.jetpackActive) ? "'En uso...'" : "'Disponible'";
        EventManager.emit(EVENTS.HUD_TERRAIN_FUEL_UPDATED, { fuelPct, statusText });
    }

    dispose() {
        this.domElement.removeEventListener('click', this._onClick);
        document.removeEventListener('pointerlockchange', this._onPointerLockChange);
        document.removeEventListener('mousemove', this._onMouseMoveBound);
        document.removeEventListener('keydown', this._onKeyDown);
        document.removeEventListener('keyup', this._onKeyUp);
    }
}
