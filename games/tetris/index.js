const pageAudio = window.GamePageUI.mount({ home: true, sound: true, muted: false });
// ============ 常量 ============
const COLS = 10, ROWS = 20, BLOCK_SIZE = 40;
let BLOCK_SIZE_MOBILE = 28;
const COLORS = [
    null,
    '#00d4ff', // I - 青
    '#ff6b6b', // J - 红
    '#ffa751', // L - 橙
    '#ffe259', // O - 黄
    '#4ecdc4', // S - 绿
    '#a855f7', // T - 紫
    '#3b82f6', // Z - 蓝
];

const SHAPES = [
    null,
    [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]], // I
    [[2,0,0],[2,2,2],[0,0,0]], // J
    [[0,0,3],[3,3,3],[0,0,0]], // L
    [[4,4],[4,4]], // O
    [[0,5,5],[5,5,0],[0,0,0]], // S
    [[0,6,0],[6,6,6],[0,0,0]], // T
    [[7,7,0],[0,7,7],[0,0,0]], // Z
];

// ============ 全局变量 ============
let board, score, level, lines, gameOver, paused, dropInterval;
let piece, nextPiece;
let dropCounter, lastTime, animationId;
let dropSpeed = 1000;

const canvas = document.getElementById('tetris');
const ctx = canvas.getContext('2d');
const nextCanvas = document.getElementById('next');
const nextCtx = nextCanvas.getContext('2d');

// 动态计算画布尺寸
function resizeCanvas() {
    const isMobile = window.innerWidth <= 768;
    if (isMobile) {
        BLOCK_SIZE_MOBILE = 24;
        canvas.width = COLS * BLOCK_SIZE_MOBILE;
        canvas.height = ROWS * BLOCK_SIZE_MOBILE;
    } else {
        canvas.width = COLS * BLOCK_SIZE;
        canvas.height = ROWS * BLOCK_SIZE;
    }
}

// ============ 难度选项 ============
const DIFFICULTY = {
    easy:   { name: '简单',   baseSpeed: 1500 },
    medium: { name: '中等',   baseSpeed: 1000 },
    hard:   { name: '困难',   baseSpeed: 600 }
};
let difficulty = 'medium';

// ============ 初始化 ============
function init() {
    board = Array.from({length: ROWS}, () => Array(COLS).fill(0));
    score = 0;
    level = 1;
    lines = 0;
    gameOver = false;
    paused = false;
    dropSpeed = DIFFICULTY[difficulty].baseSpeed;
    dropCounter = 0;
    lastTime = 0;

    piece = createPiece();
    nextPiece = createPiece();

    updateDisplay();
    draw();
    document.getElementById('gameOver').classList.remove('show');
    document.getElementById('startBtn').style.display = 'block';
    document.getElementById('pauseBtn').style.display = 'none';
    document.getElementById('difficultyDisplay').textContent = DIFFICULTY[difficulty].name;
    document.getElementById('speedDisplay').textContent = dropSpeed + 'ms';
    setDifficulty(difficulty);
}

function createPiece() {
    const type = Math.floor(Math.random() * 7) + 1;
    return {
        type,
        shape: SHAPES[type].map(row => [...row]),
        x: Math.floor(COLS / 2) - Math.floor(SHAPES[type][0].length / 2),
        y: 0
    };
}

// ============ 绘制 ============
function drawBlock(ctx, x, y, color, size = BLOCK_SIZE) {
    const gradient = ctx.createRadialGradient(x + size*0.3, y + size*0.3, 0, x + size*0.5, y + size*0.5, size*0.6);
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, shadeColor(color, -30));

    ctx.fillStyle = gradient;
    ctx.fillRect(x, y, size, size);

    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.fillRect(x, y, size, 3);
    ctx.fillRect(x, y, 3, size);

    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.fillRect(x + size - 3, y, 3, size);
    ctx.fillRect(x, y + size - 3, size, 3);

    ctx.strokeStyle = 'rgba(0,0,0,0.15)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, size, size);
}

