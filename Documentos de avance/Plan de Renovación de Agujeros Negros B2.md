# 🌌 Plan Maestro: Agujeros Negros Físicamente Precisos (Rework B2 — Iteración 2.1)

Este documento constituye el **Diseño Técnico Definitivo y Corregido** para la implementación de agujeros negros hiperrealistas en *Space Exploration Engine*. Tras la evaluación empírica de la versión preliminar y el análisis de fallas visuales observadas en vuelo cercano, este plan unifica la simulación física fundamentada en la **Relatividad General**, la **Métrica de Kerr** y la **Termodinámica de Discos de Acreción (Novikov-Thorne)**, resolviendo de raíz el desacople entre el lente gravitacional y el disco de acreción, garantizando **60 FPS estables** y cumpliendo estrictamente con el **Manifiesto EDSSM (Event-Driven State Machine)**.

---

## 0. Diagnóstico Post-Mortem: Causa Raíz de la Ruptura Visual

La evaluación de las capturas en vuelo cercano reveló anomalías severas al reincorporar el disco de acreción:
1. **Doble silueta / Círculos negros solapados:** En pantalla aparecían dos horizontes negros desfasados, asemejando dos lunas oscuras interceptadas.
2. **Esfera de fotones y arcos desmembrados:** Los anillos luminosos del lente gravitacional aparecían desgarrados, flotando en el vacío fuera del eje central del agujero negro.
3. **Múltiples centros de oclusión:** El disco de acreción mostraba un orificio central en una coordenada, mientras que la sombra de Kerr y el lente aparecían desplazados en otra.

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                       ANATOMÍA DE LA FALLA PRELIMINAR                        │
└──────────────────────────────────────────────────────────────────────────────┘
  Malla 1 (Lensing Sphere): Shader en espacio de vista (Normal polar Y)
           vs
  Malla 2 (TorusGeometry): Geometría 3D en plano XY (Normal polar Z)
           +
  Rotación errática en CPU: sys.diskMesh.rotation.z -= dt (Cambiaba el Euler 3D)
           +
  Doble agujero negro: Orificio del toroide (R_isco) + Silueta del Shader (R_shadow)
           │
           ▼
  [RESULTADO]: Desincronización de matrices, ruptura del anillo de fotones y
               artefactos de oclusión que destruyeron el efecto visual perfecto.
