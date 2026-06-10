import * as THREE from 'three';
import { Config } from '../../core/Config.js';

export class TerrainManager {
    constructor(scene) {
        this.scene = scene;
        this.group = new THREE.Group();
        this.scene.add(this.group);
        
        this.worldSize = 50000;
        this.chunkSize = 1000;
        
        // Simplemente un plano verde por ahora para poder pararnos
        this.mesh = new THREE.Mesh(
            new THREE.PlaneGeometry(10000, 10000),
            new THREE.MeshStandardMaterial({ color: 0x228B22, roughness: 0.8 })
        );
        this.mesh.rotation.x = -Math.PI / 2;
        this.group.add(this.mesh);
        
        // Ambient light for terrain
        this.ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.group.add(this.ambientLight);
        
        this.dirLight = new THREE.DirectionalLight(0xffddaa, 1.0);
        this.dirLight.position.set(100, 200, 50);
        this.group.add(this.dirLight);
    }
    
    update(dt, playerPos) {
        // Lógica toroidal básica: si el jugador se pasa de +- worldSize/2, lo teletransportamos
        const halfSize = this.worldSize / 2;
        
        if (playerPos.x > halfSize) playerPos.x -= this.worldSize;
        if (playerPos.x < -halfSize) playerPos.x += this.worldSize;
        
        if (playerPos.z > halfSize) playerPos.z -= this.worldSize;
        if (playerPos.z < -halfSize) playerPos.z += this.worldSize;
        
        // El terreno base siempre sigue al jugador (efecto de infinito temporal)
        this.mesh.position.set(playerPos.x, 0, playerPos.z);
    }
    
    dispose() {
        this.scene.remove(this.group);
        this.mesh.geometry.dispose();
        this.mesh.material.dispose();
    }
}
