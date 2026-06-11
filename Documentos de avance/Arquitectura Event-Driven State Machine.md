# Manifiesto de Arquitectura: Event-Driven State Machine (EDSSM)

Este documento sirve como la brújula inquebrantable del desarrollo de *Cosmos Explorer 3D*. Si en futuras iteraciones la conversación se vuelve densa o compleja, este manifiesto debe ser invocado para recuperar la dirección del proyecto y evitar volver al anti-patrón de desarrollo de "God Objects" (Monolitos).

## El Objetivo Absoluto
**Cero regresiones, cero monolitos, escalabilidad infinita.**
Cada pieza de código debe vivir en su compartimento aislado. Si eliminamos un archivo de UI, el motor físico no debería crashear. Si añadimos un Agujero Negro, la lógica de los planetas no debe enterarse.

---

## Las 5 Reglas de Oro Inquebrantables

### Regla 1: Interfaz de Usuario Ciega y Reactiva (Event-Driven)
**PROHIBICIÓN ESTRICTA:** Ningún sistema de renderizado, motor de física, estado de juego o entidad puede interactuar directamente con el DOM. No puedes usar `document.getElementById` ni actualizar HTML dentro del bucle de lógica de juego.
- **Cómo se hace:** La lógica emite "gritos al aire" mediante el `EventManager` (Ej. `EventManager.emit(EVENTS.PLAYER_HURT, damage)`). La UI (`UIManager.js` u `OSDManager.js`) "escucha" estos eventos y reacciona de forma autónoma.
- **Beneficio:** Si la UI falla, la simulación física y el progreso del jugador siguen intactos.

### Regla 2: El Engine.js No Piensa, Sólo Coordina
`Engine.js` ya no es el jefe que hace todo el trabajo. Es un mero coordinador de recursos.
- **Su única responsabilidad es:** Inicializar sistemas base (`RenderSystem`, `InteractionSystem`), instanciar estados, y cederles la batuta del bucle de actualización: `this.currentState.update(dt)`.
- Si necesitas añadir un if/else para verificar si el jugador está en el mapa, en la nave o en un planeta... **Detente.** Necesitas crear un nuevo `GameState`.

### Regla 3: Aislamiento por Estados (State Machine)
El ciclo de vida del jugador se divide en burbujas impermeables:
- `SpaceState`: Contiene todo lo que pasa en gravedad cero y vuelo de nave.
- `TerrainState`: Contiene todo lo que pasa a pie sobre un planeta.
- Si en el futuro añadimos un mapa galáctico interactivo, se creará un `GalaxyMapState`. 
- **Regla:** Ningún código del `SpaceState` debe infiltrarse ni ejecutarse en el `TerrainState`.

### Regla 4: Entidades Universales Orientadas a Objetos (OOP)
Los cuerpos espaciales no son simples literales JSON de datos. Son "Actores".
- Todos los astros del universo descienden de la clase maestra `CelestialBody.js`.
- Si agregamos planetas de agua, estrellas binarias o agujeros negros, extenderemos las clases (`Planet`, `Star`) o crearemos nuevas (`BlackHole extends CelestialBody`).
- Las entidades encapsulan sus propias reglas matemáticas (gravedad, órbitas, rotación) en sus métodos `update()`. El `Chunk` sólo las renderiza, no calcula su comportamiento.

### Regla 5: Sistemas Especializados Desacoplados
Todo lo que represente un mecanismo grueso que hace "una sola cosa y la hace muy bien" debe vivir en la carpeta `js/core/systems/`.
- ¿Detectar clics del usuario en planetas? `InteractionSystem.js`.
- ¿Configurar Three.js y WebGL? `RenderSystem.js`.
- Ningún sistema "System" debería gestionar estados de juego, y ningún "State" debería inicializar WebGL.

---

## Workflow: ¿Cómo Implementar una Función Nueva?

**Ejemplo: "Quiero que los meteoritos choquen contra la nave y bajen el escudo"**
1. **Lógica Física:** Creas un sistema `AsteroidSystem.js` o actualizas `SpaceState` para detectar colisiones.
2. **Matemáticas:** El asteroide será una nueva clase `Asteroid extends CelestialBody`.
3. **Daño:** Cuando chocan, `SpaceState` ejecuta: `EventManager.emit(EVENTS.SHIELD_DAMAGE, 15)`.
4. **Respuesta Visual:** En `UIManager.js`, tienes un `EventManager.on(EVENTS.SHIELD_DAMAGE)` que pone la pantalla roja en HTML.
5. **Consecuencias:** El Engine jamás supo que un asteroide dañó el escudo de la UI. Él solo corría el `update(dt)`. ¡Arquitectura limpia!
