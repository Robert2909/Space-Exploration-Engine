import * as THREE from 'three';
import { Config } from '../Config.js';

export class RenderSystem {
    constructor() {
        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.FogExp2(0x000000, 0.00005);
        this.scene.background = new THREE.Color(0x000000);

        this.camera = new THREE.PerspectiveCamera(Config.RENDER_FOV, window.innerWidth / window.innerHeight, 100, Config.RENDER_FAR_PLANE);

        // TRUCO 2: Apagar el Antialiasing. El antialias multiplica por 4 el trabajo de la GPU.
        this.renderer = new THREE.WebGLRenderer({ 
            antialias: Config.RENDER_ANTIALIAS, 
            alpha: false, 
            powerPreference: "high-performance",
            logarithmicDepthBuffer: Config.RENDER_LOGARITHMIC_DEPTH 
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        
        // TRUCO EXTREMO: Los monitores 4K/Retina renderizan 4 veces más píxeles y hunden el rendimiento.
        // Limitamos el Pixel Ratio a 1.25 para que vuele en cualquier pantalla.
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, Config.RENDER_PIXEL_RATIO_MAX));
        document.body.appendChild(this.renderer.domElement);

        window.addEventListener('resize', () => this.onWindowResize());
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    render() {
        this.renderer.render(this.scene, this.camera);
    }
}
