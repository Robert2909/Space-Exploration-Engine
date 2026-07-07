import * as THREE from 'three';
import { Chunk, SHARED_SPHERE_GEO, SHARED_HIGH_POLY_GEO, SHARED_HIGH_RES_MAT } from './Chunk.js';
import { Config } from '../../core/Config.js';

export class Universe {
    constructor(scene) {
        this.scene = scene;
        this.chunks = new Map();
        this.chunkQueue = []; 
        this.renderDistance = 1; 
        this.chunkSize = Config.UNIVERSE_CHUNK_SIZE;
        this.currentHighLODPlanet = null;
    }
    
    setHighLODPlanet(planet) {
        if (this.currentHighLODPlanet === planet) {
            // Already set. Since we use a native MeshLambertMaterial now, lighting is automatic.
            // If the shader is ready, we can ensure uSeed is correct.
            if (planet && SHARED_HIGH_RES_MAT.userData.shader) {
                let s = SHARED_HIGH_RES_MAT.userData.shader.uniforms;
                s.uSeed.value = (planet.orbitRadius || 0.0) % 1000.0;
                if (planet.shaderParams) {
                    s.uColorLow.value.copy(planet.shaderParams.colorLow);
                    s.uColorHigh.value.copy(planet.shaderParams.colorHigh);
                    s.uCloudColor.value.copy(planet.shaderParams.cloudColor);
                    s.uNoiseFreq.value = planet.shaderParams.noiseFreq;
                    s.uCloudDensity.value = planet.shaderParams.cloudDensity;
                    s.uAtmosphere.value = planet.shaderParams.atmosphere;
                }
            }
            return;
        }
        
        // Downgrade old planet if it exists and still has the high-poly geometry
        if (this.currentHighLODPlanet) {
            if (this.currentHighLODPlanet.mesh && this.currentHighLODPlanet.mesh.geometry === SHARED_HIGH_POLY_GEO) {
                this.currentHighLODPlanet.mesh.geometry = SHARED_SPHERE_GEO;
                // Revert material to the simple one from the chunk manager
                this.currentHighLODPlanet.mesh.material = new THREE.MeshLambertMaterial({ color: this.currentHighLODPlanet.color });
            }
        }

        this.currentHighLODPlanet = planet;

        // Upgrade new planet
        if (this.currentHighLODPlanet && this.currentHighLODPlanet.mesh) {
            this.currentHighLODPlanet.mesh.geometry = SHARED_HIGH_POLY_GEO;
            
            // Set the high-res shader material
            this.currentHighLODPlanet.mesh.material = SHARED_HIGH_RES_MAT;
            
            // Update color for the new planet natively
            SHARED_HIGH_RES_MAT.color.copy(this.currentHighLODPlanet.color);
            
            // Update custom uniforms if compiled
            if (SHARED_HIGH_RES_MAT.userData.shader) {
                let s = SHARED_HIGH_RES_MAT.userData.shader.uniforms;
                s.uSeed.value = (this.currentHighLODPlanet.orbitRadius || 0.0) % 1000.0;
                if (this.currentHighLODPlanet.shaderParams) {
                    s.uColorLow.value.copy(this.currentHighLODPlanet.shaderParams.colorLow);
                    s.uColorHigh.value.copy(this.currentHighLODPlanet.shaderParams.colorHigh);
                    s.uCloudColor.value.copy(this.currentHighLODPlanet.shaderParams.cloudColor);
                    s.uNoiseFreq.value = this.currentHighLODPlanet.shaderParams.noiseFreq;
                    s.uCloudDensity.value = this.currentHighLODPlanet.shaderParams.cloudDensity;
                    s.uAtmosphere.value = this.currentHighLODPlanet.shaderParams.atmosphere;
                    s.uWarpStrength.value = this.currentHighLODPlanet.shaderParams.warpStrength;
                    s.uStretchY.value = this.currentHighLODPlanet.shaderParams.stretchY;
                }
            }
        }
    }

    getChunkKey(cx, cy, cz) {
        return `${cx},${cy},${cz}`;
    }
    
    setRenderDistance(dist) {
        this.renderDistance = dist;
    }
    
    getClosestStar(cameraPos) {
        let closestStar = null;
        let minDistSq = Infinity;
        for(let [key, chunk] of this.chunks.entries()) {
            if(chunk !== 'pending') {
                for(let sys of chunk.systems) {
                    const dx = sys.x - cameraPos.x;
                    const dy = sys.y - cameraPos.y;
                    const dz = sys.z - cameraPos.z;
                    const distSq = dx*dx + dy*dy + dz*dz;
                    if (distSq < minDistSq) {
                        minDistSq = distSq;
                        closestStar = sys;
                    }
                }
            }
        }
        return closestStar;
    }

