import { CelestialBody } from './CelestialBody.js';

export class Planet extends CelestialBody {
    constructor(config) {
        super(config);
        this.group = 'Planeta';
        this.color = config.color; // THREE.Color
        this.atmosphereDensity = config.atmosphereDensity || 0;
        this.temperature = config.temperature || 250; // Temp in Kelvin
        this.isGasGiant = config.isGasGiant || false;
        
        // Orbital mechanics parameters
        this.orbitRadius = config.orbitRadius || 0;
        this.orbitSpeed = config.orbitSpeed || 0;
        this.rotationSpeed = config.rotationSpeed || 0;
        this.angle = config.angle || 0; // Current orbital phase (True Anomaly roughly)
        
        // 3D Orbital Mechanics
        this.orbitInclination = config.orbitInclination || 0; // Tilt of the orbit relative to the ecliptic
        this.ascendingNode = config.ascendingNode || 0; // Where the orbit crosses the ecliptic
        
        // Planet's own rotation
        this.axialTilt = config.axialTilt || (config.tiltOffset || 0); // Obliquity (tilt of the pole)
        this.rotationY = config.rotationY || 0; // Current spin phase
        
        // Terrain Variance Modifiers
        this.terrainVariance = config.terrainVariance || {
            heightMod: 1.0,
            freqMod: 1.0,
            octavesMod: 0,
            exponentMod: 1.0
        };

        this.shaderParams = config.shaderParams || null;
        this.ringConfig = config.ringConfig || null;
        
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
        
        // 1. Calculate the flat 2D orbit position (on the XZ plane)
        const flatX = Math.cos(this.angle) * this.orbitRadius;
        const flatZ = Math.sin(this.angle) * this.orbitRadius;
        const flatY = 0;
        
        // 2. Apply orbital inclination (rotation around the line of nodes)
        // Ascending Node defines the axis of rotation for the inclination tilt
        const cosAsc = Math.cos(this.ascendingNode);
        const sinAsc = Math.sin(this.ascendingNode);
        const cosInc = Math.cos(this.orbitInclination);
        const sinInc = Math.sin(this.orbitInclination);

        // Apply 3D rotation matrix
        this.lx = parentLx + (cosAsc * flatX - sinAsc * cosInc * flatZ);
        this.ly = parentLy + (sinInc * flatZ);
        this.lz = parentLz + (sinAsc * flatX + cosAsc * cosInc * flatZ);
    }
}
