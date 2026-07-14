import * as THREE from 'three';

const RingVertexShader = `
#include <common>
#include <logdepthbuf_pars_vertex>

varying vec2 vUv;
varying vec3 vPosition;

void main() {
    vUv = uv;
    vPosition = position;
    
    // Usamos modelViewMatrix en lugar de modelMatrix * viewMatrix para evitar pérdida de precisión
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    
    #include <logdepthbuf_vertex>
}
`;

const RingFragmentShader = `
#include <common>
#include <logdepthbuf_pars_fragment>

varying vec2 vUv;
varying vec3 vPosition;
varying vec3 vWorldPosition;

uniform vec3 color1;
uniform vec3 color2;
uniform vec3 color3;
uniform float seed;
uniform float opacityMultiplier;
uniform float density;

uniform vec3 sunDirection;
uniform float planetRadius;
uniform vec3 planetWorldPos;

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
    
    float radius = length(vPosition.xy);
    float r = radius * 0.0001; 
    
    float lowFreq = r * density;
    float highFreq = r * density * 15.0; 
    
    float wideBands = noise1D(lowFreq + seed);
    float fineLines = sin(highFreq + seed) * sin(highFreq * 2.3 - seed * 2.0) * 0.5 + 0.5;
    fineLines = mix(fineLines, noise1D(highFreq * 4.0), 0.4);
    
    float mixFactor = (wideBands * 0.6 + fineLines * 0.4);
    mixFactor = smoothstep(0.1, 0.9, mixFactor);
    
    vec3 finalColor;
    if (mixFactor < 0.33) {
        finalColor = mix(color1, color2, smoothstep(0.0, 0.33, mixFactor));
    } else if (mixFactor < 0.66) {
        finalColor = mix(color2, color3, smoothstep(0.33, 0.66, mixFactor));
    } else {
        finalColor = mix(color3, color1, smoothstep(0.66, 1.0, mixFactor));
    }
    
    float alpha = mixFactor * 0.8 + 0.2;
    
    if (noise1D(lowFreq * 1.2 + seed * 3.0) < 0.15) alpha *= 0.05; 
    if (noise1D(lowFreq * 5.0 - seed) < 0.25) alpha *= 0.15; 
    if (noise1D(lowFreq * 2.5 + seed * 1.5) > 0.7) finalColor *= 0.4;
    
    // --- PLANET SHADOW CAST ON RING (LOCAL SPACE) ---
    // En espacio local, el planeta está exactamente en (0,0,0)
    // El vector desde el centro del planeta hasta el fragmento es simplemente vPosition
    vec3 fragToPlanet = vPosition;
    
    // sunDirection ahora se pasa en ESPACIO LOCAL del anillo
    float dotSun = dot(fragToPlanet, sunDirection);
    
    if (dotSun < 0.0) { // Fragment is on the dark side of the planet
        // Distance from fragment to the sun-planet axis (cylinder radius)
        vec3 projectionOnAxis = sunDirection * dotSun;
        vec3 distanceToAxis = fragToPlanet - projectionOnAxis;
        
        if (length(distanceToAxis) < planetRadius) {
            // Fragment is inside the shadow cylinder!
            finalColor *= 0.02; // Make it very dark
        }
    }
    
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
            density: { value: params.density },
            sunDirection: { value: new THREE.Vector3(1, 0, 0) },
            planetRadius: { value: 1.0 }
        },
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false, 
        blending: THREE.NormalBlending
    });
};
