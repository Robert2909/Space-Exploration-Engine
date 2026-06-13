# Manifiesto Maestro de Arquitectura: Event-Driven State Machine (EDSSM)

Este documento no es solo una guía, es el **CONTRATO ARQUITECTÓNICO INQUEBRANTABLE** del desarrollo de *Space Exploration Engine*. Cada línea de código escrita debe someterse al escrutinio de este manifiesto.

**DIRECTRIZ PRINCIPAL PARA IA:** Cuando este archivo sea citado en el prompt, debes asumir un modo de **máxima rigurosidad estructural**. Antes de escribir código, verifica mentalmente si tu solución rompe alguna de las reglas aquí expuestas. La limpieza arquitectónica y la mantenibilidad tienen prioridad absoluta sobre la rapidez de implementación.

---

## 1. El Objetivo Absoluto
**Cero regresiones, cero acoplamiento (Monolitos), escalabilidad infinita y ausencia de "God Objects".**
Cada pieza de código debe vivir en su compartimento hermético. Un cambio en la Interfaz de Usuario (HTML/CSS) jamás debe alterar la simulación física espacial. La adición de un nuevo tipo de entidad no debe requerir modificar el motor principal (`Engine.js`).

---

## 2. Las 6 Reglas de Oro Inquebrantables

### Regla 1: Interfaz de Usuario Ciega y Reactiva (Flujo Unidireccional)
- **PROHIBICIÓN ESTRICTA:** Ningún sistema de renderizado, control, motor físico, estado de juego o entidad puede interactuar directamente con el DOM. Queda estrictamente prohibido usar `document.getElementById`, `classList` o manipular estilos dentro de la lógica del juego.
- **Flujo Correcto:** La lógica emite telemetría empaquetada mediante el conducto oficial `EventManager` (Ej. `EventManager.emit(EVENTS.HUD_TERRAIN_UPDATED, payload)`). La capa de UI (`UIManager.js` / `OSDManager.js`) se encarga exclusivamente de escuchar estos eventos y reaccionar.
- **Restricción Inversa:** La UI jamás altera el estado del juego directamente. La interacción del usuario con la UI genera comandos o modifica inputs que los sistemas de interacción interpretan.

### Regla 2: El `Engine.js` Es un Coordinador, No un Ejecutor
- `Engine.js` es el director de la orquesta, no toca los instrumentos.
- **Su única responsabilidad es:** Inicializar sistemas base (`RenderSystem`, `InteractionSystem`), gestionar el bucle de tiempo (`requestAnimationFrame`), instanciar estados y delegar la ejecución: `this.currentState.update(dt)`.
- **PROHIBIDO:** Añadir lógica de juego, condicionales masivos (`if (enPlaneta) {} else if (enEspacio) {}`), o manipulación directa de entidades en el `Engine`.

### Regla 3: Aislamiento Estricto por Estados (State Pattern)
El ciclo de vida del jugador se divide en burbujas impermeables de la clase abstracta `GameState.js`:
- `SpaceState`: Todo lo relativo al vuelo libre, gravedad cero y órbitas.
- `TerrainState`: Todo lo relativo a físicas locales, gravedad planetaria y caminata.
- **Regla:** Un estado no sabe de la existencia del otro. No comparten variables globales. Al hacer la transición (ej. Aterrizar), el motor llama a `currentState.exit()`, limpia el mundo activo, y llama a `newState.enter(payload)` transfiriendo solo un objeto matemático estricto (`payload`).

### Regla 4: Prevención de Memory Leaks y "Entities Fantasmas"
Todo estado (`GameState`), sistema o control **DEBE** implementar y utilizar rigurosamente métodos de limpieza (`dispose()`, `exit()`).
- Al entrar a un estado en `enter()`, debes asegurarte proactivamente de que no queden referencias a objetos de ejecuciones anteriores (ej. `this.shipEntity = null`).
- Al salir de un estado en `exit()`, debes remover TODA malla de la escena (`scene.remove()`), liberar geometrías/materiales si no se usarán, y destruir eventos locales.
- **Un bug que causa "no apareció la entidad" usualmente significa que no limpiaste bien el estado anterior.**

### Regla 5: Entidades Universales Orientadas a Objetos (OOP)
Los objetos del mundo no son diccionarios JSON vagos, son instancias de clases.
- **Herencia Estricta:** Todo astro desciende de `CelestialBody.js`. Toda entidad física viva u operable debe instanciar una clase en `world/entities/`.
- **Encapsulamiento:** Las entidades encapsulan su propia matemática (ej. `alignToTerrain()`, `updateOrbit()`). El `Engine` o el `State` no hace las matemáticas de la entidad, simplemente llama al método de la entidad para que esta se actualice a sí misma.

