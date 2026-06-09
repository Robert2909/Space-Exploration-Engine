import * as THREE from 'three';
import { SpaceControls } from '../player/SpaceControls.js';
import { Universe } from '../world/universe/Universe.js';
import { LightingManager } from '../graphics/LightingManager.js';
import { UIManager } from '../ui/UIManager.js';
import { Config } from './Config.js';

export class Engine {
    constructor() {
        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.FogExp2(0x000000, 0.00005);

        this.camera = new THREE.PerspectiveCamera(Config.RENDER_FOV, window.innerWidth / window.innerHeight, 0.1, 40000);

        // TRUCO 2: Apagar el Antialiasing. El antialias multiplica por 4 el trabajo de la GPU.
        this.renderer = new THREE.WebGLRenderer({ antialias: Config.RENDER_ANTIALIAS, alpha: false, powerPreference: "high-performance" });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        // TRUCO EXTREMO: Los monitores 4K/Retina renderizan 4 veces más píxeles y hunden el rendimiento.
        // Limitamos el Pixel Ratio a 1.25 para que vuele en cualquier pantalla.
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, Config.RENDER_PIXEL_RATIO_MAX));
        document.body.appendChild(this.renderer.domElement);

        this.lighting = new LightingManager(this.scene);
        this.controls = new SpaceControls(this.camera, document.body);
        this.universe = new Universe(this.scene);
        this.ui = new UIManager(this.camera);

        this.clock = new THREE.Clock();

        window.addEventListener('resize', () => this.onWindowResize());

        const distSlider = document.getElementById('render-dist');
        if (distSlider) {
            distSlider.addEventListener('input', (e) => {
                const val = parseInt(e.target.value);
                document.getElementById('dist-val').innerText = val;
                this.universe.setRenderDistance(val);
                const viewDistance = val * this.universe.chunkSize;
                this.scene.fog.density = Config.RENDER_FOG_BASE / viewDistance;
            });
            distSlider.dispatchEvent(new Event('input'));
        }

        this.animate = this.animate.bind(this);
        requestAnimationFrame(this.animate);
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    animate() {
        requestAnimationFrame(this.animate);
        const dt = this.clock.getDelta();

        this.controls.update(dt);
        const pos = this.camera.position;

        this.universe.update(pos.x, pos.y, pos.z, dt);
        this.lighting.update(this.camera.position, this.universe);

        this.ui.updateHUD(this.controls.velocity.length(), pos);
        this.ui.updateLabels(this.universe);

        this.renderer.render(this.scene, this.camera);
    }
}
