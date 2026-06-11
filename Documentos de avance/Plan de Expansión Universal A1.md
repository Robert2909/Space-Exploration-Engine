# Plan de Expansión Universal A1

## Visión Principal

Simulador Espacial enfocado en Arte Audiovisual y Exploración Contemplativa (No Supervivencia).

### 1. Sistema de Biomas y Geología Especializada

- **Latitud y Biomas:** Generación y coloración del terreno dependiente de la latitud (ej. hielo en los Polos 90°/-90°, desiertos/dunas lisas en el ecuador 0°).
- **Diversidad Planetaria:** Nuevos tipos de planetas:
  - Oceánicos (con nivel del mar, olas y shader de agua).
  - Lava (ríos de magma brillantes, iluminación emisiva).
  - Cristal / Exóticos (elementos reflectantes, colores surreales).
- **Orografía Extrema:** Funciones avanzadas de Perlin Noise para esculpir cañones abisales, montañas picudas y cráteres de impacto masivos, controlados por el tipo de astro.

### 2. Puntos de Interés (Nave y Entorno)

- **Presencia Física de la Nave:** Un modelo 3D low-poly de la nave exploradora aparcado en las coordenadas exactas de aterrizaje. El jugador desembarca a pie, y la cámara no sustituye a la nave. Existe el riesgo (inmersivo) de alejarse demasiado y perder la nave de vista en la niebla sin ayudas de brújula absolutas.
- **Vegetación y Rocas Procedurales:** Instanciamiento estático (InstancedMesh) basado en la semilla del mundo para sembrar monolitos misteriosos, rocas alienígenas y flora extraña que sea coherente al circunnavegar el planeta.

### 3. Fenómenos Espaciales Avanzados

- **Cinturones de Asteroides:** Zonas de alta densidad en el espacio con asteroides de colisión.
- **Sistemas Estelares Binarios:** Múltiples soles bailando en órbita mutua, proyectando dobles sombras y amaneceres únicos.
- **Agujeros Negros (Gravedad Extrema):** Cuerpos celestes que curvan la luz a su alrededor (lensing gravitacional) y arrastran implacablemente a la nave si cruza el horizonte de eventos.

### 4. Ambientación Sonora (Inmersión Crítica)

- **Motor de Audio 3D:** Integración de `THREE.AudioListener`.
- **Paisaje Sonoro Espacial:** Zumbido sordo de los propulsores en el vacío.
- **Paisaje Sonoro Terrestre:** Rugido del viento dinámico basado en la densidad atmosférica. Sonido de pisadas en el terreno y crujidos del entorno.
- **UI & Telemetría:** Blips y chirridos electrónicos de la interfaz de la terminal al enfocar planetas, recibir datos o al encender la linterna.

---

## Archivo de Sesiones de Diseño (Q&A)

*Las preguntas técnicas y decisiones de diseño serán documentadas a continuación, y este documento se actualizará iterativamente.*

**1. Sobre la Presencia de la Nave y la Inmersión:**
Puesto que buscas un sentimiento contemplativo y solitario, ¿quieres que sea OBLIGATORIO caminar físicamente de regreso a la nave para poder despegar? (Actualmente presionas `ENTER` desde cualquier lugar). Si lo hacemos obligatorio, perder la nave de vista en una tormenta de niebla podría ser una experiencia tensa pero increíblemente inmersiva.

**Respuesta:** Si, será obligatorio regresar a la nave, y la nave tendrá proximidad, si estamos bien cerquita de la nave aparecerá la posibilidad de regresar a ella utilizando OSDManager, tal como con los planetas, y utilizaremos el mismo sistema que con la proximidad de los planetas para aterrizar.

**2. Sobre el Aspecto Visual del Agua en Planetas Oceánicos:**
Para mantener la estética sólida y minimalista que tenemos actualmente, ¿prefieres que el agua sea un "shader" reflectante y realista, o prefieres una geometría low-poly animada con colores sólidos (estilo líquido poligonal) que se mueva como olas?

**Respuesta:** Usaremos geometría animada con colores sólidos y que simule olas mediante funciones matemáticas.

**3. Sobre los Agujeros Negros:**
La deformación de la luz (lensing gravitacional) suele ser muy pesada para las tarjetas gráficas si usamos *Raymarching*. ¿Prefieres que intentemos un efecto cinemático realista (estilo la película *Interstellar*), o hacemos un agujero negro más estilizado usando trucos de vértices que combine con nuestro estilo sin matar los FPS?

**Respuesta:** El objetivo principal es no asesinar el rendimiento, pero tampoco debe verse de terrible presupuesto, aplica todos los trucos que puedas para lograr un efecto intermedio entre ambos, pero sin matar el rendimiento.

