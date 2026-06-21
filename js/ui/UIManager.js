import * as THREE from 'three';
import { Config } from '../core/Config.js';
import { OSDManager } from './OSDManager.js';
import { EventManager, EVENTS } from '../core/EventManager.js';

export class UIManager {
    constructor(camera) {
        this.camera = camera;
        this.labelsPool = [];
        this.hud = document.getElementById('hud');
        this.hudRight = document.getElementById('hud-right');
        this.labelsContainer = document.getElementById('labels-container');
        this.labelsHiddenManually = false;

        // Object Pooling
        this._tempV = new THREE.Vector3();
        this._planetPos = new THREE.Vector3();
        this._relativePos = new THREE.Vector3();

        OSDManager.init();

        for (let i = 0; i < Config.UI_MAX_LABELS; i++) {
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
                if (this.hudRight) {
                    this.hudRight.style.filter = `blur(${blur}px) hue-rotate(${level * 90}deg)`;
                    this.hudRight.style.transform = `translate(${shiftX}px, ${shiftY}px)`;
                }
                this.labelsContainer.style.filter = `blur(${blur}px)`;
                this.labelsContainer.style.transform = `translate(${shiftX * -1}px, ${shiftY}px)`;

                // Texto corrupto ocasional
                if (Math.random() > 0.9 && level > 0.5) {
                    const titles = this.hud.querySelectorAll('h3');
                    titles.forEach(t => t.style.color = colorGlitch);
                    if (this.hudRight) {
                        const rightTitles = this.hudRight.querySelectorAll('h3');
                        rightTitles.forEach(t => t.style.color = colorGlitch);
                    }
                } else {
                    const titles = this.hud.querySelectorAll('h3');
                    titles.forEach(t => t.style.color = '');
                    if (this.hudRight) {
                        const rightTitles = this.hudRight.querySelectorAll('h3');
                        rightTitles.forEach(t => t.style.color = '');
                    }
                }
            } else {
                this.hud.style.filter = 'none';
                this.hud.style.transform = 'translate(0, 0)';
                if (this.hudRight) {
                    this.hudRight.style.filter = 'none';
                    this.hudRight.style.transform = 'translate(0, 0)';
                }
                this.labelsContainer.style.filter = 'none';
                this.labelsContainer.style.transform = 'translate(0, 0)';
                const titles = this.hud.querySelectorAll('h3');
                titles.forEach(t => t.style.color = '');
                if (this.hudRight) {
                    const rightTitles = this.hudRight.querySelectorAll('h3');
                    rightTitles.forEach(t => t.style.color = '');
                }
            }
        });
        // Telemetría ciega desde el SpaceState
        EventManager.on(EVENTS.PLAYER_TELEMETRY_UPDATED, (payload) => {
            this.updateHUD(payload.speed, payload.pos);
            this.updateLabels(payload.nearby);
        });

        // Actualización del HUD del Target
        EventManager.on(EVENTS.HUD_TARGET_UPDATED, (payload) => {
            this.updateTargetHUD(payload);
        });

        // Actualización del HUD de Terreno
        EventManager.on(EVENTS.HUD_TERRAIN_UPDATED, (payload) => {
            this.updateTerrainHUD(payload);
        });

        EventManager.on(EVENTS.HUD_TERRAIN_FUEL_UPDATED, (payload) => {
            const fuelBar = document.getElementById('jetpack-fuel-bar');
            if (fuelBar && payload.fuelPct !== undefined) {
                fuelBar.style.width = payload.fuelPct + '%';
                if (payload.fuelPct < 20) fuelBar.style.backgroundColor = '#ff5555';
                else fuelBar.style.backgroundColor = 'var(--string-color)';
            }
            if (payload.statusText !== undefined) {
                document.getElementById('jetpack-status').innerText = payload.statusText;
            }
        });

        // Efectos Visuales
        EventManager.on(EVENTS.PLAYER_IMPACT, (payload) => {
            if (this.hud && !this.hud.classList.contains('hidden')) {
                // Apply visual shake, duration is 0.5s from css
                this.hud.classList.add('shake-animation');

                // Remove the class after animation completes so it can be triggered again
                setTimeout(() => {
                    if (this.hud) this.hud.classList.remove('shake-animation');
                }, 500);
            }
        });

        EventManager.on(EVENTS.TRANSITION_START, (payload) => {
            const flash = document.getElementById('transition-flash');
            if (flash) {
                flash.style.backgroundColor = (payload && payload.color) ? payload.color : 'black';
                flash.style.opacity = '1';
            }
        });

        EventManager.on(EVENTS.TRANSITION_END, () => {
            const flash = document.getElementById('transition-flash');
            if (flash) {
                flash.style.opacity = '0';
            }
        });

        EventManager.on(EVENTS.STATE_CHANGED, (state) => {
            const jpPanel = document.getElementById('jetpack-panel');
            if (jpPanel) {
                jpPanel.style.display = state === 'TERRAIN' ? 'block' : 'none';
            }
            const locatorPanel = document.getElementById('locator-panel');
            if (locatorPanel) {
                locatorPanel.style.display = state === 'SPACE' ? 'block' : 'none';
            }
            if (state === 'TERRAIN') {
                this.labelsContainer.classList.add('hidden');
                for (let i = 0; i < this.labelsPool.length; i++) {
                    this.labelsPool[i].style.opacity = '0';
                    this.labelsPool[i]._lastName = '';
                }
            } else {
                if (!this.labelsHiddenManually) {
                    this.labelsContainer.classList.remove('hidden');
                }
            }
        });

        this.setupLocator();

        // Selección de objetivo
        EventManager.on(EVENTS.TARGET_CHANGED, (target) => {
            if (target) {
                document.getElementById('target-panel').style.display = 'block';
            }
        });

        EventManager.on(EVENTS.TARGET_CLEARED, () => {
            document.getElementById('target-panel').style.display = 'none';
        });

        // Configuración de Render (Slider)
        const distSlider = document.getElementById('render-dist');
        if (distSlider) {
            distSlider.addEventListener('input', (e) => {
                const val = parseInt(e.target.value);
                document.getElementById('dist-val').innerText = val;
                EventManager.emit(EVENTS.RENDER_DISTANCE_CHANGED, val);
            });
            // Emitir valor inicial
            setTimeout(() => EventManager.emit(EVENTS.RENDER_DISTANCE_CHANGED, parseInt(distSlider.value)), 100);
        }
    }

    setupToggles() {
        const toggleHUD = () => {
            this.hud.classList.toggle('hidden');
            const hudRight = document.getElementById('hud-right');
            if (hudRight) hudRight.classList.toggle('hidden');
        };

        const toggleLabels = () => {
            this.labelsHiddenManually = !this.labelsContainer.classList.contains('hidden');
            this.labelsContainer.classList.toggle('hidden');
            if (this.labelsContainer.classList.contains('hidden')) {
                for (let i = 0; i < this.labelsPool.length; i++) {
                    this.labelsPool[i].style.opacity = '0';
                    this.labelsPool[i]._lastName = '';
                }
            }
        };

        window.addEventListener('keydown', (e) => {
            if (Config.KEYS.TOGGLE_HUD.includes(e.code)) {
                toggleHUD();
                EventManager.emit(EVENTS.OSD_MESSAGE, { message: 'Interfaz alternada', type: 'info', duration: 1000 });
            }
            if (Config.KEYS.TOGGLE_LABELS.includes(e.code)) {
                toggleLabels();
                EventManager.emit(EVENTS.OSD_MESSAGE, { message: 'Etiquetas alternadas', type: 'info', duration: 1000 });
            }
        });
    }

    updateHUD(speed, pos) {
        if (this.hud.classList.contains('hidden')) return;

        document.getElementById('speed').innerText = Config.formatNumber(speed * 10);
        document.getElementById('pos-x').innerText = Config.formatNumber(pos.x);
        document.getElementById('pos-y').innerText = Config.formatNumber(pos.y);
        document.getElementById('pos-z').innerText = Config.formatNumber(pos.z);
    }

    setupLocator() {
        const mainSelect = document.getElementById('locator-main-type');
        const subContainer = document.getElementById('locator-sub-type-container');
        const subSelect = document.getElementById('locator-sub-type');
        const scanBtn = document.getElementById('locator-scan-btn');
        const resultsDiv = document.getElementById('locator-results');
        const sortDistBtn = document.getElementById('sort-dist-btn');
        const sortRadBtn = document.getElementById('sort-rad-btn');
        const renderDistSlider = document.getElementById('render-dist');

        if (!mainSelect || !subSelect || !scanBtn || !resultsDiv) return;

        this.latestScanResults = [];
        this.currentSortMode = 'dist'; // 'dist' or 'rad'

        // Populate sub types based on main type
        mainSelect.addEventListener('change', () => {
            const val = mainSelect.value;
            subSelect.innerHTML = '<option value="ALL">\'TODOS\'</option>';

            if (val === 'ALL' || val === 'BlackHole') {
                subContainer.style.display = 'none';
            } else {
                subContainer.style.display = 'block';
                if (val === 'Star') {
                    for (let key in Config.STAR_TYPES) {
                        subSelect.innerHTML += `<option value="${key}">'${key}'</option>`;
                    }
                } else if (val === 'Planet') {
                    for (let key in Config.PLANET_BIOMES) {
                        subSelect.innerHTML += `<option value="${key}">'${key}'</option>`;
                    }
                }
            }
        });

        EventManager.on(EVENTS.LOCATOR_SCAN_PROGRESS, (progress) => {
            const resultsDiv = document.getElementById('locator-results');
            if (resultsDiv) {
                const filled = Math.floor(progress.pct / 10);
                const empty = 10 - filled;
                const bar = '[' + '='.repeat(filled) + ' '.repeat(empty) + ']';
                resultsDiv.innerHTML = `<span class="small-text" style="color: var(--keyword-color);">// Escaneando sector...<br>${bar} ${progress.pct}% (${progress.current}/${progress.total})</span>`;
            }
        });

        scanBtn.addEventListener('click', () => {
            const travelBtn = document.getElementById('locator-travel-btn');
            if (travelBtn) {
                travelBtn.disabled = true;
                travelBtn.style.opacity = '0.5';
                travelBtn.style.cursor = 'not-allowed';
                travelBtn.innerText = 'iviajar(null)';
            }
            resultsDiv.innerHTML = '<span class="small-text" style="color: var(--keyword-color);">// Escaneando sector...</span>';
            const extraRangeInput = document.getElementById('locator-extra-range');
            const criteria = {
                mainType: mainSelect.value,
                subType: subContainer.style.display === 'none' ? 'ALL' : subSelect.value,
                extraRange: extraRangeInput ? parseInt(extraRangeInput.value) || 0 : 0
            };
            this.latestCriteria = criteria;
            EventManager.emit(EVENTS.LOCATOR_SCAN_REQUESTED, criteria);
        });

        const renderResults = () => {
            const resultsDiv = document.getElementById('locator-results');

            const sortContainer = document.getElementById('locator-sort-container');

            if (this.latestScanResults.length === 0) {
                if (sortContainer) sortContainer.style.display = 'none';
                resultsDiv.innerHTML = `
                    <span class="small-text" style="color: #ff5555;">// No se encontraron resultados.</span>
                `;
                return;
            }

            if (sortContainer) sortContainer.style.display = 'flex';

            // Sort results
            if (this.currentSortMode === 'dist_asc') {
                this.latestScanResults.sort((a, b) => a.distSq - b.distSq);
                if (sortDistBtn) { sortDistBtn.classList.add('active-sort'); sortDistBtn.classList.remove('active-sort-desc'); sortDistBtn.innerText = 'dist ▲'; }
                if (sortRadBtn) { sortRadBtn.classList.remove('active-sort', 'active-sort-desc'); sortRadBtn.innerText = 'radio'; }
            } else if (this.currentSortMode === 'dist_desc') {
                this.latestScanResults.sort((a, b) => b.distSq - a.distSq);
                if (sortDistBtn) { sortDistBtn.classList.add('active-sort', 'active-sort-desc'); sortDistBtn.innerText = 'dist ▼'; }
                if (sortRadBtn) { sortRadBtn.classList.remove('active-sort', 'active-sort-desc'); sortRadBtn.innerText = 'radio'; }
            } else if (this.currentSortMode === 'rad_asc') {
                this.latestScanResults.sort((a, b) => a.radiusVal - b.radiusVal);
                if (sortRadBtn) { sortRadBtn.classList.add('active-sort'); sortRadBtn.classList.remove('active-sort-desc'); sortRadBtn.innerText = 'radio ▲'; }
                if (sortDistBtn) { sortDistBtn.classList.remove('active-sort', 'active-sort-desc'); sortDistBtn.innerText = 'dist'; }
            } else if (this.currentSortMode === 'rad_desc') {
                this.latestScanResults.sort((a, b) => b.radiusVal - a.radiusVal);
                if (sortRadBtn) { sortRadBtn.classList.add('active-sort', 'active-sort-desc'); sortRadBtn.innerText = 'radio ▼'; }
                if (sortDistBtn) { sortDistBtn.classList.remove('active-sort', 'active-sort-desc'); sortDistBtn.innerText = 'dist'; }
            }

            resultsDiv.innerHTML = `<div style="font-size: 0.7rem; color: var(--keyword-color); margin-bottom: 5px;">// Mostrando ${Math.min(100, this.latestScanResults.length)} de ${this.latestScanTotal || this.latestScanResults.length} coincidencias</div>`;
            const displayResults = this.latestScanResults.slice(0, 100);
            displayResults.forEach(res => {
                const item = document.createElement('div');
                item.className = 'locator-result-item';
                item.style.marginBottom = '5px';

                const isStar = res.group === 'Star';
                const isBlackHole = res.group === 'BlackHole';
                const colorClass = isStar ? 'var(--function-color)' : (isBlackHole ? '#8a2be2' : 'var(--variable-color)');
                const icon = isStar ? '❖' : (isBlackHole ? '🌀' : '○');
                const calculatedDist = (res.distSq >= 0) ? (Config.formatNumber(Math.sqrt(res.distSq)) + 'u') : '???u';

                item.innerHTML = `
                    <div style="font-size: 0.85rem; font-weight: bold; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                        <span style="color:${colorClass};">${icon}</span> ${res.name}
                    </div>
                    <div style="font-size: 0.7rem; color: #888;">
                        <span style="color: var(--number-color);">${calculatedDist}</span> | R: ${Config.formatNumber(res.radiusVal)}
                    </div>
                `;

                // QoL: Select visualmente
                item.addEventListener('click', () => {
                    const allItems = resultsDiv.querySelectorAll('.locator-result-item');
                    allItems.forEach(el => el.classList.remove('selected'));
                    item.classList.add('selected');

                    const travelBtn = document.getElementById('locator-travel-btn');
                    const body = res.bodyRef;

                    if (travelBtn) {
                        travelBtn.disabled = false;
                        travelBtn.style.opacity = '1';
                        travelBtn.style.cursor = 'pointer';
                        travelBtn.innerText = `viajar('${body.name}')`;
                    }

                    body.distSq = res.distSq;
                    this.selectedLocatorBody = body; // Guarda el body seleccionado
                    EventManager.emit(EVENTS.TARGET_CHANGED, body);
                    EventManager.emit(EVENTS.OSD_MESSAGE, { message: 'Objetivo remoto fijado: ' + body.name, type: 'success' });
                });

                resultsDiv.appendChild(item);
            });
        };

        const travelBtn = document.getElementById('locator-travel-btn');
        if (travelBtn) {
            travelBtn.addEventListener('click', () => {
                if (this.selectedLocatorBody) {
                    EventManager.emit(EVENTS.LOCATOR_TRAVEL_REQUESTED, this.selectedLocatorBody);
                }
            });
        }

        if (sortDistBtn) sortDistBtn.addEventListener('click', () => {
            this.currentSortMode = (this.currentSortMode === 'dist_asc') ? 'dist_desc' : 'dist_asc';
            renderResults();
        });
        if (sortRadBtn) sortRadBtn.addEventListener('click', () => {
            this.currentSortMode = (this.currentSortMode === 'rad_desc') ? 'rad_asc' : 'rad_desc';
            renderResults();
        });

        EventManager.on(EVENTS.LOCATOR_RESULTS_READY, (payload) => {
            // Attach raw radius value for sorting
            payload.results.forEach(r => r.radiusVal = r.bodyRef.radius);
            this.latestScanResults = payload.results;
            this.latestScanTotal = payload.total;
            renderResults();
        });
    }

    updateLabels(nearby) {
        if (!nearby) return;
        const maxDist = Config.UI_LABEL_MAX_DISTANCE;

        this.lastNearby = nearby; // Por si algo en la UI lo necesita localmente
        this.updateSensors(nearby);

        if (this.labelsContainer.classList.contains('hidden')) return;

        for (let i = 0; i < this.labelsPool.length; i++) {
            this.labelsPool[i]._usedThisFrame = false;
        }

        for (let i = 0; i < nearby.length; i++) {

            const body = nearby[i];
            const dist = Math.sqrt(body.distSq);
            let specificMaxDist = Math.max(maxDist, body.radius * Config.UI_LABEL_DISTANCE_MULT);
            if (dist > specificMaxDist) continue;

            this._tempV.set(body.x, body.y, body.z);
            this._tempV.project(this.camera);

            if (this._tempV.z < 1 && this._tempV.x > -1.1 && this._tempV.x < 1.1 && this._tempV.y > -1.1 && this._tempV.y < 1.1) {
                // Calcular el radio aparente en píxeles usando el FOV
                const fovRad = Config.RENDER_FOV * Math.PI / 180;
                const fovFactor = (window.innerHeight / 2) / Math.tan(fovRad / 2);
                const apparentRadiusPx = Math.min((body.radius / dist) * fovFactor, window.innerHeight / 2.5);

                const x = (this._tempV.x * 0.5 + 0.5) * window.innerWidth;
                const y = (this._tempV.y * -0.5 + 0.5) * window.innerHeight - apparentRadiusPx - 10;
                let el = this.labelsPool.find(l => l._lastName === body.name);
                if (!el) el = this.labelsPool.find(l => !l._usedThisFrame && l._lastName === '');
                if (!el) el = this.labelsPool.find(l => !l._usedThisFrame);

                if (!el) continue;
                el._usedThisFrame = true;

                const distText = Config.formatNumber(Math.max(0, dist - body.radius)) + 'u';

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

                // Escalar la etiqueta visualmente según qué tan lejos esté
                // Cerca (distancia < radio*4) = scale 1.0.  Lejos = scale 0.5
                const normalizedDist = Math.max(0, dist - body.radius * 4) / maxDist;
                const scale = Math.max(0.5, 1.0 - normalizedDist * 0.8);

                el.style.transform = `translate(-50%, -100%) translate(${x}px, ${y}px) scale(${scale})`;
                el.style.left = '0px';
                el.style.top = '0px';

                let targetOpacity = 1.0;

                if (dist > specificMaxDist * 0.7) {
                    targetOpacity = 1 - ((dist - specificMaxDist * 0.7) / (specificMaxDist * 0.3));
                }
                el.style.opacity = Math.max(0, targetOpacity).toString();
            }
        }

        for (let i = 0; i < this.labelsPool.length; i++) {
            if (!this.labelsPool[i]._usedThisFrame) {
                this.labelsPool[i].style.opacity = '0';
                this.labelsPool[i]._lastName = '';
            }
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
    }

    updateTargetHUD(payload) {
        const target = payload.target;
        if (!target) return;

        document.getElementById('target-panel').style.display = 'block';
        document.getElementById('target-name').innerText = "'" + target.name + "'";
        document.getElementById('target-type').innerText = "'" + target.type + "'";
        document.getElementById('target-radius').innerText = Config.formatNumber(target.radius);

        const targetAtmo = document.getElementById('target-atmo');
        const targetGravity = document.getElementById('target-gravity');
        const targetOrbit = document.getElementById('target-orbit');
        const targetRot = document.getElementById('target-rot');
        const targetTime = document.getElementById('target-time');
        const targetDist = document.getElementById('target-dist');
        const targetLat = document.getElementById('target-lat');
        const targetLon = document.getElementById('target-lon');

        if (targetAtmo) {
            targetAtmo.style.color = 'var(--string-color)';
            if (target.type === 'Gigante gaseoso') {
                targetAtmo.innerText = "'Letal/Tóxica'";
                targetAtmo.style.color = '#ff5555';
            } else if (target.atmosphereDensity > 0) {
                const densityPct = Math.round((target.atmosphereDensity / 0.0005) * 100);
                let text = '';
                if (densityPct < 20) { text = 'Tenue'; targetAtmo.style.color = '#55ffff'; }
                else if (densityPct < 60) { text = 'Respirable'; targetAtmo.style.color = '#55ff55'; }
                else if (densityPct < 90) { text = 'Densa'; targetAtmo.style.color = '#ffff55'; }
                else { text = 'Sofocante'; targetAtmo.style.color = '#ffaa00'; }
                targetAtmo.innerText = `'${text} (${densityPct}%)'`;
            } else {
                targetAtmo.innerText = "'Nula'";
                targetAtmo.style.color = '#aaaaaa';
            }
        }

        if (targetGravity) {
            let baseGravity = target.type === 'Gigante gaseoso' ? 2.5 : 1.0;
            let radiusFactor = target.radius / 2000;
            let calculatedG = baseGravity * radiusFactor;
            targetGravity.innerText = Config.formatNumber(calculatedG, 2) + ' G';

            if (calculatedG < 0.5) targetGravity.style.color = '#55ffff';
            else if (calculatedG < 1.5) targetGravity.style.color = '#ffffff';
            else targetGravity.style.color = '#ff5555';
        }

        if (targetOrbit) {
            if (target.orbitSpeed) targetOrbit.innerText = `'${Config.formatNumber(Math.abs(target.orbitSpeed) * 1000, 1)} km/s'`;
            else targetOrbit.innerText = "'N/A'";
        }

        if (targetRot) {
            if (target.rotationSpeed) targetRot.innerText = `'${Config.formatNumber(target.rotationSpeed * 1000, 1)} km/h'`;
            else targetRot.innerText = "'N/A'";
        }

        if (targetTime) {
            if (payload.gameState === 'TERRAIN' && payload.terrainManager) {
                let rotationY = payload.terrainManager.timeOfDay;
                let timeOfDay = rotationY % (Math.PI * 2);
                if (target.rotationSpeed < 0) {
                    timeOfDay = Math.PI - timeOfDay;
                }
                if (timeOfDay < 0) timeOfDay += Math.PI * 2;
                let hours = (timeOfDay / (Math.PI * 2)) * 24 + 6;
                if (hours >= 24) hours -= 24;
                const hh = Math.floor(hours).toString().padStart(2, '0');
                const mm = Math.floor((hours % 1) * 60).toString().padStart(2, '0');
                targetTime.innerText = `'${hh}:${mm}'`;
            } else if (payload.landingMarker && payload.landingMarker.planetName === target.name) {
                // Calcular tiempo local en el marcador basado en la rotación actual del planeta
                const rotY = target.rotationY || 0;
                // El vector del planeta a la estrella determina dónde da el sol
                const starAngle = Math.atan2(target.starZ - target.z, target.starX - target.x);
                // Longitud actual rotada en el espacio = marker.lon - rotY
                const currentWorldLon = payload.landingMarker.lon - rotY;

                let timeOfDay = (starAngle - currentWorldLon) + Math.PI / 2;
                if (target.rotationSpeed < 0) {
                    timeOfDay = Math.PI - timeOfDay;
                }
                timeOfDay = timeOfDay % (Math.PI * 2);
                if (timeOfDay < 0) timeOfDay += Math.PI * 2;
                let hours = (timeOfDay / (Math.PI * 2)) * 24 + 6;
                if (hours >= 24) hours -= 24;
                const hh = Math.floor(hours).toString().padStart(2, '0');
                const mm = Math.floor((hours % 1) * 60).toString().padStart(2, '0');
                targetTime.innerText = `'${hh}:${mm}'`;
            } else {
                targetTime.innerText = "'N/A'";
            }
        }

        if (targetDist) {
            if (payload.gameState === 'TERRAIN') {
                targetDist.innerText = Config.formatNumber(payload.cameraPos.y) + 'm';
                if (targetLat) targetLat.innerText = "'N/A'";
                if (targetLon) targetLon.innerText = "'N/A'";
            } else {
                this._planetPos.set(target.x, target.y, target.z);
                this._relativePos.subVectors(payload.cameraPos, this._planetPos);
                const dist = this._relativePos.length();
                targetDist.innerText = Config.formatNumber(dist) + 'u';

                if (targetLat && targetLon) {
                    if (payload.landingMarker && payload.landingMarker.planetName === target.name) {
                        targetLat.innerText = Config.formatNumber(payload.landingMarker.lat * (180 / Math.PI), 2) + '° (Fijado)';
                        targetLon.innerText = Config.formatNumber(payload.landingMarker.lon * (180 / Math.PI), 2) + '° (Fijado)';
                    } else {
                        const lat = Math.asin(Math.max(-1, Math.min(1, this._relativePos.y / dist)));
                        const lon = Math.atan2(this._relativePos.z, this._relativePos.x);
                        // Convertir a lon estática (despejando de worldLon = surfaceLon - rotY -> surfaceLon = worldLon + rotY)
                        const surfaceLon = lon + (target.rotationY || 0);
                        targetLat.innerText = Config.formatNumber(lat * (180 / Math.PI), 2) + '°';
                        targetLon.innerText = Config.formatNumber(surfaceLon * (180 / Math.PI), 2) + '°';
                    }
                }
            }
        }
    }

    updateTerrainHUD(payload) {
        document.getElementById('terr-compass').innerText = Config.formatNumber(payload.heading) + '° ' + payload.cardinal;

        const shipDistEl = document.getElementById('terr-ship-dist');
        if (payload.distToShip !== null) {
            shipDistEl.innerText = Config.formatNumber(payload.distToShip) + 'm';
            shipDistEl.className = 'prop-value'; // Default number styling
        } else {
            shipDistEl.innerText = "'N/A'";
            shipDistEl.className = 'prop-value string';
        }

        const tempEl = document.getElementById('terr-temp');
        tempEl.innerText = Config.formatNumber(payload.finalTemp) + ' °C';
        tempEl.style.color = payload.tempColor;

        const fuelBar = document.getElementById('jetpack-fuel-bar');
        if (fuelBar && payload.fuelPct !== undefined) {
            fuelBar.style.width = payload.fuelPct + '%';
            if (payload.fuelPct < 20) fuelBar.style.backgroundColor = '#ff5555';
            else fuelBar.style.backgroundColor = 'var(--string-color)';
        }

        if (payload.speed !== undefined) document.getElementById('speed').innerText = Config.formatNumber(payload.speed) + ' u/s';
        if (payload.pos) {
            document.getElementById('pos-x').innerText = Config.formatNumber(payload.pos.x);
            document.getElementById('pos-y').innerText = Config.formatNumber(payload.pos.y);
            document.getElementById('pos-z').innerText = Config.formatNumber(payload.pos.z);
            document.getElementById('terr-alt').innerText = Config.formatNumber(payload.pos.y) + 'm';
        }

        if (payload.latDeg !== undefined) document.getElementById('terr-lat').innerText = Config.formatNumber(payload.latDeg, 2) + '°';
        if (payload.lonDeg !== undefined) document.getElementById('terr-lon').innerText = Config.formatNumber(payload.lonDeg, 2) + '°';
    }
}