function shadeColor(color, percent) {
    const num = parseInt(color.replace('#',''), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.max(0, Math.min(255, (num >> 16) + amt));
    const G = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) + amt));
    const B = Math.max(0, Math.min(255, (num & 0x0000FF) + amt));
    return '#' + (0x1000000 + R*0x10000 + G*0x100 + B).toString(16).slice(1);
}

function draw() {
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= COLS; i++) {
        ctx.beginPath();
        ctx.moveTo(i * BLOCK_SIZE, 0);
        ctx.lineTo(i * BLOCK_SIZE, canvas.height);
        ctx.stroke();
    }
    for (let i = 0; i <= ROWS; i++) {
        ctx.beginPath();
        ctx.moveTo(0, i * BLOCK_SIZE);
        ctx.lineTo(canvas.width, i * BLOCK_SIZE);
        ctx.stroke();
    }

    for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
            if (board[y][x]) {
                drawBlock(ctx, x * BLOCK_SIZE, y * BLOCK_SIZE, COLORS[board[y][x]]);
            }
        }
    }

    if (piece) {
        piece.shape.forEach((row, dy) => {
            row.forEach((val, dx) => {
                if (val) {
                    drawBlock(ctx, (piece.x + dx) * BLOCK_SIZE, (piece.y + dy) * BLOCK_SIZE, COLORS[val]);
                }
            });
        });
    }

    nextCtx.fillStyle = '#f8f8f8';
    nextCtx.fillRect(0, 0, nextCanvas.width, nextCanvas.height);
    if (nextPiece) {
        const size = 28;
        const offsetX = (nextCanvas.width - nextPiece.shape[0].length * size) / 2;
        const offsetY = (nextCanvas.height - nextPiece.shape.length * size) / 2;
        nextPiece.shape.forEach((row, dy) => {
            row.forEach((val, dx) => {
                if (val) {
                    const grad = nextCtx.createRadialGradient(
                        offsetX + dx*size + size*0.3, offsetY + dy*size + size*0.3, 0,
                        offsetX + dx*size + size*0.5, offsetY + dy*size + size*0.5, size*0.6
                    );
                    grad.addColorStop(0, COLORS[val]);
                    grad.addColorStop(1, shadeColor(COLORS[val], -30));
                    nextCtx.fillStyle = grad;
                    nextCtx.fillRect(offsetX + dx*size, offsetY + dy*size, size, size);
                }
            });
        });
    }
}

// ============ 游戏逻辑 ============
function collide(p) {
    return p.shape.some((row, dy) => {
        return row.some((val, dx) => {
            if (!val) return false;
            const nx = p.x + dx, ny = p.y + dy;
            return nx < 0 || nx >= COLS || ny >= ROWS || (ny >= 0 && board[ny][nx]);
        });
    });
}

function merge() {
    piece.shape.forEach((row, dy) => {
        row.forEach((val, dx) => {
            if (val && piece.y + dy >= 0) {
                board[piece.y + dy][piece.x + dx] = val;
            }
        });
    });
}

function rotatePiece() {
    const rotated = piece.shape[0].map((_, i) =>
        piece.shape.map(row => row[row.length - 1 - i])
    );
    const oldShape = piece.shape;
    piece.shape = rotated;
    let rotatedSuccessfully = true;
    if (collide(piece)) {
        const offsets = [1, -1, 2, -2];
        for (let off of offsets) {
            piece.x += off;
            if (!collide(piece)) {
                pageAudio.play('select');
                return;
            }
            piece.x -= off;
        }
        piece.shape = oldShape;
        rotatedSuccessfully = false;
    }

    if (rotatedSuccessfully) {
        pageAudio.play('select');
    }
}

function clearLines() {
    let cleared = 0;
    for (let y = ROWS - 1; y >= 0; y--) {
        if (board[y].every(v => v !== 0)) {
            board.splice(y, 1);
            board.unshift(Array(COLS).fill(0));
            cleared++;
            y++;
        }
    }
    if (cleared > 0) {
        const points = [0, 100, 300, 500, 800];
        score += points[cleared] * level;
        lines += cleared;
        level = Math.floor(lines / 10) + 1;
        pageAudio.play('clear');
        const speedDecrement = {
            easy: 50,
            medium: 100,
            hard: 150
        }[difficulty];
        dropSpeed = Math.max(100, DIFFICULTY[difficulty].baseSpeed - (level - 1) * speedDecrement);
        updateDisplay();
    }
}

