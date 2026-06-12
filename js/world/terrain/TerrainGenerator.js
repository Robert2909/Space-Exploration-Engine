import * as THREE from 'three';
import { ImprovedNoise } from 'https://unpkg.com/three@0.160.0/examples/jsm/math/ImprovedNoise.js';
import { Config } from '../../core/Config.js';

export class TerrainGenerator {
    constructor(worldSize, seed, planetType = 'Rocky Planet', terrainRadius = 50000, terrainVariance = null) {
        this.worldSize = worldSize;
        this.seed = seed || Math.random();
        this.perlin = new ImprovedNoise();
        this.planetType = planetType;
        this.terrainRadius = terrainRadius;
        this.terrainVariance = terrainVariance || {
            heightMod: 1.0, freqMod: 1.0, octavesMod: 0, exponentMod: 1.0
        };
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
        let maxElevation = 0;

        // 1. Tomar bases matemáticas del Config
        // 2. Aplicar la Varianza Aleatoria ÚNICA de este planeta (anomalías geológicas dentro de los límites)
        let frequency = Config.TERRAIN_BASE_FREQUENCY * this.terrainVariance.freqMod; 
        let octaves = Math.max(1, Config.TERRAIN_BASE_OCTAVES + this.terrainVariance.octavesMod);
        let exponent = Config.TERRAIN_BASE_EXPONENT * this.terrainVariance.exponentMod;
        let heightMultiplier = Config.TERRAIN_BASE_HEIGHT * this.terrainVariance.heightMod;

        // 3. Aplicar modificadores radicales leyendo el Diccionario (Data-Driven)
        const biome = Config.PLANET_BIOMES[this.planetType] || Config.PLANET_BIOMES['Rocky Planet'];
        if (biome.terrainMods) {
            octaves = Math.max(1, Math.min(5, octaves + biome.terrainMods.octavesAdd));
            exponent *= biome.terrainMods.exponentMult;
            heightMultiplier *= biome.terrainMods.heightMult;
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

            // Leer datos del diccionario
            const biome = Config.PLANET_BIOMES[this.planetType] || Config.PLANET_BIOMES['Rocky Planet'];
            const a = biome.aesthetics || {};

            // Textura Falsa mediante Ruido (Manchas en el terreno)
            const dirtNoise = this.getInfiniteNoise(vx, vz, 0.05); // Alta frecuencia
            
            // Gradiente general por altura (Sombras/Luces falsas para resaltar planicies)
            const elevationFactor = THREE.MathUtils.clamp(vy / Config.TERRAIN_BASE_HEIGHT, -0.5, 0.5);

            // 1. Aplicar Patrones Estéticos Especiales
            if (a.globalLerpColor !== undefined) {
                colorObj.lerp(new THREE.Color(a.globalLerpColor), a.globalLerpBase + normalizedLat * a.globalLerpLat);
                colorObj.offsetHSL(0, 0, dirtNoise * 0.05 + elevationFactor * 0.2);
            } else if (a.crackLevel !== undefined) {
                if (vy < a.crackLevel) colorObj.setHex(a.crackColor); // Lava en grietas
                else {
                    colorObj.lerp(new THREE.Color(a.baseLerpColor), a.baseLerp);
                    colorObj.offsetHSL(0, 0, dirtNoise * 0.1 + elevationFactor * 0.1);
                }
            } else if (a.waterLevel !== undefined) {
                if (vy < a.waterLevel) colorObj.setHex(a.waterColor); // Océano
                else {
                    colorObj.lerp(new THREE.Color(a.beachColor), a.beachBlend); // Islas de arena
                    colorObj.offsetHSL(0, 0, dirtNoise * 0.08 + elevationFactor * 0.1);
                }
            } else if (a.invertLighting) {
                if (vy > 500) colorObj.offsetHSL(0, 0, 0.3 + dirtNoise * 0.1); // Picos de cristal
                else colorObj.offsetHSL(0, 0, -0.2 + dirtNoise * 0.1);
            } 
            // 2. Patrón de Terreno Estándar (Rocky, Desert, Toxic, Jungle, Barren)
            else {
                colorObj.offsetHSL(0, 0, dirtNoise * 0.08 + elevationFactor * 0.2);

                if (a.hasSnow) {
                    const snowLine = 600 - (normalizedLat * 500); 
                    if (vy > snowLine) {
                        colorObj.lerp(new THREE.Color(0xffffff), Math.min(1, (vy - snowLine) / 200));
                    }
                }
                
                if (vy < -100) { // Valles oscuros
                    colorObj.lerp(new THREE.Color(0x000000), 0.2);
                }
                
                if (a.hasSand && normalizedLat < 0.2) { // Ecuador arenoso
                    colorObj.lerp(new THREE.Color(a.sandColor), 0.3 * (1 - normalizedLat/0.2));
                }
            }
            colors.push(colorObj.r, colorObj.g, colorObj.b);
        }

        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        geometry.computeVertexNormals();
        return geometry;
    }
}
