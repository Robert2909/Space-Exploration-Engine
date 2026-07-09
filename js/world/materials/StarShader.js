import * as THREE from 'three';

const vertexShader = `
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

const fragmentShader = `
#include <common>
#include <logdepthbuf_pars_fragment>

uniform float uTime;
uniform vec3 uColor;
uniform vec3 uDarkColor;
uniform vec3 uBrightColor;
uniform float uTimeScale;
uniform float uNoiseScale;
uniform float uSpotContrast;
uniform float uSolarFilter;
varying vec2 vUv;
varying vec3 vPosition;

// Simple 3D Noise function
// (Noise functions remain the same)
vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}

float snoise(vec3 v){ 
  const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
  const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);

  vec3 i  = floor(v + dot(v, C.yyy) );
  vec3 x0 = v - i + dot(i, C.xxx) ;

  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min( g.xyz, l.zxy );
  vec3 i2 = max( g.xyz, l.zxy );

  vec3 x1 = x0 - i1 + 1.0 * C.xxx;
  vec3 x2 = x0 - i2 + 2.0 * C.xxx;
  vec3 x3 = x0 - 1.0 + 3.0 * C.xxx;

  i = mod(i, 289.0 ); 
  vec4 p = permute( permute( permute( 
             i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
           + i.y + vec4(0.0, i1.y, i2.y, 1.0 )) 
           + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));

  float n_ = 1.0/7.0; // N=7
  vec3  ns = n_ * D.wyz - D.xzx;

  vec4 j = p - 49.0 * floor(p * ns.z *ns.z);  //  mod(p,N*N)

  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_ );    // mod(j,N)

  vec4 x = x_ *ns.x + ns.yyyy;
  vec4 y = y_ *ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);

  vec4 b0 = vec4( x.xy, y.xy );
  vec4 b1 = vec4( x.zw, y.zw );

  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));

  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;

  vec3 p0 = vec3(a0.xy,h.x);
  vec3 p1 = vec3(a0.zw,h.y);
  vec3 p2 = vec3(a1.xy,h.z);
  vec3 p3 = vec3(a1.zw,h.w);

  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;

  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), 
                                dot(p2,x2), dot(p3,x3) ) );
}

void main() {
    #include <logdepthbuf_fragment>
    
    // Generate multiple octaves of noise for high-resolution plasma details
    float noise1 = snoise(vPosition * 2.5 * uNoiseScale + uTime * 0.2 * uTimeScale);
    float noise2 = snoise(vPosition * 5.0 * uNoiseScale - uTime * 0.3 * uTimeScale);
    float noise3 = snoise(vPosition * 10.0 * uNoiseScale + uTime * 0.4 * uTimeScale);
    float noise4 = snoise(vPosition * 20.0 * uNoiseScale - uTime * 0.5 * uTimeScale);
    float noise5 = snoise(vPosition * 40.0 * uNoiseScale + uTime * 0.6 * uTimeScale);
    
    // Combine noises using Fractal Brownian Motion (FBM) for intricate details
    float plasma = noise1 * 0.5 + noise2 * 0.25 + noise3 * 0.125 + noise4 * 0.0625 + noise5 * 0.03125;
    
    // Remap from roughly [-1.0, 1.0] to [0.0, 1.0]
    plasma = plasma * 0.5 + 0.5;
    
    // Zonas oscuras y brillantes dinámicas por clase de estrella
    vec3 darkSpot = uDarkColor; 
    vec3 brightSpot = uBrightColor; 
    
    // FILTRO SOLAR (Telescopio H-Alpha simulado para proximidad)
    float currentContrast = mix(uSpotContrast, uSpotContrast * 1.5 + 1.0, uSolarFilter);
    vec3 filteredDarkSpot = mix(darkSpot, darkSpot * 0.3, uSolarFilter); 
    vec3 filteredBrightSpot = mix(brightSpot, uColor * 1.2, uSolarFilter); 
    
    // Mezcla procedural y contraste
    float contrastPlasma = smoothstep(0.5 - (0.3 * currentContrast), 0.5 + (0.3 * currentContrast), plasma);
    vec3 color = mix(filteredDarkSpot, filteredBrightSpot, contrastPlasma);
    
    // Fresnel sutil para darle volumen 3D a los bordes
    float fresnel = dot(normalize(vPosition), vec3(0.0, 0.0, 1.0));
    color += mix(vec3(0.3, 0.3, 0.3) * uColor * (1.0 - fresnel), vec3(0.0), uSolarFilter);
    
    gl_FragColor = vec4(color, 1.0);
}
`;

export function getStarShaderMaterial(colorHex, starType = 'Enana amarilla') {
    let timeScale = 1.0;
    let noiseScale = 1.0;
    let spotContrast = 1.0; 
    
    const baseColor = new THREE.Color(colorHex);
    // Calcular dinámicamente los colores oscuro/brillante según el color base
    const darkColor = baseColor.clone().multiplyScalar(0.2); // Más oscuro
    const brightColor = baseColor.clone().addScalar(0.4); // Más blanco/brillante
    
    if (starType.includes('Gigante')) {
        timeScale = 3.0;
        noiseScale = 1.2;
        spotContrast = 0.6;
        // Gigantes azules son casi blancas brillantes
        brightColor.addScalar(0.6);
        darkColor.copy(baseColor).multiplyScalar(0.5); // Sus manchas no son tan negras
    } else if (starType.includes('blanca')) {
        timeScale = 4.0;
        noiseScale = 1.5;
        spotContrast = 0.4;
        brightColor.setHex(0xffffff);
        darkColor.copy(baseColor).multiplyScalar(0.7);
    } else if (starType.includes('amarilla')) {
        timeScale = 1.0;
        noiseScale = 1.0;
        spotContrast = 1.0;
        // Amarillas tienen manchas marrones/rojizas (nuestro sol)
        darkColor.setRGB(0.5, 0.2, 0.05).multiply(baseColor);
    } else if (starType.includes('naranja')) {
        timeScale = 0.8;
        noiseScale = 0.9;
        spotContrast = 1.1;
        darkColor.setRGB(0.6, 0.1, 0.0).multiply(baseColor);
    } else if (starType.includes('roja') || starType.includes('marrón')) {
        timeScale = 0.4;
        noiseScale = 0.6;
        spotContrast = 1.5;
        darkColor.setRGB(0.3, 0.05, 0.0).multiply(baseColor);
    }

    return new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms: {
            uTime: { value: 0.0 },
            uColor: { value: baseColor },
            uDarkColor: { value: darkColor },
            uBrightColor: { value: brightColor },
            uTimeScale: { value: timeScale },
            uNoiseScale: { value: noiseScale },
            uSpotContrast: { value: spotContrast },
            uSolarFilter: { value: 0.0 } 
        },
        // wireframe: false
    });
}
