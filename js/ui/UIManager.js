import * as THREE from 'three';
import { Config } from '../core/Config.js';
import { MeasurementSystem } from '../core/systems/MeasurementSystem.js';
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
        let lastScanUpdate = 0;
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

        const mainSelect = document.getElementById('locator-main-type');
        const subSelect = document.getElementById('locator-sub-type');
        if (mainSelect) this._upgradeSelectToCustom(mainSelect);
        if (subSelect) this._upgradeSelectToCustom(subSelect);

        // Close custom selects when clicking outside
        document.addEventListener('click', () => {
            const selects = document.querySelectorAll('.custom-select-selected');
            for (let i = 0; i < selects.length; i++) {
                selects[i].classList.remove('select-arrow-active');
                if (selects[i].nextSibling) selects[i].nextSibling.classList.add('custom-select-hide');
            }
        });

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

        document.getElementById('speed').innerHTML = MeasurementSystem.formatSpeed(speed);
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

        // Lógica de inactividad del panel
        const locatorPanel = document.getElementById('locator-panel');
        this.locatorCollapseTimer = null;

        const resetCollapseTimer = (isHovering = false) => {
            if (this.locatorCollapseTimer) clearTimeout(this.locatorCollapseTimer);

            // Expandir el panel si estaba colapsado
            if (resultsDiv.classList.contains('collapsed')) {
                resultsDiv.classList.remove('collapsed');
            }

            // Si el mouse está dentro, no colapsa
            if (isHovering) return;

            // Si el mouse no está dentro, cuenta 10 segundos de inactividad
            this.locatorCollapseTimer = setTimeout(() => {
                resultsDiv.classList.add('collapsed');

                // Retraer también los menús desplegables si estuvieran abiertos
                const selects = document.querySelectorAll('.custom-select-selected');
                for (let i = 0; i < selects.length; i++) {
                    selects[i].classList.remove('select-arrow-active');
                    if (selects[i].nextSibling) selects[i].nextSibling.classList.add('custom-select-hide');
                }
            }, 1500);
        };

        if (locatorPanel) {
            locatorPanel.addEventListener('mouseenter', () => resetCollapseTimer(true));
            locatorPanel.addEventListener('mousemove', () => resetCollapseTimer(true));
            locatorPanel.addEventListener('mouseleave', () => resetCollapseTimer(false));
            locatorPanel.addEventListener('click', () => resetCollapseTimer(true));
        }

        // Iniciar el temporizador por defecto
        resetCollapseTimer(false);

        // Populate sub types based on main type
        mainSelect.addEventListener('change', () => {
            const val = mainSelect.value;
            subSelect.innerHTML = '<option value="ALL">\'Todos\'</option>';

            if (val === 'ALL' || val === 'BlackHole') {
                subSelect.disabled = true;
                if (subSelect._customWrapper) {
                    subSelect._customWrapper.style.opacity = '0.5';
                    subSelect._customWrapper.style.pointerEvents = 'none';
                }
            } else {
                subSelect.disabled = false;
                if (subSelect._customWrapper) {
                    subSelect._customWrapper.style.opacity = '1';
                    subSelect._customWrapper.style.pointerEvents = 'auto';
                }
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

            this._upgradeSelectToCustom(subSelect);

            const autoScan = document.getElementById('locator-auto-scan');
            if (autoScan && autoScan.checked) {
                scanBtn.click();
            }
        });

        subSelect.addEventListener('change', () => {
            const autoScan = document.getElementById('locator-auto-scan');
            if (autoScan && autoScan.checked) {
                scanBtn.click();
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

        this.renderResults = () => {
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
                if (sortTempBtn) { sortTempBtn.classList.remove('active-sort', 'active-sort-desc'); sortTempBtn.innerText = 'temp'; }
            } else if (this.currentSortMode === 'dist_desc') {
                this.latestScanResults.sort((a, b) => b.distSq - a.distSq);
                if (sortDistBtn) { sortDistBtn.classList.add('active-sort', 'active-sort-desc'); sortDistBtn.innerText = 'dist ▼'; }
                if (sortRadBtn) { sortRadBtn.classList.remove('active-sort', 'active-sort-desc'); sortRadBtn.innerText = 'radio'; }
                if (sortTempBtn) { sortTempBtn.classList.remove('active-sort', 'active-sort-desc'); sortTempBtn.innerText = 'temp'; }
            } else if (this.currentSortMode === 'rad_asc') {
                this.latestScanResults.sort((a, b) => a.radiusVal - b.radiusVal);
                if (sortRadBtn) { sortRadBtn.classList.add('active-sort'); sortRadBtn.classList.remove('active-sort-desc'); sortRadBtn.innerText = 'radio ▲'; }
                if (sortDistBtn) { sortDistBtn.classList.remove('active-sort', 'active-sort-desc'); sortDistBtn.innerText = 'dist'; }
                if (sortTempBtn) { sortTempBtn.classList.remove('active-sort', 'active-sort-desc'); sortTempBtn.innerText = 'temp'; }
            } else if (this.currentSortMode === 'rad_desc') {
                this.latestScanResults.sort((a, b) => b.radiusVal - a.radiusVal);
                if (sortRadBtn) { sortRadBtn.classList.add('active-sort', 'active-sort-desc'); sortRadBtn.innerText = 'radio ▼'; }
                if (sortDistBtn) { sortDistBtn.classList.remove('active-sort', 'active-sort-desc'); sortDistBtn.innerText = 'dist'; }
                if (sortTempBtn) { sortTempBtn.classList.remove('active-sort', 'active-sort-desc'); sortTempBtn.innerText = 'temp'; }
            } else if (this.currentSortMode === 'temp_asc') {
                this.latestScanResults.sort((a, b) => a.tempVal - b.tempVal);
                if (sortTempBtn) { sortTempBtn.classList.add('active-sort'); sortTempBtn.classList.remove('active-sort-desc'); sortTempBtn.innerText = 'temp ▲'; }
                if (sortDistBtn) { sortDistBtn.classList.remove('active-sort', 'active-sort-desc'); sortDistBtn.innerText = 'dist'; }
                if (sortRadBtn) { sortRadBtn.classList.remove('active-sort', 'active-sort-desc'); sortRadBtn.innerText = 'radio'; }
            } else if (this.currentSortMode === 'temp_desc') {
                this.latestScanResults.sort((a, b) => b.tempVal - a.tempVal);
                if (sortTempBtn) { sortTempBtn.classList.add('active-sort', 'active-sort-desc'); sortTempBtn.innerText = 'temp ▼'; }
                if (sortDistBtn) { sortDistBtn.classList.remove('active-sort', 'active-sort-desc'); sortDistBtn.innerText = 'dist'; }
                if (sortRadBtn) { sortRadBtn.classList.remove('active-sort', 'active-sort-desc'); sortRadBtn.innerText = 'radio'; }
            }

            // VIRTUAL SCROLL INIT
            if (!this._locatorScrollerInit) {
                this._locatorScrollerInit = true;
                resultsDiv.style.position = 'relative';

                this._locatorSpacer = document.createElement('div');
                this._locatorSpacer.style.width = '1px';

                this._locatorItemsContainer = document.createElement('div');
                this._locatorItemsContainer.style.position = 'absolute';
                this._locatorItemsContainer.style.top = '0px'; // No offset
                this._locatorItemsContainer.style.left = '0';
                this._locatorItemsContainer.style.right = '0';

                // Variables para interpolación suave
                let targetScroll = 0;
                let isSmoothScrolling = false;

                // Si el usuario usa la barra de scroll manualmente (o teclado/touch), interrumpimos la animación para evitar el efecto de liga elástica
                resultsDiv.addEventListener('mousedown', () => { isSmoothScrolling = false; });
                resultsDiv.addEventListener('keydown', () => { isSmoothScrolling = false; });
                resultsDiv.addEventListener('touchstart', () => { isSmoothScrolling = false; });

                resultsDiv.addEventListener('scroll', () => {
                    if (!isSmoothScrolling) {
                        targetScroll = resultsDiv.scrollTop;
                    }
                    if (this._updateVirtualScroll) this._updateVirtualScroll();
                });

                const smoothScrollRender = () => {
                    if (!isSmoothScrolling) return; // Abortar inmediatamente si el usuario interviene manualmente
                    
                    const currentScroll = resultsDiv.scrollTop;
                    const diff = targetScroll - currentScroll;
                    
                    if (Math.abs(diff) > 0.5) {
                        // Lerp: 0.08 hace que sea asombrosamente suave y sedoso
                        resultsDiv.scrollTop = currentScroll + diff * 0.08;
                        requestAnimationFrame(smoothScrollRender);
                    } else {
                        resultsDiv.scrollTop = targetScroll;
                        isSmoothScrolling = false;
                    }
                };

                // HACK REAL: Animación personalizada frame por frame
                resultsDiv.addEventListener('wheel', (e) => {
                    e.preventDefault();
                    if (!isSmoothScrolling) {
                        targetScroll = resultsDiv.scrollTop;
                    }
                    
                    const maxScroll = resultsDiv.scrollHeight - resultsDiv.clientHeight;
                    // deltaY * 3.5 compensa la suavidad extra para que puedas avanzar mucho si giras rápido
                    targetScroll += e.deltaY * 3.5; 
                    targetScroll = Math.max(0, Math.min(targetScroll, maxScroll));
                    
                    if (!isSmoothScrolling) {
                        isSmoothScrolling = true;
                        requestAnimationFrame(smoothScrollRender);
                    }
                }, { passive: false });
            }

            // Remove all children safely
            while (resultsDiv.firstChild) {
                resultsDiv.removeChild(resultsDiv.firstChild);
            }
            resultsDiv.appendChild(this._locatorSpacer);
            resultsDiv.appendChild(this._locatorItemsContainer);

            this._locatorHeights = new Int32Array(this.latestScanResults.length);
            let totalHeight = 0;
            for (let i = 0; i < this.latestScanResults.length; i++) {
                const group = this.latestScanResults[i].group;
                const hasTemp = group === 'Star' || group === 'Estrella' || group === 'Planet' || group === 'Planeta';
                // Altura exacta matemática = height (60px o 47px) + marginBottom (5px)
                const h = hasTemp ? 65 : 52; 
                this._locatorHeights[i] = totalHeight;
                totalHeight += h;
            }

            this._locatorSpacer.style.height = totalHeight + 'px';

            if (!this._locatorItemPool) this._locatorItemPool = [];

            // Clean selected states
            for (let item of this._locatorItemPool) {
                if (item) item.classList.remove('selected');
            }
            this.selectedLocatorBody = null;

            this._updateVirtualScroll = () => {
                if (!this.latestScanResults || this.latestScanResults.length === 0) return;

                const scrollTop = resultsDiv.scrollTop;
                const buffer = 3;
                // Min height expected is 47px (BlackHoles), max 60px. Usamos 45px para garantizar cubrir todo.
                const visibleItems = Math.ceil(resultsDiv.clientHeight / 45) + 2;

                // Find startIndex via search through prefix sums
                let startIndex = 0;
                let low = 0;
                let high = this._locatorHeights.length - 1;
                while (low <= high) {
                    const mid = Math.floor((low + high) / 2);
                    if (this._locatorHeights[mid] <= scrollTop) {
                        startIndex = mid;
                        low = mid + 1;
                    } else {
                        high = mid - 1;
                    }
                }

                startIndex = Math.max(0, startIndex - buffer);
                const endIndex = Math.min(this.latestScanResults.length, startIndex + visibleItems + (buffer * 2));

                const yOffset = this._locatorHeights[startIndex] || 0;
                this._locatorItemsContainer.style.transform = `translateY(${yOffset}px)`;

                // Clear current items from DOM container
                while (this._locatorItemsContainer.firstChild) {
                    this._locatorItemsContainer.removeChild(this._locatorItemsContainer.firstChild);
                }

                const neededItems = endIndex - startIndex;

                for (let i = 0; i < neededItems; i++) {
                    const resIndex = startIndex + i;
                    const res = this.latestScanResults[resIndex];
                    if (!res) continue;

                    let item = this._locatorItemPool[i];

                    if (!item) {
                        item = document.createElement('div');
                        item.className = 'locator-result-item';
                        item.style.marginBottom = '5px';
                        item.style.overflow = 'hidden';
                        item.style.boxSizing = 'border-box'; // Fuerza matemática bruta

                        const titleDiv = document.createElement('div');
                        // line-height forzado a 1.1 para evitar que símbolos especiales estiren el div
                        titleDiv.style.cssText = "font-size: 0.8rem; font-weight: bold; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 2px; line-height: 1.1;";
                        const iconSpan = document.createElement('span');
                        const nameText = document.createTextNode('');
                        titleDiv.appendChild(iconSpan);
                        titleDiv.appendChild(nameText);

                        const distDiv = document.createElement('div');
                        distDiv.style.cssText = "font-size: 0.65rem; color: #888; line-height: 1.2;";
                        const distSpan = document.createElement('span');
                        const radSpan = document.createElement('span');
                        const tempSpan = document.createElement('span');
                        distDiv.appendChild(distSpan);
                        distDiv.appendChild(radSpan);
                        distDiv.appendChild(tempSpan);

                        item.appendChild(titleDiv);
                        item.appendChild(distDiv);

                        item.addEventListener('click', (e) => {
                            const now = Date.now();
                            if (this._lastGhostAnimTime && now - this._lastGhostAnimTime < 600) return;
                            this._lastGhostAnimTime = now;

                            const allItems = this._locatorItemsContainer.querySelectorAll('.locator-result-item');
                            allItems.forEach(el => el.classList.remove('selected'));
                            item.classList.add('selected');

                            const travelBtn = document.getElementById('locator-travel-btn');
                            const body = item._bodyRef;

                            if (travelBtn && body) {
                                travelBtn.disabled = false;
                                travelBtn.style.opacity = '1';
                                travelBtn.style.cursor = 'pointer';
                                travelBtn.innerText = `viajar('${body.name}')`;
                            }

                            if (body) {
                                this.selectedLocatorBody = body;

                                // Create animation element
                                const itemRect = item.getBoundingClientRect();
                                const flyingEl = document.createElement('div');

                                // Copiamos las clases pero quitamos las que puedan afectar su layout base
                                flyingEl.className = 'locator-result-item selected';
                                flyingEl.style.position = 'fixed';
                                flyingEl.style.left = itemRect.left + 'px';
                                flyingEl.style.top = itemRect.top + 'px';
                                flyingEl.style.width = itemRect.width + 'px';
                                flyingEl.style.height = itemRect.height + 'px';
                                flyingEl.style.pointerEvents = 'none';
                                flyingEl.style.zIndex = '9999';
                                flyingEl.style.margin = '0';
                                flyingEl.style.boxSizing = 'border-box';
                                flyingEl.style.opacity = '0.95';
                                flyingEl.style.overflow = 'hidden';
                                flyingEl.style.borderTop = '0px solid transparent';
                                flyingEl.style.borderRight = '0px solid transparent';
                                flyingEl.style.borderBottom = '0px solid transparent';
                                flyingEl.style.borderRadius = '0px';
                                flyingEl.style.boxShadow = '0 0px 0px rgba(0,0,0,0)';
                                flyingEl.style.transition = 'all 0.5s cubic-bezier(0.25, 1, 0.5, 1)';

                                // Envolvemos el contenido en un div para desvanecerlo
                                const innerContent = document.createElement('div');
                                innerContent.innerHTML = item.innerHTML;
                                innerContent.style.width = itemRect.width + 'px';
                                innerContent.style.height = itemRect.height + 'px';
                                innerContent.style.transition = 'opacity 0.25s ease-out, filter 0.25s ease-out, transform 0.25s ease-out';
                                innerContent.style.transformOrigin = 'top left';
                                flyingEl.appendChild(innerContent);

                                // Creamos una capa que aparecerá con el contenido del objetivo
                                const targetContent = document.createElement('div');
                                targetContent.className = 'hud-panel'; // Heredar font-size y tipografías correctas
                                targetContent.style.position = 'absolute';
                                targetContent.style.top = '0';
                                targetContent.style.left = '0';
                                targetContent.style.boxSizing = 'border-box';
                                targetContent.style.display = 'flex';
                                targetContent.style.flexDirection = 'column';
                                targetContent.style.overflow = 'hidden';
                                // Las dimensiones se asignarán exactas después de medir el destino
                                targetContent.style.background = 'transparent'; // Evitar doble fondo
                                targetContent.style.border = 'none';
                                targetContent.style.boxShadow = 'none';
                                targetContent.style.opacity = '0';
                                targetContent.style.filter = 'blur(4px)';
                                targetContent.style.transform = 'scale(0.95)';
                                targetContent.style.transition = 'opacity 0.3s ease-in, filter 0.3s ease-in, transform 0.3s ease-in';
                                targetContent.style.transitionDelay = '0.15s'; // Intersecta suavemente con el desvanecimiento del anterior
                                targetContent.style.pointerEvents = 'none';
                                flyingEl.appendChild(targetContent);

                                document.body.appendChild(flyingEl);

                                const targetPanel = document.getElementById('target-panel');
                                const wasHidden = targetPanel.style.display === 'none';

                                // Ocultar inmediatamente antes de emitir para que el usuario no vea información parpadeando
                                targetPanel.style.transition = 'none';
                                targetPanel.style.opacity = '0';

                                // Emitimos temprano para que el sistema empiece a poblar el target-panel real
                                EventManager.emit(EVENTS.TARGET_CHANGED, body);

                                // Delay to allow layout calculation
                                requestAnimationFrame(() => {
                                    let tRect;

                                    if (wasHidden) {
                                        targetPanel.style.visibility = 'hidden';
                                        targetPanel.style.display = 'block';
                                        targetPanel.style.height = 'auto';
                                        targetPanel.style.paddingTop = '';
                                        targetPanel.style.paddingBottom = '';
                                        targetPanel.style.borderWidth = '';

                                        tRect = targetPanel.getBoundingClientRect();

                                        targetPanel.style.height = '0px';
                                        targetPanel.style.paddingTop = '0px';
                                        targetPanel.style.paddingBottom = '0px';
                                        targetPanel.style.marginTop = '0px';
                                        targetPanel.style.marginBottom = '0px';
                                        targetPanel.style.borderWidth = '0px';
                                        targetPanel.style.overflow = 'hidden';

                                        // Forzar reflujo
                                        targetPanel.offsetHeight;

                                        targetPanel.style.transition = 'all 0.5s cubic-bezier(0.25, 1, 0.5, 1)';
                                        targetPanel.style.visibility = 'visible';
                                    } else {
                                        tRect = targetPanel.getBoundingClientRect();
                                        targetPanel.style.transition = 'opacity 0.2s';
                                    }

                                    // Pre-fijar las dimensiones exactas del contenido final para que no sufra reflujo (wrap) mientras el recuadro crece
                                    // Restamos 2px que corresponden a los bordes del panel real (1px por cada lado), asegurando alineación perfecta del padding-box
                                    targetContent.style.width = (tRect.width - 2) + 'px';
                                    targetContent.style.height = (tRect.height - 2) + 'px';

                                    if (wasHidden) {
                                        targetPanel.style.height = tRect.height + 'px';
                                        targetPanel.style.paddingTop = '10px';
                                        targetPanel.style.paddingBottom = '10px';
                                        targetPanel.style.marginTop = '';
                                        targetPanel.style.marginBottom = '';
                                        targetPanel.style.borderWidth = '1px';
                                    }

                                    // Comenzar transición de fantasma
                                    flyingEl.style.left = tRect.left + 'px';
                                    flyingEl.style.top = tRect.top + 'px';
                                    flyingEl.style.width = tRect.width + 'px';
                                    flyingEl.style.height = tRect.height + 'px';
                                    flyingEl.style.opacity = '1';
                                    flyingEl.style.backgroundColor = 'rgba(30, 30, 30, 0.6)';
                                    flyingEl.style.setProperty('border-left', '1px solid rgba(69, 69, 69, 0.6)', 'important');
                                    flyingEl.style.borderTop = '1px solid rgba(69, 69, 69, 0.6)';
                                    flyingEl.style.borderRight = '1px solid rgba(69, 69, 69, 0.6)';
                                    flyingEl.style.borderBottom = '1px solid rgba(69, 69, 69, 0.6)';
                                    flyingEl.style.borderRadius = '4px';
                                    flyingEl.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.2)';

                                    // A medio camino, transformar el texto original y aparecer el nuevo
                                    innerContent.style.opacity = '0';
                                    innerContent.style.filter = 'blur(4px)';
                                    innerContent.style.transform = 'scale(1.05)';

                                    targetContent.style.opacity = '1';
                                    targetContent.style.filter = 'blur(0px)';
                                    targetContent.style.transform = 'scale(1)';

                                    // Robamos el HTML actualizado del panel un instante después de que el motor lo actualice
                                    setTimeout(() => {
                                        targetContent.innerHTML = targetPanel.innerHTML;
                                    }, 50);

                                    setTimeout(() => {
                                        // 1. Quitar transiciones para aplicar la opacidad 1 de forma instantánea
                                        targetPanel.style.transition = 'none';
                                        targetPanel.style.opacity = '1';
                                        targetPanel.style.height = '';
                                        targetPanel.style.overflow = '';

                                        // Forzar reflujo para que el navegador lo dibuje inmediatamente
                                        targetPanel.offsetHeight;

                                        // 2. Restaurar la transición por defecto (CSS)
                                        targetPanel.style.transition = '';

                                        // 3. Eliminar el fantasma de forma segura cuando el real ya es visible
                                        if (flyingEl.parentNode) flyingEl.parentNode.removeChild(flyingEl);
                                    }, 500); // Wait for transition
                                });
                            }
                        });

                        item.addEventListener('dblclick', () => {
                            const travelBtn = document.getElementById('locator-travel-btn');
                            if (travelBtn && !travelBtn.disabled) {
                                travelBtn.click();
                            }
                        });

                        item._iconSpan = iconSpan;
                        item._nameText = nameText;
                        item._distSpan = distSpan;
                        item._radSpan = radSpan;
                        item._tempSpan = tempSpan;

                        this._locatorItemPool[i] = item;
                    }

                    item.classList.remove('selected');
                    item._bodyRef = res.bodyRef;

                    const resGroup = res.group;
                    const isStar = resGroup === 'Star' || resGroup === 'Estrella';
                    const isPlanet = resGroup === 'Planet' || resGroup === 'Planeta';
                    const isBlackHole = resGroup === 'BlackHole';
                    const hasTemp = isStar || isPlanet;

                    // Asegurar matemáticamente que la altura visual coincida con el Virtual Scroll Spacer
                    const finalHeight = hasTemp ? '60px' : '47px';
                    item.style.height = finalHeight;
                    item.style.minHeight = finalHeight;
                    item.style.maxHeight = finalHeight;

                    let colorClass = 'var(--text-primary)';
                    let icon = '○';

                    if (isStar) {
                        icon = '❖';
                        if (res.bodyRef.colorHSL) {
                            colorClass = res.bodyRef.colorHSL;
                        } else if (res.bodyRef.sunColor !== undefined) {
                            const hsl = {};
                            new THREE.Color(res.bodyRef.sunColor).getHSL(hsl);
                            colorClass = `hsl(${Math.floor(hsl.h * 360)}, ${Math.floor(hsl.s * 100)}%, ${Math.floor(hsl.l * 100)}%)`;
                        } else {
                            const sData = Config.STAR_TYPES[res.type];
                            colorClass = sData && sData.hueBase !== undefined ? `hsl(${Math.floor(sData.hueBase * 360)}, ${Math.floor((sData.sat || 0.8) * 100)}%, 70%)` : 'var(--function-color)';
                        }
                    } else if (isBlackHole) {
                        colorClass = '#8a2be2';
                        icon = '🌀';
                    } else if (isPlanet) {
                        const pData = Config.PLANET_BIOMES[res.type];
                        icon = (pData && pData.isGasGiant) ? '○' : '●';
                        
                        if (res.bodyRef.colorHSL) {
                            colorClass = res.bodyRef.colorHSL;
                        } else if (res.bodyRef.color !== undefined) {
                            const hsl = {};
                            res.bodyRef.color.getHSL(hsl);
                            colorClass = `hsl(${Math.floor(hsl.h * 360)}, ${Math.floor(hsl.s * 100)}%, ${Math.floor(hsl.l * 100)}%)`;
                        } else {
                            colorClass = (pData && pData.hueBase !== undefined) ? `hsl(${Math.floor(pData.hueBase * 360)}, ${Math.floor((pData.sat || 0.5) * 100)}%, 65%)` : 'var(--variable-color)';
                        }
                    }
                    const calculatedDist = (res.distSq >= 0) ? MeasurementSystem.formatDistance(Math.sqrt(res.distSq)) : '???';

                    item._iconSpan.style.color = colorClass;
                    item._iconSpan.textContent = icon;
                    item._nameText.textContent = ' ' + res.name;

                    item._distSpan.innerHTML = 'Distancia: <span style="color: var(--number-color);">' + calculatedDist + '</span><br/>';
                    item._radSpan.innerHTML = 'Radio: <span style="color: var(--number-color);">' + MeasurementSystem.formatSize(res.radiusVal) + '</span><br/>';
                    
                    if (hasTemp) {
                        let tempColor = 'var(--string-color)';
                        let tempText = '???';
                        if (res.tempVal !== undefined) {
                            const tK = Math.round(res.tempVal);
                            const tC = tK - 273;
                            
                            // Color scaling based on Kelvin (same as HUD)
                            if (tK > 5000) tempColor = '#88ccff';
                            else if (tK > 2000) tempColor = '#ffffcc';
                            else if (tK > 350) tempColor = '#ffaa44';
                            else if (tK > 250) tempColor = '#55ff55';
                            else if (tK > 150) tempColor = '#aaffff';
                            else tempColor = '#5555ff';

                            tempText = isStar ? `${Config.formatNumber(tK)} K` : `${Config.formatNumber(tK)} K (${Config.formatNumber(tC)} °C)`;
                        }
                        item._tempSpan.innerHTML = `Temperatura: <span style="color: ${tempColor};">` + tempText + '</span>';
                    } else {
                        item._tempSpan.innerHTML = '';
                    }

                    if (this.selectedLocatorBody === res.bodyRef) {
                        item.classList.add('selected');
                    } else if (!this.selectedLocatorBody && window.engine && window.engine.controls && window.engine.controls.target === res.bodyRef) {
                        item.classList.add('selected');
                        this.selectedLocatorBody = res.bodyRef;
                    }

                    this._locatorItemsContainer.appendChild(item);
                }
            };

            // Primera llamada manual
            resultsDiv.scrollTop = 0;
            this._updateVirtualScroll();
        };

        const travelBtn = document.getElementById('locator-travel-btn');
        if (travelBtn) {
            travelBtn.addEventListener('click', () => {
                if (this.selectedLocatorBody) {
                    EventManager.emit(EVENTS.LOCATOR_TRAVEL_REQUESTED, this.selectedLocatorBody);
                }
            });
        }

        const sortTempBtn = document.getElementById('sort-temp-btn');
        if (sortDistBtn) sortDistBtn.addEventListener('click', () => {
            this.currentSortMode = (this.currentSortMode === 'dist_asc') ? 'dist_desc' : 'dist_asc';
            this.renderResults();
        });
        if (sortRadBtn) sortRadBtn.addEventListener('click', () => {
            this.currentSortMode = (this.currentSortMode === 'rad_desc') ? 'rad_asc' : 'rad_desc';
            this.renderResults();
        });
        if (sortTempBtn) sortTempBtn.addEventListener('click', () => {
            this.currentSortMode = (this.currentSortMode === 'temp_desc') ? 'temp_asc' : 'temp_desc';
            this.renderResults();
        });

        EventManager.on(EVENTS.LOCATOR_RESULTS_READY, (payload) => {
            // Attach raw radius value for sorting
            payload.results.forEach(r => {
                r.radiusVal = r.bodyRef.radius;
                r.tempVal = r.bodyRef.temperature || 0;
            });
            this.latestScanResults = payload.results;
            this.latestScanTotal = payload.total;
            if (sortTempBtn) {
                const showTemp = this.latestCriteria && (this.latestCriteria.mainType === 'Star' || this.latestCriteria.mainType === 'Planet');
                sortTempBtn.style.display = showTemp ? 'block' : 'none';
            }
            this.renderResults();
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

                const distText = MeasurementSystem.formatDistance(Math.max(0, dist - body.radius));

                if (el._lastName !== body.name) {
                    const isStar = body.group === 'Star' || body.group === 'Estrella';
                    const isPlanet = body.group === 'Planet' || body.group === 'Planeta';
                    const isBlackHole = body.group === 'BlackHole';
                    
                    let colorClass = 'var(--text-primary)';
                    let icon = '○';

                    if (isStar) {
                        icon = '❖';
                        if (body.colorHSL) {
                            colorClass = body.colorHSL;
                        } else if (body.sunColor !== undefined) {
                            const hsl = {};
                            new THREE.Color(body.sunColor).getHSL(hsl);
                            colorClass = `hsl(${Math.floor(hsl.h * 360)}, ${Math.floor(hsl.s * 100)}%, ${Math.floor(hsl.l * 100)}%)`;
                        } else {
                            const sData = Config.STAR_TYPES[body.type];
                            colorClass = sData && sData.hueBase !== undefined ? `hsl(${Math.floor(sData.hueBase * 360)}, ${Math.floor((sData.sat || 0.8) * 100)}%, 70%)` : 'var(--function-color)';
                        }
                    } else if (isBlackHole) {
                        colorClass = '#8a2be2';
                        icon = '🌀';
                    } else if (isPlanet) {
                        const pData = Config.PLANET_BIOMES[body.type];
                        icon = (pData && pData.isGasGiant) ? '○' : '●';
                        
                        if (body.colorHSL) {
                            colorClass = body.colorHSL;
                        } else if (body.color !== undefined) {
                            const hsl = {};
                            body.color.getHSL(hsl);
                            colorClass = `hsl(${Math.floor(hsl.h * 360)}, ${Math.floor(hsl.s * 100)}%, ${Math.floor(hsl.l * 100)}%)`;
                        } else {
                            colorClass = (pData && pData.hueBase !== undefined) ? `hsl(${Math.floor(pData.hueBase * 360)}, ${Math.floor((pData.sat || 0.5) * 100)}%, 65%)` : 'var(--variable-color)';
                        }
                    }

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
                    el._distSpan.innerHTML = distText;
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
        document.getElementById('target-radius').innerHTML = MeasurementSystem.formatSize(target.radius);

        const targetAtmo = document.getElementById('target-atmo');
        const targetGravity = document.getElementById('target-gravity');
        const targetOrbit = document.getElementById('target-orbit');
        const targetRot = document.getElementById('target-rot');
        const targetTime = document.getElementById('target-time');
        const targetTemp = document.getElementById('target-temp');
        const targetDist = document.getElementById('target-dist');
        const targetLat = document.getElementById('target-lat');
        const targetLon = document.getElementById('target-lon');

        let isGas = false;
        if (Config.PLANET_BIOMES && Config.PLANET_BIOMES[target.type] && Config.PLANET_BIOMES[target.type].isGasGiant) {
            isGas = true;
        } else if (target.type === 'Gigante gaseoso') {
            isGas = true;
        }

        if (targetAtmo) {
            targetAtmo.style.color = 'var(--string-color)';
            if (isGas) {
                // Generate a consistent huge number based on its radius
                const gasPressure = Math.round(target.radius * 0.45);
                targetAtmo.innerText = `'${Config.formatNumber(gasPressure)} atm - Aplastante'`;
                targetAtmo.style.color = '#ff5555';
            } else if (target.atmosphereDensity > 0) {
                // Approximate 0.00022 density to 1 atm based on the Pristine/Edenic biomes
                const pressure = target.atmosphereDensity / 0.00022;
                const pressureStr = Config.formatNumber(pressure, 2) + ' atm';
                let text = '';
                if (pressure < 0.05) { text = 'Casi Vacío'; targetAtmo.style.color = '#aaaaaa'; }
                else if (pressure < 0.5) { text = 'Tenue'; targetAtmo.style.color = '#55ffff'; }
                else if (pressure < 1.5) { text = 'Habitable'; targetAtmo.style.color = '#55ff55'; }
                else if (pressure < 5.0) { text = 'Densa'; targetAtmo.style.color = '#ffff55'; }
                else { text = 'Letal'; targetAtmo.style.color = '#ffaa00'; }
                targetAtmo.innerText = `'${pressureStr} - ${text}'`;
            } else {
                targetAtmo.innerText = "'0 atm - Vacío'";
                targetAtmo.style.color = '#aaaaaa';
            }
        }

        if (targetGravity) {
            let baseGravity = isGas ? 2.5 : 1.0;
            // La Tierra tiene ~6371 km de radio (637 U). Ese será el estándar para 1 G.
            let radiusFactor = target.radius / Config.REFERENCE_EARTH_RADIUS_U;
            let calculatedG = baseGravity * radiusFactor;
            targetGravity.innerText = Config.formatNumber(calculatedG, 2) + ' G';

            if (calculatedG < 0.5) targetGravity.style.color = '#55ffff';
            else if (calculatedG < 1.5) targetGravity.style.color = '#ffffff';
            else targetGravity.style.color = '#ff5555';
        }

        if (targetOrbit) {
            if (target.orbitSpeed) targetOrbit.innerHTML = `'${MeasurementSystem.formatPlanetarySpeed(target.orbitSpeed, target.orbitRadius)}'`;
            else targetOrbit.innerHTML = "'N/A'";
        }

        if (targetRot) {
            // For rotation, the relevant radius for linear surface speed is the planet's radius
            if (target.rotationSpeed) targetRot.innerHTML = `'${MeasurementSystem.formatPlanetarySpeed(target.rotationSpeed, target.radius || target.radiusVal)}'`;
            else targetRot.innerHTML = "'N/A'";
        }

        const isStar = target.sunColor !== undefined || (target.type && (target.type.includes('Enana') || target.type.includes('Gigante azul') || target.type.includes('Estrella') || target.type.includes('Star')));

        const targetSurface = document.getElementById('target-surface');
        if (targetSurface) {
            if (target.type === 'Agujero Negro') targetSurface.innerText = "'Singularidad'";
            else if (isStar) targetSurface.innerText = "'Plasma'";
            else if (isGas) targetSurface.innerText = "'Gaseoso'";
            else targetSurface.innerText = "'Rocoso'";
        }

        if (targetTime) {
            if (isStar || target.type === 'Agujero Negro') {
                targetTime.innerText = "'N/A'";
                targetTime.style.color = 'var(--string-color)';
            } else {
                if (payload.gameState === 'TERRAIN' && payload.terrainManager) {
                    let rotationY = payload.terrainManager.timeOfDay;
                    let timeOfDay = rotationY % (Math.PI * 2);
                    if (target.rotationSpeed < 0) timeOfDay = Math.PI - timeOfDay;
                    if (timeOfDay < 0) timeOfDay += Math.PI * 2;
                    let hours = (timeOfDay / (Math.PI * 2)) * 24 + 6;
                    if (hours >= 24) hours -= 24;
                    const hh = Math.floor(hours).toString().padStart(2, '0');
                    const mm = Math.floor((hours % 1) * 60).toString().padStart(2, '0');
                    targetTime.innerText = `'${hh}:${mm}'`;
                    targetTime.style.color = 'var(--string-color)';
                } else if (payload.landingMarker && payload.landingMarker.planetName === target.name) {
                    const rotY = target.rotationY || 0;
                    const starAngle = Math.atan2(target.starZ - target.z, target.starX - target.x);
                    const currentWorldLon = payload.landingMarker.lon - rotY;
                    let timeOfDay = (starAngle - currentWorldLon) + Math.PI / 2;
                    if (target.rotationSpeed < 0) timeOfDay = Math.PI - timeOfDay;
                    timeOfDay = timeOfDay % (Math.PI * 2);
                    if (timeOfDay < 0) timeOfDay += Math.PI * 2;
                    let hours = (timeOfDay / (Math.PI * 2)) * 24 + 6;
                    if (hours >= 24) hours -= 24;
                    const hh = Math.floor(hours).toString().padStart(2, '0');
                    const mm = Math.floor((hours % 1) * 60).toString().padStart(2, '0');
                    targetTime.innerText = `'${hh}:${mm}'`;
                    targetTime.style.color = 'var(--string-color)';
                } else {
                    targetTime.innerText = "'N/A'";
                    targetTime.style.color = 'var(--string-color)';
                }
            }
        }

        if (targetTemp) {
            let temp = target.temperature;

            if (temp !== undefined) {
                temp = Math.round(temp);
                let tempC = temp - 273; // Conversion Kelvin a Celsius
                targetTemp.innerText = isStar ? `'${Config.formatNumber(temp)} K'` : `'${Config.formatNumber(temp)} K (${Config.formatNumber(tempC)} °C)'`;

                // Color scaling based on Kelvin
                if (temp > 5000) targetTemp.style.color = '#88ccff';
                else if (temp > 2000) targetTemp.style.color = '#ffffcc';
                else if (temp > 350) targetTemp.style.color = '#ffaa44';
                else if (temp > 250) targetTemp.style.color = '#55ff55';
                else if (temp > 150) targetTemp.style.color = '#aaffff';
                else targetTemp.style.color = '#5555ff';
            } else {
                targetTemp.innerText = "'N/A'";
                targetTemp.style.color = 'var(--string-color)';
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
                // HUD displays distance to surface, just like labels
                const distToSurface = Math.max(0, dist - target.radius);
                targetDist.innerHTML = MeasurementSystem.formatDistance(distToSurface);

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

        if (payload.speed !== undefined) document.getElementById('speed').innerHTML = MeasurementSystem.formatSpeed(payload.speed);
        if (payload.pos) {
            document.getElementById('pos-x').innerText = Config.formatNumber(payload.pos.x);
            document.getElementById('pos-y').innerText = Config.formatNumber(payload.pos.y);
            document.getElementById('pos-z').innerText = Config.formatNumber(payload.pos.z);
            document.getElementById('terr-alt').innerText = Config.formatNumber(payload.pos.y) + 'm';
        }

        if (payload.latDeg !== undefined) document.getElementById('terr-lat').innerText = Config.formatNumber(payload.latDeg, 2) + '°';
        if (payload.lonDeg !== undefined) document.getElementById('terr-lon').innerText = Config.formatNumber(payload.lonDeg, 2) + '°';
    }

    _upgradeSelectToCustom(selectElement) {
        if (!selectElement) return;

        let wrapper = selectElement._customWrapper;
        if (!wrapper) {
            wrapper = document.createElement('div');
            wrapper.className = 'custom-select-wrapper';
            selectElement.parentNode.insertBefore(wrapper, selectElement.nextSibling);
            selectElement._customWrapper = wrapper;
        } else {
            wrapper.innerHTML = ''; // Clear previous items
        }

        if (selectElement.disabled) {
            wrapper.style.opacity = '0.5';
            wrapper.style.pointerEvents = 'none';
        } else {
            wrapper.style.opacity = '1';
            wrapper.style.pointerEvents = 'auto';
        }

        const selectedDiv = document.createElement('div');
        selectedDiv.className = 'custom-select-selected';
        selectedDiv.innerHTML = selectElement.options.length > 0 ? selectElement.options[selectElement.selectedIndex].innerHTML : '';
        wrapper.appendChild(selectedDiv);

        const itemsDiv = document.createElement('div');
        itemsDiv.className = 'custom-select-items custom-select-hide';

        for (let i = 0; i < selectElement.options.length; i++) {
            const opt = document.createElement('div');
            opt.innerHTML = selectElement.options[i].innerHTML;
            if (i === selectElement.selectedIndex) opt.classList.add('same-as-selected');

            opt.addEventListener('click', (e) => {
                e.stopPropagation();
                selectElement.selectedIndex = i;
                selectedDiv.innerHTML = selectElement.options[i].innerHTML;

                const siblings = itemsDiv.children;
                for (let k = 0; k < siblings.length; k++) {
                    siblings[k].classList.remove('same-as-selected');
                }
                opt.classList.add('same-as-selected');

                selectedDiv.click(); // to close
                selectElement.dispatchEvent(new Event('change'));
            });
            itemsDiv.appendChild(opt);
        }
        wrapper.appendChild(itemsDiv);

        selectedDiv.addEventListener('click', function (e) {
            e.stopPropagation();
            // Close all others
            const others = document.querySelectorAll('.custom-select-selected');
            for (let i = 0; i < others.length; i++) {
                if (others[i] !== this) {
                    others[i].classList.remove('select-arrow-active');
                    if (others[i].nextSibling) others[i].nextSibling.classList.add('custom-select-hide');
                }
            }
            this.nextSibling.classList.toggle('custom-select-hide');
            this.classList.toggle('select-arrow-active');
        });
    }
}
