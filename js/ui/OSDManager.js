export class OSDManager {
    static container = null;
    static currentEl = null;
    static timeoutId = null;

    static init() {
        if (this.container) return;
        this.container = document.createElement('div');
        this.container.id = 'osd-container';
        this.container.style.position = 'absolute';
        this.container.style.bottom = '15%';
        this.container.style.left = '50%';
        this.container.style.transform = 'translateX(-50%)';
        this.container.style.display = 'flex';
        this.container.style.justifyContent = 'center';
        this.container.style.pointerEvents = 'none';
        this.container.style.zIndex = '100';
        
        const uiLayer = document.getElementById('ui-layer');
        if (uiLayer) {
            uiLayer.appendChild(this.container);
        } else {
            document.body.appendChild(this.container);
        }
    }

    static show(message, type = 'info', duration = 3000) {
        this.init();

        // Prevent stacking: remove current immediately
        if (this.currentEl) {
            this.currentEl.remove();
            clearTimeout(this.timeoutId);
            this.currentEl = null;
        }

        const el = document.createElement('div');
        let color = 'var(--string-color)';
        if (type === 'success') color = 'var(--number-color)';
        if (type === 'warning') color = '#ffcc00';
        if (type === 'error') color = '#ff5555';
        
        el.innerHTML = `<span style="color: var(--keyword-color);">log</span>(<span style="color: ${color};">'${message}'</span>)<span style="color: #ccc;">;</span>`;
        el.style.background = 'rgba(37, 37, 38, 0.95)';
        el.style.padding = '8px 16px';
        el.style.border = '1px solid rgba(69, 69, 69, 0.8)';
        el.style.borderRadius = '4px';
        el.style.fontFamily = "'Fira Code', Consolas, monospace";
        el.style.fontSize = '0.9rem';
        el.style.opacity = '0';
        el.style.boxShadow = '0 4px 6px rgba(0,0,0,0.5)';
        el.style.transition = 'opacity 0.2s, transform 0.2s';
        el.style.transform = 'translateY(10px)';
        el.style.whiteSpace = 'nowrap';
        
        this.container.appendChild(el);
        this.currentEl = el;
        
        requestAnimationFrame(() => {
            el.style.opacity = '1';
            el.style.transform = 'translateY(0)';
        });
        
        this.timeoutId = setTimeout(() => {
            if (this.currentEl === el) {
                el.style.opacity = '0';
                el.style.transform = 'translateY(-10px)';
                setTimeout(() => {
                    if (this.currentEl === el) {
                        el.remove();
                        this.currentEl = null;
                    }
                }, 200);
            }
        }, duration);
    }
}
