import * as THREE from 'three';
import { ImprovedNoise } from 'https://unpkg.com/three@0.160.0/examples/jsm/math/ImprovedNoise.js';

export class TerrainGenerator {
    constructor(worldSize, seed, planetType = 'Rocky Planet', terrainRadius = 50000) {
        this.worldSize = worldSize;
        this.seed = seed || Math.random();
        this.perlin = new ImprovedNoise();
        this.planetType = planetType;
        this.terrainRadius = terrainRadius;
    }

    // Función para obtener ruido infinito basado en la semilla
    getInfiniteNoise(x, z, scale) {
        const nx = x * scale;
        const nz = z * scale;
        // Usamos la semilla como offset en Y para que planetas distintos tengan relieves distintos
        return this.perlin.noise(nx, this.seed * 1000, nz);
    }

    getHeight(x, z) {
        const normalizedLat = Math.min(1.0, Math.abs(z / this.terrainRadius) / (Math.PI / 2));

        let elevation = 0;
        let amplitude = 1.0;
        let frequency = 0.0005; 
        let maxElevation = 0;

        let octaves = 4;
        let exponent = 1.5;
        let heightMultiplier = 800;

        if (this.planetType === 'Ocean Planet') {
            octaves = 3;
            exponent = 1.2;
            heightMultiplier = 300;
        } else if (this.planetType === 'Lava Planet') {
            octaves = 5;
            exponent = 2.0;
            heightMultiplier = 1200;
        } else if (this.planetType === 'Crystal Planet') {
            octaves = 4;
            exponent = 3.0; // Picos escarpados
            heightMultiplier = 1500;
        } else if (this.planetType === 'Ice Planet') {
            octaves = 3;
            exponent = 1.0;
            heightMultiplier = 500;
        }

        // Variación por Latitud (Ecuador más plano, Polos más montañosos)
        if (this.planetType === 'Rocky Planet' || this.planetType === 'Ice Planet') {
            heightMultiplier += (normalizedLat * 600);
        }

        // Octavas de ruido fractal
        for (let i = 0; i < octaves; i++) {
            elevation += this.getInfiniteNoise(x, z, frequency) * amplitude;
            maxElevation += amplitude;
            amplitude *= 0.5;
            frequency *= 2.0;
        }

        elevation = (elevation / maxElevation);
        const finalHeight = Math.pow(Math.abs(elevation), exponent) * Math.sign(elevation) * heightMultiplier; 
        return finalHeight;
    }

    createChunkGeometry(offsetX, offsetZ, chunkSize, resolution, baseColor) {
        let geometry = new THREE.PlaneGeometry(chunkSize, chunkSize, resolution, resolution);
        geometry.rotateX(-Math.PI / 2);
        geometry = geometry.toNonIndexed(); // Necesario para que flatShading funcione (Low-Poly)

        const pos = geometry.attributes.position;
        const colors = [];
        const colorObj = new THREE.Color();

        for (let i = 0; i < pos.count; i++) {
            const vx = pos.getX(i) + offsetX;
            const vz = pos.getZ(i) + offsetZ;
            const vy = this.getHeight(vx, vz);
            pos.setY(i, vy);

            const normalizedLat = Math.min(1.0, Math.abs(vz / this.terrainRadius) / (Math.PI / 2));
            colorObj.copy(baseColor || new THREE.Color(0x888888));

            // Colorear Biomas por altura y latitud
            if (this.planetType === 'Ice Planet') {
                colorObj.lerp(new THREE.Color(0xffffff), 0.5 + normalizedLat * 0.5);
            } else if (this.planetType === 'Lava Planet') {
                if (vy < -100) colorObj.setHex(0xff3300); // Lava en grietas
                else colorObj.lerp(new THREE.Color(0x1a1a1a), 0.9);
            } else if (this.planetType === 'Ocean Planet') {
                if (vy < 0) colorObj.setHex(0x1144aa);
                else colorObj.lerp(new THREE.Color(0xddccaa), 0.6); // Islas de arena
            } else if (this.planetType === 'Crystal Planet') {
                if (vy > 500) colorObj.offsetHSL(0, 0, 0.3);
                else colorObj.offsetHSL(0, 0, -0.2);
            } else {
                // Rocky Planet
                const snowLine = 600 - (normalizedLat * 500); 
                if (vy > snowLine) {
                    colorObj.lerp(new THREE.Color(0xffffff), Math.min(1, (vy - snowLine) / 200));
                } else if (vy < -100) {
                    colorObj.lerp(new THREE.Color(0x000000), 0.2);
                }
                if (normalizedLat < 0.2) { // Ecuador arenoso
                    colorObj.lerp(new THREE.Color(0xddbb55), 0.3 * (1 - normalizedLat/0.2));
                }
            }
            colors.push(colorObj.r, colorObj.g, colorObj.b);
        }

        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        geometry.computeVertexNormals();
        return geometry;
    }
}