```

### Principales Causas Técnicas Identificadas:
* **Discordancia de Espacios de Coordenadas:** `TorusGeometry` en Three.js se genera de forma nativa sobre el plano **XY** (eje de simetría $Z$), mientras que el shader de lente gravitacional y los jets polares asumían un plano ecuatorial **XZ** (eje de simetría $Y$). Al aplicar la inclinación estelar mediante Euler, ambas mallas divergían geométricamente.
* **Nutación Espuria en CPU:** Al ejecutar `sys.diskMesh.rotation.z -= dt` en `Chunk.js` sobre una malla ya orientada mediante ángulos de Euler tridimensionales, no se rotaba el disco sobre su eje normal, sino que se inducía una precesión/bamboleo orbital excéntrico, desplazando el centro visual del disco respecto al centro del horizonte.
* **Duplicación de Oclusiones:** La coexistencia de un toroide físico 3D con un hueco interior en $R_{isco}$ y una esfera de horizonte con shader de curvatura provocó que el fondo del espacio se colara por el hueco del toroide mientras la esfera proyectaba su sombra en otro punto de la proyección de cámara.
* **Pérdida de la Coherencia Óptica del Lente:** La versión de lente que el usuario calificó como "perfecta" dependía de una deflexión gravitacional analítica en espacio de vista ($1 / (normDist^2 + 0.01)$ con *frame-dragging swirl*). Intentar sustituirla o forzarla a interactuar con geometrías poligonales no curvadas rompió la curvatura continua de la luz.

### Regla de Oro B2.1: Principio de Autoridad Óptica Unificada
> **La sombra aparente ($R_{shadow}$), el anillo de fotones ($R_{ph}$), la deflexión gravitacional del fondo estelar y la proyección relativista del disco de acreción (arcos superior e inferior de Gargantúa) DEBEN calcularse dentro de un único pipeline óptico coherente.**
> Queda terminantemente prohibido utilizar toroides o mallas externas flotantes que atraviesen el radio de influencia del lente gravitacional sin curvatura geodésica.

---

## 1. Fundamentos de Astrofísica Relativista (Métrica de Kerr)

Según el **Teorema de No-Pelo**, un agujero negro sin carga electrostática ($Q = 0$) queda matemáticamente definido en su totalidad por dos variables fundamentales:

1. **Masa Gravitatoria ($M$):** Medida en Masas Solares ($M_\odot \approx 1.989 \times 10^{30}\text{ kg}$).
2. **Momento Angular / Espín Adimensional ($a$):** Rango $a \in [0.0, 0.998]$. Representa la velocidad de giro relativista del espacio-tiempo ($a = \frac{J \cdot c}{G M^2}$). El límite teórico de Thorne establece un tope de $0.998$ debido a la contrapresión de radiación del disco.

```
                          ┌──────────────────────────┐
                          │    Semilla del Sector    │
                          └─────────────┬────────────┘
                                        │
                 ┌──────────────────────┴──────────────────────┐
                 ▼                                             ▼
       ┌───────────────────┐                         ┌───────────────────┐
       │     Masa (M)      │                         │     Espín (a)     │
       └─────────┬─────────┘                         └─────────┬─────────┘
                 │                                             │
                 ├──────────────────────────────┬──────────────┤
                 ▼                              ▼              ▼
       ┌───────────────────┐          ┌───────────────────┐   ┌───────────────────┐
       │ Horizonte Eventos │          │    Ergósfera      │   │  ISCO (Borde int) │
       │     R+ (a, M)     │          │   R_ergo(θ, a)    │   │     R_isco(a)     │
       └─────────┬─────────┘          └───────────────────┘   └─────────┬─────────┘
                 │                                                      │
                 ▼                                                      ▼
       ┌───────────────────┐                                  ┌───────────────────┐
       │  Sombra Aparente  │                                  │ Termodinámica del │
       │     R_shadow      │                                  │  Disco T(r, M, Ṁ) │
       └───────────────────┘                                  └───────────────────┘
