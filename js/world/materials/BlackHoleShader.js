import * as THREE from 'three';

/**
 * ============================================================================
 * SHADERS RELATIVISTAS DE ALTA PRECISIÓN PARA AGUJEROS NEGROS (MÉTRICA DE KERR)
 * ============================================================================
 * 1. Lente Gravitacional de Bozza / Padé en campo fuerte con asíntota en 1.02 * R_shadow.
 * 2. Deformación Asimétrica de la Sombra de Bardeen mediante uSpinAxis y espín relativista.
 * 3. Anillo de Fotones (Photon Ring) hiperfino e hiperintenso en el borde crítico de la sombra.
 * 4. Proyección analítica del disco posterior curvado (efecto Gargantúa de Interstellar).
 * 5. Disco de Acreción Ecuatorial con Doppler Beaming relativista (delta^3.8) y perfil Novikov-Thorne.
 * 6. Rotación Diferencial Kepleriana Omega(r) proporcional a r^(-1.5).
 */

// Función compartida de Planck / Novikov-Thorne para mapear temperatura a color físico
const GLSL_COLOR_AND_NOISE = `
    vec3 temperatureToColor(float temp) {
        float t = clamp(temp / 20000000.0, 0.0, 1.0);
        vec3 deepRed  = vec3(0.75, 0.12, 0.02); // Radiación infrarroja / borde exterior frío
        vec3 warmGold = vec3(1.00, 0.60, 0.15); // Emisión térmica intermedia
        vec3 brightWhite = vec3(1.00, 0.95, 0.85); // Zona de máxima disipación Novikov-Thorne
        vec3 xrayBlue = vec3(0.65, 0.85, 1.00); // Rayos X duros / Doppler blueshift extremo

        if (t < 0.15) {
            return mix(deepRed, warmGold, t / 0.15);
        } else if (t < 0.55) {
            return mix(warmGold, brightWhite, (t - 0.15) / 0.40);
        } else {
            return mix(brightWhite, xrayBlue, (t - 0.55) / 0.45);
        }
    }

    float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
    }

    float hash3D(vec3 p) {
        p = fract(p * vec3(443.897, 441.423, 437.195));
        p += dot(p, p.yzx + 19.19);
        return fract((p.x + p.y) * p.z);
    }

    vec3 hash33(vec3 p) {
        p = fract(p * vec3(443.897, 441.423, 437.195));
        p += dot(p, p.yxz + 19.19);
        return fract((p.xxy + p.yxx) * p.zyx);
    }

    float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
                   mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
    }

    float fbm(vec2 p) {
        float v = 0.0;
        float a = 0.5;
        mat2 rot = mat2(0.87758, 0.47942, -0.47942, 0.87758);
        for (int i = 0; i < 4; i++) {
            v += a * noise(p);
            p = rot * p * 2.0;
            a *= 0.5;
        }
        return v;
    }

    // Bóveda Celeste Relativista: Estrellas cósmicas, nebulosas y banda galáctica
    vec3 sampleCelestialStars(vec3 dir) {
        vec3 col = vec3(0.0);
        
        // 1. Estrellas principales y medianas con núcleo brillante y halo suave
        vec3 p1 = dir * 110.0;
        vec3 id1 = floor(p1);
        vec3 f1 = fract(p1) - 0.5;
        float h1 = hash3D(id1);
        if (h1 > 0.78) {
            vec3 offset1 = (hash33(id1 + 1.1) - 0.5) * 0.7;
            float d1 = length(f1 - offset1);
            float core1 = smoothstep(0.09, 0.005, d1);
            float halo1 = smoothstep(0.35, 0.02, d1);
            float star1 = (core1 * 3.5 + halo1 * 0.7) * ((h1 - 0.78) / 0.22);
            
            float colRand = hash3D(id1 + 5.3);
            vec3 sCol = (colRand > 0.65) ? vec3(0.75, 0.88, 1.0) : ((colRand > 0.25) ? vec3(1.0, 0.96, 0.88) : vec3(1.0, 0.65, 0.4));
            col += sCol * star1;
        }
        
        // 2. Micro-estrellas densas de fondo
        vec3 p2 = dir * 200.0;
        vec3 id2 = floor(p2);
        vec3 f2 = fract(p2) - 0.5;
        float h2 = hash3D(id2);
        if (h2 > 0.80) {
            vec3 offset2 = (hash33(id2 + 3.7) - 0.5) * 0.7;
            float d2 = length(f2 - offset2);
            float core2 = smoothstep(0.08, 0.01, d2);
            float halo2 = smoothstep(0.25, 0.02, d2);
            float star2 = (core2 * 2.2 + halo2 * 0.5) * ((h2 - 0.80) / 0.20);
            col += vec3(0.85, 0.92, 1.0) * star2;
        }
        
        // 3. Banda de polvo y nebulosa galáctica cósmica
        float galLat = dot(dir, normalize(vec3(0.25, 0.85, 0.45)));
        float galBand = exp(-galLat * galLat * 9.0);
        if (galBand > 0.01) {
            vec2 nebUV = vec2(atan(dir.z, dir.x) * 1.5, dir.y * 2.5);
            float nebFbm = fbm(nebUV * 2.5);
            vec3 nebCol = mix(vec3(0.06, 0.12, 0.28), vec3(0.40, 0.15, 0.32), nebFbm);
            col += nebCol * galBand * 0.85;
        }
        
        return col;
    }
`;

