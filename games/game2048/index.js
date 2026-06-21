const pageAudio = window.GamePageUI.mount({ home: true, sound: true, muted: false });
const SIZE = 4;
let board = [];
let score = 0;
let bestScore = parseInt(localStorage.getItem('bestScore2048') || '0');
let gameWon = false;
let gameOver = false;
let gameActive = false;
let tiles = [];

const gridContainer = document.getElementById('gridContainer');
const scoreEl = document.getElementById('score');
const bestScoreEl = document.getElementById('bestScore');
const gameOverOverlay = document.getElementById('gameOver');
const victoryOverlay = document.getElementById('victory');
const finalScoreEl = document.getElementById('finalScore');

bestScoreEl.textContent = bestScore;

function initGrid() {
    gridContainer.innerHTML = '';
    for (let i = 0; i < SIZE * SIZE; i++) {
        const cell = document.createElement('div');
        cell.className = 'grid-cell';
        gridContainer.appendChild(cell);
    }
}

function initBoard() {
    board = Array.from({length: SIZE}, () => Array(SIZE).fill(0));
    score = 0;
    gameWon = false;
    gameOver = false;
    gameActive = false;
    updateScore();
    gameOverOverlay.classList.remove('show');
    victoryOverlay.classList.remove('show');
    clearTiles();
    render();
}

function startGame() {
    initBoard();
    gameActive = true;
    addNewTile();
    addNewTile();
    render();
    pageAudio.play('start');
}

function clearTiles() {
    tiles.forEach(t => t.remove());
    tiles = [];
}

function addNewTile() {
    const empty = [];
    for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) {
            if (board[r][c] === 0) empty.push({r, c});
        }
    }
    if (empty.length === 0) return;
    const {r, c} = empty[Math.floor(Math.random() * empty.length)];
    board[r][c] = Math.random() < 0.9 ? 2 : 4;
    tiles.push({r, c, value: board[r][c], element: null});
}

function render() {
    tiles.forEach(t => t.element?.remove());
    tiles = [];

    for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) {
            if (board[r][c] !== 0) {
                const cell = gridContainer.children[r * SIZE + c];
                const tile = document.createElement('div');
                tile.className = 'tile tile-' + board[r][c] + ' tile-new';
                tile.textContent = board[r][c];
                cell.appendChild(tile);
                tiles.push({r, c, value: board[r][c], element: tile});
            }
        }
    }
}

function updateScore() {
    scoreEl.textContent = score;
    if (score > bestScore) {
        bestScore = score;
        bestScoreEl.textContent = bestScore;
        localStorage.setItem('bestScore2048', bestScore);
    }
}

function slideRow(row) {
    const arr = row.filter(v => v !== 0);
    const result = [];
    let i = 0;
    while (i < arr.length) {
        if (i + 1 < arr.length && arr[i] === arr[i + 1]) {
            result.push(arr[i] * 2);
            score += arr[i] * 2;
            i += 2;
        } else {
            result.push(arr[i]);
            i++;
        }
    }
    while (result.length < SIZE) result.push(0);
    return result;
}

function moveLeft() {
    let moved = false;
    for (let r = 0; r < SIZE; r++) {
        const oldRow = board[r];
        const newRow = slideRow(oldRow);
        board[r] = newRow;
        if (oldRow.join(',') !== newRow.join(',')) moved = true;
    }
    return moved;
}

function moveRight() {
    let moved = false;
    for (let r = 0; r < SIZE; r++) {
        const oldRow = board[r];
        const reversed = [...oldRow].reverse();
        const newRow = slideRow(reversed).reverse();
        board[r] = newRow;
        if (oldRow.join(',') !== newRow.join(',')) moved = true;
    }
    return moved;
}

function moveUp() {
    let moved = false;
    for (let c = 0; c < SIZE; c++) {
        const col = board.map(r => r[c]);
        const newCol = slideRow(col);
        for (let r = 0; r < SIZE; r++) {
            if (board[r][c] !== newCol[r]) moved = true;
            board[r][c] = newCol[r];
        }
    }
    return moved;
}

function moveDown() {
    let moved = false;
    for (let c = 0; c < SIZE; c++) {
        const col = board.map(r => r[c]).reverse();
        const newCol = slideRow(col).reverse();
        for (let r = 0; r < SIZE; r++) {
            if (board[r][c] !== newCol[r]) moved = true;
            board[r][c] = newCol[r];
        }
    }
    return moved;
}

function handleMove(direction) {
    if (!gameActive) return;
    if (gameOver) return;

    const previousScore = score;
    let moved = false;
    if (direction === 'left') moved = moveLeft();
    else if (direction === 'right') moved = moveRight();
    else if (direction === 'up') moved = moveUp();
    else if (direction === 'down') moved = moveDown();

    if (!moved) return;

    updateScore();
    addNewTile();
    render();
    pageAudio.play(score > previousScore ? 'clear' : 'move');

    if (!gameWon) {
        for (let r = 0; r < SIZE; r++) {
            for (let c = 0; c < SIZE; c++) {
                if (board[r][c] === 2048) {
                    gameWon = true;
                    victoryOverlay.classList.add('show');
                    pageAudio.play('win');
                    return;
                }
            }
        }
    }

    if (isGameOver()) {
        gameOver = true;
        finalScoreEl.textContent = score;
        gameOverOverlay.classList.add('show');
        pageAudio.play('lose');
    }
}

function isGameOver() {
    for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) {
            if (board[r][c] === 0) return false;
        }
    }
    for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) {
            const val = board[r][c];
            if (c + 1 < SIZE && board[r][c + 1] === val) return false;
            if (r + 1 < SIZE && board[r + 1][c] === val) return false;
        }
    }
    return true;
}

function resetGame() {
    startGame();
}

function continueGame() {
    gameActive = true;
    victoryOverlay.classList.remove('show');
    pageAudio.play('tap');
}

function handleMobileMove(dir) {
    handleMove(dir);
}

document.addEventListener('keydown', (e) => {
    switch(e.key) {
        case 'ArrowUp': e.preventDefault(); handleMove('up'); break;
        case 'ArrowDown': e.preventDefault(); handleMove('down'); break;
        case 'ArrowLeft': e.preventDefault(); handleMove('left'); break;
        case 'ArrowRight': e.preventDefault(); handleMove('right'); break;
    }
});

let touchStartX = 0;
let touchStartY = 0;
const gameBoard = document.getElementById('gameBoard');

gameBoard.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    e.preventDefault();
}, { passive: false });

gameBoard.addEventListener('touchend', (e) => {
    if (!touchStartX || !touchStartY) return;

    const dx = e.changedTouches[0].clientX - touchStartX;
    const dy = e.changedTouches[0].clientY - touchStartY;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    if (Math.max(absDx, absDy) > 30) {
        if (absDx > absDy) {
            handleMove(dx > 0 ? 'right' : 'left');
        } else {
            handleMove(dy > 0 ? 'down' : 'up');
        }
    }

    touchStartX = 0;
    touchStartY = 0;
    e.preventDefault();
}, { passive: false });

initGrid();
initBoard();
