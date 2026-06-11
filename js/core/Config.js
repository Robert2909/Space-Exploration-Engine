export const Config = {
    // ==========================================
    // UNIVERSO Y GENERACIÓN PROCEDURAL
    // ==========================================
    UNIVERSE_CHUNK_SIZE: 600000,         // Tamaño de un sector del espacio (u)
    STARS_PER_CHUNK: 300,              // Cantidad de estrellas decorativas (puntos) por sector
    SYSTEM_SPAWN_CHANCE: 0.05,          // Probabilidad (0.0 a 1.0) de que aparezcan planetas en un sector vacío
    MAX_SYSTEMS_PER_CHUNK: 2,          // Número máximo de sistemas solares por sector

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
    PLANET_ORBIT_SPEED_BASE: 0.05,     // Velocidad orbital base
    PLANET_ORBIT_SPEED_VAR: 0.2,       // Variación de velocidad orbital aleatoria
    PLANET_ROTATION_SPEED: 0.5,        // Velocidad de rotación del planeta sobre su propio eje (día/noche)
    ORBIT_DISTANCE_START: 15000,         // Distancia inicial mínima del primer planeta a su sol
    ORBIT_DISTANCE_SPACING: 8000,        // Espacio mínimo entre las órbitas de los planetas
    ORBIT_DISTANCE_VAR: 15000,           // Variación aleatoria del espacio entre órbitas
    STAR_BLUE_CHANCE: 0.15,            // Probabilidad (0-1) de que una estrella sea azul (muy caliente)
    STAR_RED_CHANCE: 0.30,             // Probabilidad (0-1) de que una estrella sea roja (fría)
    SUN_GLOW_SCALE: 4.5,               // Tamaño del halo de luz visual de las estrellas (1.0 = igual al planeta)

    // ==========================================
    // 🧬 CÓDIGO GENÉTICO DEL UNIVERSO
    // ==========================================
    UNIVERSE_SEED_OFFSET: 2909,           // Cambia este número mágico (ej: 1337, 999) para generar un multiverso totalmente diferente

    // ==========================================
    // FÍSICAS DE LA NAVE (JUGADOR)
    // ==========================================
    PLAYER_SPEED: 50000,                 // Velocidad base de vuelo (unidades por segundo)
    PLAYER_SPEED_SCROLL_MULT: 1.3,     // Multiplicador de velocidad por tic de la rueda del ratón (Exponencial)
    PLAYER_SPEED_MIN_STEP: 500,          // Velocidad mínima para arrancar desde cero con la rueda
    PLAYER_SPEED_MAX: 10000000,          // Límite de velocidad base para evitar romper la simulación física
    PLAYER_BOOST_MULTIPLIER: 30,       // Multiplicador de velocidad al presionar Shift (Hyperdrive)
    PLAYER_FRICTION: 0.985,             // Fricción en el espacio (1.0 = patinar infinito, 0.5 = freno brusco)
    PLAYER_BRAKE_FRICTION: 0.90,       // Fricción al presionar [ESPACIO] para frenar
    MOUSE_SENSITIVITY: 0.0015,         // Sensibilidad del giro de cámara con el ratón
    CINEMATIC_CAMERA_FRICTION: 0.97,   // Conservación de inercia del ratón en modo cinemático (1.0 = infinito)
    CINEMATIC_CAMERA_SENSITIVITY: 0.0001, // Sensibilidad reducida para el modo cinemático
    ROLL_SPEED: 2.0,                   // Velocidad máxima de alabeo (rotar en el eje Z con Q y E)

    // ==========================================
    // PILOTO AUTOMÁTICO Y CINEMÁTICAS
    // ==========================================
    AUTOPILOT_BRAKE_MULTIPLIER: 0.70,  // Desaceleración violenta por frame al llegar (Salto cuántico)
    AUTOPILOT_BRAKE_ZONE_MULT: 5,      // Multiplicador de radio para iniciar la frenada cuántica
    AUTOPILOT_ARRIVAL_MULT: 3.5,       // Multiplicador de radio para detenerse y orbitar (Cinemático FOV)
    CINEMATIC_ORBIT_SPEED: 0.15,       // Velocidad (rad/s) de la órbita de cámara alrededor del objetivo

    // ==========================================
    // FÍSICAS DEL MODO TERRESTRE (JUGADOR)
    // ==========================================
    TERRAIN_PLAYER_SPEED: 15,             // Velocidad base al caminar (m/s)
    TERRAIN_PLAYER_SPRINT_MULT: 2.5,        // Multiplicador al correr con Shift
    TERRAIN_JUMP_FORCE: 12,               // Fuerza del salto inicial
    TERRAIN_BASE_GRAVITY: 25,             // Gravedad base (1G modificado por jugabilidad)
    TERRAIN_JETPACK_MAX_FUEL: 250,        // Capacidad máxima del jetpack
    TERRAIN_JETPACK_CONSUME: 35,          // Gasto de combustible por segundo
    TERRAIN_JETPACK_REFILL: 25,           // Recarga de combustible por segundo
    TERRAIN_MOUSE_SENSITIVITY: 0.0015,     // Sensibilidad de la vista en tierra

    // ==========================================
    // GENERACIÓN Y RENDER DE TERRENO
    // ==========================================
    TERRAIN_CHUNK_SIZE: 3000,             // Tamaño de cada bloque de terreno generado
    TERRAIN_RENDER_DISTANCE: 2,           // Distancia de render (1 = 3x3 chunks, 2 = 5x5)
    TERRAIN_TARDIS_SCALE: 10,             // Factor multiplicador del tamaño del planeta (Ilusión TARDIS)

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
    RENDER_PIXEL_RATIO_MAX: 1.0,       // Límite de resolución para no quemar la gráfica (1.0 = rápido, 2.0 = nítido 4K)
    RENDER_FOG_BASE: 2.5,              // Densidad de la niebla estelar profunda
    RENDER_STAR_POINT_SIZE: 100,         // Tamaño de los puntos de luz estelares
    RENDER_ANTIALIAS: false,           // Suavizado de bordes (Apagar para +70% FPS)

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
    UI_LABEL_MAX_DISTANCE: 150000        // Distancia máxima (u) a la que ves el nombre de un planeta/estrella
};
