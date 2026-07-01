import * as THREE from 'three';

export const PlanetShaderMaterial = new THREE.MeshLambertMaterial({
    color: 0xffffff // will be overridden
});

PlanetShaderMaterial.onBeforeCompile = (shader) => {
    shader.uniforms.uSeed = { value: 0.0 };
    shader.uniforms.uColorLow = { value: new THREE.Color(0x333333) };
    shader.uniforms.uColorHigh = { value: new THREE.Color(0xffffff) };
    shader.uniforms.uNoiseFreq = { value: 4.0 };
    shader.uniforms.uCloudDensity = { value: 0.5 };
    shader.uniforms.uCloudColor = { value: new THREE.Color(0xffffff) };
    shader.uniforms.uAtmosphere = { value: 1.0 };
    shader.uniforms.uWarpStrength = { value: 2.0 };
    shader.uniforms.uStretchY = { value: 1.0 };

    shader.vertexShader = `
        varying vec3 vLocalPos;
        ${shader.vertexShader}
    `.replace(
        `#include <begin_vertex>`,
        `#include <begin_vertex>
        vLocalPos = position;`
    );

    shader.fragmentShader = `
        uniform float uSeed;
        uniform vec3 uColorLow;
        uniform vec3 uColorHigh;
        uniform float uNoiseFreq;
        uniform float uCloudDensity;
        uniform vec3 uCloudColor;
        uniform float uAtmosphere;
        uniform float uWarpStrength;
        uniform float uStretchY;
        varying vec3 vLocalPos;

        // Asymmetric Hash to break geometric mirrored patterns
        float hash(vec3 p) {
            p = fract(p * vec3(0.1031, 0.11369, 0.13787));
            p += dot(p, p.yzx + 19.19);
            return fract((p.x + p.y) * p.z);
        }

        // Fast, precision-safe 3D Value Noise
        float vnoise(vec3 x) {
            vec3 i = floor(x);
            vec3 f = fract(x);
            f = f * f * (3.0 - 2.0 * f);
            return mix(mix(mix(hash(i + vec3(0.0,0.0,0.0)), hash(i + vec3(1.0,0.0,0.0)), f.x),
                           mix(hash(i + vec3(0.0,1.0,0.0)), hash(i + vec3(1.0,1.0,0.0)), f.x), f.y),
                       mix(mix(hash(i + vec3(0.0,0.0,1.0)), hash(i + vec3(1.0,0.0,1.0)), f.x),
                           mix(hash(i + vec3(0.0,1.0,1.0)), hash(i + vec3(1.0,1.0,1.0)), f.x), f.y), f.z);
        }

        // FBM Clásico con 5 octavas para detalle profundo
        float fbm(vec3 p) {
            float v = 0.0;
            float a = 0.5;
            for (int i = 0; i < 5; i++) {
                v += a * vnoise(p);
                p *= 2.0;
                a *= 0.5;
            }
            return v;
        }

        // Domain Warping para crear continentes orgánicos y flujos de fluidos (Júpiter)
        float warpedTerrain(vec3 p) {
            // Estiramiento vertical para bandas de gigantes gaseosos
            vec3 stretchedP = vec3(p.x, p.y * uStretchY, p.z);
            
            // Primer warp (distorsión del espacio)
            vec3 q = vec3(
                fbm(stretchedP + vec3(0.0, 0.0, 0.0) + uSeed),
                fbm(stretchedP + vec3(5.2, 1.3, 4.5) - uSeed),
                fbm(stretchedP + vec3(2.4, 9.2, 1.3) + uSeed * 2.0)
            );
            
            // Evaluamos el ruido en el espacio distorsionado
            // uWarpStrength define qué tan "retorcidos" son los continentes o tormentas
            return fbm(stretchedP + uWarpStrength * q);
        }

        float fbmClouds(vec3 p) {
            vec3 stretchedP = vec3(p.x, p.y * uStretchY, p.z);
            float v = 0.0;
            float a = 0.5;
            for (int i = 0; i < 3; i++) {
                v += a * vnoise(stretchedP);
                stretchedP *= 2.1;
                a *= 0.5;
            }
            return v;
        }
        
        ${shader.fragmentShader}
    `.replace(
        `vec4 diffuseColor = vec4( diffuse, opacity );`,
        `
        // 1. Usar el Domain Warping para el terreno. 
        // uNoiseFreq define el tamaño de los continentes (MACRO). 
        // El detalle viene gratis por las octavas internas.
        float n = warpedTerrain(normalize(vLocalPos) * uNoiseFreq);
        
        // 2. Afilamos las costas matemáticamente con smoothstep
        float terrainPattern = smoothstep(0.35, 0.65, n);
        
        // Nubes con ligero warp para simular vórtices atmosféricos
        float cloudWarp = fbmClouds(normalize(vLocalPos) * 2.0 + uSeed);
        float cloudN = fbmClouds(normalize(vLocalPos) * (uNoiseFreq * 1.2) + cloudWarp);
        float clouds = smoothstep(uCloudDensity, 0.9, cloudN) * uAtmosphere;
        
        vec3 terrainColor = mix(uColorLow, uColorHigh, terrainPattern);
        vec3 finalColor = mix(terrainColor, uCloudColor, clouds);

        vec4 diffuseColor = vec4( finalColor, opacity );
        `
    );

    PlanetShaderMaterial.userData.shader = shader;
};
