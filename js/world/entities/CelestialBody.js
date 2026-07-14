import * as THREE from 'three';

export class CelestialBody {
    constructor(config) {
        this.name = config.name || 'Unknown';
        this.type = config.type || 'Celestial Body';
        this.group = config.group || 'CelestialBody';
        this.radius = config.radius || 100;
        
        // UI Telemetry Attributes
        this.icon = config.icon || '○';
        this.colorString = config.colorString || '#ffffff';

        // Local position within the Chunk
        this.lx = config.lx || 0;
        this.ly = config.ly || 0;
        this.lz = config.lz || 0;
        
        // Absolute position in the universe (Calculated dynamically when queried)
        this.x = 0;
        this.y = 0;
        this.z = 0;
    }

    /**
     * @param {number} cx - Chunk X absolute position
     * @param {number} cy - Chunk Y absolute position
     * @param {number} cz - Chunk Z absolute position
     */
    updateAbsolutePosition(cx, cy, cz) {
        this.x = this.lx + cx;
        this.y = this.ly + cy;
        this.z = this.lz + cz;
    }

    update(dt) {
        // Base method to be overridden
    }
}
