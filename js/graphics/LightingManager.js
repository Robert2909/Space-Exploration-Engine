import * as THREE from 'three';
import { Config } from '../core/Config.js';

export class LightingManager {
    constructor(scene) {
        this.ambientLight = new THREE.AmbientLight(Config.LIGHT_AMBIENT_COLOR);
        scene.add(this.ambientLight);
        
        this.systemLight = new THREE.PointLight(0xffffff, 3, Config.LIGHT_SUN_DISTANCE, 0);
        scene.add(this.systemLight);

        this.companionLight = new THREE.PointLight(0xffffff, 3, Config.LIGHT_SUN_DISTANCE, 0);
        scene.add(this.companionLight);
    }
    
    update(cameraPos, universe) {
        const star = universe.getClosestStar(cameraPos);
        if (star) {
            this.systemLight.position.set(star.x, star.y, star.z);
            this.systemLight.color.setHex(star.sunColor);
            this.systemLight.intensity = Config.LIGHT_SUN_INTENSITY;

            // Revisar si pertenece a un sistema binario
            let otherStar = null;
            if (star.companion) {
                otherStar = star.companion; // Si es la principal, alumbrar con la compañera
            } else if (star.primary) {
                otherStar = star.primary; // Si es la compañera, alumbrar con la principal
            }

            if (otherStar) {
                this.companionLight.position.set(otherStar.x, otherStar.y, otherStar.z);
                this.companionLight.color.setHex(otherStar.sunColor);
                // Intensidad ligeramente reducida para diferenciar sombras
                this.companionLight.intensity = Config.LIGHT_SUN_INTENSITY * 0.8;
            } else {
                this.companionLight.intensity = 0;
            }
        } else {
            this.systemLight.intensity = 0;
            this.companionLight.intensity = 0;
        }
    }
}
