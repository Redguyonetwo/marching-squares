const canvas = document.getElementById('canvas')

const ctx = canvas.getContext('2d')

canvas.width = 800
canvas.height = 500

let a = 0;
let b = 0;
let c = 0;
let d = 0;

const ballPositions = [
    {x: a, y: b, r: 30},
    {x: c, y: d, r: 60}
]

const rects = [
    {x: 500, y: 300, w: 100, h: 50},
    {x: 400, y: 200, w: 200, h: 200}
]

for (let rect of rects) {
    rect.r = rect.w + rect.h / 2
}

const pxLen = 2;
const half = pxLen / 2;

const threshold = 0.9;

const tolerance = 0.1;

let useHalves = true;

const columns = Math.floor(canvas.width / pxLen);

const rows = Math.floor(canvas.height / pxLen);

const colours = ['red', 'orangered', 'orange', 'gold', 'yellow', 'lime', 'green', 'cornflowerblue', 'blue', 'darkblue', 'purple', 'pink', 'brown', 'grey', 'aqua', 'maroon']

let values = []

console.log(rows, 'rows x', columns, 'cols')

function lerp(a,b,t) {
    return a + (b-a) * t;
}

function lerp2D(A,B,t) {
    return {
        x: A.x + (B.x - A.x) * t,
        y: A.y + (B.y - A.y) * t
    }
}

function calcValues() {
    for (let i = 0; i < columns; i++) {
        values[i] = []
        for (let j = 0; j < rows; j++) {
            let val = 0

            for (let ball of ballPositions) {
                let dx = ball.x - i * pxLen
                let dy = ball.y - j * pxLen
                let len = Math.hypot(dx, dy)

                val += ball.r/len
            }

            //val /= ballPositions.length

            values[i][j] = val
        }
    }
}

calcValues()

function circle(x, y, r, colour = 'red') {
    ctx.beginPath()
    ctx.arc(x,y, r, 0, 2 * Math.PI)
    ctx.closePath()
    ctx.fillStyle = colour;
    ctx.fill()
}

function shape(...points) {
    ctx.beginPath()
    ctx.moveTo(points[0].x, points[0].y)
    for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y)
    }
    ctx.closePath()
    ctx.fill()
}

function distanceToBall(ball, x, y) {
    const dx = ball.x - x;
    const dy = ball.y - y;
    const len = Math.hypot(dx, dy) / (ball.r * 0.5)

    return Math.max(0, Math.pow(Math.E, -len * len));
}

function getState(a, b, c, d) {
    let state = 0
    if (Math.abs(a - threshold) < tolerance) {
        state += 1
    }
    if (Math.abs(b - threshold) < tolerance) {
        state += 2
    }
    if (Math.abs(c - threshold) < tolerance) {
        state += 4
    }
    if (Math.abs(d - threshold) < tolerance) {
        state += 8
    }
    return state;
}

function lines(...points) {
    ctx.beginPath()
    ctx.moveTo(points[0].x, points[0].y)
    for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y)
    }
    ctx.closePath()
    ctx.stroke()
}

