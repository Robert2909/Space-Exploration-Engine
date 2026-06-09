import { Config } from '../core/Config.js';

export function seededRandom(x, y, z, seed = 0) {
    let n = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719 + (seed + Config.UNIVERSE_SEED_OFFSET) * 1.234) * 43758.5453;
    return n - Math.floor(n);
}
