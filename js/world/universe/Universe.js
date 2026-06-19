import * as THREE from 'three';
import { Chunk } from './Chunk.js';
import { Config } from '../../core/Config.js';

export class Universe {
    constructor(scene) {
        this.scene = scene;
        this.chunks = new Map();
        this.chunkQueue = []; 
        this.renderDistance = 1; 
        this.chunkSize = Config.UNIVERSE_CHUNK_SIZE;
    }
    
    getChunkKey(cx, cy, cz) {
        return `${cx},${cy},${cz}`;
    }
    
    setRenderDistance(dist) {
        this.renderDistance = dist;
    }
    
    getClosestStar(cameraPos) {
        let closestStar = null;
        let minDistSq = Infinity;
        for(let [key, chunk] of this.chunks.entries()) {
            if(chunk !== 'pending') {
                for(let sys of chunk.systems) {
                    const dx = sys.x - cameraPos.x;
                    const dy = sys.y - cameraPos.y;
                    const dz = sys.z - cameraPos.z;
                    const distSq = dx*dx + dy*dy + dz*dz;
                    if (distSq < minDistSq) {
                        minDistSq = distSq;
                        closestStar = sys;
                    }
                }
            }
        }
        return closestStar;
    }
    
    update(playerX, playerY, playerZ, dt) {
        const cx = Math.floor(playerX / this.chunkSize);
        const cy = Math.floor(playerY / this.chunkSize);
        const cz = Math.floor(playerZ / this.chunkSize);
        const activeKeys = new Set();
        
        for(let x = cx - this.renderDistance; x <= cx + this.renderDistance; x++) {
            for(let y = cy - this.renderDistance; y <= cy + this.renderDistance; y++) {
                for(let z = cz - this.renderDistance; z <= cz + this.renderDistance; z++) {
                    if (Math.sqrt((x-cx)**2 + (y-cy)**2 + (z-cz)**2) <= this.renderDistance + 0.5) {
                        const key = this.getChunkKey(x, y, z);
                        activeKeys.add(key);
                        if(!this.chunks.has(key) && !this.chunkQueue.includes(key)) {
                            this.chunkQueue.push(key);
                            this.chunks.set(key, 'pending');
                        }
                    }
                }
            }
        }
        
        if (this.chunkQueue.length > 0) {
            const keyToBuild = this.chunkQueue.shift();
            if (activeKeys.has(keyToBuild)) {
                const [bx, by, bz] = keyToBuild.split(',').map(Number);
                const newChunk = new Chunk(bx, by, bz, this.scene, this.chunkSize);
                this.chunks.set(keyToBuild, newChunk);
            } else {
                this.chunks.delete(keyToBuild);
            }
        }
        
        for(let [key, chunk] of this.chunks.entries()) {
            if(!activeKeys.has(key)) {
                if (chunk !== 'pending') chunk.dispose();
                this.chunks.delete(key);
                const queueIndex = this.chunkQueue.indexOf(key);
                if (queueIndex > -1) this.chunkQueue.splice(queueIndex, 1);
            } else if (chunk !== 'pending') {
                chunk.update(dt);
            }
        }
    }

    dispose() {
        for(let [key, chunk] of this.chunks.entries()) {
            if (chunk !== 'pending' && chunk.dispose) {
                chunk.dispose();
            }
        }
        this.chunks.clear();
        this.chunkQueue = [];
    }

    rebuild() {
        this.dispose();
    }
}
