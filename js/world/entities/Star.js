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
        this.orbitRadius = config.orbitRadius || 0;
        this.orbitSpeed = config.orbitSpeed || 0;
        this.orbitAngle = config.orbitAngle || 0;
        this.parentLx = config.parentLx || 0;
        this.parentLy = config.parentLy || 0;
        this.parentLz = config.parentLz || 0;
        
        // Boundaries del sistema solar
        this.systemRadius = config.systemRadius || this.radius * 10;
        
        // Offset temporal determinista para animación de coronas/plasma
        this.timeOffset = Math.abs(this.lx + this.ly + this.lz) % 10000;
    }

    update(dt) {
        if (this.isCompanion) {
            this.orbitAngle += this.orbitSpeed * dt;
            this.lx = this.parentLx + Math.cos(this.orbitAngle) * this.orbitRadius;
            this.lz = this.parentLz + Math.sin(this.orbitAngle) * this.orbitRadius;
            this.ly = this.parentLy + Math.sin(this.orbitAngle) * (this.orbitRadius * 0.1); // Leve inclinación
        }
        
        // Actualizar planetas (si los hay)
        for (let planet of this.planets) {
            planet.update(dt, this.lx, this.ly, this.lz);
        }
    }
}
