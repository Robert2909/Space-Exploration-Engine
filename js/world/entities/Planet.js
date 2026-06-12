import { CelestialBody } from './CelestialBody.js';

export class Planet extends CelestialBody {
    constructor(config) {
        super(config);
        this.group = 'Planeta';
        this.color = config.color; // THREE.Color
        this.atmosphereDensity = config.atmosphereDensity || 0;
        
        // Orbital mechanics parameters
        this.orbitRadius = config.orbitRadius || 0;
        this.orbitSpeed = config.orbitSpeed || 0;
        this.rotationSpeed = config.rotationSpeed || 0;
        this.angle = config.angle || 0;
        this.tiltOffset = config.tiltOffset || 0;
        this.rotationY = config.rotationY || 0;
        
        // Terrain Variance Modifiers
        this.terrainVariance = config.terrainVariance || {
            heightMod: 1.0,
            freqMod: 1.0,
            octavesMod: 0,
            exponentMod: 1.0
        };
        
        // Instanced rendering specific
        this.instanceId = config.instanceId !== undefined ? config.instanceId : -1;
    }

    /**
     * @param {number} dt - Delta time
     * @param {number} parentLx - Parent Star's local chunk X
     * @param {number} parentLy - Parent Star's local chunk Y
     * @param {number} parentLz - Parent Star's local chunk Z
     */
    update(dt, parentLx, parentLy, parentLz) {
        this.angle += this.orbitSpeed * dt;
        this.rotationY += dt * this.rotationSpeed;
        
        // Position relative to parent star (and therefore relative to Chunk)
        this.lx = parentLx + Math.cos(this.angle) * this.orbitRadius;
        this.lz = parentLz + Math.sin(this.angle) * this.orbitRadius;
        this.ly = parentLy + Math.sin(this.angle + this.tiltOffset) * (this.orbitRadius * 0.1);
    }
}
