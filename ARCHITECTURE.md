# Cosmos Explorer 3D - Documentación de Arquitectura

Este documento describe la estructura y arquitectura modular del proyecto Cosmos Explorer 3D, diseñado para ser altamente escalable y evitar el acoplamiento de código ("código espagueti") a medida que se añaden nuevas funcionalidades.

## Estructura de Directorios

```text
/
├── index.html            # Punto de entrada HTML, contiene el HUD y el Canvas.
├── css/
│   └── styles.css        # Estilos visuales del juego y UI.
└── js/
    ├── main.js           # Entry point JS. Solo se encarga de inicializar el Motor.
    ├── core/
    │   └── Engine.js     # Motor principal. Instancia Three.js, la escena, el bucle de renderizado y une los sistemas.
    ├── graphics/
    │   └── LightingManager.js # Gestor de iluminación. Optimiza el rendimiento gestionando la luz dinámica (LOD).
    ├── player/
    │   └── SpaceControls.js   # Sistema de controles físicos del jugador (Vuelo espacial, 6DOF, inercia).
    ├── ui/
    │   └── UIManager.js  # Gestor de interfaz gráfica, superposiciones de HTML y etiquetas 3D proyectadas en 2D.
    ├── utils/
    │   └── MathUtils.js  # Funciones matemáticas de utilidad global (ej. Generación Pseudoaleatoria por Semilla).
    └── world/
        ├── generators/
        │   └── NameGenerator.js # Sistema procedural para crear nombres de estrellas y planetas según coordenadas.
        └── universe/
            ├── Universe.js      # Gestor masivo del mundo. Decide qué sectores del espacio cargar o descargar de la RAM.
            └── Chunk.js         # Unidad local de espacio. Genera y contiene la malla de planetas (InstancedMesh) y estrellas.
```

## Patrón de Diseño y Flujo de Datos

El proyecto utiliza un enfoque **Orientado a Módulos** y separación de dominios:

1. **Inicialización**:
   - `main.js` crea una instancia de `Engine.js`.
   - `Engine.js` crea todas las sub-instancias (`UIManager`, `LightingManager`, `Universe`, `SpaceControls`), pasándoles las referencias necesarias (por ejemplo, la `camera` o la `scene`).
2. **Ciclo de Vida (Game Loop)**:
   - `Engine.animate()` se ejecuta a 60 FPS mediante `requestAnimationFrame`.
   - Primero se actualizan los controles (`controls.update()`) calculando la física.
   - Luego se actualiza el mundo (`universe.update()`) basándose en la nueva posición de la cámara.
   - Después se actualizan los sistemas periféricos (HUD, Etiquetas, Luces).
   - Finalmente, se dibuja el cuadro (`renderer.render()`).

## Principios para la Escalabilidad
- **Módulos Independientes**: Ningún sistema (ej. La Interfaz) contiene la lógica de generación del mundo.
- **Inyección de Dependencias Simple**: El motor de juego inyecta el `scene` o `camera` en las clases secundarias para evitar variables globales inmanejables.
- **Aislamiento de Lógica**: Para expandir el juego con nuevas características (ej. Aterrizajes Planetarios), se recomienda crear una nueva carpeta `js/world/surface` y gestionar sus estados dentro de `Engine` sin modificar el código espacial existente.
