import { seededRandom } from '../../utils/MathUtils.js';
import { Config } from '../../core/Config.js';

// === DICCIONARIOS AMPLIADOS ===
const GREEK_LETTERS = ['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon', 'Zeta', 'Eta', 'Theta', 'Iota', 'Kappa', 'Lambda', 'Mu', 'Nu', 'Xi', 'Omicron', 'Pi', 'Rho', 'Sigma', 'Tau', 'Upsilon', 'Phi', 'Chi', 'Psi', 'Omega'];
const CONSTELLATIONS = ['Andromeda', 'Antlia', 'Apus', 'Aquarius', 'Aquila', 'Ara', 'Aries', 'Auriga', 'Bootes', 'Caelum', 'Camelopardalis', 'Cancer', 'Canes Venatici', 'Canis Major', 'Canis Minor', 'Capricornus', 'Carina', 'Cassiopeia', 'Centaurus', 'Cepheus', 'Cetus', 'Chamaeleon', 'Circinus', 'Columba', 'Coma Berenices', 'Corona Australis', 'Corona Borealis', 'Corvus', 'Crater', 'Crux', 'Cygnus', 'Delphinus', 'Dorado', 'Draco', 'Equuleus', 'Eridanus', 'Fornax', 'Gemini', 'Grus', 'Hercules', 'Horologium', 'Hydra', 'Hydrus', 'Indus', 'Lacerta', 'Leo', 'Leo Minor', 'Lepus', 'Libra', 'Lupus', 'Lynx', 'Lyra', 'Mensa', 'Microscopium', 'Monoceros', 'Musca', 'Norma', 'Octans', 'Ophiuchus', 'Orion', 'Pavo', 'Pegasus', 'Perseus', 'Phoenix', 'Pictor', 'Pisces', 'Piscis Austrinus', 'Puppis', 'Pyxis', 'Reticulum', 'Sagitta', 'Sagittarius', 'Scorpius', 'Sculptor', 'Scutum', 'Serpens', 'Sextans', 'Taurus', 'Telescopium', 'Triangulum', 'Triangulum Australe', 'Tucana', 'Ursa Major', 'Ursa Minor', 'Vela', 'Virgo', 'Volans', 'Vulpecula'];
const CATALOGS = ['NGC', 'IC', 'M', 'HD', 'HR', 'Gliese', 'Kepler', 'KIC', 'TOI', 'TRAPPIST', 'WASP', 'CoRoT', 'LHS', 'Wolf', 'Ross', 'Luyten', 'Aegis', 'Vanguard', 'Zenith', 'K2', 'HAT', 'OGLE', 'MOA', 'EPIC', 'BD', 'CD', 'CPD', 'HIP', 'SAO', 'TYC', 'WDS', 'VDB', 'Barnard', 'Abell', 'Arp', 'UGC', 'PGC', 'SDSS', '2MASS', 'WISE', 'GAIA', 'LIGO', 'CHANDRA', 'XMM', 'SWIFT', 'FERMI', 'HESS', 'MAGIC', 'VERITAS', 'HAWC', 'LOFAR', 'VLA', 'ALMA', 'SMA', 'CARMA', 'NOEMA', 'IRAS', 'AKARI', 'Herschel', 'Planck', 'WMAP', 'COBE', 'SPITZER', 'HST', 'JWST', 'TESS', 'PLATO', 'ARIEL', 'LUVOIR', 'HabEx', 'OST', 'Lynx'];
const CONSONANTS = ['b', 'c', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'm', 'n', 'p', 'q', 'r', 's', 't', 'v', 'w', 'x', 'y', 'z', 'th', 'ph', 'sh', 'ch', 'kr', 'vl', 'zr', 'xar', 'zel', 'vor', 'kor', 'drax', 'vy', 'br', 'cr', 'dr', 'fr', 'gr', 'pr', 'tr', 'vr', 'bl', 'cl', 'fl', 'gl', 'pl', 'sl', 'sm', 'sn', 'sp', 'st', 'sw', 'zh', 'kh', 'gh', 'xh', 'vhr', 'thr', 'shr', 'zhr', 'khl', 'vhl', 'zhl', 'qhr', 'qhl', 'jhr', 'jhl', 'yh', 'wh', 'rh', 'lh', 'mh', 'nh', 'bh', 'dh', 'fh', 'jh', 'kh', 'lh', 'mh', 'nh', 'ph', 'qh', 'rh', 'sh', 'th', 'vh', 'wh', 'xh', 'yh', 'zh', 'str', 'skr', 'spr', 'spl', 'scl', 'scr', 'kth', 'vth', 'zth', 'xth', 'qth', 'jth', 'yth', 'wth', 'rth', 'lth', 'mth', 'nth', 'bth', 'dth', 'fth', 'gth', 'hth', 'kth', 'pth', 'sth', 'tth'];
const VOWELS = ['a', 'e', 'i', 'o', 'u', 'y', 'ae', 'ei', 'ou', 'ia', 'io', 'ea', 'ua', 'ai', 'au', 'eu', 'ie', 'oe', 'oi', 'oo', 'ee', 'aa', 'uu', 'ao', 'uo', 'ui', 'ue', 'eo', 'oa', 'aou', 'eia', 'iou', 'uoi', 'oea', 'aei', 'eio', 'oui', 'uoa', 'aeo', 'ieu', 'aey', 'eiy', 'ouy', 'iay', 'ioy', 'eay', 'uay', 'iyy', 'ayy', 'eyy', 'oyy', 'uyy'];
const SYLLABLES = ['tal', 'kor', 'zan', 'xer', 'vun', 'drak', 'bli', 'kar', 'mor', 'lun', 'sol', 'fen', 'gor', 'hal', 'jin', 'kav', 'lir', 'mun', 'nov', 'pol', 'qir', 'rav', 'sur', 'tav', 'val', 'wor', 'xil', 'yur', 'zav', 'thar', 'vral', 'kren', 'gorn', 'flen', 'drim', 'cral', 'bran', 'zorn', 'vark', 'al', 'el', 'il', 'ol', 'ul', 'am', 'em', 'im', 'om', 'um', 'an', 'en', 'in', 'on', 'un', 'ar', 'er', 'ir', 'or', 'ur', 'as', 'es', 'is', 'os', 'us', 'at', 'et', 'it', 'ot', 'ut', 'av', 'ev', 'iv', 'ov', 'uv', 'aw', 'ew', 'iw', 'ow', 'uw', 'ax', 'ex', 'ix', 'ox', 'ux', 'ay', 'ey', 'iy', 'oy', 'uy', 'az', 'ez', 'iz', 'oz', 'uz', 'ab', 'eb', 'ib', 'ob', 'ub', 'ac', 'ec', 'ic', 'oc', 'uc', 'ad', 'ed', 'id', 'od', 'ud', 'af', 'ef', 'if', 'of', 'uf', 'ag', 'eg', 'ig', 'og', 'ug', 'ah', 'eh', 'ih', 'oh', 'uh', 'aj', 'ej', 'ij', 'oj', 'uj', 'ak', 'ek', 'ik', 'ok', 'uk', 'ap', 'ep', 'ip', 'op', 'up', 'aq', 'eq', 'iq', 'oq', 'uq', 'bal', 'bel', 'bil', 'bol', 'bul', 'cam', 'cem', 'cim', 'com', 'cum', 'dan', 'den', 'din', 'don', 'dun', 'far', 'fer', 'fir', 'for', 'fur', 'gas', 'ges', 'gis', 'gos', 'gus', 'hat', 'het', 'hit', 'hot', 'hut', 'jav', 'jev', 'jiv', 'jov', 'juv', 'kaw', 'kew', 'kiw', 'kow', 'kuw', 'lax', 'lex', 'lix', 'lox', 'lux', 'may', 'mey', 'miy', 'moy', 'muy', 'naz', 'nez', 'niz', 'noz', 'nuz', 'pab', 'peb', 'pib', 'pob', 'pub', 'qac', 'qec', 'qic', 'qoc', 'quc', 'rad', 'red', 'rid', 'rod', 'rud', 'saf', 'sef', 'sif', 'sof', 'suf', 'tag', 'teg', 'tig', 'tog', 'tug', 'vah', 'veh', 'vih', 'voh', 'vuh', 'waj', 'wej', 'wij', 'woj', 'wuj', 'xak', 'xek', 'xik', 'xok', 'xuk', 'yap', 'yep', 'yip', 'yop', 'yup', 'zaq', 'zeq', 'ziq', 'zoq', 'zuq', 'krell', 'voss', 'jinn', 'garr', 'thur', 'vlox', 'zenth', 'kryt', 'xeno', 'lyra', 'pyro', 'cryo', 'aero', 'hydro', 'litho', 'bios', 'chron', 'tele', 'omni', 'poly', 'mono', 'duo', 'tri', 'tetra', 'penta', 'hexa', 'hepta', 'octa', 'nona', 'deca'];
const PLANET_LETTERS = ['b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z'];
const ROMAN_NUMERALS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX', 'XXI', 'XXII', 'XXIII', 'XXIV', 'XXV'];
const SCI_FI_SUFFIXES = ['Prime', 'Secundus', 'Tertius', 'Major', 'Minor', 'Alpha', 'Beta', 'Garrison', 'Outpost', 'Station', 'Nexus', 'Haven', 'Sanctuary', 'Terminal', 'Core', 'Expanse', 'Proxima', 'Ultima', 'Abyss', 'Veritas', 'Centauri', 'Borealis', 'Australis', 'Eridani', 'Ceti', 'Cygni', 'Draconis', 'Lyrae', 'Pegasi', 'Persei', 'Sirius', 'Orionis', 'Tauri', 'Leonis', 'Virginis', 'Scorpii', 'Sagittarii', 'Capricorni', 'Aquarii', 'Piscium', 'Arietis', 'Geminorum', 'Cancri', 'Librae', 'Ophiuchi', 'Herculis', 'Bootis', 'Ursae', 'Cassiopeiae', 'Cephei', 'Persei', 'Aurigae', 'Canis', 'Hydrae', 'Eridani', 'Ceti', 'Puppis', 'Velae', 'Carinae', 'Crucis', 'Centauri', 'Lupi', 'Arae', 'Coronae', 'Serpentis', 'Scuti', 'Aquilae', 'Delphini', 'Equulei', 'Pegasi', 'Andromedae', 'Trianguli', 'Arietis', 'Tauri', 'Aurigae', 'Orionis', 'Canis', 'Geminorum', 'Cancri', 'Leonis', 'Comae', 'Bootis', 'Coronae', 'Herculis', 'Lyrae', 'Cygni', 'Vulpeculae', 'Sagittae', 'Aquilae', 'Ophiuchi', 'Serpentis', 'Scuti', 'Sagittarii', 'Scorpii', 'Lupi', 'Centauri', 'Crucis', 'Muscae', 'Chamaeleontis', 'Apidis', 'Octantis', 'Pavonis', 'Indi', 'Gruis', 'Tucanae', 'Phoenicis', 'Eridani', 'Horologii', 'Reticuli', 'Caelum', 'Pictoris', 'Mensa', 'Volantis', 'Carinae', 'Velae', 'Puppis', 'Pyxidis', 'Antliae', 'Hydrae', 'Crateris', 'Corvi', 'Virginis', 'Librae', 'Centauri', 'Lupi', 'Normae', 'Arae', 'Coronae', 'Telescopii', 'Microscopii', 'Piscis', 'Aquarii', 'Capricorni', 'Sagittarii', 'Scorpii', 'Ophiuchi', 'Serpentis', 'Scuti', 'Aquilae', 'Delphini', 'Equulei', 'Pegasi', 'Andromedae', 'Trianguli', 'Arietis', 'Tauri', 'Aurigae', 'Orionis', 'Canis', 'Geminorum', 'Cancri', 'Leonis', 'Comae', 'Bootis', 'Coronae', 'Herculis', 'Lyrae', 'Cygni', 'Vulpeculae', 'Sagittae', 'Aquilae', 'Ophiuchi', 'Serpentis', 'Scuti', 'Sagittarii', 'Scorpii', 'Lupi', 'Centauri', 'Crucis', 'Muscae', 'Chamaeleontis', 'Apidis', 'Octantis', 'Pavonis', 'Indi', 'Gruis', 'Tucanae', 'Phoenicis', 'Eridani', 'Horologii', 'Reticuli', 'Caelum', 'Pictoris', 'Mensa', 'Volantis', 'Carinae', 'Velae', 'Puppis', 'Pyxidis', 'Antliae', 'Hydrae', 'Crateris', 'Corvi', 'Virginis', 'Librae', 'Centauri', 'Lupi', 'Normae', 'Arae', 'Coronae', 'Telescopii', 'Microscopii', 'Piscis', 'Aquarii', 'Capricorni', 'Sagittarii', 'Scorpii', 'Ophiuchi', 'Serpentis', 'Scuti', 'Aquilae', 'Delphini', 'Equulei', 'Pegasi', 'Andromedae', 'Trianguli', 'Arietis', 'Tauri', 'Aurigae', 'Orionis', 'Canis', 'Geminorum', 'Cancri', 'Leonis', 'Comae', 'Bootis', 'Coronae', 'Herculis', 'Lyrae', 'Cygni', 'Vulpeculae', 'Sagittae', 'Aquilae', 'Ophiuchi', 'Serpentis', 'Scuti', 'Sagittarii', 'Scorpii', 'Lupi', 'Centauri', 'Crucis', 'Muscae', 'Chamaeleontis', 'Apidis', 'Octantis', 'Pavonis', 'Indi', 'Gruis', 'Tucanae', 'Phoenicis', 'Eridani', 'Horologii', 'Reticuli', 'Caelum', 'Pictoris', 'Mensa', 'Volantis', 'Carinae', 'Velae', 'Puppis', 'Pyxidis', 'Antliae', 'Hydrae', 'Crateris', 'Corvi', 'Virginis', 'Librae', 'Centauri', 'Lupi', 'Normae', 'Arae', 'Coronae', 'Telescopii', 'Microscopii', 'Piscis', 'Aquarii'];
const SCI_FI_PREFIXES = ['New', 'Nova', 'Neo', 'Alt', 'Pro', 'Astro', 'Exo', 'Aether', 'Chronos', 'Hyper', 'Ultra', 'Proto', 'Eos', 'Helios', 'Nyx', 'Sol', 'Luna', 'Terra', 'Ares', 'Hera', 'Zeus', 'Apollo', 'Artemis', 'Athena', 'Demeter', 'Dionysus', 'Hades', 'Hephaestus', 'Hermes', 'Hestia', 'Poseidon', 'Aphrodite', 'Aether', 'Chaos', 'Erebus', 'Gaia', 'Hemera', 'Nyx', 'Tartarus', 'Uranus', 'Pontus', 'Ourea', 'Nesoi', 'Thalassa', 'Ananke', 'Chronos', 'Phanes', 'Eros', 'Phobos', 'Deimos', 'Enyo', 'Eris', 'Hebe', 'Ilithyia', 'Iris', 'Leto', 'Morpheus', 'Nemesis', 'Nike', 'Paean', 'Pan', 'Selene', 'Thanatos', 'Tyche', 'Zelus', 'Aletheia', 'Ate', 'Bia', 'Cratus', 'Deimos', 'Enyo', 'Eris', 'Geras', 'Harmonia', 'Hebe', 'Hymen', 'Hypnos', 'Keres', 'Lethe', 'Limus', 'Makhai', 'Momus', 'Moros', 'Nemesis', 'Oizys', 'Oneiroi', 'Phthonus', 'Ponus', 'Pseudologoi', 'Sophia', 'Soter', 'Thanatos', 'Tyche', 'Zelus', 'Aegis', 'Vanguard', 'Zenith', 'Apex', 'Pinnacle', 'Summit', 'Crest', 'Crown', 'Vertex', 'Acme', 'Apogee', 'Culmination', 'Meridian', 'Zenith', 'Nadir', 'Base', 'Foundation', 'Root', 'Core', 'Heart', 'Center', 'Focus', 'Hub', 'Nucleus', 'Origin', 'Source', 'Spring', 'Well', 'Fount', 'Matrix', 'Womb', 'Cradle', 'Seed', 'Germ', 'Spore', 'Embryo', 'Zygote', 'Fetus', 'Infant', 'Child', 'Youth', 'Adolescent', 'Adult', 'Elder', 'Senior', 'Veteran', 'Ancient', 'Antique', 'Relic', 'Fossil', 'Ruins', 'Remnant', 'Vestige', 'Trace', 'Echo', 'Shadow', 'Ghost', 'Phantom', 'Specter', 'Spirit', 'Soul', 'Mind', 'Thought', 'Idea', 'Concept', 'Notion', 'Belief', 'Faith', 'Hope', 'Dream', 'Vision', 'Mirage', 'Illusion', 'Delusion', 'Hallucination', 'Fantasy', 'Myth', 'Legend', 'Lore', 'Tale', 'Story', 'Saga', 'Epic', 'Poem', 'Song', 'Hymn', 'Ode', 'Chant', 'Mantra', 'Prayer', 'Spell', 'Charm', 'Curse', 'Hex', 'Jinx', 'Blight', 'Plague', 'Pestilence', 'Famine', 'Drought', 'Flood', 'Storm', 'Tempest', 'Hurricane', 'Cyclone', 'Typhoon', 'Tornado', 'Whirlwind', 'Maelstrom', 'Vortex', 'Eddy', 'Current', 'Tide', 'Wave', 'Surf', 'Swell', 'Ripple', 'Drop', 'Splash', 'Spray', 'Mist', 'Fog', 'Haze', 'Smog', 'Smoke', 'Fume', 'Vapor', 'Gas', 'Air', 'Wind', 'Breeze', 'Gale', 'Zephyr', 'Aura', 'Halo', 'Corona', 'Nimbus', 'Aureole', 'Glory', 'Radiance', 'Luminescence', 'Phosphorescence', 'Fluorescence', 'Incandescence', 'Glow', 'Shine', 'Gleam', 'Glimmer', 'Sparkle', 'Twinkle', 'Flicker', 'Flash', 'Flare', 'Blaze', 'Flame', 'Fire', 'Inferno', 'Conflagration', 'Holocaust', 'Ash', 'Cinder', 'Ember', 'Spark', 'Cinder', 'Soot', 'Dust', 'Dirt', 'Soil', 'Earth', 'Mud', 'Clay', 'Sand', 'Gravel', 'Rock', 'Stone', 'Pebble', 'Boulder', 'Crag', 'Cliff', 'Bluff', 'Peak', 'Summit', 'Ridge', 'Crest', 'Spur', 'Promontory', 'Cape', 'Headland', 'Peninsula', 'Isthmus', 'Island', 'Islet', 'Reef', 'Shoal', 'Bank', 'Bar', 'Spit', 'Beach', 'Coast', 'Shore', 'Strand', 'Bank', 'Edge', 'Brink', 'Verge', 'Margin', 'Border', 'Boundary', 'Limit', 'End', 'Terminus', 'Finish', 'Close', 'Stop', 'Halt', 'Pause', 'Break', 'Rest', 'Sleep', 'Slumber', 'Dream', 'Trance', 'Coma', 'Death', 'Demise', 'Doom', 'Fate', 'Destiny', 'Lot', 'Portion', 'Share', 'Part', 'Piece', 'Fraction', 'Fragment', 'Shard', 'Splinter', 'Chip', 'Flake', 'Morsel', 'Crumb', 'Speck', 'Mote', 'Atom', 'Molecule', 'Particle', 'Quark', 'Lepton', 'Boson', 'Fermion', 'Hadron', 'Meson', 'Baryon', 'Nucleon', 'Proton', 'Neutron', 'Electron', 'Positron', 'Neutrino', 'Photon', 'Gluon', 'W', 'Z', 'Higgs', 'Graviton', 'Tachyon', 'Chronon', 'Magnon', 'Phonon', 'Plasmon', 'Polariton', 'Exciton', 'Pion', 'Kaon', 'Hyperon', 'Omega', 'Delta', 'Sigma', 'Xi', 'Lambda', 'Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon', 'Zeta', 'Eta', 'Theta', 'Iota', 'Kappa', 'Lambda', 'Mu', 'Nu', 'Xi', 'Omicron', 'Pi', 'Rho', 'Sigma', 'Tau', 'Upsilon', 'Phi', 'Chi', 'Psi', 'Omega'];

