import * as THREE from 'three';
import { seededRandom } from '../../utils/MathUtils.js';
import { generateStarName, generatePlanetName, generateBlackHoleName } from '../generators/NameGenerator.js';
import { Config } from '../../core/Config.js';
import { Star } from '../entities/Star.js';
import { PlanetShaderMaterial } from '../materials/PlanetShader.js';
import { getRingShaderMaterial } from '../materials/RingShader.js';
import { Planet } from '../entities/Planet.js';
import { BlackHole } from '../entities/BlackHole.js';

export const SHARED_SPHERE_GEO = new THREE.IcosahedronGeometry(1, 1); // 80 faces, super fast
export const SHARED_HIGH_POLY_GEO = new THREE.SphereGeometry(1, 128, 128);
export const SHARED_HIGH_RES_MAT = PlanetShaderMaterial;

const SHARED_ASTEROID_GEO = new THREE.IcosahedronGeometry(1, 0); // Low-poly para asteroides
const SHARED_STAR_MAT = new THREE.PointsMaterial({
    size: Config.RENDER_STAR_POINT_SIZE, vertexColors: true, transparent: true, opacity: 0.9, sizeAttenuation: true
});
const SHARED_ASTEROID_MAT = new THREE.MeshBasicMaterial({ color: 0x888888 });

const SHARED_PLANET_MAT = new THREE.MeshLambertMaterial({ color: 0xffffff });
const dummy = new THREE.Object3D();

function createGlowTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 64; canvas.height = 64;
    const context = canvas.getContext('2d');
    const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.3, 'rgba(255,255,255,0.9)');
    gradient.addColorStop(0.6, 'rgba(255,255,255,0.4)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(canvas);
}
const SHARED_SUN_TEXTURE = createGlowTexture();

export class Chunk {
    constructor(cx, cy, cz, scene, chunkSize) {
        this.cx = cx; this.cy = cy; this.cz = cz;
        this.scene = scene; this.size = chunkSize;
        this.group = new THREE.Group();
        this.group.position.set(cx * this.size, cy * this.size, cz * this.size);
        if (this.scene) {
            this.scene.add(this.group);
        }
        this.systems = [];
        this.planetMesh = null;
        this.generate();
    }

    generate() {
        this.generateStarfield();
        this.generateSystems();
    }

    static getMockSystemsData(cx, cy, cz, size) {
        const systems = [];
        const hasBlackHole = seededRandom(cx, cy, cz, 500) > (1 - Config.BLACK_HOLE_SPAWN_CHANCE);
        if (hasBlackHole) {
            const bhSeed = cx * 73856 + cy * 1920 + cz * 8831 + Config.UNIVERSE_SEED_OFFSET;
            const lx = (seededRandom(cx, cy, cz, bhSeed) - 0.5) * size * 0.8;
            const ly = (seededRandom(cx, cy, cz, bhSeed + 1) - 0.5) * size * 0.8;
            const lz = (seededRandom(cx, cy, cz, bhSeed + 2) - 0.5) * size * 0.8;

            let bhSizeMult = 1.0 + seededRandom(cx, cy, cz, bhSeed + 9) * Config.BLACK_HOLE_SIZE_MULT_NORMAL;
            let isUltraMassive = false;
            if (seededRandom(cx, cy, cz, bhSeed + 10) > (1 - Config.BLACK_HOLE_ULTRA_MASSIVE_CHANCE)) {
                bhSizeMult = Config.BLACK_HOLE_SIZE_MULT_NORMAL + seededRandom(cx, cy, cz, bhSeed + 11) * (Config.BLACK_HOLE_SIZE_MULT_ULTRA - Config.BLACK_HOLE_SIZE_MULT_NORMAL);
                isUltraMassive = true;
            }
            const radius = Config.STAR_RADIUS_MAX * (1 + seededRandom(cx, cy, cz, bhSeed + 3) * Config.BLACK_HOLE_BASE_RADIUS_VAR) * bhSizeMult;
            const finalName = generateBlackHoleName(bhSeed, cx, cy, cz, isUltraMassive);

            systems.push({
                isMock: true,
                group: 'BlackHole',
                type: 'Agujero Negro',
                name: finalName,
                radius: radius,
                lx: lx, ly: ly, lz: lz,
                planets: []
            });
            return systems;
        }

        const hasSystem = seededRandom(cx, cy, cz, 100) > (1 - Config.SYSTEM_SPAWN_CHANCE);
        if (hasSystem || (cx === 0 && cy === 0 && cz === 0)) {
            const numSystems = Math.floor(seededRandom(cx, cy, cz, 101) * Config.MAX_SYSTEMS_PER_CHUNK) + 1;
            for (let i = 0; i < numSystems; i++) {
                const seedBase = 200 + i * 10;
                const lx = (seededRandom(cx, cy, cz, seedBase) - 0.5) * size * 0.8;
                const ly = (seededRandom(cx, cy, cz, seedBase + 1) - 0.5) * size * 0.8;
                const lz = (seededRandom(cx, cy, cz, seedBase + 2) - 0.5) * size * 0.8;
                const starName = generateStarName(seedBase + 13, cx, cy, cz);
                const starTypeRand = seededRandom(cx, cy, cz, seedBase + 3);
                let cumulative = 1.0;
                let starType = 'Yellow Dwarf'; 
                for (const [sName, sData] of Object.entries(Config.STAR_TYPES)) {
                    cumulative -= sData.chance;
                    if (starTypeRand > cumulative) {
                        starType = sName;
                        break;
                    }
                }
                const starRadius = Config.STAR_RADIUS_MIN + seededRandom(cx, cy, cz, seedBase + 5) * (Config.STAR_RADIUS_MAX - Config.STAR_RADIUS_MIN);
                
                const planetsData = [];
                const numPlanets = Math.floor(seededRandom(cx, cy, cz, seedBase + 6) * Config.PLANETS_MAX_PER_SYSTEM) + 1;
                const systemPlanetNames = [];
                for (let j = 0; j < numPlanets; j++) {
                    const pSeed = seedBase + 20 + j;
                    const pName = generatePlanetName(starName, j, pSeed + 13, cx, cy, cz, systemPlanetNames);
                    systemPlanetNames.push(pName);
                    const typeRand = seededRandom(cx, cy, cz, pSeed + 20);
                    let pCumulative = 1.0;
                    let pType = 'Planeta rocoso'; // Fallback
                    for (const [biomeName, biomeData] of Object.entries(Config.PLANET_BIOMES)) {
                        if (biomeName !== 'Planeta rocoso') {
                            pCumulative -= biomeData.chance;
                            if (typeRand > pCumulative) {
                                pType = biomeName;
                                break;
                            }
                        }
                    }
                    const biome = Config.PLANET_BIOMES[pType] || Config.PLANET_BIOMES['Planeta rocoso'];
                    const isGasGiant = biome.isGasGiant === true;

                    const pRadiusBase = isGasGiant ? (Config.PLANET_GAS_RADIUS_MIN + seededRandom(cx, cy, cz, pSeed + 6) * (Config.PLANET_GAS_RADIUS_MAX - Config.PLANET_GAS_RADIUS_MIN)) : (Config.PLANET_ROCKY_RADIUS_MIN + seededRandom(cx, cy, cz, pSeed + 7) * (Config.PLANET_ROCKY_RADIUS_MAX - Config.PLANET_ROCKY_RADIUS_MIN));
                    const pRadius = pRadiusBase * (biome.radiusMult !== undefined ? biome.radiusMult : 1.0);
                    
                    const orbitRadius = starRadius * 1.5 + Config.ORBIT_DISTANCE_START + j * (Config.ORBIT_DISTANCE_SPACING + seededRandom(cx, cy, cz, pSeed + 8) * Config.ORBIT_DISTANCE_VAR);
                    const startAngle = seededRandom(cx, cy, cz, pSeed + 11) * Math.PI * 2;
                    
                    planetsData.push({
                        isMock: true,
                        group: 'Planet',
                        type: pType,
                        name: pName,
                        radius: pRadius,
                        lx: lx + Math.cos(startAngle) * orbitRadius,
                        ly: ly,
                        lz: lz + Math.sin(startAngle) * orbitRadius
                    });
                }

                systems.push({
                    isMock: true,
                    group: 'Star',
                    type: starType,
                    name: starName,
                    radius: starRadius,
                    lx: lx, ly: ly, lz: lz,
                    planets: planetsData
                });
            }
        }
        return systems;
    }

