import { CelestialBody } from './CelestialBody.js';
import { seededRandom } from '../../utils/MathUtils.js';
import { Config } from '../../core/Config.js';

export class BlackHole extends CelestialBody {
    constructor(config) {
        super(config);
        this.type = 'Agujero Negro'; // Para que SpaceState.js sepa que no se puede aterrizar
        this.group = 'BlackHole';

        this.icon = Config.BLACK_HOLE_ICON;
        this.colorString = Config.BLACK_HOLE_COLOR;

        // Fase 3 preparación: Soportaremos planetas muertos orbitando
        this.planets = config.planets || [];

        const seed = Math.abs(this.lx * 738 + this.ly * 19 + this.lz * 88);

        // ==========================================
        // FASE 1: PIPELINE FÍSICO Y MATEMÁTICO
        // ==========================================

        // 1. MASA BASE ($M_\odot$)
        const massRng = seededRandom(this.lx, this.ly, this.lz, seed);
        if (config.mass) {
            this.mass = config.mass;
        } else if (config.isUltraMassive) {
            this.mass = 1e9 + seededRandom(this.lx, this.ly, this.lz, seed + 1) * 1e10; // Titán
        } else if (massRng > 0.95) {
            this.mass = 1e5 + seededRandom(this.lx, this.ly, this.lz, seed + 1) * 1e8; // Supermasivo
        } else if (massRng > 0.8) {
            this.mass = 100 + seededRandom(this.lx, this.ly, this.lz, seed + 1) * 1e5; // Intermedio
        } else {
            this.mass = 3 + seededRandom(this.lx, this.ly, this.lz, seed + 1) * 97; // Estelar
        }

        if (this.mass > 1e9) this.subType = 'Hipermasivo (Titán)';
        else if (this.mass > 1e5) this.subType = 'Supermasivo (SMBH)';
        else if (this.mass > 100) this.subType = 'Masa Intermedia';
        else this.subType = 'Masa Estelar';

        // 2. RADIO DE SCHWARZSCHILD (Rs)
        // Escalado visualmente para que sean verdaderos "Titanes del abismo cósmico"
        // Estelares (~5,000 a 15,000), Supermasivos (~500,000), Hipermasivos (~20,000,000)
        const RS_MULTIPLIER = 2000;
        this.radius = Math.max(5000, Math.pow(this.mass, 0.4) * RS_MULTIPLIER);
        this.schwarzschildRadius = this.radius;

        // 3. ESPÍN / MOMENTO ANGULAR (a) [0.0 - 1.0]
        this.spin = seededRandom(this.lx, this.ly, this.lz, seed + 2);

        // Límite de la Ergósfera (Cálculo simplificado ecuatorial)
        this.ergosphereRadius = this.schwarzschildRadius * (1 + Math.sqrt(1 - this.spin * this.spin));

        // 4. TASA DE ACRECIÓN [0.0 - 1.0]
        this.accretionRate = seededRandom(this.lx, this.ly, this.lz, seed + 3);

        if (this.accretionRate < 0.05) {
            this.activityState = 'Durmiente';
            this.hasDisk = false;
            this.hasJets = false;
        } else if (this.accretionRate < 0.5) {
            this.activityState = 'Alimentación Lenta';
            this.hasDisk = true;
            this.hasJets = false;
        } else if (this.accretionRate < 0.8) {
            this.activityState = 'Activo';
            this.hasDisk = true;
            this.hasJets = false;
        } else {
            this.activityState = (this.spin > 0.7) ? 'Quásar' : 'Activo (Sin Jets)';
            this.hasDisk = true;
            this.hasJets = (this.spin > 0.7);
        }

        // Asignar timeOffset para los Shaders que usan uTime
        this.timeOffset = seededRandom(this.lx, this.ly, this.lz, seed + 10) * 1000;

        // 5. ISCO (Innermost Stable Circular Orbit)
        const iscoFactor = 3.0 - (this.spin * 2.5); // Aproximación lineal: Spin 0 -> 3 Rs, Spin 1 -> 0.5 Rs
        this.iscoRadius = this.schwarzschildRadius * iscoFactor;

        // 6. TEMPERATURA DEL DISCO (Millones de Kelvin)
        if (this.hasDisk) {
            const baseTemp = 10000000; // 10 Millones K para masa estelar
            this.diskTemperature = (baseTemp / Math.pow(this.mass, 0.33)) * this.accretionRate;
        } else {
            this.diskTemperature = 0;
        }

        // Orientación aleatoria del sistema y disco en el espacio
        this.inclinationX = seededRandom(this.lx, this.ly, this.lz, seed + 4) * Math.PI * 2;
        this.inclinationY = seededRandom(this.lx, this.ly, this.lz, seed + 5) * Math.PI * 2;
        this.inclinationZ = seededRandom(this.lx, this.ly, this.lz, seed + 6) * Math.PI * 2;

        // Eliminamos toda dependencia de THREE.js, mallas y materiales.
        // EDSSM Fase 1 Completada.
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
