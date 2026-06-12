import * as THREE from 'three';
import { Config } from '../core/Config.js';
import { OSDManager } from './OSDManager.js';
import { EventManager, EVENTS } from '../core/EventManager.js';

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
        
        // Efecto Pánico (Agujeros Negros)
        EventManager.on(EVENTS.BLACKHOLE_PANIC, (payload) => {
            const level = payload.level || 0;
            if (level > 0.05) {
                const blur = Math.random() * level * 5;
                const shiftX = (Math.random() - 0.5) * level * 20;
                const shiftY = (Math.random() - 0.5) * level * 10;
                const colorGlitch = Math.random() > 0.8 ? 'red' : 'var(--keyword-color)';
                
                this.hud.style.filter = `blur(${blur}px) hue-rotate(${level * 90}deg)`;
                this.hud.style.transform = `translate(${shiftX}px, ${shiftY}px)`;
                this.labelsContainer.style.filter = `blur(${blur}px)`;
                this.labelsContainer.style.transform = `translate(${shiftX * -1}px, ${shiftY}px)`;
                
                // Texto corrupto ocasional
                if (Math.random() > 0.9 && level > 0.5) {
                    const titles = this.hud.querySelectorAll('h3');
                    titles.forEach(t => t.style.color = colorGlitch);
                } else {
                    const titles = this.hud.querySelectorAll('h3');
                    titles.forEach(t => t.style.color = '');
                }
            } else {
                this.hud.style.filter = 'none';
                this.hud.style.transform = 'translate(0, 0)';
                this.labelsContainer.style.filter = 'none';
                this.labelsContainer.style.transform = 'translate(0, 0)';
                const titles = this.hud.querySelectorAll('h3');
                titles.forEach(t => t.style.color = '');
            }
        });
        // Telemetría ciega desde el SpaceState
        EventManager.on(EVENTS.PLAYER_TELEMETRY_UPDATED, (payload) => {
            this.updateHUD(payload.speed, payload.pos);
            this.updateLabels(payload.nearby);
        });
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
    
    updateLabels(nearby) {
        if (!nearby) return;
        const tempV = new THREE.Vector3();
        const maxDist = Config.UI_LABEL_MAX_DISTANCE;
        
        this.lastNearby = nearby; // Por si algo en la UI lo necesita localmente
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
                    const isStar = body.group === 'Estrella';
                    const isBlackHole = body.group === 'BlackHole';
                    const colorClass = isStar ? 'var(--function-color)' : (isBlackHole ? '#8a2be2' : 'var(--variable-color)');
                    const icon = isStar ? '❖' : (isBlackHole ? '🌀' : '○');
                    
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
                let specificMaxDist = body.group === 'BlackHole' ? maxDist * 10 : maxDist;
                
                if (dist > specificMaxDist * 0.7) {
                    targetOpacity = 1 - ((dist - specificMaxDist * 0.7) / (specificMaxDist * 0.3));
                }
                el.style.opacity = Math.max(0, targetOpacity).toString();
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