    generateStarfield() {
        const starsGeometry = new THREE.BufferGeometry();
        const starsCount = Config.STARS_PER_CHUNK;
        const posArray = new Float32Array(starsCount * 3);
        const colorArray = new Float32Array(starsCount * 3);
        const color1 = new THREE.Color('#ffffff');
        const color2 = new THREE.Color('#aaddff');
        const color3 = new THREE.Color('#ffccaa');

        for (let i = 0; i < starsCount; i++) {
            posArray[i * 3] = (seededRandom(this.cx, this.cy, this.cz, i * 3) - 0.5) * this.size;
            posArray[i * 3 + 1] = (seededRandom(this.cx, this.cy, this.cz, i * 3 + 1) - 0.5) * this.size;
            posArray[i * 3 + 2] = (seededRandom(this.cx, this.cy, this.cz, i * 3 + 2) - 0.5) * this.size;
            const randColor = seededRandom(this.cx, this.cy, this.cz, i * 4);
            let c = color1;
            if (randColor > 0.8) c = color2;
            else if (randColor > 0.6) c = color3;
            colorArray[i * 3] = c.r; colorArray[i * 3 + 1] = c.g; colorArray[i * 3 + 2] = c.b;
        }
        starsGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
        starsGeometry.setAttribute('color', new THREE.BufferAttribute(colorArray, 3));
        starsGeometry.computeBoundingSphere(); // TRUCO: Calcular límites para ocultar los que no miras
        const starMesh = new THREE.Points(starsGeometry, SHARED_STAR_MAT);
        starMesh.frustumCulled = true; // Activar descarte por cámara
        this.group.add(starMesh);
    }

