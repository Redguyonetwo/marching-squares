import * as THREE from 'https://cdn.jsdelivr.net/npm/three/+esm'
import { OrbitControls } from './OrbitControls.js'

import { corners, edges, triangles } from './lookupTables.js'

console.log(corners)

// -- Three.js setup --

const canvas = document.getElementById('canvas')

canvas.width = innerWidth
canvas.height = innerHeight

const scene = new THREE.Scene()

scene.background = new THREE.Color("#002")

const camera = new THREE.PerspectiveCamera(75, innerWidth / innerHeight)
camera.position.z = 10

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

const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    [mat1, mat1, mat2, mat2, mat3, mat3]
)

mesh.rotateX(Math.PI / 4)
mesh.rotateY(Math.PI / 4)

scene.add(mesh)

// -- Marching Cubes

const numCubes = 10

const size = numCubes + 1
const sizeSq = size * size
const res = 1

let showNoise = true
let values = new Array(sizeSq * size).fill(0)

function valuesIndex(i, j, k) {
    return i * sizeSq + j * size + k
}

for (let x = 0; x < size; x++) {
    for (let y = 0; y < size; y++) {
        for (let z = 0; z < size; z++) {
            let height = Math.random() * 2
            if (y > height) {
                height -= y
            }
            else {
                height = y - height
            }

            let index = valuesIndex(x, y, z)
            values[index] = height;
        }
    }
}

console.log(values)
// -----

function animate() {
    requestAnimationFrame(animate)
    renderer.render(scene, camera)
}

animate()