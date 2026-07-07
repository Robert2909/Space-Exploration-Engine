export const EVENTS = {
    // UI y Selección (Targeting)
    TARGET_CHANGED: 'TARGET_CHANGED',
    TARGET_CLEARED: 'TARGET_CLEARED',

    // Transiciones de Estado del Motor
    STATE_CHANGED: 'STATE_CHANGED',
    PLAYER_LANDED: 'PLAYER_LANDED',
    PLAYER_LIFTOFF: 'PLAYER_LIFTOFF',
    PLAYER_DEATH: 'PLAYER_DEATH',
    PLAYER_IMPACT: 'PLAYER_IMPACT',

    // Telemetría de Interfaz
    PLAYER_TELEMETRY_UPDATED: 'PLAYER_TELEMETRY_UPDATED',
    HUD_UPDATED: 'HUD_UPDATED',
    HUD_TARGET_UPDATED: 'HUD_TARGET_UPDATED',
    HUD_TERRAIN_UPDATED: 'HUD_TERRAIN_UPDATED',
    HUD_TERRAIN_FUEL_UPDATED: 'HUD_TERRAIN_FUEL_UPDATED',
    HUD_GASDIVE_UPDATED: 'HUD_GASDIVE_UPDATED',
    OSD_MESSAGE: 'OSD_MESSAGE',
    OSD_HIDE: 'OSD_HIDE',
    BLACK_HOLE_PANIC: 'BLACK_HOLE_PANIC',
    TRANSITION_START: 'TRANSITION_START',
    TRANSITION_END: 'TRANSITION_END',
    SYSTEM_ENTERED: 'SYSTEM_ENTERED',
    SYSTEM_EXITED: 'SYSTEM_EXITED',
    RENDER_DISTANCE_CHANGED: 'RENDER_DISTANCE_CHANGED',
    LOCATOR_SCAN_REQUESTED: 'LOCATOR_SCAN_REQUESTED',
    LOCATOR_SCAN_PROGRESS: 'LOCATOR_SCAN_PROGRESS',
    LOCATOR_RESULTS_READY: 'LOCATOR_RESULTS_READY',
    LOCATOR_TRAVEL_REQUESTED: 'LOCATOR_TRAVEL_REQUESTED',

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
