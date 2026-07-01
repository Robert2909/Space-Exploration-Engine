import * as THREE from 'three';
import { GameState } from '../GameState.js';
import { Config } from '../Config.js';
import { EventManager, EVENTS } from '../EventManager.js';
import { ShipEntity } from '../../world/entities/ShipEntity.js';

export class TerrainState extends GameState {
    constructor(engine) {
        super(engine);
        this.shipEntity = null; // Instancia de la nave física estacionada

        // Object Pooling
        this._euler = new THREE.Euler(0, 0, 0, 'YXZ');
        this._dir = new THREE.Vector3();
        this._zAxis = new THREE.Vector3(0, 0, -1);
        this._toShip = new THREE.Vector3();
        this._dirFlat = new THREE.Vector3();
        this._toShipFlat = new THREE.Vector3();
    }

    enter(payload) {
        this.engine.gameState = 'TERRAIN';
        this.landingX = payload ? payload.startX : 0;
        this.landingZ = payload ? payload.startZ : 0;
        
        // Prevención extrema: Asegurar que no haya naves huérfanas
        if (this.shipEntity) {
            this.engine.scene.remove(this.shipEntity.getMesh());
            this.shipEntity = null;
        }
    }

    update(dt) {
        const engine = this.engine;
        
        if (engine.terrainControls && engine.terrainManager) {
            // Inicialización diferida de entidades terrestres en el primer frame
            if (!this.shipEntity) {
                this.shipEntity = new ShipEntity();
                
                // Spawneamos la nave 25 metros al NORTE (o frente) del jugador para que sea visible
                // y no aparezcamos dentro de ella, pero siga estando perfectamente posicionada
                let shipX = this.landingX;
                let shipZ = this.landingZ - Config.TERRAIN_SHIP_SPAWN_DISTANCE; 
                
                // Envolver la nave matemáticamente si cae sobre un polo o fuera del ecuador
                if (engine.lastLandedPlanet) {
                    const tardisScale = Config.TERRAIN_TARDIS_SCALE;
                    const terrainRadius = engine.lastLandedPlanet.radius * tardisScale;
                    const circumference = Math.PI * 2 * terrainRadius;
                    const poleZ = (Math.PI / 2) * terrainRadius;
                    
                    if (shipZ > poleZ) {
                        shipZ = poleZ - (shipZ - poleZ);
                        shipX += circumference / 2;
                    } else if (shipZ < -poleZ) {
                        shipZ = -poleZ - (shipZ + poleZ);
                        shipX += circumference / 2;
                    }
                    if (shipX > circumference / 2) shipX -= circumference;
                    else if (shipX < -circumference / 2) shipX += circumference;
                }

                // Alineamos y posicionamos la nave basada en la deformación del terreno
                this.shipEntity.alignToTerrain(engine.terrainManager.generator, shipX, shipZ);
                
                engine.scene.add(this.shipEntity.getMesh());
            }

            engine.terrainControls.update(dt);

            // Circunnavegación y Polos (Bucle finito planetario)
            if (engine.lastLandedPlanet) {
                const tardisScale = Config.TERRAIN_TARDIS_SCALE;
                const terrainRadius = engine.lastLandedPlanet.radius * tardisScale;
                const circumference = Math.PI * 2 * terrainRadius;
                const poleZ = (Math.PI / 2) * terrainRadius;

                let px = engine.camera.position.x;
                let pz = engine.camera.position.z;
                let crossedPole = false;

                // Cruzar los Polos (Norte/Sur)
                if (pz > poleZ) {
                    pz = poleZ - (pz - poleZ);
                    px += circumference / 2;
                    crossedPole = true;
                } else if (pz < -poleZ) {
                    pz = -poleZ - (pz + poleZ);
                    px += circumference / 2;
                    crossedPole = true;
                }

                // Bucle Este-Oeste (Ecuador/Longitud)
                if (px > circumference / 2) px -= circumference;
                else if (px < -circumference / 2) px += circumference;

                if (crossedPole) {
                    // Girar cámara 180° horizontalmente al cruzar el polo
                    this._euler.setFromQuaternion(engine.camera.quaternion);
                    this._euler.y += Math.PI;
                    engine.camera.quaternion.setFromEuler(this._euler);
                }

                engine.camera.position.x = px;
                engine.camera.position.z = pz;
            }

            engine.terrainManager.update(dt, engine.camera.position);

            if (engine.lastLandedPlanet) {
                engine.updateTargetHUD(engine.lastLandedPlanet);
            }

            // Actualizar OSD Terreno (Navegación)
            if (engine.lastLandedPlanet) {
                const terrainRadius = engine.lastLandedPlanet.radius * 10;
                
                const latDeg = (engine.camera.position.z / terrainRadius) * (180 / Math.PI);
                const lonDeg = (engine.camera.position.x / terrainRadius) * (180 / Math.PI);
                
                // Brújula
                this._dir.copy(this._zAxis).applyQuaternion(engine.camera.quaternion);
                // dir.z es positivo hacia el Norte (+Z) en nuestro sistema
                let heading = Math.atan2(this._dir.x, -this._dir.z) * (180 / Math.PI);
                if (heading < 0) heading += 360;
                
                let cardinal = "N";
                if (heading > 22.5 && heading <= 67.5) cardinal = "NE";
                else if (heading > 67.5 && heading <= 112.5) cardinal = "E";
                else if (heading > 112.5 && heading <= 157.5) cardinal = "SE";
                else if (heading > 157.5 && heading <= 202.5) cardinal = "S";
                else if (heading > 202.5 && heading <= 247.5) cardinal = "SO";
                else if (heading > 247.5 && heading <= 292.5) cardinal = "O";
                else if (heading > 292.5 && heading <= 337.5) cardinal = "NO";
                
                // Distancia y marcador a la Nave
                let distToShip = null;
                if (this.shipEntity) {
                    this._toShip.subVectors(this.shipEntity.getMesh().position, engine.camera.position);
                    distToShip = this._toShip.length();
                    
                    this._dirFlat.copy(this._dir).setY(0).normalize();
                    this._toShipFlat.copy(this._toShip).setY(0).normalize();
                    const dot = this._dirFlat.dot(this._toShipFlat);
                    if (dot > 0.98) { // Mirando directamente a la nave
                        cardinal = "NAVE";
                    }
                }

                // Calcular Termómetro (Física local)
                const currentSunHeight = Math.sin(engine.terrainManager.timeOfDay); // 1 = Mediodía, -1 = Medianoche
                const distToSunMultiplier = Config.REFERENCE_HABITABLE_ZONE_U / (engine.lastLandedPlanet.orbitRadius || Config.REFERENCE_HABITABLE_ZONE_U); 
                
                const pType = engine.lastLandedPlanet.type;
                let baseTemp = 15;
                const biome = Config.PLANET_BIOMES[pType];
                if (biome && biome.baseTemp !== undefined) {
                    baseTemp = biome.baseTemp;
                }
                
                const latMultiplier = Math.cos(latDeg * (Math.PI / 180));
                let timeTempOffset = (currentSunHeight * 20);
                let latTempOffset = (latMultiplier * 30) - 15;
                
                let finalTemp = (baseTemp + timeTempOffset + latTempOffset) * distToSunMultiplier;
                const tempColor = finalTemp > 50 ? '#ff5555' : (finalTemp < 0 ? '#55aaff' : '#ffffff');

                // Calcular Jetpack Fuel
                const fuelPct = (engine.terrainControls.jetpackFuel / engine.terrainControls.maxJetpackFuel) * 100;

                // Velocidad relativa local del jugador (m/s convertidos a U/s para el MeasurementSystem)
                const relativeWalkSpeedU = engine.terrainControls.velocity.length() / (Config.SCALE_U_TO_KM * 1000);

                // Emitir evento HUD Terrain Updated
                EventManager.emit(EVENTS.HUD_TERRAIN_UPDATED, {
                    heading,
                    cardinal,
                    distToShip,
                    finalTemp,
                    tempColor,
                    fuelPct,
                    speed: relativeWalkSpeedU,
                    pos: engine.camera.position,
                    latDeg,
                    lonDeg
                });
            }

            if (engine.camera.position.y > Config.TERRAIN_LIFTOFF_ATMOSPHERE_HEIGHT) {
                if (!this.showingLiftoffPrompt) {
                    EventManager.emit(EVENTS.OSD_MESSAGE, { message: "Atmósfera Alta [ENTER] Despegar", type: 'warning', duration: 5000 });
                    this.showingLiftoffPrompt = true;
                }
            } else {
                this.showingLiftoffPrompt = false;
            }
        }
    }

    exit() {
        // Limpieza de entidades locales al despegar
        if (this.shipEntity) {
            this.engine.scene.remove(this.shipEntity.getMesh());
            this.shipEntity = null;
        }
    }
}
