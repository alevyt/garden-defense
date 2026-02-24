const canvas = document.getElementById("game")
const ctx = canvas.getContext("2d")

const WIDTH = 960
const HEIGHT = 540
canvas.width = WIDTH
canvas.height = HEIGHT

const COLS = 9
const ROWS = 5

const CELL_W = WIDTH / COLS
const CELL_H = HEIGHT / ROWS

function drawGrid() {
    ctx.strokeStyle = "#333"
    for (let c = 0; c <= COLS; c++) {
        ctx.beginPath()
        ctx.moveTo(c * CELL_W, 0)
        ctx.lineTo(c * CELL_W, HEIGHT)
        ctx.stroke()
    }
    for (let r = 0; r <= ROWS; r++) {
        ctx.beginPath()
        ctx.moveTo(0, r * CELL_H)
        ctx.lineTo(WIDTH, r * CELL_H)
        ctx.stroke()
    }
}

function render() {
    ctx.clearRect(0, 0, WIDTH, HEIGHT)
    drawGrid()
}

function loop() {
    render()
    requestAnimationFrame(loop)
}
loop()