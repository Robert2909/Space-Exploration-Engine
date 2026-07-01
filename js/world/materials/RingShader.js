import * as THREE from 'three';

const RingVertexShader = `
#include <common>
#include <logdepthbuf_pars_vertex>

varying vec2 vUv;
varying vec3 vPosition;

void main() {
    vUv = uv;
    vPosition = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    
    #include <logdepthbuf_vertex>
}
`;

const RingFragmentShader = `
#include <common>
#include <logdepthbuf_pars_fragment>

varying vec2 vUv;
varying vec3 vPosition;

uniform vec3 color1;
uniform vec3 color2;
uniform vec3 color3;
uniform float seed;
uniform float opacityMultiplier;
uniform float density;

// 1D Pseudo-random based on seed and radius
float hash(float n) { return fract(sin(n) * 1e4); }

float noise1D(float x) {
    float i = floor(x);
    float f = fract(x);
    float u = f * f * (3.0 - 2.0 * f);
    return mix(hash(i), hash(i + 1.0), u);
}

void main() {
    #include <logdepthbuf_fragment>
    
    // Calcular la distancia radial verdadera usando las coordenadas locales del vértice
    float radius = length(vPosition.xy);
    
    // Normalizar la escala de ruido para que la densidad funcione sin importar el tamaño gigantesco del anillo
    float r = radius * 0.0001; 
    
    // Crear frecuencias múltiples para simular la complejidad de Saturno
    float lowFreq = r * density;
    float highFreq = r * density * 15.0; // Miles de fragmentos finos
    
    // Bandas gruesas (cambio de color)
    float wideBands = noise1D(lowFreq + seed);
    
    // Líneas finas (textura tipo "disco de vinilo")
    float fineLines = sin(highFreq + seed) * sin(highFreq * 2.3 - seed * 2.0) * 0.5 + 0.5;
    fineLines = mix(fineLines, noise1D(highFreq * 4.0), 0.4); // Romper la perfección geométrica
    
    // Mezcla de texturas
    float mixFactor = (wideBands * 0.6 + fineLines * 0.4);
    
    // Aumentar el contraste matemático de los colores para que no se fundan en gris
    mixFactor = smoothstep(0.1, 0.9, mixFactor);
    
    // Seleccionar color con transiciones más marcadas
    vec3 finalColor;
    if (mixFactor < 0.33) {
        finalColor = mix(color1, color2, smoothstep(0.0, 0.33, mixFactor));
    } else if (mixFactor < 0.66) {
        finalColor = mix(color2, color3, smoothstep(0.33, 0.66, mixFactor));
    } else {
        finalColor = mix(color3, color1, smoothstep(0.66, 1.0, mixFactor));
    }
    
    // Calcular alfa (transparencia base de la línea de polvo)
    float alpha = mixFactor * 0.8 + 0.2;
    
    // CORTES ABRUPTOS (Divisiones planetarias reales)
    // Divisiones grandes (Estilo Cassini)
    if (noise1D(lowFreq * 1.2 + seed * 3.0) < 0.15) {
        alpha *= 0.05; 
    }
    // Divisiones finas repetitivas
    if (noise1D(lowFreq * 5.0 - seed) < 0.25) {
        alpha *= 0.15; 
    }
    // Oscurecer algunas bandas para generar profundidad y contraste extra
    if (noise1D(lowFreq * 2.5 + seed * 1.5) > 0.7) {
        finalColor *= 0.4;
    }
    
    // Borde suavizado: como no tenemos inner/outer uniforms, asumimos opacidad pareja 
    // y dejamos que la geometría del anillo haga el recorte (RingGeometry ya corta el hueco).
    
    gl_FragColor = vec4(finalColor, alpha * opacityMultiplier);
}
`;

export const getRingShaderMaterial = (params) => {
    return new THREE.ShaderMaterial({
        vertexShader: RingVertexShader,
        fragmentShader: RingFragmentShader,
        uniforms: {
            color1: { value: params.color1 },
            color2: { value: params.color2 },
            color3: { value: params.color3 },
            seed: { value: params.seed },
            opacityMultiplier: { value: params.opacity },
            density: { value: params.density }
        },
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false, // Fundamental para que no hayan errores de Z-buffer con planetas / estrellas
        blending: THREE.NormalBlending
    });
};
