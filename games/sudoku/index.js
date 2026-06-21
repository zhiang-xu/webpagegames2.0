        const pageAudio = window.GamePageUI.mount({ home: true, sound: true, muted: false });
        // ============ 数独生成器 ============
        function generateSudoku() {
            // 生成完整数独
            const board = Array.from({length: 9}, () => Array(9).fill(0));
            fillBoard(board);
            return board;
        }

        function fillBoard(board) {
            const empty = findEmpty(board);
            if (!empty) return true;
            const [row, col] = empty;
            const nums = shuffle([1,2,3,4,5,6,7,8,9]);

            for (const num of nums) {
                if (isValid(board, row, col, num)) {
                    board[row][col] = num;
                    if (fillBoard(board)) return true;
                    board[row][col] = 0;
                }
            }
            return false;
        }

        function findEmpty(board) {
            for (let r = 0; r < 9; r++) {
                for (let c = 0; c < 9; c++) {
                    if (board[r][c] === 0) return [r, c];
                }
            }
            return null;
        }

        function isValid(board, row, col, num) {
            // 检查行
            for (let c = 0; c < 9; c++) {
                if (board[row][c] === num) return false;
            }
            // 检查列
            for (let r = 0; r < 9; r++) {
                if (board[r][col] === num) return false;
            }
            // 检查3×3宫格
            const startR = Math.floor(row / 3) * 3;
            const startC = Math.floor(col / 3) * 3;
            for (let r = startR; r < startR + 3; r++) {
                for (let c = startC; c < startC + 3; c++) {
                    if (board[r][c] === num) return false;
                }
            }
            return true;
        }

        function shuffle(array) {
            const arr = [...array];
            for (let i = arr.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [arr[i], arr[j]] = [arr[j], arr[i]];
            }
            return arr;
        }

        // ============ 游戏状态 ============
        const DIFFICULTY = {
            easy:   { remove: 30,  name: '简单' },
            medium: { remove: 40,  name: '中等' },
            hard:   { remove: 50,  name: '困难' }
        };

        let difficulty = 'easy';
        let solution = [];
        let puzzle = [];
        let userBoard = [];
        let selectedCell = null;
        let errors = 0;
        let hints = 3;
        let timer = null;
        let seconds = 0;
        let gameActive = false;

        const boardEl = document.getElementById('board');
        const timeDisplay = document.getElementById('timeDisplay');
        const errorsDisplay = document.getElementById('errorsDisplay');
        const hintsDisplay = document.getElementById('hintsDisplay');
        const victoryOverlay = document.getElementById('victory');

        function formatTime(s) {
            const m = Math.floor(s / 60);
            const sec = s % 60;
            return String(m).padStart(2, '0') + ':' + String(sec).padStart(2, '0');
        }

        function startTimer() {
            if (timer) return;
            seconds = 0;
            timer = setInterval(() => {
                seconds++;
                timeDisplay.textContent = formatTime(seconds);
            }, 1000);
        }

        function stopTimer() {
            clearInterval(timer);
            timer = null;
        }

        function newGame(diff) {
            difficulty = diff;
            document.querySelectorAll('.btn-diff').forEach(btn => btn.classList.remove('active'));
            document.querySelector('.btn-diff.' + diff).classList.add('active');

            stopTimer();
            errors = 0;
            hints = 3;
            gameActive = false;
            selectedCell = null;
            victoryOverlay.classList.remove('show');

            // 生成完整数独
            solution = generateSudoku();

            // 挖空生成谜题
            puzzle = solution.map(row => [...row]);
            const toRemove = DIFFICULTY[diff].remove;
            let removed = 0;
            while (removed < toRemove) {
                const r = Math.floor(Math.random() * 9);
                const c = Math.floor(Math.random() * 9);
                if (puzzle[r][c] !== 0) {
                    puzzle[r][c] = 0;
                    removed++;
                }
            }

            userBoard = puzzle.map(row => [...row]);

            renderBoard();
            renderNumberPad();
            updateInfo();
        }

        function startGame() {
            gameActive = true;
            startTimer();
            pageAudio.play('start');
        }

        function renderBoard() {
            boardEl.innerHTML = '';
            for (let r = 0; r < 9; r++) {
                for (let c = 0; c < 9; c++) {
                    const cell = document.createElement('div');
                    cell.className = 'cell';
                    cell.dataset.row = r;
                    cell.dataset.col = c;

                    if (puzzle[r][c] !== 0) {
                        cell.textContent = puzzle[r][c];
                        cell.classList.add('fixed');
                    } else if (userBoard[r][c] !== 0) {
                        cell.textContent = userBoard[r][c];
                        cell.classList.add('user-input');
                    }

                    cell.addEventListener('click', () => selectCell(r, c));
                    boardEl.appendChild(cell);
                }
            }
        }

        function renderNumberPad() {
            const pad = document.getElementById('numberPad');
            pad.innerHTML = '';
            for (let i = 1; i <= 9; i++) {
                const btn = document.createElement('button');
                btn.className = 'num-btn num-' + i;
                btn.textContent = i;
                btn.addEventListener('click', () => inputNumber(i));
                pad.appendChild(btn);
            }
            // 擦除按钮
            const eraseBtn = document.createElement('button');
            eraseBtn.className = 'num-btn erase';
            eraseBtn.textContent = '⌫';
            eraseBtn.addEventListener('click', () => inputNumber(0));
            pad.appendChild(eraseBtn);
        }

        function selectCell(row, col) {
            if (!gameActive) return;
            selectedCell = { row, col };
            highlightCells();
            pageAudio.play('select');
        }

        function highlightCells() {
            if (!selectedCell) return;
            const { row, col } = selectedCell;
            const cells = document.querySelectorAll('.cell');

            cells.forEach(cell => {
                cell.classList.remove('selected', 'highlighted', 'same-number');
                const r = parseInt(cell.dataset.row);
                const c = parseInt(cell.dataset.col);

                if (r === row && c === col) {
                    cell.classList.add('selected');
                } else if (r === row || c === col ||
                    (Math.floor(r/3) === Math.floor(row/3) && Math.floor(c/3) === Math.floor(col/3))) {
                    cell.classList.add('highlighted');
                }

                // 高亮相同数字
                const val = cell.textContent;
                if (val && val !== '0') {
                    const selectedVal = document.querySelector('.cell.selected')?.textContent;
                    if (selectedVal && val === selectedVal) {
                        cell.classList.add('same-number');
                    }
                }
            });
        }

        function inputNumber(num) {
            if (!gameActive || !selectedCell) return;
            const { row, col } = selectedCell;

            // 不能修改固定数字
            if (puzzle[row][col] !== 0) return;

            userBoard[row][col] = num;

            // 检查是否正确
            if (num !== 0 && num !== solution[row][col]) {
                errors++;
                pageAudio.play('error');
                if (errors >= 3) {
                    gameOver();
                    return;
                }
            } else {
                pageAudio.play(num === 0 ? 'tap' : 'move');
            }

            // 更新显示
            const cell = document.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
            cell.textContent = num === 0 ? '' : num;
            cell.classList.remove('error');
            if (num !== 0 && num !== solution[row][col]) {
                cell.classList.add('error');
            }

            highlightCells();
            updateInfo();
            checkWin();
        }

        function useHint() {
            if (!gameActive || hints <= 0) return;

            // 找一个没填对的空位
            for (let r = 0; r < 9; r++) {
                for (let c = 0; c < 9; c++) {
                    if (userBoard[r][c] === 0 || userBoard[r][c] !== solution[r][c]) {
                        userBoard[r][c] = solution[r][c];
                        const cell = document.querySelector(`.cell[data-row="${r}"][data-col="${c}"]`);
                        cell.textContent = solution[r][c];
                        cell.classList.remove('error');
                        cell.style.background = '#c8e6c9';
                        setTimeout(() => cell.style.background = '', 1000);

                        hints--;
                        updateInfo();
                        checkWin();
                        pageAudio.play('success');
                        return;
                    }
                }
            }
        }

        function checkAnswer() {
            if (!gameActive) return;
            let allCorrect = true;
            let filled = 0;

            document.querySelectorAll('.cell').forEach(cell => {
                const r = parseInt(cell.dataset.row);
                const c = parseInt(cell.dataset.col);
                if (userBoard[r][c] !== 0) {
                    filled++;
                    if (userBoard[r][c] !== solution[r][c]) {
                        cell.classList.add('error');
                        allCorrect = false;
                    }
                }
            });

            if (allCorrect && filled === 81) {
                gameWon();
            } else if (!allCorrect) {
                pageAudio.play('error');
            }
        }

        function checkWin() {
            for (let r = 0; r < 9; r++) {
                for (let c = 0; c < 9; c++) {
                    if (userBoard[r][c] !== solution[r][c]) return;
                }
            }
            gameWon();
        }

        function gameWon() {
            gameActive = false;
            stopTimer();
            document.getElementById('finalTime').textContent = formatTime(seconds);
            document.getElementById('finalErrors').textContent = errors;

            // 评分
            let stars = '★';
            if (seconds < 180 && errors === 0) stars = '★★★';
            else if (seconds < 360 && errors <= 1) stars = '★★';

            document.getElementById('finalScore').textContent = stars;
            victoryOverlay.classList.add('show');
            pageAudio.play('win');
        }

        function gameOver() {
            gameActive = false;
            stopTimer();
            pageAudio.play('lose');
            alert('💥 游戏结束！你已经有3次错误了。');
        }

        function giveUp() {
            if (confirm('确定要放弃吗？')) {
                gameActive = false;
                stopTimer();
                // 显示答案
                document.querySelectorAll('.cell').forEach(cell => {
                    const r = parseInt(cell.dataset.row);
                    const c = parseInt(cell.dataset.col);
                    if (puzzle[r][c] === 0) {
                        cell.textContent = solution[r][c];
                        cell.style.background = '#e8f5e9';
                    }
                });
            }
        }

        function updateInfo() {
            errorsDisplay.textContent = errors + '/3';
            hintsDisplay.textContent = hints;
        }

        // 键盘支持
        document.addEventListener('keydown', (e) => {
            if (!gameActive) return;

            if (e.key >= '1' && e.key <= '9') {
                inputNumber(parseInt(e.key));
            } else if (e.key === 'Backspace' || e.key === 'Delete') {
                inputNumber(0);
            } else if (selectedCell) {
                const { row, col } = selectedCell;
                if (e.key === 'ArrowUp') selectCell(Math.max(0, row - 1), col);
                else if (e.key === 'ArrowDown') selectCell(Math.min(8, row + 1), col);
                else if (e.key === 'ArrowLeft') selectCell(row, Math.max(0, col - 1));
                else if (e.key === 'ArrowRight') selectCell(row, Math.min(8, col + 1));
            }
        });

// 初始化
newGame('easy');

// 统一工具栏：返回主页 + 音效开关
GamePageUI.mount({ home: true, sound: true }, 'bar');
