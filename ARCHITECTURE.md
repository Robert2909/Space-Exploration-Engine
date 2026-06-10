# Space Exploration Engine - Documentación de Arquitectura

Este documento describe la estructura y arquitectura modular del proyecto Space Exploration Engine, diseñado para ser altamente escalable, performante y evitar el acoplamiento de código ("código espagueti") a medida que se añaden nuevas funcionalidades.

## Estructura de Directorios

```text
/
├── index.html            # Punto de entrada HTML, contiene el HUD interactivo y el Canvas 3D.
├── css/
│   └── styles.css        # Estilos visuales del juego y UI, con un diseño temático tipo IDE / Antigravity.
└── js/
    ├── main.js           # Entry point JS. Solo se encarga de inicializar el Motor.
    ├── core/
    │   ├── Engine.js     # Motor principal. Instancia Three.js, la escena, el bucle de renderizado y une los sistemas.
    │   └── Config.js     # Panel de Control Global. Archivo centralizado que contiene TODOS los "Magic Numbers", ajustes de físicas, renderizado y multiverso.
    ├── graphics/
    │   └── LightingManager.js # Gestor de iluminación inteligente. Optimiza el rendimiento gestionando la luz dinámica basada en distancia.
    ├── player/
    │   └── SpaceControls.js   # Sistema de controles físicos del jugador (Vuelo espacial, 6DOF, inercia, alabeo).
    ├── ui/
    │   └── UIManager.js  # Gestor de interfaz gráfica, superposiciones de HTML y etiquetas 3D proyectadas en 2D en tiempo real.
    ├── utils/
    │   └── MathUtils.js  # Funciones matemáticas de utilidad global (Generación Pseudoaleatoria dependiente de semilla multiversal).
    └── world/
        ├── generators/
        │   └── NameGenerator.js # Sistema procedural de vanguardia para crear nombres Sci-Fi de estrellas y planetas según coordenadas.
        └── universe/
            ├── Universe.js      # Gestor masivo del mundo. Decide qué sectores del espacio cargar o descargar de la RAM.
            └── Chunk.js         # Unidad local de espacio. Genera y contiene la malla de planetas (InstancedMesh), constelaciones y colorización HSL realista.
```

## Patrón de Diseño y Flujo de Datos

El proyecto utiliza un enfoque **Orientado a Módulos** y separación estricta de dominios:

1. **Configuración Cero-Acoplamiento (`Config.js`)**:
   - Todo el motor lee sus parámetros (velocidad, probabilidad de planetas, colores, FPS) desde `Config.js`. 
   - Modificar cualquier valor aquí altera dinámicamente la generación matemática y las físicas sin tener que buscar números mágicos dentro del código fuente.

2. **Inicialización Orquestada (`Engine.js`)**:
   - `main.js` arranca el `Engine.js`.
   - `Engine.js` crea todas las sub-instancias (`UIManager`, `LightingManager`, `Universe`, `SpaceControls`), pasándoles las referencias necesarias usando **Inyección de Dependencias** (por ejemplo, la `camera` o la `scene`).

3. **Ciclo de Vida (Game Loop)**:
   - `Engine.animate()` se ejecuta de forma síncrona con el VSync del monitor.
   - 1) Se actualizan los controles físicos (`controls.update()`) calculando la inercia.
   - 2) Se actualiza el mundo espacial (`universe.update()`) cargando/descargando chunks según la posición del jugador.
   - 3) Se actualizan los sistemas visuales dependientes (Luz ambiental, UI HUD y Etiquetas proyectadas 2D).
   - 4) Finalmente, se instruye a la GPU dibujar el frame final (`renderer.render()`).

## Principios para la Escalabilidad
- **Módulos Independientes**: Ningún sistema (ej. La Interfaz) contiene la lógica de generación del mundo. Todo está fragmentado.
- **Evitar Asignaciones en Tiempo Real (Zero-Allocation)**: El motor de dibujado recicla variables (como los `Vector3` o la UI usando `.textContent` en lugar de `innerHTML`) para evitar que el Recolector de Basura (*Garbage Collector*) sature el procesador.
- **Culling Dinámico**: Elementos a espaldas del jugador son descartados mediante `frustumCulled` antes de que toquen la tarjeta gráfica.
- **Aislamiento de Lógica**: Para expandir el juego con nuevas características (ej. Aterrizajes Planetarios), se recomienda crear una nueva carpeta especializada `js/world/surface` y gestionar sus estados dentro de `Engine` sin modificar la arquitectura espacial existente.
