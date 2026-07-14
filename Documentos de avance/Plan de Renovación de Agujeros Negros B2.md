# 🌌 Plan Maestro: Renovación de Agujeros Negros B2

Este documento define la reestructuración completa de los agujeros negros en el Space Exploration Engine, transformándolos de simples mallas primitivas a anomalías astrofísicas precisas y procedurales regidas por el **Manifiesto EDSSM (Event-Driven State Machine)**.

---

## 1. Orden Lógico de Generación y Ecuaciones Core
Siguiendo la Regla 5 del EDSSM, `BlackHole.js` debe procesar matemáticamente su estado interno en un orden estricto de dependencias físicas para evitar inconsistencias (e.g. un disco súper caliente sin acreción).

### 1.1 Orden de Cálculo (Seed Pipeline)
1.  **Masa Base ($M$):** Se calcula primero. Es la constante reina de la que deriva casi todo.
2.  **Radio de Schwarzschild ($R_s$):** Derivado puramente de la Masa. Define el tamaño físico del horizonte.
3.  **Espín / Momento Angular ($a$):** De `0.0` a `1.0`. Define el tamaño de la Ergósfera y el ISCO.
4.  **Tasa de Acreción ($\dot{M}$):** Determina cuánta materia está cayendo.
5.  **Órbita Circular Estable Más Interna (ISCO):** Depende de la Masa y el Espín. Marca el fin del disco de acreción.
6.  **Temperatura del Disco y Jets:** Derivados de la Masa, Espín y Acreción.

### 1.2 Rangos y Clasificaciones Realistas
*   **Masa Estelar (Stellar-Mass):** 3 a 100 $M_\odot$. Radios en el rango de kilómetros a decenas de kilómetros. Temperaturas de disco altísimas (Emisión X).
*   **Masa Intermedia:** 100 a $10^5$ $M_\odot$. Los eslabones perdidos, radios de cientos a miles de kilómetros.
*   **Supermasivos (SMBH):** $10^5$ a $10^9$ $M_\odot$. Centros galácticos. Radios de millones de kilómetros.
*   **Hipermasivos (Titanes):** > $10^9$ $M_\odot$. Bestias abisales. Los discos de estos titanes emiten más en el espectro visible/UV que en Rayos X porque la materia está menos comprimida en el borde.

---

## 2. Validaciones Físicas Restrictivas (If X, Not Y)
Para evitar los errores lógicos del pasado (como planetas helados pegados a una estrella), se aplicarán los siguientes candados físicos:

*   **Regla del Disco (Acreción vs Visuales):** Si la *Tasa de Acreción* es `< 0.05`, **NO** se dibuja disco de acreción ni se emite luz. El agujero es "Durmiente" (Dormant).
*   **Regla de Emisión de Jets:** Los Quásares/Microquásares solo pueden disparar Jets Relativistas desde sus polos **SI Y SOLO SI** tienen una *Tasa de Acreción* `> 0.8` Y un *Espín* `> 0.7`. Un agujero no puede disparar jets si no rota rápido o si no tiene qué comer.
*   **Regla del ISCO (Innermost Stable Circular Orbit):** Ningún planeta ni partícula del disco de acreción puede existir por debajo del radio ISCO. Si *Espín* = 0, el ISCO está a $3 R_s$. Si *Espín* = 1 (Kerr extremo), el ISCO se encoge a $0.5 R_s$ (la materia puede orbitar rozando el horizonte).
*   **Regla de Gravedad (Marea):** Los agujeros de masa estelar matan (espaguetizan) al jugador **mucho antes** de llegar al horizonte. Los hipermasivos permiten cruzar el horizonte sin daño de marea inmediato (la muerte llega adentro).

---

## 3. Ecosistemas Oscuros: Sistemas Planetarios
El generador en `Chunk.js` ya no cancelará la creación planetaria. Sin embargo, generar planetas alrededor de un Agujero Negro requiere matemáticas distintas a las de las Estrellas:

### 3.1 Condiciones de Sobrevivencia Planetaria
*   **Órbitas Relativistas:** Los planetas orbitan a velocidades brutales (fracciones significativas de $c$). El cálculo de `orbitSpeed` debe reflejar la masa titánica.
*   **Distancia Mínima Segura:** Los planetas solo pueden generarse mucho más allá del Límite de Roche y del límite exterior de radiación extrema.
*   **Tipos de Planetas Permitidos:** Queda estrictamente prohibido generar *Planetas Océano*, *Mundos Edénicos* o *Planetas Prístinos*. Solo se permite el spawn de biomas muertos o extremos: *Mundos Fracturados*, *Planetas Metálicos*, *Desiertos Alcalinos*, *Planetas de Obsidiana* o *Gigantes de Materia Oscura*.
*   **Iluminación del Sistema:**
    *   Si el agujero negro está *Durmiente*, no emite luz (`sunColor = null`). Los planetas estarán en oscuridad total, siendo iluminados únicamente por la linterna de la nave.
    *   Si es *Activo / Quásar*, el disco de acreción actúa como una estrella, bañando el sistema en luz dura, azul/blanca.

---

## 4. Telemetría y UI (Métricas en `UIManager.js`)
El HUD del jugador se adaptará usando el sistema de eventos de la Arquitectura EDSSM (`EVENTS.TARGET_CHANGED`). Se expondrán variables reales de la anomalía:

1.  **Masa Solar:** (Ej. $4.2 \times 10^6 M_\odot$).
2.  **Radio Schwarzschild ($R_s$):** Punto de no retorno absoluto.
3.  **Radio Ergósfera:** Frontera donde ocurre el arrastre del espacio-tiempo (Frame-dragging).
4.  **Tasa de Acreción:** Porcentaje de actividad o flujo de materia.
5.  **Momento Angular (Espín):** Nivel de rotación de 0 a 1.
6.  **Gravedad de Marea:** Medidor de peligro de espaguetización local en la posición de la nave.
7.  **Temperatura del Borde Interior:** Emisión térmica del disco en millones de K.

---

## 5. Arquitectura e Implementación (Fases EDSSM)

### Fase 1: Entidad Pura (`BlackHole.js`)
*   Se eliminará todo `THREE.js` de su código base.
*   Se programarán las matemáticas para deducir el ISCO, Ergósfera, Radio y Marea usando las constantes universales abstraídas (G, c).

### Fase 2: Delegación y Shaders Visuales
*   Un `BlackHoleMeshBuilder` o `Chunk.js` ensamblará las mallas.
*   Se crearán `LensingShader` (distorsión espacial) y `AccretionDiskShader` (Efecto Doppler relativista).

### Fase 3: Generación del Sistema y Planetas
*   Se modificará `Chunk.js` y las variables de entorno de los planetas (`sunColor`) para adaptar la presencia de luz de acreción o su ausencia (oscuridad total).

### Fase 4: Integración al `SpaceState.js`
*   Inyección de inercias mortales, gravedad de marea letal y frame-dragging forzoso a la nave. Reacción de pánico y eventos de HUD.