function doMarching() {
    ctx.fillStyle = 'black'
    ctx.fillRect(0,0,canvas.width, canvas.height)

    ctx.save()
    ctx.translate(half, half)

    /*
            if (i == columns - 2 && j == rows - 2) {
            const topleft = values[i][j]
            const topright = values[i + 1][j]
            const bottomleft = values[i][j + 1]
            const bottomright = values[i + 1][j + 1]
            console.log(topleft, topright, bottomleft, bottomright)
            }
            */

            /*
    line-based only
     switch(state) {
                case 1:
                case 14:
                    lines(d, a)
                    break;
                case 2:
                case 13:
                    lines(a, b)
                    break;
                case 3: 
                case 12:
                    lines(d, b)
                    break;
                case 4:
                case 11:
                    lines(c, b)
                    break;
                case 5: 
                case 10:
                    lines(d, a)
                    lines(c, b)
                    break;
                case 6:
                case 9:
                    lines(a, c)
                    break;
                case 7:
                case 8:
                    lines(d, c)
                    break;
            }
    */


    for (let i = 0; i < columns - 1; i++) {
        for (let j = 0; j < rows - 1; j ++) {
            const x = i * pxLen;
            const y = j * pxLen;

            const topleft = values[i][j]
            const topright = values[i + 1][j]
            const bottomleft = values[i][j + 1]
            const bottomright = values[i + 1][j + 1]

            const tl = {x, y}
            const tr = {x: x + pxLen, y}
            const br = {x: x + pxLen, y: y + pxLen}
            const bl = {x, y: y + pxLen}

            const topT = topleft / (topleft + topright)

            const leftT = topleft / (topleft + bottomleft)

            const rightT = topright / (topright + bottomright)

            const bottomT = bottomleft / (bottomleft + bottomright)

            let a, b, c, d;

            if (useHalves) {            
                a = {x: x + half, y}
                b = {x: x + pxLen, y: y + half}
                c = {x: x + half, y: y + pxLen}
                d = {x, y: y + half}
            }
            else {
                a = {x: lerp(tl.x, tr.x, topT), y}
                b = {x: x + pxLen, y: lerp(tr.y, br.y, rightT)}
                c = {x: lerp(bl.x, br.x, bottomT), y: y + pxLen}
                d = {x, y: lerp(tl.y, bl.y, leftT)}
            }

            const state = getState(bottomleft, bottomright, topright, topleft)

            /*

    O---a---O
    |       |
    d       b
    |       |
    O---c---O
                0b (tl, tr, br, bl)
    */

            ctx.fillStyle = 'green' //`rgb(0, ${Math.round((topleft + topright + bottomleft + bottomright) / 4 * 255)}, 0)`
            switch(state) {
                case 0b1000:
                    //top left only
                    shape(tl, a, d)
                    break;
                case 0b0100:
                    //top right only
                    shape(tr, a, b)
                    break;
                case 0b0001:
                    //bottom left only
                    shape(bl, c, d)
                    break;
                case 0b0010:
                    //bottom right only
                    shape(br, b, c)
                    break;
                case 0b1100:
                    //top only
                    shape(tl, tr, b, d)
                    break;
                case 0b0011:
                    //bottom only
                    shape(bl, br, b, d)
                    break;
                case 0b1001:
                    //left only
                    shape(tl, bl, c, a)
                    break;
                case 0b0110:
                    //right only
                    shape(tr, br, c, a)
                    break;
                case 0b1010:
                    //tl and br
                    shape(tl, a, b, br, c, d)
                    break;
                case 0b0101:
                    //bl and tr
                    shape(bl, d, a, tr, b, c)
                    break;
                case 0b1110:
                    //not bl
                    shape(tl, tr, br, c, d)
                    break;
                case 0b1101:
                    //not br
                    shape(tl, tr, b, c, bl)
                    break;
                case 0b1011:
                    //not tr
                    shape(tl, a, b, br, bl)
                    break;
                case 0b0111:
                    //not tl
                    shape(tr, br, bl, d, a)
                    break;
                case 0b1111:
                    shape(tl, tr, br, bl)
                    break;
            }

            continue;

            ctx.strokeStyle = 'green'

            ctx.strokeStyle = 'blue'
            ctx.strokeRect(x, y, pxLen, pxLen)
        }
    }

    for (let ball of ballPositions) {
        //circle(ball.x, ball.y, ball.r, '#00a5')
    }

    ctx.restore()
}

let angle = 0;
let angle2 = Math.random() * 2 * Math.PI;
const speed = 0.01;
const speed2 = 0.01;

function animate() {
    requestAnimationFrame(animate)
    ctx.clearRect(0,0,canvas.width, canvas.height)
    angle += speed
    angle2 += speed2;

    //console.log(values[500/pxLen][300/pxLen])

    ballPositions[0].x = 400//(Math.cos(angle) + 1) * 200 + 100
    ballPositions[0].y = 300//(Math.sin(angle) + 1) * 100 + 100
    ballPositions[1].x = (Math.cos(angle2) + 1) * 250 + 100
    ballPositions[1].y = 300//(Math.sin(angle2) + 1) * 3 + 2
    calcValues()
    //circle(a * pxLen, b * pxLen, 10, 'purple')

    doMarching()
}

animate()