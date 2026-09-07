import * as THREE from 'three';
import { Config } from '../Config.js';
import { getGravitationalLensPostMaterial } from '../../world/materials/BlackHoleShader.js';

export class RenderSystem {
    constructor() {
        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.FogExp2(0x000000, 0.00005);
        this.scene.background = new THREE.Color(0x000000);

        this.camera = new THREE.PerspectiveCamera(Config.RENDER_FOV, window.innerWidth / window.innerHeight, Config.RENDER_NEAR_PLANE, Config.RENDER_FAR_PLANE);

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
        const pixelRatio = Math.min(window.devicePixelRatio, Config.RENDER_PIXEL_RATIO_MAX);
        this.renderer.setPixelRatio(pixelRatio);
        document.body.appendChild(this.renderer.domElement);

        // Opción 2: WebGLRenderTarget para capturar y distorsionar el universo real
        const rtWidth = Math.floor(window.innerWidth * pixelRatio);
        const rtHeight = Math.floor(window.innerHeight * pixelRatio);
        this.renderTarget = new THREE.WebGLRenderTarget(rtWidth, rtHeight, {
            minFilter: THREE.LinearFilter,
            magFilter: THREE.LinearFilter,
            format: THREE.RGBAFormat
        });

        // Escena de post-procesamiento en espacio de pantalla (OrthographicCamera + Quad)
        this.postCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
        this.postScene = new THREE.Scene();
        this.postMaterial = getGravitationalLensPostMaterial();
        this.postQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.postMaterial);
        this.postScene.add(this.postQuad);

        // Referencia al universo para rastrear agujeros negros activos
        this.universe = null;

        // Vectores y matrices auxiliares para cero Garbage Collection (60 FPS estables)
        this._bhWorldPos = new THREE.Vector3();
        this._toBH = new THREE.Vector3();
        this._camDir = new THREE.Vector3();
        this._projectedPos = new THREE.Vector3();
        this._localCamPos = new THREE.Vector3();

        this._matCamRot = new THREE.Matrix3();
        this._matBHRot = new THREE.Matrix3();
        this._matBHRotInv = new THREE.Matrix3();
        this._matCamToLocal = new THREE.Matrix3();
        this._matLocalToCam = new THREE.Matrix3();
        this._bhEuler = new THREE.Euler();
        this._bhQuat = new THREE.Quaternion();
        this._mat4Temp = new THREE.Matrix4();
        this._mat4ProjScreen = new THREE.Matrix4();
        this._frustum = new THREE.Frustum();
        this._bhSphere = new THREE.Sphere();

