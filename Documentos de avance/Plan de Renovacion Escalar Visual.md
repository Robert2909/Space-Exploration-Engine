# Plan de Renovación Escalar Visual (Sistema de Medición EDSSM)

## Objetivo
Implementar un sistema que traduzca las unidades internas del motor ("U") a medidas espaciales lógicas y comprensibles para el ser humano (Metros, Kilómetros, Unidades Astronómicas, Años Luz) **exclusivamente en la capa visual**, manteniendo la fidelidad de las físicas y cálculos internos a salvo de desbordamientos y complejidad matemática.

## Arquitectura (EDSSM)
El motor de renderizado y el universo procedimental no sufrirán modificaciones estructurales, operarán bajo la ilusión de que 1 U = 1 unidad de cálculo crudo. El nuevo módulo actuará como un "Filtro Universal" antes de la impresión en la Interfaz de Usuario (UI).

### 1. El Módulo `MeasurementSystem.js`
Se creará un servicio estático en `js/core/systems/MeasurementSystem.js`. Este módulo se encargará de las matemáticas de traducción y el formateo de strings.

**Reglas de Escala Propuestas:**
- **< 10,000 U:** Se muestra como **Metros (m)**
- **10,000 U a 99,999,999 U:** Se muestra como **Kilómetros (km)** (Ej: `50,000 U` -> `500,000 km`)
- **100,000,000 U a 9,999,999,999 U:** Se muestra como **Unidades Astronómicas (UA)**
- **> 10,000,000,000 U:** Se muestra como **Años Luz (ly)**

**Funciones Clave:**
```javascript
export class MeasurementSystem {
    // Convierte una distancia cruda en U a un string formateado (ej. "4.2 UA")
    static formatDistance(valueU) { ... }
    
    // Convierte una velocidad en U/s a string (ej. "15 km/s" o "0.5 c")
    static formatSpeed(speedU) { ... }
    
    // Convierte radios planetarios o estelares
    static formatSize(radiusU) { ... }
}
```

### 2. Actualización en `Config.js`
Se añadirán las constantes de conversión para que todo sea altamente modificable desde un solo lugar.
```javascript
    // ==========================================
    // SISTEMA DE MEDICIÓN (VISUAL)
    // ==========================================
    SCALE_U_TO_METERS: 1,
    SCALE_U_TO_KM: 10, // 1 U espacial = 10 km reales (Ej: Planeta de 5,000 U = 50,000 km)
    SCALE_U_TO_AU: 0.0000000668,
    SCALE_U_TO_LY: 0.000000000001,
```

### 3. Intercepción en la Capa de Interfaz (`UIManager.js`)
Dado que `UIManager.js` ya se encarga de escuchar los Eventos de la Máquina de Estados (EDSSM), modificaremos la forma en que los imprime, inyectando el `MeasurementSystem`.

- **`EVENTS.PLAYER_MOVED`**: El OSD interceptará `payload.speed` y `payload.pos` pasándolos por `formatSpeed()` y `formatDistance()`.
- **`EVENTS.LOCATOR_RESULTS_READY`**: El panel lateral del escáner traducirá todos los `distSq` y `radius` antes de inyectar el HTML.
- **`EVENTS.TARGET_CHANGED`**: El HUD central mostrará distancias orbitales y velocidades rotacionales mapeadas astronómicamente.

## Consideraciones de Escalabilidad
- Si en el futuro añadimos un mapa estelar o una economía que cobre combustible por distancia viajada, la lógica del juego usará el valor crudo en `U` (para mantener la matemática exacta y predecible), y solo usaremos `MeasurementSystem` para imprimirle al jugador el ticket de cobro.
- Esto soluciona de raíz cualquier problema futuro con flotantes perdidos o *Z-Fighting* de cámara, ya que las cámaras nunca estarán a millones de billones de distancia geométrica, a pesar de que el usuario vea "2.4 Años Luz".
