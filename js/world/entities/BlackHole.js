import * as THREE from 'three';
import { CelestialBody } from './CelestialBody.js';
import { seededRandom } from '../../utils/MathUtils.js';
import { Config } from '../../core/Config.js';

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

        const seed = Math.abs(this.lx * 738 + this.ly * 19 + this.lz * 88);
        
        const getColor = (cArr, a) => `hsla(${cArr[0]}, ${cArr[1]}%, ${cArr[2]}%, ${a})`;

        const palettes = [
            // Standard (Orange/White)
            { o: [340, 100, 30], m: [15, 100, 50], i: [35, 100, 70], core: [0, 0, 100], j1: [210, 100, 80], j2: [230, 100, 50], j3: [250, 100, 20], c: [270, 100, 30], glow: [260, 100, 50] },
            // Hot Blue
            { o: [240, 100, 30], m: [220, 100, 50], i: [200, 100, 70], core: [0, 0, 100], j1: [190, 100, 80], j2: [210, 100, 50], j3: [230, 100, 20], c: [240, 100, 30], glow: [220, 100, 50] },
            // Emerald
            { o: [120, 100, 20], m: [140, 100, 40], i: [160, 100, 60], core: [0, 0, 100], j1: [130, 100, 80], j2: [150, 100, 50], j3: [170, 100, 20], c: [120, 100, 20], glow: [140, 100, 40] },
            // Crimson
            { o: [0, 100, 20], m: [350, 100, 40], i: [340, 100, 60], core: [330, 100, 80], j1: [0, 100, 70], j2: [350, 100, 40], j3: [340, 100, 10], c: [0, 100, 20], glow: [350, 100, 40] },
            // Violet / Pure Energy
            { o: [270, 100, 30], m: [290, 100, 50], i: [310, 100, 70], core: [0, 0, 100], j1: [280, 100, 80], j2: [300, 100, 50], j3: [320, 100, 20], c: [270, 100, 30], glow: [290, 100, 50] }
        ];
        
        const p = palettes[Math.floor(seededRandom(this.lx, this.ly, this.lz, seed) * palettes.length)];

        const createBeamTexture = () => {
            const canvas = document.createElement('canvas');
            canvas.width = 256; canvas.height = 512;
            const ctx = canvas.getContext('2d');
            
            ctx.scale(1, 2);
            const grad = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
            grad.addColorStop(0, getColor(p.j1, 1));
            grad.addColorStop(0.1, getColor(p.j2, 0.8));
            grad.addColorStop(0.3, getColor(p.j3, 0.4));
            grad.addColorStop(1, 'rgba(0,0,0,0)');
            
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, 256, 256);
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            
            return new THREE.CanvasTexture(canvas);
        };

        const texDisk1 = createGradientTexture(getColor(p.o, 0.3), 'rgba(0,0,0,0)', true);
        const texDisk2 = createGradientTexture(getColor(p.m, 0.6), 'rgba(0,0,0,0)', true);
        const texDisk3 = createGradientTexture(getColor(p.i, 0.8), 'rgba(0,0,0,0)', true);
        const texDisk4 = createGradientTexture(getColor(p.core, 1), 'rgba(0,0,0,0)', true);

        // Usar PlaneGeometry en vez de Ring para evitar bordes duros cortados
        const s = Config.BLACK_HOLE_DISK_SCALE;
        const diskSizeOuterMost = this.radius * 24.0 * s;
        const diskSizeOuter = this.radius * 16.0 * s;
        const diskSizeMid = this.radius * 8.0 * s;
        const diskSizeInner = this.radius * 4.0 * s;
        
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
        
        // Agrupamos el disco de acreción para rotarlo entero
        this.accretionGroup = new THREE.Group();
        this.accretionGroup.add(this.diskOuterMost);
        this.accretionGroup.add(this.diskOuter);
        this.accretionGroup.add(this.diskMid);
        this.accretionGroup.add(this.diskInner);
        
        // Aura gravitacional de alta radiación (Corona tridimensional suave)
        const texCorona = createGradientTexture(getColor(p.c, 0.3), 'rgba(0,0,0,0)', true);
        const coronaMat = new THREE.SpriteMaterial({
            map: texCorona, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false
        });
        this.corona = new THREE.Sprite(coronaMat);
        this.corona.scale.set(this.radius * 4, this.radius * 4, 1);
        this.mesh.add(this.corona);

        // ==== SUPER RESPLANDOR (BLOOM PROCEDURAL) ====
        const texGlow = createGradientTexture('rgba(255,255,255,1)', getColor(p.glow, 0), true);
        const glowMat = new THREE.SpriteMaterial({
            map: texGlow, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false
        });
        this.superGlow = new THREE.Sprite(glowMat);
        this.superGlow.scale.set(this.radius * 20, this.radius * 20, 1);
        this.mesh.add(this.superGlow);
        // ===========================================

        // Jets Relativistas (Quásar) disparados desde los polos
        const texJet = createBeamTexture();
        const jetGeo = new THREE.PlaneGeometry(this.radius * Config.BLACK_HOLE_JET_WIDTH, this.radius * Config.BLACK_HOLE_JET_LENGTH);
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
        
        this.accretionGroup.add(this.jet);
        
        // Orientación Aleatoria de la anomalía
        this.accretionGroup.rotation.x = seededRandom(this.lx, this.ly, this.lz, seed + 1) * Math.PI * 2;
        this.accretionGroup.rotation.y = seededRandom(this.lx, this.ly, this.lz, seed + 2) * Math.PI * 2;
        this.accretionGroup.rotation.z = seededRandom(this.lx, this.ly, this.lz, seed + 3) * Math.PI * 2;

        this.mesh.add(this.accretionGroup);
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
