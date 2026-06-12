import * as THREE from 'three';

export class ShipEntity {
    constructor() {
        this.mesh = new THREE.Group();
        this.buildShip();
    }

    buildShip() {
        // Material Phong para un brillo sutil pero metálico sin requerir Environment Map
        const hullMat = new THREE.MeshPhongMaterial({ color: 0xe0e5eb, specular: 0xffffff, shininess: 200, flatShading: true, emissive: 0x111111 });
        const darkMat = new THREE.MeshPhongMaterial({ color: 0x1a1a1a, specular: 0x888888, shininess: 150, flatShading: true });
        const accentMat = new THREE.MeshPhongMaterial({ color: 0xaaddff, emissive: 0x55ccff, shininess: 200 });

        // Fuselaje principal (Termina en punta fina hacia adelante)
        const bodyGeo = new THREE.CylinderGeometry(0, 2.75, 14, 6); // radiusTop = 0 hace que sea una punta perfecta
        bodyGeo.rotateX(-Math.PI / 2); // <-- Negativo para que apunte hacia -Z (el frente)
        const body = new THREE.Mesh(bodyGeo, hullMat);
        body.scale.set(1, 0.4, 1);
        body.position.set(0, 3, -3.5); // Desplazado hacia el frente (-Z)
        this.mesh.add(body);

        // Cabina (Cilindro oscuro incrustado)
        const cockpitGeo = new THREE.CylinderGeometry(0.6, 1.3, 4, 6);
        cockpitGeo.rotateX(-Math.PI / 2);
        const cockpit = new THREE.Mesh(cockpitGeo, darkMat);
        cockpit.scale.set(1, 0.5, 1);
        cockpit.position.set(0, 3.5, -2);
        cockpit.rotation.x = -Math.PI / 24;
        this.mesh.add(cockpit);

        // Alas Delta en Flecha
        const wingGeo = new THREE.CylinderGeometry(0, 2.5, 9, 4);
        wingGeo.rotateX(Math.PI / 2);

        const wingLeft = new THREE.Mesh(wingGeo, hullMat);
        wingLeft.scale.set(1, 0.1, 1);
        wingLeft.position.set(-3.5, 3, 2);
        wingLeft.rotation.z = -Math.PI / 2;
        wingLeft.rotation.y = -Math.PI / 6; // Flecha hacia atrás
        this.mesh.add(wingLeft);

        const wingRight = new THREE.Mesh(wingGeo, hullMat);
        wingRight.scale.set(1, 0.1, 1);
        wingRight.position.set(3.5, 3, 2);
        wingRight.rotation.z = Math.PI / 2;
        wingRight.rotation.y = Math.PI / 6;
        this.mesh.add(wingRight);

        // Motores integrados
        const engineGeo = new THREE.CylinderGeometry(0.7, 0.9, 3, 8);
        engineGeo.rotateX(Math.PI / 2);

        const engineL = new THREE.Mesh(engineGeo, darkMat);
        engineL.position.set(-2, 3, 4.5);
        this.mesh.add(engineL);

        const engineR = new THREE.Mesh(engineGeo, darkMat);
        engineR.position.set(2, 3, 4.5);
        this.mesh.add(engineR);

        // Propulsores luminosos
        const glowGeo = new THREE.SphereGeometry(0.65, 8, 8);
        const glowL = new THREE.Mesh(glowGeo, accentMat);
        glowL.position.set(-2, 3, 5.8);
        this.mesh.add(glowL);

        const glowR = new THREE.Mesh(glowGeo, accentMat);
        glowR.position.set(2, 3, 5.8);
        this.mesh.add(glowR);

        // Estabilizador central superior
        const finGeo = new THREE.CylinderGeometry(0.1, 2, 3, 3);
        finGeo.rotateY(Math.PI / 2);
        const fin = new THREE.Mesh(finGeo, hullMat);
        fin.scale.set(0.1, 1, 1);
        fin.position.set(0, 4.5, 3);
        fin.rotation.x = -Math.PI / 6;
        this.mesh.add(fin);

        // Tren de aterrizaje dinámico
        const legGeo = new THREE.CylinderGeometry(0.1, 0.1, 2.5);
        const footGeo = new THREE.BoxGeometry(0.8, 0.2, 0.8);

        const createLeg = (x, z) => {
            const leg = new THREE.Group();
            const strut = new THREE.Mesh(legGeo, darkMat);
            strut.position.y = 1.25;
            const foot = new THREE.Mesh(footGeo, hullMat);
            foot.position.y = 0.1;
            leg.add(strut);
            leg.add(foot);
            leg.position.set(x, 0, z);
            return leg;
        };

        // Puntos de anclaje (El centro de masa es y=0 en las patas)
        this.mesh.add(createLeg(0, -3));
        this.mesh.add(createLeg(-2, 3));
        this.mesh.add(createLeg(2, 3));

        // Luz dinámica (Tono más blanco/helado, menos azulado, brillo máximo)
        const light = new THREE.PointLight(0xbbeeff, 150, 400);
        light.position.set(0, 1.5, 0);
        this.mesh.add(light);
    }

    alignToTerrain(generator, x, z) {
        // Altura central
        const h0 = generator.getHeight(x, z);
        this.mesh.position.set(x, h0, z);

        // Muestrear 3 puntos pequeños alrededor para calcular la normal del terreno
        const delta = 1.0;
        const hx = generator.getHeight(x + delta, z);
        const hz = generator.getHeight(x, z + delta);

        const v1 = new THREE.Vector3(delta, hx - h0, 0);
        const v2 = new THREE.Vector3(0, hz - h0, delta);

        // Calcular producto cruzado para obtener el vector perpendicular al terreno
        const normal = new THREE.Vector3().crossVectors(v2, v1).normalize();

        // Alinear la rotación de la nave para que su "arriba" mire hacia la normal del terreno
        const up = new THREE.Vector3(0, 1, 0);
        this.mesh.quaternion.setFromUnitVectors(up, normal);
    }

    setPosition(x, y, z) {
        this.mesh.position.set(x, y, z);
    }

    getMesh() {
        return this.mesh;
    }
}