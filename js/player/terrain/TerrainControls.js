import * as THREE from 'three';
import { Config } from '../../core/Config.js';
import { OSDManager } from '../../ui/OSDManager.js';

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

        // Físicas del Jetpack
        this.maxFuel = 250;
        this.currentFuel = 250;
        this.fuelConsumeRate = 35; // Unidades por segundo
        this.fuelRefillRate = 25; // Unidades por segundo
        this.isGrounded = false;
        this.jetpackActive = false;
        this.jetpackCooldown = 0;

        // Fall Damage tracking
        this.highestPoint = 0;

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

        const moveVector = new THREE.Vector3(this.direction.x, 0, -this.direction.z);
        moveVector.applyQuaternion(new THREE.Quaternion().setFromEuler(new THREE.Euler(0, this.euler.y, 0)));

        const currentSpeed = this.keys.sprint ? this.speed * 2 : this.speed;

        this.velocity.x = moveVector.x * currentSpeed;
        this.velocity.z = moveVector.z * currentSpeed;

        const actualGravity = this.gravity * this.planetScale;
        this.jetpackActive = false;

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

                if (impactVelocity > 60) {
                    OSDManager.show("FALLO CRÍTICO: Impacto letal detectado. Reiniciando soporte vital...", 'error', 4000);
                } else if (impactVelocity > 45) {
                    OSDManager.show("PELIGRO: Traumatismo severo. Integridad física altamente comprometida.", 'error', 3500);
                } else if (impactVelocity > 35) {
                    OSDManager.show("Advertencia: Impacto fuerte. Contusiones y posibles fracturas menores.", 'warning', 3000);
                } else if (impactVelocity > 26) {
                    OSDManager.show("Alerta: Impacto leve detectado. Integridad del traje estable.", 'info', 2500);
                }
            }

            this.camera.position.y = groundY;
            this.velocity.y = 0;
            this.isGrounded = true;
            this.highestPoint = groundY;
        } else {
            this.isGrounded = false;
        }

        // UI Update
        const fuelBar = document.getElementById('jetpack-fuel-bar');
        if (fuelBar) {
            fuelBar.style.width = (this.currentFuel / this.maxFuel * 100) + '%';
            if (this.currentFuel < 40) fuelBar.style.backgroundColor = 'var(--error-color)';
            else fuelBar.style.backgroundColor = 'var(--keyword-color)';

            document.getElementById('jetpack-status').innerText = this.currentFuel <= 0 ? "'Agotado'" : (this.jetpackActive) ? "'En uso...'" : "'Disponible'";
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