function playerDrop() {
    piece.y++;
    if (collide(piece)) {
        piece.y--;
        pageAudio.play('drop');
        merge();
        clearLines();
        piece = nextPiece;
        nextPiece = createPiece();
        if (collide(piece)) {
            endGame();
        }
    }
    dropCounter = 0;
}

function hardDrop() {
    while (!collide({ ...piece, y: piece.y + 1 })) {
        piece.y++;
        score += 2;
    }
    updateDisplay();
    playerDrop();
    draw();
}

function move(dir) {
    const oldX = piece.x;
    piece.x += dir;
    if (collide(piece)) piece.x -= dir;
    if (piece.x !== oldX) pageAudio.play('move');
}

function endGame() {
    gameOver = true;
    document.getElementById('finalScore').textContent = score;
    document.getElementById('gameOver').classList.add('show');
    document.getElementById('pauseBtn').style.display = 'none';
    pageAudio.play('lose');
}

function resetGame() {
    init();
    pageAudio.play('tap');
}

function startGame() {
    init();
    gameOver = false;
    paused = false;
    lastTime = performance.now();
    dropCounter = 0;
    pageAudio.play('start');
    document.getElementById('startBtn').style.display = 'none';
    document.getElementById('pauseBtn').style.display = 'block';
    document.getElementById('pauseBtn').textContent = '⏸ 暂停';
    document.getElementById('speedDisplay').textContent = dropSpeed + 'ms';
    update();
}

function togglePause() {
    if (gameOver) return;
    paused = !paused;
    pageAudio.play(paused ? 'pause' : 'tap');
    document.getElementById('pauseBtn').textContent = paused ? '▶ 继续' : '⏸ 暂停';
    if (!paused) {
        lastTime = performance.now();
        update(lastTime);
    }
}

function setDifficulty(diff) {
    difficulty = diff;
    ['easy', 'medium', 'hard'].forEach(d => {
        const btn = document.getElementById('btn' + d.charAt(0).toUpperCase() + d.slice(1));
        btn.style.outline = d === diff ? '3px solid white' : 'none';
        btn.style.outlineOffset = '3px';
    });
    document.getElementById('difficultyDisplay').textContent = DIFFICULTY[diff].name;
    document.getElementById('speedDisplay').textContent = DIFFICULTY[diff].baseSpeed + 'ms';
    pageAudio.play('tap');
}

function updateDisplay() {
    document.getElementById('score').textContent = score;
    document.getElementById('level').textContent = level;
    document.getElementById('lines').textContent = lines;
    document.getElementById('speedDisplay').textContent = dropSpeed + 'ms';
}

// ============ 游戏循环 ============
function update(time = 0) {
    if (gameOver) return;
    if (paused) {
        animationId = requestAnimationFrame(update);
        return;
    }

    const deltaTime = time - lastTime;
    lastTime = time;
    dropCounter += deltaTime;

    if (dropCounter >= dropSpeed) {
        playerDrop();
    }

    draw();
    animationId = requestAnimationFrame(update);
}

// ============ 键盘控制 ============
document.addEventListener('keydown', (e) => {
    if (gameOver) return;

    if (e.key === 'p' || e.key === 'P') {
        togglePause();
        e.preventDefault();
        return;
    }

    if (paused) return;

    if (e.code === 'Space' || e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault();
        hardDrop();
        draw();
        return;
    }

    switch(e.key) {
        case 'ArrowLeft': move(-1); break;
        case 'ArrowRight': move(1); break;
        case 'ArrowDown': playerDrop(); break;
        case 'ArrowUp': rotatePiece(); break;
    }
    draw();
});

// ============ 移动端控制 ============
function moveLeft(e) { e?.preventDefault(); move(-1); draw(); }
function moveRight(e) { e?.preventDefault(); move(1); draw(); }
function rotate(e) { e?.preventDefault(); rotatePiece(); draw(); }
function dropDown(e) { e?.preventDefault(); playerDrop(); draw(); }
function handleHardDrop(e) { e?.preventDefault(); hardDrop(); draw(); }

// 初始画面
init();