/**
 * Material para la Lente Gravitacional, Sombra Asimétrica de Bardeen, Anillo de Fotones y Arcos de Gargantúa
 */
export function getLensingShaderMaterial(options = {}, lensRadiusArg) {
    let spin = 0.5;
    let temperature = 1.5e7;
    let accretionRate = 0.5;
    let rs = 5000.0;
    let rShadow = 12990.0;
    let rIsco = 15000.0;
    let rOuter = 50000.0;
    let hasDisk = 1.0;
    let lensRadius = lensRadiusArg || 150000.0;
    const spinAxis = new THREE.Vector3(0, 1, 0); // Eje polar Y en el espacio local del agujero

    if (typeof options === 'object' && options !== null && !(options instanceof THREE.Vector3)) {
        spin = options.spin !== undefined ? options.spin : spin;
        temperature = options.diskTemperature !== undefined ? options.diskTemperature : (options.temperature || temperature);
        accretionRate = options.accretionRate !== undefined ? options.accretionRate : accretionRate;
        rs = options.schwarzschildRadius || rs;
        rShadow = options.shadowRadius || (rs * 2.598);
        rIsco = options.iscoRadius || (rs * 3.0);
        rOuter = options.outerDiskRadius || (rIsco + rs * 20.0);
        hasDisk = (options.hasDisk !== undefined ? options.hasDisk : true) ? 1.0 : 0.0;
        lensRadius = lensRadiusArg || options.lensRadius || (hasDisk > 0.5 ? Math.max(rShadow * 5.0, rOuter * 1.18) : rShadow * 5.0);
    } else {
        spin = arguments[0] !== undefined ? arguments[0] : spin;
        temperature = arguments[1] !== undefined ? arguments[1] : temperature;
        accretionRate = arguments[2] !== undefined ? arguments[2] : accretionRate;
        lensRadius = lensRadiusArg || (hasDisk > 0.5 ? Math.max(rShadow * 5.0, rOuter * 1.18) : rShadow * 5.0);
    }

    const uniforms = {
        uTime: { value: 0.0 },
        uSpin: { value: spin },
        uSpinAxis: { value: spinAxis },
        uTemperature: { value: temperature },
        uAccretionRate: { value: accretionRate },
        uSchwarzschildRadius: { value: rs },
        uShadowRadius: { value: rShadow },
        uIscoRadius: { value: rIsco },
        uOuterRadius: { value: rOuter },
        uHasDisk: { value: hasDisk },
        uLensRadius: { value: lensRadius },
        cameraPosLocal: { value: new THREE.Vector3(0, 0, 50000) }
    };

    const vertexShader = `
        #include <common>
        #include <logdepthbuf_pars_vertex>
        
        varying vec3 vLocalPos;
        varying vec3 vViewPos;
        varying mat3 vModelRot;

        void main() {
            vLocalPos = position;
            vModelRot = mat3(modelMatrix);
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            vViewPos = mvPosition.xyz;
            gl_Position = projectionMatrix * mvPosition;
            #include <logdepthbuf_vertex>
        }
    `;

    const fragmentShader = `
        #include <common>
        #include <logdepthbuf_pars_fragment>

        uniform float uTime;
        uniform float uSpin;
        uniform vec3 uSpinAxis;
        uniform float uTemperature;
        uniform float uAccretionRate;
        uniform float uSchwarzschildRadius;
        uniform float uShadowRadius;
        uniform float uIscoRadius;
        uniform float uOuterRadius;
        uniform float uHasDisk;
        uniform float uLensRadius;
        uniform vec3 cameraPosLocal;

        varying vec3 vLocalPos;
        varying vec3 vViewPos;
        varying mat3 vModelRot;

        ${GLSL_COLOR_AND_NOISE}

        void main() {
            vec3 C = cameraPosLocal;
            vec3 P = vLocalPos;
            vec3 rayDir = normalize(P - C);

            // Parámetro de impacto euclídeo b = length(C x rayDir)
            float distCam = length(C);
            if (distCam < 0.001) distCam = 0.001;

            vec3 camNorm = C / distCam;
            vec3 crossVal = cross(C, rayDir);
            float b = length(crossVal);

            // =========================================================================
            // 1. ASIMETRÍA DE SOMBRA DE BARDEEN (KERR) VÍA uSpinAxis
            // =========================================================================
            float cosInc = clamp(dot(camNorm, uSpinAxis), -1.0, 1.0);
            float sinInc = sqrt(max(0.0, 1.0 - cosInc * cosInc));

            // Proyección del eje de giro en el plano visual
            vec3 spinProj = uSpinAxis - cosInc * camNorm;
            vec3 spinSky = (length(spinProj) > 0.001) ? normalize(spinProj) : vec3(0.0, 1.0, 0.0);
            vec3 progradeSky = cross(camNorm, spinSky);

            vec3 closestPoint = C - dot(C, rayDir) * rayDir;
            vec3 impactDir = (length(closestPoint) > 0.001) ? normalize(closestPoint) : vec3(1.0, 0.0, 0.0);

            float cosPhi = dot(impactDir, progradeSky);

            // Sombra crítica modulada analíticamente: silueta en "D" achatada de Bardeen
            float rShadowCrit = uShadowRadius * (1.0 - 0.28 * uSpin * sinInc * cosPhi);

            // =========================================================================
            // 2. CORTE DE LA SOMBRA (AGUJERO NEGRO PURO)
            // =========================================================================
            if (b <= rShadowCrit) {
                // Rayo capturado por el horizonte de eventos: oscuridad absoluta
                gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
                #include <logdepthbuf_fragment>
                return;
            }

            // =========================================================================
            // 3. ANILLO DE FOTONES (PHOTON RING FINO Y RADIANTE)
            // =========================================================================
            // Brilla siempre: por plasma caliente si hay disco, o por luz cósmica ultracomprimida si es durmiente
            float distFromShadow = b - rShadowCrit;
            float ringWidth = max(0.007 * rShadowCrit, 15.0);
            float photonRing = exp(-pow(distFromShadow / ringWidth, 2.0));
            vec3 photonRingColor = (uHasDisk > 0.5) 
                ? vec3(1.0, 0.96, 0.88) * (photonRing * 4.0)
                : vec3(0.85, 0.95, 1.00) * (photonRing * 3.5);

            // =========================================================================
            // 4. SINGULARIDAD DE PADÉ / BOZZA EN CAMPO FUERTE: alpha(b)
            // =========================================================================
            float bAsymp = 1.02 * rShadowCrit;
            float safeDenom = max(b - bAsymp, 0.0005 * rShadowCrit);
            float alphaDeflection = (2.0 * uSchwarzschildRadius / max(b, 0.001)) + (1.4 * uSchwarzschildRadius / safeDenom);
            
            // Atenuación asintótica suave en el borde exterior del lienzo (uLensRadius)
            float maxBound = uLensRadius;
            float lensBoundary = smoothstep(1.0, 0.70, b / maxBound);
            float defAngle = min(alphaDeflection, 6.283) * lensBoundary;

            vec3 deflectedDir = normalize(rayDir - (impactDir * sin(defAngle) * 0.75));

            // =========================================================================
            // 5. BÓVEDA CELESTE RELATIVISTA (Lente gravitacional sobre estrellas y cosmos)
            // =========================================================================
            vec3 worldDeflectedDir = normalize(vModelRot * deflectedDir);
            vec3 lensedSkyColor = sampleCelestialStars(worldDeflectedDir);

            // =========================================================================
            // 6. PROYECCIÓN POLAR DEL DISCO (EFECTO GARGANTÚA / ARCOS POSTERIORES)
            // =========================================================================
            vec3 lensedDiskColor = vec3(0.0);
            float lensedDiskAlpha = 0.0;

            if (uHasDisk > 0.5) {
                // Origen del rayo deflectado anclado en el periastro Pclose
                float sClose = -dot(C, rayDir);
                vec3 Pclose = C + sClose * rayDir;

                // Intersección con el plano ecuatorial local XZ (y = 0)
                float denom = dot(deflectedDir, uSpinAxis);
                if (abs(denom) > 0.0001) {
                    float tDisk = -dot(Pclose, uSpinAxis) / denom;
                    // Solo rayos que viajan hacia adelante desde el periastro (cara posterior del agujero)
                    if (tDisk > 0.0) {
                        vec3 hitPos = Pclose + tDisk * deflectedDir;
                        float rHit = length(hitPos.xz);

                        if (rHit >= uIscoRadius && rHit <= uOuterRadius) {
                            // Temperatura y disipación Novikov-Thorne
                            float rRatio = uIscoRadius / max(rHit, uIscoRadius);
                            float tempFactor = pow(rRatio, 0.75) * pow(max(0.0, 1.0 - sqrt(rRatio)), 0.25) * 1.8;
                            float localTemp = uTemperature * tempFactor;

                            // Doppler relativista
                            vec3 radHit = normalize(vec3(hitPos.x, 0.0, hitPos.z));
                            vec3 vTan = vec3(-radHit.z, 0.0, radHit.x);
                            float beta = min(0.65, sqrt(0.5 * uSchwarzschildRadius / max(rHit, uIscoRadius)));
                            float gamma = 1.0 / sqrt(max(0.01, 1.0 - beta * beta));
                            float cosV = dot(-deflectedDir, vTan);
                            float deltaDoppler = 1.0 / (gamma * (1.0 - beta * cosV));
                            float beaming = clamp(pow(deltaDoppler, 3.8), 0.08, 14.0);

                            // Redshift gravitacional
                            float gRedshift = sqrt(max(0.0, 1.0 - uSchwarzschildRadius / max(rHit, uIscoRadius)));
                            float obsTemp = localTemp * deltaDoppler * gRedshift;

                            // Rotación diferencial y turbulencia idéntica al disco directo
                            float angSpeed = (1.0 + 2.5 * uSpin) * pow(rRatio, 1.5);
                            float hitPhi = atan(hitPos.z, hitPos.x) - (uTime * angSpeed);
                            vec2 diskUV = vec2(cos(hitPhi), sin(hitPhi)) * (rHit / uOuterRadius * 14.0);
                            float gasNoise = fbm(diskUV - vec2(uTime * 0.25));
                            gasNoise = pow(gasNoise, 1.15) * 1.4;

                            vec3 diskBaseColor = temperatureToColor(obsTemp * (0.7 + gasNoise * 0.5));
                            lensedDiskColor = diskBaseColor * beaming * (0.85 + gasNoise * 0.45);

                            // Resalte de Doppler: azul en aproximación, ámbar oscuro en alejamiento
                            if (cosV > 0.0) {
                                lensedDiskColor += vec3(0.25, 0.55, 1.00) * cosV * uSpin * gasNoise * 0.6;
                            } else {
                                lensedDiskColor += vec3(0.85, 0.20, 0.02) * abs(cosV) * uSpin * gasNoise * 0.5;
                            }

                            // Desvanecimiento suave en los bordes
                            float rNorm = (rHit - uIscoRadius) / (uOuterRadius - uIscoRadius);
                            float edgeFade = smoothstep(0.0, 0.02, rNorm) * smoothstep(1.0, 0.65, rNorm);
                            lensedDiskAlpha = clamp(uAccretionRate * edgeFade * (0.6 + gasNoise * 0.5) * min(beaming, 2.5), 0.0, 1.0);
                        }
                    }
                }
            }

            // =========================================================================
            // 7. HALO DE GAS IONIZADO / RADIACIÓN DIFUSA EN TORNO AL FOTÓN
            // =========================================================================
            float halo = exp(-distFromShadow / (0.25 * rShadowCrit)) * 0.75;
            vec3 haloColor = (uHasDisk > 0.5) 
                ? temperatureToColor(uTemperature * 0.5) * halo * uAccretionRate
                : vec3(0.25, 0.45, 0.75) * halo * 0.35;

            // =========================================================================
            // 8. COMPOSICIÓN Y DESVANECIMIENTO SUAVE HACIA EL BORDE DE LA ESFERA
            // =========================================================================
            float boundaryFade = smoothstep(1.0, 0.85, b / maxBound);

            lensedDiskAlpha *= boundaryFade;
            float haloAlpha = halo * (uHasDisk > 0.5 ? uAccretionRate * 0.6 : 0.3) * boundaryFade;

            // Composición: Estrellas de fondo deflectadas + Arcos del disco de acreción + Anillo de fotones + Halo
            vec3 finalColor = (lensedSkyColor * boundaryFade) * (1.0 - lensedDiskAlpha * 0.85) + lensedDiskColor * lensedDiskAlpha + photonRingColor + haloColor * haloAlpha;
            float finalAlpha = clamp(photonRing + lensedDiskAlpha + haloAlpha + boundaryFade, 0.0, 1.0);

            gl_FragColor = vec4(finalColor, finalAlpha);
            #include <logdepthbuf_fragment>
        }
    `;

    return new THREE.ShaderMaterial({
        uniforms,
        vertexShader,
        fragmentShader,
        transparent: true,
        blending: THREE.NormalBlending,
        depthWrite: false,
        side: THREE.BackSide
    });
}

