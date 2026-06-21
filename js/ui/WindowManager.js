export class WindowManager {
    static init() {
        // 1. Evitar navegación con Tab y zoom con teclado
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                e.preventDefault();
            }
            if (e.ctrlKey && (e.key === '=' || e.key === '-' || e.key === '0')) {
                e.preventDefault();
            }
        });

        // 2. Evitar zoom con rueda de ratón (Ctrl + Scroll)
        document.addEventListener('wheel', (e) => {
            if (e.ctrlKey) {
                e.preventDefault();
            }
        }, { passive: false });

        // 3. Forzar pantalla completa inteligentemente (sin romper F11/F5)
        this.enforceFullscreen = this.enforceFullscreen.bind(this);
        document.addEventListener('click', this.enforceFullscreen);
        
        document.addEventListener('keydown', (e) => {
            if (e.repeat) return; 
            
            // IGNORAR teclas del sistema (F1-F12, recargas) para no arruinar el comportamiento natural
            // Esto soluciona el "bug de recarga" donde F5 pedía HTML5 Fullscreen e interrumpía el F11 nativo
            if (e.key === 'Escape' || e.key.startsWith('F') || e.ctrlKey || e.altKey || e.metaKey) return;
            
            this.enforceFullscreen();
        });
    }

    static enforceFullscreen() {
        // Detectar F11 nativo matemáticamente (el matchMedia no detecta F11 en pestañas normales)
        const isNativeFullscreen = (window.innerWidth === screen.width && window.innerHeight === screen.height);
        
        if (!document.fullscreenElement && !isNativeFullscreen) {
            document.documentElement.requestFullscreen().catch(() => {});
        }
    }
}
