import * as THREE from 'three';
import { TerrainGenerator } from './TerrainGenerator.js';

export class TerrainManager {
    constructor(scene, planetData, startX = 0, startZ = 0) {
        this.scene = scene;
        this.group = new THREE.Group();
        this.scene.add(this.group);
        
        // El mapa ahora es infinito y se genera por chunks dinámicos
        this.chunkSize = 3000;
        this.renderDistance = 1; // 3x3 chunks
        
        // Pasar la semilla del planeta si existe, o aleatoria
        let seed = 0;
        if (planetData && planetData.name) {
            for(let i=0; i<planetData.name.length; i++) seed += planetData.name.charCodeAt(i);
        }
        
        this.generator = new TerrainGenerator(this.chunkSize * 3, seed);
        this.chunks = new Map(); // Ahora usamos un Map para buscar chunks por "x,z"
        
        // Color base según el tipo de planeta
        let groundColor = 0x228B22; // default green
        if (planetData && planetData.type) {
            if (planetData.type.includes('Ice')) groundColor = 0xddddff;
            else if (planetData.type.includes('Desert')) groundColor = 0xedc9af;
            else if (planetData.type.includes('Lava')) groundColor = 0x331111;
            else if (planetData.type.includes('Barren')) groundColor = 0x888888;
        }

        this.material = new THREE.MeshStandardMaterial({ 
            color: groundColor, 
            roughness: 0.8,
            flatShading: true // Estilo low-poly!
        });

        // Ambient light for terrain
        this.ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
        this.group.add(this.ambientLight);
        
        this.dirLight = new THREE.DirectionalLight(0xffddaa, 1.0);
        this.dirLight.position.set(1000, 2000, 500);
        this.group.add(this.dirLight);
        
        // Generar los chunks iniciales
        this.update(0, { x: startX, z: startZ });
    }
    
    getChunkKey(cx, cz) {
        return `${cx},${cz}`;
    }
    
    update(dt, playerPos) {
        // ¿En qué chunk está el jugador ahora mismo?
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
