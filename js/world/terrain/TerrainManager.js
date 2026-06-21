import * as THREE from 'three';
import { TerrainGenerator } from './TerrainGenerator.js';
import { Config } from '../../core/Config.js';

export class TerrainManager {
    constructor(scene, planetData, startX = 0, startZ = 0, initialTimeOfDay = 0, initialLat = 0) {
        this.scene = scene;
        this.group = new THREE.Group();
        this.scene.add(this.group);

        // El mapa ahora es infinito y se genera por chunks dinámicos
        this.chunkSize = Config.TERRAIN_CHUNK_SIZE;
        this.renderDistance = Config.TERRAIN_RENDER_DISTANCE; // 3x3 chunks

        // Pasar la semilla del planeta si existe, o aleatoria
        let seed = 0;
        if (planetData && planetData.name) {
            for (let i = 0; i < planetData.name.length; i++) seed += planetData.name.charCodeAt(i);
        }

        this.generator = new TerrainGenerator(this.chunkSize * 3, seed, planetData ? planetData.type : 'Planeta rocoso', planetData ? planetData.radius * 10 : 50000, planetData ? planetData.terrainVariance : null);
        this.chunks = new Map(); // Ahora usamos un Map para buscar chunks por "x,z"

        // Web Worker para generación de terreno asíncrona
        this.worker = new Worker(new URL('../workers/TerrainWorker.js', import.meta.url), { type: 'module' });
        this.worker.onmessage = this.onWorkerMessage.bind(this);
        this.worker.onerror = (err) => console.error('TerrainWorker Error:', err);

        // FASE 3: Object Pool de SharedArrayBuffers para cero-clonación y cero-GC
        this.bufferPool = [];
        this.activeBuffers = new Map();

        const res = Config.TERRAIN_CHUNK_RESOLUTION;
        const numVertices = res * res * 2 * 3;
        const bufferSize = numVertices * 3 * 4; // 3 floats por vértice * 4 bytes

        // 3x3 chunks visibles = 9 + un pequeño margen
        const poolSize = (this.renderDistance * 2 + 1) ** 2 + 10;
        for (let i = 0; i < poolSize; i++) {
            this.bufferPool.push({
                positions: new SharedArrayBuffer(bufferSize),
                colors: new SharedArrayBuffer(bufferSize)
            });
        }

        this.planetData = planetData;
        this.initialLat = initialLat;
        this.seed = seed;
        this.terrainRadius = planetData ? planetData.radius * 10 : 50000;

        // Color base derivado del color del planeta en el espacio
        let groundColor = new THREE.Color(0x228B22);
        this.baseAtmosphereDensity = 0;

        if (planetData) {
            if (planetData.color) groundColor.copy(planetData.color);
            if (planetData.atmosphereDensity !== undefined) {
                this.baseAtmosphereDensity = planetData.atmosphereDensity;
            }
        }

        // Determinar si hay atmósfera y su color
        this.hasAtmosphere = this.baseAtmosphereDensity > 0;

        let skyColor = new THREE.Color().copy(groundColor);
        if (this.hasAtmosphere) {
            // El cielo diurno es el color del terreno pero más brillante/mezclado con blanco/azul
            skyColor.lerp(new THREE.Color(0xffffff), 0.6);
            skyColor.offsetHSL(0, 0, 0.2);
        } else {
            skyColor.setHex(0x000000);
        }

        this.skyColorBase = skyColor.getHex();

        // El terreno varía su brillo para no ser exactamente del mismo tono
        groundColor.offsetHSL(0, -0.1, -0.1);

        this.groundColor = groundColor; // Guardar para pasarlo al generador

        this.material = new THREE.MeshStandardMaterial({
            vertexColors: true,
            roughness: 0.8,
            flatShading: true // Estilo low-poly!
        });

        // Configurar la atmósfera y el cielo
        this.scene.background = new THREE.Color(this.skyColorBase);
        if (this.hasAtmosphere) {
            // Utilizamos la densidad del planeta modificada por tu control maestro
            this.scene.fog = new THREE.FogExp2(this.skyColorBase, this.baseAtmosphereDensity * Config.TERRAIN_FOG_MULTIPLIER);
        } else {
            // Niebla para planetas "sin atmósfera" controlable para permitir visión a inmensas distancias
            this.scene.fog = new THREE.FogExp2(0x000000, Config.TERRAIN_FOG_FALLBACK);
        }

        const planetOrbitRadius = this.planetData ? this.planetData.orbitRadius : 5000;
        this.sunDistanceMultiplier = THREE.MathUtils.clamp(1.0 / (planetOrbitRadius / 5000), 0.2, 1.5);

        // Generar Estrellas en el cielo
        this.createStars();

        // Ambient light for terrain
        this.ambientLight = new THREE.AmbientLight(this.hasAtmosphere ? this.skyColorBase : 0xffffff, this.hasAtmosphere ? 0.3 : 0.05);
        this.group.add(this.ambientLight);

        const createSunObj = (isCompanion, starData) => {
            const dirLight = new THREE.DirectionalLight(starData ? starData.sunColor : 0xfff4e5, isCompanion ? 0.8 : 1.2);
            dirLight.position.set(1000, 2000, 500);
            this.group.add(dirLight);
            this.group.add(dirLight.target);

            const sunRadius = (this.hasAtmosphere ? 250 : 80) * this.sunDistanceMultiplier * (isCompanion ? 0.6 : 1.0);
            const sunGeo = new THREE.SphereGeometry(sunRadius, 16, 16);
            const sunMat = new THREE.MeshBasicMaterial({ color: starData ? starData.sunColor : 0xffffff, fog: false });
            const sunMesh = new THREE.Mesh(sunGeo, sunMat);
            this.group.add(sunMesh);

            const canvas = document.createElement('canvas');
            canvas.width = 256; canvas.height = 256;
            const ctx = canvas.getContext('2d');
            const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);

            if (this.hasAtmosphere) {
                gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
                gradient.addColorStop(0.2, 'rgba(255, 240, 200, 0.8)');
                gradient.addColorStop(1, 'rgba(255, 240, 200, 0)');
            } else {
                gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
                gradient.addColorStop(0.05, 'rgba(255, 255, 255, 0.8)');
                gradient.addColorStop(0.15, 'rgba(255, 250, 230, 0.2)');
                gradient.addColorStop(1, 'rgba(255, 250, 230, 0)');
            }

            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, 256, 256);
            const glowMaterial = new THREE.SpriteMaterial({
                map: new THREE.CanvasTexture(canvas),
                color: starData ? starData.sunColor : 0xffffff,
                transparent: true, blending: THREE.AdditiveBlending, fog: false
            });
            const sunGlow = new THREE.Sprite(glowMaterial);
            const glowScale = (this.hasAtmosphere ? 2000 : 3500) * this.sunDistanceMultiplier * (isCompanion ? 0.6 : 1.0);
            sunGlow.scale.set(glowScale, glowScale, 1);
            sunMesh.add(sunGlow);