```

---

### 1.1 Radios y Fronteras Geométricas Absolutas

Todas las distancias se computan en unidades del motor ($U$), donde $1\ U \approx 10\text{ km}$, escaladas astrofísicamente para presencia visual cósmica:

#### 1. Radio del Horizonte de Eventos Exterior ($R_+$)

Frontera de no retorno absoluto donde la velocidad de escape iguala a $c$:

$$
R_+ = \frac{G M}{c^2} \left(1 + \sqrt{1 - a^2}\right)
$$

- **Schwarzschild ($a = 0$):** $R_+ = \frac{2GM}{c^2} = R_s$.
- **Kerr Extremo ($a \to 1$):** El horizonte se contrae a la mitad: $R_+ = \frac{GM}{c^2} = 0.5 R_s$.

#### 2. Límite de la Ergósfera ($R_{ergo}$)

Región donde el arrastre del marco de referencia (*Frame-Dragging* o efecto Lense-Thirring) impide permanecer estático respecto al universo lejano; todo cuerpo debe rotar con el agujero negro. El radio depende de la latitud heliocéntrica ($\theta$):

$$
R_{ergo}(\theta) = \frac{G M}{c^2} \left(1 + \sqrt{1 - a^2 \cos^2\theta}\right)
$$

- **Ecuador ($\theta = \pi/2$):** $R_{ergo} = \frac{2GM}{c^2} = R_s$ para cualquier valor de $a$.
- **Polos ($\theta = 0, \pi$):** Coincide exactamente con el horizonte de eventos ($R_+$).

#### 3. Esfera de Fotones ($R_{ph}$) y Anillo de Fotones

Región donde los rayos de luz orbitan en órbitas circulares cerradas inestables:

- Para $a = 0$: $R_{ph} = 1.5 R_s = \frac{3GM}{c^2}$.
- Para espín arbitrario (fotones prógrados): $R_{ph}^+ = 2 \frac{GM}{c^2} \left(1 + \cos\left(\frac{2}{3}\arccos(-a)\right)\right)$.
- Genera el **Photon Ring**: una línea delgadísima y de brillo infinito que bordea la silueta de la sombra.

#### 4. Sombra Aparente del Agujero Negro ($R_{shadow}$)

Debido a la deflexión gravitacional masiva de los rayos de luz que escapan hacia el observador, la silueta negra observada es **significativamente mayor** que el horizonte de eventos físico:

$$
R_{shadow} = \sqrt{27} \frac{G M}{c^2} \approx 2.6 R_s \approx 5.196 \frac{G M}{c^2}
$$

*La silueta negra central renderizada debe coincidir exactamente con $R_{shadow}$, garantizando la curvatura relativista real observada por telescopios (EHT) y simulaciones.*

#### 5. Radio ISCO (*Innermost Stable Circular Orbit*)

El radio de la órbita circular estable más interna. Delimita el **borde interior del disco de acreción**:

- Materia con $r > R_{isco}$ orbita en equilibrio hidrodinámico.
- Materia con $r < R_{isco}$ entra en **zona de precipitación libre** (*plunge region*), cayendo en espiral vertiginosa hacia el horizonte sin emitir radiación térmica estable.
- Fórmula de Bardeen para órbitas prógradas:

  $$
  Z_1 = 1 + (1 - a^2)^{1/3} \left((1 + a)^{1/3} + (1 - a)^{1/3}\right)
  $$

  $$
  Z_2 = \sqrt{3a^2 + Z_1^2}
  $$

  $$
  R_{isco} = \frac{G M}{c^2} \left(3 + Z_2 - \sqrt{(3 - Z_1)(3 + Z_1 + 2Z_2)}\right)
  $$

  - Con $a = 0$: $R_{isco} = 3 R_s = 6 \frac{GM}{c^2}$.
  - Con $a \to 1$: $R_{isco} \to 0.5 R_s = 1 \frac{GM}{c^2}$ *(el disco roza el horizonte de eventos)*.

---

## 2. Génesis y Pipeline Procedural (Árbol Causal)

La generación en `Chunk.js` sigue una jerarquía estricta de variables primarias independientes y variables deducidas:

### 2.1 Variables Primarias (Lotería de Semilla Determinista)

Al generar un chunk en coordenadas $(cx, cy, cz)$, si la semilla activa el spawn de anomalía (`BLACK_HOLE_SPAWN_CHANCE = 0.001`), se sortean 5 variables fundamentales:

| Variable | Tipo / Rango | Probabilidad / Distribución | Propósito Físico |
| :--- | :--- | :--- | :--- |
| **`mass` ($M$)** | $3$ a $10^{11}\ M_\odot$ | Lotería logarítmica | Escala gravitatoria absoluta |
| **`spin` ($a$)** | $0.0$ a $0.998$ | Uniforme $0.0 - 0.7$, colas extremas $> 0.9$ | Momento angular y deformación de Kerr |
| **`accretionRate` ($\dot{M}$)** | $0.0$ a $5.0\ \dot{M}_{Edd}$ | Distribución bimodal (durmiente vs activo) | Tasa de alimentación de materia |
| **`inclination` ($\theta_x, \theta_y, \theta_z$)** | $0$ a $2\pi$ radianes | Uniforme esférico | Vector 3D del eje de rotación cósmico |
| **`magneticB` ($B_0$)** | $10^4$ a $10^8\text{ Gauss}$ | Correlacionada con $\sqrt{\dot{M}} / M^{0.5}$ | Potencia electromagnética de Jets |

---

### 2.2 Clasificación por Escala de Masa

```
[Masa Estelar: 3 - 99 M☉] ────► Marea brutal, espaguetización letal lejana.
[Masa Intermedia: 100 - 10^5 M☉] ─► Raros, solitarios en cúmulos globulares.
[Supermasivos: 10^5 - 10^9 M☉] ──► Centro de sectores galácticos densos.
[Hipermasivos (Titanes): 10^9 - 10^11 M☉] ─► Monstruos cósmicos (TON 618), cruce de horizonte suave.
```

1. **Masa Estelar ($3 - 99\ M_\odot$, 75%):**
   - Horizonte compacto ($R_s \sim 5,000 - 15,000\ U$).
   - **Gradiente gravitacional letal:** El gradiente de marea ($M/r^3$) es violento; la nave es triturada miles de unidades antes del horizonte.
2. **Masa Intermedia ($100 - 10^5\ M_\odot$, 18%):**
   - Fósiles galácticos aislados en cúmulos globulares.
3. **Supermasivos (SMBH) ($10^5 - 10^9\ M_\odot$, 6.9%):**
   - Anclas de rotación galáctica. Horizonte imponente ($R_s \sim 50,000 - 500,000\ U$).
4. **Hipermasivos / Titanes ($10^9 - 10^{11}\ M_\odot$, 0.1%):**
   - Monstruos del tamaño de sistemas estelares enteros (tipo TON 618).
   - Horizonte colosal ($R_s > 5,000,000\ U$).
   - **Paradoja de Marea Suave:** Debido a que el radio crece linealmente con la masa ($r \propto M$) pero la marea decrece cúbicamente ($M/r^3 \propto 1/M^2$), la fuerza de marea en el horizonte es minúscula. **Un jugador puede cruzar físicamente el horizonte sin ser espaguetizado de inmediato.**

---

### 2.3 Taxonomía de Estados de Alimentación y Actividad

```
                     ┌───────────────────────────────┐
                     │ Tasa de Acreción (ṁ = Ṁ/Ṁ_edd)│
                     └───────────────┬───────────────┘
                                     │
       ┌─────────────────┬───────────┴───────────┬─────────────────┐
       ▼                 ▼                       ▼                 ▼
 ┌───────────┐    ┌─────────────┐         ┌─────────────┐    ┌───────────┐
 │ Durmiente │    │ Lenta (ADAF)│         │Activo (Thin)│    │  Quásar   │
 │  ṁ < 0.01 │    │ 0.01 ≤ ṁ <0.1│        │ 0.1 ≤ ṁ ≤ 1 │    │   ṁ > 1   │
 └─────┬─────┘    └──────┬──────┘         └──────┬──────┘    └─────┬─────┘
       │                 │                       │                 │
  Sin disco         Disco tenue             Disco denso,      Jets polares,
 Lente pura         Ámbar / Rojo            Blanco/Azul       Luz cegadora
 Silencioso         Bajo calor              Rayos X           Microquásar
