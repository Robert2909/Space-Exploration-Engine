import * as THREE from 'three';
import { Config } from '../core/Config.js';

export class LightingManager {
    constructor(scene) {
        this.ambientLight = new THREE.AmbientLight(Config.LIGHT_AMBIENT_COLOR);
        scene.add(this.ambientLight);
        
        this.systemLight = new THREE.PointLight(0xffffff, 3, Config.LIGHT_SUN_DISTANCE, 0);
        scene.add(this.systemLight);
        
        this._targetObj = { position: new THREE.Vector3(), colorHex: 0 };
    }
    
    update(cameraPos, universe) {
        const found = universe.getClosestStar(cameraPos, this._targetObj);
        if (found) {
            this.systemLight.position.copy(this._targetObj.position);
            this.systemLight.color.setHex(this._targetObj.colorHex);
            this.systemLight.intensity = Config.LIGHT_SUN_INTENSITY;
        } else {
            this.systemLight.intensity = 0;
        }
    }
}