            return { dirLight, sunMesh };
        };

        const parentSys = this.planetData ? this.planetData.parentSystem : null;
        this.suns = [];
        this.suns.push(createSunObj(false, parentSys));

        if (parentSys && parentSys.companion) {
            this.suns.push(createSunObj(true, parentSys.companion));
        }

        this.timeOfDay = initialTimeOfDay; // Para el ciclo día y noche

        // Añadir agua global si es planeta oceánico
        if (planetData && planetData.type === 'Ocean Planet') {
            const waterGeo = new THREE.PlaneGeometry(this.chunkSize * 15, this.chunkSize * 15);
            waterGeo.rotateX(-Math.PI / 2);
            const waterMat = new THREE.MeshStandardMaterial({
                color: 0x1155cc,
                transparent: true,
                opacity: 0.8,
                roughness: 0.1,
                metalness: 0.8
            });
            this.waterMesh = new THREE.Mesh(waterGeo, waterMat);
            this.group.add(this.waterMesh);
        }

        // Generar los chunks iniciales
        this.update(0, { x: startX, z: startZ });
    }



    createStars() {
        const geometry = new THREE.BufferGeometry();
        const vertices = [];
        const radius = this.chunkSize * 3; // Estrellas lejos en el cielo

        for (let i = 0; i < 2000; i++) {
            const theta = 2 * Math.PI * Math.random();
            const phi = Math.acos(2 * Math.random() - 1);

            // Solo poner estrellas en la mitad superior de la cúpula celeste
            if (phi > Math.PI / 2) continue;

            const x = radius * Math.sin(phi) * Math.cos(theta);
            const y = radius * Math.cos(phi);
            const z = radius * Math.sin(phi) * Math.sin(theta);

            vertices.push(x, y, z);
        }

        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        const material = new THREE.PointsMaterial({ color: 0xffffff, size: 15, sizeAttenuation: true, fog: false });
        this.stars = new THREE.Points(geometry, material);
        this.group.add(this.stars);
    }

    generatePOIsForChunk(cx, cz, offsetX, offsetZ) {
        // Semilla local del chunk
        const seedValue = this.generator.seed + cx * 1000 + cz;
        // Probabilidad de que haya un POI en este chunk (10%)
        const chance = Math.abs(Math.sin(seedValue * 12.345));

        if (chance > 0.90) {
            const px = offsetX + (Math.sin(seedValue * 1.1) - 0.5) * this.chunkSize * 0.8;
            const pz = offsetZ + (Math.cos(seedValue * 1.2) - 0.5) * this.chunkSize * 0.8;
            const py = this.generator.getVisualHeightAt(px, pz);

            // No construir bajo el agua
            if (this.planetData && this.planetData.type === 'Ocean Planet' && py < 0) return;

            let mesh;
            const poiType = Math.abs(Math.sin(seedValue * 2.34));

            if (poiType > 0.5) {
                // Monolito alienígena
                const geo = new THREE.BoxGeometry(10, 100, 10);
                const mat = new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.9, roughness: 0.1 });
                mesh = new THREE.Mesh(geo, mat);
                mesh.position.set(px, py + 50, pz);

                // Luz de faro
                const light = new THREE.PointLight(0xff00ff, 3, 300);
                light.position.y = 50;
                mesh.add(light);
            } else {
                // Cristal gigante / Ruina
                const geo = new THREE.DodecahedronGeometry(20, 0);
                const mat = new THREE.MeshStandardMaterial({ color: 0x00ffff, emissive: 0x003355, roughness: 0.2, transparent: true, opacity: 0.8 });
                mesh = new THREE.Mesh(geo, mat);
                mesh.position.set(px, py + 10, pz);

                const light = new THREE.PointLight(0x00ffff, 2, 200);
                mesh.add(light);
            }

            this.group.add(mesh);
            if (!this.pois) this.pois = new Map();
            if (!this.pois.has(`${cx},${cz}`)) this.pois.set(`${cx},${cz}`, []);
            this.pois.get(`${cx},${cz}`).push(mesh);
        }
    }

    getChunkKey(cx, cz) {
        return `${cx},${cz}`;
    }

    update(dt, playerPos) {
        // Ciclo Día/Noche: Escalar por la velocidad de rotación real del planeta
        const rotSpeed = (this.planetData && this.planetData.rotationSpeed) ? this.planetData.rotationSpeed : 0.05;
        this.timeOfDay += dt * rotSpeed;
        const sunOrbitRadius = this.chunkSize * 2;

        let currentLat = this.initialLat || 0;
        if (playerPos) {
            currentLat = playerPos.z / this.terrainRadius;
        }

        // El sol orbita de Este a Oeste, inclinado según la latitud actual
        const eqX = Math.cos(this.timeOfDay) * sunOrbitRadius;
        const eqY = Math.sin(this.timeOfDay) * sunOrbitRadius;
        const eqZ = 0;

        const cosLat = Math.cos(currentLat);
        const sinLat = Math.sin(currentLat);

        let maxSunNormalized = -1;

        for (let i = 0; i < this.suns.length; i++) {
            const sunObj = this.suns[i];

            // Para la compañera, agregamos un offset al timeOfDay
            const timeOffset = i === 1 ? Math.PI * 0.3 : 0;

            const eqX = Math.cos(this.timeOfDay + timeOffset) * sunOrbitRadius;
            const eqY = Math.sin(this.timeOfDay + timeOffset) * sunOrbitRadius;
            const eqZ = 0;

            const sunX = eqX;
            const sunY = eqY * cosLat - eqZ * sinLat;
            const sunZ = eqY * sinLat + eqZ * cosLat;

            if (playerPos) {
                sunObj.dirLight.position.set(playerPos.x + sunX, playerPos.y + sunY, playerPos.z + sunZ);
                sunObj.dirLight.target.position.set(playerPos.x, playerPos.y, playerPos.z);
                sunObj.sunMesh.position.copy(sunObj.dirLight.position);
                if (i === 0) this.stars.position.set(playerPos.x, playerPos.y, playerPos.z);
            } else {
                sunObj.dirLight.position.set(sunX, sunY, sunZ);
                sunObj.dirLight.target.position.set(0, 0, 0);
                sunObj.sunMesh.position.set(sunX, sunY, sunZ);
            }

            const sunNormalized = sunY / sunOrbitRadius;
            if (sunNormalized > maxSunNormalized) maxSunNormalized = sunNormalized;
            const sunIntensity = Math.max(0, sunNormalized);
            sunObj.dirLight.intensity = sunIntensity * (i === 1 ? 1.0 : 1.5) * Math.min(2.0, this.sunDistanceMultiplier);
        }

        // La luz ambiente se ajusta más abajo dependiento de la atmósfera
        if (this.hasAtmosphere) {
            let skyBlend = THREE.MathUtils.clamp((maxSunNormalized + 0.2) / 0.4, 0, 1);

            // oscurecer el cieloBase
            let currentSkyColor = new THREE.Color(0x000000).lerp(new THREE.Color(this.skyColorBase), skyBlend);

            // Ajustar el color de atardecer
            if (skyBlend > 0 && skyBlend < 1) {
                // Añadir un tono anaranjado durante la transición
                const sunsetColor = new THREE.Color(0xff8c00);
                // peak at skyBlend = 0.5
                const sunsetIntensity = 1.0 - Math.abs(skyBlend - 0.5) * 2.0;
                currentSkyColor.lerp(sunsetColor, sunsetIntensity * 0.5);
            }

            this.scene.background = currentSkyColor;
            if (this.scene.fog) {
                this.scene.fog.color.copy(currentSkyColor);
            }

            // Novedad: Reducir la luz de ambiente para que de noche haya oscuridad realista
            this.ambientLight.intensity = THREE.MathUtils.lerp(0.01, 0.3, skyBlend);
        } else {
            // Vacío (La falta de atmósfera hace que las sombras sean negrísimas)
            this.scene.background = new THREE.Color(0x000000);
            if (this.scene.fog) {
                this.scene.fog.color.setHex(0x000000);
            }
            this.ambientLight.intensity = 0.001;
        }

        if (this.hasAtmosphere) {
            const overallSunIntensity = Math.max(0, maxSunNormalized);
            if (this.scene.fog) {
                this.scene.fog.density = this.baseAtmosphereDensity * Config.TERRAIN_FOG_MULTIPLIER * (0.5 + overallSunIntensity * 0.5);
            }
            const atmoRatio = Math.min(1.0, this.baseAtmosphereDensity / 0.0005);
            const nightStarOpacity = 1.0 - (atmoRatio * 0.85);
            this.stars.material.opacity = Math.max(0, nightStarOpacity - (overallSunIntensity * 2));
            this.stars.material.transparent = true;
        } else {
            this.scene.background = new THREE.Color(0x000000);
            this.stars.material.opacity = 1.0;
        }

        if (!playerPos) return;

        if (this.waterMesh) {
            this.waterMesh.position.set(playerPos.x, 0, playerPos.z);
        }

        const cx = Math.floor(playerPos.x / this.chunkSize);
        const cz = Math.floor(playerPos.z / this.chunkSize);

        const activeKeys = new Set();
        for (let x = cx - this.renderDistance; x <= cx + this.renderDistance; x++) {
            for (let z = cz - this.renderDistance; z <= cz + this.renderDistance; z++) {
                const key = this.getChunkKey(x, z);
                activeKeys.add(key);

                if (!this.chunks.has(key)) {
                    // Marcar como pendiente
                    this.chunks.set(key, 'pending');

                    const offsetX = x * this.chunkSize;
                    const offsetZ = z * this.chunkSize;

                    // FASE 3: Obtener SharedArrayBuffer del Pool
                    if (this.bufferPool.length === 0) {
                        const res = Config.TERRAIN_CHUNK_RESOLUTION;
                        const bufferSize = res * res * 2 * 3 * 3 * 4;
                        this.bufferPool.push({
                            positions: new SharedArrayBuffer(bufferSize),
                            colors: new SharedArrayBuffer(bufferSize)
                        });
                    }
                    const bufferPair = this.bufferPool.pop();
                    this.activeBuffers.set(key, bufferPair);

                    // Enviar al worker con SharedArrayBuffers
                    this.worker.postMessage({
                        id: key,
                        offsetX: offsetX,
                        offsetZ: offsetZ,
                        chunkSize: this.chunkSize,
                        resolution: Config.TERRAIN_CHUNK_RESOLUTION,
                        baseColor: this.groundColor.getHex(),
                        planetType: this.planetData ? this.planetData.type : 'Planeta rocoso',
                        seed: this.seed,
                        terrainRadius: this.terrainRadius,
                        terrainVariance: this.planetData ? this.planetData.terrainVariance : null,
                        positionsBuffer: bufferPair.positions,
                        colorsBuffer: bufferPair.colors
                    });
                }
            }
        }

        // Destruir Chunks lejanos (Gestión de RAM)
        for (let [key, mesh] of this.chunks.entries()) {
            if (!activeKeys.has(key)) {
                if (mesh !== 'pending') {
                    this.group.remove(mesh);
                    mesh.geometry.dispose();
                }
                this.chunks.delete(key);

                // Retornar al pool (FASE 3)
                const bufferPair = this.activeBuffers.get(key);
                if (bufferPair) {
                    this.bufferPool.push(bufferPair);
                    this.activeBuffers.delete(key);
                }

                // Destruir POIs asociados
                if (this.pois && this.pois.has(key)) {
                    for (let poiMesh of this.pois.get(key)) {
                        this.group.remove(poiMesh);
                        poiMesh.geometry.dispose();
                    }
                    this.pois.delete(key);
                }
            }
        }
    }

    onWorkerMessage(e) {
        const { id } = e.data;
        const bufferPair = this.activeBuffers.get(id);

        // Si el jugador se movió rápido y el chunk ya no se necesita, descartarlo
        if (!this.chunks.has(id) || this.chunks.get(id) !== 'pending') {
            if (bufferPair) {
                this.bufferPool.push(bufferPair);
                this.activeBuffers.delete(id);
            }
            return;
        }

        // Leer datos del SharedArrayBuffer devuelto por el Worker
        const positions = new Float32Array(bufferPair.positions);
        const colors = new Float32Array(bufferPair.colors);

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geometry.computeVertexNormals();

        const mesh = new THREE.Mesh(geometry, this.material);

        const [xStr, zStr] = id.split(',');
        const x = parseInt(xStr);
        const z = parseInt(zStr);

        const offsetX = x * this.chunkSize;
        const offsetZ = z * this.chunkSize;

        mesh.position.set(offsetX, 0, offsetZ);

        this.group.add(mesh);
        this.chunks.set(id, mesh);

        this.generatePOIsForChunk(x, z, offsetX, offsetZ);
    }

    dispose() {
        if (this.worker) {
            this.worker.terminate();
        }
        this.scene.remove(this.group);
        for (let mesh of this.chunks.values()) {
            if (mesh !== 'pending') mesh.geometry.dispose();
        }
        this.chunks.clear();
        this.material.dispose();
        if (this.waterMesh) {
            this.waterMesh.geometry.dispose();
            this.waterMesh.material.dispose();
            this.scene.remove(this.waterMesh);
        }
        this.ambientLight.dispose();
        for (let sun of this.suns) {
            sun.dirLight.dispose();
            sun.sunMesh.geometry.dispose();
            sun.sunMesh.material.dispose();
        }
    }
}
