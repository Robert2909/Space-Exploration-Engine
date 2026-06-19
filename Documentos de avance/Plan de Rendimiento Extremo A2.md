# Plan de Rendimiento Extremo A2 (Haciendo el Costal más Grande)

Tras haber consolidado con éxito la Fase A1 y establecido firmemente la @[Documentos de avance/Arquitectura Event-Driven State Machine.md] (EDSSM), el motor principal de *Space Exploration Engine* se encuentra en un estado funcional maduro, con controles de espacio y terreno pulidos, y una interfaz de usuario completamente manejada por eventos.

El objetivo de la **Fase A2** no es añadir mecánicas de juego nuevas, sino desbloquear el verdadero potencial de cálculo de los equipos modernos rompiendo las limitaciones nativas de un solo hilo (Single-Thread) del navegador y mitigando la saturación del recolector de basura (Garbage Collector).

Este plan debe ejecutarse bajo el estricto cumplimiento de la **Regla 4 (Prevención de Memory Leaks)** y **Regla 6 (Gestión Estricta de Archivos)** de nuestra arquitectura EDSSM.

---

## FASE 1: Object Pooling Inmediato (La Victoria Rápida)
El Recolector de Basura (V8 Garbage Collector) causa micro-tirones y caídas repentinas de fotogramas cuando el navegador tiene que detenerse a barrer miles de variables temporales instanciadas en milisegundos.

**Objetivo:** Erradicar la creación de objetos matemáticos dinámicos dentro de los bucles de renderizado (`render`), controladores (`update`) y raycasting.
**Ejecución:**
1. Rastrear exhaustivamente métodos como `update(dt)`, `attemptTargeting()`, `attemptLandingZone()` y los bucles internos en `TerrainManager.js` y controles.
2. **PROHIBIR** el uso de constructores volátiles como `new THREE.Vector3()`, `new THREE.Quaternion()`, o `new THREE.Matrix4()` dentro de estas funciones que corren a 60 FPS.
3. Crear variables temporales locales en la definición de la clase (ej. `this._tmpVec = new THREE.Vector3()`) inicializadas una sola vez en el `constructor()`.
4. Reutilizar estos vectores aplicando métodos de mutación directa (`.copy()`, `.subVectors()`, `.applyQuaternion()`, `.set()`).
5. *Cumplimiento EDSSM:* Esto fortalece la Regla 4, garantizando que los objetos pesados viven ligados al ciclo de vida de su clase y son eliminados limpiamente durante un `dispose()`.

---

## FASE 2: Web Workers (Desbloqueo Multi-Núcleo)
Actualmente, generar un chunk de terreno y calcular su relieve con ruido Perlin congela el hilo principal (Main Thread), arrebatándole fotogramas al renderizador. JavaScript solo usa un núcleo de la CPU por defecto.

**Objetivo:** Trasladar la generación matemática masiva (Terreno y Universo procedural) a hilos paralelos en la CPU.
**Ejecución:**
1. Implementar la Regla 6 creando una nueva estructura segregada dedicada exclusivamente a cálculos: `/js/world/workers/`.
2. Escribir un `TerrainWorker.js` que no posea referencias al DOM, la UI ni THREE.js puro. Debe ser un procesador de datos que reciba una petición (`payload`: semilla, coordenadas, resolución) y ejecute todo el ruido fractal pesado.
3. El Worker debe devolver un arreglo tipado plano (`Float32Array` con posiciones, normales, etc.) al hilo principal.
4. El hilo principal instanciará la malla (Mesh) únicamente cuando reciba los datos de vuelta. Mientras tanto, el motor seguirá renderizando sin pausas.
5. *Cumplimiento EDSSM:* Estrictamente alienado con la Regla 3 (Aislamiento). El Worker es una entidad de cálculo pura, ciega al motor visual y la UI.

---

## FASE 3: Aislamiento de Origen y SharedArrayBuffer
Transferir un `Float32Array` con miles de vértices entre el Web Worker y el Hilo Principal conlleva un costo por clonación (PostMessage Copy). Queremos acceso instantáneo a la memoria RAM compartida.

**Objetivo:** Permitir a ambos hilos leer y escribir sobre la misma porción de memoria simultáneamente sin clonación.
**Ejecución:**
1. Configurar el servidor local de desarrollo (Live Server / Node.js) para inyectar *Headers* estrictos de seguridad HTTP:
   - `Cross-Origin-Opener-Policy: same-origin`
   - `Cross-Origin-Embedder-Policy: require-corp`
2. Refactorizar la comunicación de los Web Workers (Fase 2) para inicializar bloques de `SharedArrayBuffer` al arrancar el motor.
3. El Worker escribirá el relieve directamente en este búfer, y el hilo principal en `TerrainManager.js` lo vinculará directamente a un `THREE.BufferAttribute`. No hay demoras en el traspaso.
4. *Cumplimiento EDSSM:* Evolución perfecta de la transferencia por `payloads` eficientes y puros de la Arquitectura.

---
---

## PLAN A MUY LARGO PLAZO: WebAssembly (WASM)
*(AVISO DE SEGURIDAD ARQUITECTÓNICA: Este paso queda formalmente postergado de manera indefinida. No debe abrirse a menos que los Puntos 1, 2 y 3 hayan sido exprimidos al máximo, el diseño requiera cálculos atmosféricos o fluidos volumétricos hiper-realistas, y el ruido Perlin en JavaScript pruebe ser un cuello de botella infranqueable).*

**Objetivo Futuro:** Compilar cálculos fractales críticos a lenguaje nativo (C++/Rust) para rebasar el límite de velocidad de JavaScript.
**Ejecución Teórica:**
1. Extraer los algoritmos matemáticos más pesados de la generación planetaria.
2. Reescribirlos en lenguajes de bajo nivel compilados.
3. Inyectar los binarios `.wasm` instanciándolos dentro del Web Worker.
4. Interactuar con las memorias `SharedArrayBuffer` directamente desde C++/Rust para un rendimiento que compita con motores de juego de escritorio AAA.
