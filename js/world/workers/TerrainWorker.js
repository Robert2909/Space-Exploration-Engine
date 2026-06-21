import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import { ImprovedNoise } from 'https://unpkg.com/three@0.160.0/examples/jsm/math/ImprovedNoise.js';
import { Config } from '../../core/Config.js';

const perlin = new ImprovedNoise();

function getInfiniteNoise(x, z, scale, seed) {
    const nx = x * scale;
    const nz = z * scale;
    return perlin.noise(nx, seed * 1000, nz);
}

function getHeight(x, z, seed, planetType, terrainRadius, terrainVariance) {
    const normalizedLat = Math.min(1.0, Math.abs(z / terrainRadius) / (Math.PI / 2));

    let elevation = 0;
    let amplitude = 1.0;
    let maxElevation = 0;

    let frequency = Config.TERRAIN_BASE_FREQUENCY * terrainVariance.freqMod;
    let octaves = Math.max(1, Config.TERRAIN_BASE_OCTAVES + terrainVariance.octavesMod);
    let exponent = Config.TERRAIN_BASE_EXPONENT * terrainVariance.exponentMod;
    let heightMultiplier = Config.TERRAIN_BASE_HEIGHT * terrainVariance.heightMod;

    const biome = Config.PLANET_BIOMES[planetType] || Config.PLANET_BIOMES['Planeta rocoso'];
    if (biome.terrainMods) {
        octaves = Math.max(1, Math.min(5, octaves + biome.terrainMods.octavesAdd));
        exponent *= biome.terrainMods.exponentMult;
        heightMultiplier *= biome.terrainMods.heightMult;
    }

    if (planetType === 'Planeta rocoso' || planetType === 'Ice Planet') {
        heightMultiplier += (normalizedLat * 600);
    }

    for (let i = 0; i < octaves; i++) {
        elevation += getInfiniteNoise(x, z, frequency, seed) * amplitude;
        maxElevation += amplitude;
        amplitude *= 0.5;
        frequency *= 2.0;
    }

    elevation = (elevation / maxElevation);
    const finalHeight = Math.pow(Math.abs(elevation), exponent) * Math.sign(elevation) * heightMultiplier;
    return finalHeight;
}

