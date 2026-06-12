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

        this.generator = new TerrainGenerator(this.chunkSize * 3, seed, planetData ? planetData.type : 'Rocky Planet', planetData ? planetData.radius * 10 : 50000, planetData ? planetData.terrainVariance : null);
        this.chunks = new Map(); // Ahora usamos un Map para buscar chunks por "x,z"

        this.planetData = planetData;
        this.initialLat = initialLat;
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

        // Generar Estrellas en el cielo
        this.createStars();

        // Ambient light for terrain
        this.ambientLight = new THREE.AmbientLight(this.hasAtmosphere ? this.skyColorBase : 0xffffff, this.hasAtmosphere ? 0.3 : 0.05);
        this.group.add(this.ambientLight);

        this.dirLight = new THREE.DirectionalLight(0xfff4e5, 1.2);
        this.dirLight.position.set(1000, 2000, 500);
        this.group.add(this.dirLight);
        this.group.add(this.dirLight.target); // Añadir el target a la escena para que actualice la posición correctamente

        // Calcular multiplicador de distancia estelar (Afecta tamaño visual y temperatura)
        this.sunDistanceMultiplier = 1.0;
        if (this.planetData && this.planetData.orbitRadius) {
            // Asumimos 15000 como distancia base media
            this.sunDistanceMultiplier = 15000 / Math.max(1000, this.planetData.orbitRadius);
        }

        // Malla física del sol para que sea visible (escala con la cercanía a la estrella madre)
        const sunRadius = (this.hasAtmosphere ? 250 : 80) * this.sunDistanceMultiplier;
        const sunGeo = new THREE.SphereGeometry(sunRadius, 16, 16);
        const sunMat = new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false });
        this.sunMesh = new THREE.Mesh(sunGeo, sunMat);
        this.group.add(this.sunMesh);

        // Crear un sprite de resplandor para el sol usando un Canvas
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');
        const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
        
        if (this.hasAtmosphere) {
            // Atmósfera: Brillo disperso
            gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
            gradient.addColorStop(0.2, 'rgba(255, 240, 200, 0.8)');
            gradient.addColorStop(1, 'rgba(255, 240, 200, 0)');
        } else {
            // Vacío: Centro deslumbrante, halo amplio pero translúcido
            gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
            gradient.addColorStop(0.05, 'rgba(255, 255, 255, 0.8)');
            gradient.addColorStop(0.15, 'rgba(255, 250, 230, 0.2)');
            gradient.addColorStop(1, 'rgba(255, 250, 230, 0)');
        }
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 256, 256);
        const texture = new THREE.CanvasTexture(canvas);

        const glowMaterial = new THREE.SpriteMaterial({
            map: texture,
            color: 0xffffff,
            transparent: true,
            blending: THREE.AdditiveBlending,
            fog: false
        });
        this.sunGlow = new THREE.Sprite(glowMaterial);
        
        // El tamaño del glare también cambia con la distancia
        const glowScale = (this.hasAtmosphere ? 2000 : 3500) * this.sunDistanceMultiplier;
        this.sunGlow.scale.set(glowScale, glowScale, 1);
        this.sunMesh.add(this.sunGlow);

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
            const py = this.generator.getHeight(px, pz);

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

        const sunX = eqX;
        const sunY = eqY * cosLat - eqZ * sinLat;
        const sunZ = eqY * sinLat + eqZ * cosLat;

        // Posicionar el sol relativo al jugador para que nunca escape del horizonte visible
        if (playerPos) {
            this.dirLight.position.set(playerPos.x + sunX, playerPos.y + sunY, playerPos.z + sunZ);
            this.dirLight.target.position.set(playerPos.x, playerPos.y, playerPos.z);
            this.sunMesh.position.copy(this.dirLight.position);
            this.stars.position.set(playerPos.x, playerPos.y, playerPos.z);
        } else {
            this.dirLight.position.set(sunX, sunY, sunZ);
            this.dirLight.target.position.set(0, 0, 0);
            this.sunMesh.position.set(sunX, sunY, sunZ);
        }

        // Intensidad estelar
        const sunNormalized = sunY / sunOrbitRadius; // de -1 a 1
        const sunIntensity = Math.max(0, sunNormalized);
        this.dirLight.intensity = sunIntensity * 1.5 * Math.min(2.0, this.sunDistanceMultiplier);

        // La luz ambiente se ajusta más abajo dependiento de la atmósfera
        if (this.hasAtmosphere) {
            // Un valor de 0 a 1 donde 0 es noche cerrada y 1 es día
            let skyBlend = THREE.MathUtils.clamp((sunNormalized + 0.2) / 0.4, 0, 1);

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
            // Densidad de niebla baja un poco de noche para dejar ver "siluetas", multiplicada por Config
            this.scene.fog.density = this.baseAtmosphereDensity * Config.TERRAIN_FOG_MULTIPLIER * (0.5 + sunIntensity * 0.5);

            // Estrellas (Si la atmósfera es MUY densa, apenas se ven de noche)
            // baseAtmosphereDensity va de 0 a 0.0005. 
            // Si es 0.0005, el atmoRatio es 1.0, por lo tanto factor es 0.1 (casi ocultas)
            const atmoRatio = Math.min(1.0, this.baseAtmosphereDensity / 0.0005);
            const nightStarOpacity = 1.0 - (atmoRatio * 0.85); // De noche máxima

            this.stars.material.opacity = Math.max(0, nightStarOpacity - (sunIntensity * 2));
            this.stars.material.transparent = true;
        } else {
            // Sin atmósfera
            this.scene.background = new THREE.Color(0x000000);
            this.stars.material.opacity = 1.0;
        }

        // ¿En qué chunk está el jugador ahora mismo?
        if (!playerPos) return;
        
        if (this.waterMesh) {
            // El agua sigue al jugador en X y Z para parecer infinita
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
                    // Cargar / Crear Chunk nuevo con la resolución del Config
                    const offsetX = x * this.chunkSize;
                    const offsetZ = z * this.chunkSize;

                    const geometry = this.generator.createChunkGeometry(offsetX, offsetZ, this.chunkSize, Config.TERRAIN_CHUNK_RESOLUTION, this.groundColor);
                    const mesh = new THREE.Mesh(geometry, this.material);

                    // IMPORTANTE: Ponemos el mesh en su coordenada global real.
                    // Ya le enviamos el offsetX al generador para calcular la altura, 
                    // así que la geometría está local (-1500 a 1500) pero el mesh se mueve al mundo.
                    mesh.position.set(offsetX, 0, offsetZ);

                    this.group.add(mesh);
                    this.chunks.set(key, mesh);

                    // Generar POIs para este chunk
                    this.generatePOIsForChunk(x, z, offsetX, offsetZ);
                }
            }
        }

        // Destruir Chunks lejanos (Gestión de RAM)
        for (let [key, mesh] of this.chunks.entries()) {
            if (!activeKeys.has(key)) {
                this.group.remove(mesh);
                mesh.geometry.dispose();
                this.chunks.delete(key);
                
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

    dispose() {
        this.scene.remove(this.group);
        for (let mesh of this.chunks.values()) {
            mesh.geometry.dispose();
        }
        this.chunks.clear();
        this.material.dispose();
        this.ambientLight.dispose();
        this.dirLight.dispose();
    }
}
