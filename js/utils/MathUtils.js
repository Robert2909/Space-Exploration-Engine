import { Config } from '../core/Config.js';

export function seededRandom(x, y, z, seed = 0) {
    let n = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719 + (seed + Config.UNIVERSE_SEED_OFFSET) * 1.234) * 43758.5453;
    return n - Math.floor(n);
}

export function starColorFromTemp(temp) {
    let tempScale = temp / 100.0;
    let r, g, b;

    if (tempScale <= 66) {
        r = 255;
        g = tempScale;
        g = 99.4708025861 * Math.log(g) - 161.1195681661;
        if (tempScale <= 19) {
            b = 0;
        } else {
            b = tempScale - 10;
            b = 138.5177312231 * Math.log(b) - 305.0447927307;
        }
    } else {
        r = tempScale - 60;
        r = 329.698727446 * Math.pow(r, -0.1332047592);
        g = tempScale - 60;
        g = 288.1221695283 * Math.pow(g, -0.0755148492);
        b = 255;
    }

    r = Math.min(255, Math.max(0, r)) / 255;
    g = Math.min(255, Math.max(0, g)) / 255;
    b = Math.min(255, Math.max(0, b)) / 255;

    return { r, g, b };
}
