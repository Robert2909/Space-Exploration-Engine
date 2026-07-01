# Diseño de Modo de Juego: GasDive (Inmersión Gaseosa)

## 1. Concepto y Nombramiento

Dado que "AtmosphereState" es ambiguo (los planetas rocosos también tienen atmósfera), este nuevo modo de juego se denominará arquitectónicamente como **`GasDiveState`** (o "Modo de Inmersión Gaseosa"). Su propósito exclusivo es manejar la navegación interna dentro de los gigantes gaseosos y otros planetas sin superficie sólida.

## 2. La Experiencia Visual (Visibilidad y Atmósfera)

Al entrar a un gigante gaseoso, el jugador no verá un cielo estrellado ni un terreno debajo.

- **Opacidad Total:** El entorno estará dominado por una niebla volumétrica extremadamente densa. La visibilidad máxima será de unos pocos kilómetros; más allá de eso, todo se desvanece en el color dominante del bioma del gas (ej. niebla violeta en un gigante de antimateria).
- **Sensación de Inmensidad y Desorientación:** No habrá un "arriba" o "abajo" visualmente obvio más que la lectura de los instrumentos de la nave. Todo alrededor será un mar interminable de nubes y gases.
- **Efectos de Nubes y Partículas:** En lugar de terreno procedural, el motor generará enormes planos de texturas animadas simulando corrientes de viento masivas. Partículas de gas, cristales de hielo o cenizas chocarán constantemente contra el parabrisas de la nave para dar una intensa sensación de velocidad.
- **Relámpagos y Anomalías Lumínicas:** Ocasionalmente, destellos de luz intensos iluminarán la niebla desde la distancia, simulando tormentas eléctricas de proporciones colosales que ocurren en las profundidades del gigante.

## 3. Navegación y Pilotaje (Mecánicas de Vuelo)

A diferencia del vuelo espacial pasivo o la caminata en terreno, el pilotaje en el `GasDiveState` será activo, rudo y peligroso.

- **Controles de Vuelo Atmosférico:** El jugador controlará la nave en primera o tercera persona, pero la nave estará constantemente sujeta a las físicas del entorno.
- **Turbulencia Continua:** La nave sufrirá sacudidas e inercia. Las supertormentas del planeta generarán corrientes de viento laterales que empujarán la nave fuera de su curso, obligando al jugador a corregir constantemente la dirección.
- **El Peligro de la Presión Barométrica:** Como no hay suelo, el eje Y (altitud) es tu único salvavidas y tu principal enemigo.
  - Si vuelas muy alto, la gravedad disminuye y podrías escapar de nuevo al espacio (`SpaceState`).
  - Si desciendes demasiado profundo, un medidor de **Presión Estructural** comenzará a sonar en rojo. La niebla se volverá más oscura y espesa. Si el jugador ignora la advertencia y sigue bajando, la inmensa presión aplastará el casco de la nave, destruyéndola por completo (Muerte/Game Over).

## 4. Eventos y Descubrimientos

Dado que la supervivencia es el principal desafío, la exploración atmosférica se centrará en hitos visuales, climáticos y de navegación (sistemas más complejos de inventario y biomasa vendrán en el futuro):

- **Estructuras Flotantes:** Ruinas de inmensas estaciones espaciales, satélites de investigación masivos o chatarra colosal atrapada en zonas de flotabilidad neutra. El jugador puede maniobrar hacia ellos como hitos visuales y de lore.
- **Ojos de Tormenta:** Áreas geográficas secretas y raras donde el viento y la turbulencia cesan de golpe. La niebla se despeja formando pasillos masivos de calma, revelando fenómenos visuales únicos.

## 5. Sesión de Q&A (Afianzando la Experiencia)

### A. Transición de Entrada y Salida

- **Q1:** ¿Cómo te imaginas la transición visual al entrar desde el espacio? ¿Queremos un fundido de fuego por fricción (reentrada), o simplemente que la niebla del planeta vaya ganando opacidad hasta devorar la pantalla?

Respuesta: No habrá cambio de estado solo por aproximación, necesitamos invocar el evento de aterrizaje, similar al que tenemos para el modo terreno donde apuntamos y confirmamos

- **Q2:** Para salir, ¿basta con volar en línea recta hacia arriba hasta llegar a la "altitud 0" para aparecer en órbita automáticamente, o hay que presionar un botón de "Escape Orbital" al estar en la atmósfera alta?