    generateSystems() {
        const hasBlackHole = seededRandom(this.cx, this.cy, this.cz, 500) > (1 - Config.BLACK_HOLE_SPAWN_CHANCE);
        if (hasBlackHole) {
            const bhSeed = this.cx * 73856 + this.cy * 1920 + this.cz * 8831 + Config.UNIVERSE_SEED_OFFSET;
            const lx = (seededRandom(this.cx, this.cy, this.cz, bhSeed) - 0.5) * this.size * 0.8;
            const ly = (seededRandom(this.cx, this.cy, this.cz, bhSeed + 1) - 0.5) * this.size * 0.8;
            const lz = (seededRandom(this.cx, this.cy, this.cz, bhSeed + 2) - 0.5) * this.size * 0.8;

            let bhSizeMult = 1.0 + seededRandom(this.cx, this.cy, this.cz, bhSeed + 9) * Config.BLACK_HOLE_SIZE_MULT_NORMAL;
            let isUltraMassive = false;

            if (seededRandom(this.cx, this.cy, this.cz, bhSeed + 10) > (1 - Config.BLACK_HOLE_ULTRA_MASSIVE_CHANCE)) {
                bhSizeMult = Config.BLACK_HOLE_SIZE_MULT_NORMAL + seededRandom(this.cx, this.cy, this.cz, bhSeed + 11) * (Config.BLACK_HOLE_SIZE_MULT_ULTRA - Config.BLACK_HOLE_SIZE_MULT_NORMAL);
                isUltraMassive = true;
            }
            const radius = Config.STAR_RADIUS_MAX * (1 + seededRandom(this.cx, this.cy, this.cz, bhSeed + 3) * Config.BLACK_HOLE_BASE_RADIUS_VAR) * bhSizeMult;

            const finalName = generateBlackHoleName(bhSeed, this.cx, this.cy, this.cz, isUltraMassive);

            const blackHole = new BlackHole({
                name: finalName,
                radius: radius,
                lx: lx, ly: ly, lz: lz
            });
            this.systems.push(blackHole);
            this.group.add(blackHole.mesh);
            return; // Si hay blackHole, devora todo lo demás, no hay estrellas normales.
        }

        const hasSystem = seededRandom(this.cx, this.cy, this.cz, 100) > (1 - Config.SYSTEM_SPAWN_CHANCE);
        if (hasSystem || (this.cx === 0 && this.cy === 0 && this.cz === 0)) {
            const numSystems = Math.floor(seededRandom(this.cx, this.cy, this.cz, 101) * Config.MAX_SYSTEMS_PER_CHUNK) + 1;
            const systemsData = [];
            let totalPlanets = 0;
            let totalAsteroids = 0;

            for (let i = 0; i < numSystems; i++) {
                const seedBase = 200 + i * 10;
                const lx = (seededRandom(this.cx, this.cy, this.cz, seedBase) - 0.5) * this.size * 0.8;
                const ly = (seededRandom(this.cx, this.cy, this.cz, seedBase + 1) - 0.5) * this.size * 0.8;
                const lz = (seededRandom(this.cx, this.cy, this.cz, seedBase + 2) - 0.5) * this.size * 0.8;
                const starName = generateStarName(seedBase + 13, this.cx, this.cy, this.cz);
                const starTypeRand = seededRandom(this.cx, this.cy, this.cz, seedBase + 3);
                let cumulative = 1.0;
                let starType = 'Yellow Dwarf'; // Fallback
                let starData = Config.STAR_TYPES['Yellow Dwarf'];

                for (const [sName, sData] of Object.entries(Config.STAR_TYPES)) {
                    cumulative -= sData.chance;
                    if (starTypeRand > cumulative) {
                        starType = sName;
                        starData = sData;
                        break;
                    }
                }

                let sunColorObj = new THREE.Color();
                sunColorObj.setHSL(
                    starData.hueBase + seededRandom(this.cx, this.cy, this.cz, seedBase + 10) * starData.hueVar,
                    starData.sat,
                    starData.litBase + seededRandom(this.cx, this.cy, this.cz, seedBase + 11) * starData.litVar
                );
                const sunColor = sunColorObj.getHex();

                const baseRadius = Config.STAR_RADIUS_MIN + seededRandom(this.cx, this.cy, this.cz, seedBase + 5) * (Config.STAR_RADIUS_MAX - Config.STAR_RADIUS_MIN);
                const sunRadius = baseRadius * (starData.radiusMultMin + seededRandom(this.cx, this.cy, this.cz, seedBase + 6) * (starData.radiusMultMax - starData.radiusMultMin));
                const numPlanets = Math.floor(seededRandom(this.cx, this.cy, this.cz, seedBase + 6) * Config.PLANETS_MAX_PER_SYSTEM) + 1;
                const planets = [];
                const systemPlanetNames = [];

                for (let j = 0; j < numPlanets; j++) {
                    const pSeed = seedBase + 20 + j;
                    const pName = generatePlanetName(starName, j, pSeed + 13, this.cx, this.cy, this.cz, systemPlanetNames);
                    systemPlanetNames.push(pName);
                    const hue = seededRandom(this.cx, this.cy, this.cz, pSeed);
                    const typeRand = seededRandom(this.cx, this.cy, this.cz, pSeed + 20);
                    let pCumulative = 1.0;
                    let pType = 'Planeta rocoso'; // Fallback

                    for (const [biomeName, biomeData] of Object.entries(Config.PLANET_BIOMES)) {
                        if (biomeName !== 'Planeta rocoso') {
                            pCumulative -= biomeData.chance;
                            if (typeRand > pCumulative) {
                                pType = biomeName;
                                break;
                            }
                        }
                    }

                    const biome = Config.PLANET_BIOMES[pType] || Config.PLANET_BIOMES['Planeta rocoso'];
                    const isGasGiant = biome.isGasGiant === true;

                    let pColor = new THREE.Color();
                    let atmosphereDensity = 0;
                    let shaderParams = {};

                    if (isGasGiant) {
                        let targetHue = hue;
                        let targetSat = 0.7 + seededRandom(this.cx, this.cy, this.cz, pSeed + 1) * 0.3;
                        let targetLit = 0.4 + seededRandom(this.cx, this.cy, this.cz, pSeed + 2) * 0.4;
                        
                        if (biome.hueBase !== undefined) {
                            targetHue = (biome.hueBase + (seededRandom(this.cx, this.cy, this.cz, pSeed + 10) * biome.hueVar)) % 1.0;
                        }
                        if (biome.sat !== undefined) targetSat = biome.sat;
                        if (biome.lit !== undefined) targetLit = biome.lit;
                        
                        pColor.setHSL(targetHue, targetSat, targetLit);
                        atmosphereDensity = 0.001; // Densidad enorme para gaseosos (aunque no aterricemos)
                        
                        shaderParams = {
                            colorLow: pColor.clone().offsetHSL(0, 0, -0.2),
                            colorHigh: pColor.clone().offsetHSL(0, 0, 0.2),
                            cloudColor: pColor.clone().offsetHSL(0.05, 0.2, 0.1),
                            noiseFreq: (1.0 + seededRandom(this.cx, this.cy, this.cz, pSeed + 40) * 1.5) * Config.PLANET_TEXTURE_RESOLUTION_MULT, // Gigantes tienen bandas grandes
                            cloudDensity: 0.1, // Prácticamente todo gas
                            atmosphere: 1.5,
                            warpStrength: (biome.warpBase || 4.0) + seededRandom(this.cx, this.cy, this.cz, pSeed + 41) * (biome.warpVar !== undefined ? biome.warpVar : 3.0),
                            stretchY: (biome.stretchBase || 3.0) + seededRandom(this.cx, this.cy, this.cz, pSeed + 42) * (biome.stretchVar !== undefined ? biome.stretchVar : 5.0)
                        };
                    } else {
                        // Leer datos del registro (Data-Driven Pattern)
                        const biome = Config.PLANET_BIOMES[pType] || Config.PLANET_BIOMES['Planeta rocoso'];

                        // Color base procedural
                        let pSat = biome.sat !== undefined ? biome.sat : (biome.satRandomBase + seededRandom(this.cx, this.cy, this.cz, pSeed + 1) * biome.satRandomMult);
                        let pLit = biome.lit !== undefined ? biome.lit : (biome.litRandomBase + seededRandom(this.cx, this.cy, this.cz, pSeed + 2) * biome.litRandomMult);
                        let pHue = biome.useSystemHue ? hue : (biome.hueBase + seededRandom(this.cx, this.cy, this.cz, pSeed) * biome.hueVar);
                        pColor.setHSL(pHue, pSat, pLit);

                        // Densidad atmosférica
                        if (biome.atmoChance) {
                            if (seededRandom(this.cx, this.cy, this.cz, pSeed + 13) <= biome.atmoChance) {
                                atmosphereDensity = biome.atmoBase + seededRandom(this.cx, this.cy, this.cz, pSeed + 14) * biome.atmoVar;
                            }
                        } else if (biome.atmoBase !== undefined) {
                            atmosphereDensity = biome.atmoBase + seededRandom(this.cx, this.cy, this.cz, pSeed + 14) * (biome.atmoVar || 0);
                        }
                        
                        let colorLow = pColor.clone().offsetHSL(0, 0, -0.3);
                        let colorHigh = pColor.clone();
                        let cloudColor = new THREE.Color(0xffffff); // Nubes blancas por defecto
                        let hasClouds = atmosphereDensity > 0.0001;
                        
                        // Adaptar shaderParams a la estética del bioma
                        if (biome.aesthetics) {
                             if (biome.aesthetics.waterColor !== undefined) colorLow.setHex(biome.aesthetics.waterColor);
                             if (biome.aesthetics.crackColor !== undefined) colorLow.setHex(biome.aesthetics.crackColor);
                             if (biome.aesthetics.sandColor !== undefined) colorHigh.setHex(biome.aesthetics.sandColor);
                             if (biome.aesthetics.invertLighting) {
                                 colorLow = pColor.clone();
                                 colorHigh = pColor.clone().offsetHSL(0, 0, -0.5);
                             }
                        }
                        
                        shaderParams = {
                            colorLow: colorLow,
                            colorHigh: colorHigh,
                            cloudColor: cloudColor,
                            noiseFreq: (3.0 + seededRandom(this.cx, this.cy, this.cz, pSeed + 40) * 4.0) * Config.PLANET_TEXTURE_RESOLUTION_MULT, // Terreno detallado
                            cloudDensity: hasClouds ? (0.4 + seededRandom(this.cx, this.cy, this.cz, pSeed + 41) * 0.4) : 1.0, // 1.0 oculta las nubes
                            atmosphere: hasClouds ? 1.0 : 0.0,
                            warpStrength: (biome.warpBase || 1.0) + seededRandom(this.cx, this.cy, this.cz, pSeed + 42) * (biome.warpVar !== undefined ? biome.warpVar : 1.5),
                            stretchY: biome.stretchBase || 1.0
                        };
                    }

                    // Generar las variables de varianza únicas del planeta
                    const terrainVariance = {
                        heightMod: Config.TERRAIN_VAR_HEIGHT_BASE + seededRandom(this.cx, this.cy, this.cz, pSeed + 30) * Config.TERRAIN_VAR_HEIGHT_RANGE,
                        freqMod: Config.TERRAIN_VAR_FREQ_BASE + seededRandom(this.cx, this.cy, this.cz, pSeed + 31) * Config.TERRAIN_VAR_FREQ_RANGE,
                        octavesMod: Math.floor(seededRandom(this.cx, this.cy, this.cz, pSeed + 32) * Config.TERRAIN_VAR_OCTAVES_SPREAD) - 1,
                        exponentMod: Config.TERRAIN_VAR_EXPONENT_BASE + seededRandom(this.cx, this.cy, this.cz, pSeed + 33) * Config.TERRAIN_VAR_EXPONENT_RANGE
                    };

                    const pRadiusBase = isGasGiant ? (Config.PLANET_GAS_RADIUS_MIN + seededRandom(this.cx, this.cy, this.cz, pSeed + 6) * (Config.PLANET_GAS_RADIUS_MAX - Config.PLANET_GAS_RADIUS_MIN)) : (Config.PLANET_ROCKY_RADIUS_MIN + seededRandom(this.cx, this.cy, this.cz, pSeed + 7) * (Config.PLANET_ROCKY_RADIUS_MAX - Config.PLANET_ROCKY_RADIUS_MIN));
                    const pRadius = pRadiusBase * (biome.radiusMult !== undefined ? biome.radiusMult : 1.0);
                    const orbitRadius = sunRadius * 1.5 + Config.ORBIT_DISTANCE_START + j * (Config.ORBIT_DISTANCE_SPACING + seededRandom(this.cx, this.cy, this.cz, pSeed + 8) * Config.ORBIT_DISTANCE_VAR);
                    const baseOrbitSpeed = Config.PLANET_ORBIT_SPEED_MIN + seededRandom(this.cx, this.cy, this.cz, pSeed + 9) * (Config.PLANET_ORBIT_SPEED_MAX - Config.PLANET_ORBIT_SPEED_MIN);
                    const orbitSpeed = baseOrbitSpeed * (seededRandom(this.cx, this.cy, this.cz, pSeed + 10) > 0.5 ? 1 : -1);
                    const baseRotationSpeed = Config.PLANET_ROTATION_SPEED_MIN + seededRandom(this.cx, this.cy, this.cz, pSeed + 15) * (Config.PLANET_ROTATION_SPEED_MAX - Config.PLANET_ROTATION_SPEED_MIN);
                    const rotationSpeed = baseRotationSpeed * (seededRandom(this.cx, this.cy, this.cz, pSeed + 16) > 0.5 ? 1 : -1);
                    const startAngle = seededRandom(this.cx, this.cy, this.cz, pSeed + 11) * Math.PI * 2;
                    
                    // Planetary Rings
                    const ringChance = biome.ringChance !== undefined ? biome.ringChance : 0.05;
                    let ringConfig = null;
                    if (seededRandom(this.cx, this.cy, this.cz, pSeed + 30) < ringChance) {
                        const innerMult = Config.PLANET_RING_MIN_RADIUS_MULT + seededRandom(this.cx, this.cy, this.cz, pSeed + 31) * (Config.PLANET_RING_MAX_RADIUS_MULT - Config.PLANET_RING_MIN_RADIUS_MULT);
                        const widthMult = Config.PLANET_RING_MIN_WIDTH_MULT + seededRandom(this.cx, this.cy, this.cz, pSeed + 32) * (Config.PLANET_RING_MAX_WIDTH_MULT - Config.PLANET_RING_MIN_WIDTH_MULT);
                        const outerMult = innerMult + widthMult;
                        
                        let ringSat = 0.3;
                        let ringLit = 0.8;
                        if (!isGasGiant) {
                            const biome = Config.PLANET_BIOMES[pType] || Config.PLANET_BIOMES['Planeta rocoso'];
                            ringSat = biome.sat !== undefined ? biome.sat * 0.5 : 0.3;
                            ringLit = biome.lit !== undefined ? biome.lit * 1.5 : 0.8;
                        } else {
                            ringSat = 0.4;
                            ringLit = 0.6;
                        }

                        ringConfig = {
                            innerRadius: pRadius * innerMult,
                            outerRadius: pRadius * outerMult,
                            opacity: Config.PLANET_RING_OPACITY_MIN + seededRandom(this.cx, this.cy, this.cz, pSeed + 33) * (Config.PLANET_RING_OPACITY_MAX - Config.PLANET_RING_OPACITY_MIN),
                            density: 30.0 + seededRandom(this.cx, this.cy, this.cz, pSeed + 37) * 70.0, // Controla cuántas líneas tiene el anillo
                            seed: seededRandom(this.cx, this.cy, this.cz, pSeed + 38) * 100.0,
                            color1: new THREE.Color().setHSL(
                                (hue + seededRandom(this.cx, this.cy, this.cz, pSeed + 34) * 0.1) % 1.0, 
                                ringSat, ringLit
                            ),
                            color2: new THREE.Color().setHSL(
                                (hue + seededRandom(this.cx, this.cy, this.cz, pSeed + 35) * 0.15) % 1.0, 
                                ringSat * 0.8, ringLit * 1.2
                            ),
                            color3: new THREE.Color().setHSL(
                                (hue + seededRandom(this.cx, this.cy, this.cz, pSeed + 36) * 0.2) % 1.0, 
                                ringSat * 1.2, ringLit * 0.8
                            )
                        };
                    }

                    const planetInstance = new Planet({
                        name: pName, type: pType, radius: pRadius, color: pColor,
                        atmosphereDensity: atmosphereDensity,
                        orbitRadius, orbitSpeed, rotationSpeed,
                        angle: startAngle, tiltOffset: seededRandom(this.cx, this.cy, this.cz, pSeed + 12) * Math.PI * 2,
                        rotationY: 0, lx: 0, ly: 0, lz: 0,
                        terrainVariance: terrainVariance,
                        shaderParams: shaderParams,
                        ringConfig: ringConfig
                    });
                    planets.push(planetInstance);
                }
                
                let systemRadius = sunRadius * 2; // Default if no planets
                if (planets.length > 0) {
                    systemRadius = planets[planets.length - 1].orbitRadius + Config.HELIOPAUSE_PADDING;
                }
                
                const starInstance = new Star({
                    name: starName, type: starType, sunColor, radius: sunRadius, lx, ly, lz, planets, systemRadius
                });
                systemsData.push(starInstance);
                totalPlanets += numPlanets;
                let companionRef = null;

                // --- BINARY STAR CHECK ---
                const isBinary = seededRandom(this.cx, this.cy, this.cz, seedBase + 50) > (1 - Config.BINARY_STAR_CHANCE);
                if (isBinary) {
                    const compTypeRand = seededRandom(this.cx, this.cy, this.cz, seedBase + 52);
                    let compCumulative = 1.0;
                    let compStarData = Config.STAR_TYPES['Red Dwarf']; // Fallback common companion

                    for (const [sName, sData] of Object.entries(Config.STAR_TYPES)) {
                        compCumulative -= sData.chance;
                        if (compTypeRand > compCumulative) {
                            compStarData = sData;
                            break;
                        }
                    }

                    let compColorObj = new THREE.Color();
                    compColorObj.setHSL(
                        compStarData.hueBase + seededRandom(this.cx, this.cy, this.cz, seedBase + 54) * compStarData.hueVar,
                        compStarData.sat,
                        compStarData.litBase + seededRandom(this.cx, this.cy, this.cz, seedBase + 55) * compStarData.litVar
                    );
                    const compColor = compColorObj.getHex();

                    const compBaseRadius = Config.STAR_RADIUS_MIN + seededRandom(this.cx, this.cy, this.cz, seedBase + 60) * (Config.STAR_RADIUS_MAX - Config.STAR_RADIUS_MIN);
                    const compRadius = compBaseRadius * (compStarData.radiusMultMin + seededRandom(this.cx, this.cy, this.cz, seedBase + 61) * (compStarData.radiusMultMax - compStarData.radiusMultMin));

                    const compDistance = sunRadius * Config.BINARY_STAR_DISTANCE_BASE_MULT + seededRandom(this.cx, this.cy, this.cz, seedBase + 56) * sunRadius * Config.BINARY_STAR_DISTANCE_VAR_MULT;
                    const compAngle = seededRandom(this.cx, this.cy, this.cz, seedBase + 57) * Math.PI * 2;
                    const compSpeed = Config.PLANET_ORBIT_SPEED_MAX * (0.5 + seededRandom(this.cx, this.cy, this.cz, seedBase + 58)) * (seededRandom(this.cx, this.cy, this.cz, seedBase + 59) > 0.5 ? 1 : -1);

                    const companionInstance = new Star({
                        name: starName + " B", type: "Binary Companion Star", sunColor: compColor, radius: compRadius,
                        isCompanion: true, parentLx: lx, parentLy: ly, parentLz: lz,
                        orbitRadius: compDistance, orbitSpeed: compSpeed, orbitAngle: compAngle,
                        lx: lx + Math.cos(compAngle) * compDistance,
                        lz: lz + Math.sin(compAngle) * compDistance,
                        ly: ly + Math.sin(compAngle) * (compDistance * 0.1),
                        planets: [] // Planets orbit the primary, companion is just another star in the system
                    });
                    systemsData.push(companionInstance);
                    companionRef = companionInstance;
                }
                if (companionRef) {
                    companionRef.primary = starInstance;
                }
                starInstance.companion = companionRef;
                for (let p of planets) {
                    p.parentSystem = starInstance;
                }

                // --- ASTEROID BELT CHECK ---
                const hasAsteroids = seededRandom(this.cx, this.cy, this.cz, seedBase + 60) > (1 - Config.ASTEROID_BELT_CHANCE);
                if (hasAsteroids) {
                    // --- GENERACIÓN PROCEDURAL DE PROPIEDADES ÚNICAS DEL CINTURÓN ---
                    // Con esto, cada sistema solar tendrá un cinturón radicalmente distinto.
                    const beltCount = Config.ASTEROID_BELT_COUNT_MIN + seededRandom(this.cx, this.cy, this.cz, seedBase + 61) * (Config.ASTEROID_BELT_COUNT_MAX - Config.ASTEROID_BELT_COUNT_MIN);
                    const beltInnerRadius = sunRadius * (Config.ASTEROID_BELT_RADIUS_MULT_MIN + seededRandom(this.cx, this.cy, this.cz, seedBase + 62) * (Config.ASTEROID_BELT_RADIUS_MULT_MAX - Config.ASTEROID_BELT_RADIUS_MULT_MIN));
                    const beltWidth = sunRadius * (Config.ASTEROID_BELT_WIDTH_MULT_MIN + Math.pow(seededRandom(this.cx, this.cy, this.cz, seedBase + 63), 2) * (Config.ASTEROID_BELT_WIDTH_MULT_MAX - Config.ASTEROID_BELT_WIDTH_MULT_MIN));
                    const beltTiltRange = Config.ASTEROID_BELT_TILT_MIN + seededRandom(this.cx, this.cy, this.cz, seedBase + 64) * (Config.ASTEROID_BELT_TILT_MAX - Config.ASTEROID_BELT_TILT_MIN);

                    starInstance.asteroidBelt = {
                        count: Math.floor(beltCount),
                        innerRadius: beltInnerRadius,
                        width: beltWidth,
                        speed: (seededRandom(this.cx, this.cy, this.cz, seedBase + 63) * Config.ASTEROID_BELT_SPEED_VAR + Config.ASTEROID_BELT_SPEED_BASE) * (seededRandom(this.cx, this.cy, this.cz, seedBase + 64) > 0.5 ? 1 : -1),
                        angle: 0,
                        beltTilt: (seededRandom(this.cx, this.cy, this.cz, seedBase + 60) - 0.5) * beltTiltRange, // Inclinación global del disco
                        thickness: beltWidth * (beltTiltRange / 10), // Cinturones muy caóticos (tilt 10) tendrán un grosor enorme (Nubes de Oort)
                        asteroids: [] // { radius, dist, angleOffset, rotSpeed, rotAxis, yOffset }
                    };
                    
                    for (let i = 0; i < starInstance.asteroidBelt.count; i++) {
                        // Usar una curva exponencial para el tamaño (la mayoría serán muy pequeños, pocos serán gigantescos)
                        const sizeRand = Math.pow(seededRandom(this.cx, this.cy, this.cz, seedBase + 65 + i), 4);
                        
                        // Dispersión radial (ancho)
                        const radialDispersion = seededRandom(this.cx, this.cy, this.cz, seedBase + 66 + i);
                        
                        // Dispersión vertical caótica (grosor individual)
                        const verticalDispersion = (seededRandom(this.cx, this.cy, this.cz, seedBase + 68 + i) - 0.5) * starInstance.asteroidBelt.thickness;

                        starInstance.asteroidBelt.asteroids.push({
                            radius: Config.ASTEROID_SIZE_MIN + sizeRand * (Config.ASTEROID_SIZE_MAX - Config.ASTEROID_SIZE_MIN),
                            dist: starInstance.asteroidBelt.innerRadius + radialDispersion * starInstance.asteroidBelt.width,
                            angleOffset: seededRandom(this.cx, this.cy, this.cz, seedBase + 67 + i) * Math.PI * 2,
                            yOffset: verticalDispersion,
                            rotSpeed: (seededRandom(this.cx, this.cy, this.cz, seedBase + 69 + i) - 0.5) * 3,
                            rotAxis: new THREE.Vector3(
                                seededRandom(this.cx, this.cy, this.cz, seedBase + 70 + i),
                                seededRandom(this.cx, this.cy, this.cz, seedBase + 71 + i),
                                seededRandom(this.cx, this.cy, this.cz, seedBase + 72 + i)
                            ).normalize(),
                            currentRot: 0
                        });
                    }
                    totalAsteroids += starInstance.asteroidBelt.count;
                }
            }

            // Planetas ahora usan Meshes individuales para evitar jitter de Float32 en WebGL
            if (totalAsteroids > 0) {
                // OPTIMIZACIÓN EXTREMA: El buffer solo será del tamaño del cinturón máximo.
                // Como solo dibujamos el cinturón del sistema activo a la vez, no necesitamos alojar
                // espacio para TODOS los asteroides del chunk, ahorrando MBs masivos de RAM y GPU Bandwidth por frame.
                this.asteroidMesh = new THREE.InstancedMesh(SHARED_ASTEROID_GEO, SHARED_ASTEROID_MAT, Config.ASTEROID_BELT_COUNT_MAX);
                this.asteroidMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
                this.asteroidMesh.frustumCulled = false;
                this.group.add(this.asteroidMesh);
            }

            let pIndex = 0;
            let aIndex = 0;
            for (let sys of systemsData) {
                const spriteMaterial = new THREE.SpriteMaterial({
                    map: SHARED_SUN_TEXTURE, color: sys.sunColor, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false
                });
                const sunSprite = new THREE.Sprite(spriteMaterial);
                sunSprite.scale.set(sys.radius * Config.SUN_GLOW_SCALE, sys.radius * Config.SUN_GLOW_SCALE, 1);
                sunSprite.position.set(sys.lx, sys.ly, sys.lz);
                sunSprite.frustumCulled = true; // No dibujar soles a tus espaldas
                sys.sprite = sunSprite;
                this.group.add(sunSprite);

                for (let p of sys.planets) {
                    // Crear un Mesh individual por planeta
                    p.mesh = new THREE.Mesh(SHARED_SPHERE_GEO, SHARED_PLANET_MAT.clone());
                    p.mesh.material.color = p.color;
                    p.mesh.scale.set(p.radius, p.radius, p.radius);
                    p.mesh.frustumCulled = true; // Descartar si no se ve
                    this.group.add(p.mesh);

                    if (p.ringConfig) {
                        const ringGeo = new THREE.RingGeometry(p.ringConfig.innerRadius, p.ringConfig.outerRadius, 64);
                        const ringMat = getRingShaderMaterial(p.ringConfig);
                        
                        p.ringMesh = new THREE.Mesh(ringGeo, ringMat);
                        // Inclinamos el anillo para que quede en el ecuador (plano XZ), 
                        // y le aplicamos un tilt aleatorio que guardamos en p.tiltOffset para órbitas
                        p.ringMesh.rotation.x = Math.PI / 2 + p.tiltOffset;
                        p.ringMesh.frustumCulled = false; // DESACTIVAR CULLING PARA ASEGURAR QUE SE RENDERICE
                        this.group.add(p.ringMesh);
                    }
                }
                if (sys.asteroidBelt) {
                    sys.asteroidBelt.startIndex = aIndex;
                    aIndex += sys.asteroidBelt.count;
                }
                this.systems.push(sys);
            }
        }
    }

