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

const renderer = new THREE.WebGLRenderer({canvas, antialias: true})

const controls = new OrbitControls(camera, renderer.domElement)

const v = new THREE.Vector3()

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

const sphereTemplate = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.5, 0.5),
    mat1
)

//scene.add(mesh)

// ----------

const res = 10; //Total size (side length) of the cube world
const cells = 2;

const cellSize = res / cells;

const isolevel = 0.5; // threshold

const total = cells ** 3;

const cellsSq = cells * cells;

const ball = {x: res * 0.5, y: res * 0.5, z: res * 0.5, r: 10}

let values = new Array(total).fill(0)

//camera.lookAt(ball.x, ball.y, ball.z)
camera.position.set(res * 0.5, -10, -10)
camera.lookAt(0,0,0)

function index(x, y, z) {
    return x * cellsSq + y * cells + z;
}

let points = []

function calcValues() {
    for (let i = 0; i < cells; i++) {
        for (let j = 0; j < cells; j++) {
            for (let k = 0; k < cells; k++) {
                let x = j * cellSize
                let y = i * cellSize
                let z = k * cellSize

                let index = i * cellsSq + j * cells + k

                let dx = x - ball.x
                let dy = y - ball.y
                let dz = z - ball.z

                let len = Math.hypot(dx, dy, dz)

                values[index] = Math.round(Math.random())

                const point = new THREE.Vector3(x, y, z)

                console.log(point)

                points.push(point)

                const mesh = sphereTemplate.clone()
                if (values[index]) mesh.material = mat2
                mesh.position.set(x, y, z)
                scene.add(mesh)
            }
        }
    }
}

calcValues()

const v1 = new THREE.Vector3(0,0,0)
const v2 = new THREE.Vector3(0,0,1)
console.log(v1.lerp(v2, 0.5))
console.log(v1)

console.log('values', values)
console.log('points', points)

const geom = new THREE.BufferGeometry().setFromPoints([points[0], points[1], points[2]])

scene.add(new THREE.Mesh(
    geom,
    new THREE.MeshBasicMaterial({wireframe: true, color: 'red'})
))

// scene.add(new THREE.Mesh(
//     new THREE.BoxGeometry(1, 1, 1),
//     [mat1, mat1, mat2, mat2, mat3, mat3]
// ))

function animate() {
    requestAnimationFrame(animate)
    renderer.render(scene, camera)
}

animate()