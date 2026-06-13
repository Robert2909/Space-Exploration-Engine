import * as THREE from 'three';
import { GameState } from '../GameState.js';
import { Config } from '../Config.js';
import { EventManager, EVENTS } from '../EventManager.js';
import { ShipEntity } from '../../world/entities/ShipEntity.js';

export class TerrainState extends GameState {
    constructor(engine) {
        super(engine);
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
                const shipX = this.landingX;
                const shipZ = this.landingZ - 25; 
                
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
                    const euler = new THREE.Euler(0, 0, 0, 'YXZ');
                    euler.setFromQuaternion(engine.camera.quaternion);
                    euler.y += Math.PI;
                    engine.camera.quaternion.setFromEuler(euler);
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
                const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(engine.camera.quaternion);
                // dir.z es positivo hacia el Norte (+Z) en nuestro sistema
                let heading = Math.atan2(dir.x, -dir.z) * (180 / Math.PI);
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
                let shipDistText = '';
                if (this.shipEntity) {
                    const toShip = new THREE.Vector3().subVectors(this.shipEntity.getMesh().position, engine.camera.position);
                    const distToShip = toShip.length();
                    shipDistText = ` (Nave: ${Math.round(distToShip)}m)`;
                    
                    const dot = dir.clone().setY(0).normalize().dot(toShip.clone().setY(0).normalize());
                    if (dot > 0.98) { // Mirando directamente a la nave
                        cardinal = "NAVE";
                    }
                }

                // Calcular Termómetro (Física local)
                const currentSunHeight = Math.sin(engine.terrainManager.timeOfDay); // 1 = Mediodía, -1 = Medianoche
                const distToSunMultiplier = 5000 / (engine.lastLandedPlanet.orbitRadius || 5000); 
                
                const pType = engine.lastLandedPlanet.type;
                let baseTemp = 15; 
                if (pType === 'Ice Planet') baseTemp = -60;
                else if (pType === 'Lava Planet') baseTemp = 400;
                else if (pType === 'Desert Planet') baseTemp = 45;
                else if (pType === 'Toxic Planet') baseTemp = 70;
                else if (pType === 'Ocean Planet') baseTemp = 10;
                else if (pType === 'Jungle Planet') baseTemp = 30;
                else if (pType === 'Barren Planet') baseTemp = -10;
                
                const latMultiplier = Math.cos(latDeg * (Math.PI / 180));
                let timeTempOffset = (currentSunHeight * 20);
                let latTempOffset = (latMultiplier * 30) - 15;
                
                let finalTemp = (baseTemp + timeTempOffset + latTempOffset) * distToSunMultiplier;
                const tempColor = finalTemp > 50 ? '#ff5555' : (finalTemp < 0 ? '#55aaff' : '#ffffff');

                // Calcular Jetpack Fuel
                const fuelPct = (engine.terrainControls.jetpackFuel / engine.terrainControls.maxJetpackFuel) * 100;

                // Emitir evento HUD Terrain Updated
                EventManager.emit(EVENTS.HUD_TERRAIN_UPDATED, {
                    heading,
                    cardinal,
                    shipDistText,
                    finalTemp,
                    tempColor,
                    fuelPct,
                    speed: engine.terrainControls.velocity.length(),
                    pos: engine.camera.position,
                    latDeg,
                    lonDeg
                });
            }

            if (engine.camera.position.y > 100000) {
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
