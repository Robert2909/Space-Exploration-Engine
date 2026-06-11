export class GameState {
    /**
     * @param {Object} engineContext - Referencia al contexto general del Engine (scene, camera, etc.)
     */
    constructor(engineContext) {
        this.engine = engineContext;
    }

    /**
     * Llamado una sola vez cuando la Máquina de Estados cambia a este estado.
     * @param {Object} payload - Datos transferidos desde el estado anterior (ej. astros, coordenadas).
     */
    enter(payload) {
        console.warn(`[GameState] 'enter' method not implemented in ${this.constructor.name}`);
    }

    /**
     * Llamado en cada ciclo (requestAnimationFrame) mientras este estado sea el activo.
     * @param {number} dt - Delta time
     */
    update(dt) {
        console.warn(`[GameState] 'update' method not implemented in ${this.constructor.name}`);
    }

    /**
     * Llamado justo antes de que la Máquina de Estados abandone este estado.
     * Usar para limpiar eventos, liberar memoria, o guardar contexto.
     */
    exit() {
        console.warn(`[GameState] 'exit' method not implemented in ${this.constructor.name}`);
    }
}
