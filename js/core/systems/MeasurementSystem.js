import { Config } from '../Config.js';

export class MeasurementSystem {
    /**
     * Convierte una distancia cruda en U a un string formateado.
     * @param {number} valueU - La distancia en unidades del motor.
     * @returns {string} - Distancia formateada con su unidad (m, km, UA, ly).
     */
    static formatDistance(distanceU) {
        if (distanceU < 0) return '0 m';
        const u = Math.abs(distanceU);
        
        // 1 U = 10 km = 10,000 m
        const meters = u * Config.SCALE_U_TO_M;
        const km = u * Config.SCALE_U_TO_KM;
        
        if (meters < 1000) {
            return `${Config.formatNumber(meters, 0)} <span style="color: #a9a9a9;">m</span>`;
        }
        
        if (km < 10000000) { // Hasta 10 millones de km
            return `${Config.formatNumber(km, 0)} <span style="color: #55ff55;">km</span>`;
        }
        
        const au = u * Config.SCALE_U_TO_AU;
        if (au < 1000) { 
            return `${Config.formatNumber(au, 2)} <span style="color: #ffaa00;">UA</span>`;
        }
        
        const ly = u * Config.SCALE_U_TO_LY;
        return `${Config.formatNumber(ly, 3)} <span style="color: #b57edc;">ly</span>`;
    }

    /**
     * Convierte una velocidad en U/s a string formateado.
     * @param {number} speedU - Velocidad en unidades del motor por segundo.
     * @returns {string}
     */
    static formatSpeed(speedU) {
        const u = Math.abs(speedU);
        const km_s = u * Config.SCALE_U_TO_KM;
        
        // Colores y unidades dinámicas para mayor espectacularidad
        if (km_s < 0.343) { // Menos que Mach 1 (343 m/s)
            const m_s = km_s * 1000;
            return `${Config.formatNumber(m_s, 1)} <span style="color: #a9a9a9;">m/s</span>`; // Gris/Blanco
        }

        if (km_s < 2) { // Menos de ~Mach 6 (vuelos atmosféricos rápidos)
            const mach = km_s / 0.343;
            return `${Config.formatNumber(mach, 2)} <span style="color: #ffaa00;">Mach</span>`; // Naranja
        }
        
        if (km_s < 30000) { // Menos del 10% de la velocidad de la luz
            return `${Config.formatNumber(km_s, 1)} <span style="color: #55ff55;">km/s</span>`; // Verde
        }
        
        // Expresar como un múltiplo de la velocidad de la luz (c)
        const c = km_s / 300000;
        return `${Config.formatNumber(c, 2)} <span style="color: #b57edc;">c</span>`; // Púrpura (Warp)
    }

    /**
     * Convierte la velocidad angular de un planeta a una velocidad lineal "realista"
     * dividiéndola entre el factor de aceleración de tiempo del juego.
     * @param {number} angularSpeed - Radianes por segundo (orbitSpeed o rotationSpeed).
     * @param {number} radiusU - Radio orbital (para traslación) o radio del planeta (para rotación).
     * @returns {string}
     */
    static formatPlanetarySpeed(angularSpeed, radiusU) {
        if (!angularSpeed || !radiusU) return this.formatSpeed(0);

        // Velocidad lineal real en U/s
        const linearSpeedU = Math.abs(angularSpeed) * radiusU;
        return this.formatSpeed(linearSpeedU);
    }

    /**
     * Convierte radios planetarios o estelares a string formateado.
     * @param {number} radiusU - Radio en unidades del motor.
     * @returns {string}
     */
    static formatSize(radiusU) {
        // En planetas usamos las mismas escalas de distancia (km, UA, etc.)
        return this.formatDistance(radiusU);
    }
}
