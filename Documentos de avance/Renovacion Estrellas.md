# Proyecto: Renovación Visual de Estrellas (Star Overhaul)

## 1. Visión General
El objetivo de este documento es planificar la modernización visual de las estrellas en el motor espacial, pasando de simples *sprites* estáticos y planos a astros imponentes, dinámicos y tridimensionales. Gracias a la optimización previa de **Extreme Distance Culling**, la GPU tiene recursos suficientes para renderizar efectos avanzados exclusivamente en el sistema estelar local.

Esta implementación respetará estrictamente la **Arquitectura Event-Driven State Machine**:
*   **Separación de responsabilidades:** La configuración residirá en `Config.js`, la instanciación en `Chunk.js` (u objetos dedicados), y las actualizaciones dinámicas (como variables de tiempo para shaders) provendrán de `SpaceState.js` vía delegación, sin acoplar lógicas cruzadas.
*   **Gestión de Texturas y Assets:** Los materiales y shaders se declararán de forma compartida (Shared Materials) siempre que sea posible para mantener el uso bajo de memoria.

---

## 2. Fases de Implementación

### Fase 1: Núcleo Físico Tridimensional (3D Mesh Core)
**Objetivo:** Reemplazar el `THREE.Sprite` base de la estrella por una esfera poligonal pura.
*   **Archivos Afectados:** `Chunk.js`, `Config.js`.
*   **Lógica:** 
    *   Crear un `THREE.Mesh` usando `THREE.SphereGeometry` con un conteo de polígonos alto (ej. 64x64) para una silueta perfecta.
    *   Aplicarle un `THREE.MeshBasicMaterial` o `MeshStandardMaterial` con propiedades emisivas (brillo intrínseco), ajustado al color (`sunColor`) y radio procedural de la estrella.
    *   Mantener el Sprite actual pero enviarlo **detrás** de la esfera para que funja como la primera capa del resplandor exterior.

### Fase 2: Corona Solar Multi-Capa Animada
**Objetivo:** Simular un aura de plasma hirviente y rayos coronales expulsando energía.
*   **Archivos Afectados:** `Chunk.js` (creación y loop `update(dt)`).
*   **Lógica:**
    *   Instanciar 2 o 3 `THREE.Sprite` adicionales con mapas de opacidad/ruido por estrella.
    *   Cada capa de la corona tendrá una rotación inicial aleatoria y una escala superior al radio de la estrella.
    *   En `Chunk.update(dt)`, hacer que estas capas roten lentamente a velocidades independientes (ej. una en sentido horario, otra antihorario) e interpolar ligeramente su opacidad/escala usando funciones seno (`Math.sin()`) para crear un efecto de "latido".

### Fase 3: Superficie Animada de Plasma (Custom ShaderMaterial)
**Objetivo:** Darle vida a la superficie sólida del Núcleo 3D para que parezca lava/plasma en movimiento.
*   **Archivos Afectados:** `Chunk.js` (o un nuevo archivo de Shaders si se prefiere).
*   **Lógica:**
    *   Reemplazar el material plano de la Fase 1 por un `THREE.ShaderMaterial`.
    *   Escribir un **Vertex Shader** y un **Fragment Shader** simples basados en *Perlin Noise* o *Simplex Noise*.
    *   Configurar un *Uniform* de tiempo (`uTime`).
    *   En el bucle `update(dt)` del Chunk, incrementar el `uTime` del material para que las perturbaciones de la textura se desplacen fluidamente a través de los cuadros.

### Fase 4: Destellos Cinematográficos (Lens Flares)
**Objetivo:** Simular el deslumbramiento de la lente de la cámara (flare óptico) al mirar de frente a una estrella masiva.
*   **Archivos Afectados:** `index.html` (Import maps), `Chunk.js`.
*   **Lógica:**
    *   Añadir las importaciones necesarias desde `three/addons/objects/Lensflare.js` en el `importmap` del HTML.
    *   Cargar texturas de Lens Flare (pueden ser simples gradientes generados proceduralmente o texturas base).
    *   Acoplar el objeto `Lensflare` a la estrella activa (solo a la estrella principal o ambas si es binario).
    *   El motor de Three.js manejará automáticamente la oclusión, atenuando el destello si un planeta cruza por delante de la estrella.

---

## 3. Criterios de Rendimiento (Checklist)
- [ ] Asegurarse de que el `ShaderMaterial` de la Fase 3 utilice cálculos eficientes para ruido.
- [ ] Reutilizar la misma geometría de esfera para todas las estrellas y simplemente cambiar sus escalas.
- [ ] Asegurarse de que la propiedad `.visible = false` del culling oculte correctamente también a las coronas multi-capa y detenga la propagación de sus cálculos.
