# Plan de Refactorización a Event-Driven State Machine (EDSSM)

Este documento sirve como la hoja de ruta paso a paso para refactorizar la arquitectura del Space Exploration Engine sin romper el código estable existente. 
El objetivo es migrar de un diseño "God Object" (Engine.js) a un sistema desacoplado basado en Eventos, Máquina de Estados y Programación Orientada a Objetos.

## Estrategia de Preservación de Micro-Detalles (Cero Regresión)
Durante el desarrollo se crearon funciones milimétricas (suavizado de cámara, prevención de tirones de PointerLock, aterrizaje asíncrono preventivo, etc.). Para garantizar que ninguna de estas micro-funciones se pierda:
1. **Regla de No-Reescritura:** Durante la refactorización, **ESTÁ PROHIBIDO** reescribir algoritmos matemáticos o lógica de físicas. El código existente se cortará y se pegará de forma literal en sus nuevos contenedores.
2. **Re-enrutamiento, no Re-creación:** Solo cambiaremos de dónde vienen los datos (entradas) y hacia dónde van (salidas). La "caja negra" del medio se mantiene intacta.
3. **Auditoría de Bloques:** Antes de extraer un bloque de `Engine.js`, se documentará línea por línea qué variables de estado toca para asegurar que su nuevo entorno (ej. `TerrainState`) tenga acceso a esas mismas referencias exactas.

---

## FASE 1: Cimientos del Framework (Infraestructura Segura)
*El objetivo aquí es crear las herramientas arquitectónicas sin tocar la lógica del juego.*

1.  **Crear `EventManager.js` (Event Bus):**
    *   Implementar un patrón Pub/Sub clásico (`on`, `off`, `emit`).
    *   Establecer un diccionario de eventos constantes (ej. `EVENTS.TARGET_CHANGED`, `EVENTS.PLAYER_LANDED`).
2.  **Crear Interfaz `GameState.js` (State Machine Base):**
    *   Clase base con métodos vacíos: `enter()`, `update(dt)`, `exit()`.

## FASE 2: Desacoplamiento de la Interfaz (UI)
*El objetivo es eliminar las referencias directas entre Engine y OSDManager.*

1.  **Modificar `OSDManager.js`:**
    *   Hacer que escuche pasivamente al `EventManager` en lugar de requerir que el `Engine` llame a sus métodos de actualización.
2.  **Modificar `Engine.js` (Targeting):**
    *   Cambiar las llamadas directas de actualización de UI por la emisión de eventos (`EventManager.emit(EVENTS.TARGET_CHANGED, target)`).
    *   *Verificación conceptual:* Si borramos el OSDManager, el Engine no debería dar error de "undefined".

## FASE 3: Segregación OOP del Universo
*El objetivo es estandarizar todos los objetos espaciales bajo una misma familia lógica.*

1.  **Crear `CelestialBody.js` (Clase Padre):**
    *   Definir propiedades comunes: `id`, `name`, `type`, `mass`, `position`, `mesh`.
    *   Definir métodos comunes: `update(dt)`, `getDistanceTo(vector)`.
2.  **Refactorizar Generadores Actuales:**
    *   Hacer que `Planet` (dentro de `PlanetGenerator`) y `Star` (dentro de `StarGenerator`) extiendan de `CelestialBody`.
    *   Asegurar que el sistema de Órbitas siga funcionando utilizando métodos heredados.

## FASE 4: La Máquina de Estados (El Gran Salto)
*El objetivo es vaciar el bucle de actualización del `Engine.js` delegando la lógica.*

1.  **Crear `SpaceState.js`:**
    *   Mover toda la lógica de control de nave espacial, piloto automático y generación de sectores universales aquí.
2.  **Crear `TerrainState.js`:**
    *   Mover toda la lógica de gravedad en el terreno, caminata, controles FPS y renderizado atmosférico aquí.
3.  **Refactorizar `Engine.js`:**
    *   El bucle `update(dt)` ahora solo llamará a `this.currentState.update(dt)`.
    *   La transición de espacio a terreno será manejada cambiando de estado y emitiendo un evento `EVENTS.STATE_CHANGED`.

## FASE 5: Extracción de Subsistemas
*El objetivo es reducir `Engine.js` a su mínima expresión (Solo un inicializador).*

1.  **Crear `RenderSystem.js`:**
    *   Extraer la inicialización de Three.js (Scene, Camera, WebGLRenderer, Resize handling).
2.  **Crear `InteractionSystem.js`:**
    *   Extraer el Raycaster y la lógica matemática de selección de objetivos y detección de clics.

---

### Criterios de Éxito
Al finalizar este plan, el comportamiento del juego deberá ser **100% idéntico visual y mecánicamente** al commit original, pero con un código base preparado para la Expansión Universal A1.