Respuesta: Habrá rangos de altura, muchos rangos distintos, pero por default tendremos una zona segura para salir, y hasta un fondo variable habrá la zona de muerte, todo basado en la coordenada de altura, y solo al llegar a cierta región atmosférica podremos regresar al modo de espacio

### B. Controles e Interfaz

- **Q3:** Al no haber suelo de referencia, ¿es preferible que la nave tenga un control de *Auto-Nivelado* (si sueltas los controles, la nave siempre intenta estabilizarse en el horizonte virtual), o controles totalmente libres tipo avión donde puedes volar boca abajo libremente?

Respuesta: Los controles serán perfectamente iguales al modo de espacio, cámara infinita, controles iguales, el swing de las teclas Q y E, frenado, shift, aceleración, TODO, la única diferencia es que nos encontraremos en el modo nuevo y que obviamente tendremos límite de velocidad muchísimo mas reducido al encontrarnos dentro de un planeta. Y no habrá sistema de auto nivelado, todo será perfectamente libre tal como en el espacio, aqui el desafío será por las variables físicas del entorno y del HUD.

- **Q4:** ¿Mantendremos el HUD espacial actual o creamos un HUD con instrumentos tácticos nuevos? (por ejemplo: Horizonte artificial, Altímetro, Medidor de presión del casco).

Respuesta: Mantendremos todo igual pero al igual que el modo terreno, tendremos un nuevo pánel, quitaremos el pánel de escáner tal cual como en el modo terreno, y añadiremos un pánel especial que mida variables exclusivas para este nuevo modo.

- **Q5:** ¿Prefieres forzar este modo a **Primera Persona** (cabina, claustrofóbico, enfocado en el HUD) o mantener la **Tercera Persona** (ver la nave luchando contra los vendavales)?

Respuesta: En primera persona, respetando perfectamente el modo de navegación perfectamente igual al del universo, como especifiqué arriba.

### C. Turbulencia y Muerte

- **Q6:** Respecto a la presión profunda, ¿queremos que haya una "barrera invisible" elástica que te empuje hacia arriba al llegar al límite, o dejamos que bajes bajo tu propio riesgo, y si rompes el límite crítico la nave simplemente colapsa y arroja un Game Over violento?

Respuesta: Será libre, si llegamos al rango de muerte tendremos pocos segundos para abdonarla o sino muerte. La muerte se invocará de manera similar a la que tenemos en el modo terreno, en ese modo solo podemos morir por altura, creo que tenemos un evento para morir, pues en el modo GasDive será similar, pero aquí podremos morir por altura y presión. Al morir el evento será igual que cuando mueres en modo terrestre, revisa en el código como está hecho y lo que se invoca.

- **Q7:** La turbulencia y los vientos huracanados: ¿Preferirías que desplacen *físicamente* la posición de tu nave dificultando ir en línea recta, o que sea un efecto principalmente de *Camera Shake* (temblor intenso) para no frustrar demasiado los controles?

Respuesta: Si habrá desplazamiento físico, habrá movimientos de cámara, no constantes, basados en las físicas del entorno, impactos o fuerzas extremas.

## 6. Segunda Ronda de Q&A (Afinando detalles técnicos y de diseño)

Basado en tus respuestas, el diseño está tomando una forma súper coherente. La idea de mantener los controles espaciales 1:1 pero con velocidades reducidas y físicas alteradas es excelente porque no rompe la memoria muscular del jugador.

### D. El Nuevo Pánel HUD (GasDive Panel)

- **Q8:** Mencionaste que reemplazaremos el panel de escáner por uno nuevo. ¿Qué variables exactas te gustaría medir en este panel? (Ejemplos: *Altitud Actual, Presión Barométrica, Temperatura Externa, Velocidad del Viento, Nivel de Toxicidad*).

Respuesta: Altitud Actual, Presión Barométrica, Temperatura Externa, Velocidad del Viento, Dirección del Viento, Nivel de Toxicidad, Dirección de la nave.

- **Q9:** ¿Este panel debería tener alguna especie de "Radar de Densidad" o gráfico visual (como barras que se llenan o cambian de color) para advertirte visualmente que te acercas a la Zona de Muerte por presión?

