import { CelestialBody } from './CelestialBody.js';
import { seededRandom } from '../../utils/MathUtils.js';
import { Config } from '../../core/Config.js';

export class BlackHole extends CelestialBody {
    constructor(config) {
        super(config);
        this.type = 'Agujero Negro'; // Flag para que SpaceState.js y sistemas sepan el tipo de astro
        this.group = 'BlackHole';

        this.icon = Config.BLACK_HOLE_ICON;
        this.colorString = Config.BLACK_HOLE_COLOR;

        // Ecosistemas oscuros: planetas orbitando la anomalía
        this.planets = config.planets || [];

        const seed = Math.abs(this.lx * 738 + this.ly * 19 + this.lz * 88);

        // ==========================================
        // 1. MASA BASE (M en Masas Solares M☉)
        // ==========================================
        const massRng = seededRandom(this.lx, this.ly, this.lz, seed);
        if (config.mass) {
            this.mass = config.mass;
        } else if (config.isUltraMassive) {
            this.mass = 1e9 + seededRandom(this.lx, this.ly, this.lz, seed + 1) * 1e10; // Hipermasivo (Titán)
        } else if (massRng > 0.95) {
            this.mass = 1e5 + seededRandom(this.lx, this.ly, this.lz, seed + 1) * 1e8;  // Supermasivo (SMBH)
        } else if (massRng > 0.80) {
            this.mass = 100 + seededRandom(this.lx, this.ly, this.lz, seed + 1) * 1e5;  // Masa Intermedia
        } else {
            this.mass = 3 + seededRandom(this.lx, this.ly, this.lz, seed + 1) * 97;     // Masa Estelar
        }

        if (this.mass > 1e9) this.subType = 'Hipermasivo (Titán)';
        else if (this.mass > 1e5) this.subType = 'Supermasivo (SMBH)';
        else if (this.mass > 100) this.subType = 'Masa Intermedia';
        else this.subType = 'Masa Estelar';

        // ==========================================
        // 2. ESPÍN ADIMENSIONAL (a ∈ [0.0, 0.998])
        // ==========================================
        // Acotamiento defensivo estricto para prevenir indeterminaciones de raíz cuadrada
        const rawSpin = config.spin !== undefined ? config.spin : seededRandom(this.lx, this.ly, this.lz, seed + 2);
        this.spin = Math.min(Math.max(rawSpin, 0.0), 0.998);

        // Vector 3D del eje de rotación cósmico (orientación espacial)
        this.inclinationX = seededRandom(this.lx, this.ly, this.lz, seed + 4) * Math.PI * 2;
        this.inclinationY = seededRandom(this.lx, this.ly, this.lz, seed + 5) * Math.PI * 2;
        this.inclinationZ = seededRandom(this.lx, this.ly, this.lz, seed + 6) * Math.PI * 2;

        // Vector unitario del eje de giro para el uniform uSpinAxis del shader
        this.spinAxis = {
            x: Math.sin(this.inclinationX) * Math.cos(this.inclinationY),
            y: Math.cos(this.inclinationX),
            z: Math.sin(this.inclinationX) * Math.sin(this.inclinationY)
        };

        // ==========================================
        // 3. RADIOS GEOMÉTRICOS DE KERR (Escala del Motor)
        // ==========================================
        // Radio de Schwarzschild canónico: Rs = 2GM / c^2
        const RS_MULTIPLIER = 2000;
        this.schwarzschildRadius = Math.max(5000, Math.pow(this.mass, 0.4) * RS_MULTIPLIER);
        this.radius = this.schwarzschildRadius; // Referencia dimensional estándar

        // Horizonte de Eventos Exterior Kerr: R+ = (Rs / 2) * (1 + sqrt(1 - a^2))
        const spinRadical = Math.sqrt(Math.max(0.0, 1.0 - this.spin * this.spin));
        this.horizonRadius = (this.schwarzschildRadius * 0.5) * (1.0 + spinRadical);

        // Límite de la Ergósfera: R_ergo = Rs (ecuatorial) y R+ (polar)
        this.ergosphereRadius = this.schwarzschildRadius;
        this.ergospherePolarRadius = this.horizonRadius;

        // Esfera de Fotones (Photon Sphere) prógrada de Kerr
        const phiPhoton = Math.acos(-this.spin);
        this.photonSphereRadius = (this.schwarzschildRadius * 0.5) * 2.0 * (1.0 + Math.cos((2.0 / 3.0) * phiPhoton));

        // Sombra Aparente (Black Hole Shadow Silhouette): R_shadow ≈ sqrt(27) * (Rs / 2) ≈ 2.598 * Rs
        this.shadowRadius = this.schwarzschildRadius * 2.598;

        // ==========================================
        // 4. ISCO EXACTO DE BARDEEN (1972)
        // ==========================================
        const a = this.spin;
        const z1 = 1.0 + Math.cbrt(1.0 - a * a) * (Math.cbrt(1.0 + a) + Math.cbrt(1.0 - a));
        const z2 = Math.sqrt(3.0 * a * a + z1 * z1);
        const iscoMultiplier = (3.0 + z2 - Math.sqrt(Math.max(0.0, (3.0 - z1) * (3.0 + z1 + 2.0 * z2))));
        this.iscoRadius = (this.schwarzschildRadius * 0.5) * iscoMultiplier;

        // ==========================================
        // 5. TASA DE ACRECIÓN Y ESTADOS DE ALIMENTACIÓN
        // ==========================================
        // Tasa de acreción en unidades de Eddington (ṁ = Ṁ / Ṁ_edd)
        this.accretionRate = config.accretionRate !== undefined ? config.accretionRate : seededRandom(this.lx, this.ly, this.lz, seed + 3);

        if (this.accretionRate < 0.01) {
            this.activityState = 'Durmiente';
            this.hasDisk = false;
            this.hasJets = false;
        } else if (this.accretionRate < 0.10) {
            this.activityState = 'Alimentación Lenta (ADAF)';
            this.hasDisk = true;
            this.hasJets = false;
        } else if (this.accretionRate <= 1.0) {
            this.activityState = 'Activo (Shakura-Sunyaev)';
            this.hasDisk = true;
            this.hasJets = false;
        } else {
            // Super-Eddington: Requiere espín alto para desatar mecanismo Blandford-Znajek
            const isQuasar = (this.spin >= 0.7);
            this.activityState = isQuasar ? 'Quásar (Relativista)' : 'Activo Super-Eddington';
            this.hasDisk = true;
            this.hasJets = isQuasar;
        }

        // ==========================================
        // 6. TERMODINÁMICA DEL DISCO (Novikov-Thorne)
        // ==========================================
        if (this.hasDisk) {
            // Límite exterior por auto-gravedad
            this.outerDiskRadius = this.iscoRadius + (this.schwarzschildRadius * 20.0 * Math.sqrt(this.accretionRate));

            // Temperatura pico del plasma en Kelvin (escala de rayos X térmicos)
            const baseTemp = 25000000; // 25 Millones K para masa estelar
            this.diskTemperature = (baseTemp / Math.pow(this.mass, 0.25)) * Math.pow(this.accretionRate, 0.25);
        } else {
            this.outerDiskRadius = 0;
            this.diskTemperature = 0;
        }

        // ==========================================
        // 7. JETS RELATIVISTAS (Mecanismo Blandford-Znajek)
        // ==========================================
        if (this.hasJets) {
            this.jetLength = this.schwarzschildRadius * (150.0 + 800.0 * (this.accretionRate - 0.8) * this.spin);
            this.jetRadius = this.schwarzschildRadius * 0.35;
        } else {
            this.jetLength = 0;
            this.jetRadius = 0;
        }

        // Escalas de rotación diferencial interna para los shaders
        this.timeOffset = seededRandom(this.lx, this.ly, this.lz, seed + 10) * 1000;
        this.innerOrbitSpeedC = Math.min(0.5, Math.sqrt(0.5 * this.schwarzschildRadius / this.iscoRadius)); // v/c
        this.innerTimeScale = 1.0 + (this.spin * 3.0);
    }