```

* **Estado 1: Durmiente / Inactivo ($\dot{m} < 0.01$):** Sin disco. Lente gravitacional pura, silenciosa y letal. Solo se detecta por la distorsión de la luz estelar.
* **Estado 2: Alimentación Lenta ($0.01 \le \dot{m} < 0.1$):** Disco tenue, ópticamente delgado, tonos ámbar y rojo oscuro ($T < 500,000\text{ K}$).
* **Estado 3: Activo / Disco Delgado ($0.1 \le \dot{m} \le 1.0$):** Plasma denso ultra brillante, emisión térmica cegadora en rayos X y tonos blanco-azulados ($T_{max} > 5,000,000\text{ K}$).
* **Estado 4: Cuásar / Microquásar ($\dot{m} > 1.0$ y $a \ge 0.7$):** Mecanismo Blandford-Znajek activo. Dispara **Jets Relativistas** colimados a lo largo del eje polar de espín ($Y$).

---

## 3. Física del Disco de Acreción y Relatividad

### 3.1 Perfil Térmico Radial (Novikov-Thorne)

La disipación viscosa de energía en el disco delgado determina la temperatura del plasma en función del radio $r$:

$$
T(r) = T_{max} \cdot \left(\frac{R_{isco}}{r}\right)^{3/4} \left(1 - \sqrt{\frac{R_{isco}}{r}}\right)^{1/4}
$$

* **Pico Térmico:** Ocurre en $r \approx 1.36 R_{isco}$.
* **Borde Interior ($r \le R_{isco}$):** El gas se precipita al abismo sin emitir radiación térmica en equilibrio.
* **Gradiente Espectral:**
  * $r \in [R_{isco}, 2 R_{isco}]$: Blanco-azulado nuclear ($> 10^7\text{ K}$).
  * $r \in [2 R_{isco}, 5 R_{isco}]$: Amarillo incandescente ($10^6\text{ K}$).
  * $r \in [5 R_{isco}, 15 R_{isco}]$: Naranja cálido ($10^5\text{ K}$).
  * $r > 15 R_{isco}$: Rojo profundo y gas frío ($< 10^4\text{ K}$).

### 3.2 Radio Exterior del Disco ($R_{out}$)

$$
R_{out} = R_{isco} + \left(R_s \cdot 20 \cdot \sqrt{\dot{m}}\right)
$$

---

## 4. Óptica y Shaders Relativistas (Arquitectura Óptica Unificada)

Para conservar la distorsión que encantó visualmente y eliminar los artefactos de desmembramiento, la arquitectura visual se redefine en un **Sistema Óptico Concéntrico Unificado**.

### 4.1 La Ecuación de Deflexión Óptica en Espacio de Vista

El shader principal opera en el volumen esférico delimitado por la envolvente del agujero negro. La deflexión gravitacional analítica proyectada en pantalla que demostró estabilidad y belleza estética se rige por:

$$
\theta_{view} = \arccos(|\vec{V} \cdot \vec{N}|)
$$

$$
r_{impact} = \sqrt{\max(0.0, 1.0 - (\vec{V} \cdot \vec{N})^2)}
$$

$$
\delta(r_{impact}) = \frac{k_{lens}}{(r_{impact} - r_{core})^2 + \epsilon}
$$

* **Concentricidad Garantizada:** Al basarse en la relación angular entre el vector de vista del observador $\vec{V}$ y la normal de la esfera envolvente $\vec{N}$, la silueta negra y el anillo de fotones son **rigurosamente concéntricos** con el centro del objeto en pantalla. No existe deriva de matrices ni desfase de profundidad.
* **Frame-Dragging Swirl:** El espín del agujero negro rota el vector de deflexión con un vórtice inversamente proporcional a la distancia al núcleo:
  $$
  \Delta\phi_{swirl} = a \cdot \frac{1}{r_{impact} + 0.1} \cdot t_{engine}
  $$

---

### 4.2 Proyección Relativista del Disco (Efecto Gargantúa / Arcos Polares)

En lugar de instanciar un toroide 3D independiente que se desalinea, el disco de acreción se calcula **dentro de la misma proyección óptica**:

1. **Estandarización de Ejes:**
   - **Plano Ecuatorial del Disco:** Definido en el espacio local del agujero como el plano **$XZ$** ($y = 0$).
   - **Eje de Espín / Jets Relativistas:** Orientado a lo largo del eje local **$Y$** ($(0, 1, 0)$).
2. **Proyección de los Arcos Polares (Luz doblada desde detrás del agujero):**
   - La luz del disco posterior que pasa por encima y por debajo del horizonte es deflectada hacia la cámara, generando la icónica aureola circular superior e inferior.
   - El shader evalúa la proximidad del rayo deflectado al plano ecuatorial:
     $$
     \text{polarMask} = \text{smoothstep}(0.1, 0.85, |\vec{N}_{local}.y|)
     $$
   - Al modular la textura de plasma procedimental con este factor y la deflexión de campo fuerte, los arcos polares emergen con continuidad física perfecta sobre la silueta negra, exactamente como en las soluciones de Schwarzschild y Kerr.

---

### 4.3 Efecto Doppler Relativista y Beaming ($\delta^4$)

El plasma en el plano ecuatorial rota a velocidades relativistas ($\beta = v/c \approx 0.4 - 0.6$). La radiación emitida experimenta un factor Doppler:

$$
\delta = \frac{1}{\gamma (1 - \beta \cos\alpha)}
$$

* **Hemisferio en Aproximación:** El gas que gira hacia la cámara se intensifica drásticamente por el factor $\delta^4$ y su temperatura efectiva se desplaza hacia el blanco-azulado cegador (*blueshift*).
* **Hemisferio en Alejamiento:** El gas que rota alejándose de la cámara se atenúa y se enrojece (*redshift*).
* **Consistencia:** El Doppler beaming se aplica tanto al disco directo como al arco lensed polar, dotando a la anomalía del aspecto dinámico y asimétrico característico de la relatividad general.

---

### 4.4 Continuidad con el Disco Físico Exterior

Para sistemas activos donde el disco se extiende más allá del radio de fuerte curvatura ($r > R_{lens}$):
* Si se emplea una malla exterior para el disco lejano, ésta debe ser estrictamente un `RingGeometry` alineado en el plano **$XZ$** (rotación $X = \pi/2$ en Three.js para acostarlo en el plano horizontal), hijo directo de `blackHole.mesh`.
* **Zero Z-Rotation:** Se prohíbe terminantemente modificar `diskMesh.rotation.z` en CPU. Toda rotación visual de turbulencia de plasma se ejecuta en el shader mediante el uniform `uTime` / fase azimutal, preservando la orientación geométrica inmutable.
* **Transición Suave:** El borde exterior del shader de lente se difumina con `smoothstep` para fundirse milimétricamente con el disco exterior sin costuras visibles ni saltos de color.

---

## 5. Gravedad Extrema y Dinámica de Vuelo (`SpaceState.js`)

### 5.1 Gradiente de Marea y Espaguetización ($Tidal \propto M / r^3$)

$$
F_{marea} = \frac{2 G M \cdot L_{nave}}{r^3}
$$

* Si $F_{marea} > 15.0\text{ U/s}^2$: Se emite `EVENTS.PLAYER_DEATH` (*'Espaguetización por Marea Gravitatoria'*).
* **Comportamiento por Escala:**
  * **Agujeros Estelares ($10\ M_\odot$):** Trituración violenta a gran distancia ($r \approx 50 R_s$). Muerte casi instantánea si no se frena con `Space`.
  * **Titanes Supermasivos ($10^9\ M_\odot$):** Marea insignificante en el horizonte ($F_{marea} < 0.01$). El jugador puede cruzar el horizonte de eventos y explorar la cavidad interior.

### 5.2 Arrastre de la Ergósfera (*Frame-Dragging*)

Dentro de $r < R_{ergo}(\theta)$, la nave experimenta una aceleración tangencial obligatoria:

$$
\vec{a}_{drag} = \vec{\omega}_{Kerr} \times \vec{r}, \quad \omega_{Kerr} \approx \frac{2 G M a}{c \cdot r^3}
$$

El jugador siente el par de giro del espacio-tiempo, forzándolo a acelerar en la dirección del espín para ganar impulso de escape.

---

## 6. Arquitectura EDSSM y Grafo de Escena en `Chunk.js`

Para garantizar **60 FPS** continuos, cero picos de Garbage Collection y eliminar los desacoples de mallas:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    GRAFO DE ESCENA DE BLACK HOLE                        │
└─────────────────────────────────────────────────────────────────────────┘
  blackHole.mesh (THREE.Group en lx, ly, lz, rotación Euler de inclinación)
    │
    ├── horizonMesh (THREE.SphereGeometry, R = 4 * Rs)
    │     └── Material: LensingShaderMaterial (Side: BackSide)
    │         ├── Sombra Aparente central (R_shadow)
    │         ├── Deflexión gravitacional de campo fuerte
    │         ├── Anillo de fotones ultra fino
    │         └── Arcos polares de Gargantúa con Doppler Beaming
    │
    ├── coreMesh (THREE.SphereGeometry, R = R_shadow)
    │     └── Material: MeshBasicMaterial (Negro puro 0x000000)
    │         └── Oclusión absoluta de estrellas y fondo
    │
    ├── diskMesh (Opcional, RingGeometry en plano XZ para r > 4*Rs)
    │     └── Material: AccretionDiskShaderMaterial (DoubleSide)
    │         └── Sin rotaciones en CPU; animación 100% en GPU (uTime)
    │
    └── jetMesh (Opcional, CylinderGeometry colimado a lo largo del eje Y)
          └── Presente únicamente si hasJets === true
```