// Función auxiliar para obtener un índice seguro y bien distribuido usando números primos
function getUniformIndex(cx, cy, cz, baseSeed, primeMultiplier, arrayLength) {
    // Usamos el primeMultiplier para saltar en el hash, evitando aglomeración en el centro
    const hash = seededRandom(cx, cy, cz, baseSeed * primeMultiplier);
    return Math.floor(hash * arrayLength);
}

export function generateProceduralName(seedBase, cx, cy, cz) {
    const syllablesCount = Math.floor(seededRandom(cx, cy, cz, seedBase * 13) * 3) + 2; // 2 a 4 sílabas
    let name = '';
    for (let i = 0; i < syllablesCount; i++) {
        const useSyllable = seededRandom(cx, cy, cz, seedBase * 17 + i * 19) > 0.6;
        if (useSyllable) {
            name += SYLLABLES[getUniformIndex(cx, cy, cz, seedBase + i, 23, SYLLABLES.length)];
        } else {
            const c = CONSONANTS[getUniformIndex(cx, cy, cz, seedBase + i, 29, CONSONANTS.length)];
            const v = VOWELS[getUniformIndex(cx, cy, cz, seedBase + i, 31, VOWELS.length)];
            name += c + v;
        }
    }
    name = name.charAt(0).toUpperCase() + name.slice(1);
    const hasPrefix = seededRandom(cx, cy, cz, seedBase * 37) > 0.85;
    if (hasPrefix) {
        const p = SCI_FI_PREFIXES[getUniformIndex(cx, cy, cz, seedBase, 41, SCI_FI_PREFIXES.length)];
        name = p + ' ' + name;
    }
    return name;
}

