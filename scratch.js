const Config = {
    STAR_RADIUS_MIN: 20000,
    STAR_RADIUS_MAX: 150000,
    ORBIT_DISTANCE_START: 35000000,
    ORBIT_DISTANCE_SPACING: 20000000,
    ORBIT_DISTANCE_VAR: 10000000
};

const sunRadius = 70000;
const starTemp = 5778;

for(let j=0; j<10; j++) {
    const orbitRadius = sunRadius * 1.5 + Config.ORBIT_DISTANCE_START + j * Config.ORBIT_DISTANCE_SPACING;
    const T_eq_base = starTemp * Math.sqrt(sunRadius / (2 * orbitRadius));
    
    // Testing a rock planet: albedo 0.3, greenhouse 1.1
    const albedo = 0.3;
    const greenhouse = 1.1; // if multiplier
    const T_surf = T_eq_base * Math.pow(1 - albedo, 0.25) * greenhouse;
    
    console.log(`Planet ${j} at ${orbitRadius} km: T_eq_base = ${T_eq_base.toFixed(2)} K, T_surf = ${T_surf.toFixed(2)} K`);
}