    update(dt, playerLx, playerLy, playerLz, closestSystem, closestPlanet) {
        let asteroidsUpdated = false;
        let aIdx = 0;

        if (this.asteroidMesh) {
            this.asteroidMesh.visible = false;
        }

        for (let sys of this.systems) {
            sys.update(dt);
            sys.updateAbsolutePosition(this.group.position.x, this.group.position.y, this.group.position.z);
            
            if (sys.sprite) {
                // OPTIMIZACIÓN EXTREMA: Solo mostrar la estrella si pertenece al sistema actual
                // (incluyendo compañeras binarias si estamos en la principal, o viceversa)
                const isCurrentSystem = (sys === closestSystem) || (sys.primary === closestSystem) || (sys === closestSystem?.primary);
                sys.sprite.visible = isCurrentSystem;

                if (sys.isCompanion && sys.sprite.visible) {
                    sys.sprite.position.set(sys.lx, sys.ly, sys.lz);
                }
            }

            for (let p of sys.planets) {
                p.updateAbsolutePosition(this.group.position.x, this.group.position.y, this.group.position.z);

                if (p.mesh) {
                    p.mesh.visible = (p === closestPlanet);
                    if (p.mesh.visible) {
                        p.mesh.position.set(p.lx, p.ly, p.lz);
                        p.mesh.rotation.y = p.rotationY;
                    }
                }
                
                if (p.ringMesh) {
                    p.ringMesh.visible = (p === closestPlanet);
                    if (p.ringMesh.visible) {
                        p.ringMesh.position.set(p.lx, p.ly, p.lz);
                        p.ringMesh.rotation.z = -p.rotationY * 0.5;
                        const distSq = (p.lx - playerLx)**2 + (p.ly - playerLy)**2 + (p.lz - playerLz)**2;
                        const hdDist = p.radius * Config.LOD_HIGH_DISTANCE_MULT;
                        p.ringMesh.visible = distSq < hdDist * hdDist;
                    }
                }
            }

            if (sys.asteroidBelt && sys === closestSystem) {
                this.asteroidMesh.visible = true;
                
                // Centrar el mesh instanciado exactamente en el sistema solar actual.
                // Esto elimina el jitter de Float32 en la GPU porque las matrices
                // instanciadas ahora solo guardan desplazamientos locales pequeños,
                // no las coordenadas gigantescas del universo.
                this.asteroidMesh.position.set(sys.lx, sys.ly, sys.lz);

                sys.asteroidBelt.angle += sys.asteroidBelt.speed * dt;
                
                const totalAngle = sys.asteroidBelt.angle;
                for (let a of sys.asteroidBelt.asteroids) {
                    a.currentRot += a.rotSpeed * dt;
                    
                    // Solo calculamos el offset local
                    // a.dist representa la distancia del asteroide al centro de la estrella.
                    const angle = totalAngle + a.angleOffset;
                    
                    // Aplicar inclinación (tilt) global del cinturón y el grosor (yOffset) individual
                    const ax = Math.cos(angle) * a.dist;
                    
                    // Tilt rotando el disco en el eje X: Z y Y se ajustan basados en beltTilt
                    const flatZ = Math.sin(angle) * a.dist;
                    
                    const az = flatZ * Math.cos(sys.asteroidBelt.beltTilt) - a.yOffset * Math.sin(sys.asteroidBelt.beltTilt);
                    const ay = flatZ * Math.sin(sys.asteroidBelt.beltTilt) + a.yOffset * Math.cos(sys.asteroidBelt.beltTilt);

                    dummy.position.set(ax, ay, az);
                    dummy.quaternion.setFromAxisAngle(a.rotAxis, a.currentRot);
                    dummy.scale.set(a.radius, a.radius, a.radius);
                    dummy.updateMatrix();
                    this.asteroidMesh.setMatrixAt(aIdx, dummy.matrix);
                    aIdx++;
                    asteroidsUpdated = true;
                }
                this.asteroidMesh.count = aIdx;
            }
        }
        
        if (asteroidsUpdated && this.asteroidMesh) {
            this.asteroidMesh.instanceMatrix.needsUpdate = true;
        }
    }

    dispose() {
        this.group.traverse((child) => {
            if (child.geometry && child.geometry !== SHARED_SPHERE_GEO && child.geometry !== SHARED_HIGH_POLY_GEO && child.geometry !== SHARED_ASTEROID_GEO) child.geometry.dispose();
            if (child.material && child.material !== SHARED_STAR_MAT && child.material !== SHARED_PLANET_MAT && child.material !== SHARED_HIGH_RES_MAT && child.material !== SHARED_ASTEROID_MAT && !child.isSprite) {
                if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
                else child.material.dispose();
            }
        });
        for (let sys of this.systems) {
            if (sys.sprite) {
                sys.sprite.material.dispose();
            }
            for (let p of sys.planets) {
                if (p.mesh) {
                    if (p.mesh.material) p.mesh.material.dispose();
                    this.group.remove(p.mesh);
                }
                if (p.ringMesh) {
                    if (p.ringMesh.geometry) p.ringMesh.geometry.dispose();
                    if (p.ringMesh.material) p.ringMesh.material.dispose();
                    this.group.remove(p.ringMesh);
                }
            }
        }
        if (this.asteroidMesh) this.asteroidMesh.dispose();
        if (this.scene) this.scene.remove(this.group);
    }
}
