import * as THREE from 'three';
import { EventManager, EVENTS } from '../EventManager.js';

export class InteractionSystem {
    constructor(engine) {
        this.engine = engine;
        this.raycaster = new THREE.Raycaster();

        // Object Pooling
        this._centerVec = new THREE.Vector2(0, 0);
        this._bodyPos = new THREE.Vector3();
        this._toBody = new THREE.Vector3();
        this._hitPoint = new THREE.Vector3();
        this._worldDir = new THREE.Vector3();
        this._localPoint = new THREE.Vector3();
        this._normal = new THREE.Vector3();
        this._zAxis = new THREE.Vector3(0, 0, 1);
        this._sphere = new THREE.Sphere();
    }

    attemptTargeting() {
        this.raycaster.setFromCamera(this._centerVec, this.engine.camera);
        let closest = null;
        let closestDist = Infinity;

        for (let body of this.engine.nearbyBodies || []) {
            this._bodyPos.set(body.x, body.y, body.z);
            this._toBody.subVectors(this._bodyPos, this.engine.camera.position);
            if (this._toBody.dot(this.raycaster.ray.direction) > 0) {
                const distToRay = this.raycaster.ray.distanceSqToPoint(this._bodyPos);
                const hitThreshold = Math.max(body.radius * 3, 200) ** 2;
                if (distToRay < hitThreshold && body.distSq < closestDist) {
                    closestDist = body.distSq;
                    closest = body;
                }
            }
        }

        if (closest) {
            // Si el nuevo target es igual al actual, lo deseleccionamos
            if (this.engine.targetBody && this.engine.targetBody.name === closest.name) {
                this.engine.targetBody = null;
                if (this.engine.controls) {
                    this.engine.controls.autoPilotTarget = null;
                    this.engine.controls.autoLookTarget = null;
                    this.engine.controls.lastAutoLookPos = null;
                }
                EventManager.emit(EVENTS.TARGET_CLEARED);
                EventManager.emit(EVENTS.OSD_MESSAGE, { message: 'Sistema de fijación desactivado', type: 'info' });
            } else {
                this.engine.targetBody = closest;
                this.engine.updateTargetHUD(closest);
                EventManager.emit(EVENTS.TARGET_CHANGED, closest);
                EventManager.emit(EVENTS.OSD_MESSAGE, { message: 'Objetivo fijado en: ' + closest.name, type: 'success' });
            }
        } else {
            if (this.engine.targetBody) {
                // Click en el vacío = Deseleccionar
                this.engine.targetBody = null;
                if (this.engine.controls) {
                    this.engine.controls.autoPilotTarget = null;
                    this.engine.controls.autoLookTarget = null;
                    this.engine.controls.lastAutoLookPos = null;
                }
                EventManager.emit(EVENTS.TARGET_CLEARED);
                EventManager.emit(EVENTS.OSD_MESSAGE, { message: 'Sistema de fijación desactivado', type: 'info' });
            } else {
                EventManager.emit(EVENTS.OSD_MESSAGE, { message: 'No hay objetivo válido en el visor', type: 'error' });
            }
        }
    }