export function generateStarName(seedBase, cx, cy, cz) {
    const formatType = seededRandom(cx, cy, cz, seedBase * 43);
    if (formatType < 0.3) {
        const cat = CATALOGS[getUniformIndex(cx, cy, cz, seedBase, 47, CATALOGS.length)];
        const num = Math.floor(seededRandom(cx, cy, cz, seedBase * 53) * 9999) + 1;
        const separator = seededRandom(cx, cy, cz, seedBase * 59) > 0.5 ? '-' : ' ';
        return `${cat}${separator}${num}`;
    } else if (formatType < 0.6) {
        const greek = GREEK_LETTERS[getUniformIndex(cx, cy, cz, seedBase, 61, GREEK_LETTERS.length)];
        const constell = CONSTELLATIONS[getUniformIndex(cx, cy, cz, seedBase, 67, CONSTELLATIONS.length)];
        return `${greek} ${constell}`;
    } else {
        const procName = generateProceduralName(seedBase + 101, cx, cy, cz);
        const hasNumber = seededRandom(cx, cy, cz, seedBase * 71) > 0.7;
        if (hasNumber) {
            const num = Math.floor(seededRandom(cx, cy, cz, seedBase * 73) * 999) + 1;
            return `${procName} ${num}`;
        }
        return procName;
    }
}

