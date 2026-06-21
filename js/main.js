import { ErrorManager } from './ui/ErrorManager.js';
import { Engine } from './core/Engine.js';

window.addEventListener('load', () => {
    ErrorManager.init();
    new Engine();

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
    const enforceFullscreen = () => {
        // Detectar si ya estamos en pantalla completa (API de HTML5 o F11 nativo) usando CSS Media Queries
        const isNativeFullscreen = window.matchMedia('(display-mode: fullscreen)').matches;
        
        if (!document.fullscreenElement && !isNativeFullscreen) {
            document.documentElement.requestFullscreen().catch(() => {});
        }
    };

    document.addEventListener('click', enforceFullscreen);
    document.addEventListener('keydown', (e) => {
        if (e.repeat) return; // Evitar spam si se mantiene presionada
        if (e.key !== 'Escape' && e.code !== 'KeyT') {
            enforceFullscreen();
        }
    });
});