    /**
     * Calcula la temperatura analítica de plasma a un radio arbitrario r según Novikov-Thorne.
     * Incorpora blindaje defensivo para erradicar cualquier posibilidad de NaN en JS.
     * @param {number} r - Radio orbital medido desde el centro en unidades del motor.
     * @returns {number} Temperatura en Kelvin (0 si está dentro del ISCO o si es durmiente).
     */
    getTemperatureAtRadius(r) {
        if (!this.hasDisk || r <= this.iscoRadius) return 0.0;
        const ratio = this.iscoRadius / r;
        const factor1 = Math.pow(ratio, 0.75);
        const innerTerm = Math.max(0.0, 1.0 - Math.sqrt(ratio));
        const factor2 = Math.pow(innerTerm, 0.25);
        // 1.8 normaliza la curva al valor pico efectivo cerca de 1.36 R_isco
        return this.diskTemperature * factor1 * factor2 * 1.8;
    }

    /**
     * Altura de escala vertical gaussiana H(r) para discos delgados.
     * @param {number} r - Radio orbital.
     * @returns {number} Altura geométrica de la columna de plasma.
     */
    getScaleHeightAtRadius(r) {
        return 0.035 * r;
    }

    /**
     * Calcula la fuerza de marea gravitacional diferencial (Tidal Shear) sobre un objeto.
     * F_marea ∝ M / r^3
     * @param {number} distance - Distancia euclidiana a la anomalía.
     * @returns {number} Aceleración de marea diferencial.
     */
    getTidalForce(distance) {
        if (distance <= 0) return Infinity;
        return (this.mass * 1e12) / (distance * distance * distance);
    }

    update(dt) {
        super.update(dt);

        if (this.planets && this.planets.length > 0) {
            for (let planet of this.planets) {
                planet.update(dt, this.lx, this.ly, this.lz);
            }
        }
    }
}
