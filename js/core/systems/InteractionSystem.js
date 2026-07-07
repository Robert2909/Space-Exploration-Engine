import * as THREE from 'three';
import { EventManager, EVENTS } from '../EventManager.js';
import { Config } from '../Config.js';

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
        this._screenPos = new THREE.Vector3();
    }

    attemptTargeting() {
        this.raycaster.setFromCamera(this._centerVec, this.engine.camera);
        let closest = null;
        let closestIntersectionDistSq = Infinity;

        for (let body of this.engine.nearbyBodies || []) {
            this._bodyPos.set(body.x, body.y, body.z);
            this._toBody.subVectors(this._bodyPos, this.engine.camera.position);
            
            // Si está detrás de la cámara, ignorar
            if (this._toBody.dot(this.raycaster.ray.direction) <= 0) continue;

            const maxTargetDist = Math.max(Config.UI_LABEL_MAX_DISTANCE, body.radius * Config.UI_LABEL_DISTANCE_MULT);
            if (body.distSq > (maxTargetDist * maxTargetDist)) continue;

            // En lugar de una hitbox enorme, usamos un láser casi perfecto (con el pequeño multiplicador)
            // Además, para objetos extremadamente lejanos garantizamos al menos un pixel de perdón
            const distToCamera = Math.sqrt(body.distSq);
            const angularForgiveness = distToCamera * 0.001; // ~0.05 grados de cono de perdón mínimo
            const hitRadius = Math.max(body.radius * Config.TARGET_HITBOX_MULT, angularForgiveness);
            
            this._sphere.set(this._bodyPos, hitRadius);
            
            let hitDistSq = Infinity;
            // Encontrar el punto de intersección exacto del rayo con la hitbox esférica 3D
            const intersectPoint = this.raycaster.ray.intersectSphere(this._sphere, this._hitPoint);
            
            if (intersectPoint) {
                // Medimos la distancia al punto EXACTO de impacto, no al centro del planeta
                hitDistSq = intersectPoint.distanceToSquared(this.engine.camera.position);
            } else {
                // Si el láser 3D falló, verificamos si apuntamos a su Etiqueta de UI
                const dist = Math.sqrt(body.distSq);
                const maxDist = Config.UI_LABEL_MAX_DISTANCE;
                const specificMaxDist = Math.max(maxDist, body.radius * Config.UI_LABEL_DISTANCE_MULT);

                // Solo calculamos si la etiqueta realmente es visible
                if (dist <= specificMaxDist) {
                    this._screenPos.copy(this._bodyPos).project(this.engine.camera);
                    
                    if (this._screenPos.z <= 1.0) { // Objeto frente a cámara
                        // Coordenadas CSS en la pantalla (0,0 es arriba izquierda)
                        const pxX = (this._screenPos.x * 0.5 + 0.5) * window.innerWidth;
                        const pxY = (this._screenPos.y * -0.5 + 0.5) * window.innerHeight;
                        
                        // Replicar radio visual aparente
                        const fovRad = Config.RENDER_FOV * Math.PI / 180;
                        const fovFactor = (window.innerHeight / 2) / Math.tan(fovRad / 2);
                        const apparentRadiusPx = Math.min((body.radius / dist) * fovFactor, window.innerHeight / 2.5);
                        
                        // Posición anclada base (bottom-center de la etiqueta)
                        const labelBaseY = pxY - apparentRadiusPx - 10;
                        
                        // Calcular el escalado
                        const normalizedDist = Math.max(0, dist - body.radius * 4) / maxDist;
                        const scale = Math.max(0.5, 1.0 - normalizedDist * 0.8);
                        
                        // Estimación matemática precisa del tamaño del DOM de la etiqueta sin tocar el DOM
                        const topLineWidth = 25 + (body.name.length * 8.5); // Icono + Nombre
                        const bottomLineWidth = 20 + ((body.type ? body.type.length : 10) * 6.5) + (10 * 6.5); // Tipo + Distancia
                        const estimatedBaseWidth = Math.max(topLineWidth, bottomLineWidth);
                        
                        // Dimensiones estimadas de la etiqueta
                        const labelWidth = estimatedBaseWidth * scale;
                        const labelHeight = 40 * scale; // Alto de dos líneas de texto
                        
                        // Límites visuales (Bounding Box CSS real tras transform)
                        const left = pxX - (labelWidth / 2);
                        const right = pxX + (labelWidth / 2);
                        const bottom = labelBaseY;
                        const top = labelBaseY - labelHeight;
                        
                        // Centro real de la pantalla (El crosshair láser)
                        const crossX = window.innerWidth / 2;
                        const crossY = window.innerHeight / 2;
                        
                        if (crossX >= left && crossX <= right && crossY >= top && crossY <= bottom) {
                            hitDistSq = body.distSq;
                        }
                    }
                }
            }

            if (hitDistSq < closestIntersectionDistSq) {
                closestIntersectionDistSq = hitDistSq;
                closest = body;
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
            // Crear mesh del marcador normalizado a tamaño 1
            const geometry = new THREE.TorusGeometry(1, 0.1, 16, 32);
            const material = new THREE.MeshBasicMaterial({ color: 0x00ffcc, transparent: true, opacity: 0.8 });
            this.landingMarkerMesh = new THREE.Mesh(geometry, material);

            // Luz de apoyo
            this.landingMarkerLight = new THREE.PointLight(0x00ffcc, 2, 100);
            this.landingMarkerMesh.add(this.landingMarkerLight);
        }

        if (this.landingMarkerMesh.parent !== this.engine.scene) {
            this.engine.scene.add(this.landingMarkerMesh);
        }

        // Calcular coordenadas en la superficie
        const currentWorldLon = lon - (planet.rotationY || 0);
        const localX = Math.cos(lat) * Math.cos(currentWorldLon) * planet.radius;
        const localY = Math.sin(lat) * planet.radius;
        const localZ = Math.cos(lat) * Math.sin(currentWorldLon) * planet.radius;
        this._localPoint.set(localX, localY, localZ);

        // Orientar
        this._normal.copy(this._localPoint).normalize();
        this._bodyPos.set(planet.x, planet.y, planet.z);
        this.landingMarkerMesh.position.copy(this._localPoint).add(this._bodyPos);
        this.landingMarkerMesh.quaternion.setFromUnitVectors(this._zAxis, this._normal);

        // Enrobustecer el tamaño: Escalar basándonos en la distancia a la cámara
        // para que siempre se vea bien proporcionado independientemente del tamaño del planeta
        const distToCamera = this.engine.camera.position.distanceTo(this.landingMarkerMesh.position);
        
        // Multiplicador base. Un 2% de la distancia visual produce un aro muy cómodo para el crosshair.
        let dynamicScale = distToCamera * 0.02;
        
        // Pero evitamos que el aro sea absurdamente grande comparado con el propio planeta
        const maxScale = planet.radius * 0.15;
        if (dynamicScale > maxScale) dynamicScale = maxScale;

        // Limitar mínimo para que no desaparezca de cerca
        const minScale = 5; 
        if (dynamicScale < minScale) dynamicScale = minScale;

        this.landingMarkerMesh.scale.setScalar(dynamicScale);
        
        // Ajustar el alcance de la luz también dinámicamente
        this.landingMarkerLight.distance = dynamicScale * 4;

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
