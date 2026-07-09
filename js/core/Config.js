export const Config = {
    // Helper para formatear números masivos de manera global (con comas para los miles)
    formatNumber: (value, decimals = 0) => {
        return Number(value).toLocaleString('en-US', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        });
    },

    // ==========================================
    // CÓDIGO GENÉTICO DEL UNIVERSO
    // ==========================================
    UNIVERSE_SEED_OFFSET: 3, // Cambia este número mágico (ej: 1337, 999) para generar un multiverso totalmente diferente




    // ==========================================
    // UNIVERSO Y GENERACIÓN PROCEDURAL
    // ==========================================
    UNIVERSE_CHUNK_SIZE: 100000000000, // Tamaño de un sector del espacio (u)
    STARS_PER_CHUNK: 200, // Cantidad de estrellas decorativas (puntos) por sector
    SYSTEM_SPAWN_CHANCE: 0.5, // Probabilidad (0.0 a 1.0) de que aparezcan planetas en un sector vacío
    MAX_SYSTEMS_PER_CHUNK: 15, // Número máximo de sistemas solares por sector
    BINARY_STAR_CHANCE: 0.05, // Probabilidad de que un sistema sea binario
    BINARY_STAR_DISTANCE_BASE_MULT: 3.0, // Multiplicador del radio del sol primario para separar la estrella binaria
    BINARY_STAR_DISTANCE_VAR_MULT: 3.0, // Variación aleatoria de la distancia de la estrella binaria
    ASTEROID_BELT_CHANCE: 0.0, // Probabilidad de que un sistema tenga cinturón de asteroides




    // ==========================================
    // CINTURONES DE ASTEROIDES (Rangos Procedurales)
    // ==========================================
    ASTEROID_BELT_COUNT_MIN: 1000, // Sistemas limpios / vacíos
    ASTEROID_BELT_COUNT_MAX: 3000, // Límite seguro para CPU/RAM (antes 15000 era letal)
    ASTEROID_BELT_RADIUS_MULT_MIN: 10, // Muy cerca del sol
    ASTEROID_BELT_RADIUS_MULT_MAX: 30, // Extremadamente lejos del sol
    ASTEROID_BELT_WIDTH_MULT_MIN: 1, // Anillos muy finos y definidos
    ASTEROID_BELT_WIDTH_MULT_MAX: 50, // Nubes esparcidas y gigantescas (tipo Nube de Oort)
    ASTEROID_BELT_TILT_MIN: 0.1, // Completamente planos (como anillos de Saturno)
    ASTEROID_BELT_TILT_MAX: 3, // Toroides hiper caóticos y dispersos verticalmente
    ASTEROID_BELT_SPEED_BASE: 0.001, // Velocidad base de órbita del cinturón
    ASTEROID_BELT_SPEED_VAR: 0.005, // Variación de velocidad orbital del cinturón
    ASTEROID_SIZE_MIN: 500, // Radio mínimo de un asteroide
    ASTEROID_SIZE_MAX: 1000, // Radio máximo de un asteroide (Algunos son auténticos planetas enanos)

    BLACK_HOLE_SPAWN_CHANCE: 0.001, // Probabilidad de que un chunk contenga un agujero negro (aislado)




    // ==========================================
    // ASTROS Y SISTEMAS SOLARES
    // ==========================================
    STAR_RADIUS_MIN: 20000, // Radio mínimo de estrella principal (200,000 km)
    STAR_RADIUS_MAX: 100000, // Radio máximo de estrella (1,000,000 km)
    PLANETS_MAX_PER_SYSTEM: 6, // 1 a 6 planetas por estrella

    // ANILLOS PLANETARIOS
    PLANET_RING_MIN_RADIUS_MULT: 1.5, // Empieza a 1.5x el radio del planeta
    PLANET_RING_MAX_RADIUS_MULT: 3.5, // Puede iniciar hasta a 3.5x
    PLANET_RING_MIN_WIDTH_MULT: 0.1,  // Ancho mínimo del anillo (0.1x radio)
    PLANET_RING_MAX_WIDTH_MULT: 2.5,  // Ancho máximo del anillo (2.5x radio)
    PLANET_RING_OPACITY_MIN: 0.4,
    PLANET_RING_OPACITY_MAX: 0.9,
    PLANET_ROCKY_RADIUS_MIN: 400, // Radio mínimo planeta rocoso (~4,000 km, similar a Marte/Tierra)
    PLANET_ROCKY_RADIUS_MAX: 1000, // Radio máximo planeta rocoso (~10,000 km, Súper-Tierras)
    PLANET_GAS_RADIUS_MIN: 3000, // Radio mínimo planeta gaseoso (~30,000 km)
    PLANET_GAS_RADIUS_MAX: 8000, // Radio máximo planeta gaseoso (~80,000 km, tipo Júpiter)
    PLANET_ORBIT_SPEED_MIN: 0.00000005, // Velocidad orbital mínima (Equivalente a Neptuno x20)
    PLANET_ORBIT_SPEED_MAX: 0.00002, // Velocidad orbital máxima (Equivalente a Mercurio x20)
    PLANET_ROTATION_SPEED_MIN: 0.00001, // Velocidad de rotación mínima (Planetas rocosos lentos x20)
    PLANET_ROTATION_SPEED_MAX: 0.004, // Velocidad de rotación máxima (Gigantes gaseosos ultrarrápidos x20)

    // VISUALES PLANETARIOS
    PLANET_TEXTURE_RESOLUTION_MULT: 2.0, // Multiplicador para aumentar la resolución/frecuencia del shader del terreno

    ORBIT_DISTANCE_START: 1500000, // Distancia inicial (15 millones de km del Sol)
    ORBIT_DISTANCE_SPACING: 800000, // Espacio mínimo entre las órbitas (8 millones de km)
    ORBIT_DISTANCE_VAR: 500000, // Variación aleatoria del espacio entre órbitas
    HELIOPAUSE_PADDING: 20000000, // Frontera del sistema solar después del último planeta

    // ASTEROIDES
    ASTEROID_MIN_ORBIT: 4000000,
    ASTEROID_MAX_ORBIT: 12000000,

    // ==========================================
    // TIPOS DE ESTRELLAS (DICCIONARIO MAESTRO)
    // ==========================================
    STAR_TYPES: {
        'Gigante azul': {
            chance: 0.10, // Probabilidad
            hueBase: 0.55, hueVar: 0.1, sat: 0.8, litBase: 0.7, litVar: 0.2,
            radiusMultMin: 1.5, radiusMultMax: 3.0, // Estrellas enormes
            tempBase: 10000, tempVar: 30000
        },
        'Enana blanca': {
            chance: 0.05,
            hueBase: 0.6, hueVar: 0.1, sat: 0.1, litBase: 0.9, litVar: 0.1,
            radiusMultMin: 0.1, radiusMultMax: 0.3, // Estrellas muy pequeñas
            tempBase: 8000, tempVar: 30000
        },
        'Enana amarilla': {
            chance: 0.35, // Muy común (como nuestro sol)
            hueBase: 0.12, hueVar: 0.05, sat: 0.7, litBase: 0.6, litVar: 0.2,
            radiusMultMin: 0.8, radiusMultMax: 1.2,
            tempBase: 5000, tempVar: 1500
        },
        'Enana naranja': {
            chance: 0.25, // Común
            hueBase: 0.08, hueVar: 0.04, sat: 0.8, litBase: 0.5, litVar: 0.2,
            radiusMultMin: 0.5, radiusMultMax: 0.9,
            tempBase: 3500, tempVar: 1500
        },
        'Enana roja': {
            chance: 0.20, // Común
            hueBase: 0.0, hueVar: 0.05, sat: 0.8, litBase: 0.4, litVar: 0.2,
            radiusMultMin: 0.2, radiusMultMax: 0.5, // Pequeñas
            tempBase: 2000, tempVar: 1500
        },
        'Enana marrón': {
            chance: 0.05, // Casi fallidas
            hueBase: 0.05, hueVar: 0.02, sat: 0.6, litBase: 0.3, litVar: 0.1,
            radiusMultMin: 0.15, radiusMultMax: 0.3,
            tempBase: 500, tempVar: 1500
        }
    },
    SUN_GLOW_SCALE: 4.5, // Tamaño del halo de luz visual de las estrellas (1.0 = igual al planeta)




    // ==========================================
    // SISTEMA DE MEDICIÓN (VISUAL)
    // ==========================================
    SCALE_U_TO_KM: 10, // 1 U espacial = 10 km reales (Ej: Planeta de 5,000 U = 50,000 km)
    SCALE_U_TO_AU: 0.0000000668,
    SCALE_U_TO_LY: 0.000000000001,
    TIME_SCALE_ACCELERATION: 250, // Factor de "cámara rápida" del universo para que velocidades parezcan realistas (Tierra = 30km/s)
    REFERENCE_EARTH_RADIUS_U: 637.1, // Radio real de la Tierra en unidades espaciales (Base 1G)
    REFERENCE_HABITABLE_ZONE_U: 15000000, // Distancia de la Tierra al Sol en unidades (Zona habitable / Luz óptima)

    // ==========================================
    // AGUJEROS NEGROS
    // ==========================================
    BLACK_HOLE_SIZE_MULT_NORMAL: 20.0, // Variación de tamaño para agujeros negros normales (1.0 + X)
    BLACK_HOLE_ULTRA_MASSIVE_CHANCE: 0.05, // Probabilidad de generar un ultramasivo (0.0 a 1.0)
    BLACK_HOLE_SIZE_MULT_ULTRA: 150.0, // Tamaño extra para los ultramasivos
    BLACK_HOLE_BASE_RADIUS_VAR: 50.0, // Variación del radio base antes de multiplicadores
    BLACK_HOLE_DISK_SCALE: 1.0, // Escala de los discos de acreción
    BLACK_HOLE_JET_LENGTH: 90.0, // Longitud del chorro relativista
    BLACK_HOLE_JET_WIDTH: 6.0, // Ancho del chorro relativista
    BLACK_HOLE_PANIC_RANGE_MULT: 100.0, // Rango de distorsión de cámara
    BLACK_HOLE_DEATH_RANGE_MULT: 1.5, // Distancia para el evento de muerte
    BLACK_HOLE_MAX_GRAVITY_MULT: 1.0, // Fuerza de atracción máxima
    BLACK_HOLE_PULL_RADIUS_MULT: 100.0, // Alcance gravitatorio (n veces su tamaño)
    BLACK_HOLE_GRAVITY_STRENGTH: 1000.0, // Fuerza del empuje gravitacional (1/r^2)
    BLACK_HOLE_EVENT_HORIZON_MULT: 2.0, // Fricción aplastante al cruzar esto
    BLACK_HOLE_PANIC_STRENGTH: 0.3, // Multiplicador del efecto de pánico visual




    // ==========================================
    // RENDERIZADO Y MEMORIA DEL TERRENO
    // ==========================================
    TERRAIN_CHUNK_SIZE: 5000, // Tamaño de cada bloque de terreno generado (En u métricas)
    TERRAIN_CHUNK_RESOLUTION: 64, // Densidad de polígonos por chunk (Mayor = Terreno más suave pero más lag. 32=Bajo, 64=Normal, 128=Ultra)
    TERRAIN_RENDER_DISTANCE: 1, // Distancia de render (1 = 3x3 chunks, 2 = 5x5 chunks)
    TERRAIN_TARDIS_SCALE: 10, // Factor multiplicador del tamaño del planeta en tierra (Ilusión TARDIS)
    TERRAIN_FOG_FALLBACK: 0.0002, // Niebla base en planetas sin atmósfera (Oculta el fin del mundo)
    TERRAIN_FOG_MULTIPLIER: 0.02, // Escala el grosor de la atmósfera (0.2 = Más visibilidad a lo lejos)



    // ==========================================
    // FORMA Y RELIEVE DEL TERRENO (RUIDO FRACTAL PERLIN)
    TERRAIN_BASE_HEIGHT: 800, // Altura máxima absoluta de montañas y valles (Recomendado: 800 a 1500)
    TERRAIN_BASE_FREQUENCY: 0.0005, // Escala de estiramiento horizontal (Recomendado: 0.0005. Menor = colinas anchas, Mayor = picos estrechos)
    TERRAIN_BASE_OCTAVES: 4, // Capas de detalle y rugosidad de roca (Recomendado: 4. Rango 1 a 5)
    TERRAIN_BASE_EXPONENT: 1.5, // Aplanador de valles y alzador de picos (Recomendado: 1.5 a 2.0)

    // ==========================================
    // VARIACIÓN MUTACIONAL DEL TERRENO POR PLANETA
    // Estas variables dictan qué tan extremo puede volverse un planeta individual respecto a las bases anteriores.
    // ==========================================
    TERRAIN_VAR_HEIGHT_BASE: 0.5, // Multiplicador mínimo de altura (0.5 = Mitad de montañas)
    TERRAIN_VAR_HEIGHT_RANGE: 1.5, // Rango aleatorio a sumar (Base 0.5 + Rango 1.5 = Máximo 2.0x altura)
    TERRAIN_VAR_FREQ_BASE: 0.5, // Multiplicador mínimo de frecuencia (0.5 = Colinas muy anchas)
    TERRAIN_VAR_FREQ_RANGE: 1.5, // Rango aleatorio a sumar (Base 0.5 + Rango 1.5 = Máximo 2.0x estrechez)
    TERRAIN_VAR_OCTAVES_SPREAD: 3, // Cuántas capas de detalle se pueden sumar/restar al azar (-1, 0, o +1)
    TERRAIN_VAR_EXPONENT_BASE: 0.8, // Multiplicador base del aplanador
    TERRAIN_VAR_EXPONENT_RANGE: 0.6, // Rango aleatorio a sumar (0.8 + 0.6 = Máximo 1.4x aplanador)





    // ==========================================
    // BIOMAS PLANETARIOS (DICCIONARIO DE DATOS MAESTRO)
    // ==========================================
    PLANET_BIOMES: {
        // === GIGANTES GASEOSOS ===
        'Gigante gaseoso': { chance: 0.06, isGasGiant: true, hueBase: 0.05, hueVar: 0.10, sat: 0.7, lit: 0.5, warpBase: 4.0, warpVar: 3.0, stretchBase: 3.0, stretchVar: 5.0, radiusMult: 1.0, ringChance: 0.80, baseTemp: -150 },
        'Gigante helado': { chance: 0.03, isGasGiant: true, hueBase: 0.55, hueVar: 0.10, sat: 0.6, lit: 0.6, warpBase: 2.0, warpVar: 2.0, stretchBase: 1.5, stretchVar: 2.0, radiusMult: 0.8, ringChance: 0.90, baseTemp: -200 },
        'Gigante de amoníaco': { chance: 0.04, isGasGiant: true, hueBase: 0.15, hueVar: 0.05, sat: 0.8, lit: 0.60, warpBase: 3.0, warpVar: 2.0, stretchBase: 4.0, stretchVar: 4.0, radiusMult: 1.2, ringChance: 0.40, baseTemp: -100 },
        'Gigante de silicato': { chance: 0.04, isGasGiant: true, hueBase: 0.05, hueVar: 0.02, sat: 0.1, lit: 0.70, warpBase: 5.0, warpVar: 3.0, stretchBase: 5.0, stretchVar: 6.0, radiusMult: 1.1, ringChance: 0.60, baseTemp: 900 },
        'Júpiter caliente': { chance: 0.02, isGasGiant: true, hueBase: 0.02, hueVar: 0.05, sat: 0.8, lit: 0.3, warpBase: 6.0, warpVar: 4.0, stretchBase: 2.0, stretchVar: 2.0, radiusMult: 1.5, ringChance: 0.10, baseTemp: 800 },

        // === MUNDOS CON OCÉANOS / HABITABLES ===
        'Planeta oceánico': { chance: 0.03, atmoBase: 0.0003, atmoVar: 0.0002, hueBase: 0.55, hueVar: 0.10, sat: 0.8, lit: 0.30, terrainMods: { octavesAdd: -1, exponentMult: 0.8, heightMult: 0.4 }, aesthetics: { waterLevel: 0, waterColor: 0x1144aa, beachColor: 0xddccaa, beachBlend: 0.6 }, warpBase: 1.0, warpVar: 1.5, radiusMult: 1.05, ringChance: 0.05, baseTemp: 10 },
        'Mundo edénico': { chance: 0.03, atmoBase: 0.0002, atmoVar: 0.0002, hueBase: 0.35, hueVar: 0.10, sat: 0.7, lit: 0.25, terrainMods: { octavesAdd: 1, exponentMult: 1.1, heightMult: 1.2 }, aesthetics: { hasSand: true, sandColor: 0xddbb55, hasSnow: true }, warpBase: 1.2, warpVar: 1.2, radiusMult: 1.0, ringChance: 0.02, baseTemp: 30 },
        'Planeta prístino': { chance: 0.02, atmoBase: 0.0002, atmoVar: 0.0001, hueBase: 0.30, hueVar: 0.05, sat: 0.8, lit: 0.40, terrainMods: { octavesAdd: 0, exponentMult: 1.0, heightMult: 1.0 }, aesthetics: { hasSand: true, sandColor: 0xffeeaa, hasSnow: true, waterLevel: 0, waterColor: 0x2288ff }, warpBase: 1.0, warpVar: 1.0, radiusMult: 1.0, ringChance: 0.0, baseTemp: 22 },
        'Planeta abisal': { chance: 0.02, atmoBase: 0.0003, atmoVar: 0.0001, hueBase: 0.60, hueVar: 0.10, sat: 0.2, lit: 0.10, terrainMods: { octavesAdd: -1, exponentMult: 0.9, heightMult: 0.5 }, aesthetics: { waterLevel: 100, waterColor: 0x050510 }, warpBase: 1.5, warpVar: 1.0, radiusMult: 1.1, ringChance: 0.02, baseTemp: -2 },

        // === MUNDOS CALIENTES / INFERNALES ===
        'Planeta de lava': { chance: 0.03, atmoBase: 0.0004, atmoVar: 0.0000, hueBase: 0.00, hueVar: 0.10, sat: 0.9, lit: 0.40, terrainMods: { octavesAdd: 1, exponentMult: 1.3, heightMult: 1.5 }, aesthetics: { crackLevel: -100, crackColor: 0xff3300, baseLerpColor: 0x1a1a1a, baseLerp: 0.9 }, warpBase: 2.0, warpVar: 2.0, radiusMult: 0.95, ringChance: 0.10, baseTemp: 400 },
        'Mundo carbonizado': { chance: 0.02, atmoBase: 0.0001, atmoVar: 0.0000, hueBase: 0.00, hueVar: 0.00, sat: 0.0, lit: 0.15, terrainMods: { octavesAdd: 1, exponentMult: 0.8, heightMult: 0.5 }, aesthetics: { hasSand: false, hasSnow: false }, warpBase: 1.0, warpVar: 0.5, radiusMult: 0.9, ringChance: 0.08, baseTemp: 150 },
        'Mundo fracturado': { chance: 0.04, atmoBase: 0.0000, atmoVar: 0.0000, hueBase: 0.05, hueVar: 0.10, sat: 0.2, lit: 0.30, terrainMods: { octavesAdd: 1, exponentMult: 2.5, heightMult: 2.5 }, aesthetics: { hasSand: false, hasSnow: false, crackLevel: -20, crackColor: 0xffaa00, baseLerpColor: 0x111111, baseLerp: 0.9 }, warpBase: 2.0, warpVar: 2.0, radiusMult: 0.85, ringChance: 0.15, baseTemp: 250 },

        // === MUNDOS HELADOS / CRISTALINOS ===
        'Mundo glaciar': { chance: 0.03, atmoBase: 0.0001, atmoVar: 0.0002, hueBase: 0.50, hueVar: 0.10, sat: 0.4, lit: 0.80, terrainMods: { octavesAdd: -1, exponentMult: 0.7, heightMult: 0.6 }, aesthetics: { globalLerpColor: 0xffffff, globalLerpBase: 0.5, globalLerpLat: 0.5 }, warpBase: 0.5, warpVar: 1.0, radiusMult: 0.9, ringChance: 0.05, baseTemp: -60 },
        'Desierto alcalino': { chance: 0.03, atmoBase: 0.0001, atmoVar: 0.0000, hueBase: 0.0, hueVar: 0.0, sat: 0.0, lit: 0.90, terrainMods: { octavesAdd: -1, exponentMult: 0.6, heightMult: 0.2 }, aesthetics: { hasSand: true, sandColor: 0xffffff, hasSnow: false }, warpBase: 1.0, warpVar: 1.0, radiusMult: 1.0, ringChance: 0.0, baseTemp: 50 },
        'Mundo facetado': { chance: 0.02, atmoBase: 0.0000, atmoVar: 0.0000, useSystemHue: true, sat: 0.9, lit: 0.60, terrainMods: { octavesAdd: 0, exponentMult: 2.0, heightMult: 1.8 }, aesthetics: { invertLighting: true }, warpBase: 3.0, warpVar: 1.0, radiusMult: 0.85, ringChance: 0.20, baseTemp: -20 },
        'Planeta de cuarzo': { chance: 0.03, atmoBase: 0.0001, atmoVar: 0.0000, hueBase: 0.85, hueVar: 0.05, sat: 0.7, lit: 0.70, terrainMods: { octavesAdd: -1, exponentMult: 2.2, heightMult: 1.2 }, aesthetics: { globalLerpColor: 0xffccff, globalLerpBase: 0.8, globalLerpLat: 0.2 }, warpBase: 2.0, warpVar: 1.0, radiusMult: 0.8, ringChance: 0.10, baseTemp: -10 },

        // === MUNDOS SECOS Y DESÉRTICOS ===
        'Planeta desértico': { chance: 0.03, atmoBase: 0.0002, atmoVar: 0.0001, hueBase: 0.10, hueVar: 0.05, sat: 0.6, lit: 0.60, terrainMods: { octavesAdd: -1, exponentMult: 0.9, heightMult: 0.7 }, aesthetics: { hasSand: true, sandColor: 0xddbb55, hasSnow: false }, warpBase: 1.5, warpVar: 1.5, radiusMult: 1.0, ringChance: 0.05, baseTemp: 45 },
        'Mundo de polvo': { chance: 0.03, atmoBase: 0.0006, atmoVar: 0.0002, hueBase: 0.08, hueVar: 0.02, sat: 0.8, lit: 0.40, terrainMods: { octavesAdd: -2, exponentMult: 0.4, heightMult: 0.1 }, aesthetics: { hasSand: true, sandColor: 0xcc8833, hasSnow: false }, warpBase: 0.5, warpVar: 0.5, radiusMult: 1.05, ringChance: 0.15, baseTemp: 80 },
        'Páramo estéril': { chance: 0.03, atmoBase: 0.0000, atmoVar: 0.0000, hueBase: 0.05, hueVar: 0.05, sat: 0.1, lit: 0.40, terrainMods: { octavesAdd: -2, exponentMult: 0.6, heightMult: 0.3 }, aesthetics: { hasSand: false, hasSnow: false }, warpBase: 0.5, warpVar: 0.5, radiusMult: 0.8, ringChance: 0.05, baseTemp: -10 },
        'Planeta metálico': { chance: 0.02, atmoBase: 0.0000, atmoVar: 0.0000, hueBase: 0.10, hueVar: 0.05, sat: 0.1, lit: 0.60, terrainMods: { octavesAdd: 0, exponentMult: 2.0, heightMult: 1.5 }, aesthetics: { hasSand: false, hasSnow: false }, warpBase: 0.1, warpVar: 0.1, radiusMult: 0.85, ringChance: 0.10, baseTemp: -80 },
        'Planeta de obsidiana': { chance: 0.03, atmoBase: 0.0001, atmoVar: 0.0001, hueBase: 0.75, hueVar: 0.10, sat: 0.5, lit: 0.10, terrainMods: { octavesAdd: 1, exponentMult: 1.3, heightMult: 1.5 }, aesthetics: { hasSand: false, hasSnow: false }, warpBase: 0.5, warpVar: 1.0, radiusMult: 1.0, ringChance: 0.05, baseTemp: 60 },

        // === MUNDOS EXÓTICOS / BIOLÓGICOS / TÓXICOS ===
        'Ciénaga corrosiva': { chance: 0.03, atmoBase: 0.0005, atmoVar: 0.0003, hueBase: 0.30, hueVar: 0.10, sat: 0.8, lit: 0.40, terrainMods: { octavesAdd: 1, exponentMult: 1.5, heightMult: 0.8 }, aesthetics: { hasSand: true, sandColor: 0xddbb55, hasSnow: false }, warpBase: 2.0, warpVar: 2.5, radiusMult: 1.1, ringChance: 0.10, baseTemp: 70 },
        'Núcleo expuesto': { chance: 0.04, atmoBase: 0.0005, atmoVar: 0.0002, hueBase: 0.15, hueVar: 0.05, sat: 0.3, lit: 0.30, terrainMods: { octavesAdd: 0, exponentMult: 0.9, heightMult: 0.7 }, aesthetics: { crackLevel: -50, crackColor: 0x33ff11, baseLerpColor: 0x333333, baseLerp: 0.9 }, warpBase: 1.5, warpVar: 1.5, radiusMult: 0.95, ringChance: 0.15, baseTemp: 120 },
        'Mundo bioluminiscente': { chance: 0.02, atmoBase: 0.0002, atmoVar: 0.0001, hueBase: 0.80, hueVar: 0.15, sat: 0.9, lit: 0.30, terrainMods: { octavesAdd: 0, exponentMult: 1.2, heightMult: 1.1 }, aesthetics: { invertLighting: true, waterColor: 0xff00ff }, warpBase: 2.5, warpVar: 1.5, radiusMult: 1.0, ringChance: 0.05, baseTemp: 18 },
        'Planeta de esporas': { chance: 0.02, atmoBase: 0.0004, atmoVar: 0.0002, hueBase: 0.25, hueVar: 0.10, sat: 0.6, lit: 0.30, terrainMods: { octavesAdd: -1, exponentMult: 0.7, heightMult: 0.8 }, aesthetics: { globalLerpColor: 0xaaff55, globalLerpBase: 0.2, globalLerpLat: 0.1 }, warpBase: 2.0, warpVar: 1.0, radiusMult: 0.95, ringChance: 0.0, baseTemp: 25 },
        'Océano carmesí': { chance: 0.03, atmoBase: 0.0003, atmoVar: 0.0001, hueBase: 0.02, hueVar: 0.05, sat: 0.9, lit: 0.20, terrainMods: { octavesAdd: 0, exponentMult: 1.0, heightMult: 0.8 }, aesthetics: { waterLevel: 20, waterColor: 0x880000, beachColor: 0x331111, beachBlend: 0.4 }, warpBase: 1.2, warpVar: 1.5, radiusMult: 1.0, ringChance: 0.05, baseTemp: 40 },
        'Planeta tormentoso': { chance: 0.03, atmoBase: 0.0006, atmoVar: 0.0002, hueBase: 0.60, hueVar: 0.10, sat: 0.3, lit: 0.20, terrainMods: { octavesAdd: 1, exponentMult: 1.1, heightMult: 1.2 }, aesthetics: { hasSand: false, hasSnow: false, waterColor: 0x112233, waterLevel: -20 }, warpBase: 3.0, warpVar: 2.0, radiusMult: 1.05, ringChance: 0.10, baseTemp: 5 },
        'Mundo crepuscular': { chance: 0.03, atmoBase: 0.0004, atmoVar: 0.0002, hueBase: 0.75, hueVar: 0.15, sat: 0.6, lit: 0.20, terrainMods: { octavesAdd: 0, exponentMult: 1.0, heightMult: 1.0 }, aesthetics: { globalLerpColor: 0x330066, globalLerpBase: 0.5, globalLerpLat: 0.5 }, warpBase: 1.5, warpVar: 1.5, radiusMult: 1.0, ringChance: 0.05, baseTemp: 10 },
        'Planeta fractal': { chance: 0.03, atmoBase: 0.0000, atmoVar: 0.0000, hueBase: 0.70, hueVar: 0.15, sat: 0.8, lit: 0.40, terrainMods: { octavesAdd: 2, exponentMult: 1.5, heightMult: 1.8 }, aesthetics: { invertLighting: true, globalLerpColor: 0xff00ff, globalLerpBase: 0.2, globalLerpLat: 0.5 }, warpBase: 5.0, warpVar: 3.0, radiusMult: 0.9, ringChance: 0.20, baseTemp: -50 },

        // === MUNDOS ULTRA RAROS / SCI-FI (1% de chance cada uno) ===
        'Planeta cuántico': { chance: 0.01, atmoBase: 0.0010, atmoVar: 0.0005, useSystemHue: true, sat: 1.0, lit: 0.80, terrainMods: { octavesAdd: -1, exponentMult: 0.5, heightMult: 0.2 }, aesthetics: { invertLighting: true, globalLerpColor: 0xffffff, globalLerpBase: 0.5, globalLerpLat: 0.5 }, warpBase: 10.0, warpVar: 5.0, radiusMult: 0.8, ringChance: 0.50, baseTemp: -270 },
        'Gigante de materia oscura': { chance: 0.01, isGasGiant: true, hueBase: 0.0, hueVar: 0.0, sat: 0.0, lit: 0.02, warpBase: 1.0, warpVar: 0.5, stretchBase: 1.0, stretchVar: 1.0, radiusMult: 1.5, ringChance: 0.95, baseTemp: -273 },
        'Mundo enjambre': { chance: 0.01, atmoBase: 0.0008, atmoVar: 0.0002, hueBase: 0.20, hueVar: 0.05, sat: 0.8, lit: 0.30, terrainMods: { octavesAdd: 3, exponentMult: 1.5, heightMult: 1.2 }, aesthetics: { globalLerpColor: 0x99aa00, globalLerpBase: 0.4, globalLerpLat: 0.0 }, warpBase: 4.0, warpVar: 4.0, radiusMult: 1.1, ringChance: 0.0, baseTemp: 60 },
        'Planeta de ectoplasma': { chance: 0.01, atmoBase: 0.0015, atmoVar: 0.0005, hueBase: 0.45, hueVar: 0.10, sat: 0.9, lit: 0.60, terrainMods: { octavesAdd: -2, exponentMult: 0.8, heightMult: 0.3 }, aesthetics: { waterLevel: 50, waterColor: 0x00ffaa, invertLighting: true }, warpBase: 1.0, warpVar: 1.0, radiusMult: 1.05, ringChance: 0.10, baseTemp: 15 },
        'Fragmento de estrella': { chance: 0.01, atmoBase: 0.0000, atmoVar: 0.0000, hueBase: 0.10, hueVar: 0.05, sat: 1.0, lit: 0.90, terrainMods: { octavesAdd: 1, exponentMult: 1.0, heightMult: 1.0 }, aesthetics: { crackLevel: -200, crackColor: 0xffffff, baseLerpColor: 0xffaa00, baseLerp: 0.8 }, warpBase: 5.0, warpVar: 2.0, radiusMult: 0.7, ringChance: 0.0, baseTemp: 2500 },
        'Mundo reloj': { chance: 0.01, atmoBase: 0.0000, atmoVar: 0.0000, hueBase: 0.12, hueVar: 0.02, sat: 0.3, lit: 0.50, terrainMods: { octavesAdd: -3, exponentMult: 5.0, heightMult: 0.5 }, aesthetics: { hasSand: false, hasSnow: false }, warpBase: 0.0, warpVar: 0.0, radiusMult: 1.0, ringChance: 0.80, baseTemp: 20 },
        'Planeta espejo': { chance: 0.01, atmoBase: 0.0000, atmoVar: 0.0000, hueBase: 0.0, hueVar: 0.0, sat: 0.0, lit: 0.80, terrainMods: { octavesAdd: -2, exponentMult: 0.5, heightMult: 0.2 }, aesthetics: { waterLevel: 20, waterColor: 0xffffff }, warpBase: 0.1, warpVar: 0.1, radiusMult: 0.9, ringChance: 0.0, baseTemp: -50 },
        'Planeta de antimateria': { chance: 0.01, atmoBase: 0.0005, atmoVar: 0.0005, hueBase: 0.80, hueVar: 0.20, sat: 1.0, lit: 0.50, terrainMods: { octavesAdd: 1, exponentMult: 1.2, heightMult: 1.5 }, aesthetics: { invertLighting: true, globalLerpColor: 0x000000, globalLerpBase: 0.5, globalLerpLat: 0.5 }, warpBase: 3.0, warpVar: 3.0, radiusMult: 0.95, ringChance: 0.30, baseTemp: -200 },
        'Gigante lenticular': { chance: 0.01, isGasGiant: true, hueBase: 0.08, hueVar: 0.05, sat: 0.5, lit: 0.40, warpBase: 1.0, warpVar: 1.0, stretchBase: 15.0, stretchVar: 5.0, radiusMult: 1.3, ringChance: 1.0, baseTemp: -80 },
        'Planeta prisma': { chance: 0.01, atmoBase: 0.0, atmoVar: 0.0, useSystemHue: true, sat: 1.0, lit: 0.5, terrainMods: { octavesAdd: 0, exponentMult: 2.0, heightMult: 1.0 }, aesthetics: { globalLerpColor: 0xffffff, globalLerpLat: 1.0 }, warpBase: 10.0, warpVar: 2.0, radiusMult: 1.0, ringChance: 0.0, baseTemp: 0 },

        // === COMODÍN ===
        // Suma de los 39 planetas anteriores = 0.96. Esto deja un ~0.04 (4%) de probabilidad para el clásico planeta rocoso.
        'Planeta rocoso': { chance: 0.04, atmoChance: 0.3, atmoBase: 0.00005, atmoVar: 0.00045, useSystemHue: true, satRandomBase: 0.2, satRandomMult: 0.4, litRandomBase: 0.2, litRandomMult: 0.5, terrainMods: { octavesAdd: 0, exponentMult: 1.0, heightMult: 1.0 }, aesthetics: { hasSand: true, sandColor: 0xddbb55, hasSnow: true }, warpBase: 1.0, warpVar: 1.5, radiusMult: 1.0, ringChance: 0.10, baseTemp: 15 }
    },

    // ==========================================
    // FÍSICAS DE LA NAVE (JUGADOR)
    // ==========================================
    PLAYER_SPEED: 6000, // Velocidad base de vuelo (unidades por segundo)
    PLAYER_SPEED_SCROLL_MULT: 1.15, // Multiplicador de velocidad por tic de la rueda del ratón (Exponencial)
    PLAYER_SPEED_MIN_STEP: 600, // Velocidad mínima para arrancar desde cero con la rueda
    PLAYER_SPEED_MAX: 60000, // Límite de velocidad base para evitar romper la simulación física
    PLAYER_BOOST_MULTIPLIER: 20, // Multiplicador de velocidad al presionar Shift (Hyperdrive)
    PLAYER_FRICTION: 0.985, // Fricción en el espacio (1.0 = patinar infinito, 0.5 = freno brusco)
    PLAYER_BRAKE_FRICTION: 0.90, // Fricción al presionar [ESPACIO] para frenar
    MOUSE_SENSITIVITY: 0.0015, // Sensibilidad del giro de cámara con el ratón
    CINEMATIC_CAMERA_FRICTION: 0.97, // Conservación de inercia del ratón en modo cinemático (1.0 = infinito)
    CINEMATIC_CAMERA_SENSITIVITY: 0.0001, // Sensibilidad reducida para el modo cinemático
    ROLL_SPEED: 2.0, // Velocidad máxima de alabeo (rotar en el eje Z con Q y E)






    // ==========================================
    // ==========================================
    GASDIVE_SPEED_BASE: 2000,
    GASDIVE_SPEED_MAX: 20000,
    GASDIVE_SPEED_MIN_STEP: 200,
    GASDIVE_SPEED_SCROLL_MULT: 1.15,
    GASDIVE_BOOST_MULTIPLIER: 2,

    // ==========================================
    // ==========================================
    TERRAIN_PLAYER_SPEED: 15, // Velocidad base al caminar (m/s)
    TERRAIN_PLAYER_SPRINT_MULT: 2.5, // Multiplicador al correr con Shift
    TERRAIN_JUMP_FORCE: 12, // Fuerza del salto inicial
    TERRAIN_BASE_GRAVITY: 25, // Gravedad base (1G modificado por jugabilidad)
    TERRAIN_JETPACK_MAX_FUEL: 250, // Capacidad máxima del jetpack
    TERRAIN_JETPACK_CONSUME: 25, // Gasto de combustible por segundo
    TERRAIN_JETPACK_REFILL: 50, // Recarga de combustible por segundo
    TERRAIN_MOUSE_SENSITIVITY: 0.0015, // Sensibilidad de la vista en tierra




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
        TARGET: [], // Ahora exclusivo del clic izquierdo
        TOGGLE_FOCUS: ['KeyT'],
        AUTOPILOT: ['KeyJ'],
        TOGGLE_HUD: ['Tab'],
        TOGGLE_LABELS: ['KeyL'],
        TOGGLE_CINEMATIC: ['KeyF'],
        TOGGLE_LANDING: ['Enter'],
        TOGGLE_FLASHLIGHT: ['KeyV']
    },

    // ==========================================
    // MOTOR GRÁFICO (RENDER & RENDIMIENTO)
    // ==========================================
    RENDER_FOV: 90, // Campo de visión de la cámara (Grados)
    RENDER_NEAR_PLANE: 0.0001, // Distancia mínima de visión antes de recortar polígonos (clipping)
    RENDER_FAR_PLANE: 1000000000, // Límite visual de la cámara (1 billón de u para ver quásares)
    RENDER_LOGARITHMIC_DEPTH: true, // Mantiene matemáticas estables a trillones de km sin romper la textura (Z-Fighting)
    LOD_HIGH_DISTANCE_MULT: 10000, // Multiplicador del radio a la que un planeta se actualiza a Alta Definición
    RENDER_PIXEL_RATIO_MAX: 1.0, // Límite de resolución para no quemar la gráfica (1.0 = rápido, 2.0 = nítido 4K)
    RENDER_FOG_BASE: 2, // Densidad de la niebla estelar profunda
    RENDER_STAR_POINT_SIZE: 1, // Tamaño de los puntos de luz estelares
    RENDER_ANTIALIAS: false, // Suavizado de bordes (Apagar para +70% FPS)




    // ==========================================
    // SISTEMA DE IMPOSTORES (LOD PROFUNDO)
    // ==========================================
    IMPOSTOR_RENDER_DISTANCE_CHUNKS: 10, // A cuántos chunks de distancia buscamos anomalías para proyectar
    IMPOSTOR_UPDATE_INTERVAL: 1000, // Cada cuántos milisegundos se actualizan los impostores




    // ==========================================
    // ILUMINACIÓN AMBIENTAL
    // ==========================================
    LIGHT_AMBIENT_COLOR: 0x222233, // Color de la luz base que baña todo el espacio (Gris azulado oscuro)
    LIGHT_SUN_INTENSITY: 4, // Fuerza con la que el Sol más cercano ilumina tus planetas
    LIGHT_SUN_DISTANCE: 100000000, // Distancia a la que viaja la luz del Sol más cercano




    // ==========================================
    // INTERFAZ Y CONTROLES
    // ==========================================
    UI_MAX_LABELS: 20, // Máximo de etiquetas de nombres mostrándose al mismo tiempo
    UI_LABEL_MAX_DISTANCE: 10000000, // Distancia máxima base (u) a la que ves el nombre de un planeta/estrella
    UI_LABEL_DISTANCE_MULT: 100, // Multiplicador del radio para ver el label a mayor distancia si es un gigante
    TARGET_HITBOX_MULT: 1.2, // Multiplicador del radio del astro para hacer clic en él (1.2 = ligero perdón visual)
    PROXIMITY_SHIELD_MULT: 1.1, // Multiplicador del radio al que empieza a funcionar el deflector de colisión
    PROXIMITY_SHIELD_MIN_SPEED: 50, // Velocidad mínima garantizada cuando estás empotrado contra el planeta (uds/s)




    // ==========================================
    // PILOTO AUTOMÁTICO Y CINEMÁTICAS
    // ==========================================
    AUTOPILOT_MIN_SPEED: 60000, // Velocidad mínima de viaje (unidades por segundo)
    AUTOPILOT_MAX_SPEED: 6000000000, // Velocidad máxima permitida (50M uds/s)
    AUTOPILOT_DESIRED_SECONDS: 1.0, // Segundos teóricos en los que queremos que llegue al objetivo para escalar velocidad
    AUTOPILOT_BRAKE_MULTIPLIER: 0.70, // Desaceleración violenta por frame al llegar (Salto cuántico)
    AUTOPILOT_BRAKE_ZONE_MULT: 5, // Multiplicador de radio para iniciar la frenada cuántica
    AUTOPILOT_ARRIVAL_MULT: 2, // Multiplicador de radio para detenerse y orbitar (Cinemático FOV)
    AUTOPILOT_MAX_ARRIVAL_DISTANCE: 6000000, // Límite máximo absoluto de distancia de órbita para monstruosidades
    AUTOPILOT_APPROACH_LOCK_MULT: 1.5, // Multiplicador relativo a la órbita final para bloquear cámara y mostrar alerta
    AUTOPILOT_FREELOOK_TIMEOUT: 3000, // Ms de inactividad libre antes de re-alinear vista
    AUTOPILOT_MAX_SPEED_NORMAL: 600000, // Velocidad crucero normal
    CINEMATIC_ORBIT_SPEED: 0.15, // Velocidad (rad/s) de la órbita de cámara alrededor del objetivo





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