self.onmessage = function (e) {
    let { id, offsetX, offsetZ, chunkSize, resolution, baseColor, planetType, seed, terrainRadius, terrainVariance, positionsBuffer, colorsBuffer } = e.data;

    if (!terrainVariance) {
        terrainVariance = { heightMod: 1.0, freqMod: 1.0, octavesMod: 0, exponentMod: 1.0 };
    }

    // Modo flatShading = toNonIndexed (cada cara tiene 3 vértices únicos)
    const numQuads = resolution * resolution;
    const numTriangles = numQuads * 2;
    const numVertices = numTriangles * 3;

    const positions = new Float32Array(positionsBuffer);
    const colors = new Float32Array(colorsBuffer);

    const step = chunkSize / resolution;
    const startX = offsetX - chunkSize / 2;
    const startZ = offsetZ - chunkSize / 2;

    const colorObj = new THREE.Color();
    const parsedBaseColor = new THREE.Color(baseColor);

    // Helper para obtener datos de un vértice (posición y color)
    function getVertexData(vx, vz) {
        const vy = getHeight(vx, vz, seed, planetType, terrainRadius, terrainVariance);
        const normalizedLat = Math.min(1.0, Math.abs(vz / terrainRadius) / (Math.PI / 2));
        colorObj.copy(parsedBaseColor);

        const biome = Config.PLANET_BIOMES[planetType] || Config.PLANET_BIOMES['Planeta rocoso'];
        const a = biome.aesthetics || {};

        const dirtNoise = getInfiniteNoise(vx, vz, 0.05, seed);
        const elevationFactor = THREE.MathUtils.clamp(vy / Config.TERRAIN_BASE_HEIGHT, -0.5, 0.5);

        if (a.globalLerpColor !== undefined) {
            colorObj.lerp(new THREE.Color(a.globalLerpColor), a.globalLerpBase + normalizedLat * a.globalLerpLat);
            colorObj.offsetHSL(0, 0, dirtNoise * 0.05 + elevationFactor * 0.2);
        } else if (a.crackLevel !== undefined) {
            if (vy < a.crackLevel) colorObj.setHex(a.crackColor);
            else {
                colorObj.lerp(new THREE.Color(a.baseLerpColor), a.baseLerp);
                colorObj.offsetHSL(0, 0, dirtNoise * 0.1 + elevationFactor * 0.1);
            }
        } else if (a.waterLevel !== undefined) {
            if (vy < a.waterLevel) colorObj.setHex(a.waterColor);
            else {
                colorObj.lerp(new THREE.Color(a.beachColor), a.beachBlend);
                colorObj.offsetHSL(0, 0, dirtNoise * 0.08 + elevationFactor * 0.1);
            }
        } else if (a.invertLighting) {
            if (vy > 500) colorObj.offsetHSL(0, 0, 0.3 + dirtNoise * 0.1);
            else colorObj.offsetHSL(0, 0, -0.2 + dirtNoise * 0.1);
        } else {
            colorObj.offsetHSL(0, 0, dirtNoise * 0.08 + elevationFactor * 0.2);
            if (a.hasSnow) {
                const snowLine = 600 - (normalizedLat * 500);
                if (vy > snowLine) colorObj.lerp(new THREE.Color(0xffffff), Math.min(1, (vy - snowLine) / 200));
            }
            if (vy < -100) colorObj.lerp(new THREE.Color(0x000000), 0.2);
            if (a.hasSand && normalizedLat < 0.2) colorObj.lerp(new THREE.Color(a.sandColor), 0.3 * (1 - normalizedLat / 0.2));
        }

        return { x: vx - offsetX, y: vy, z: vz - offsetZ, r: colorObj.r, g: colorObj.g, b: colorObj.b };
    }

    let i = 0;
    for (let row = 0; row < resolution; row++) {
        for (let col = 0; col < resolution; col++) {
            const vx0 = startX + col * step;
            const vz0 = startZ + row * step;
            const vx1 = startX + (col + 1) * step;
            const vz1 = startZ + (row + 1) * step;

            const v00 = getVertexData(vx0, vz0); // Top-Left
            const v10 = getVertexData(vx1, vz0); // Top-Right
            const v01 = getVertexData(vx0, vz1); // Bottom-Left
            const v11 = getVertexData(vx1, vz1); // Bottom-Right

            // T1: 00 -> 01 -> 10
            positions[i] = v00.x; positions[i + 1] = v00.y; positions[i + 2] = v00.z;
            colors[i] = v00.r; colors[i + 1] = v00.g; colors[i + 2] = v00.b;
            i += 3;

            positions[i] = v01.x; positions[i + 1] = v01.y; positions[i + 2] = v01.z;
            colors[i] = v01.r; colors[i + 1] = v01.g; colors[i + 2] = v01.b;
            i += 3;

            positions[i] = v10.x; positions[i + 1] = v10.y; positions[i + 2] = v10.z;
            colors[i] = v10.r; colors[i + 1] = v10.g; colors[i + 2] = v10.b;
            i += 3;

            // Triángulo 2: 10 -> 01 -> 11
            positions[i] = v10.x; positions[i + 1] = v10.y; positions[i + 2] = v10.z;
            colors[i] = v10.r; colors[i + 1] = v10.g; colors[i + 2] = v10.b;
            i += 3;

            positions[i] = v01.x; positions[i + 1] = v01.y; positions[i + 2] = v01.z;
            colors[i] = v01.r; colors[i + 1] = v01.g; colors[i + 2] = v01.b;
            i += 3;

            positions[i] = v11.x; positions[i + 1] = v11.y; positions[i + 2] = v11.z;
            colors[i] = v11.r; colors[i + 1] = v11.g; colors[i + 2] = v11.b;
            i += 3;
        }
    }

    // FASE 3: Solo enviamos el ID porque la memoria (SharedArrayBuffer) ya fue actualizada in-place
    self.postMessage({ id });
};