Respuesta: Estaría bien que exista una barrita que indique visualmente la altitud, como dijimos que va a haber varios rangos distintos, la barrita debe tener colores que indiquen el rango en el que nos encontramos. Estos rangos distintos de altitud deben calcularse según variables propias del planeta, no todos los planetas tendrán los mismos rangos seguros, intermedios o de muerte, a veces la zona segura podría ser muy extensa o muy corta, o la zona de peligro podría estar muy muy profunda o muy cerca de la superficie, todo depende de variables procedurales acompañadas del planeta.

### E. Zonas de Altitud

- **Q10:** Para la mecánica de escape y muerte, ¿cuántas "capas" te imaginas? Yo sugiero tres:
  1) **Exósfera (Capa Superior):** Zona segura donde puedes salir al espacio.
  2) **Tropósfera (Capa Media):** Zona de vuelo libre, turbulencia estándar.
  3) **Abismo (Capa Profunda):** Oscuridad total, presión destructiva, cuenta regresiva hacia la muerte. ¿Estás de acuerdo con esta división?

Habrá Termosfera (El Borde), Estratosfera (La Capa de Plasma), Troposfera Superior (El Techo de Nubes), Troposfera Profunda (La Zona de Presión), El Manto de Fluido Supercrítico (El Abismo de Muerte)

### F. Escala y Velocidades

- **Q11:** En el espacio viajamos a velocidades absurdas. En el modo Terreno somos lentos. Para GasDive, al ser una nave, ¿queremos una velocidad intermedia? (Ejemplo: como un avión de combate, rápido pero gobernable, lo suficiente para sentir que la niebla pasa volando a tu lado).

Respuesta: La velocidad máxima será calculada por las variables del entorno del planeta, nuestra velocidad máxima podrá cambiar según la altura, presión y temperatura, basate en la velocidad de un avión de combate de élite como base, con una máxima posible de x10 tal como nuestra máxima en el espacio, aqui también habrá Boost.

### G. Físicas de Turbulencia

- **Q12:** Para el desplazamiento físico por viento, ¿quieres que sean corrientes direccionales (ej. vientos constantes empujando hacia el "Este" del planeta) o simplemente "bolsas de aire" caóticas que te empujan aleatoriamente en cualquier dirección mientras vuelas?

Respuesta: Creo que lo apropiado será una mezcla, habrá corrientes direccionales según la altura, presión y temperatura, y también habrá "bolsas de aire" caóticas que te empujan aleatoriamente en cualquier dirección mientras vuelas. No habrá ningún momento en el que tengas movimiento nulo, siempre habrán corrientes que afecten a la nave de forma violenta, y obviamente la violencia aumenta según la presión y más variables, normalmente por las capas.

## 7. Documentación Técnica y Arquitectura

Con la experiencia y los rangos definidos, esta es la ruta de implementación técnica en código, alineada al 100% con la *Event-Driven State Machine*:

### 7.1. Nuevo Estado de Vuelo (`GasDiveState.js`)

- **Heredará de `State`**: Se creará un nuevo estado paralelo a `SpaceState` y `TerrainState`.

- **Controles Clónicos al Espacio**: Reutilizaremos la lógica exacta de control en primera persona y ejes infinitos del vuelo espacial, pero el motor de físicas inyectará **inercia, arrastre atmosférico y fuerzas externas**.
- **Renderizado Volumétrico**:
  - Sustituiremos la generación de chunks de terreno por un sistema dominado por `THREE.FogExp2` sincronizado proceduralmente con el bioma del gigante.
  - Sistema masivo de partículas (viento, polvo de cristales, gases) que choca físicamente contra la visión de la cabina.
  - Relámpagos procedurales basados en eventos de audio y luces puntuales (PointLights) de alto brillo.

### 7.2. Físicas Dinámicas, Velocidad y Turbulencia

- **Vector de Viento Global**: Se calculará cada frame usando ruido Simplex en base a las coordenadas espaciales de la nave, sumando:
  - *Corrientes Direccionales Constantes*: Modificadas por latitud y altura.
  - *Bolsas de Aire Caóticas*: Aplican un vector de fuerza aleatorio brusco a la velocidad de la nave, acompañado de un violento **Camera Shake**.

- **Límite de Velocidad Procedural**: La velocidad máxima de la nave y su Boost cambiarán dinámicamente en tiempo real según la densidad de la capa actual (Calculada con altura, presión y temperatura local).

### 7.3. Generación Procedural de las 5 Capas

