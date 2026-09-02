import * as THREE from 'three';

// Lensing Shader: Fake gravitational lensing and Photon Sphere.
export function getLensingShaderMaterial(spin = 0.5, temperature = 6000.0, accretionRate = 0.5) {
    const uniforms = {
        uTime: { value: 0.0 },
        uSpin: { value: spin },
        uTemperature: { value: temperature },
        uAccretionRate: { value: accretionRate }
    };

    const vertexShader = `
        #include <common>
        #include <logdepthbuf_pars_vertex>
        varying vec3 vViewPosition;
        varying vec3 vViewNormal;
        varying vec3 vLocalNormal;
        varying vec4 vViewCenter;

        void main() {
            vLocalNormal = normal;
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            vViewPosition = mvPosition.xyz;
            vViewNormal = normalMatrix * normal;
            vViewCenter = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
            gl_Position = projectionMatrix * mvPosition;
            #include <logdepthbuf_vertex>
        }
    `;

    const fragmentShader = `
        #include <common>
        #include <logdepthbuf_pars_fragment>
        uniform float uTime;
        uniform float uSpin;
        uniform float uTemperature;
        uniform float uAccretionRate;
        
        varying vec3 vViewPosition;
        varying vec3 vViewNormal;
        varying vec3 vLocalNormal;
        varying vec4 vViewCenter;

        // Ruido y FBM (oculto por brevedad)
        vec3 hash(vec3 p) {
            p = vec3(dot(p, vec3(127.1, 311.7, 74.7)),
                     dot(p, vec3(269.5, 183.3, 246.1)),
                     dot(p, vec3(113.5, 271.9, 124.6)));
            return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
        }

        float noise(vec2 p) {
            vec2 i = floor(p);
            vec2 f = fract(p);
            vec2 u = f * f * (3.0 - 2.0 * f);
            
            float n = mix(mix(dot(-1.0+2.0*fract(sin(i+vec2(0.0,0.0))*43758.5453), f-vec2(0.0,0.0)),
                              dot(-1.0+2.0*fract(sin(i+vec2(1.0,0.0))*43758.5453), f-vec2(1.0,0.0)), u.x),
                          mix(dot(-1.0+2.0*fract(sin(i+vec2(0.0,1.0))*43758.5453), f-vec2(0.0,1.0)),
                              dot(-1.0+2.0*fract(sin(i+vec2(1.0,1.0))*43758.5453), f-vec2(1.0,1.0)), u.x), u.y);
            return 0.5 + 0.5 * n;
        }

        float fbm(vec2 x) {
            float v = 0.0;
            float a = 0.5;
            vec2 shift = vec2(100.0);
            mat2 rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.50));
            for (int i = 0; i < 5; ++i) {
                v += a * noise(x);
                x = rot * x * 2.0 + shift;
                a *= 0.5;
            }
            return v;
        }
        
        vec3 temperatureToColor(float temp) {
            float t = clamp(temp / 10000000.0, 0.0, 1.0);
            vec3 lowTemp = vec3(1.0, 0.3, 0.0); 
            vec3 midTemp = vec3(1.0, 0.8, 0.5); 
            vec3 highTemp = vec3(0.7, 0.9, 1.0);
            if (t < 0.2) return mix(lowTemp, midTemp, t * 5.0);
            return mix(midTemp, highTemp, (t - 0.2) * 1.25);
        }

        void main() {
            vec3 viewDir = normalize(vViewPosition); 
            vec3 normal = normalize(vViewNormal);
            
            float f = abs(dot(viewDir, normal));
            float r = sqrt(max(0.0, 1.0 - f * f));
            
            float coreRadius = 0.2; 
            if (r < coreRadius) {
                gl_FragColor = vec4(0.0, 0.0, 0.0, 0.0); 
                #include <logdepthbuf_fragment>
                return;
            }
            
            float normDist = (r - coreRadius) / (1.0 - coreRadius);
            
            vec2 visualOffset = vViewPosition.xy - vViewCenter.xy;
            vec2 dir = length(visualOffset) > 0.0001 ? normalize(visualOffset) : vec2(1.0, 0.0);
            
            // LA MODIFICACIÓN ORIGINAL RESTAURADA:
            // Esto es lo que creaba el estiramiento infinito y la deformación extrema basada en la cámara.
            // Una curva de deflexión gravitacional real que tiende a infinito en el centro.
            float trueDeflection = 1.0 / (normDist * normDist + 0.01);
            
            // Fondo anclado a la cámara para la distorsión volumétrica
            vec2 baseUV = viewDir.xy * 10.0; 
            
            // Coordenada ópticamente doblada por la gravedad
            vec2 lensedUV = baseUV + dir * (trueDeflection * 0.2);
            
            // Frame-Dragging: El espacio-tiempo gira arrastrado por el agujero negro
            float swirl = uSpin * (1.0 / (normDist + 0.1)) * uTime * 2.0;
            float s = sin(swirl);
            float c = cos(swirl);
            lensedUV = mat2(c, -s, s, c) * lensedUV;
            
            // AHORA SÍ, TU ESTRATEGIA DE PERCENTILES TIENE SENTIDO:
            // Las aplicamos a la textura que ya está matemáticamente deformada al infinito
            float chaosRamp = smoothstep(0.3, 0.75, normDist);
            float calmRamp = smoothstep(0.75, 1.0, normDist);
            
            // Reducimos muchísimo las frecuencias para evitar las extrañas formas geométricas (Moiré)
            // Esto asegura formas curvilíneas finas, como un tronco de árbol cortado
            // Frecuencias BAJAS para crear nubes toscas, gruesas y pesadas (estilo Júpiter)
            float freq = mix(mix(0.1, 0.4, chaosRamp), 0.2, calmRamp);
            
            // Tu estrategia de rangos aplicada directamente a la intensidad del ruido
            // 0.0 = Centro liso perfecto sin distorsión visible. 2.5 = Pico de caos. 0.5 = Exterior normal.
            float amplitude = mix(mix(0.0, 2.5, chaosRamp), 0.5, calmRamp);
            
            // CERO WOBBLE. Solo ruido FBM puro modificado en su fuerza (amplitud) y tamaño (frecuencia).
            float baseNoise = fbm(lensedUV * freq - vec2(uTime * 0.05));
            float rawNoise = baseNoise * amplitude;
            
            float crispness = smoothstep(0.65, 0.25, r);
            float n = mix(0.35, rawNoise, crispness); 
            
            float starlight = n * n * 3.0;
            
            // COLORES CORREGIDOS:
            vec3 heatColor = temperatureToColor(uTemperature);
            float activityFactor = clamp(uAccretionRate * 4.0, 0.0, 1.0);
            
            // El fondo es espacio natural (azul/blanco). Si hay actividad térmica, el plasma emite luz y tiñe el gas circundante.
            vec3 spaceDark = vec3(0.02, 0.05, 0.1);
            vec3 spaceLight = vec3(0.8, 0.9, 1.0);
            vec3 naturalSpace = mix(spaceDark, spaceLight, n);
            
            // Tiñe el espacio con el calor de la acreción
            vec3 spaceGasColor = mix(naturalSpace, heatColor, n * activityFactor * 0.85);
            vec3 finalColor = spaceGasColor * starlight;
            
            // Disco Doblado (Efecto Interstellar de lente gravitacional polar)
            float polarMask = smoothstep(0.1, 0.85, abs(vLocalNormal.y)); 
            
            float rawDiskGas = fbm(lensedUV * 0.3 - vec2(uTime * 0.2));
            float diskGas = mix(0.3, rawDiskGas, crispness);
            
            // Intensidad del disco proyectado
            float diskIntensity = smoothstep(0.5, 0.0, normDist) * (uAccretionRate * 6.0);
            
            // Para que el color coincida con el disco real (que brilla mucho y se vuelve casi blanco/amarillo)
            // añadimos una simulación de brillo intenso.
            vec3 brightGlow = heatColor + vec3(0.7, 0.5, 0.2); 
            vec3 diskColor = mix(heatColor * 0.4, brightGlow * 1.8, diskGas);
            
            float warpedDisk = polarMask * diskGas * diskIntensity;
            
            finalColor += diskColor * warpedDisk;
            
            float outerFade = smoothstep(1.0, 0.3, r);
            float innerFade = smoothstep(0.0, 0.01, normDist);
            
            float alpha = clamp(outerFade * innerFade, 0.0, 1.0);
            
            gl_FragColor = vec4(finalColor * alpha, alpha);
            #include <logdepthbuf_fragment>
        }
    `;

    return new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.BackSide
    });
}