**4. Sobre los Efectos de Sonido (Audio 3D):**
¿Planeas conseguir archivos de audio (mp3/wav) por tu cuenta para que los carguemos en el motor, o te gustaría que yo programe un Sintetizador de Audio Procedural usando la Web Audio API? (Esto significa que yo generaría matemáticamente mediante código el sonido del viento, los motores y los blips de la UI, sin necesidad de descargar ni un solo archivo de audio externo).

**Respuesta:** La generación será mediante código, no usaremos archivos de audio. Y recuerda muy fuertemente utilizar arquitectura desacoplada, no queremos monolitos, que todo el sistema de audio tenga su propio motor, su propia arquitectura y sus propios archivos, que sea independiente del resto del código.

**5. Sobre los Biomas y el Océano:**
Cuando implementemos los planetas oceánicos, ¿qué pasará si el jugador camina hacia el agua? ¿Quieres que el jugador camine lentamente por el fondo marino (y que la pantalla se vuelva de un color denso simulando estar bajo el agua), o prefieres que el jugador flote/nade en la superficie de las olas?

**Respuesta:** El jugador podrá entrar al agua y hundirse, existirá un fondo marino con terreno real, similar a los terrenos que ya manejamos, y será variable, dependiendo del planeta, así que será aleatorio, por lo tanto, el jugador podrá caminar por el fondo del mar. Y se podrá nadar, cuando el jugador esté en contacto con el agua deberá poder nada utilizando el espacio, tal como en Minecraft, debe estar presionando para subir, y si no lo presiona, simplemente se sumerge, y el jetpack estará activo siempre y cuando el jugador esté hasta la superficie del agua, para poder utilizarlo brevemente para sobrevolar el agua.

**6. Sobre la Colisión de la Flora/Rocas Procedurales:**
Vamos a esparcir miles de rocas y vegetación extraña por el terreno. Calcular colisiones físicas para miles de objetos en JavaScript puede golpear los FPS. ¿Estás de acuerdo en que estos objetos sean "etéreos" (que puedas caminar a través de ellos sin chocar) al menos en esta versión para priorizar la escala masiva y el rendimiento, o prefieres menos objetos pero que sean sólidos?

**Respuesta:** Sin lugar a dudas, la prioridad es la escala masiva y el rendimiento, por lo tanto, estos objetos serán etéreos y con polígonos muy simples, pero sería bueno añadir un sistema de proximidad, cuando el jugador se encuentre muy muy cerca de un objeto, se le cargará una hitbox temporal que solo se cargará para poder chocar, y se descarga en cuanto se aleje un poquito, para no tener activos todos los objetos con colisiones físicas cargados a la vez.

**7. Sobre la Búsqueda de la Nave:**
Ya que perderse será un riesgo real, ¿la nave aparcada debería tener al menos una pequeña luz emisiva (un faro o baliza parpadeante) para tener una mínima esperanza de encontrarla en la oscuridad absoluta, o prefieres que esté completamente apagada y que si te pierdes, te pierdes de verdad?

**Respuesta:** La nave tendrá un diseño simple, pero entre ello tendrá faros delanteros y uno trasero, casi como si fuera un carro estacionado y siempre estarán encendidas.

**8. Sobre la Mecánica de Asteroides y Agujeros Negros:**
Para los cinturones de asteroides, ¿los imaginamos como anillos densos orbitando alrededor de ciertos planetas gigantes, o como zonas aleatorias en el vacío del espacio profundo que interrumpen el vuelo? Y sobre el agujero negro, ¿será un ente estático en el centro de un sistema estelar consumiéndolo todo, o algo que te puedes encontrar flotando en medio de la nada?

**Respuesta:** Serán anillos orbitando tanto planetas como estrellas y como sistemas planetarios, las 3 son posibles, con cierta posibilidad, pero estos no interrumpirán el vuelo, actualmente todo en el universo es etéreo, y los mantendremos asi. Y respecto a los agujeros negros, estos serán lugares independientes de los sistemas solares, serán un nuevo tipo de elemento generable, pero tendrán una probabilidad bajísima de aparecer, y estos tendrán tamaños masivos, creando una distorción en el espacio. Al acercarse mucho a ellos, el jugador comenzará a sentir fuerzas que lo arrastran hacia el agujero negro, y la distorción del espacio será visible, creando un efecto cinematográfico interesante, con el jugador sintiendo la gravedad, pero como somos todopoderosos, aunque sintamos peso, poniendo la nave al máximo con los modos que tenemos, podremos escapar. Por lo tanto, no habrá un horizonte de sucesos, el jugador podrá entrar y salir de el, pero se sentirá la fuerza de atracción del agujero negro, creando una experiencia interesante y divertida. No se podrá interactuar con el agujero negro, solo admirarlo, y también tendrá sus propias propiedades de elemento tal cual como ahora mismo podemos seleccionar planetas y estrellas, pues los agujeros negros también tendrán lo suyo seleccionable, y serán elementos trackeables y alcanzables también con el piloto automático, entonces asegúrate de que sean elementos similares con sus propios atributos, como si se tratara de programación orientada a objetos, donde todos heredan de la clase Astro.