/**
 * Material de Post-Procesamiento Screen-Space para la Lente Gravitacional Relativista (Opción 2)
 * Renderiza analíticamente en 3D:
 * 1. Disco frontal con profundidad física Z verdadera (pasa frente al horizonte sin cortes).
 * 2. Sombra de Kerr asimétrica de Bardeen modulada por espín.
 * 3. Esfera de Fotones volumétrica hiperintensa (anillo crítico caústico n=1 + corona de plasma + ergósfera).
 * 4. Arcos de Gargantúa (proyección gravitacional curvada del disco posterior sobre y bajo el horizonte).
 * 5. Refracción óptica del universo real detrás del agujero negro con convergencia C1 suave.
 */
export function getGravitationalLensPostMaterial() {
    return new THREE.ShaderMaterial({
        uniforms: {
            tDiffuse: { value: null },
            uAspect: { value: 1.0 },
            uTanHalfFov: { value: 0.577 },
            uLocalCamPos: { value: new THREE.Vector3(0, 0, 50000) },
            uCamToLocal: { value: new THREE.Matrix3() },
            uLocalToCam: { value: new THREE.Matrix3() },
            uSchwarzschildRadius: { value: 5000.0 },
            uShadowRadiusWorld: { value: 12990.0 },
            uMaxInfluenceRadius: { value: 80000.0 },
            uIscoRadius: { value: 15000.0 },
            uOuterRadius: { value: 60000.0 },
            uSpin: { value: 0.5 },
            uTemperature: { value: 1.5e7 },
            uAccretionRate: { value: 0.5 },
            uHasDisk: { value: 1.0 },
            uTime: { value: 0.0 }
        },
        vertexShader: `
            varying vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = vec4(position.xy, 0.0, 1.0);
            }
        `,
        fragmentShader: `
            uniform sampler2D tDiffuse;
            uniform float uAspect;
            uniform float uTanHalfFov;
            uniform vec3 uLocalCamPos;
            uniform mat3 uCamToLocal;
            uniform mat3 uLocalToCam;
            uniform float uSchwarzschildRadius;
            uniform float uShadowRadiusWorld;
            uniform float uMaxInfluenceRadius;
            uniform float uIscoRadius;
            uniform float uOuterRadius;
            uniform float uSpin;
            uniform float uTemperature;
            uniform float uAccretionRate;
            uniform float uHasDisk;
            uniform float uTime;

            varying vec2 vUv;

            ${GLSL_COLOR_AND_NOISE}

            void main() {
                // 1. GENERACIÓN DEL RAYO 3D EN EL ESPACIO LOCAL DEL AGUJERO NEGRO
                // Reconstrucción matemática exacta de la línea de visión en el espacio de la cámara
                float ndcX = (vUv.x - 0.5) * 2.0 * uAspect * uTanHalfFov;
                float ndcY = (vUv.y - 0.5) * 2.0 * uTanHalfFov;
                vec3 rayDirCam = normalize(vec3(ndcX, ndcY, -1.0));
                vec3 rayDirLocal = normalize(uCamToLocal * rayDirCam);
                vec3 C = uLocalCamPos;
                float distCam = length(C);

                // Parámetro de impacto euclídeo 3D: b = ||C x rayDirLocal||
                float sClose = -dot(C, rayDirLocal);
                vec3 Pclose = C + sClose * rayDirLocal;
                float b = length(Pclose);

                // Descarte 3D físico: Si el rayo pasa completamente fuera del radio de influencia y disco
                if (b > uMaxInfluenceRadius && (sClose < 0.0 || distCam > uMaxInfluenceRadius)) {
                    gl_FragColor = texture2D(tDiffuse, vUv);
                    return;
                }

                // =========================================================================
                // 2. DISCO DE ACRECIÓN FRONTAL (ENTRE LA CÁMARA Y EL HORIZONTE)
                // =========================================================================
                vec3 frontCol = vec3(0.0);
                float frontAlpha = 0.0;

                if (uHasDisk > 0.5 && abs(rayDirLocal.y) > 0.00001) {
                    float tFront = -C.y / rayDirLocal.y;
                    // Intersección en el hemisferio frontal (más cercano que Pclose)
                    if (tFront > 0.0 && (sClose <= 0.0 || tFront < sClose)) {
                        vec3 hitFront = C + tFront * rayDirLocal;
                        float rFront = length(hitFront.xz);
                        if (rFront >= uIscoRadius && rFront <= uOuterRadius) {
                            // Rotación diferencial Kepleriana Omega(r) ~ r^(-1.5)
                            float rRatioF = uIscoRadius / max(rFront, uIscoRadius);
                            float angVelF = (1.0 + 2.5 * uSpin) * pow(rRatioF, 1.5);
                            float phiF = atan(hitFront.z, hitFront.x) - (uTime * angVelF);
                            vec2 uvF = vec2(cos(phiF), sin(phiF)) * (rFront / uOuterRadius * 14.0);
                            float turbF = fbm(uvF - vec2(uTime * 0.25));
                            turbF = pow(turbF, 1.15) * 1.4;

                            // Doppler Beaming relativista y corrimiento espectral
                            vec3 radF = normalize(vec3(hitFront.x, 0.0, hitFront.z));
                            vec3 vTanF = vec3(-radF.z, 0.0, radF.x);
                            float cosThetaF = dot(-rayDirLocal, vTanF);
                            float betaF = min(0.65, sqrt(0.5 * uSchwarzschildRadius / max(rFront, uIscoRadius)));
                            float gammaF = 1.0 / sqrt(max(0.01, 1.0 - betaF * betaF));
                            float deltaF = 1.0 / (gammaF * (1.0 - betaF * cosThetaF));
                            float beamingF = clamp(pow(deltaF, 3.8), 0.08, 14.0);

                            // Perfil térmico de Novikov-Thorne
                            float tempFactF = pow(rRatioF, 0.75) * pow(max(0.0, 1.0 - sqrt(rRatioF)), 0.25) * 1.8;
                            float gRedF = sqrt(max(0.0, 1.0 - uSchwarzschildRadius / max(rFront, uIscoRadius)));
                            float obsTempF = uTemperature * tempFactF * deltaF * gRedF * (0.7 + turbF * 0.5);

                            vec3 baseColF = temperatureToColor(obsTempF);
                            frontCol = baseColF * beamingF * (0.85 + turbF * 0.45);
                            if (cosThetaF > 0.0) {
                                frontCol += vec3(0.25, 0.55, 1.00) * cosThetaF * uSpin * turbF * 0.6;
                            } else {
                                frontCol += vec3(0.85, 0.20, 0.02) * abs(cosThetaF) * uSpin * turbF * 0.5;
                            }

                            float rNormF = clamp((rFront - uIscoRadius) / (uOuterRadius - uIscoRadius), 0.0, 1.0);
                            float radialFadeF = smoothstep(0.0, 0.02, rNormF) * smoothstep(1.0, 0.70, rNormF);
                            frontAlpha = clamp(uAccretionRate * radialFadeF * (0.6 + turbF * 0.5) * min(beamingF, 2.5), 0.0, 1.0);
                        }
                    }
                }

                if (frontAlpha >= 0.98) {
                    gl_FragColor = vec4(frontCol, 1.0);
                    return;
                }

                // =========================================================================
                // 3. ASIMETRÍA DE BARDEEN (KERR) Y CORTE DEL HORIZONTE DE SUCESOS
                // =========================================================================
                vec3 camDirNorm = (distCam > 0.001) ? (C / distCam) : vec3(0.0, 0.0, 1.0);
                float cosInc = clamp(dot(camDirNorm, vec3(0.0, 1.0, 0.0)), -1.0, 1.0);
                float sinInc = sqrt(max(0.0, 1.0 - cosInc * cosInc));
                vec3 impactDir = (b > 0.001) ? normalize(Pclose) : vec3(1.0, 0.0, 0.0);
                float cosPhi = dot(impactDir, vec3(1.0, 0.0, 0.0));
                float rShadowCrit = uShadowRadiusWorld * (1.0 - 0.22 * uSpin * sinInc * cosPhi);

                // Rayo atrapado por el horizonte de eventos: sombra negra impenetrable
                if (b <= rShadowCrit) {
                    vec3 finalCol = frontCol * frontAlpha;
                    gl_FragColor = vec4(finalCol, 1.0);
                    return;
                }

                // =========================================================================
                // 4. ESFERA Y ANILLO DE FOTONES (PHOTON RING & SPHERE RELATIVISTAS)
                // =========================================================================
                // En relatividad general (Thorne et al. 2015, EHT 2019), el anillo de fotones es
                // una caústica esbelta y nítida en b_crit, modulada por el Doppler orbital relativista.
                float distFromShadow = b - rShadowCrit;

                // A. Anillo de Fotones crítico n = 1 (Caústica nítida y esbelta ~1.2% del radio de sombra)
                float ringWidth = max(0.012 * rShadowCrit, 12.0);
                float photonRing = exp(-pow(distFromShadow / ringWidth, 2.0));

                // B. Halo orbital en la región de inmersión (plunging flow r ≈ 1.5 Rs, ancho ~4%)
                float haloWidth = 0.040 * rShadowCrit;
                float photonHalo = exp(-pow(distFromShadow / haloWidth, 1.5));

                // Asimetría Doppler relativista de los fotones orbitando en la dirección prógrada (+Y)
                // El lado en aproximación (cosPhi > 0) se amplifica naturalmente, el lado en alejamiento se atenúa
                float spinDoppler = clamp(1.0 + 0.65 * uSpin * cosPhi, 0.35, 2.0);

                vec3 photonColor;
                if (uHasDisk > 0.5) {
                    // Esfera de fotones activa: caústica blanca-oro brillante y nítida sin saturación plana
                    vec3 ringCol = vec3(1.00, 0.98, 0.92) * (photonRing * 1.85);
                    vec3 haloCol = vec3(1.00, 0.70, 0.22) * (photonHalo * 0.75);
                    photonColor = (ringCol + haloCol) * spinDoppler;
                } else {
                    // Agujero negro durmiente: caústica sutil azulada de luz estelar capturada
                    vec3 ringCol = vec3(0.92, 0.97, 1.00) * (photonRing * 1.35);
                    vec3 haloCol = vec3(0.40, 0.70, 1.00) * (photonHalo * 0.40);
                    photonColor = (ringCol + haloCol) * spinDoppler;
                }

                // =========================================================================
                // 5. DEFLEXIÓN GRAVITACIONAL DE BOZZA / PADÉ EN CAMPO FUERTE
                // =========================================================================
                float safeDenom = max(b - 1.02 * rShadowCrit, 0.001 * rShadowCrit);
                float alphaDeflection = (2.0 * uSchwarzschildRadius / max(b, 1.0)) + (1.35 * uSchwarzschildRadius / safeDenom);
                float lensBoundary = smoothstep(uMaxInfluenceRadius, uMaxInfluenceRadius * 0.65, b);
                float defAngle = min(alphaDeflection, 6.283) * lensBoundary;

                vec3 deflectedDir = normalize(rayDirLocal - (impactDir * sin(defAngle) * 0.82));
                
                // Arrastre Lense-Thirring alrededor del eje de giro +Y
                float swirl = uSpin * exp(-pow(max(0.0, (b / rShadowCrit) - 1.0), 0.7) * 2.5) * 0.50 * lensBoundary;
                float sS = sin(swirl), cS = cos(swirl);
                deflectedDir.xz = mat2(cS, -sS, sS, cS) * deflectedDir.xz;

                // =========================================================================
                // 6. ARCOS DE GARGANTÚA (PROYECCIÓN CURVADA DEL DISCO TRASERO)
                // =========================================================================
                vec3 archCol = vec3(0.0);
                float archAlpha = 0.0;

                if (uHasDisk > 0.5 && abs(deflectedDir.y) > 0.0001) {
                    float tBack = -Pclose.y / deflectedDir.y;
                    if (tBack > 0.0) {
                        vec3 hitBack = Pclose + tBack * deflectedDir;
                        float rBack = length(hitBack.xz);
                        if (rBack >= uIscoRadius && rBack <= uOuterRadius) {
                            float rRatioB = uIscoRadius / max(rBack, uIscoRadius);
                            float angVelB = (1.0 + 2.5 * uSpin) * pow(rRatioB, 1.5);
                            float phiB = atan(hitBack.z, hitBack.x) - (uTime * angVelB);
                            vec2 uvB = vec2(cos(phiB), sin(phiB)) * (rBack / uOuterRadius * 14.0);
                            float turbB = fbm(uvB - vec2(uTime * 0.25));
                            turbB = pow(turbB, 1.15) * 1.4;

                            vec3 radB = normalize(vec3(hitBack.x, 0.0, hitBack.z));
                            vec3 vTanB = vec3(-radB.z, 0.0, radB.x);
                            float cosThetaB = dot(-deflectedDir, vTanB);
                            float betaB = min(0.65, sqrt(0.5 * uSchwarzschildRadius / max(rBack, uIscoRadius)));
                            float gammaB = 1.0 / sqrt(max(0.01, 1.0 - betaB * betaB));
                            float deltaB = 1.0 / (gammaB * (1.0 - betaB * cosThetaB));
                            float beamingB = clamp(pow(deltaB, 3.8), 0.08, 14.0);

                            float tempFactB = pow(rRatioB, 0.75) * pow(max(0.0, 1.0 - sqrt(rRatioB)), 0.25) * 1.8;
                            float gRedB = sqrt(max(0.0, 1.0 - uSchwarzschildRadius / max(rBack, uIscoRadius)));
                            float obsTempB = uTemperature * tempFactB * deltaB * gRedB * (0.7 + turbB * 0.5);

                            vec3 baseColB = temperatureToColor(obsTempB);
                            archCol = baseColB * beamingB * (0.85 + turbB * 0.45);
                            if (cosThetaB > 0.0) {
                                archCol += vec3(0.25, 0.55, 1.00) * cosThetaB * uSpin * turbB * 0.6;
                            } else {
                                archCol += vec3(0.85, 0.20, 0.02) * abs(cosThetaB) * uSpin * turbB * 0.5;
                            }

                            float rNormB = clamp((rBack - uIscoRadius) / (uOuterRadius - uIscoRadius), 0.0, 1.0);
                            float radialFadeB = smoothstep(0.0, 0.02, rNormB) * smoothstep(1.0, 0.70, rNormB);
                            archAlpha = clamp(uAccretionRate * radialFadeB * (0.6 + turbB * 0.5) * min(beamingB, 2.5), 0.0, 1.0);
                        }
                    }
                }

                // =========================================================================
                // 7. REFRACCIÓN DEL UNIVERSO REAL DE FONDO
                // =========================================================================
                vec3 defCam = uLocalToCam * deflectedDir;
                vec2 defScreenUV = vUv;
                if (defCam.z < -0.001) {
                    float invZ = -1.0 / defCam.z;
                    float projX = (defCam.x * invZ) / (2.0 * uAspect * uTanHalfFov) + 0.5;
                    float projY = (defCam.y * invZ) / (2.0 * uTanHalfFov) + 0.5;
                    defScreenUV = clamp(vec2(projX, projY), 0.0005, 0.9995);
                }
                vec4 bgSky = texture2D(tDiffuse, defScreenUV);
                vec3 lensedSky = mix(texture2D(tDiffuse, vUv).rgb, bgSky.rgb, lensBoundary);

                // =========================================================================
                // 8. COMPOSICIÓN RELATIVISTA MULTICAPA
                // =========================================================================
                // Lo que está detrás del horizonte (arcos de Gargantúa + cosmos curvado + esfera de fotones)
                vec3 behindColor = lensedSky * (1.0 - archAlpha * 0.88) + archCol * archAlpha + photonColor;

                // Composición con el frente del disco (plano Z frontal)
                vec3 finalColor = behindColor * (1.0 - frontAlpha) + frontCol * frontAlpha;

                gl_FragColor = vec4(finalColor, 1.0);
            }
        `,
        depthTest: false,
        depthWrite: false
    });
}


