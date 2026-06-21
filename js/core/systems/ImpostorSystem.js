import * as THREE from 'three';
import { Config } from '../Config.js';
import { seededRandom } from '../../utils/MathUtils.js';

export class ImpostorSystem {
    constructor(scene, universe) {
        this.scene = scene;
        this.universe = universe;
        this.impostors = new Map();

        // Material base para el sprite del quásar lejano
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');
        const grad = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
        grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
        grad.addColorStop(0.2, 'rgba(150, 100, 255, 0.8)');
        grad.addColorStop(0.5, 'rgba(50, 0, 150, 0.4)');
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 256, 256);

        const tex = new THREE.CanvasTexture(canvas);
        this.material = new THREE.SpriteMaterial({
            map: tex,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            opacity: 0.8
        });

        this.lastUpdate = 0;
        this.lastChunkKey = '';
    }

    update(playerPos, time) {
        // Optimización: No escanear en cada frame, solo cada cierto tiempo
        if (time - this.lastUpdate < Config.IMPOSTOR_UPDATE_INTERVAL) return;
        this.lastUpdate = time;

        const cx = Math.floor(playerPos.x / Config.UNIVERSE_CHUNK_SIZE);
        const cy = Math.floor(playerPos.y / Config.UNIVERSE_CHUNK_SIZE);
        const cz = Math.floor(playerPos.z / Config.UNIVERSE_CHUNK_SIZE);

        const chunkKey = `${cx},${cy},${cz}`;
        if (this.lastChunkKey === chunkKey) return; // Si no cruzamos de chunk, no hay nada nuevo que escanear
        this.lastChunkKey = chunkKey;

        const activeImpostorKeys = new Set();
        const dist = Config.IMPOSTOR_RENDER_DISTANCE_CHUNKS;
        const cSize = Config.UNIVERSE_CHUNK_SIZE;

        for (let x = cx - dist; x <= cx + dist; x++) {
            for (let y = cy - dist; y <= cy + dist; y++) {
                for (let z = cz - dist; z <= cz + dist; z++) {

                    // No poner impostor si el chunk real está renderizado
                    if (Math.sqrt((x - cx) ** 2 + (y - cy) ** 2 + (z - cz) ** 2) <= this.universe.renderDistance + 0.5) continue;

                    // Lógica determinista de Chunk.js (sin instanciar el chunk entero)
                    const hasBlackHole = seededRandom(x, y, z, 500) > (1 - Config.BLACK_HOLE_SPAWN_CHANCE);
                    if (hasBlackHole) {
                        const bhSeed = x * 73856 + y * 1920 + z * 8831 + Config.UNIVERSE_SEED_OFFSET;

                        let bhSizeMult = 1.0 + seededRandom(x, y, z, bhSeed + 9) * Config.BLACK_HOLE_SIZE_MULT_NORMAL;
                        const isUltramassive = seededRandom(x, y, z, bhSeed + 10) > (1 - Config.BLACK_HOLE_ULTRA_MASSIVE_CHANCE);

                        if (isUltramassive) {
                            bhSizeMult = 4.0 + seededRandom(x, y, z, bhSeed + 11) * Config.BLACK_HOLE_SIZE_MULT_ULTRA;

                            // Si es lo bastante masivo para merecer un impostor visual
                            if (bhSizeMult >= Config.BLACK_HOLE_SUPERMASSIVE_THRESHOLD) {
                                const key = `${x},${y},${z}`;
                                activeImpostorKeys.add(key);

                                if (!this.impostors.has(key)) {
                                    const radius = Config.STAR_RADIUS_MAX * (1 + seededRandom(x, y, z, bhSeed + 3) * Config.BLACK_HOLE_BASE_RADIUS_VAR) * bhSizeMult;
                                    const lx = (seededRandom(x, y, z, bhSeed) - 0.5) * cSize * 0.8;
                                    const ly = (seededRandom(x, y, z, bhSeed + 1) - 0.5) * cSize * 0.8;
                                    const lz = (seededRandom(x, y, z, bhSeed + 2) - 0.5) * cSize * 0.8;

                                    const sprite = new THREE.Sprite(this.material);
                                    // Escalar según su radio proyectado en láser
                                    const impostorScale = radius * 40;
                                    sprite.scale.set(impostorScale, impostorScale, 1);

                                    // Posición real global
                                    const posX = x * cSize + lx;
                                    const posY = y * cSize + ly;
                                    const posZ = z * cSize + lz;
                                    sprite.position.set(posX, posY, posZ);

                                    this.scene.add(sprite);
                                    this.impostors.set(key, sprite);
                                }
                            }
                        }
                    }
                }
            }
        }

        // Limpiar impostores viejos que ya salieron del rango de escaneo
        for (let [key, sprite] of this.impostors.entries()) {
            if (!activeImpostorKeys.has(key)) {
                this.scene.remove(sprite);
                this.impostors.delete(key);
            }
        }
    }
}
