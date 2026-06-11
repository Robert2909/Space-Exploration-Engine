import { CelestialBody } from './CelestialBody.js';

export class Star extends CelestialBody {
    constructor(config) {
        super(config);
        this.group = 'Estrella';
        this.sunColor = config.sunColor; // Hex color
        this.planets = config.planets || []; // Array of Planet instances
    }

    update(dt) {
        // Star doesn't move relative to its chunk, but its planets do
        for (let planet of this.planets) {
            planet.update(dt, this.lx, this.ly, this.lz);
        }
    }
}