**9. Sobre la Arquitectura del Audio:**
La Web Audio API ya se ejecuta en un hilo separado del navegador de forma nativa. Para la arquitectura del motor, ¿es suficiente con construir una clase/módulo completamente independiente (ej. `AudioManager.js`) que reciba "eventos" del juego sin estar acoplado al `Engine`, o quieres que vaya al extremo e implemente el audio a través de un `Web Worker` puro?

**Respuesta:** Esta bien si hay un AudioManager, pero asegurate de que sea un módulo independiente y que no esté acoplado al Engine, que se pueda activar y desactivar sin afectar el resto del código. De hecho, quiero que el audio se maneje mediante programación orientada a objetos, de manera que se puedan agregar nuevos elementos con su propio sonido sin afectar el resto del código. Con esto me refiero a que el AudioManager debe ser capaz de manejar todos los sonidos del juego, y que se pueda agregar nuevos elementos con su propio sonido sin afectar el resto del código.

**10. Sobre el Clima y la Niebla (Biomas):**
Ya que la latitud y los tipos de planeta dictarán la estética, ¿te gustaría que el HUD (`traje_espacial`) te indique la temperatura o amenazas del ambiente (Ej: "-120°C Riesgo de Congelación", o "Tormenta de Arena"), y que la densidad y color de la niebla cambien agresivamente según esto? ¿O prefieres mantener el HUD limpio y que el clima sea puramente visual?

**Respuesta:** Si tendremos notificaciones en el HUD, pero será mas que nada decorativo, porque realmente somos invencibles, pero no se podrán desactivar, ya que son parte de la experiencia. La niebla será mas que nada visual.

**11. Sobre el Aterrizaje y Despegue con la Nave Física:**
Al aterrizar en la Fase 6, aparecerás en tierra firme y tu nave física estará ahí. ¿Aparecerás *dentro* o *frente* a la nave viéndola aparcada? Y para despegar, una vez que estés lo suficientemente cerca (y presiones ENTER), ¿cortamos directamente al espacio como ahora, o hacemos una cinemática de un par de segundos de la nave elevándose antes de cambiar de modo?

**Respuesta:** Estaría bien aparecer dentro de la nave, para que asi haya algo de suspenso/emoción por querer ir afuera a explorar, y sobre el despegue, estaría bien una mini animación antes del actual Flash blanco que tenemos de transición, podría ser de unos cuantos segundos, y recuerda que para aterrizar y despegar solamente vamos a utilizar el clic derecho, Enter queda descartado para siempre por ser muy poco práctico.

**12. Sobre la Naturaleza de los Asteroides (Geometría vs Partículas):**
Dijiste que los anillos de asteroides serán etéreos para no interrumpir el vuelo. Visualmente, ¿prefieres que sean formaciones de `InstancedMesh` (miles de rocas 3D low-poly rotando) o un enjambre de partículas estilo "polvo de estrellas/rocas pequeñas" usando `Points`? (El `InstancedMesh` nos permite tener rocas del tamaño de lunas sin perder rendimiento, pero se ven físicas).

**Respuesta:** Si no se pierde rendimiento, entonces vamos a intentar usar instancedMesh, pero si se pierde rendimiento, entonces vamos a usar puntos, pero con formas de rocas, no simples puntos, intenta usar InstancedMesh, ya que es mas divertido, pero sin perder rendimiento, y recuerda, no debe haber colisiones con los asteroides, es decir, no hay hitbox, son etéreos, y dejalo implementado de forma a que sea facil cambiarlo después a puntos si es que InstancedMesh nos genera problemas de rendimiento, y que la probabilidad de que aparezcan sea baja, ya que son elementos raros de encontrar.

**13. Sobre la Inmersión del Agujero Negro:**
Mencionaste que sentiremos cómo nos arrastra y distorsiona el espacio. ¿Deberíamos añadir una estética de pánico en la que, si te acercas demasiado a la singularidad, tu HUD y terminal comiencen a emitir estática, mostrar texto corrupto o símbolos erróneos (glitch) debido a la radiación cuántica?

**Respuesta:** Si, me gusta la idea, habrá pánico, prográmalo de modo a que sea modular, que exista una variable encargada de controlar la intensidad del pánico, para que pueda subir y bajar según alguna otra variable de proximidad.

**14. Sobre el Motor de Audio (Posicionamiento 3D):**
Usaremos OOP para los sonidos. ¿Quieres que el Audio sea verdaderamente Espacial en 3D? (Es decir, si aparcas tu nave y caminas lejos de ella, escucharás el zumbido de sus focos quedarse atrás en tu auricular izquierdo o derecho dependiendo de a dónde gires la cámara). ¿O prefieres sonido envolvente plano (estéreo tradicional)?

**Respuesta:** Si, que sea espacial.