### Regla 6: Gestión Estricta de Archivos y Carpetas
La proliferación de monolitos ocurre cuando, por pereza o descuido, se inyecta lógica nueva en un archivo existente en lugar de crear uno nuevo. **Cada archivo debe tener una única responsabilidad (Single Responsibility Principle).**
- **Regla de Creación:** Si vas a añadir un sistema, entidad o control que requiere más de 50 líneas de lógica aislada o que maneja un concepto enteramente nuevo (ej. "Gestión de Inventario", "Generación de Nubes", "Sistema de Daño"), **ESTÁS OBLIGADO a crear un archivo nuevo** en la carpeta correspondiente. NO infles archivos existentes.
- **Estructura Taxonómica Inviolable:**
  - `/js/core/`: Motores principales (`Engine.js`), Gestor de Eventos (`EventManager.js`), Configuración Global (`Config.js`). **Prohibido añadir lógicas de juego aquí.**
  - `/js/core/systems/`: Subsistemas desacoplados que hacen una tarea transversal (Renderizado, Raycasting, Día/Noche, Clima). 
  - `/js/core/states/`: Lógica de comportamiento de los modos de juego (espacio, terreno, mapa).
  - `/js/player/`: Físicas, inputs y cámaras del jugador. Cada modo de movimiento debe tener su propia carpeta y archivos (ej. `/player/terrain/TerrainControls.js`).
  - `/js/ui/`: Manipulación exclusiva del DOM, gestores de interfaces, menús. No debe haber NADA de THREE.js aquí.
  - `/js/world/`: Generación procedimental (`Universe`, `Chunk`, `TerrainManager`).
  - `/js/world/entities/`: Toda clase que represente un actor 3D tangible (Nave, Asteroide, Base, Árbol). **Cada entidad debe tener su propio archivo.**

### Regla 7: Erradicación de "Números Mágicos"
Queda prohibido hardcodear números directamente en la matemática de la simulación o la UI (ej. `if (distancia > 5000)` o `velocidad = 25`).
- **Solución:** Todos los umbrales, factores de escala, velocidades base, colores por defecto y límites matemáticos DEBEN estar centralizados en `js/core/Config.js`.
- **Beneficio:** Si queremos que el juego sea más rápido o más lento, basta con cambiar un solo archivo y no buscar entre cientos de scripts.

### Regla 8: Convenciones de Nomenclatura Extremas
El código debe leerse como un manual técnico predecible:
- **PascalCase** (`SpaceControls`, `TerrainManager`, `ShipEntity`): EXCLUSIVO para clases (POO) y constructores.
- **camelCase** (`playerVelocity`, `updateOrbit()`, `planet`): Para instancias de clases, funciones y variables locales.
- **SCREAMING_SNAKE_CASE** (`EVENTS.HUD_UPDATED`, `Config.PLAYER_SPEED_MAX`): EXCLUSIVO para Constantes, Eventos y variables de configuración estáticas.
---

## 3. Workflow Maestro: Guía de Implementación Segura

**CÓMO AÑADIR UNA FUNCIÓN SIN ROMPER NADA (Ejemplo: "Quiero una barra de oxígeno en el planeta"):**

1. **Diseño de Interfaz (HTML/CSS):** Añade la barra visual en `index.html` y dótale de estilo con transiciones CSS nativas en `styles.css`.
2. **Registro de Comunicación:** Ve a `EventManager.js` y añade una constante nueva, ej: `EVENTS.HUD_OXYGEN_UPDATED`.
3. **Escucha y Reacción (UI):** En `UIManager.js`, añade un listener `EventManager.on(EVENTS.HUD_OXYGEN_UPDATED, (payload) => { ... })` que modifique el ancho de tu barra en el DOM basándose en el `payload`.
4. **Lógica de Simulación:** Dentro de los controles o sistemas pertinentes (ej. `TerrainControls.js` o un nuevo `OxygenSystem.js`), calcula el oxígeno restante en cada frame `update(dt)`.
5. **Emisión de Datos:** Lanza el dato al aire llamando a `EventManager.emit(EVENTS.HUD_OXYGEN_UPDATED, { oxPct: 45 })`.
6. **Verificación Mental:** 
   - *¿El TerrainControl sabe algo sobre HTML?* NO. 
   - *¿Si falla el CSS o quito el div, se rompe el juego de oxígeno?* NO.
   - *¿El oxígeno persiste si despego de vuelta al espacio?* DEBE limpiarse en el `exit()` del `TerrainState`.

---

## 4. Cláusula de Seguridad para la IA
Cuando se solicite un refactor, una limpieza, "robustecer" el código o implementar sistemas nuevos:
1. **Evalúa si necesitas un archivo nuevo:** Antes de modificar un script, pregúntate si la nueva característica amerita su propia clase o módulo. Si es así, **créalo**. No engordes clases existentes convirtiéndolas en "God Objects".
2. **Nunca combines archivos.** Mantén la segregación arquitectónica de responsabilidades al máximo nivel.
3. Si tienes dudas entre hacer un parche rápido que rompe la arquitectura o una solución elegante pero más extensa (involucrando la creación de nuevos archivos y sistemas de eventos), **elige SIEMPRE la solución elegante y modular**. El usuario prefiere esperar más a tener código "sucio".
4. Busca de manera implacable código viejo que interactúe directamente con el DOM en scripts no-UI y conviértelo a Eventos incondicionalmente.
5. **Regla del Boy Scout (Refactorización Proactiva):** Si al modificar un archivo notas que existen *números mágicos* o nombres de variables que rompen las Reglas 7 y 8, o una lógica sucia, DEBES corregirlo proactivamente en ese mismo cambio. No ignores el código basura circundante.