export function generatePlanetName(starName, planetIndex, seedBase, cx, cy, cz, existingNames = []) {
    let name = '';
    let attempts = 0;
    do {
        const formatType = seededRandom(cx, cy, cz, (seedBase + 200 + attempts) * 79);
        if (formatType < 0.4) {
            const letter = PLANET_LETTERS[(planetIndex + attempts) % PLANET_LETTERS.length];
            name = `${starName} ${letter}`;
        } else if (formatType < 0.7) {
            const roman = ROMAN_NUMERALS[(planetIndex + attempts) % ROMAN_NUMERALS.length];
            name = `${starName} ${roman}`;
        } else {
            const suffix = SCI_FI_SUFFIXES[getUniformIndex(cx, cy, cz, seedBase + attempts, 83, SCI_FI_SUFFIXES.length)];
            name = `${starName} ${suffix}`;
        }
        attempts++;
    } while (existingNames.includes(name));

    return name;
}

export function generateBlackHoleName(seedBase, cx, cy, cz, isUltraMassive) {
    const bhPrefixes = [
        'Leviathan', 'Abyss', 'Void', 'Jaws', 'Devourer', 'Singularity', 'Erebus',
        'Vortex', 'Horizon', 'Tartarus', 'Collapse', 'Maelstrom', 'Cenotaph', 'Gehenna',
        'Ruin', 'Oblivion', 'Dark Genesis', 'Enigma', 'Tyrant', 'Demolition',
        'Supreme', 'Macro', 'Prime', 'Ultimate', 'Titan', 'Mega', 'Final', 'Morgoth', 'Sauron', 'Melkor',
        'Surtur', 'Shiva', 'Zeus', 'Odin', 'Ragnarok', 'Doomsday', 'Apocalypse', 'Extinction', 'Oblivion',
        'Inferno', 'Purgatory', 'Hellfire', 'Nether', 'Abaddon', 'Moloch', 'Belial', 'Asmodeus', 'Beelzebub',
        'Lucifer', 'Samael', 'Mammon', 'Rahab', 'Tiamat', 'Set', 'Typhon', 'Fenrir', 'Jormungandr',
        'Cerberus', 'Charon', 'Hades', 'Pluto', 'Orcus', 'Nyx', 'Thanatos', 'Hypnos', 'Morpheus',
        'Grief', 'Baal', 'Astaroth', 'Zagan', 'Agares', 'Valac', 'Marbas', 'Furfur',
        'Barbatos', 'Bifrons', 'Bael', 'Vepar', 'Zepar', 'Terminal', 'Nexus', 'Havoc', 'Fury',
        'TON', 'Gargantua', 'Terminus', 'Annihilation', 'Entropy', 'Null', 'Zero', 'Chasm', 'Maw', 'Rift',
        'Tear', 'Rupture', 'Silence', 'Obscurity', 'Penrose', 'Schwarzschild', 'Kerr', 'Ergosphere', 'Monolith',
        'Behemoth', 'Colossus', 'Juggernaut', 'Goliath', 'Ouroboros', 'Apep', 'Cthulhu', 'Azathoth', 'Nyarlathotep',
        'Yog-Sothoth', 'Shub-Niggurath', 'Dagon', 'Nidhogg', 'Hel', 'Xibalba', 'Mictlan', 'Kur', 'Duat', 'Sheol',
        'Naraka', 'Diyu', 'Yomi', 'Ahriman', 'Erlik', 'Chernobog', 'Veles', 'Balor', 'Crom Cruach', 'Kingu', 'Apophis',
        'Nemesis', 'Erebos', 'Acheron', 'Styx', 'Phlegethon', 'Cocytus', 'Lethe', 'Keres', 'Moros', 'Geras', 'Oizys',
        'Apate', 'Eris', 'Lyssa', 'Makhai', 'Hysminai', 'Androktasiai', 'Phonoi', 'Limus', 'Aponoia', 'Dolos',
        'Golgotha', 'Aceldama', 'Tophet', 'Jahannam', 'Avici', 'Niflheim', 'Muspelheim', 'Ginnungagap', 'Amenti',
        'Irkalla', 'Xibalba', 'Guinee', 'Patala', 'Mictlan', 'Yomi-no-kuni', 'Nehalennia', 'Cailleach', 'Morrigan',
        'Banshee', 'Dullahan', 'Wendigo', 'Skinwalker', 'Chupacabra', 'Mothman', 'Kraken', 'Scylla', 'Charybdis',
        'Minotaur', 'Gorgon', 'Chimera', 'Hydra', 'Echidna', 'Typhon', 'Sphinx', 'Harpy', 'Siren', 'Cyclops',
        'Hekatonkheires', 'Empusa', 'Lamia', 'Mormo', 'Strigoi', 'Vampire', 'Ghoul', 'Zombie', 'Lich', 'Wraith',
        'Specter', 'Phantom', 'Ghost', 'Poltergeist', 'Banshee', 'Revenant', 'Wight', 'Barrow-wight', 'Nazgul',
        'Dementor', 'Boggart', 'Balrog', 'Diablo', 'Mephisto', 'Baal', 'Azmodan', 'Belial', 'Duriel', 'Andariel',
        'Lilith', 'Inarius', 'Malthael', 'Tyrael', 'Imperius', 'Auriel', 'Itherael', 'Diablo', 'Lucion', 'Lilith'
    ];

    const realSciFiPrefixes = [
        'NGC ', 'Cygnus X-', 'Sgr A*', 'Messier ', 'V404 ', 'GRO J', 'Quasar ', 'Omega ', 'Epsilon Void ',
        'M87*', 'Holmberg 15A', 'OJ 287', 'APM 08279', 'S5 0014+', 'MAXI J', 'XTE J', 'GRS ', 'Swift J', 'IGR J',
        'HLX-1', 'ESO 243-49', 'M82 X-', 'Centaurus A*', 'Sombrero', 'Fornax A*', 'Virgo A*', 'Perseus A*',
        'Hercules A*', 'Cygnus A*', 'Cassiopeia A*', 'Taurus A*', 'Puppis A*', 'Vela X-', 'Crab', 'Tycho', 'Kepler',
        'SN 1987A', 'SN 1006', 'SN 1572', 'SN 1604', 'LMC X-', 'SMC X-', 'Circinus X-', 'Norma X-', 'Scorpius X-',
        'Sagittarius X-', 'Aquila X-', 'Vulpecula X-', 'Hercules X-', 'Draco X-', 'Ursa Major X-', 'Ursa Minor X-',
        'Bootes X-', 'Corona Borealis X-', 'Serpens X-', 'Ophiuchus X-', 'Lyra X-', 'Cygnus X-', 'Pegasus X-',
        'Andromeda X-', 'Triangulum X-', 'Aries X-', 'Taurus X-', 'Auriga X-', 'Orion X-', 'Canis Major X-',
        'Gemini X-', 'Cancer X-', 'Leo X-', 'Virgo X-', 'Libra X-', 'Centaurus X-', 'Crux X-', 'Carina X-',
        'Vela X-', 'Puppis X-', 'Hydra X-', 'Eridanus X-', 'Cetus X-', 'Pisces X-', 'Aquarius X-', 'Capricornus X-',
        'Piscis Austrinus X-', 'Grus X-', 'Tucana X-', 'Phoenix X-', 'Fornax X-', 'Dorado X-', 'Mensa X-',
        'Chamaeleon X-', 'Apus X-', 'Octans X-', 'Pavo X-', 'Indus X-', 'Microscopium X-', 'Telescopium X-',
        'Corona Australis X-', 'Ara X-', 'Norma X-', 'Circinus X-', 'Musca X-', 'Crux X-', 'Centaurus X-',
        'Lupus X-', 'Scorpius X-', 'Ophiuchus X-', 'Sagittarius X-', 'Scutum X-', 'Aquila X-', 'Sagitta X-',
        'Vulpecula X-', 'Cygnus X-', 'Lyra X-', 'Hercules X-', 'Bootes X-', 'Coma Berenices X-', 'Canes Venatici X-',
        'Ursa Major X-', 'Lynx X-', 'Camelopardalis X-', 'Cassiopeia X-', 'Cepheus X-', 'Draco X-', 'Ursa Minor X-'
    ];

    const allPrefixes = [...bhPrefixes, ...realSciFiPrefixes];

    let bhName = allPrefixes[getUniformIndex(cx, cy, cz, seedBase, 89, allPrefixes.length)];

    if (!bhName.endsWith(' ') && !bhName.endsWith('-') && !bhName.endsWith('*')) {
        bhName += ' ';
    }

    // El número principal del astro (0 a 9999)
    const number = Math.floor(seededRandom(cx, cy, cz, seedBase * 101) * 10000);

    // Letra de sufijo opcional
    let suffix = '';
    const hasSuffix = seededRandom(cx, cy, cz, seedBase * 107) > 0.5; // 50% de probabilidad de no tener letra
    if (hasSuffix) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        suffix = chars[getUniformIndex(cx, cy, cz, seedBase, 97, chars.length)];
    }

    let finalName = bhName + number + suffix;

    // Easter Egg forzado estadísticamente por diversión: 
    // Si genera "TON " y casualmente el número es "618", borramos el prefijo Supermassive para que quede perfecto.
    if (isUltraMassive && finalName !== 'TON 618') {
        const massivePrefixes = ['Supermassive ', 'Ultramassive ', 'Hypermassive ', 'Gargantuan ', 'Titanic ', 'Colossal ', 'Primordial '];
        finalName = massivePrefixes[getUniformIndex(cx, cy, cz, seedBase, 103, massivePrefixes.length)] + finalName;
    }
    return finalName;
}
