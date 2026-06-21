export const Config = {
    // ==========================================
    // CÓDIGO GENÉTICO DEL UNIVERSO
    // ==========================================
    UNIVERSE_SEED_OFFSET: 1,           // Cambia este número mágico (ej: 1337, 999) para generar un multiverso totalmente diferente

    // ==========================================
    // UNIVERSO Y GENERACIÓN PROCEDURAL
    // ==========================================
    UNIVERSE_CHUNK_SIZE: 10000000,         // Tamaño de un sector del espacio (u)
    STARS_PER_CHUNK: 200,              // Cantidad de estrellas decorativas (puntos) por sector
    SYSTEM_SPAWN_CHANCE: 0.5,            // Probabilidad (0.0 a 1.0) de que aparezcan planetas en un sector vacío
    MAX_SYSTEMS_PER_CHUNK: 2,             // Número máximo de sistemas solares por sector
    BINARY_STAR_CHANCE: 0.01,             // Probabilidad de que un sistema sea binario
    ASTEROID_BELT_CHANCE: 0.30,           // Probabilidad de que un sistema tenga cinturón de asteroides

    // ==========================================
    // CINTURONES DE ASTEROIDES
    // ==========================================
    ASTEROID_BELT_COUNT_BASE: 100,        // Asteroides mínimos por cinturón
    ASTEROID_BELT_COUNT_VAR: 400,         // Asteroides extra aleatorios
    ASTEROID_BELT_RADIUS_MULT_BASE: 10,    // Multiplicador del radio del Sol para el inicio del cinturón
    ASTEROID_BELT_RADIUS_MULT_VAR: 5,     // Variación aleatoria del radio interior
    ASTEROID_BELT_WIDTH_MULT: 2,          // Multiplicador del radio del Sol para el ancho del cinturón
    ASTEROID_BELT_SPEED_BASE: 0.01,       // Velocidad base de órbita del cinturón
    ASTEROID_BELT_SPEED_VAR: 0.05,        // Variación de velocidad orbital del cinturón
    ASTEROID_SIZE_MIN: 100,               // Radio mínimo de un asteroide
    ASTEROID_SIZE_MAX: 500,               // Radio máximo de un asteroide

    BLACK_HOLE_SPAWN_CHANCE: 0.001,       // Probabilidad de que un chunk contenga un agujero negro (aislado)

    // ==========================================
    // ASTROS Y SISTEMAS SOLARES
    // ==========================================
    STAR_RADIUS_MIN: 5000,               // Radio mínimo de la estrella principal
    STAR_RADIUS_MAX: 30000,              // Radio máximo de la estrella
    PLANETS_MAX_PER_SYSTEM: 15,         // Número máximo de planetas girando alrededor de una estrella
    GAS_GIANT_CHANCE: 0.2,             // Probabilidad de que un planeta sea gigante gaseoso (0.0 - 1.0)
    PLANET_ROCKY_RADIUS_MIN: 500,        // Radio mínimo de planeta rocoso
    PLANET_ROCKY_RADIUS_MAX: 4000,       // Radio máximo de planeta rocoso
    PLANET_GAS_RADIUS_MIN: 4000,         // Radio mínimo de planeta gaseoso
    PLANET_GAS_RADIUS_MAX: 10000,         // Radio máximo de planeta gaseoso
    PLANET_ORBIT_SPEED_MIN: 0.0005,      // Velocidad orbital mínima (Año muy largo)
    PLANET_ORBIT_SPEED_MAX: 0.008,       // Velocidad orbital máxima (Año corto, ~12 min)
    PLANET_ROTATION_SPEED_MIN: 0.005,    // Velocidad de rotación mínima (Día de ~20 minutos)
    PLANET_ROTATION_SPEED_MAX: 0.04,     // Velocidad de rotación máxima (Día rápido de ~2.5 minutos)
    ORBIT_DISTANCE_START: 40000,         // Distancia inicial mínima del primer planeta a su sol
    ORBIT_DISTANCE_SPACING: 30000,        // Espacio mínimo entre las órbitas de los planetas
    ORBIT_DISTANCE_VAR: 150000,           // Variación aleatoria extrema del espacio entre órbitas
    // ==========================================
    // TIPOS DE ESTRELLAS (DICCIONARIO MAESTRO)
    // ==========================================
    STAR_TYPES: {
        'Gigante azul': {
            chance: 0.10, // Probabilidad
            hueBase: 0.55, hueVar: 0.1, sat: 0.8, litBase: 0.7, litVar: 0.2,
            radiusMultMin: 1.5, radiusMultMax: 3.0 // Estrellas enormes
        },
        'Enana blanca': {
            chance: 0.05,
            hueBase: 0.6, hueVar: 0.1, sat: 0.1, litBase: 0.9, litVar: 0.1,
            radiusMultMin: 0.1, radiusMultMax: 0.3 // Estrellas muy pequeñas
        },
        'Enana amarilla': {
            chance: 0.35, // Muy común (como nuestro sol)
            hueBase: 0.12, hueVar: 0.05, sat: 0.7, litBase: 0.6, litVar: 0.2,
            radiusMultMin: 0.8, radiusMultMax: 1.2
        },
        'Enana naranja': {
            chance: 0.25, // Común
            hueBase: 0.08, hueVar: 0.04, sat: 0.8, litBase: 0.5, litVar: 0.2,
            radiusMultMin: 0.5, radiusMultMax: 0.9
        },
        'Enana roja': {
            chance: 0.20, // Común
            hueBase: 0.0, hueVar: 0.05, sat: 0.8, litBase: 0.4, litVar: 0.2,
            radiusMultMin: 0.2, radiusMultMax: 0.5 // Pequeñas
        },
        'Enana marrón': {
            chance: 0.05, // Casi fallidas
            hueBase: 0.05, hueVar: 0.02, sat: 0.6, litBase: 0.3, litVar: 0.1,
            radiusMultMin: 0.15, radiusMultMax: 0.3
        }
    },
    SUN_GLOW_SCALE: 4.5,               // Tamaño del halo de luz visual de las estrellas (1.0 = igual al planeta)

    // ==========================================
    // AGUJEROS NEGROS
    // ==========================================
    BLACK_HOLE_SIZE_MULT_NORMAL: 10.0,       // Variación de tamaño para agujeros negros normales (1.0 + X)
    BLACK_HOLE_ULTRA_MASSIVE_CHANCE: 0.05,  // Probabilidad de generar un ultramasivo (0.0 a 1.0)
    BLACK_HOLE_SIZE_MULT_ULTRA: 50.0,        // Tamaño extra para los ultramasivos
    BLACK_HOLE_BASE_RADIUS_VAR: 20.0,        // Variación del radio base antes de multiplicadores
    BLACK_HOLE_DISK_SCALE: 1.0,             // Escala de los discos de acreción
    BLACK_HOLE_JET_LENGTH: 90.0,           // Longitud del chorro relativista
    BLACK_HOLE_JET_WIDTH: 6.0,              // Ancho del chorro relativista
    BLACK_HOLE_PANIC_RANGE_MULT: 100.0,     // Rango de distorsión de cámara
    BLACK_HOLE_DEATH_RANGE_MULT: 1.5,       // Distancia para el evento de muerte
    BLACK_HOLE_MAX_GRAVITY_MULT: 1.0,      // Fuerza de atracción máxima
    BLACK_HOLE_PULL_RADIUS_MULT: 100.0,      // Alcance gravitatorio (n veces su tamaño)
    BLACK_HOLE_GRAVITY_STRENGTH: 1000.0,      // Fuerza del empuje gravitacional (1/r^2)
    BLACK_HOLE_EVENT_HORIZON_MULT: 5.0,     // Fricción aplastante al cruzar esto
    BLACK_HOLE_PANIC_STRENGTH: 1,         // Multiplicador del efecto de pánico visual

    // ==========================================
    // RENDERIZADO Y MEMORIA DEL TERRENO
    // ==========================================
    TERRAIN_CHUNK_SIZE: 5000,             // Tamaño de cada bloque de terreno generado (En u métricas)
    TERRAIN_CHUNK_RESOLUTION: 64,         // Densidad de polígonos por chunk (Mayor = Terreno más suave pero más lag. 32=Bajo, 64=Normal, 128=Ultra)
    TERRAIN_RENDER_DISTANCE: 1,           // Distancia de render (1 = 3x3 chunks, 2 = 5x5 chunks)
    TERRAIN_TARDIS_SCALE: 10,             // Factor multiplicador del tamaño del planeta en tierra (Ilusión TARDIS)
    TERRAIN_FOG_FALLBACK: 0.0002,        // Niebla base en planetas sin atmósfera (Oculta el fin del mundo)
    TERRAIN_FOG_MULTIPLIER: 0.02,          // Escala el grosor de la atmósfera (0.2 = Más visibilidad a lo lejos)

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
        'Planeta oceánico': { chance: 0.10, atmoBase: 0.0003, atmoVar: 0.0002, hueBase: 0.55, hueVar: 0.10, sat: 0.8, lit: 0.30, terrainMods: { octavesAdd: -1, exponentMult: 0.8, heightMult: 0.4 }, aesthetics: { waterLevel: 0, waterColor: 0x1144aa, beachColor: 0xddccaa, beachBlend: 0.6 } },
        'Planeta de lava': { chance: 0.10, atmoBase: 0.0004, atmoVar: 0.0000, hueBase: 0.00, hueVar: 0.10, sat: 0.9, lit: 0.40, terrainMods: { octavesAdd: 1, exponentMult: 1.3, heightMult: 1.5 }, aesthetics: { crackLevel: -100, crackColor: 0xff3300, baseLerpColor: 0x1a1a1a, baseLerp: 0.9 } },
        'Planeta helado': { chance: 0.10, atmoBase: 0.0001, atmoVar: 0.0002, hueBase: 0.50, hueVar: 0.10, sat: 0.4, lit: 0.80, terrainMods: { octavesAdd: -1, exponentMult: 0.7, heightMult: 0.6 }, aesthetics: { globalLerpColor: 0xffffff, globalLerpBase: 0.5, globalLerpLat: 0.5 } },
        'Planeta de cristal': { chance: 0.05, atmoBase: 0.0000, atmoVar: 0.0000, useSystemHue: true, sat: 0.9, lit: 0.60, terrainMods: { octavesAdd: 0, exponentMult: 2.0, heightMult: 1.8 }, aesthetics: { invertLighting: true } },
        'Planeta desértico': { chance: 0.15, atmoBase: 0.0002, atmoVar: 0.0001, hueBase: 0.10, hueVar: 0.05, sat: 0.6, lit: 0.60, terrainMods: { octavesAdd: -1, exponentMult: 0.9, heightMult: 0.7 }, aesthetics: { hasSand: true, sandColor: 0xddbb55, hasSnow: false } },
        'Planeta tóxico': { chance: 0.05, atmoBase: 0.0005, atmoVar: 0.0003, hueBase: 0.30, hueVar: 0.10, sat: 0.8, lit: 0.40, terrainMods: { octavesAdd: 1, exponentMult: 1.5, heightMult: 0.8 }, aesthetics: { hasSand: true, sandColor: 0xddbb55, hasSnow: false } },
        'Planeta tropical': { chance: 0.05, atmoBase: 0.0002, atmoVar: 0.0002, hueBase: 0.35, hueVar: 0.10, sat: 0.7, lit: 0.25, terrainMods: { octavesAdd: 1, exponentMult: 1.1, heightMult: 1.2 }, aesthetics: { hasSand: true, sandColor: 0xddbb55, hasSnow: true } },
        'Planeta yermo': { chance: 0.20, atmoBase: 0.0000, atmoVar: 0.0000, hueBase: 0.05, hueVar: 0.05, sat: 0.1, lit: 0.40, terrainMods: { octavesAdd: -2, exponentMult: 0.6, heightMult: 0.3 }, aesthetics: { hasSand: false, hasSnow: false } },
        // 'Planeta rocoso' es el comodín si no cae en ninguno de los anteriores
        'Planeta rocoso': { chance: 0.00, atmoChance: 0.3, atmoBase: 0.00005, atmoVar: 0.00045, useSystemHue: true, satRandomBase: 0.2, satRandomMult: 0.4, litRandomBase: 0.2, litRandomMult: 0.5, terrainMods: { octavesAdd: 0, exponentMult: 1.0, heightMult: 1.0 }, aesthetics: { hasSand: true, sandColor: 0xddbb55, hasSnow: true } }
    },

    // ==========================================
    // FÍSICAS DE LA NAVE (JUGADOR)
    // ==========================================
    PLAYER_SPEED: 10000,                 // Velocidad base de vuelo (unidades por segundo)
    PLAYER_SPEED_SCROLL_MULT: 1.3,        // Multiplicador de velocidad por tic de la rueda del ratón (Exponencial)
    PLAYER_SPEED_MIN_STEP: 500,           // Velocidad mínima para arrancar desde cero con la rueda
    PLAYER_SPEED_MAX: 100000,           // Límite de velocidad base para evitar romper la simulación física
    PLAYER_BOOST_MULTIPLIER: 30,          // Multiplicador de velocidad al presionar Shift (Hyperdrive)
    PLAYER_FRICTION: 0.985,               // Fricción en el espacio (1.0 = patinar infinito, 0.5 = freno brusco)
    PLAYER_BRAKE_FRICTION: 0.90,          // Fricción al presionar [ESPACIO] para frenar
    MOUSE_SENSITIVITY: 0.0015,            // Sensibilidad del giro de cámara con el ratón
    CINEMATIC_CAMERA_FRICTION: 0.97,      // Conservación de inercia del ratón en modo cinemático (1.0 = infinito)
    CINEMATIC_CAMERA_SENSITIVITY: 0.0001, // Sensibilidad reducida para el modo cinemático
    ROLL_SPEED: 2.0,                      // Velocidad máxima de alabeo (rotar en el eje Z con Q y E)

    // Autopilot Cinemático
    AUTOPILOT_MIN_SPEED: 100000,         // Velocidad mínima de viaje (unidades por segundo)
    AUTOPILOT_MAX_SPEED: 1000000,        // Velocidad máxima permitida (50M uds/s)
    AUTOPILOT_DESIRED_SECONDS: 1.0,       // Segundos teóricos en los que queremos que llegue al objetivo para escalar velocidad
    AUTOPILOT_BRAKE_ZONE_MULT: 4.0,      // Multiplicador de radio para empezar a frenar violentamente
    AUTOPILOT_BRAKE_MULTIPLIER: 0.99,     // Fricción de frenado agresivo (10% por frame)
    AUTOPILOT_ARRIVAL_MULT: 4,            // Multiplicador de radio para considerar llegada e inserción orbital

    // ==========================================
    // ==========================================
    TERRAIN_PLAYER_SPEED: 15,             // Velocidad base al caminar (m/s)
    TERRAIN_PLAYER_SPRINT_MULT: 2.5,      // Multiplicador al correr con Shift
    TERRAIN_JUMP_FORCE: 12,               // Fuerza del salto inicial
    TERRAIN_BASE_GRAVITY: 25,             // Gravedad base (1G modificado por jugabilidad)
    TERRAIN_JETPACK_MAX_FUEL: 250,        // Capacidad máxima del jetpack
    TERRAIN_JETPACK_CONSUME: 25,          // Gasto de combustible por segundo
    TERRAIN_JETPACK_REFILL: 50,           // Recarga de combustible por segundo
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
    RENDER_FOV: 90,                   // Campo de visión de la cámara (Grados)
    RENDER_FAR_PLANE: 100000000,      // Límite visual de la cámara (1 billón de u para ver quásares)
    RENDER_LOGARITHMIC_DEPTH: false,    // Mantiene matemáticas estables a trillones de km sin romper la textura (Z-Fighting)
    RENDER_PIXEL_RATIO_MAX: 1.0,       // Límite de resolución para no quemar la gráfica (1.0 = rápido, 2.0 = nítido 4K)
    RENDER_FOG_BASE: 2,              // Densidad de la niebla estelar profunda
    RENDER_STAR_POINT_SIZE: 1,         // Tamaño de los puntos de luz estelares
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
    // INTERFAZ Y CONTROLES
    // ==========================================
    UI_MAX_LABELS: 100,                    // Máximo de etiquetas de nombres mostrándose al mismo tiempo
    UI_LABEL_MAX_DISTANCE: 1000000,        // Distancia máxima base (u) a la que ves el nombre de un planeta/estrella
    UI_LABEL_DISTANCE_MULT: 100,           // Multiplicador del radio para ver el label a mayor distancia si es un gigante
    TARGET_HITBOX_MULT: 100,              // Multiplicador del radio del astro para hacer clic en él

    // ==========================================
    // PILOTO AUTOMÁTICO Y CINEMÁTICAS
    // ==========================================
    AUTOPILOT_BRAKE_MULTIPLIER: 0.70,     // Desaceleración violenta por frame al llegar (Salto cuántico)
    AUTOPILOT_BRAKE_ZONE_MULT: 5,         // Multiplicador de radio para iniciar la frenada cuántica
    AUTOPILOT_ARRIVAL_MULT: 3.5,          // Multiplicador de radio para detenerse y orbitar (Cinemático FOV)
    AUTOPILOT_MAX_ARRIVAL_DISTANCE: 5000000, // Límite máximo absoluto de distancia de órbita para monstruosidades
    AUTOPILOT_MAX_SPEED_NORMAL: 800000,   // Velocidad crucero normal
    CINEMATIC_ORBIT_SPEED: 0.15,          // Velocidad (rad/s) de la órbita de cámara alrededor del objetivo

    // ==========================================
    // ==========================================
    // PARÁMETROS ESPECÍFICOS DE TERRENO Y CLIMA
    // ==========================================
    TERRAIN_SHIP_SPAWN_DISTANCE: 25,
    TERRAIN_FLASHLIGHT_ANGLE: Math.PI / 4,
    TERRAIN_FLASHLIGHT_PENUMBRA: 0.5,
    TERRAIN_FLASHLIGHT_DECAY: 0.75,
    TERRAIN_FLASHLIGHT_DISTANCE: 10000,
    TERRAIN_FLASHLIGHT_DISTANCE_BASE: 10000,
    TERRAIN_FLASHLIGHT_DISTANCE_STEP: 2000,
    TERRAIN_FLASHLIGHT_POWER_DEFAULT: 2,
    TERRAIN_FLASHLIGHT_POWER_STEP: 0.5,
    TERRAIN_FLASHLIGHT_POWER_MAX: 15,
    TERRAIN_FOG_DIVISOR: 4500,
    TERRAIN_LIFTOFF_ATMOSPHERE_HEIGHT: 100000,

    // TEMPERATURAS BASE POR TIPO DE PLANETA
    PLANET_BASE_TEMPS: {
        'Planeta helado': -60,
        'Planeta de lava': 400,
        'Planeta desértico': 45,
        'Planeta tóxico': 70,
        'Planeta oceánico': 10,
        'Planeta tropical': 30,
        'Planeta yermo': -10,
        'Gigante gaseoso': -150,
        'Planeta rocoso': 15
    },

    // ==========================================
    // AUDIO Y SINTESIS PROCEDURAL
    // ==========================================
    AUDIO_THRUSTER_BASE_FREQ: 60,
    AUDIO_THRUSTER_MOD_FREQ: 60,
    AUDIO_JETPACK_VOL_MAX: 0.1,
    AUDIO_JETPACK_FREQ: 150,
    AUDIO_WIND_FREQ_BASE: 400,
    AUDIO_WIND_LFO_AMP: 200,
    AUDIO_FOOTSTEP_SPEED_MIN: 5,
    AUDIO_SHIP_FREQ: 45,
    AUDIO_SHIP_VOL: 0.1,
    AUDIO_SHIP_REF_DIST: 10,
    AUDIO_SHIP_MAX_DIST: 1000
};