// Accretion Disk Shader: Swirling Plasma and Relativistic Doppler Beaming.
export function getAccretionDiskShaderMaterial(diskTemp, accretionRate, spin, innerRadius, outerRadius) {
    const vertexShader = `
        #include <common>
        #include <logdepthbuf_pars_vertex>
        varying vec2 vUv;
        varying vec3 vLocalPosition;
        
        void main() {
            vUv = uv;
            vLocalPosition = position;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            #include <logdepthbuf_vertex>
        }
    `;

    const fragmentShader = `
        #include <common>
        #include <logdepthbuf_pars_fragment>
        varying vec2 vUv;
        varying vec3 vLocalPosition;
        
        uniform vec3 cameraPosLocal;
        uniform float temperature;
        uniform float accretion;
        uniform float spin;
        uniform float innerRadius;
        uniform float outerRadius;
        uniform float uTime;

        vec3 temperatureToColor(float temp) {
            float t = clamp(temp / 10000000.0, 0.0, 1.0);
            vec3 lowTemp = vec3(1.0, 0.3, 0.0); 
            vec3 midTemp = vec3(1.0, 0.8, 0.5); 
            vec3 highTemp = vec3(0.7, 0.9, 1.0);
            if (t < 0.2) return mix(lowTemp, midTemp, t * 5.0);
            return mix(midTemp, highTemp, (t - 0.2) * 1.25);
        }

        float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453123); }
        float noise(vec2 p) {
            vec2 i = floor(p), f = fract(p);
            vec2 u = f * f * (3.0 - 2.0 * f);
            return mix(mix(hash(i + vec2(0.0,0.0)), hash(i + vec2(1.0,0.0)), u.x),
                       mix(hash(i + vec2(0.0,1.0)), hash(i + vec2(1.0,1.0)), u.x), u.y);
        }
        // FBM optimizado a solo 3 octavas para recuperar rendimiento
        float fbm(vec2 p) {
            float v = 0.0, a = 0.5;
            mat2 rot = mat2(0.87758, 0.47942, -0.47942, 0.87758);
            for (int i = 0; i < 3; i++) { v += a * noise(p); p = rot * p * 2.0; a *= 0.5; }
            return v;
        }

        void main() {
            float dist = length(vLocalPosition.xy);
            vec3 radialDir = normalize(vec3(vLocalPosition.xy, 0.0));
            vec3 tangent = cross(vec3(0.0, 0.0, 1.0), radialDir); 
            vec3 viewDir = normalize(cameraPosLocal - vLocalPosition);
            
            float dopplerFactor = dot(viewDir, tangent);
            float speedMult = mix(0.4, 1.0, spin); // Menos agresivo para evitar el quemado
            float beaming = 1.0 + (dopplerFactor * speedMult);
            beaming = max(beaming, 0.1); 
            
            float rNorm = clamp((dist - innerRadius) / (outerRadius - innerRadius), 0.0, 1.0);
            
            // Difuminar los bordes interior y exterior. 
            // El borde interior debe ser muy agudo (0.02) para que el gas empiece casi exactamente en el ISCO.
            float radialFade = smoothstep(0.0, 0.02, rNorm) * smoothstep(1.0, 0.6, rNorm);
            
            // Domain Warping continuo (sin atan para que no haya costura)
            float angleOffset = -rNorm * 10.0 + uTime * spin * 2.0;
            float c = cos(angleOffset);
            float s = sin(angleOffset);
            mat2 spiralRot = mat2(c, s, -s, c);
            
            vec2 samplePos = (spiralRot * vLocalPosition.xy) * (15.0 / outerRadius);
            
            // Solo calculamos 1 FBM optimizado para ahorrar rendimiento
            float turbulence = fbm(samplePos - uTime * 0.5);
            turbulence = pow(turbulence, 1.2) * 1.5; // Contraste más suave
            
            vec3 baseColor = temperatureToColor(temperature * (0.5 + turbulence));
            vec3 finalColor = baseColor * beaming * (0.8 + turbulence * 0.5);
            
            if (dopplerFactor > 0.0) {
                finalColor += vec3(0.3, 0.6, 1.0) * dopplerFactor * spin * turbulence * 0.5;
            } else {
                finalColor += vec3(1.0, 0.3, 0.0) * abs(dopplerFactor) * spin * turbulence * 0.5;
            }
            
            float alpha = clamp(accretion * radialFade * beaming * (0.5 + turbulence), 0.0, 1.0);
            gl_FragColor = vec4(finalColor, alpha);
            #include <logdepthbuf_fragment>
        }
    `;

    return new THREE.ShaderMaterial({
        uniforms: {
            cameraPosLocal: { value: new THREE.Vector3() },
            temperature: { value: diskTemp },
            accretion: { value: accretionRate },
            spin: { value: spin },
            innerRadius: { value: innerRadius },
            outerRadius: { value: outerRadius },
            uTime: { value: 0.0 }
        },
        vertexShader,
        fragmentShader,
        transparent: true,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        depthWrite: false
    });
}