/**
 * Material para el Disco de Acreción Ecuatorial con Doppler Beaming Relativista
 * y perfil térmico Novikov-Thorne sobre plano XZ.
 */
export function getAccretionDiskShaderMaterial(options = {}) {
    let diskTemp = 1.5e7;
    let accretionRate = 0.5;
    let spin = 0.5;
    let innerRadius = 15000.0;
    let outerRadius = 50000.0;
    let rs = 5000.0;

    if (typeof options === 'object' && options !== null && !(options instanceof THREE.Vector3)) {
        diskTemp = options.diskTemperature !== undefined ? options.diskTemperature : (options.temperature || diskTemp);
        accretionRate = options.accretionRate !== undefined ? options.accretionRate : accretionRate;
        spin = options.spin !== undefined ? options.spin : spin;
        innerRadius = options.iscoRadius || innerRadius;
        outerRadius = options.outerDiskRadius || outerRadius;
        rs = options.schwarzschildRadius || rs;
    } else {
        diskTemp = arguments[0] !== undefined ? arguments[0] : diskTemp;
        accretionRate = arguments[1] !== undefined ? arguments[1] : accretionRate;
        spin = arguments[2] !== undefined ? arguments[2] : spin;
        innerRadius = arguments[3] !== undefined ? arguments[3] : innerRadius;
        outerRadius = arguments[4] !== undefined ? arguments[4] : outerRadius;
        rs = arguments[5] !== undefined ? arguments[5] : (innerRadius / 3.0);
    }

    const uniforms = {
        cameraPosLocal: { value: new THREE.Vector3(0, 0, 50000) },
        temperature: { value: diskTemp },
        accretion: { value: accretionRate },
        spin: { value: spin },
        innerRadius: { value: innerRadius },
        outerRadius: { value: outerRadius },
        schwarzschildRadius: { value: rs },
        uTime: { value: 0.0 }
    };

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
        uniform float schwarzschildRadius;
        uniform float uTime;

        ${GLSL_COLOR_AND_NOISE}

        void main() {
            // Disco ecuatorial plano en XZ (y = 0)
            float dist = length(vLocalPosition.xz);
            
            // Protección contra píxeles dentro del borde interno ISCO
            if (dist < innerRadius * 0.98) {
                discard;
            }

            vec3 viewDir = normalize(cameraPosLocal - vLocalPosition);

            // =========================================================================
            // 1. ROTACIÓN DIFERENCIAL KEPLERIANA Omega(r) ~ (R_isco / r)^1.5
            // =========================================================================
            float rRatio = innerRadius / max(dist, innerRadius);
            float angVelocity = (1.0 + 2.5 * spin) * pow(rRatio, 1.5);
            float currentPhi = atan(vLocalPosition.z, vLocalPosition.x) - (uTime * angVelocity);
            
            vec2 rotatingCoords = vec2(cos(currentPhi), sin(currentPhi)) * (dist / outerRadius * 14.0);
            float turbulence = fbm(rotatingCoords - vec2(uTime * 0.25));
            turbulence = pow(turbulence, 1.15) * 1.4;

            // =========================================================================
            // 2. EFECTO DOPPLER RELATIVISTA Y BEAMING (delta^3.8)
            // =========================================================================
            vec3 radialDir = normalize(vec3(vLocalPosition.x, 0.0, vLocalPosition.z));
            vec3 tangent = cross(vec3(0.0, 1.0, 0.0), radialDir); // Vector de velocidad orbital prógrada alrededor de +Y
            float cosTheta = dot(viewDir, tangent);

            float beta = min(0.65, sqrt(0.5 * schwarzschildRadius / max(dist, innerRadius)));
            float gamma = 1.0 / sqrt(max(0.01, 1.0 - beta * beta));
            float delta = 1.0 / (gamma * (1.0 - beta * cosTheta));
            float beaming = clamp(pow(delta, 3.8), 0.08, 14.0);

            // =========================================================================
            // 3. PERFIL TÉRMICO DE NOVIKOV-THORNE CON CORRIMIENTO ESPECTRAL
            // =========================================================================
            float tempFactor = pow(rRatio, 0.75) * pow(max(0.0, 1.0 - sqrt(rRatio)), 0.25) * 1.8;
            float restTemp = temperature * tempFactor;
            
            // Redshift gravitacional hacia el ISCO
            float gRedshift = sqrt(max(0.0, 1.0 - schwarzschildRadius / max(dist, innerRadius)));
            float obsTemp = restTemp * delta * gRedshift * (0.7 + turbulence * 0.5);

            vec3 baseColor = temperatureToColor(obsTemp);
            vec3 finalColor = baseColor * beaming * (0.85 + turbulence * 0.45);

            // Resalte de Doppler: halo azul en aproximación, ámbar oscuro en alejamiento
            if (cosTheta > 0.0) {
                finalColor += vec3(0.25, 0.55, 1.00) * cosTheta * spin * turbulence * 0.6;
            } else {
                finalColor += vec3(0.85, 0.20, 0.02) * abs(cosTheta) * spin * turbulence * 0.5;
            }

            // =========================================================================
            // 4. DIFUMINADO SUAVE DE BORDES RADIALES Y OPACIDAD
            // =========================================================================
            float rNorm = clamp((dist - innerRadius) / (outerRadius - innerRadius), 0.0, 1.0);
            float radialFade = smoothstep(0.0, 0.02, rNorm) * smoothstep(1.0, 0.65, rNorm);
            
            // Opacidad de plasma que responde a la tasa de acreción y Doppler beaming
            float alpha = clamp(accretion * radialFade * (0.6 + turbulence * 0.5) * min(beaming, 2.5), 0.0, 1.0);

            gl_FragColor = vec4(finalColor, alpha);
            #include <logdepthbuf_fragment>
        }
    `;

    return new THREE.ShaderMaterial({
        uniforms,
        vertexShader,
        fragmentShader,
        transparent: true,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        depthWrite: false
    });
}
