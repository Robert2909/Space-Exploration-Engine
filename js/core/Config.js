export const Config = {
    // ==========================================
    // CÓDIGO GENÉTICO DEL UNIVERSO
    // ==========================================
    UNIVERSE_SEED_OFFSET: 2105,           // Cambia este número mágico (ej: 1337, 999) para generar un multiverso totalmente diferente

    // ==========================================
    // UNIVERSO Y GENERACIÓN PROCEDURAL
    // ==========================================
    UNIVERSE_CHUNK_SIZE: 10000000,         // Tamaño de un sector del espacio (u)
    STARS_PER_CHUNK: 300,              // Cantidad de estrellas decorativas (puntos) por sector
    SYSTEM_SPAWN_CHANCE: 0.5,          // Probabilidad (0.0 a 1.0) de que aparezcan planetas en un sector vacío
    MAX_SYSTEMS_PER_CHUNK: 20,          // Número máximo de sistemas solares por sector
    BLACK_HOLE_SPAWN_CHANCE: 0.005,    // Probabilidad de que un chunk contenga un agujero negro (aislado)

    // ==========================================
    // ASTROS Y SISTEMAS SOLARES
    // ==========================================
    STAR_RADIUS_MIN: 5000,               // Radio mínimo de la estrella principal
    STAR_RADIUS_MAX: 30000,              // Radio máximo de la estrella
    PLANETS_MAX_PER_SYSTEM: 4,         // Número máximo de planetas girando alrededor de una estrella
    GAS_GIANT_CHANCE: 0.2,             // Probabilidad de que un planeta sea gigante gaseoso (0.0 - 1.0)
    PLANET_ROCKY_RADIUS_MIN: 500,        // Radio mínimo de planeta rocoso
    PLANET_ROCKY_RADIUS_MAX: 4000,       // Radio máximo de planeta rocoso
    PLANET_GAS_RADIUS_MIN: 4000,         // Radio mínimo de planeta gaseoso
    PLANET_GAS_RADIUS_MAX: 10000,         // Radio máximo de planeta gaseoso
    PLANET_ORBIT_SPEED_MIN: 0.0005,      // Velocidad orbital mínima (Año muy largo)
    PLANET_ORBIT_SPEED_MAX: 0.008,       // Velocidad orbital máxima (Año corto, ~12 min)
    PLANET_ROTATION_SPEED_MIN: 0.005,    // Velocidad de rotación mínima (Día de ~20 minutos)
    PLANET_ROTATION_SPEED_MAX: 0.04,     // Velocidad de rotación máxima (Día rápido de ~2.5 minutos)
    ORBIT_DISTANCE_START: 15000,         // Distancia inicial mínima del primer planeta a su sol
    ORBIT_DISTANCE_SPACING: 8000,        // Espacio mínimo entre las órbitas de los planetas
    ORBIT_DISTANCE_VAR: 15000,           // Variación aleatoria del espacio entre órbitas
    STAR_BLUE_CHANCE: 0.15,            // Probabilidad (0-1) de que una estrella sea azul (muy caliente)
    STAR_RED_CHANCE: 0.30,             // Probabilidad (0-1) de que una estrella sea roja (fría)
    SUN_GLOW_SCALE: 4.5,               // Tamaño del halo de luz visual de las estrellas (1.0 = igual al planeta)

    // ==========================================
    // AGUJEROS NEGROS
    // ==========================================
    BLACK_HOLE_SIZE_MULT_NORMAL: 2.0,       // Variación de tamaño para agujeros negros normales (1.0 + X)
    BLACK_HOLE_ULTRA_MASSIVE_CHANCE: 0.1,  // Probabilidad de generar un ultramasivo (0.0 a 1.0)
    BLACK_HOLE_SIZE_MULT_ULTRA: 8.0,        // Tamaño extra para los ultramasivos
    BLACK_HOLE_SUPERMASSIVE_THRESHOLD: 4.0, // Multiplicador a partir del cual se gana el prefijo "Super Massive"
    BLACK_HOLE_BASE_RADIUS_VAR: 4.0,        // Variación del radio base antes de multiplicadores
    BLACK_HOLE_DISK_SCALE: 1.0,             // Escala de los discos de acreción
    BLACK_HOLE_JET_LENGTH: 120.0,           // Longitud del chorro relativista
    BLACK_HOLE_JET_WIDTH: 6.0,              // Ancho del chorro relativista
    BLACK_HOLE_PANIC_RANGE_MULT: 300.0,     // Rango de distorsión de cámara
    BLACK_HOLE_DEATH_RANGE_MULT: 1.5,       // Distancia para el evento de muerte
    BLACK_HOLE_MAX_GRAVITY_MULT: 0.15,      // Fuerza de atracción máxima
    BLACK_HOLE_PULL_RADIUS_MULT: 30.0,      // Alcance gravitatorio (n veces su tamaño)
    BLACK_HOLE_GRAVITY_STRENGTH: 50.0,      // Fuerza del empuje gravitacional (1/r^2)
    BLACK_HOLE_EVENT_HORIZON_MULT: 2.0,     // Fricción aplastante al cruzar esto
    BLACK_HOLE_PANIC_STRENGTH: 1,         // Multiplicador del efecto de pánico visual

    // ==========================================
    // RENDERIZADO Y MEMORIA DEL TERRENO
    // ==========================================
    TERRAIN_CHUNK_SIZE: 3000,             // Tamaño de cada bloque de terreno generado (En u métricas)
    TERRAIN_CHUNK_RESOLUTION: 64,         // Densidad de polígonos por chunk (Mayor = Terreno más suave pero más lag. 32=Bajo, 64=Normal, 128=Ultra)
    TERRAIN_RENDER_DISTANCE: 2,           // Distancia de render (1 = 3x3 chunks, 2 = 5x5 chunks)
    TERRAIN_TARDIS_SCALE: 10,             // Factor multiplicador del tamaño del planeta en tierra (Ilusión TARDIS)
    TERRAIN_FOG_FALLBACK: 0.00002,        // Niebla base en planetas sin atmósfera (Oculta el fin del mundo)
    TERRAIN_FOG_MULTIPLIER: 0.002,          // Escala el grosor de la atmósfera (0.2 = Más visibilidad a lo lejos)

    // ==========================================
    // FORMA Y RELIEVE DEL TERRENO (RUIDO FRACTAL PERLIN)
    TERRAIN_BASE_HEIGHT: 800,             // Altura máxima absoluta de montañas y valles (Recomendado: 800 a 1500)
    TERRAIN_BASE_FREQUENCY: 0.0005,       // Escala de estiramiento horizontal (Recomendado: 0.0005. Menor = colinas anchas, Mayor = picos estrechos)
    TERRAIN_BASE_OCTAVES: 4,              // Capas de detalle y rugosidad de roca (Recomendado: 4. Rango 1 a 5)
    TERRAIN_BASE_EXPONENT: 1.5,           // Aplanador de valles y alzador de picos (Recomendado: 1.5 a 2.0)

    // ==========================================
    // BIOMAS PLANETARIOS (DICCIONARIO DE DATOS MAESTRO)
    // ==========================================
    // Este registro reemplaza miles de if/else. Define las propiedades generativas de todos los tipos de planeta.
    PLANET_BIOMES: {
        'Ocean Planet': { chance: 0.10, atmoBase: 0.0003, atmoVar: 0.0002, hueBase: 0.55, hueVar: 0.10, sat: 0.8, lit: 0.30, terrainMods: { octavesAdd: -1, exponentMult: 0.8, heightMult: 0.4 }, aesthetics: { waterLevel: 0, waterColor: 0x1144aa, beachColor: 0xddccaa, beachBlend: 0.6 } },
        'Lava Planet': { chance: 0.10, atmoBase: 0.0004, atmoVar: 0.0000, hueBase: 0.00, hueVar: 0.10, sat: 0.9, lit: 0.40, terrainMods: { octavesAdd: 1, exponentMult: 1.3, heightMult: 1.5 }, aesthetics: { crackLevel: -100, crackColor: 0xff3300, baseLerpColor: 0x1a1a1a, baseLerp: 0.9 } },
        'Ice Planet': { chance: 0.10, atmoBase: 0.0001, atmoVar: 0.0002, hueBase: 0.50, hueVar: 0.10, sat: 0.4, lit: 0.80, terrainMods: { octavesAdd: -1, exponentMult: 0.7, heightMult: 0.6 }, aesthetics: { globalLerpColor: 0xffffff, globalLerpBase: 0.5, globalLerpLat: 0.5 } },
        'Crystal Planet': { chance: 0.05, atmoBase: 0.0000, atmoVar: 0.0000, useSystemHue: true, sat: 0.9, lit: 0.60, terrainMods: { octavesAdd: 0, exponentMult: 2.0, heightMult: 1.8 }, aesthetics: { invertLighting: true } },
        'Desert Planet': { chance: 0.15, atmoBase: 0.0002, atmoVar: 0.0001, hueBase: 0.10, hueVar: 0.05, sat: 0.6, lit: 0.60, terrainMods: { octavesAdd: -1, exponentMult: 0.9, heightMult: 0.7 }, aesthetics: { hasSand: true, sandColor: 0xddbb55, hasSnow: false } },
        'Toxic Planet': { chance: 0.05, atmoBase: 0.0005, atmoVar: 0.0003, hueBase: 0.30, hueVar: 0.10, sat: 0.8, lit: 0.40, terrainMods: { octavesAdd: 1, exponentMult: 1.5, heightMult: 0.8 }, aesthetics: { hasSand: true, sandColor: 0xddbb55, hasSnow: false } },
        'Jungle Planet': { chance: 0.05, atmoBase: 0.0002, atmoVar: 0.0002, hueBase: 0.35, hueVar: 0.10, sat: 0.7, lit: 0.25, terrainMods: { octavesAdd: 1, exponentMult: 1.1, heightMult: 1.2 }, aesthetics: { hasSand: true, sandColor: 0xddbb55, hasSnow: true } },
        'Barren Planet': { chance: 0.20, atmoBase: 0.0000, atmoVar: 0.0000, hueBase: 0.05, hueVar: 0.05, sat: 0.1, lit: 0.40, terrainMods: { octavesAdd: -2, exponentMult: 0.6, heightMult: 0.3 }, aesthetics: { hasSand: false, hasSnow: false } },
        // Rocky Planet es el comodín si no cae en ninguno de los anteriores
        'Rocky Planet': { chance: 0.00, atmoChance: 0.3, atmoBase: 0.00005, atmoVar: 0.00045, useSystemHue: true, satRandomBase: 0.2, satRandomMult: 0.4, litRandomBase: 0.2, litRandomMult: 0.5, terrainMods: { octavesAdd: 0, exponentMult: 1.0, heightMult: 1.0 }, aesthetics: { hasSand: true, sandColor: 0xddbb55, hasSnow: true } }
    },

    // ==========================================
    // FÍSICAS DE LA NAVE (JUGADOR)
    // ==========================================
    PLAYER_SPEED: 150000,                 // Velocidad base de vuelo (unidades por segundo)
    PLAYER_SPEED_SCROLL_MULT: 1.3,        // Multiplicador de velocidad por tic de la rueda del ratón (Exponencial)
    PLAYER_SPEED_MIN_STEP: 500,           // Velocidad mínima para arrancar desde cero con la rueda
    PLAYER_SPEED_MAX: 10000000,           // Límite de velocidad base para evitar romper la simulación física
    PLAYER_BOOST_MULTIPLIER: 30,          // Multiplicador de velocidad al presionar Shift (Hyperdrive)
    PLAYER_FRICTION: 0.985,               // Fricción en el espacio (1.0 = patinar infinito, 0.5 = freno brusco)
    PLAYER_BRAKE_FRICTION: 0.90,          // Fricción al presionar [ESPACIO] para frenar
    MOUSE_SENSITIVITY: 0.0015,            // Sensibilidad del giro de cámara con el ratón
    CINEMATIC_CAMERA_FRICTION: 0.97,      // Conservación de inercia del ratón en modo cinemático (1.0 = infinito)
    CINEMATIC_CAMERA_SENSITIVITY: 0.0001, // Sensibilidad reducida para el modo cinemático
    ROLL_SPEED: 2.0,                      // Velocidad máxima de alabeo (rotar en el eje Z con Q y E)

    // ==========================================
    // FÍSICAS DEL MODO TERRESTRE (JUGADOR)
    // ==========================================
    TERRAIN_PLAYER_SPEED: 15,             // Velocidad base al caminar (m/s)
    TERRAIN_PLAYER_SPRINT_MULT: 2.5,      // Multiplicador al correr con Shift
    TERRAIN_JUMP_FORCE: 12,               // Fuerza del salto inicial
    TERRAIN_BASE_GRAVITY: 25,             // Gravedad base (1G modificado por jugabilidad)
    TERRAIN_JETPACK_MAX_FUEL: 250,        // Capacidad máxima del jetpack
    TERRAIN_JETPACK_CONSUME: 35,          // Gasto de combustible por segundo
    TERRAIN_JETPACK_REFILL: 25,           // Recarga de combustible por segundo
    TERRAIN_MOUSE_SENSITIVITY: 0.0015,    // Sensibilidad de la vista en tierra

    // ==========================================
    // CONTROLES Y ATAJOS DE TECLADO (HOTKEYS)
    // ==========================================
    KEYS: {
        FORWARD: ['KeyW', 'ArrowUp'],
        BACKWARD: ['KeyS', 'ArrowDown'],
        LEFT: ['KeyA', 'ArrowLeft'],
        RIGHT: ['KeyD', 'ArrowRight'],
        ROLL_LEFT: ['KeyQ'],
        ROLL_RIGHT: ['KeyE'],
        BOOST: ['ShiftLeft', 'ShiftRight'],
        BRAKE: ['Space'],
        TARGET: ['KeyT'],
        AUTOPILOT: ['KeyJ'],
        TOGGLE_HUD: ['KeyH'],
        TOGGLE_LABELS: ['KeyL'],
        TOGGLE_CINEMATIC: ['KeyF'],
        TOGGLE_LANDING: ['Enter'],
        TOGGLE_FLASHLIGHT: ['KeyV']
    },

    // ==========================================
    // MOTOR GRÁFICO (RENDER & RENDIMIENTO)
    // ==========================================
    RENDER_FOV: 100,                   // Campo de visión de la cámara (Grados)
    RENDER_FAR_PLANE: 100000000,      // Límite visual de la cámara (1 billón de u para ver quásares)
    RENDER_LOGARITHMIC_DEPTH: true,    // Mantiene matemáticas estables a trillones de km sin romper la textura (Z-Fighting)
    RENDER_PIXEL_RATIO_MAX: 1.0,       // Límite de resolución para no quemar la gráfica (1.0 = rápido, 2.0 = nítido 4K)
    RENDER_FOG_BASE: 3,              // Densidad de la niebla estelar profunda
    RENDER_STAR_POINT_SIZE: 100,         // Tamaño de los puntos de luz estelares
    RENDER_ANTIALIAS: false,           // Suavizado de bordes (Apagar para +70% FPS)

    // ==========================================
    // SISTEMA DE IMPOSTORES (LOD PROFUNDO)
    // ==========================================
    IMPOSTOR_RENDER_DISTANCE_CHUNKS: 10, // A cuántos chunks de distancia buscamos anomalías para proyectar
    IMPOSTOR_UPDATE_INTERVAL: 1000,      // Cada cuántos milisegundos se actualizan los impostores

    // ==========================================
    // ILUMINACIÓN AMBIENTAL
    // ==========================================
    LIGHT_AMBIENT_COLOR: 0x222233,     // Color de la luz base que baña todo el espacio (Gris azulado oscuro)
    LIGHT_SUN_INTENSITY: 4,            // Fuerza con la que el Sol más cercano ilumina tus planetas
    LIGHT_SUN_DISTANCE: 2000000,         // Distancia a la que viaja la luz del Sol más cercano

    // ==========================================
    // INTERFAZ (HUD) Y ETIQUETAS
    // ==========================================
    UI_MAX_LABELS: 30,                 // Máximo de etiquetas de nombres mostrándose al mismo tiempo
    UI_LABEL_MAX_DISTANCE: 150000,        // Distancia máxima (u) a la que ves el nombre de un planeta/estrella

    // ==========================================
    // PILOTO AUTOMÁTICO Y CINEMÁTICAS
    // ==========================================
    AUTOPILOT_BRAKE_MULTIPLIER: 0.70,     // Desaceleración violenta por frame al llegar (Salto cuántico)
    AUTOPILOT_BRAKE_ZONE_MULT: 5,         // Multiplicador de radio para iniciar la frenada cuántica
    AUTOPILOT_ARRIVAL_MULT: 3.5,          // Multiplicador de radio para detenerse y orbitar (Cinemático FOV)
    CINEMATIC_ORBIT_SPEED: 0.15           // Velocidad (rad/s) de la órbita de cámara alrededor del objetivo

};
