import * as THREE from 'three';
import { seededRandom, starColorFromTemp } from '../../utils/MathUtils.js';
import { generateStarName, generatePlanetName, generateBlackHoleName } from '../generators/NameGenerator.js';
import { Config } from '../../core/Config.js';
import { Star } from '../entities/Star.js';
import { PlanetShaderMaterial } from '../materials/PlanetShader.js';
import { getStarShaderMaterial } from '../materials/StarShader.js';
import { getRingShaderMaterial } from '../materials/RingShader.js';
import { Lensflare, LensflareElement } from 'three/addons/objects/Lensflare.js';
import { Planet } from '../entities/Planet.js';
import { BlackHole } from '../entities/BlackHole.js';

export const SHARED_SPHERE_GEO = new THREE.IcosahedronGeometry(1, 1); // 80 faces, super fast
export const SHARED_HIGH_POLY_GEO = new THREE.SphereGeometry(1, 128, 128);
export const SHARED_STAR_CORE_GEO = new THREE.SphereGeometry(1, 128, 128); // Fase 1: Núcleo estrella, high poly
export const SHARED_HIGH_RES_MAT = PlanetShaderMaterial;
export const SHARED_GHOST_GEO = new THREE.PlaneGeometry(1, 1); // Plano base para lensflares

const SHARED_ASTEROID_GEO = new THREE.IcosahedronGeometry(1, 0); // Low-poly para asteroides
const SHARED_STAR_MAT = new THREE.PointsMaterial({
    size: Config.RENDER_STAR_POINT_SIZE || 20, 
    vertexColors: true, 
    transparent: false, 
    sizeAttenuation: true,
    depthWrite: true
});
const SHARED_ASTEROID_MAT = new THREE.MeshBasicMaterial({ color: 0x888888 });

const SHARED_PLANET_MAT = new THREE.MeshLambertMaterial({ color: 0xffffff });
const dummy = new THREE.Object3D();

function createGlowTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 128; canvas.height = 128;
    const context = canvas.getContext('2d');
    const gradient = context.createRadialGradient(64, 64, 0, 64, 64, 64);

    gradient.addColorStop(0, 'rgba(255,255,255,1.0)'); // Núcleo brillante
    gradient.addColorStop(0.2, 'rgba(255,255,255,0.8)'); // Borde del núcleo
    gradient.addColorStop(0.5, 'rgba(255,255,255,0.3)'); // Resplandor medio
    gradient.addColorStop(1, 'rgba(255,255,255,0)');   // Desvanecimiento

    context.fillStyle = gradient;
    context.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(canvas);
}
const SHARED_SUN_TEXTURE = createGlowTexture();

function createRaysTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512; canvas.height = 512;
    const context = canvas.getContext('2d');
    const cx = 256, cy = 256;

    // Suavizado extremo para evitar pixelado en los bordes de los rayos
    context.filter = 'blur(4px)';

    for (let i = 0; i < 60; i++) {
        const angle = Math.random() * Math.PI * 2;
        const isLong = Math.random() > 0.8;
        const length = isLong ? 150 + Math.random() * 80 : 60 + Math.random() * 80; 
        const opacity = (isLong ? 0.3 : 0.1) + Math.random() * 0.4;
        const spread = (isLong ? 0.02 : 0.05) + Math.random() * 0.05; // Base del triángulo

        context.beginPath();
        // Empezar a dibujar un triángulo orgánico desde cerca del centro hacia afuera
        context.moveTo(cx + Math.cos(angle - spread) * 20, cy + Math.sin(angle - spread) * 20);
        context.lineTo(cx + Math.cos(angle) * length, cy + Math.sin(angle) * length); // Punta aguda
        context.lineTo(cx + Math.cos(angle + spread) * 20, cy + Math.sin(angle + spread) * 20);
        context.closePath();
        
        context.fillStyle = `rgba(255, 255, 255, ${opacity})`;
        context.fill();
    }

    // Glow central sutil sobre las bases para unirlas suavemente
    const gradient = context.createRadialGradient(cx, cy, 0, cx, cy, 256);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.2, 'rgba(255,255,255,0.3)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, 512, 512);

    return new THREE.CanvasTexture(canvas);
}

const SHARED_RAYS_TEXTURE = createRaysTexture();

function createHexagonTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 128; canvas.height = 128;
    const context = canvas.getContext('2d');
    const cx = 64, cy = 64, size = 50;

    // Hexágonos difuminaditos y orgánicos
    context.filter = 'blur(5px)';

    context.beginPath();
    for (let i = 0; i <= 6; i++) {
        const angle = i * Math.PI / 3;
        const x = cx + size * Math.cos(angle);
        const y = cy + size * Math.sin(angle);
        if (i === 0) context.moveTo(x, y);
        else context.lineTo(x, y);
    }
    // Relleno suave sin bordes rígidos (UI)
    context.fillStyle = 'rgba(255, 255, 255, 0.5)';
    context.fill();

    return new THREE.CanvasTexture(canvas);
}
const SHARED_HEX_TEXTURE = createHexagonTexture();

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
                let starData = Config.STAR_TYPES['Yellow Dwarf'] || Object.values(Config.STAR_TYPES)[0];
                for (const [sName, sData] of Object.entries(Config.STAR_TYPES)) {
                    cumulative -= sData.chance;
                    if (starTypeRand > cumulative) {
                        starType = sName;
                        starData = sData;
                        break;
                    }
                }
                const starTemp = Math.floor((starData.tempBase || 5000) + seededRandom(cx, cy, cz, seedBase + 30) * (starData.tempVar || 1500));
                const starRadius = Config.STAR_RADIUS_MIN + seededRandom(cx, cy, cz, seedBase + 5) * (Config.STAR_RADIUS_MAX - Config.STAR_RADIUS_MIN);
                
                // Color is now based strictly on blackbody radiation from its physical temperature
                const starRGB = starColorFromTemp(starTemp);
                const _tempStarCol = new THREE.Color(starRGB.r, starRGB.g, starRGB.b);
                const starHSLObj = {};
                _tempStarCol.getHSL(starHSLObj);
                let starColorHSL = `hsl(${Math.floor(starHSLObj.h * 360)}, ${Math.floor(starHSLObj.s * 100)}%, ${Math.floor(starHSLObj.l * 100)}%)`;

                // --- BINARY STAR PRE-CHECK ---
                const isBinary = seededRandom(cx, cy, cz, seedBase + 50) > (1 - Config.BINARY_STAR_CHANCE);
                let compTemp = 0;
                let compRadius = 0;
                let compStarName = 'Enana roja';
                let compDistance = 0;
                let compAngle = 0;
                if (isBinary) {
                    const compTypeRand = seededRandom(cx, cy, cz, seedBase + 52);
                    let compCumulative = 1.0;
                    let compStarData = Config.STAR_TYPES['Red Dwarf'];
                    for (const [sName, sData] of Object.entries(Config.STAR_TYPES)) {
                        compCumulative -= sData.chance;
                        if (compTypeRand > compCumulative) {
                            compStarData = sData;
                            compStarName = sName;
                            break;
                        }
                    }
                    compTemp = Math.floor((compStarData.tempBase || 5000) + seededRandom(cx, cy, cz, seedBase + 53) * (compStarData.tempVar || 1500));
                    const compBaseRadius = Config.STAR_RADIUS_MIN + seededRandom(cx, cy, cz, seedBase + 60) * (Config.STAR_RADIUS_MAX - Config.STAR_RADIUS_MIN);
                    compRadius = compBaseRadius * (compStarData.radiusMultMin + seededRandom(cx, cy, cz, seedBase + 61) * (compStarData.radiusMultMax - compStarData.radiusMultMin));
                    
                    const compRGB = starColorFromTemp(compTemp);
                    const _tempCompCol = new THREE.Color(compRGB.r, compRGB.g, compRGB.b);
                    const compHSLObj = {};
                    _tempCompCol.getHSL(compHSLObj);
                    var compColorHSL = `hsl(${Math.floor(compHSLObj.h * 360)}, ${Math.floor(compHSLObj.s * 100)}%, ${Math.floor(compHSLObj.l * 100)}%)`;
                    
                    compDistance = starRadius * Config.BINARY_STAR_DISTANCE_BASE_MULT + seededRandom(cx, cy, cz, seedBase + 56) * starRadius * Config.BINARY_STAR_DISTANCE_VAR_MULT;
                    compAngle = seededRandom(cx, cy, cz, seedBase + 57) * Math.PI * 2;
                }

                const planetsData = [];
                const numPlanets = Math.floor(seededRandom(cx, cy, cz, seedBase + 6) * Config.PLANETS_MAX_PER_SYSTEM) + 1;
                const systemPlanetNames = [];
                for (let j = 0; j < numPlanets; j++) {
                    const pSeed = seedBase + 20 + j;
                    const pName = generatePlanetName(starName, j, pSeed + 13, cx, cy, cz, systemPlanetNames);
                    systemPlanetNames.push(pName);
                    const orbitRadius = starRadius * 1.5 + Config.ORBIT_DISTANCE_START + j * (Config.ORBIT_DISTANCE_SPACING + seededRandom(cx, cy, cz, pSeed + 8) * Config.ORBIT_DISTANCE_VAR);
                    
                    let flux = Math.pow(starTemp, 4) * Math.pow(starRadius / (2 * orbitRadius), 2);
                    if (isBinary) {
                        flux += Math.pow(compTemp, 4) * Math.pow(compRadius / (2 * orbitRadius), 2);
                    }
                    // Limitar a 3K (Fondo Cósmico de Microondas)
                    const pTempEq = Math.max(3, Math.pow(flux, 0.25));

                    let validBiomes = [];
                    for (const [biomeName, biomeData] of Object.entries(Config.PLANET_BIOMES)) {
                        let tSurf = pTempEq * Math.pow(1 - (biomeData.albedo !== undefined ? biomeData.albedo : 0.3), 0.25) * (1 + (biomeData.greenhouse !== undefined ? biomeData.greenhouse : 0.8));
                        tSurf = Math.max(3, tSurf); // Limitar también tras el cálculo de superficie
                        if (tSurf >= (biomeData.tempMin !== undefined ? biomeData.tempMin : -999) && tSurf <= (biomeData.tempMax !== undefined ? biomeData.tempMax : 9999)) {
                            validBiomes.push({ name: biomeName, data: biomeData, tSurf });
                        }
                    }

                    let pType = 'Planeta rocoso';
                    let pTemp = Math.floor(pTempEq);
                    let biome = Config.PLANET_BIOMES['Planeta rocoso'];

                    if (validBiomes.length > 0) {
                        let totalChance = validBiomes.reduce((sum, b) => sum + (b.data.chance || 0.01), 0);
                        const typeRand = seededRandom(cx, cy, cz, pSeed + 20) * totalChance;
                        let pCumulative = 0;
                        for (const b of validBiomes) {
                            pCumulative += (b.data.chance || 0.01);
                            if (typeRand <= pCumulative) {
                                pType = b.name;
                                biome = b.data;
                                pTemp = Math.floor(b.tSurf);
                                break;
                            }
                        }
                    } else {
                        const fallbackAlbedo = biome.albedo !== undefined ? biome.albedo : 0.3;
                        const fallbackGreenhouse = biome.greenhouse !== undefined ? biome.greenhouse : 0.8;
                        pTemp = Math.floor(pTempEq * Math.pow(1 - fallbackAlbedo, 0.25) * (1 + fallbackGreenhouse));
                    }

                    const isGasGiant = biome.isGasGiant === true;

                    let pHue = 0, pSat = 0.5, pLit = 0.5;
                    if (isGasGiant) {
                        if (biome.hueBase !== undefined) pHue = (biome.hueBase + (seededRandom(cx, cy, cz, pSeed + 10) * biome.hueVar)) % 1.0;
                        if (biome.sat !== undefined) pSat = biome.sat;
                        if (biome.lit !== undefined) pLit = biome.lit;
                    } else {
                        pSat = biome.sat !== undefined ? biome.sat : ((biome.satRandomBase||0.5) + seededRandom(cx, cy, cz, pSeed + 1) * (biome.satRandomMult||0.5));
                        pLit = biome.lit !== undefined ? biome.lit : ((biome.litRandomBase||0.5) + seededRandom(cx, cy, cz, pSeed + 2) * (biome.litRandomMult||0.5));
                        pHue = biome.useSystemHue ? starHSLObj.h : ((biome.hueBase||0) + seededRandom(cx, cy, cz, pSeed) * (biome.hueVar||0));
                    }
                    const pColorHSL = `hsl(${Math.floor(pHue * 360)}, ${Math.floor(pSat * 100)}%, ${Math.floor(pLit * 100)}%)`;

                    const pRadiusBase = isGasGiant ? (Config.PLANET_GAS_RADIUS_MIN + seededRandom(cx, cy, cz, pSeed + 6) * (Config.PLANET_GAS_RADIUS_MAX - Config.PLANET_GAS_RADIUS_MIN)) : (Config.PLANET_ROCKY_RADIUS_MIN + seededRandom(cx, cy, cz, pSeed + 7) * (Config.PLANET_ROCKY_RADIUS_MAX - Config.PLANET_ROCKY_RADIUS_MIN));
                    const pRadius = pRadiusBase * (biome.radiusMult !== undefined ? biome.radiusMult : 1.0);

                    const startAngle = seededRandom(cx, cy, cz, pSeed + 11) * Math.PI * 2;

                    planetsData.push({
                        isMock: true,
                        group: 'Planet',
                        type: pType,
                        name: pName,
                        radius: pRadius,
                        lx: lx + Math.cos(startAngle) * orbitRadius,
                        ly: ly,
                        lz: lz + Math.sin(startAngle) * orbitRadius,
                        temperature: pTemp,
                        colorHSL: pColorHSL,
                        icon: isGasGiant ? '○' : '●',
                        colorString: pColorHSL,
                        isGasGiant: isGasGiant
                    });
                }

                systems.push({
                    isMock: true,
                    group: 'Star',
                    type: starType,
                    name: starName,
                    radius: starRadius,
                    lx: lx, ly: ly, lz: lz,
                    planets: planetsData,
                    temperature: starTemp,
                    colorHSL: starColorHSL,
                    icon: '❖',
                    colorString: starColorHSL
                });

                if (isBinary) {
                    systems.push({
                        isMock: true,
                        group: 'Star',
                        type: compStarName,
                        name: starName + " B",
                        radius: compRadius,
                        lx: lx + Math.cos(compAngle) * compDistance,
                        ly: ly + Math.sin(compAngle) * (compDistance * 0.1),
                        lz: lz + Math.sin(compAngle) * compDistance,
                        planets: [],
                        temperature: compTemp,
                        colorHSL: compColorHSL
                    });
                }
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
                lx: lx, ly: ly, lz: lz,
                icon: '🌀',
                colorString: '#8a2be2'
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

                // Nuevas propiedades procedimentales de estrella
                const starTemp = Math.floor((starData.tempBase || 5000) + seededRandom(this.cx, this.cy, this.cz, seedBase + 30) * (starData.tempVar || 1500));
                
                // Generar color científicamente a partir de la temperatura Blackbody
                const starRGB = starColorFromTemp(starTemp);
                let sunColorObj = new THREE.Color(starRGB.r, starRGB.g, starRGB.b);
                const sunColor = sunColorObj.getHex();
                let sunHSL = {};
                sunColorObj.getHSL(sunHSL);
                const sunColorString = `hsl(${Math.floor(sunHSL.h * 360)}, ${Math.floor(sunHSL.s * 100)}%, ${Math.floor(sunHSL.l * 100)}%)`;
                
                const baseRadius = Config.STAR_RADIUS_MIN + seededRandom(this.cx, this.cy, this.cz, seedBase + 5) * (Config.STAR_RADIUS_MAX - Config.STAR_RADIUS_MIN);
                const sunRadius = baseRadius * (starData.radiusMultMin + seededRandom(this.cx, this.cy, this.cz, seedBase + 6) * (starData.radiusMultMax - starData.radiusMultMin));
                
                const starActivity = 0.5 + seededRandom(this.cx, this.cy, this.cz, seedBase + 31) * 1.5; // Multiplicador de velocidad de corona
                // Luminosidad basada en la Ley de Stefan-Boltzmann (L ∝ R² * T⁴) usando el Sol de referencia
                const luminosityRatio = Math.pow(sunRadius / 70000, 2) * Math.pow(starTemp / 5778, 4);
                // Mapeo logarítmico para mantener la luminosidad en un rango visual atractivo sin saturar el blanco
                const starLuminosity = Math.max(0.1, 0.8 + Math.log10(luminosityRatio) * 0.4);
                
                // --- BINARY STAR PRE-CHECK ---
                const isBinary = seededRandom(this.cx, this.cy, this.cz, seedBase + 50) > (1 - Config.BINARY_STAR_CHANCE);
                let compTemp = 0;
                let compRadius = 0;
                let compDistance = 0;
                let compStarData = null;
                let compStarName = 'Enana roja';
                if (isBinary) {
                    const compTypeRand = seededRandom(this.cx, this.cy, this.cz, seedBase + 52);
                    let compCumulative = 1.0;
                    compStarData = Config.STAR_TYPES['Red Dwarf'];
                    for (const [sName, sData] of Object.entries(Config.STAR_TYPES)) {
                        compCumulative -= sData.chance;
                        if (compTypeRand > compCumulative) {
                            compStarData = sData;
                            compStarName = sName;
                            break;
                        }
                    }
                    compTemp = Math.floor((compStarData.tempBase || 5000) + seededRandom(this.cx, this.cy, this.cz, seedBase + 53) * (compStarData.tempVar || 1500));
                    const compBaseRadius = Config.STAR_RADIUS_MIN + seededRandom(this.cx, this.cy, this.cz, seedBase + 60) * (Config.STAR_RADIUS_MAX - Config.STAR_RADIUS_MIN);
                    compRadius = compBaseRadius * (compStarData.radiusMultMin + seededRandom(this.cx, this.cy, this.cz, seedBase + 61) * (compStarData.radiusMultMax - compStarData.radiusMultMin));
                    compDistance = sunRadius * Config.BINARY_STAR_DISTANCE_BASE_MULT + seededRandom(this.cx, this.cy, this.cz, seedBase + 56) * sunRadius * Config.BINARY_STAR_DISTANCE_VAR_MULT;
                }

                const numPlanets = Math.floor(seededRandom(this.cx, this.cy, this.cz, seedBase + 6) * Config.PLANETS_MAX_PER_SYSTEM) + 1;
                const planets = [];
                const systemPlanetNames = [];

                for (let j = 0; j < numPlanets; j++) {
                    const pSeed = seedBase + 20 + j;
                    const pName = generatePlanetName(starName, j, pSeed + 13, this.cx, this.cy, this.cz, systemPlanetNames);
                    systemPlanetNames.push(pName);
                    const hue = seededRandom(this.cx, this.cy, this.cz, pSeed);
                    
                    let orbitStart = sunRadius * 1.5 + Config.ORBIT_DISTANCE_START;
                    if (isBinary) {
                        orbitStart += compDistance * 2.5; // Circumbinary planets must orbit outside the unstable resonance zone
                    }
                    const orbitRadius = orbitStart + j * (Config.ORBIT_DISTANCE_SPACING + seededRandom(this.cx, this.cy, this.cz, pSeed + 8) * Config.ORBIT_DISTANCE_VAR);
                    
                    let flux = Math.pow(starTemp, 4) * Math.pow(sunRadius / (2 * orbitRadius), 2);
                    if (isBinary) {
                        flux += Math.pow(compTemp, 4) * Math.pow(compRadius / (2 * orbitRadius), 2);
                    }
                    const pTempEq = Math.pow(flux, 0.25);

                    let validBiomes = [];
                    for (const [biomeName, biomeData] of Object.entries(Config.PLANET_BIOMES)) {
                        const tSurf = pTempEq * Math.pow(1 - (biomeData.albedo !== undefined ? biomeData.albedo : 0.3), 0.25) * (1 + (biomeData.greenhouse !== undefined ? biomeData.greenhouse : 0.8));
                        if (tSurf >= (biomeData.tempMin !== undefined ? biomeData.tempMin : -999) && tSurf <= (biomeData.tempMax !== undefined ? biomeData.tempMax : 9999)) {
                            validBiomes.push({ name: biomeName, data: biomeData, tSurf });
                        }
                    }

                    let pType = 'Planeta rocoso';
                    let pTemp = Math.floor(pTempEq);
                    let biome = Config.PLANET_BIOMES['Planeta rocoso'];

                    if (validBiomes.length > 0) {
                        let totalChance = validBiomes.reduce((sum, b) => sum + (b.data.chance || 0.01), 0);
                        const typeRand = seededRandom(this.cx, this.cy, this.cz, pSeed + 20) * totalChance;
                        let pCumulative = 0;
                        for (const b of validBiomes) {
                            pCumulative += (b.data.chance || 0.01);
                            if (typeRand <= pCumulative) {
                                pType = b.name;
                                biome = b.data;
                                pTemp = Math.floor(b.tSurf);
                                break;
                            }
                        }
                    } else {
                        const fallbackAlbedo = biome.albedo !== undefined ? biome.albedo : 0.3;
                        const fallbackGreenhouse = biome.greenhouse !== undefined ? biome.greenhouse : 0.8;
                        pTemp = Math.floor(pTempEq * Math.pow(1 - fallbackAlbedo, 0.25) * (1 + fallbackGreenhouse));
                    }

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

                        let pSat = biome.sat !== undefined ? biome.sat : (biome.satRandomBase + seededRandom(this.cx, this.cy, this.cz, pSeed + 1) * biome.satRandomMult);
                        let pLit = biome.lit !== undefined ? biome.lit : (biome.litRandomBase + seededRandom(this.cx, this.cy, this.cz, pSeed + 2) * biome.litRandomMult);
                        
                        let pHue = 0;
                        if (biome.useSystemHue) {
                            const starHSL = {};
                            sunColorObj.getHSL(starHSL);
                            pHue = starHSL.h;
                        } else {
                            pHue = (biome.hueBase + seededRandom(this.cx, this.cy, this.cz, pSeed) * biome.hueVar);
                        }
                        
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

                        let pHSL = {};
                        pColor.getHSL(pHSL);
                        let ringHueBase = pHSL.h;
                        
                        let ringSat = 0.3;
                        let ringLit = 0.8;
                        if (!isGasGiant) {
                            const biome = Config.PLANET_BIOMES[pType] || Config.PLANET_BIOMES['Planeta rocoso'];
                            ringSat = biome.sat !== undefined ? biome.sat * 0.4 : 0.3;
                            ringLit = biome.lit !== undefined ? biome.lit * 1.2 : 0.8;
                        } else {
                            ringSat = 0.4;
                            ringLit = 0.6;
                        }

                        // Fenómenos extraños: 15% de probabilidad de tener anillos exóticos/anómalos (minerales raros)
                        const isAnomalous = seededRandom(this.cx, this.cy, this.cz, pSeed + 80) < 0.15;
                        if (isAnomalous) {
                            ringHueBase = seededRandom(this.cx, this.cy, this.cz, pSeed + 81); // Color completamente distinto
                            ringSat = 0.8; // Muy vibrante
                            ringLit = 0.7;
                        } else {
                            // Si son anillos normales de roca/hielo, se desaturan un poco para ser realistas
                            ringSat *= 0.5;
                            ringLit = Math.min(1.0, ringLit * 0.9 + 0.2); // Más reflectantes (hielo/polvo)
                        }

                        ringConfig = {
                            innerRadius: pRadius * innerMult,
                            outerRadius: pRadius * outerMult,
                            opacity: Config.PLANET_RING_OPACITY_MIN + seededRandom(this.cx, this.cy, this.cz, pSeed + 33) * (Config.PLANET_RING_OPACITY_MAX - Config.PLANET_RING_OPACITY_MIN),
                            density: 30.0 + seededRandom(this.cx, this.cy, this.cz, pSeed + 37) * 70.0, // Controla cuántas líneas tiene el anillo
                            seed: seededRandom(this.cx, this.cy, this.cz, pSeed + 38) * 100.0,
                            color1: new THREE.Color().setHSL(
                                (ringHueBase + seededRandom(this.cx, this.cy, this.cz, pSeed + 34) * 0.05) % 1.0,
                                ringSat, ringLit
                            ),
                            color2: new THREE.Color().setHSL(
                                (ringHueBase + seededRandom(this.cx, this.cy, this.cz, pSeed + 35) * 0.08) % 1.0,
                                ringSat * 0.8, ringLit * 1.1
                            ),
                            color3: new THREE.Color().setHSL(
                                (ringHueBase + seededRandom(this.cx, this.cy, this.cz, pSeed + 36) * 0.1) % 1.0,
                                ringSat * 1.2, ringLit * 0.9
                            )
                        };
                    }

                    let finalPHSL = {};
                    pColor.getHSL(finalPHSL);
                    let colorString = `hsl(${Math.floor(finalPHSL.h * 360)}, ${Math.floor(finalPHSL.s * 100)}%, ${Math.floor(finalPHSL.l * 100)}%)`;

                    // pTemp is already calculated accurately with Albedo and Greenhouse
                    const planetInstance = new Planet({
                        name: pName, type: pType, radius: pRadius, color: pColor,
                        atmosphereDensity: atmosphereDensity,
                        temperature: pTemp,
                        orbitRadius, orbitSpeed, rotationSpeed,
                        angle: startAngle, 
                        orbitInclination: (seededRandom(this.cx, this.cy, this.cz, pSeed + 12) - 0.5) * 0.5, // -0.25 to 0.25 radians (about -14 to +14 degrees)
                        ascendingNode: seededRandom(this.cx, this.cy, this.cz, pSeed + 13) * Math.PI * 2,
                        axialTilt: (seededRandom(this.cx, this.cy, this.cz, pSeed + 14) - 0.5) * Math.PI * 0.5, // -45 to +45 degrees mostly, some crazy ones possible if we tweak it
                        rotationY: 0, lx: 0, ly: 0, lz: 0,
                        terrainVariance: terrainVariance,
                        shaderParams: shaderParams,
                        ringConfig: ringConfig,
                        isGasGiant: isGasGiant,
                        icon: isGasGiant ? '○' : '●',
                        colorString: colorString
                    });
                    planets.push(planetInstance);
                }

                let systemRadius = sunRadius * 2; // Default if no planets
                if (planets.length > 0) {
                    systemRadius = planets[planets.length - 1].orbitRadius + Config.HELIOPAUSE_PADDING;
                }

                totalPlanets += numPlanets;
                let companionRef = null;
                let primaryOrbitRadius = 0;
                let primaryOrbitAngle = 0;
                let primaryOrbitSpeed = 0;

                // --- BINARY STAR INSTANTIATION ---
                if (isBinary) {
                    const compRGB = starColorFromTemp(compTemp);
                    let compColorObj = new THREE.Color(compRGB.r, compRGB.g, compRGB.b);
                    const compColor = compColorObj.getHex();
                    let compHSL = {};
                    compColorObj.getHSL(compHSL);
                    const compColorString = `hsl(${Math.floor(compHSL.h * 360)}, ${Math.floor(compHSL.s * 100)}%, ${Math.floor(compHSL.l * 100)}%)`;

                    const compAngle = seededRandom(this.cx, this.cy, this.cz, seedBase + 57) * Math.PI * 2;
                    const compSpeed = Config.PLANET_ORBIT_SPEED_MAX * (0.5 + seededRandom(this.cx, this.cy, this.cz, seedBase + 58)) * (seededRandom(this.cx, this.cy, this.cz, seedBase + 59) > 0.5 ? 1 : -1);

                    // Primary star orbits the barycenter opposite to the companion.
                    // The radius is proportional to the mass ratio (approximated by radius ratio).
                    primaryOrbitRadius = compDistance * (compRadius / (sunRadius + compRadius));
                    primaryOrbitAngle = compAngle + Math.PI;
                    primaryOrbitSpeed = compSpeed;

                    const companionInstance = new Star({
                        name: starName + " B", type: compStarName, sunColor: compColor, radius: compRadius,
                        isCompanion: true, parentLx: lx, parentLy: ly, parentLz: lz,
                        orbitRadius: compDistance, orbitSpeed: compSpeed, orbitAngle: compAngle,
                        lx: lx + Math.cos(compAngle) * compDistance,
                        lz: lz + Math.sin(compAngle) * compDistance,
                        ly: ly + Math.sin(compAngle) * (compDistance * 0.1),
                        planets: [], // Planets orbit the primary, companion is just another star in the system
                        temperature: compTemp,
                        icon: '❖', colorString: compColorString
                    });
                    systemsData.push(companionInstance);
                    companionRef = companionInstance;
                }

                const starInstance = new Star({
                    name: starName, type: starType, sunColor, radius: sunRadius, lx, ly, lz, planets, systemRadius,
                    temperature: starTemp, activity: starActivity, luminosity: starLuminosity,
                    isPrimaryBinary: isBinary,
                    parentLx: lx, parentLy: ly, parentLz: lz,
                    orbitRadius: primaryOrbitRadius, orbitSpeed: primaryOrbitSpeed, orbitAngle: primaryOrbitAngle,
                    icon: '❖', colorString: sunColorString
                });
                systemsData.push(starInstance);
                
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
                // Fase 1 y 3: Núcleo Físico 3D con Shader de Plasma Animado
                const coreMat = getStarShaderMaterial(sys.sunColor, sys.type);
                const starCore = new THREE.Mesh(SHARED_STAR_CORE_GEO, coreMat);
                starCore.scale.set(sys.radius, sys.radius, sys.radius);
                starCore.position.set(sys.lx, sys.ly, sys.lz);
                starCore.frustumCulled = true;
                sys.mesh = starCore;
                this.group.add(starCore);

                // Fase 2: Corona Solar Multi-Capa Animada
                sys.coronaSprites = [];

                // Fase 4: Fantasmas de Lente Personalizados (Hexágonos y Anillos Ópticos)
                sys.ghostSprites = [];
                const starColorObj = new THREE.Color(sys.sunColor);
                const starHSL = starColorObj.getHSL({});
                const ghosts = [
                    // Hexágonos primarios (línea central), colores basados en HSL dinámico de la estrella
                    { size: 40, dist: 0.2, color: new THREE.Color().setHSL((starHSL.h + 0.05)%1.0, 1.0, 0.8), tex: SHARED_HEX_TEXTURE },
                    { size: 70, dist: 0.45, color: new THREE.Color().setHSL((starHSL.h + 0.5)%1.0, 1.0, 0.7), tex: SHARED_HEX_TEXTURE },
                    { size: 30, dist: 0.6, color: new THREE.Color(0xffffff), tex: SHARED_HEX_TEXTURE },
                    { size: 100, dist: 0.8, color: new THREE.Color().setHSL((starHSL.h + 0.1)%1.0, 1.0, 0.6), tex: SHARED_HEX_TEXTURE },
                    { size: 50, dist: 1.1, color: new THREE.Color().setHSL((starHSL.h - 0.2 + 1.0)%1.0, 0.8, 0.7), tex: SHARED_HEX_TEXTURE },
                    // Círculos de colores (reflejos de lentes internos)
                    { size: 250, dist: 0.1, color: new THREE.Color(sys.sunColor), tex: SHARED_SUN_TEXTURE, op: 0.25 },
                    { size: 150, dist: 0.35, color: new THREE.Color().setHSL((starHSL.h + 0.3)%1.0, 1.0, 0.5), tex: SHARED_SUN_TEXTURE, op: 0.15 },
                    { size: 300, dist: 0.9, color: new THREE.Color().setHSL((starHSL.h + 0.6)%1.0, 1.0, 0.4), tex: SHARED_SUN_TEXTURE, op: 0.15 },
                    { size: 180, dist: 1.25, color: new THREE.Color().setHSL((starHSL.h - 0.1 + 1.0)%1.0, 1.0, 0.5), tex: SHARED_SUN_TEXTURE, op: 0.2 },
                    // Hexágonos secundarios ligeramente desviados
                    { size: 35, dist: 0.4, color: new THREE.Color().setHSL((starHSL.h + 0.15)%1.0, 1.0, 0.7), tex: SHARED_HEX_TEXTURE, offset: 0.05 },
                    { size: 60, dist: 0.75, color: new THREE.Color().setHSL((starHSL.h + 0.45)%1.0, 1.0, 0.7), tex: SHARED_HEX_TEXTURE, offset: -0.05 }
                ];
                
                for (let g of ghosts) {
                    const mat = new THREE.ShaderMaterial({
                        uniforms: {
                            tDiffuse: { value: g.tex || SHARED_HEX_TEXTURE },
                            uColor: { value: g.color },
                            uScreenPos: { value: new THREE.Vector2(0, 0) },
                            uScale: { value: new THREE.Vector2(0.1, 0.1) },
                            uOpacity: { value: 0.0 }
                        },
                        vertexShader: `
                            uniform vec2 uScreenPos;
                            uniform vec2 uScale;
                            varying vec2 vUv;
                            void main() {
                                vUv = uv;
                                vec2 pos = position.xy * uScale + uScreenPos;
                                gl_Position = vec4(pos, 0.5, 1.0);
                            }
                        `,
                        fragmentShader: `
                            uniform sampler2D tDiffuse;
                            uniform vec3 uColor;
                            uniform float uOpacity;
                            varying vec2 vUv;
                            void main() {
                                vec4 texColor = texture2D(tDiffuse, vUv);
                                gl_FragColor = vec4(uColor * texColor.rgb, texColor.a * uOpacity);
                            }
                        `,
                        blending: THREE.AdditiveBlending,
                        depthTest: false,
                        depthWrite: false,
                        transparent: true
                    });
                    const mesh = new THREE.Mesh(SHARED_GHOST_GEO, mat);
                    mesh.renderOrder = 99999;
                    mesh.visible = false;
                    mesh.frustumCulled = false; // Como lo posicionamos en pantalla, NUNCA debe descartarse
                    this.group.add(mesh);
                    sys.ghostSprites.push({ 
                        sprite: mesh, 
                        baseSize: g.size, 
                        dist: g.dist, 
                        baseColor: g.color,
                        baseOp: g.op || 1.0,
                        offset: g.offset || 0.0
                    });
                }

                const layerCount = 5; // Aumentado para tener más rayos y auras superpuestas
                for (let i = 0; i < layerCount; i++) {
                    const useRays = (i === 1 || i === 3); // 2 capas de rayos dinámicos intercaladas
                    const spriteMaterial = new THREE.SpriteMaterial({
                        map: useRays ? SHARED_RAYS_TEXTURE : SHARED_SUN_TEXTURE,
                        color: sys.sunColor,
                        transparent: true,
                        blending: THREE.AdditiveBlending,
                        depthWrite: false,
                        depthTest: false,
                        opacity: 1.0 - (i * 0.15)
                    });
                    const sprite = new THREE.Sprite(spriteMaterial);

                    const scaleMult = Config.SUN_GLOW_SCALE * (1.5 + i * 0.7);
                    sprite.scale.set(sys.radius * scaleMult, sys.radius * scaleMult, 1);
                    sprite.position.set(sys.lx, sys.ly, sys.lz);
                    sprite.frustumCulled = true; 

                    // Datos para animar en el bucle
                    sprite.userData = {
                        baseScale: sys.radius * scaleMult,
                        rotSpeed: (i % 2 === 0 ? 1 : -1) * (0.02 + Math.random() * 0.08), // Rotaciones erráticas
                        phaseOffset: i * Math.PI / 3, // Desfase para latidos desincronizados
                        isRay: useRays
                    };

                    sys.coronaSprites.push(sprite);
                    this.group.add(sprite);
                }

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

    update(dt, playerLx, playerLy, playerLz, closestSystem, closestPlanet, camera) {
        let asteroidsUpdated = false;
        let aIdx = 0;

        if (this.asteroidMesh) {
            this.asteroidMesh.visible = false;
        }

        for (let sys of this.systems) {
            sys.update(dt);
            sys.updateAbsolutePosition(this.group.position.x, this.group.position.y, this.group.position.z);

            // OPTIMIZACIÓN EXTREMA: Solo mostrar la estrella si pertenece al sistema actual Y está dentro del rango visual
            // (incluyendo compañeras binarias si estamos en la principal, o viceversa)
            const dx = playerLx - sys.lx;
            const dy = playerLy - sys.ly;
            const dz = playerLz - sys.lz;
            const sysDistSq = dx*dx + dy*dy + dz*dz;
            
            const maxSysDist = sys.radius * Config.LOD_HIGH_DISTANCE_MULT;
            const isInSysRange = sysDistSq < (maxSysDist * maxSysDist);

            const isCurrentSystem = ((sys === closestSystem) || (sys.primary === closestSystem) || (sys === closestSystem?.primary)) && isInSysRange;

            // Calculamos atenuación por distancia centralmente
            let dist = 1000.0;
            let distanceInRadii = 1000.0;
            let solarFilter = 0.0;
            
            if (isCurrentSystem) {
                dist = Math.max(0.1, Math.sqrt(sysDistSq));
                distanceInRadii = dist / sys.radius;
                
                // Filtro Solar Automático (Telescopio H-Alpha de la nave)
                // Se activa desde los 6 radios, logrando su máximo efecto a los 2 radios
                solarFilter = Math.max(0.0, Math.min(1.0, 1.0 - ((distanceInRadii - 2.0) / 4.0)));
            }

            if (sys.mesh) {
                sys.mesh.visible = isCurrentSystem;
                if (sys.mesh.visible) {
                    if (sys.isCompanion || sys.isPrimaryBinary) {
                        sys.mesh.position.set(sys.lx, sys.ly, sys.lz);
                    }
                    if (sys.mesh.material && sys.mesh.material.uniforms) {
                        if (sys.mesh.material.uniforms.uTime) {
                            const now = performance.now() * 0.001;
                            sys.mesh.material.uniforms.uTime.value = now + sys.timeOffset;
                        }
                        if (sys.mesh.material.uniforms.uSolarFilter) {
                            sys.mesh.material.uniforms.uSolarFilter.value = solarFilter;
                        }
                    }
                }
            }

            let starWorldPos = new THREE.Vector3();
            let isStarInFront = false;
            let distFromCenter = 0;
            let viewShift = 0;
            let occlusionFactor = 1.0;
            
            if (camera && isCurrentSystem) {
                const C = camera.position;
                starWorldPos.set(sys.lx + this.group.position.x, sys.ly + this.group.position.y, sys.lz + this.group.position.z);
                const cameraDir = new THREE.Vector3();
                camera.getWorldDirection(cameraDir);
                const starDir = starWorldPos.clone().sub(C).normalize();
                
                isStarInFront = cameraDir.dot(starDir) > 0;
                if (isStarInFront) {
                    starWorldPos.project(camera); // Rango de coordenadas de pantalla [-1, 1]
                    distFromCenter = Math.sqrt(starWorldPos.x*starWorldPos.x + starWorldPos.y*starWorldPos.y);
                }
                
                // Un valor pseudo-aleatorio pero SUAVE (sin brincos por límites de PI) que reacciona a la rotación pura de la cámara
                viewShift = cameraDir.x * 3.0 + cameraDir.y * 2.5 + cameraDir.z * 2.0;
                
                // Cálculo de oclusión física por planetas (Eclipses y Atardeceres)
                const distCS = C.distanceTo(new THREE.Vector3(sys.lx + this.group.position.x, sys.ly + this.group.position.y, sys.lz + this.group.position.z));
                const angRadStar = Math.asin(Math.min(1.0, sys.radius / distCS));
                
                for (let p of sys.planets) {
                    const P = new THREE.Vector3(p.lx + this.group.position.x, p.ly + this.group.position.y, p.lz + this.group.position.z);
                    const distCP = C.distanceTo(P);
                    
                    if (distCP < distCS) { // Solo si el planeta está frente a la estrella
                        let angRadPlanet = distCP <= p.radius ? Math.PI : Math.asin(p.radius / distCP);
                        
                        const dirP = P.clone().sub(C).normalize();
                        const angle = starDir.angleTo(dirP);
                        
                        const fullyOccluded = Math.max(0, angRadPlanet - angRadStar);
                        const fullyVisible = angRadPlanet + angRadStar * 1.5; 
                        
                        if (angle < fullyOccluded) {
                            occlusionFactor = 0.0;
                            break;
                        } else if (angle < fullyVisible) {
                            let partial = (angle - fullyOccluded) / (fullyVisible - fullyOccluded);
                            partial = partial * partial * (3 - 2 * partial); // Smoothstep
                            occlusionFactor = Math.min(occlusionFactor, partial);
                        }
                    }
                }
            }

            if (sys.coronaSprites) {
                const now = performance.now() * 0.001;
                for (let i = 0; i < sys.coronaSprites.length; i++) {
                    let sprite = sys.coronaSprites[i];
                    sprite.visible = isCurrentSystem;
                    if (sprite.visible) {
                        if (sys.isCompanion || sys.isPrimaryBinary) {
                            sprite.position.set(sys.lx, sys.ly, sys.lz);
                        }
                        
                        let scalePulse = 1.0;
                        if (sprite.userData.isRay) {
                            const dynamicRot = sprite.userData.phaseOffset + viewShift * (i % 2 === 0 ? 1 : -1) * 0.5;
                            sprite.material.rotation = dynamicRot;
                            scalePulse = 1.0 + Math.min(0.2, distFromCenter * 0.1);
                            
                            // Difuminación dinámica: los rayos cambian de intensidad mágicamente al girar la vista
                            const anglePhase = viewShift * 4.0 + sprite.userData.phaseOffset;
                            const angleOpacity = 0.4 + 0.6 * Math.sin(anglePhase);
                            sprite.material.opacity = Math.max(0.15, 1.0 - (solarFilter * 0.85)) * angleOpacity * occlusionFactor;
                        } else {
                            sprite.material.rotation += sprite.userData.rotSpeed * dt * (sys.activity || 1.0);
                            scalePulse = 1.0 + Math.sin(now * 2.0 * (sys.activity || 1.0) + sys.timeOffset + sprite.userData.phaseOffset) * 0.05;
                            sprite.material.opacity = Math.max(0.15, 1.0 - (solarFilter * 0.85)) * occlusionFactor * (sys.luminosity || 1.0);
                        }
                        
                        sprite.scale.set(sprite.userData.baseScale * scalePulse, sprite.userData.baseScale * scalePulse, 1);
                        
                        // Si está totalmente eclipsada, ocultamos para optimizar
                        if (occlusionFactor <= 0.001) sprite.visible = false;
                    }
                }
            }

            if (sys.ghostSprites && camera) {
                if (isCurrentSystem && isStarInFront && Math.abs(starWorldPos.x) < 2.0 && Math.abs(starWorldPos.y) < 2.0) {
                    const opacityFactor = Math.max(0.0, 1.0 - (dist / (sys.radius * 2000.0)));
                    const vecX = -starWorldPos.x;
                    const vecY = -starWorldPos.y;
                    
                    sys.ghostSprites.forEach((g, index) => {
                        let flareX = starWorldPos.x + vecX * g.dist;
                        let flareY = starWorldPos.y + vecY * g.dist;
                        
                        if (g.offset) {
                            flareX += vecY * g.offset;
                            flareY += -vecX * g.offset;
                        }
                        
                        const hexScaleFactor = Math.max(0.3, Math.min(1.5, (sys.radius * 40.0) / dist));
                        const pulse = 1.0 + Math.sin(viewShift * 5.0 + index) * 0.15;
                        const currentPixelSize = g.baseSize * hexScaleFactor * pulse;
                        
                        // Conversión a rango NDC (-1 a 1) para el tamaño
                        const scaleX = (currentPixelSize * 2.0) / window.innerWidth;
                        const scaleY = (currentPixelSize * 2.0) / window.innerHeight;
                        
                        g.sprite.material.uniforms.uScreenPos.value.set(flareX, flareY);
                        g.sprite.material.uniforms.uScale.value.set(scaleX, scaleY);
                        
                        const finalOpacity = opacityFactor * pulse * (1.0 - solarFilter) * (g.baseOp || 1.0) * occlusionFactor * (sys.luminosity || 1.0);
                        g.sprite.material.uniforms.uOpacity.value = finalOpacity;
                        
                        g.sprite.visible = occlusionFactor > 0.001;
                    });
                } else {
                    sys.ghostSprites.forEach(g => g.sprite.visible = false);
                }
            }

            for (let p of sys.planets) {
                p.updateAbsolutePosition(this.group.position.x, this.group.position.y, this.group.position.z);

                if (p.mesh) {
                    p.mesh.visible = (p === closestPlanet);
                    if (p.mesh.visible) {
                        p.mesh.position.set(p.lx, p.ly, p.lz);
                        // Aplicar spin (Y) sobre el eje inclinado (X)
                        p.mesh.rotation.order = 'YXZ';
                        p.mesh.rotation.x = p.axialTilt;
                        p.mesh.rotation.y = p.rotationY;
                    }
                }

                if (p.ringMesh) {
                    p.ringMesh.visible = (p === closestPlanet);
                    if (p.ringMesh.visible) {
                        p.ringMesh.position.set(p.lx, p.ly, p.lz);
                        p.ringMesh.rotation.order = 'YXZ';
                        // El anillo de ThreeJS se genera plano sobre XY. Sumamos PI/2 en X para que su normal sea Y (ecuador),
                        // y luego le sumamos la inclinación del eje (axialTilt).
                        p.ringMesh.rotation.x = Math.PI / 2 + p.axialTilt;
                        p.ringMesh.rotation.y = p.rotationY * 0.2; // Giran despacio
                        
                        const distSq = (p.lx - playerLx) ** 2 + (p.ly - playerLy) ** 2 + (p.lz - playerLz) ** 2;
                        const hdDist = p.radius * Config.LOD_HIGH_DISTANCE_MULT;
                        p.ringMesh.visible = distSq < hdDist * hdDist;
                        
                        if (p.ringMesh.visible && p.ringMesh.material.uniforms.sunDirection) {
                            // Dirección desde el planeta hacia su estrella (en espacio local del Chunk, que equivale a espacio padre del anillo)
                            const sunDir = new THREE.Vector3(sys.lx - p.lx, sys.ly - p.ly, sys.lz - p.lz).normalize();
                            
                            // Para calcular la sombra localmente sin perder precisión,
                            // transformamos la dirección del sol al espacio local del anillo
                            const ringQuat = new THREE.Quaternion().setFromEuler(p.ringMesh.rotation);
                            const sunDirLocal = sunDir.clone().applyQuaternion(ringQuat.invert());
                            
                            p.ringMesh.material.uniforms.sunDirection.value.copy(sunDirLocal);
                            p.ringMesh.material.uniforms.planetRadius.value = p.radius;
                        }
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
            if (sys.coronaSprites) {
                for (let sprite of sys.coronaSprites) {
                    sprite.material.dispose();
                    this.group.remove(sprite);
                }
            }
            if (sys.ghostSprites) {
                sys.ghostSprites.forEach(g => {
                    this.group.remove(g.sprite);
                    g.sprite.material.dispose();
                });
            }
            if (sys.mesh) {
                if (sys.mesh.material) sys.mesh.material.dispose();
                this.group.remove(sys.mesh);
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