    attemptLandingZone(planet) {
        this.raycaster.setFromCamera(this._centerVec, this.engine.camera);

        // El planeta no tiene un "mesh" único (es un InstancedMesh), así que usamos una esfera matemática
        this._bodyPos.set(planet.x, planet.y, planet.z);
        this._sphere.set(this._bodyPos, planet.radius);

        const intersects = this.raycaster.ray.intersectSphere(this._sphere, this._hitPoint);

        if (intersects) {
            this._worldDir.subVectors(this._hitPoint, this._bodyPos);

            // Calculamos latitud y longitud en espacio mundo
            const lat = Math.asin(Math.max(-1, Math.min(1, this._worldDir.y / planet.radius)));
            const worldLon = Math.atan2(this._worldDir.z, this._worldDir.x);

            // La longitud local = longitud mundial + rotación actual (despejando de worldLon = lon - rotY)
            const rotY = planet.rotationY || 0;
            let lon = worldLon + rotY;

            // Normalizar lon a [-PI, PI] para evitar que el aterrizaje genere coordenadas fuera de límites matemáticos
            while (lon > Math.PI) lon -= Math.PI * 2;
            while (lon < -Math.PI) lon += Math.PI * 2;

            // Si ya hay un marcador y clickeamos cerca, aterrizamos
            if (this.engine.landingMarker && this.engine.landingMarker.planetName === planet.name) {
                const markerLat = this.engine.landingMarker.lat;
                const markerLon = this.engine.landingMarker.lon;

                // Distancia angular simple
                const distLat = lat - markerLat;
                let distLon = lon - markerLon;
                // Normalizar distLon a [-PI, PI]
                while (distLon > Math.PI) distLon -= Math.PI * 2;
                while (distLon < -Math.PI) distLon += Math.PI * 2;

                const angularDist = Math.sqrt(distLat * distLat + distLon * distLon);

                // Si la diferencia es menor a ~5 grados (0.08 rad), confirmamos aterrizaje
                if (angularDist < 0.1) {
                    this.engine.triggerLanding(planet, markerLat, markerLon);
                    this.clearLandingMarker();
                    return;
                }
            }

            // Si no aterrizamos, fijamos la zona
            this.setLandingMarker(planet, this._worldDir, lat, lon);

            // Auto-Target
            if (!this.engine.targetBody || this.engine.targetBody.name !== planet.name) {
                this.engine.targetBody = planet;
                this.engine.updateTargetHUD(planet);
                EventManager.emit(EVENTS.TARGET_CHANGED, planet);
            }
        } else {
            EventManager.emit(EVENTS.OSD_MESSAGE, { message: 'Apunta a la superficie para fijar zona de aterrizaje', type: 'warning' });
        }
    }

    setLandingMarker(planet, worldDir, lat, lon) {
        if (!this.landingMarkerMesh) {
            // Crear mesh del marcador (un aro iluminado)
            const geometry = new THREE.TorusGeometry(planet.radius * 0.05, planet.radius * 0.005, 16, 32);
            const material = new THREE.MeshBasicMaterial({ color: 0x00ffcc, transparent: true, opacity: 0.8 });
            this.landingMarkerMesh = new THREE.Mesh(geometry, material);

            const light = new THREE.PointLight(0x00ffcc, 2, planet.radius * 0.2);
            this.landingMarkerMesh.add(light);
        }

        if (this.landingMarkerMesh.parent !== this.engine.scene) {
            this.engine.scene.add(this.landingMarkerMesh);
        }

        // Para posicionar el marcador correctamente en el frame 1, usamos la longitud mundial
        const currentWorldLon = lon - (planet.rotationY || 0);
        const localX = Math.cos(lat) * Math.cos(currentWorldLon) * planet.radius;
        const localY = Math.sin(lat) * planet.radius;
        const localZ = Math.cos(lat) * Math.sin(currentWorldLon) * planet.radius;
        this._localPoint.set(localX, localY, localZ);

        // Orientar el marcador hacia la normal de la superficie
        this._normal.copy(this._localPoint).normalize();

        // Convertir la posición local a posición mundial sumando el centro del planeta
        this._bodyPos.set(planet.x, planet.y, planet.z);
        this.landingMarkerMesh.position.copy(this._localPoint).add(this._bodyPos);
        this.landingMarkerMesh.quaternion.setFromUnitVectors(this._zAxis, this._normal);

        this.engine.landingMarker = {
            planetName: planet.name,
            lat: lat,
            lon: lon
        };

        EventManager.emit(EVENTS.OSD_MESSAGE, { message: 'Zona fijada. Esperando confirmación para aterrizar', type: 'info', duration: 4000 });
        EventManager.emit(EVENTS.HUD_TARGET_UPDATED, {
            landingMarker: this.engine.landingMarker,
            target: planet,
            cameraPos: this.engine.camera.position,
            gameState: this.engine.currentState.constructor.name === 'TerrainState' ? 'TERRAIN' : 'SPACE'
        });
    }

    clearLandingMarker() {
        if (this.landingMarkerMesh) {
            this.engine.scene.remove(this.landingMarkerMesh);
        }
        this.engine.landingMarker = null;
    }
}
