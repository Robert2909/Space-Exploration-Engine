import * as THREE from 'three';
import { TerrainGenerator } from './TerrainGenerator.js';

export class TerrainManager {
    constructor(scene, planetData, startX = 0, startZ = 0, initialTimeOfDay = 0) {
        this.scene = scene;
        this.group = new THREE.Group();
        this.scene.add(this.group);

        // El mapa ahora es infinito y se genera por chunks dinámicos
        this.chunkSize = 3000;
        this.renderDistance = 1; // 3x3 chunks

        // Pasar la semilla del planeta si existe, o aleatoria
        let seed = 0;
        if (planetData && planetData.name) {
            for (let i = 0; i < planetData.name.length; i++) seed += planetData.name.charCodeAt(i);
        }

        this.generator = new TerrainGenerator(this.chunkSize * 3, seed);
        this.chunks = new Map(); // Ahora usamos un Map para buscar chunks por "x,z"

        this.planetData = planetData;

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

        this.material = new THREE.MeshStandardMaterial({
            color: groundColor.getHex(),
            roughness: 0.8,
            flatShading: true // Estilo low-poly!
        });

        // Configurar la atmósfera y el cielo
        this.scene.background = new THREE.Color(this.skyColorBase);
        if (this.hasAtmosphere) {
            // Utilizamos la densidad del planeta (0.00005 a 0.0005)
            this.scene.fog = new THREE.FogExp2(this.skyColorBase, this.baseAtmosphereDensity);
        } else {
            // Una niebla mínima y negra para ocultar el fin de los chunks sin que parezca atmósfera
            this.scene.fog = new THREE.FogExp2(0x000000, 0.00005);
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

        // Malla física del sol para que sea visible (más pequeño y nítido si no hay atmósfera)
        const sunRadius = this.hasAtmosphere ? 250 : 80;
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
        
        // El tamaño del glare también cambia
        const glowScale = this.hasAtmosphere ? 2000 : 3500;
        this.sunGlow.scale.set(glowScale, glowScale, 1);
        this.sunMesh.add(this.sunGlow);

        this.timeOfDay = initialTimeOfDay; // Para el ciclo día y noche

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

    getChunkKey(cx, cz) {
        return `${cx},${cz}`;
    }

    update(dt, playerPos) {
        // Ciclo Día/Noche
        this.timeOfDay += dt * 0.05; // Velocidad del sol
        const sunOrbitRadius = this.chunkSize * 2;

        // El sol orbita de Este a Oeste
        const sunX = Math.cos(this.timeOfDay) * sunOrbitRadius;
        const sunY = Math.sin(this.timeOfDay) * sunOrbitRadius;

        // Posicionar el sol relativo al jugador para que nunca escape del horizonte visible
        if (playerPos) {
            this.dirLight.position.set(playerPos.x + sunX, playerPos.y + sunY, playerPos.z);
            this.dirLight.target.position.set(playerPos.x, playerPos.y, playerPos.z);
            this.sunMesh.position.copy(this.dirLight.position);
            this.stars.position.set(playerPos.x, playerPos.y, playerPos.z);
        } else {
            this.dirLight.position.set(sunX, sunY, 0);
            this.dirLight.target.position.set(0, 0, 0);
            this.sunMesh.position.set(sunX, sunY, 0);
        }

        // Intensidad y atardecer
        // Consideramos que la transición dura más tiempo. sunY va de -sunOrbitRadius a +sunOrbitRadius
        const sunNormalized = sunY / sunOrbitRadius; // de -1 a 1
        const sunIntensity = Math.max(0, sunNormalized);
        this.dirLight.intensity = sunIntensity * 1.5;

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
            // Densidad de niebla baja un poco de noche para dejar ver "siluetas"
            this.scene.fog.density = this.baseAtmosphereDensity * (0.5 + sunIntensity * 0.5);

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
        const cx = Math.floor(playerPos.x / this.chunkSize);
        const cz = Math.floor(playerPos.z / this.chunkSize);

        const activeKeys = new Set();

        for (let x = cx - this.renderDistance; x <= cx + this.renderDistance; x++) {
            for (let z = cz - this.renderDistance; z <= cz + this.renderDistance; z++) {
                const key = this.getChunkKey(x, z);
                activeKeys.add(key);

                if (!this.chunks.has(key)) {
                    // Cargar / Crear Chunk nuevo
                    const offsetX = x * this.chunkSize;
                    const offsetZ = z * this.chunkSize;

                    const geometry = this.generator.createChunkGeometry(offsetX, offsetZ, this.chunkSize, 64);
                    const mesh = new THREE.Mesh(geometry, this.material);

                    // IMPORTANTE: Ponemos el mesh en su coordenada global real.
                    // Ya le enviamos el offsetX al generador para calcular la altura, 
                    // así que la geometría está local (-1500 a 1500) pero el mesh se mueve al mundo.
                    mesh.position.set(offsetX, 0, offsetZ);

                    this.group.add(mesh);
                    this.chunks.set(key, mesh);
                }
            }
        }

        // Destruir Chunks lejanos (Gestión de RAM)
        for (let [key, mesh] of this.chunks.entries()) {
            if (!activeKeys.has(key)) {
                this.group.remove(mesh);
                mesh.geometry.dispose();
                this.chunks.delete(key);
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
