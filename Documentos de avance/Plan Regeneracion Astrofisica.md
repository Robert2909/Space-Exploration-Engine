# Plan Técnico: Regeneración Astrofísica y Balanceo de Temperaturas

Este documento consolida la estrategia técnica para sustituir los valores mágicos de temperatura por un sistema basado en físicas reales y rediseñar el motor de generación procedural para respetar estas leyes físicas sin perder la diversidad de biomas del juego.

---

## 1. Modificaciones al Diccionario Maestro (`Config.PLANET_BIOMES`)

Se eliminará por completo la variable `baseTemp`. En su lugar, a cada planeta se le añadirán las variables necesarias para calcular su temperatura real y definir su viabilidad en el universo.

Nuevas variables por bioma:
- **`albedo` (Float 0.0 - 1.0):** Define cuánta luz y radiación refleja el planeta (0 = Absorbe todo, 1 = Refleja todo). Ejemplo: Glaciares (0.7), Lava/Obsidiana (0.1), Océanos (0.3).
- **`greenhouse` (Float):** Multiplicador de retención de calor basado en la densidad atmosférica. Ejemplo: Gigante gaseoso o Planeta Tóxico (Alto), Planeta metálico (0).
- **`tempMin` / `tempMax` (Int):** Rango estricto en el que físicamente tiene sentido que este bioma exista. Determina si el bioma es elegible durante la lotería de generación planetaria.

---

## 2. Rediseño del Motor de Generación Procedural (`Chunk.js`)

Actualmente se elige el bioma y luego se calcula la temperatura. Se invertirá el flujo de generación planetaria para seguir una causalidad real:

1. **Generación de la Órbita:** Se genera la distancia orbital aleatoria y el radio del planeta.
2. **Cálculo de Temperatura de Equilibrio:** 
   Se aplica una versión del cálculo real:
   `TempEquilibrio = TempEstrella * sqrt(RadioEstrella / (2 * DistanciaOrbita))`
3. **Filtro de Viabilidad Térmica:**
   Se iteran todos los biomas en `Config.PLANET_BIOMES`. Solo aquellos donde `TempEquilibrio` (más un estimado de su efecto invernadero futuro) entre dentro del rango `tempMin` y `tempMax` entrarán a la lista de "biomas elegibles".
4. **Lotería Ponderada:**
   Entre los biomas elegibles, se normaliza la suma de sus variables `chance`. Se escoge el bioma final usando la lotería habitual.
5. **Cálculo Final de Temperatura:**
   Una vez asignado el bioma, se calcula la temperatura final del planeta combinando la `TempEquilibrio`, el `albedo` del bioma, y aplicando el efecto de su atmósfera `(DensidadAtmosferica * greenhouse)`.

*Nota de Balanceo (El Director de Juego):* Para asegurar que siempre haya zonas habitables (si la estrella lo permite) y evitar universos aburridos, se forzarán distribuciones de órbitas usando zonas:
- *Interior (10-20% planetas)*
- *Ricitos de Goldilocks / Habitable (20-30% planetas)*
- *Exterior (50-60% planetas)*

---

## 3. Modificaciones en el HUD y Visualización (`UIManager.js`)

Con los nuevos cálculos y valores basados en física real, la visualización debe actualizarse.

### Temperatura (`target-temp`)
- Mostrará la `Temperatura Final` ya pre-calculada en `Chunk.js` y asignada como la temperatura definitiva del objeto.
- Formato: *'300 °C'* o *'300 K'* según formato deseado, manteniendo los códigos de colores según el extremo calórico.

### Atmósfera (`target-atmo`)
Se elimina el porcentaje arbitrario y se calcula la presión atmosférica en **atm (atmósferas estándar terrestres)**.
1. **Cálculo de Presión:** Relación directa matemática usando la `DensidadAtmosférica` (variable de generación procedural) escalada por la `Gravedad` del planeta.
2. **Clasificación del Estado (Texto cualitativo):** Combinando el bioma (su `greenhouse`) y la temperatura, se define qué tipo de atmósfera es:
   - *Tenue / Vacío* (Poca densidad o nula).
   - *Respirable* (Densidad moderada, temperatura tolerable, presión ~1 atm).
   - *Aplastante / Tóxica* (Alta densidad, alto greenhouse).
   - *Tormenta de Gases* (Gigantes gaseosos).

Ejemplo visual en el panel:
`1.2 atm (Respirable)` o `90 atm (Aplastante/Tóxica)`

---

## Próximos pasos recomendados
1. Limpiar el `Config.js` e insertar los nuevos rangos y parámetros físicos para cada planeta.
2. Refactorizar la función de bucle planetario en `Chunk.js` para usar la lotería condicional basada en temperatura de equilibrio.
3. Ajustar el renderizado final del panel objetivo en `UIManager.js` para manejar la presión atmosférica (atm).
