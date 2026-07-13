import { CelestialBody } from './CelestialBody.js';

export class Star extends CelestialBody {
    constructor(config) {
        super(config);
        this.group = 'Estrella';
        this.sunColor = config.sunColor; // Hex color
        this.planets = config.planets || []; // Array of Planet instances
        
        // Procedural specific properties
        this.temperature = config.temperature || 5000;
        this.activity = config.activity || 1.0;
        this.luminosity = config.luminosity || 1.0;
        
        // Propiedades para Sistemas Binarios
        this.isCompanion = config.isCompanion || false;
        this.isPrimaryBinary = config.isPrimaryBinary || false;
        this.orbitRadius = config.orbitRadius || 0;
        this.orbitSpeed = config.orbitSpeed || 0;
        this.orbitAngle = config.orbitAngle || 0;
        this.parentLx = config.parentLx !== undefined ? config.parentLx : this.lx;
        this.parentLy = config.parentLy !== undefined ? config.parentLy : this.ly;
        this.parentLz = config.parentLz !== undefined ? config.parentLz : this.lz;
        
        // Boundaries del sistema solar
        this.systemRadius = config.systemRadius || this.radius * 10;
        
        // Offset temporal determinista para animación de coronas/plasma
        this.timeOffset = Math.abs(this.lx + this.ly + this.lz) % 10000;
    }

    update(dt) {
        if (this.isCompanion || this.isPrimaryBinary) {
            this.orbitAngle += this.orbitSpeed * dt;
            this.lx = this.parentLx + Math.cos(this.orbitAngle) * this.orbitRadius;
            this.lz = this.parentLz + Math.sin(this.orbitAngle) * this.orbitRadius;
            this.ly = this.parentLy + Math.sin(this.orbitAngle) * (this.orbitRadius * 0.1); // Leve inclinación
        }
        
        // Actualizar planetas (si los hay)
        // En sistemas binarios cerrados (P-Type), los planetas orbitan el centro de masa (barycenter)
        const centerLx = this.isPrimaryBinary ? this.parentLx : this.lx;
        const centerLy = this.isPrimaryBinary ? this.parentLy : this.ly;
        const centerLz = this.isPrimaryBinary ? this.parentLz : this.lz;

        for (let planet of this.planets) {
            planet.update(dt, centerLx, centerLy, centerLz);
        }
    }
}
