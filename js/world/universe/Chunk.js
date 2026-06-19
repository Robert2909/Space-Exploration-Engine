import * as THREE from 'three';
import { seededRandom } from '../../utils/MathUtils.js';
import { generateStarName, generatePlanetName, generateBlackHoleName } from '../generators/NameGenerator.js';
import { Config } from '../../core/Config.js';
import { Star } from '../entities/Star.js';
import { Planet } from '../entities/Planet.js';
import { BlackHole } from '../entities/BlackHole.js';

const SHARED_SPHERE_GEO = new THREE.SphereGeometry(1, 16, 16);
const SHARED_ASTEROID_GEO = new THREE.IcosahedronGeometry(1, 0); // Low-poly para asteroides
const SHARED_STAR_MAT = new THREE.PointsMaterial({
    size: Config.RENDER_STAR_POINT_SIZE, vertexColors: true, transparent: true, opacity: 0.9, sizeAttenuation: true
});
const SHARED_ASTEROID_MAT = new THREE.MeshBasicMaterial({ color: 0x888888 });

function createPlanetTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512; canvas.height = 256;
    const ctx = canvas.getContext('2d');

    // Base blanca
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 512, 256);

    // Dibujar continentes y manchas difusas
    for (let i = 0; i < 150; i++) {
        let x = Math.random() * 512;
        let y = Math.random() * 256;
        let r = Math.random() * 40 + 10;
        let alpha = Math.random() * 0.4 + 0.1;

        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(180, 180, 180, ${alpha})`;
        ctx.fill();

        // Wrap horizontal (izquierda y derecha) para que la textura sea continua (seamless)
        ctx.beginPath(); ctx.arc(x - 512, y, r, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(x + 512, y, r, 0, Math.PI * 2); ctx.fill();
    }

    // Dibujar algunas bandas/nubes horizontales para dar sensación planetaria
    for (let y = 0; y < 256; y += 12) {
        ctx.fillStyle = `rgba(140, 140, 140, ${Math.random() * 0.15})`;
        ctx.fillRect(0, y, 512, Math.random() * 20 + 5);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    // Se recomienda un poco de aniso para que no se vea feo en los bordes
    tex.anisotropy = 4;
    return tex;
}
const SHARED_PLANET_TEX = createPlanetTexture();
const SHARED_PLANET_MAT = new THREE.MeshLambertMaterial({ color: 0xffffff, map: SHARED_PLANET_TEX });
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
        this.scene.add(this.group);
        this.systems = [];
        this.planetMesh = null;
        this.generate();
    }

    generate() {
        this.generateStarfield();
        this.generateSystems();
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

            if (seededRandom(this.cx, this.cy, this.cz, bhSeed + 10) > (1 - Config.BLACK_HOLE_ULTRA_MASSIVE_CHANCE)) {
                bhSizeMult = 4.0 + seededRandom(this.cx, this.cy, this.cz, bhSeed + 11) * Config.BLACK_HOLE_SIZE_MULT_ULTRA;
            }
            const radius = Config.STAR_RADIUS_MAX * (1 + seededRandom(this.cx, this.cy, this.cz, bhSeed + 3) * Config.BLACK_HOLE_BASE_RADIUS_VAR) * bhSizeMult;

            const finalName = generateBlackHoleName(bhSeed, this.cx, this.cy, this.cz, bhSizeMult);

            const blackHole = new BlackHole({
                name: finalName,
                radius: radius,
                lx: lx, ly: ly, lz: lz
            });
            this.systems.push(blackHole);
            this.group.add(blackHole.mesh);
            return; // Si hay agujero negro, devora todo lo demás, no hay estrellas normales.
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
                const isBlue = seededRandom(this.cx, this.cy, this.cz, seedBase + 3) > (1 - Config.STAR_BLUE_CHANCE);
                const isRed = seededRandom(this.cx, this.cy, this.cz, seedBase + 4) > (1 - Config.STAR_RED_CHANCE);
                let starType = 'Main Sequence Star';
                let sunColorObj = new THREE.Color();
                if (isBlue) {
                    starType = 'Blue Giant';
                    sunColorObj.setHSL(0.55 + seededRandom(this.cx, this.cy, this.cz, seedBase + 10) * 0.1, 0.8, 0.7 + seededRandom(this.cx, this.cy, this.cz, seedBase + 11) * 0.2);
                } else if (isRed) {
                    starType = 'Red Dwarf';
                    sunColorObj.setHSL(0.0 + seededRandom(this.cx, this.cy, this.cz, seedBase + 10) * 0.1, 0.8, 0.5 + seededRandom(this.cx, this.cy, this.cz, seedBase + 11) * 0.2);
                } else {
                    sunColorObj.setHSL(0.1 + seededRandom(this.cx, this.cy, this.cz, seedBase + 10) * 0.08, 0.6 + seededRandom(this.cx, this.cy, this.cz, seedBase + 11) * 0.4, 0.6 + seededRandom(this.cx, this.cy, this.cz, seedBase + 12) * 0.4);
                }
                const sunColor = sunColorObj.getHex();

                const sunRadius = Config.STAR_RADIUS_MIN + seededRandom(this.cx, this.cy, this.cz, seedBase + 5) * (Config.STAR_RADIUS_MAX - Config.STAR_RADIUS_MIN);
                const numPlanets = Math.floor(seededRandom(this.cx, this.cy, this.cz, seedBase + 6) * Config.PLANETS_MAX_PER_SYSTEM) + 1;
                const planets = [];

                for (let j = 0; j < numPlanets; j++) {
                    const pSeed = seedBase + 20 + j;
                    const pName = generatePlanetName(starName, j, pSeed + 13, this.cx, this.cy, this.cz);
                    const hue = seededRandom(this.cx, this.cy, this.cz, pSeed);
                    const isGasGiant = seededRandom(this.cx, this.cy, this.cz, pSeed + 5) > (1 - Config.GAS_GIANT_CHANCE);
                    let pType = 'Rocky Planet';
                    if (isGasGiant) {
                        pType = 'Gas Giant';
                    } else {
                        const typeRand = seededRandom(this.cx, this.cy, this.cz, pSeed + 20);
                        let cumulative = 1.0;
                        pType = 'Rocky Planet'; // Fallback

                        for (const [biomeName, biomeData] of Object.entries(Config.PLANET_BIOMES)) {
                            if (biomeName !== 'Rocky Planet') {
                                cumulative -= biomeData.chance;
                                if (typeRand > cumulative) {
                                    pType = biomeName;
                                    break;
                                }
                            }
                        }
                    }

                    let pColor = new THREE.Color();
                    let atmosphereDensity = 0;

                    if (isGasGiant) {
                        pColor.setHSL(hue, 0.7 + seededRandom(this.cx, this.cy, this.cz, pSeed + 1) * 0.3, 0.4 + seededRandom(this.cx, this.cy, this.cz, pSeed + 2) * 0.4);
                        atmosphereDensity = 0.001; // Densidad enorme para gaseosos (aunque no aterricemos)
                    } else {
                        // Leer datos del registro (Data-Driven Pattern)
                        const biome = Config.PLANET_BIOMES[pType] || Config.PLANET_BIOMES['Rocky Planet'];

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
                    }

                    // Generar las variables de varianza únicas del planeta
                    const terrainVariance = {
                        heightMod: 0.5 + seededRandom(this.cx, this.cy, this.cz, pSeed + 30) * 1.5, // 0.5x a 2.0x
                        freqMod: 0.5 + seededRandom(this.cx, this.cy, this.cz, pSeed + 31) * 1.5,   // 0.5x a 2.0x
                        octavesMod: Math.floor(seededRandom(this.cx, this.cy, this.cz, pSeed + 32) * 3) - 1, // -1, 0, o +1
                        exponentMod: 0.8 + seededRandom(this.cx, this.cy, this.cz, pSeed + 33) * 0.6  // 0.8x a 1.4x
                    };

                    const pRadius = isGasGiant ? (Config.PLANET_GAS_RADIUS_MIN + seededRandom(this.cx, this.cy, this.cz, pSeed + 6) * (Config.PLANET_GAS_RADIUS_MAX - Config.PLANET_GAS_RADIUS_MIN)) : (Config.PLANET_ROCKY_RADIUS_MIN + seededRandom(this.cx, this.cy, this.cz, pSeed + 7) * (Config.PLANET_ROCKY_RADIUS_MAX - Config.PLANET_ROCKY_RADIUS_MIN));
                    const orbitRadius = sunRadius * 1.5 + Config.ORBIT_DISTANCE_START + j * (Config.ORBIT_DISTANCE_SPACING + seededRandom(this.cx, this.cy, this.cz, pSeed + 8) * Config.ORBIT_DISTANCE_VAR);
                    const baseOrbitSpeed = Config.PLANET_ORBIT_SPEED_MIN + seededRandom(this.cx, this.cy, this.cz, pSeed + 9) * (Config.PLANET_ORBIT_SPEED_MAX - Config.PLANET_ORBIT_SPEED_MIN);
                    const orbitSpeed = baseOrbitSpeed * (seededRandom(this.cx, this.cy, this.cz, pSeed + 10) > 0.5 ? 1 : -1);
                    const baseRotationSpeed = Config.PLANET_ROTATION_SPEED_MIN + seededRandom(this.cx, this.cy, this.cz, pSeed + 15) * (Config.PLANET_ROTATION_SPEED_MAX - Config.PLANET_ROTATION_SPEED_MIN);
                    const rotationSpeed = baseRotationSpeed * (seededRandom(this.cx, this.cy, this.cz, pSeed + 16) > 0.5 ? 1 : -1);
                    const startAngle = seededRandom(this.cx, this.cy, this.cz, pSeed + 11) * Math.PI * 2;
                    const planetInstance = new Planet({
                        name: pName, type: pType, radius: pRadius, color: pColor,
                        atmosphereDensity: atmosphereDensity,
                        orbitRadius, orbitSpeed, rotationSpeed,
                        angle: startAngle, tiltOffset: seededRandom(this.cx, this.cy, this.cz, pSeed + 12) * Math.PI * 2,
                        rotationY: 0, lx: 0, ly: 0, lz: 0,
                        terrainVariance: terrainVariance
                    });
                    planets.push(planetInstance);
                }
                const starInstance = new Star({
                    name: starName, type: starType, sunColor, radius: sunRadius, lx, ly, lz, planets
                });
                systemsData.push(starInstance);
                totalPlanets += numPlanets;
                let companionRef = null;

                // --- BINARY STAR CHECK ---
                const isBinary = seededRandom(this.cx, this.cy, this.cz, seedBase + 50) > (1 - Config.BINARY_STAR_CHANCE);
                if (isBinary) {
                    const compRadius = sunRadius * (0.3 + seededRandom(this.cx, this.cy, this.cz, seedBase + 51) * 0.6); // 30% to 90% size of main star
                    const compIsBlue = seededRandom(this.cx, this.cy, this.cz, seedBase + 52) > 0.5;
                    const compIsRed = seededRandom(this.cx, this.cy, this.cz, seedBase + 53) > 0.5;
                    let compColorObj = new THREE.Color();
                    if (compIsBlue) {
                        compColorObj.setHSL(0.55 + seededRandom(this.cx, this.cy, this.cz, seedBase + 54) * 0.1, 0.8, 0.7);
                    } else if (compIsRed) {
                        compColorObj.setHSL(0.0 + seededRandom(this.cx, this.cy, this.cz, seedBase + 54) * 0.1, 0.8, 0.5);
                    } else {
                        compColorObj.setHSL(0.1 + seededRandom(this.cx, this.cy, this.cz, seedBase + 54) * 0.08, 0.6, 0.6);
                    }
                    const compColor = compColorObj.getHex();

                    const compDistance = sunRadius * 2 + seededRandom(this.cx, this.cy, this.cz, seedBase + 55) * sunRadius * 3;
                    const compAngle = seededRandom(this.cx, this.cy, this.cz, seedBase + 56) * Math.PI * 2;
                    const compSpeed = Config.PLANET_ORBIT_SPEED_MAX * (0.5 + seededRandom(this.cx, this.cy, this.cz, seedBase + 57)) * (seededRandom(this.cx, this.cy, this.cz, seedBase + 58) > 0.5 ? 1 : -1);

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
                    starInstance.asteroidBelt = {
                        count: 100 + Math.floor(seededRandom(this.cx, this.cy, this.cz, seedBase + 61) * 300),
                        innerRadius: sunRadius * 4 + seededRandom(this.cx, this.cy, this.cz, seedBase + 62) * sunRadius * 5,
                        width: sunRadius * 2,
                        speed: (seededRandom(this.cx, this.cy, this.cz, seedBase + 63) * 0.05 + 0.01) * (seededRandom(this.cx, this.cy, this.cz, seedBase + 64) > 0.5 ? 1 : -1),
                        angle: 0,
                        asteroids: [] // { radius, dist, angleOffset, rotSpeed, rotAxis, tilt }
                    };
                    for (let i = 0; i < starInstance.asteroidBelt.count; i++) {
                        starInstance.asteroidBelt.asteroids.push({
                            radius: (seededRandom(this.cx, this.cy, this.cz, seedBase + 65 + i) * 0.8 + 0.2) * 500, // Rocas de 100 a 500 unidades
                            dist: starInstance.asteroidBelt.innerRadius + seededRandom(this.cx, this.cy, this.cz, seedBase + 66 + i) * starInstance.asteroidBelt.width,
                            angleOffset: seededRandom(this.cx, this.cy, this.cz, seedBase + 67 + i) * Math.PI * 2,
                            tilt: (seededRandom(this.cx, this.cy, this.cz, seedBase + 68 + i) - 0.5) * 0.4, // Ligera variación en Y
                            rotSpeed: (seededRandom(this.cx, this.cy, this.cz, seedBase + 69 + i) - 0.5) * 2,
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

            if (totalPlanets > 0) {
                this.planetMesh = new THREE.InstancedMesh(SHARED_SPHERE_GEO, SHARED_PLANET_MAT, totalPlanets);
                this.planetMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
                this.planetMesh.frustumCulled = false;
                this.group.add(this.planetMesh);
            }
            if (totalAsteroids > 0) {
                this.asteroidMesh = new THREE.InstancedMesh(SHARED_ASTEROID_GEO, SHARED_ASTEROID_MAT, totalAsteroids);
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
                    p.instanceId = pIndex;
                    if (this.planetMesh) this.planetMesh.setColorAt(pIndex, p.color);
                    pIndex++;
                }
                if (sys.asteroidBelt) {
                    sys.asteroidBelt.startIndex = aIndex;
                    aIndex += sys.asteroidBelt.count;
                }
                this.systems.push(sys);
            }
        }
    }

    update(dt) {
        let matricesUpdated = false;
        let asteroidsUpdated = false;
        for (let sys of this.systems) {
            sys.update(dt);
            sys.updateAbsolutePosition(this.group.position.x, this.group.position.y, this.group.position.z);
            if (sys.sprite && sys.isCompanion) {
                sys.sprite.position.set(sys.lx, sys.ly, sys.lz);
            }

            for (let p of sys.planets) {
                p.updateAbsolutePosition(this.group.position.x, this.group.position.y, this.group.position.z);

                if (this.planetMesh) {
                    dummy.position.set(p.lx, p.ly, p.lz);
                    dummy.rotation.set(0, p.rotationY, 0);
                    dummy.scale.set(p.radius, p.radius, p.radius);
                    dummy.updateMatrix();
                    this.planetMesh.setMatrixAt(p.instanceId, dummy.matrix);
                    matricesUpdated = true;
                }
            }

            if (sys.asteroidBelt) {
                sys.asteroidBelt.angle += sys.asteroidBelt.speed * dt;
                let aIdx = sys.asteroidBelt.startIndex;
                for (let a of sys.asteroidBelt.asteroids) {
                    a.currentRot += a.rotSpeed * dt;
                    const totalAngle = sys.asteroidBelt.angle + a.angleOffset;

                    const ax = sys.lx + Math.cos(totalAngle) * a.dist;
                    const az = sys.lz + Math.sin(totalAngle) * a.dist;
                    const ay = sys.ly + Math.sin(totalAngle + a.tilt) * (a.dist * a.tilt);

                    dummy.position.set(ax, ay, az);
                    dummy.quaternion.setFromAxisAngle(a.rotAxis, a.currentRot);
                    dummy.scale.set(a.radius, a.radius, a.radius);
                    dummy.updateMatrix();
                    this.asteroidMesh.setMatrixAt(aIdx, dummy.matrix);
                    aIdx++;
                    asteroidsUpdated = true;
                }
            }
        }
        if (matricesUpdated && this.planetMesh) this.planetMesh.instanceMatrix.needsUpdate = true;
        if (asteroidsUpdated && this.asteroidMesh) this.asteroidMesh.instanceMatrix.needsUpdate = true;
    }

    dispose() {
        this.group.traverse((child) => {
            if (child.geometry && child.geometry !== SHARED_SPHERE_GEO && child.geometry !== SHARED_ASTEROID_GEO) child.geometry.dispose();
            if (child.material && child.material !== SHARED_STAR_MAT && child.material !== SHARED_PLANET_MAT && child.material !== SHARED_ASTEROID_MAT && !child.isSprite) {
                if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
                else child.material.dispose();
            }
            if (child.isSprite && child.material) child.material.dispose();
        });
        if (this.planetMesh) this.planetMesh.dispose();
        if (this.asteroidMesh) this.asteroidMesh.dispose();
        this.scene.remove(this.group);
    }
}
