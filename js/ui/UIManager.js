import * as THREE from 'three';
import { Config } from '../core/Config.js';
import { OSDManager } from './OSDManager.js';

export class UIManager {
    constructor(camera) {
        this.camera = camera;
        this.labelsPool = [];
        this.hud = document.getElementById('hud');
        this.labelsContainer = document.getElementById('labels-container');
        
        OSDManager.init();
        
        for(let i=0; i<Config.UI_MAX_LABELS; i++) { 
            const el = document.createElement('div');
            el.className = 'floating-label';
            el.style.opacity = '0';
            el.style.pointerEvents = 'none';
            el._lastName = ''; // Cache de nombre
            this.labelsContainer.appendChild(el);
            this.labelsPool.push(el);
        }
        
        this.setupToggles();
    }
    
    setupToggles() {
        const toggleHUD = () => {
            this.hud.classList.toggle('hidden');
        };
        
        const toggleLabels = () => {
            this.labelsContainer.classList.toggle('hidden');
            if(this.labelsContainer.classList.contains('hidden')) {
                for (let i = 0; i < this.labelsPool.length; i++) {
                    this.labelsPool[i].style.opacity = '0';
                    this.labelsPool[i]._lastName = '';
                }
            }
        };
        
        document.addEventListener('keydown', (e) => {
            if(Config.KEYS.TOGGLE_HUD.includes(e.code)) toggleHUD();
            if(Config.KEYS.TOGGLE_LABELS.includes(e.code)) toggleLabels();
        });
    }
    
    updateHUD(speed, pos) {
        if (this.hud.classList.contains('hidden')) return;
        
        document.getElementById('speed').innerText = Math.round(speed * 10);
        document.getElementById('pos-x').innerText = Math.round(pos.x);
        document.getElementById('pos-y').innerText = Math.round(pos.y);
        document.getElementById('pos-z').innerText = Math.round(pos.z);
    }
    
    updateLabels(universe) {
        const cameraPos = this.camera.position;
        const maxDist = Config.UI_LABEL_MAX_DISTANCE; 
        const maxDistSq = maxDist * maxDist;
        
        const nearby = [];
        const tempV = new THREE.Vector3();
        
        for(let [key, chunk] of universe.chunks.entries()) {
            if(chunk === 'pending') continue;
            const cx = chunk.group.position.x;
            const cy = chunk.group.position.y;
            const cz = chunk.group.position.z;
            
            for(let sys of chunk.systems) {
                let dx = sys.lx + cx - cameraPos.x;
                let dy = sys.ly + cy - cameraPos.y;
                let dz = sys.lz + cz - cameraPos.z;
                let distSq = dx*dx + dy*dy + dz*dz;
                
                if (distSq < maxDistSq) {
                    nearby.push({ name: sys.name, type: sys.type, group: 'Estrella', radius: sys.radius, x: sys.lx+cx, y: sys.ly+cy, z: sys.lz+cz, distSq: distSq });
                }
                
                for(let p of sys.planets) {
                    dx = p.lx + cx - cameraPos.x;
                    dy = p.ly + cy - cameraPos.y;
                    dz = p.lz + cz - cameraPos.z;
                    distSq = dx*dx + dy*dy + dz*dz;
                    if (distSq < maxDistSq) {
                        nearby.push({ 
                            name: p.name, type: p.type, group: 'Planeta', 
                            radius: p.radius, x: p.lx+cx, y: p.ly+cy, z: p.lz+cz, 
                            distSq: distSq,
                            color: p.color, // <- PASAR EL COLOR
                            atmosphereDensity: p.atmosphereDensity, // <- PASAR ATMOSFERA
                            orbitSpeed: p.orbitSpeed,
                            rotationSpeed: p.rotationSpeed,
                            rotationY: p.rotationY
                        });
                    }
                }
            }
        }
        
        nearby.sort((a, b) => a.distSq - b.distSq);
        
        this.lastNearby = nearby;
        this.updateSensors(nearby);

        if (this.labelsContainer.classList.contains('hidden')) return;
        
        let labelIndex = 0;
        
        for (let i = 0; i < nearby.length; i++) {
            if (labelIndex >= this.labelsPool.length) break;
            
            const body = nearby[i];
            const dist = Math.sqrt(body.distSq);
            
            tempV.set(body.x, body.y, body.z);
            tempV.project(this.camera);
            
            if (tempV.z < 1 && tempV.x > -1.1 && tempV.x < 1.1 && tempV.y > -1.1 && tempV.y < 1.1) {
                const x = (tempV.x * 0.5 + 0.5) * window.innerWidth;
                const y = (tempV.y * -0.5 + 0.5) * window.innerHeight;
                const el = this.labelsPool[labelIndex];
                
                const distText = Math.round(Math.max(0, dist - body.radius)) + 'u';
                
                if (el._lastName !== body.name) {
                    const colorClass = body.group === 'Estrella' ? 'var(--function-color)' : 'var(--variable-color)';
                    const icon = body.group === 'Estrella' ? '❖' : '○';
                    
                    el.innerHTML = `<div style="text-align: left; line-height: 1.2;">
                        <span style="color:${colorClass}; font-size: 0.9rem; margin-right: 4px;">${icon}</span>
                        <span style="color:var(--text-primary); font-weight: 600; font-size: 0.85rem;">${body.name}</span>
                        <br>
                        <span style="color:#858585; font-size: 0.7rem; padding-left: 16px;">
                            ${body.type} <span style="color:var(--number-color);" class="dist-val">${distText}</span>
                        </span>
                    </div>`;
                    el._lastName = body.name; 
                    el._distSpan = el.querySelector('.dist-val');
                    el._lastDistText = distText;
                } else if (el._distSpan && el._lastDistText !== distText) {
                    el._distSpan.textContent = distText;
                    el._lastDistText = distText;
                }
                
                el.style.transform = `translate(-50%, -50%) translate(${x}px, ${y}px)`;
                el.style.left = '0px';
                el.style.top = '0px';
                
                let targetOpacity = 1.0;
                if (dist > maxDist * 0.7) {
                    targetOpacity = 1 - ((dist - maxDist * 0.7) / (maxDist * 0.3));
                }
                el.style.opacity = targetOpacity.toString();
                labelIndex++;
            }
        }
        
        for(let i = labelIndex; i < this.labelsPool.length; i++) {
            this.labelsPool[i].style.opacity = '0';
            this.labelsPool[i]._lastName = '';
        }
    }
    
    updateSensors(nearby) {
        let closestDist = Infinity;
        let closestStarDist = Infinity;
        
        for (let body of nearby) {
            if (body.group === 'Estrella' && body.distSq < closestStarDist) closestStarDist = body.distSq;
            if (body.distSq < closestDist) closestDist = body.distSq;
        }
        
        let dist = Math.sqrt(closestDist);
        let starDist = Math.sqrt(closestStarDist);
        
        let grav = Math.max(0, (3000 - dist) / 1000);
        let temp = starDist < Infinity ? Math.max(-270, 4000 - starDist) : -270;
        if (closestDist === Infinity) { grav = 0; temp = -270; }
        
        let crosshair = document.getElementById('crosshair');
        if (temp > 800 || dist < 200) {
            crosshair.style.color = '#ff5555';
            crosshair.style.transform = 'translate(-50%, -50%) scale(1.5)';
        } else {
            crosshair.style.color = 'rgba(255,255,255,0.4)';
            crosshair.style.transform = 'translate(-50%, -50%) scale(1)';
        }
        
        if (this.hud.classList.contains('hidden')) return;
        
        if (this.hud.classList.contains('hidden')) return;
    }
}
