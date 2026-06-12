export const EVENTS = {
    // UI y Selección (Targeting)
    TARGET_CHANGED: 'TARGET_CHANGED',
    TARGET_CLEARED: 'TARGET_CLEARED',
    
    // Transiciones de Estado del Motor
    STATE_CHANGED: 'STATE_CHANGED',
    PLAYER_LANDED: 'PLAYER_LANDED',
    PLAYER_LIFTOFF: 'PLAYER_LIFTOFF',

    // Telemetría de Interfaz
    PLAYER_TELEMETRY_UPDATED: 'PLAYER_TELEMETRY_UPDATED',
    HUD_UPDATED: 'HUD_UPDATED',
    OSD_MESSAGE: 'OSD_MESSAGE',
    BLACKHOLE_PANIC: 'BLACKHOLE_PANIC',
    
    // Comandos de Utilidad / Controles
    TOGGLE_LABELS: 'TOGGLE_LABELS',
    TOGGLE_CINEMATIC: 'TOGGLE_CINEMATIC',
    TOGGLE_FLASHLIGHT: 'TOGGLE_FLASHLIGHT'
};

class EventBus {
    constructor() {
        this.listeners = {};
    }

    // Suscribirse a un evento
    on(event, callback) {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }
        this.listeners[event].push(callback);
    }

    // Cancelar suscripción a un evento
    off(event, callback) {
        if (!this.listeners[event]) return;
        this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    }

    // Disparar un evento a todos los suscriptores
    emit(event, payload = null) {
        if (!this.listeners[event]) return;
        this.listeners[event].forEach(callback => {
            try {
                callback(payload);
            } catch (error) {
                console.error(`[EventManager] Error en listener del evento '${event}':`, error);
            }
        });
    }
}

// Exportamos una única instancia global (Singleton)
export const EventManager = new EventBus();
