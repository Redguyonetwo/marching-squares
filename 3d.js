import * as THREE from 'https://cdn.jsdelivr.net/npm/three/+esm'
import { OrbitControls } from './OrbitControls.js'

import { corners, edges, triangles } from './lookupTables.js'

// -- Three.js setup --

const canvas = document.getElementById('canvas')

canvas.width = innerWidth
canvas.height = innerHeight

const scene = new THREE.Scene()

scene.background = new THREE.Color("#002")

const camera = new THREE.PerspectiveCamera(75, innerWidth / innerHeight)
camera.position.z = -10

const ambientLight = new THREE.AmbientLight(0xffffff, 1) 
scene.add(ambientLight)

const dirLight = new THREE.DirectionalLight(0xffffff, 5) 
dirLight.position.set(50, 100, 50);
dirLight.castShadow = true;
dirLight.shadow.mapSize.width = 2048;
dirLight.shadow.mapSize.height = 2048;
dirLight.shadow.camera.near = 0.5;
dirLight.shadow.camera.far = 200;
dirLight.shadow.camera.left = 0;
dirLight.shadow.camera.right = 200;
dirLight.shadow.camera.top = 200;
dirLight.shadow.camera.bottom = 0;
scene.add(dirLight)

const renderer = new THREE.WebGLRenderer({canvas, antialias: true})
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;

const controls = new OrbitControls(camera, canvas)

const v = new THREE.Vector3()

const noise = new Noise(Math.random())

window.onresize = () => { 
    //make sure it is always full screen at correct aspect ratio
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight)
}

window.oncontextmenu = (e) => e.preventDefault()

const mat1 = new THREE.MeshBasicMaterial({color: 'red', side: THREE.DoubleSide})
const mat2 = new THREE.MeshBasicMaterial({color: 'lime'})
const mat3 = new THREE.MeshBasicMaterial({color: 'blue'})

const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    [mat1, mat1, mat2, mat2, mat3, mat3]
)

mesh.rotateX(Math.PI / 4)
mesh.rotateY(Math.PI / 4)

//scene.add(mesh)

// -- Marching Cubes

const numCubes = 50

const size = numCubes + 1
const sizeSq = size * size
const half = size / 2
const quarter = half / 2
const res = 1

const isolevel = 0.5

const step = 0.05

let ball = {x: half, y: half, z: half, r: 100}

const mountains = [
    {x: size * 0.1, z: size * 0.3, h: half, s: 1},
    {x: size * 0.6, z: size * 0.4, h: quarter, s: 1}
]

let showNoise = true
let values = new Array(sizeSq * size).fill(0)

const cubeMat = new THREE.MeshStandardMaterial({color: '#150', side: THREE.DoubleSide})
const geo = new THREE.BoxGeometry(1,1,1)

let marchingGeo = new THREE.BufferGeometry()

const marchingMesh = new THREE.Mesh(
    marchingGeo,
    cubeMat
)

marchingMesh.castShadow = true;
marchingMesh.receiveShadow = true;

scene.add(marchingMesh)

function valuesIndex(i, j, k) {
    return i * sizeSq + j * size + k
}

function calcValuesNoise() {
    let xoff = 0

    for (let x = 0; x < size; x++) {
        xoff += step;
        for (let y = 0; y < size; y++) {
            let zoff = 0
            for (let z = 0; z < size; z++) {
                zoff += step;

                let dx = x - half;
                let dy = y - half;
                let dz = z - half;

                let ground = noise.simplex2(xoff, zoff) + 1 //(dx*dx + dy*dy + dz*dz) / 100

                ground *= 5

                let val = y - ground

                let index = valuesIndex(x, y, z)
                values[index] = val;
            }
        }
    }
}

function getMountainValue(x, y, z, m) {
    let dx = x - m.x;
    let dz = z - m.z;

    let s = (-m.s) / numCubes

    let r2 = dx*dx + dz*dz;

    let mountain = m.h * Math.exp(s * r2);
    return y - mountain
}

function calcValuesMountains() {
    for (let x = 0; x < size; x++) {
        for (let y = 0; y < size; y++) {
            for (let z = 0; z < size; z++) {
                let val = 0;
                
                for (let m of mountains) {
                    val += getMountainValue(x, y, z, m)
                }

                let index = valuesIndex(x, y, z)
                values[index] = val;
            }
        }
    }
}

function calcValuesMetaball() {
    for (let x = 0; x < size; x++) {
        for (let y = 0; y < size; y++) {
            for (let z = 0; z < size; z++) {
                let dx = x - ball.x
                let dy = y - ball.y
                let dz = z - ball.z
                let len = Math.hypot(dx*dx, dy*dy, dz*dz)

                let val = ball.r - len

                let index = valuesIndex(x, y, z)
                values[index] = -val;
            }
        }
    }
}

function getBinary(corners) {
    let index = 0;

    for (let i = 0; i < 8; i++) {
        if (corners[i] < isolevel) {
            index |= 1 << i; // index += 2 ** i (put a 1 in the binary at i digits to the left)
        }
    }

    return index;
}

function marchCube(position, cubeCorners, binary) {
    if (binary == 0 || binary == 255) return; // Fully outside or fully inside - no surfaces

    const triangle = triangles[binary]

    let i = 0;

    let points = []

    while (triangle[i] != -1) {
        let edgeIndex = triangle[i]

        let edge = edges[edgeIndex]

        let p0 = edge[0].clone().add(position)
        let p1 = edge[1].clone().add(position)

        let i0 = valuesIndex(p0.x, p0.y, p0.z)
        let i1 = valuesIndex(p1.x, p1.y, p1.z)

        let v0 = values[i0]
        let v1 = values[i1]

        let t = (isolevel - v0) / (v1 - v0)

        let p = p0.lerp(p1, t)

        points.push(p)

        i++
    }

    return points;
}

function doMarching() {
    let verts = []
    for (let x = 0; x < numCubes; x++) {
        for (let y = 0; y < numCubes; y++) {
            for (let z = 0; z < numCubes; z++) {
                let vec = new THREE.Vector3(x, y, z)
                let cubeCorners = []

                for (let i = 0; i < 8; i++) {
                    let newX = x + corners[i].x;
                    let newY = y + corners[i].y;
                    let newZ = z + corners[i].z;
                    let index = valuesIndex(newX, newY, newZ)
                    let val = values[index]
                    cubeCorners[i] = val;
                }

                let bits = getBinary(cubeCorners)

                let points = marchCube(vec, cubeCorners, bits)

                if (points && points.length > 0) {
                    verts.push(...points)
                }
            }
        }
    }

    marchingGeo.dispose()

    marchingGeo = new THREE.BufferGeometry().setFromPoints(verts)
    marchingGeo.computeVertexNormals()
    marchingMesh.geometry = marchingGeo
}

console.log(marchingGeo)

controls.target.set(half, 0, half)

// -----
controls.update()
renderer.render(scene, camera)

let angle = 0
const mult = 0.7

function animate() {
    requestAnimationFrame(animate)
    renderer.render(scene, camera)

    angle += 0.05

    mountains[0].x = (Math.cos(angle) + 2) * quarter
    mountains[0].z = (Math.sin(angle) + 2) * quarter
    mountains[1].h = (Math.sin(angle * mult) + 2) * quarter

    calcValuesMountains()
    doMarching()
}

animate()