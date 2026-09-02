# 🌌 Plan Maestro: Renovación de Agujeros Negros B2

Este documento define la reestructuración completa de los agujeros negros en el Space Exploration Engine, transformándolos de simples mallas primitivas a monstruos astrofísicos precisos y procedurales. Todo esto se implementará siguiendo de manera estricta el **Manifiesto EDSSM (Event-Driven State Machine)**.

---

## 1. Fundamentos Astrofísicos (Propiedades de Entidad)

Los agujeros negros se generarán proceduralmente basándose en físicas reales. Dependiendo de sus propiedades, su aspecto visual y su peligro cambiarán drásticamente.

### 1.1 Clasificación por Escala de Masa

* **Masa Estelar:** Restos de estrellas muertas. Pequeños pero con el gradiente gravitacional más mortífero (fuerza de marea extrema).
* **Masa Intermedia:** Raros, acechando en zonas aisladas.
* **Supermasivos (SMBH):** Millones de masas solares. Anclan el centro de cúmulos.
* **Hipermasivos (Titanes):** Anomalías del tamaño de sistemas solares (TON 618). Curvas de gravedad asintóticas que permiten cruzar el horizonte sin espaguetización inmediata.

### 1.2 Estados de Actividad y Alimentación

La apariencia y peligrosidad de la anomalía no dependerán de una paleta aleatoria, sino de un sistema dinámico basado en su **Tasa de Acreción** (cuánta materia devora):

* **Durmientes / Inactivos (Dormant):** Tasa de acreción = 0. No tienen disco de acreción ni brillo de plasma. Son monstruos invisibles y silenciosos. Solo podrás detectarlos si la luz de otras estrellas se dobla a su alrededor (Lente Gravitacional). Acercarse por accidente garantiza el pánico total.
* **Alimentación Lenta (Low Accretion):** Tasa de acreción baja. Tienen un disco de polvo y gas tenue, oscuro y de colores rojizos o anaranjados. Apenas emiten calor.
* **Activos (Active):** Tasa de acreción alta. Tienen un disco masivo, denso y ultra brillante (colores blancos o azulados debido a temperaturas de millones de grados).
* **Ultra Activos / Quásares:** Tasa de acreción extrema y espín altísimo. No solo tienen un disco brillante cegador, sino que disparan masivos **Jets Relativistas (Microquásares)** desde los polos magnéticos, barriendo sistemas enteros con radiación gamma que freirá los escáneres de tu nave a miles de unidades de distancia.

### 1.3 Atributos Procedurales (Variables Core)

El estado de vida se define internamente en la entidad matemática (`BlackHole.js`) por tres ejes absolutos:

1. **Masa ($M_\odot$):** Escala base (Desde estelares hasta hipermasivos).
2. **Momento Angular / Espín ($a$):** Rango de 0.0 (estático) a 1.0 (máxima rotación relativista). Determina el "Frame-dragging" (arrastre del espacio) y la forma del agujero.
3. **Tasa de Acreción:** Valor numérico que determina en cuál de los "Estados de Actividad" (Durmiente, Lento, Quásar) se encuentra actualmente la anomalía.

---

## 2. Telemetría y HUD (Métricas Reales)

La interfaz del jugador debe adaptar el escáner cuando enfoca una anomalía. Se sustituirán valores genéricos por:

* **Masa Solar:** X millones de $M_\odot$
* **Radio de Schwarzschild ($R_s$):** Borde del Horizonte de Eventos.
* **Límite de la Ergósfera:** Zona donde el espacio-tiempo es arrastrado inexorablemente.
* **Tasa de Acreción:** Nivel de actividad del disco.
* **Temperatura del Disco:** Millones de grados Kelvin (Emisión X).
* **Fuerza de Marea (Tidal Shear):** Medidor de peligro físico.

---

## 3. Plan de Reestructuración Arquitectónica (EDSSM)

La implementación actual viola las Reglas 1 y 5 del Manifiesto EDSSM al instanciar mallas y manipular DOM/Texturas dentro de la entidad matemática.

### Fase 1: Purificación de `BlackHole.js`

* **Meta:** Convertir `BlackHole.js` en una Entidad Pura de Datos.
* **Acción:** Eliminar todas las importaciones de `THREE.js`, `CanvasTexture` y `PlaneGeometry`. La clase solo calculará la Masa, Espín, Acreción y Fuerzas. No hará ningún renderizado.

### Fase 2: Delegación Visual (`Chunk.js` & Shaders)

* **Meta:** El motor gráfico debe crear las mallas basándose en la Entidad, como hace con los planetas.
* **Acción:** Crearemos un nuevo generador o extenderemos `Chunk.js` para que ensamble los `Mesh` usando materiales **ShaderMaterial**.
* **Shaders Planeados:**
  * **Lente Gravitacional (Lensing Shader):** Un material especial para el Horizonte de Eventos y el fondo estelar, distorsionando la luz trasera de acuerdo al campo gravitacional.
  * **Disco Relativista (Accretion Shader):** Un plano 3D que usa efecto Doppler (Beaming) matemático (Azul/brillante acercándose, Rojo/oscuro alejándose) en lugar de gradientes fijos.

### Fase 3: Ecosistemas Oscuros (Sistemas Planetarios)

* **Meta:** Los agujeros negros ya no deben ser zonas vacías por defecto.
* **Acción:** Modificar el `return;` en `Chunk.js` para permitir la generación de planetas (Mundos fracturados, Planetas de obsidiana, etc.) orbitando la anomalía a velocidades de vértigo.

### Fase 4: Física y Peligro (`SpaceState.js`)

* **Meta:** Hacer que orbitar o caer sea una experiencia inmersiva y peligrosa.
* **Acción:** Inyectar "Frame-dragging" a la velocidad de la nave dentro de la ergósfera. Expandir la lógica de `EVENTS.BLACKHOLE_PANIC` y programar un destino fatal real por espaguetización si se cruza el umbral de marea letal.