        window.addEventListener('resize', () => this.onWindowResize());
    }

    setUniverse(universe) {
        this.universe = universe;
    }

    onWindowResize() {
        const width = window.innerWidth;
        const height = window.innerHeight;
        const pixelRatio = Math.min(window.devicePixelRatio, Config.RENDER_PIXEL_RATIO_MAX);

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
        this.renderTarget.setSize(Math.floor(width * pixelRatio), Math.floor(height * pixelRatio));

        if (this.postMaterial && this.postMaterial.uniforms.uAspect) {
            this.postMaterial.uniforms.uAspect.value = width / height;
        }
    }

    render() {
        // 1. Evaluar si hay algún agujero negro cargado y visible en el campo de visión
        let activeBH = null;
        let maxAngularSize = 0;

        if (this.universe && this.universe.getLoadedBlackHoles) {
            const blackHoles = this.universe.getLoadedBlackHoles();
            if (blackHoles.length > 0) {
                const fovRad = this.camera.fov * Math.PI / 180;
                const tanHalfFov = Math.tan(fovRad / 2.0);

                // Matriz de proyección para el frustum de la cámara
                this._mat4ProjScreen.multiplyMatrices(this.camera.projectionMatrix, this.camera.matrixWorldInverse);
                this._frustum.setFromProjectionMatrix(this._mat4ProjScreen);

                for (let i = 0; i < blackHoles.length; i++) {
                    const bh = blackHoles[i];
                    this._bhWorldPos.set(bh.worldX, bh.worldY, bh.worldZ);
                    this._toBH.subVectors(this._bhWorldPos, this.camera.position);
                    const dist = this._toBH.length();

                    const outerRadius = bh.system.outerDiskRadius || (bh.system.iscoRadius + bh.system.schwarzschildRadius * 20.0);
                    const systemRadius = Math.max(outerRadius * 1.25, bh.system.shadowRadius * 6.0);

                    // Comprobación de visibilidad tridimensional rigurosa (Frustum Culling real):
                    // 1. Si la nave está dentro del radio del sistema (dist <= systemRadius), está inmersa en él: siempre activo.
                    // 2. Si está fuera, comprobar si la esfera 3D del sistema intersecta cualquier plano del frustum de la cámara.
                    let isVisible = false;
                    if (dist <= systemRadius) {
                        isVisible = true;
                    } else {
                        this._bhSphere.center.copy(this._bhWorldPos);
                        this._bhSphere.radius = systemRadius;
                        isVisible = this._frustum.intersectsSphere(this._bhSphere);
                    }

                    if (!isVisible) continue;

                    const safeDist = Math.max(dist, 1.0);
                    const viewHeightAtDist = 2.0 * safeDist * tanHalfFov;
                    const shadowRadiusUV = bh.system.shadowRadius / viewHeightAtDist;

                    // Priorizar el agujero negro con mayor presencia visual en la cámara
                    const angularPriority = dist <= systemRadius ? (1e9 - dist) : shadowRadiusUV;
                    if (angularPriority > maxAngularSize) {
                        maxAngularSize = angularPriority;
                        activeBH = {
                            system: bh.system,
                            worldX: bh.worldX,
                            worldY: bh.worldY,
                            worldZ: bh.worldZ,
                            outerRadius: outerRadius,
                            systemRadius: systemRadius,
                            tanHalfFov: tanHalfFov
                        };
                    }
                }
            }
        }

        // 2. Si no hay agujeros negros en el cono visual, renderizar directo con coste cero
        if (!activeBH) {
            this.renderer.render(this.scene, this.camera);
            return;
        }

        // 3. OPCIÓN 2: Renderizar la escena real del universo en el RenderTarget offscreen
        this.renderer.setRenderTarget(this.renderTarget);
        this.renderer.render(this.scene, this.camera);
        this.renderer.setRenderTarget(null);

        // 4. Calcular transformaciones de cámara y agujero negro en CPU (Coste ~0.002ms, 0 allocations)
        this._mat4Temp.extractRotation(this.camera.matrixWorld);
        this._matCamRot.setFromMatrix4(this._mat4Temp);

        this._bhEuler.set(
            activeBH.system.inclinationX || 0,
            activeBH.system.inclinationY || 0,
            activeBH.system.inclinationZ || 0
        );
        this._bhQuat.setFromEuler(this._bhEuler);
        this._mat4Temp.makeRotationFromQuaternion(this._bhQuat);
        this._matBHRot.setFromMatrix4(this._mat4Temp);

        // Inversa de la rotación del agujero negro (traspuesta ya que es ortogonal)
        this._matBHRotInv.copy(this._matBHRot).transpose();

        // Matriz de rotación de Cámara a Local del Agujero Negro: R_bh^-1 * R_cam
        this._matCamToLocal.multiplyMatrices(this._matBHRotInv, this._matCamRot);
        this._matLocalToCam.copy(this._matCamToLocal).transpose();

        // Posición de la cámara en el espacio local del agujero negro
        this._bhWorldPos.set(activeBH.worldX, activeBH.worldY, activeBH.worldZ);
        this._toBH.subVectors(this.camera.position, this._bhWorldPos);
        this._localCamPos.copy(this._toBH).applyMatrix3(this._matBHRotInv);

        // 5. Aplicar el Shader Relativista de Espacio-Tiempo sobre la textura real del universo
        const uniforms = this.postMaterial.uniforms;
        uniforms.tDiffuse.value = this.renderTarget.texture;
        uniforms.uAspect.value = window.innerWidth / window.innerHeight;
        uniforms.uTanHalfFov.value = activeBH.tanHalfFov;
        uniforms.uLocalCamPos.value.copy(this._localCamPos);
        uniforms.uCamToLocal.value.copy(this._matCamToLocal);
        uniforms.uLocalToCam.value.copy(this._matLocalToCam);
        uniforms.uSchwarzschildRadius.value = activeBH.system.schwarzschildRadius;
        uniforms.uShadowRadiusWorld.value = activeBH.system.shadowRadius;
        uniforms.uOuterRadius.value = activeBH.outerRadius;
        uniforms.uIscoRadius.value = activeBH.system.iscoRadius;
        uniforms.uMaxInfluenceRadius.value = activeBH.systemRadius;
        uniforms.uSpin.value = activeBH.system.spin !== undefined ? activeBH.system.spin : 0.5;
        uniforms.uTemperature.value = activeBH.system.diskTemperature || 1.5e7;
        uniforms.uAccretionRate.value = activeBH.system.accretionRate !== undefined ? activeBH.system.accretionRate : 0.5;
        uniforms.uHasDisk.value = activeBH.system.hasDisk ? 1.0 : 0.0;
        uniforms.uTime.value = performance.now() * 0.001;

        // 6. Dibujar el fotograma curvado con Einstein/Bozza en el canvas principal
        this.renderer.render(this.postScene, this.postCamera);
    }
}
