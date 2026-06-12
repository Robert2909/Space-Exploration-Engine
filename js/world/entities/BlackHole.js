import * as THREE from 'three';
import { CelestialBody } from './CelestialBody.js';

export class BlackHole extends CelestialBody {
    constructor(config) {
        super(config);
        this.type = 'Black Hole'; // Para que SpaceState.js sepa que no se puede aterrizar
        this.group = 'BlackHole';
        // Black holes have high mass/radius
        this.mass = config.mass || this.radius * 1000;
        this.planets = []; // Para no crashear Chunk.js
        
        // We'll give it a visual representation for now:
        // A pitch black sphere surrounded by a glowing accretion disk
        this.mesh = new THREE.Group();
        this.mesh.position.set(this.lx, this.ly, this.lz);
        
        // Event Horizon (El Vacío Absoluto)
        const eventHorizonMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
        const eventHorizonGeo = new THREE.SphereGeometry(this.radius, 64, 64);
        this.eventHorizon = new THREE.Mesh(eventHorizonGeo, eventHorizonMat);
        
        // Efecto de distorsión del espacio (Aura oscura/Lensing simplificado)
        const voidMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.5, side: THREE.BackSide });
        this.voidMesh = new THREE.Mesh(new THREE.SphereGeometry(this.radius * 1.05, 64, 64), voidMat);

        this.mesh.add(this.eventHorizon);
        this.mesh.add(this.voidMesh);
        
        // Función auxiliar para texturas difuminadas (Gradientes)
        const createGradientTexture = (c1, c2, radial) => {
            const canvas = document.createElement('canvas');
            canvas.width = 256; canvas.height = 256;
            const ctx = canvas.getContext('2d');
            let grad;
            if (radial) {
                grad = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
                grad.addColorStop(0, c1);
                grad.addColorStop(1, c2);
            } else {
                grad = ctx.createLinearGradient(0, 0, 0, 256);
                grad.addColorStop(0, c2);
                grad.addColorStop(0.5, c1);
                grad.addColorStop(1, c2);
            }
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, 256, 256);
            return new THREE.CanvasTexture(canvas);
        };

        const createBeamTexture = () => {
            const canvas = document.createElement('canvas');
            canvas.width = 256; canvas.height = 512;
            const ctx = canvas.getContext('2d');
            
            // Gradiente radial estirado (Ovalo perfecto) para que difumine lados Y puntas
            ctx.scale(1, 2);
            const grad = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
            grad.addColorStop(0, 'rgba(200,230,255,1)');
            grad.addColorStop(0.1, 'rgba(100,180,255,0.8)');
            grad.addColorStop(0.3, 'rgba(0,100,255,0.4)');
            grad.addColorStop(1, 'rgba(0,0,255,0)');
            
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, 256, 256); // Afecta el área escalada (256x512)
            ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset scale
            
            return new THREE.CanvasTexture(canvas);
        };

        const texDisk1 = createGradientTexture('rgba(150,0,50,0.3)', 'rgba(255,0,0,0)', true); // Anillo extra exterior
        const texDisk2 = createGradientTexture('rgba(255,50,0,0.6)', 'rgba(255,0,0,0)', true);
        const texDisk3 = createGradientTexture('rgba(255,170,0,0.8)', 'rgba(255,50,0,0)', true);
        const texDisk4 = createGradientTexture('rgba(255,255,255,1)', 'rgba(100,0,255,0)', true); // Anillo extra interior

        // Usar PlaneGeometry en vez de Ring para evitar bordes duros cortados
        const diskSizeOuterMost = this.radius * 24.0;
        const diskSizeOuter = this.radius * 16.0;
        const diskSizeMid = this.radius * 8.0;
        const diskSizeInner = this.radius * 4.0;
        
        const diskGeoOuterMost = new THREE.PlaneGeometry(diskSizeOuterMost, diskSizeOuterMost);
        const diskGeoOuter = new THREE.PlaneGeometry(diskSizeOuter, diskSizeOuter);
        const diskGeoMid = new THREE.PlaneGeometry(diskSizeMid, diskSizeMid);
        const diskGeoInner = new THREE.PlaneGeometry(diskSizeInner, diskSizeInner);
        
        diskGeoOuterMost.rotateX(Math.PI / 2);
        diskGeoOuter.rotateX(Math.PI / 2);
        diskGeoMid.rotateX(Math.PI / 2);
        diskGeoInner.rotateX(Math.PI / 2);
        
        const diskMatOuterMost = new THREE.MeshBasicMaterial({ 
            map: texDisk1, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false
        });
        const diskMatOuter = new THREE.MeshBasicMaterial({ 
            map: texDisk2, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false
        });
        const diskMatMid = new THREE.MeshBasicMaterial({ 
            map: texDisk3, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false
        });
        const diskMatInner = new THREE.MeshBasicMaterial({ 
            map: texDisk4, transparent: true, opacity: 1.0, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false
        });

        this.diskOuterMost = new THREE.Mesh(diskGeoOuterMost, diskMatOuterMost);
        this.diskOuter = new THREE.Mesh(diskGeoOuter, diskMatOuter);
        this.diskMid = new THREE.Mesh(diskGeoMid, diskMatMid);
        this.diskInner = new THREE.Mesh(diskGeoInner, diskMatInner);
        
        this.mesh.add(this.diskOuterMost);
        this.mesh.add(this.diskOuter);
        this.mesh.add(this.diskMid);
        this.mesh.add(this.diskInner);
        
        // Aura gravitacional de alta radiación (Corona tridimensional suave)
        const texCorona = createGradientTexture('rgba(106,13,173,0.3)', 'rgba(106,13,173,0)', true);
        const coronaMat = new THREE.SpriteMaterial({
            map: texCorona, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false
        });
        this.corona = new THREE.Sprite(coronaMat);
        this.corona.scale.set(this.radius * 4, this.radius * 4, 1);
        this.mesh.add(this.corona);

        // ==== SUPER RESPLANDOR (BLOOM PROCEDURAL) ====
        const texGlow = createGradientTexture('rgba(255,255,255,1)', 'rgba(60,0,150,0)', true);
        const glowMat = new THREE.SpriteMaterial({
            map: texGlow, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false
        });
        this.superGlow = new THREE.Sprite(glowMat);
        this.superGlow.scale.set(this.radius * 20, this.radius * 20, 1);
        this.mesh.add(this.superGlow);
        // ===========================================

        // Jets Relativistas (Quásar) disparados desde los polos
        // Volvemos a las Cross-Planes (Planos cruzados), pero usamos 3 planos y un gradiente ovalado
        // Esto elimina por completo los bordes duros laterales y verticales, creando un "volumen" perfecto
        const texJet = createBeamTexture();
        const jetGeo = new THREE.PlaneGeometry(this.radius * 6.0, this.radius * 120.0);
        const jetMat = new THREE.MeshBasicMaterial({
            map: texJet, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false
        });
        
        this.jet = new THREE.Group();
        const numPlanes = 3;
        for (let i = 0; i < numPlanes; i++) {
            const plane = new THREE.Mesh(jetGeo, jetMat);
            plane.rotation.y = (Math.PI / numPlanes) * i;
            this.jet.add(plane);
        }
        
        this.mesh.add(this.jet);
    }

    update(dt) {
        super.update(dt);
        if (this.diskOuterMost) this.diskOuterMost.rotation.z -= 0.1 * dt;
        if (this.diskOuter) this.diskOuter.rotation.z -= 0.2 * dt;
        if (this.diskMid) this.diskMid.rotation.z -= 0.5 * dt;
        if (this.diskInner) {
            this.diskInner.rotation.z -= 1.0 * dt;
            
            // Efecto pulsante en los jets y la corona
            const pulse = 1.0 + Math.sin(Date.now() * 0.005) * 0.1;
            this.jet.scale.set(pulse, 1, pulse);
            this.corona.scale.set(pulse, pulse, pulse);
        }
    }
}