Cada gigante gaseoso calculará dinámicamente el grosor y límite de sus 5 zonas basándose en sus variables procedurales (tamaño, temperatura, multiplicador de radio):

1. **Termosfera (El Borde)**: Zona superior de escape orbital. Viento ligero, alta velocidad máxima.
2. **Estratosfera (La Capa de Plasma)**: Transición ionizada rápida. Primeros vientos fuertes.
3. **Troposfera Superior (El Techo de Nubes)**: Vuelo estándar caótico, alta densidad de nubes y relámpagos.
4. **Troposfera Profunda (La Zona de Presión)**: Oscuridad opresiva, límite de velocidad severo, turbulencia máxima, comienzo de advertencias visuales y sonoras en el HUD.
5. **Manto de Fluido Supercrítico (El Abismo)**: Cuenta regresiva de presión crítica. Si no se escapa a tiempo, emite un evento de destrucción letal idéntico al del modo terrestre (`EVENTS.PLAYER_DEATH`).

### 7.4. Interfaz de Usuario (HUD GasDive)

- **Reemplazo del Panel**: El EventManager ocultará el panel del escáner y levantará un nuevo panel táctico exclusivo.

- **Métricas en Tiempo Real**: Se enviarán por evento `EVENTS.HUD_GASDIVE_UPDATE` las lecturas de *Altitud, Presión Barométrica, Temp. Externa, Vel. de Viento, Dirección del viento, Nivel de Tóxico, y Dirección local de la nave*.
- **Barra de Altitud Procedural**: Un elemento visual (barra vertical CSS/Canvas) coloreado dinámicamente que grafica el tamaño y los umbrales de las 5 capas del planeta actual, mostrando un indicador claro de qué tan profundo está sumergido el jugador respecto a la zona de muerte.

### 7.5. Transición (Espacio <-> GasDive)

- **Entrada**: Exactamente igual al modo Terreno. El jugador hace *lock-on* en el gigante gaseoso e invoca el aterrizaje (tecla `F`). El estado `SpaceState` despacha el objetivo al `Engine` y cambia al estado `GasDiveState`.

- **Salida**: Se rige por la misma filosofía del modo terreno. Al entrar a cualquier rango de altitud dentro de la **Termosfera** (la capa superior), se habilitará la opción manual de despegue (clic derecho) para invocar el evento de salida a órbita. Sin embargo, si el jugador no hace clic pero continúa volando en línea recta hacia arriba y rebasa el límite superior de la capa, la salida automática se activará forzando el evento de transición hacia `SpaceState` sin pantallas de carga.

## 8. Fases de Implementación

Para asegurar que el desarrollo se adhiera estrictamente a la **Arquitectura Event-Driven State Machine** sin romper los modos existentes, la implementación se dividirá en 4 fases secuenciales:

- **Fase 1: Transición y Core del Estado**
  - Creación del archivo `GasDiveState.js` heredando de la clase base.
  - Modificación del manejador de aterrizaje (en `SpaceState.js` y `Engine.js`) para despachar la transición hacia `GasDiveState` cuando el objetivo sea un planeta con el flag `isGasGiant` (en lugar de bloquearlo).
  - Soporte de salida al espacio manual (clic derecho) y automática (por límite de altura).

- **Fase 2: Interfaz Táctica (HUD)**
  - Creación de `GasDivePanel.js` o integración dentro del `OSDManager.js`.
  - Escuchar el evento `EVENTS.HUD_GASDIVE_UPDATE` para renderizar en tiempo real: Altitud, Presión, Temperatura, Dirección de viento y Toxicidad.
  - Implementar la barra procedural que renderiza las 5 capas atmosféricas según el radio del planeta.

- **Fase 3: Rendering Volumétrico**
  - Desactivar el generador de *chunks* de terreno en este estado.
  - Instanciar `THREE.FogExp2` basándose en el bioma (color principal y densidad).
  - Crear el sistema de partículas (viento visible/cenizas/nubes) que chocan contra la cámara.

- **Fase 4: Físicas, Turbulencia y Peligro**
  - Implementar el generador de ruido Simplex para calcular el vector de viento direccional y bolsas caóticas.
  - Adaptar el multiplicador de velocidad y boost según la altitud.
  - Mecánica del Manto Supercrítico: Lanzar evento de muerte (`EVENTS.PLAYER_DEATH`) al exceder la presión máxima permitida en la capa más profunda.
