import * as THREE from 'three';
import { seededRandom } from '../../utils/MathUtils.js';
import { generateStarName, generatePlanetName } from '../generators/NameGenerator.js';
import { Config } from '../../core/Config.js';
import { Star } from '../entities/Star.js';
import { Planet } from '../entities/Planet.js';
import { BlackHole } from '../entities/BlackHole.js';

const SHARED_SPHERE_GEO = new THREE.SphereGeometry(1, 10, 10);
const SHARED_STAR_MAT = new THREE.PointsMaterial({
    size: Config.RENDER_STAR_POINT_SIZE, vertexColors: true, transparent: true, opacity: 0.9, sizeAttenuation: true
});
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
            const bhSeed = 505;
            const lx = (seededRandom(this.cx, this.cy, this.cz, bhSeed) - 0.5) * this.size * 0.8;
            const ly = (seededRandom(this.cx, this.cy, this.cz, bhSeed + 1) - 0.5) * this.size * 0.8;
            const lz = (seededRandom(this.cx, this.cy, this.cz, bhSeed + 2) - 0.5) * this.size * 0.8;

            // Variar tamaño: 5% de que sea un monstruo "Supermasivo" (Ultra-Massive)
            let bhSizeMult = 1.0;
            if (seededRandom(this.cx, this.cy, this.cz, bhSeed + 10) > 0.95) {
                bhSizeMult = 6.0; // ¡6 veces el tamaño máximo!
            }
            const radius = Config.STAR_RADIUS_MAX * (1 + seededRandom(this.cx, this.cy, this.cz, bhSeed + 3) * 2) * bhSizeMult;

            const bhPrefixes = [
                'Leviatán', 'Abismo', 'Vacío', 'Fauces', 'Devorador', 'Singularidad', 'Érebus',
                'Vórtice', 'Horizonte', 'Tártaro', 'Colapso', 'Maelstrom', 'Cenotafio', 'Gehena',
                'Ruina', 'Olvido', 'Génesis Oscuro', 'Enigma', 'Tirano', 'Demolición',
                'Supreme', 'Macro', 'Prime', 'Ultimate', 'Titan', 'Mega', 'Final', 'Morgoth', 'Sauron', 'Melkor',
                'Surtur', 'Shiva', 'Zeus', 'Odin', 'Ragnarok', 'Doomsday', 'Apocalypse', 'Extinction', 'Oblivion',
                'Inferno', 'Purgatory', 'Hellfire', 'Nether', 'Abaddon', 'Moloch', 'Belial', 'Asmodeus', 'Beelzebub',
                'Lucifer', 'Samael', 'Mammon', 'Leviathan', 'Rahab', 'Tiamat', 'Set', 'Typhon', 'Fenrir', 'Jormungandr',
                'Cerberus', 'Charon', 'Hades', 'Pluto', 'Orcus', 'Nyx', 'Erebus', 'Thanatos', 'Hypnos', 'Morpheus'
            ];

            const realSciFiPrefixes = ['NGC-', 'Cygnus X-', 'Sgr A*', 'Messier ', 'V404-', 'GRO J', 'Quasar ', 'Omega ', 'Epsilon Void '];
            const allPrefixes = [...bhPrefixes, ...realSciFiPrefixes];

            let bhName = allPrefixes[Math.floor(seededRandom(this.cx, this.cy, this.cz, bhSeed + 5) * allPrefixes.length)] + ' ';
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
            const suffix = chars[Math.floor(seededRandom(this.cx, this.cy, this.cz, bhSeed + 6) * chars.length)];

            let finalName = bhName + Math.floor(seededRandom(this.cx, this.cy, this.cz, bhSeed + 4) * 10000) + suffix;
            if (bhSizeMult > 1) finalName = 'Gargantúa ' + finalName;

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
                        if (typeRand > 0.85) pType = 'Ocean Planet';
                        else if (typeRand > 0.70) pType = 'Lava Planet';
                        else if (typeRand > 0.55) pType = 'Ice Planet';
                        else if (typeRand > 0.45) pType = 'Crystal Planet';
                    }

                    let pColor = new THREE.Color();
                    let atmosphereDensity = 0;

                    if (isGasGiant) {
                        pColor.setHSL(hue, 0.7 + seededRandom(this.cx, this.cy, this.cz, pSeed + 1) * 0.3, 0.4 + seededRandom(this.cx, this.cy, this.cz, pSeed + 2) * 0.4);
                        atmosphereDensity = 0.001; // Densidad enorme para gaseosos (aunque no aterricemos)
                    } else {
                        // Color base procedural dependiente del tipo
                        if (pType === 'Ocean Planet') {
                            pColor.setHSL(0.55 + seededRandom(this.cx, this.cy, this.cz, pSeed) * 0.1, 0.8, 0.3);
                            atmosphereDensity = 0.0003 + seededRandom(this.cx, this.cy, this.cz, pSeed) * 0.0002;
                        } else if (pType === 'Lava Planet') {
                            pColor.setHSL(0.0 + seededRandom(this.cx, this.cy, this.cz, pSeed) * 0.1, 0.9, 0.4);
                            atmosphereDensity = 0.0004; // Mucha niebla y ceniza
                        } else if (pType === 'Ice Planet') {
                            pColor.setHSL(0.5 + seededRandom(this.cx, this.cy, this.cz, pSeed) * 0.1, 0.4, 0.8);
                        } else if (pType === 'Crystal Planet') {
                            pColor.setHSL(hue, 0.9, 0.6);
                        } else {
                            // Rocky
                            pColor.setHSL(hue, 0.2 + seededRandom(this.cx, this.cy, this.cz, pSeed + 1) * 0.4, 0.2 + seededRandom(this.cx, this.cy, this.cz, pSeed + 2) * 0.5);
                            const atmoChance = seededRandom(this.cx, this.cy, this.cz, pSeed + 13);
                            if (atmoChance > 0.3) {
                                atmosphereDensity = 0.00005 + seededRandom(this.cx, this.cy, this.cz, pSeed + 14) * 0.00045;
                            }
                        }
                    }

                    const pRadius = isGasGiant ? (Config.PLANET_GAS_RADIUS_MIN + seededRandom(this.cx, this.cy, this.cz, pSeed + 6) * (Config.PLANET_GAS_RADIUS_MAX - Config.PLANET_GAS_RADIUS_MIN)) : (Config.PLANET_ROCKY_RADIUS_MIN + seededRandom(this.cx, this.cy, this.cz, pSeed + 7) * (Config.PLANET_ROCKY_RADIUS_MAX - Config.PLANET_ROCKY_RADIUS_MIN));
                    const orbitRadius = sunRadius * 1.5 + Config.ORBIT_DISTANCE_START + j * (Config.ORBIT_DISTANCE_SPACING + seededRandom(this.cx, this.cy, this.cz, pSeed + 8) * Config.ORBIT_DISTANCE_VAR);
                    const orbitSpeed = (seededRandom(this.cx, this.cy, this.cz, pSeed + 9) * Config.PLANET_ORBIT_SPEED_VAR + Config.PLANET_ORBIT_SPEED_BASE) * (seededRandom(this.cx, this.cy, this.cz, pSeed + 10) > 0.5 ? 1 : -1);
                    const rotationSpeed = Config.PLANET_ROTATION_SPEED * (0.2 + seededRandom(this.cx, this.cy, this.cz, pSeed + 15) * 1.8);
                    const startAngle = seededRandom(this.cx, this.cy, this.cz, pSeed + 11) * Math.PI * 2;
                    const planetInstance = new Planet({
                        name: pName, type: pType, radius: pRadius, color: pColor,
                        atmosphereDensity: atmosphereDensity,
                        orbitRadius, orbitSpeed, rotationSpeed,
                        angle: startAngle, tiltOffset: seededRandom(this.cx, this.cy, this.cz, pSeed + 12) * Math.PI * 2,
                        rotationY: 0, lx: 0, ly: 0, lz: 0
                    });
                    planets.push(planetInstance);
                }
                const starInstance = new Star({
                    name: starName, type: starType, sunColor, radius: sunRadius, lx, ly, lz, planets
                });
                systemsData.push(starInstance);
                totalPlanets += numPlanets;
            }

            if (totalPlanets > 0) {
                this.planetMesh = new THREE.InstancedMesh(SHARED_SPHERE_GEO, SHARED_PLANET_MAT, totalPlanets);
                this.planetMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
                this.planetMesh.frustumCulled = false;
                this.group.add(this.planetMesh);
            }

            let pIndex = 0;
            for (let sys of systemsData) {
                const spriteMaterial = new THREE.SpriteMaterial({
                    map: SHARED_SUN_TEXTURE, color: sys.sunColor, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false
                });
                const sunSprite = new THREE.Sprite(spriteMaterial);
                sunSprite.scale.set(sys.radius * Config.SUN_GLOW_SCALE, sys.radius * Config.SUN_GLOW_SCALE, 1);
                sunSprite.position.set(sys.lx, sys.ly, sys.lz);
                sunSprite.frustumCulled = true; // No dibujar soles a tus espaldas
                this.group.add(sunSprite);

                for (let p of sys.planets) {
                    p.instanceId = pIndex;
                    if (this.planetMesh) this.planetMesh.setColorAt(pIndex, p.color);
                    pIndex++;
                }
                this.systems.push(sys);
            }
        }
    }

    update(dt) {
        let matricesUpdated = false;
        for (let sys of this.systems) {
            sys.update(dt);
            for (let p of sys.planets) {
                // Update absolute positions for UI calculations
                sys.updateAbsolutePosition(this.group.position.x, this.group.position.y, this.group.position.z);
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
        }
        if (matricesUpdated && this.planetMesh) this.planetMesh.instanceMatrix.needsUpdate = true;
    }

    dispose() {
        this.group.traverse((child) => {
            if (child.geometry && child.geometry !== SHARED_SPHERE_GEO) child.geometry.dispose();
            if (child.material && child.material !== SHARED_STAR_MAT && child.material !== SHARED_PLANET_MAT && !child.isSprite) {
                if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
                else child.material.dispose();
            }
            if (child.isSprite && child.material) child.material.dispose();
        });
        if (this.planetMesh) this.planetMesh.dispose();
        this.scene.remove(this.group);
    }
}
