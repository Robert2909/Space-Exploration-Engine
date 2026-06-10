import { seededRandom } from '../../utils/MathUtils.js';

const GREEK_LETTERS = ['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon', 'Zeta', 'Eta', 'Theta', 'Iota', 'Kappa', 'Lambda', 'Mu', 'Nu', 'Xi', 'Omicron', 'Pi', 'Rho', 'Sigma', 'Tau', 'Upsilon', 'Phi', 'Chi', 'Psi', 'Omega'];
const CONSTELLATIONS = ['Andromeda', 'Aquila', 'Aries', 'Auriga', 'Bootes', 'Cancer', 'Canis', 'Carina', 'Cassiopeia', 'Centaurus', 'Cepheus', 'Cetus', 'Crux', 'Cygnus', 'Draco', 'Eridanus', 'Gemini', 'Hercules', 'Hydra', 'Leo', 'Libra', 'Lupus', 'Lyra', 'Monoceros', 'Ophiuchus', 'Orion', 'Pegasus', 'Perseus', 'Phoenix', 'Pisces', 'Sagittarius', 'Scorpius', 'Taurus', 'Ursa', 'Vela', 'Virgo'];
const CATALOGS = ['NGC', 'IC', 'M', 'HD', 'HR', 'Gliese', 'Kepler', 'KIC', 'TOI', 'TRAPPIST', 'WASP', 'CoRoT', 'LHS', 'Wolf', 'Ross', 'Luyten', 'Aegis', 'Vanguard', 'Zenith'];
const CONSONANTS = ['b', 'c', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'm', 'n', 'p', 'q', 'r', 's', 't', 'v', 'w', 'x', 'y', 'z', 'th', 'ph', 'sh', 'ch', 'kr', 'vl', 'zr', 'xar', 'zel', 'vor', 'kor', 'drax', 'vy'];
const VOWELS = ['a', 'e', 'i', 'o', 'u', 'y', 'ae', 'ei', 'ou', 'ia', 'io', 'ea', 'ua'];
const PLANET_LETTERS = ['b', 'c', 'd', 'e', 'f', 'g', 'h', 'i'];
const ROMAN_NUMERALS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
const SCI_FI_SUFFIXES = ['Prime', 'Secundus', 'Tertius', 'Major', 'Minor', 'Alpha', 'Beta', 'Garrison', 'Outpost', 'Station', 'Nexus', 'Haven', 'Sanctuary', 'Terminal', 'Core', 'Expanse', 'Proxima', 'Ultima', 'Abyss', 'Veritas'];
const SCI_FI_PREFIXES = ['New', 'Nova', 'Neo', 'Alt', 'Pro', 'Astro', 'Exo', 'Aether', 'Chronos', 'Hyper'];

export function generateProceduralName(seedBase, cx, cy, cz) {
    const syllablesCount = Math.floor(seededRandom(cx, cy, cz, seedBase) * 2) + 2;
    let name = '';
    for (let i = 0; i < syllablesCount; i++) {
        const c = CONSONANTS[Math.floor(seededRandom(cx, cy, cz, seedBase + i * 2) * CONSONANTS.length)];
        const v = VOWELS[Math.floor(seededRandom(cx, cy, cz, seedBase + i * 2 + 1) * VOWELS.length)];
        name += c + v;
    }
    name = name.charAt(0).toUpperCase() + name.slice(1);
    const hasPrefix = seededRandom(cx, cy, cz, seedBase + 5) > 0.85;
    if (hasPrefix) {
        const p = SCI_FI_PREFIXES[Math.floor(seededRandom(cx, cy, cz, seedBase + 6) * SCI_FI_PREFIXES.length)];
        name = p + ' ' + name;
    }
    return name;
}

export function generateStarName(seedBase, cx, cy, cz) {
    const formatType = seededRandom(cx, cy, cz, seedBase + 100);
    if (formatType < 0.3) {
        const cat = CATALOGS[Math.floor(seededRandom(cx, cy, cz, seedBase + 101) * CATALOGS.length)];
        const num = Math.floor(seededRandom(cx, cy, cz, seedBase + 102) * 9999) + 1;
        const separator = seededRandom(cx, cy, cz, seedBase + 103) > 0.5 ? '-' : ' ';
        return `${cat}${separator}${num}`;
    } else if (formatType < 0.6) {
        const greek = GREEK_LETTERS[Math.floor(seededRandom(cx, cy, cz, seedBase + 101) * GREEK_LETTERS.length)];
        const constell = CONSTELLATIONS[Math.floor(seededRandom(cx, cy, cz, seedBase + 102) * CONSTELLATIONS.length)];
        return `${greek} ${constell}`;
    } else {
        const procName = generateProceduralName(seedBase + 101, cx, cy, cz);
        const hasNumber = seededRandom(cx, cy, cz, seedBase + 102) > 0.7;
        if (hasNumber) {
            const num = Math.floor(seededRandom(cx, cy, cz, seedBase + 103) * 99) + 1;
            return `${procName} ${num}`;
        }
        return procName;
    }
}

export function generatePlanetName(starName, planetIndex, seedBase, cx, cy, cz) {
    const formatType = seededRandom(cx, cy, cz, seedBase + 200);
    if (formatType < 0.4) {
        const letter = PLANET_LETTERS[planetIndex % PLANET_LETTERS.length];
        return `${starName} ${letter}`;
    } else if (formatType < 0.7) {
        const roman = ROMAN_NUMERALS[planetIndex % ROMAN_NUMERALS.length];
        return `${starName} ${roman}`;
    } else {
        const suffix = SCI_FI_SUFFIXES[Math.floor(seededRandom(cx, cy, cz, seedBase + 201) * SCI_FI_SUFFIXES.length)];
        return `${starName} ${suffix}`;
    }
}
