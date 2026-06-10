import * as THREE from 'three';
import { ImprovedNoise } from 'https://unpkg.com/three@0.160.0/examples/jsm/math/ImprovedNoise.js';

export class TerrainGenerator {
    constructor(worldSize, seed) {
        this.worldSize = worldSize;
        this.seed = seed || Math.random();
        this.perlin = new ImprovedNoise();
    }

    // Función para obtener ruido infinito basado en la semilla
    getInfiniteNoise(x, z, scale) {
        const nx = x * scale;
        const nz = z * scale;
        // Usamos la semilla como offset en Y para que planetas distintos tengan relieves distintos
        return this.perlin.noise(nx, this.seed * 1000, nz);
    }

    getHeight(x, z) {
        let elevation = 0;
        let amplitude = 1.0;
        let frequency = 0.0005; // Ajustado para mundos masivos
        let maxElevation = 0;

        // 4 Octavas de ruido fractal
        for (let i = 0; i < 4; i++) {
            elevation += this.getInfiniteNoise(x, z, frequency) * amplitude;
            maxElevation += amplitude;
            amplitude *= 0.5;
            frequency *= 2.0;
        }

        // Normalizar y exagerar la altura
        elevation = (elevation / maxElevation);
        
        // Hacer las montañas más planas abajo y empinadas arriba
        const finalHeight = Math.pow(Math.abs(elevation), 1.5) * Math.sign(elevation) * 800; // Escala vertical más grande

        return finalHeight;
    }

    createChunkGeometry(offsetX, offsetZ, chunkSize, resolution) {
        let geometry = new THREE.PlaneGeometry(chunkSize, chunkSize, resolution, resolution);
        geometry.rotateX(-Math.PI / 2);
        geometry = geometry.toNonIndexed(); // Necesario para que flatShading funcione (Low-Poly)

        const pos = geometry.attributes.position;
        for (let i = 0; i < pos.count; i++) {
            const vx = pos.getX(i) + offsetX;
            const vz = pos.getZ(i) + offsetZ;
            const vy = this.getHeight(vx, vz);
            pos.setY(i, vy);
        }

        geometry.computeVertexNormals();
        return geometry;
    }
}