### Reglas de Implementación en `Chunk.js`:
1. **Un solo sistema de referencia:** Todos los hijos del grupo `blackHole.mesh` comparten la posición `(0,0,0)` relativa al grupo.
2. **Animación en GPU:** Cero mutaciones de `rotation.z` o transformaciones en CPU dentro del loop `update()`. Los uniforms `uTime` y `cameraPosLocal` alimentan la animación con coste cero de CPU.
3. **Desactivación de Frustum Culling:** `mesh.traverse((c) => { if (c.isMesh) c.frustumCulled = false; })` para evitar que la sombra desaparezca repentinamente cuando el centro queda fuera del campo de visión en vuelo rasante.

---

## 7. Plan de Implementación por Fases (Iteración B2.1)

```
Fase 1: Motor Matemático en BlackHole.js [COMPLETADA Y VERIFICADA]
  ├── Ecuaciones analíticas de Kerr (R+, R_ergo, R_ph, R_shadow, R_isco)
  ├── Perfil térmico Novikov-Thorne protegido contra NaN
  └── Límites de espín a in [0.0, 0.998]

Fase 2: Unificación Óptica en BlackHoleShader.js [EN PROGRESO]
  ├── Restaurar el lente gravitacional en espacio de vista que encantó al usuario
  ├── Integrar los arcos de disco doblado (Gargantua) con polarMask en XZ/eje Y
  ├── Incorporar Doppler Beaming relativista (delta^4) y gradiente espectral térmico
  └── Asegurar que la silueta central coincida con R_shadow sin roturas

Fase 3: Limpieza y Ensamble en Chunk.js
  ├── Eliminar TorusGeometry desalineado y rotaciones en Euler Z
  ├── Alinear RingGeometry exterior estrictamente al plano XZ
  ├── Alinear Jets Relativistas al eje polar Y
  └── Actualizar uniforms uTime y cameraPosLocal de forma eficiente

Fase 4: Telemetría HUD y Dinámica de Vuelo
  ├── Exponer parámetros de Kerr en HUD (Masa solar, espín a, R_shadow, marea)
  └── Integrar pánico visual y daño de marea por gradiente diferencial M/r^3

Fase 5: Fusión Ecuatorial y Erradicación del Límite Esférico (Iteración B2.2) [COMPLETADA]
  ├── Ampliación del Lienzo Gravitacional (lensRadius = max(5 * R_shadow, 1.18 * R_outer))
  ├── Eliminación de la Niebla Nebular Artificial (skyAlpha = 0 en espacio vacío)
  ├── Convergencia Asintótica Ecuatorial (los arcos curvan y se aplanan en y = 0 a r = R_outer)
  ├── Unificación de ADN Visual (misma escala de fbm, rotación y Doppler beaming delta^3.8)
  └── Erradicación de la 'burbuja' de cristal (Side: BackSide y desvanecimiento suave a 1.0)

Fase 6: Bóveda Celeste Relativista Universal (Iteración B2.3) [EVALUADA]
  ├── Diagnóstico empírico: El "universo de bolsillo" generó discordancia con el cosmos negro real del juego
  └── Detección del artefacto de burbuja: La esfera 3D causaba corte visual visible al entrar y salir

Fase 7: Migración a Opción 2 — Lente Gravitacional Screen-Space con Refracción del Universo Real (Iteración B2.4) [COMPLETADA]
  ├── Erradicación total de la esfera contenedora artificial (horizonMesh eliminada de Chunk.js)
  ├── Renderizado offscreen de la escena a WebGLRenderTarget en RenderSystem.js (estrellas y astros reales)
  ├── Shader de Post-Procesamiento Relativista (getGravitationalLensPostMaterial) con curvatura Bozza/Padé
  ├── Proyección angular física R_shadow_UV y corrección de aspecto isotrópica en pantalla
  ├── Formación auténtica de Anillos y Arcos de Einstein deformando las estrellas reales del motor
  ├── Sombra de Kerr asimétrica en "D" de Bardeen + Anillo de Fotones hiperfino y radiante
  ├── Frame-Dragging relativista (Lense-Thirring swirl) aplicado sobre las coordenadas UV del espacio
  └── Optimización de coste cero: Si no hay agujero negro en el cono visual, el motor renderiza directo a 60 FPS
```

---

*Este documento constituye la directriz técnica corregida. Cualquier modificación futura sobre la renderización de agujeros negros debe apegarse al principio de autoridad óptica unificada para impedir la reaparición de artefactos de desacople.*
