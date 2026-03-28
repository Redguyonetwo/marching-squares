import * as THREE from 'https://cdn.jsdelivr.net/npm/three/+esm'
import { OrbitControls } from './OrbitControls.js'

import { edgeTable, triTable } from './lookupTables.js'

// -- Three.js setup --

const canvas = document.getElementById('canvas')

canvas.width = innerWidth
canvas.height = innerHeight

const scene = new THREE.Scene()

scene.background = new THREE.Color("#002")

const camera = new THREE.PerspectiveCamera(75, innerWidth / innerHeight)
camera.position.z = 10;
camera.lookAt(0,0,0)

const renderer = new THREE.WebGLRenderer({canvas, antialias: true})

window.addEventListener('resize', () => { 
    //make sure it is always full screen at correct aspect ratio
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight)
})

const mat1 = new THREE.MeshBasicMaterial({color: 'red'})
const mat2 = new THREE.MeshBasicMaterial({color: 'lime'})
const mat3 = new THREE.MeshBasicMaterial({color: 'blue'})

const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(1,1,1),
    [mat1, mat1, mat2, mat2, mat3, mat3]
)

mesh.rotateX(Math.PI / 4)
mesh.rotateY(Math.PI / 4)

//scene.add(mesh)

// ----------

const resolution = 30; // 30 x 30 x 30 simulation
const scale = 10;

const isolevel = 0.5; // threshold

const total = resolution ** 3;

const resSq = resolution * resolution;

let values = new Array(total).fill(0)

let points = []

for (let i = 0; i < resolution; i++) {
    for (let j = 0; j < resolution; j++) {
        for (let k = 0; k < resolution; k++) {
            let x = - scale / 2 + scale * k / (resolution - 1)
            let y = - scale / 2 + scale * j / (resolution - 1)
            let z = - scale / 2 + scale * i / (resolution - 1)

            points.push(new THREE.Vector3(x, y, z))
        }
    }
}

function marchingCubes() {
    values.fill(0)

    //approximate intersection points between metaball surface and cube edges
    let intersectionList = new Array(12)

    //triangles for the three.js geometry
    let trianglePoints = []

    for (let z = 0; z < resolution - 1; z++) {
        for (let y = 0; y < resolution - 1; y++) {
            for (let x = 0; x < resolution - 1; x++) {
                let p = x + resolution * y + z
                let px = p + 1
                let py = p + resolution
                let pxy = py + 1
                let pz = p + resSq
                let pxz = px + resSq
                let pyz = py + resSq
                let pxyz = pxy + resSq

                let val0 = values[p]
                let val1 = values[px]
                let val2 = values[py]
                let val3 = values[pxy]
                let val4 = values[pz]
                let val5 = values[pxz]
                let val6 = values[pyz]
                let val7 = values[pxyz]

                let cubeIndex = 0;
                if (val0 < isolevel) cubeIndex |= 1;
                if (val1 < isolevel) cubeIndex |= 2;
                if (val2 < isolevel) cubeIndex |= 8;
                if (val3 < isolevel) cubeIndex |= 4;
                if (val4 < isolevel) cubeIndex |= 16;
                if (val5 < isolevel) cubeIndex |= 32;
                if (val6 < isolevel) cubeIndex |= 128;
                if (val7 < isolevel) cubeIndex |= 64;

                let bits = edgeTable[cubeIndex]

                if (bits === 0) continue;

                
            }
        }
    }
}