    getClosestEntities(cameraPos) {
        let closestSystem = null;
        let closestPlanet = null;
        let minSysDistSq = Infinity;
        let minPlanetDistSq = Infinity;

        for (let [key, chunk] of this.chunks.entries()) {
            if (chunk !== 'pending') {
                for (let sys of chunk.systems) {
                    // Check star/blackhole
                    const sdx = sys.x - cameraPos.x;
                    const sdy = sys.y - cameraPos.y;
                    const sdz = sys.z - cameraPos.z;
                    const sDistSq = sdx*sdx + sdy*sdy + sdz*sdz;
                    if (sDistSq < minSysDistSq) {
                        minSysDistSq = sDistSq;
                        closestSystem = sys;
                    }
                    // Check planets
                    if (sys.planets) {
                        for (let p of sys.planets) {
                            const pdx = p.x - cameraPos.x;
                            const pdy = p.y - cameraPos.y;
                            const pdz = p.z - cameraPos.z;
                            const pDistSq = pdx*pdx + pdy*pdy + pdz*pdz;
                            if (pDistSq < minPlanetDistSq) {
                                minPlanetDistSq = pDistSq;
                                closestPlanet = p;
                            }
                        }
                    }
                }
            }
        }
        return { closestSystem, closestPlanet };
    }
    
    getClosestBody(cameraPos) {
        const ents = this.getClosestEntities(cameraPos);
        // Fallback backward compatibility for other files that use getClosestBody
        if (!ents.closestPlanet) return ents.closestSystem;
        if (!ents.closestSystem) return ents.closestPlanet;
        
        const pdx = ents.closestPlanet.x - cameraPos.x;
        const pdy = ents.closestPlanet.y - cameraPos.y;
        const pdz = ents.closestPlanet.z - cameraPos.z;
        
        const sdx = ents.closestSystem.x - cameraPos.x;
        const sdy = ents.closestSystem.y - cameraPos.y;
        const sdz = ents.closestSystem.z - cameraPos.z;
        
        return (pdx*pdx + pdy*pdy + pdz*pdz < sdx*sdx + sdy*sdy + sdz*sdz) ? ents.closestPlanet : ents.closestSystem;
    }
    
    update(playerX, playerY, playerZ, dt) {
        const cx = Math.floor(playerX / this.chunkSize);
        const cy = Math.floor(playerY / this.chunkSize);
        const cz = Math.floor(playerZ / this.chunkSize);
        const activeKeys = new Set();
        
        for(let x = cx - this.renderDistance; x <= cx + this.renderDistance; x++) {
            for(let y = cy - this.renderDistance; y <= cy + this.renderDistance; y++) {
                for(let z = cz - this.renderDistance; z <= cz + this.renderDistance; z++) {
                    if (Math.sqrt((x-cx)**2 + (y-cy)**2 + (z-cz)**2) <= this.renderDistance + 0.5) {
                        const key = this.getChunkKey(x, y, z);
                        activeKeys.add(key);
                        if(!this.chunks.has(key) && !this.chunkQueue.includes(key)) {
                            this.chunkQueue.push(key);
                            this.chunks.set(key, 'pending');
                        }
                    }
                }
            }
        }
        
        if (this.chunkQueue.length > 0) {
            const keyToBuild = this.chunkQueue.shift();
            if (activeKeys.has(keyToBuild)) {
                const [bx, by, bz] = keyToBuild.split(',').map(Number);
                const newChunk = new Chunk(bx, by, bz, this.scene, this.chunkSize);
                this.chunks.set(keyToBuild, newChunk);
            }
        }
        
        const ents = this.getClosestEntities({x: playerX, y: playerY, z: playerZ});

        for(let [key, chunk] of this.chunks.entries()) {
            if(!activeKeys.has(key)) {
                if(chunk !== 'pending' && chunk.dispose) chunk.dispose();
                this.chunks.delete(key);
            } else if (chunk !== 'pending') {
                const playerLx = playerX - chunk.group.position.x;
                const playerLy = playerY - chunk.group.position.y;
                const playerLz = playerZ - chunk.group.position.z;
                chunk.update(dt, playerLx, playerLy, playerLz, ents.closestSystem, ents.closestPlanet);
            }
        }
    }

    dispose() {
        for(let [key, chunk] of this.chunks.entries()) {
            if (chunk !== 'pending' && chunk.dispose) {
                chunk.dispose();
            }
        }
        this.chunks.clear();
        this.chunkQueue = [];
    }

    rebuild() {
        this.dispose();
    }
}
