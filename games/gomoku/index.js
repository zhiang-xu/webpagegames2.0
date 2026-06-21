        // 五子棋游戏核心逻辑
        class Gomoku {
            constructor() {
                this.boardSize = 15;
                this.board = [];
                this.currentPlayer = 'black';
                this.gameOver = false;
                this.moves = [];
                this.mode = 'pvp';
                this.difficulty = 'medium';
                this.searchDepth = 2;
                this.playerColor = 'black';
                this.aiColor = 'white';
                this.soundEnabled = true;
                this.gameActive = false;
                this.transpositionTable = BoardGameAI.createTranspositionTable(25000);

                // 音效上下文
                this.audioContext = null;

                this.initBoard();
                this.setupEventListeners();
                this.initSound();
                this.renderBoard();
                this.updateStatus('点击"开始游戏"按钮开始');
            }

            initBoard() {
            this.board = [];
            for (let i = 0; i < this.boardSize; i++) {
                this.board[i] = [];
                for (let j = 0; j < this.boardSize; j++) {
                    this.board[i][j] = null;
                }
            }
            this.gameActive = false;
            }

            setupEventListeners() {
                document.getElementById('gameMode').addEventListener('change', (e) => {
                    this.mode = e.target.value;
                    this.updateAiControls();
                });

                document.getElementById('difficulty').addEventListener('change', (e) => {
                    this.difficulty = e.target.value;
                    this.applyDifficultyPreset();
                });

                document.getElementById('playerColor').addEventListener('change', (e) => {
                    this.playerColor = e.target.value;
                    this.aiColor = this.playerColor === 'black' ? 'white' : 'black';
                });

                // 音效开关
                document.getElementById('soundToggle').addEventListener('click', () => this.toggleSound());
            }

            updateAiControls() {
                const visible = this.mode === 'pve';
                document.getElementById('difficultyGroup').style.display = visible ? 'flex' : 'none';
            }

            applyDifficultyPreset() {
                const presetDepth = {
                    easy: 1,
                    medium: 2,
                    hard: 3,
                    expert: 4
                };
                this.searchDepth = presetDepth[this.difficulty] || 2;
            }

            initSound() {
                // 初始化音频上下文
                try {
                    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
                    // 浏览器要求用户交互后才能播放音频
                    document.addEventListener('click', () => {
                        if (this.audioContext && this.audioContext.state === 'suspended') {
                            this.audioContext.resume();
                        }
                    }, { once: true });
                } catch (e) {
                    console.log('Web Audio API 不支持');
                }
            }

            toggleSound() {
                this.soundEnabled = !this.soundEnabled;
                const toggle = document.getElementById('soundToggle');
                toggle.textContent = this.soundEnabled ? '🔊' : '🔇';
                toggle.classList.toggle('muted', !this.soundEnabled);
            }

            playSound(type) {
                if (!this.soundEnabled || !this.audioContext) return;
                
                try {
                    const oscillator = this.audioContext.createOscillator();
                    const gainNode = this.audioContext.createGain();
                    
                    oscillator.connect(gainNode);
                    gainNode.connect(this.audioContext.destination);
                    
                    switch (type) {
                        case 'place':
                            // 落子声
                            oscillator.frequency.value = 400;
                            oscillator.type = 'sine';
                            gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
                            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.15);
                            oscillator.start(this.audioContext.currentTime);
                            oscillator.stop(this.audioContext.currentTime + 0.15);
                            break;
                        case 'win':
                            // 获胜声
                            oscillator.frequency.value = 523.25;
                            oscillator.type = 'triangle';
                            gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
                            
                            // 播放和弦
                            const notes = [523.25, 659.25, 783.99, 1046.50];
                            notes.forEach((freq, i) => {
                                const osc = this.audioContext.createOscillator();
                                const gain = this.audioContext.createGain();
                                osc.connect(gain);
                                gain.connect(this.audioContext.destination);
                                osc.frequency.value = freq;
                                osc.type = 'triangle';
                                gain.gain.setValueAtTime(0.2, this.audioContext.currentTime + i * 0.1);
                                gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + i * 0.1 + 0.3);
                                osc.start(this.audioContext.currentTime + i * 0.1);
                                osc.stop(this.audioContext.currentTime + i * 0.1 + 0.3);
                            });
                            break;
                        case 'undo':
                            // 悔棋声
                            oscillator.frequency.value = 300;
                            oscillator.type = 'sine';
                            gainNode.gain.setValueAtTime(0.2, this.audioContext.currentTime);
                            gainNode.gain.linearRampToValueAtTime(0.01, this.audioContext.currentTime + 0.2);
                            oscillator.start(this.audioContext.currentTime);
                            oscillator.stop(this.audioContext.currentTime + 0.2);
                            break;
                    }
                } catch (e) {
                    console.log('音效播放失败:', e);
                }
            }

            start() {
                this.initBoard();
                this.currentPlayer = 'black';
                this.gameOver = false;
                this.gameActive = true;
                this.moves = [];
                this.transpositionTable.clear();
                this.renderBoard();
                this.updateStatus();
                this.updateHistory();

                if (this.mode === 'pve' && this.playerColor === 'white') {
                    setTimeout(() => this.aiMove(), 500);
                }
            }

            reset() {
                this.initBoard();
                this.currentPlayer = 'black';
                this.gameOver = false;
                this.moves = [];
                this.transpositionTable.clear();
                this.renderBoard();
                this.updateStatus('请选择游戏模式开始');
                this.updateHistory();
            }

            undo() {
                if (this.gameOver || this.moves.length === 0) return;

                if (this.mode === 'pvp') {
                    const lastMove = this.moves.pop();
                    this.board[lastMove.row][lastMove.col] = null;
                    this.currentPlayer = this.currentPlayer === 'black' ? 'white' : 'black';
                } else {
                    // 人机模式下，撤销两步（玩家和 AI 各一步）
                    if (this.moves.length >= 2) {
                        const aiMove = this.moves.pop();
                        this.board[aiMove.row][aiMove.col] = null;
                        const playerMove = this.moves.pop();
                        this.board[playerMove.row][playerMove.col] = null;
                        this.currentPlayer = 'black';
                    } else if (this.moves.length === 1 && this.playerColor === 'black') {
                        const playerMove = this.moves.pop();
                        this.board[playerMove.row][playerMove.col] = null;
                        this.currentPlayer = 'black';
                    }
                }

                this.renderBoard();
                this.updateStatus();
                this.updateHistory();
                this.playSound('undo');
            }

            renderBoard() {
                const boardEl = document.getElementById('board');
                
                // 只初始化一次：创建所有单元格
                if (boardEl.children.length === 0) {
                    for (let i = 0; i < this.boardSize; i++) {
                        for (let j = 0; j < this.boardSize; j++) {
                            const cell = document.createElement('div');
                            cell.className = 'cell';
                            cell.dataset.row = i;
                            cell.dataset.col = j;
                            cell.addEventListener('click', () => this.handleClick(i, j));
                            boardEl.appendChild(cell);
                        }
                    }
                }
                
                // 增量更新：只更新有棋子的单元格
                for (let i = 0; i < this.boardSize; i++) {
                    for (let j = 0; j < this.boardSize; j++) {
                        const cell = boardEl.children[i * this.boardSize + j];
                        const hasPiece = this.board[i][j] !== null;
                        
                        // 更新 has-piece 类
                        cell.classList.toggle('has-piece', hasPiece);
                        
                        // 更新或创建棋子
                        let piece = cell.querySelector('.piece');
                        if (hasPiece) {
                            if (!piece) {
                                piece = document.createElement('div');
                                piece.className = `piece ${this.board[i][j]}`;
                                cell.appendChild(piece);
                            } else {
                                piece.className = `piece ${this.board[i][j]}`;
                            }
                            // 更新 last-move 标记
                            const isLastMove = this.moves.length > 0 && 
                                this.moves[this.moves.length - 1].row === i && 
                                this.moves[this.moves.length - 1].col === j;
                            piece.classList.toggle('last', isLastMove);
                        } else if (piece) {
                            piece.remove();
                        }
                    }
                }
            }

            handleClick(row, col) {
                if (!this.gameActive) return;
                if (this.gameOver) return;
                if (this.board[row][col]) return;

                if (this.mode === 'pve') {
                    if (this.currentPlayer !== this.playerColor) return;
                }

                this.makeMove(row, col);

                if (this.mode === 'pve' && !this.gameOver) {
                    setTimeout(() => this.aiMove(), 300);
                }
            }

            makeMove(row, col) {
                this.board[row][col] = this.currentPlayer;
                this.moves.push({ row, col, player: this.currentPlayer });
                this.renderBoard();
                this.updateHistory();
                this.playSound('place');

                if (this.checkWin(row, col)) {
                    this.gameOver = true;
                    this.updateStatus(`${this.currentPlayer === 'black' ? '黑棋' : '白棋'} 获胜！🎉`);
                    this.highlightWin(row, col);
                    this.playSound('win');
                    return;
                }

                if (this.moves.length === this.boardSize * this.boardSize) {
                    this.gameOver = true;
                    this.updateStatus('平局！🤝');
                    return;
                }

                this.currentPlayer = this.currentPlayer === 'black' ? 'white' : 'black';
                this.updateStatus();
            }

            checkWin(row, col) {
                const player = this.board[row][col];
                const directions = [
                    [[0, 1], [0, -1]],  // 水平
                    [[1, 0], [-1, 0]],  // 垂直
                    [[1, 1], [-1, -1]], // 对角线 \
                    [[1, -1], [-1, 1]]  // 对角线 /
                ];

                for (const [dir1, dir2] of directions) {
                    let count = 1;
                    
                    // 正向搜索
                    let r = row + dir1[0];
                    let c = col + dir1[1];
                    while (r >= 0 && r < this.boardSize && c >= 0 && c < this.boardSize && 
                           this.board[r][c] === player) {
                        count++;
                        r += dir1[0];
                        c += dir1[1];
                    }

                    // 反向搜索
                    r = row + dir2[0];
                    c = col + dir2[1];
                    while (r >= 0 && r < this.boardSize && c >= 0 && c < this.boardSize && 
                           this.board[r][c] === player) {
                        count++;
                        r += dir2[0];
                        c += dir2[1];
                    }

                    if (count >= 5) return true;
                }

                return false;
            }

            highlightWin(row, col) {
                const player = this.board[row][col];
                const directions = [
                    [[0, 1], [0, -1]],
                    [[1, 0], [-1, 0]],
                    [[1, 1], [-1, -1]],
                    [[1, -1], [-1, 1]]
                ];

                for (const [dir1, dir2] of directions) {
                    let pieces = [{ row, col }];
                    
                    let r = row + dir1[0];
                    let c = col + dir1[1];
                    while (r >= 0 && r < this.boardSize && c >= 0 && c < this.boardSize && 
                           this.board[r][c] === player) {
                        pieces.push({ row: r, col: c });
                        r += dir1[0];
                        c += dir1[1];
                    }

                    r = row + dir2[0];
                    c = col + dir2[1];
                    while (r >= 0 && r < this.boardSize && c >= 0 && c < this.boardSize && 
                           this.board[r][c] === player) {
                        pieces.push({ row: r, col: c });
                        r += dir2[0];
                        c += dir2[1];
                    }

                    if (pieces.length >= 5) {
                        this.showWinningLine(pieces);
                        break;
                    }
                }
            }

            showWinningLine(pieces) {
                // 简化版：在 status 显示获胜信息即可
                console.log('Winning pieces:', pieces);
            }

            updateStatus(message) {
                const statusEl = document.getElementById('status');
                if (message) {
                    statusEl.textContent = message;
                    statusEl.className = 'status winner';
                } else if (this.gameOver) {
                    return;
                } else {
                    const playerName = this.currentPlayer === 'black' ? '黑棋' : '白棋';
                    if (this.mode === 'pve') {
                        const isPlayerTurn = this.currentPlayer === this.playerColor;
                        statusEl.textContent = isPlayerTurn ? `你的回合（${playerName}）` : `AI 思考中...`;
                        statusEl.className = 'status ' + (isPlayerTurn ? 'player1' : 'ai');
                    } else {
                        statusEl.textContent = `${playerName} 的回合`;
                        statusEl.className = 'status ' + (this.currentPlayer === 'black' ? 'player1' : 'player2');
                    }
                }
            }

            updateHistory() {
                const historyList = document.getElementById('historyList');
                historyList.innerHTML = '';
                
                this.moves.forEach((move, index) => {
                    const item = document.createElement('div');
                    item.className = 'history-item';
                    const colLetter = String.fromCharCode(65 + move.col);
                    item.textContent = `${index + 1}. ${move.player === 'black' ? '黑' : '白'} ${colLetter}${move.row + 1}`;
                    historyList.appendChild(item);
                });

                historyList.scrollTop = historyList.scrollHeight;
            }

            // AI 逻辑
            aiMove() {
                if (this.gameOver) return;

                const move = this.getBestMove();
                if (move) {
                    this.makeMove(move.row, move.col);
                }
            }
            getBestMove() {
                const availableMoves = this.getAvailableMoves();
                if (availableMoves.length === 0) return null;

                const winNow = this.findWinningMove(this.aiColor, availableMoves);
                if (winNow) return winNow;

                const blockNow = this.findWinningMove(this.playerColor, availableMoves);
                if (blockNow) return blockNow;

                if (this.searchDepth <= 1) {
                    return this.difficulty === 'easy'
                        ? this.easyMove(availableMoves)
                        : this.mediumMove(availableMoves);
                }

                return this.minimaxMove(this.searchDepth, availableMoves).move || this.mediumMove(availableMoves);
            }

            easyMove(availableMoves) {
                const tactical = this.rankCandidateMoves(availableMoves, this.aiColor).slice(0, 5);
                const defendMove = this.findDefendMove();
                if (defendMove && Math.random() < 0.75) return defendMove;
                return tactical[Math.floor(Math.random() * tactical.length)] || availableMoves[0];
            }

            mediumMove(availableMoves) {
                const ordered = this.rankCandidateMoves(availableMoves, this.aiColor);
                const top = ordered.slice(0, 8);
                return top[0] || ordered[0] || availableMoves[0];
            }

            minimaxMove(depth, moves = this.getAvailableMoves(), alpha = -Infinity, beta = Infinity, maximizing = true) {
                const currentColor = maximizing ? this.aiColor : this.playerColor;
                const cacheKey = this.hashBoardState(currentColor, depth, maximizing);
                const cached = this.transpositionTable.get(cacheKey, depth);
                if (cached) return cached;

                if (depth === 0 || moves.length === 0) {
                    const leaf = { score: this.evaluateBoard(), move: null };
                    this.transpositionTable.set(cacheKey, depth, leaf);
                    return leaf;
                }

                let bestMove = moves[0] || null;
                const orderedMoves = BoardGameAI.orderMoves(moves, move => this.evaluateMove(move));
                if (maximizing) {
                    let bestScore = -Infinity;
                    for (const move of orderedMoves) {
                        this.board[move.row][move.col] = this.aiColor;
                        const result = this.minimaxMove(depth - 1, this.getAvailableMoves(), alpha, beta, false);
                        this.board[move.row][move.col] = null;
                        if (result.score > bestScore) {
                            bestScore = result.score;
                            bestMove = move;
                        }
                        alpha = Math.max(alpha, bestScore);
                        if (beta <= alpha) break;
                    }
                    const result = { score: bestScore, move: bestMove };
                    this.transpositionTable.set(cacheKey, depth, result);
                    return result;
                }

                let bestScore = Infinity;
                for (const move of orderedMoves) {
                    this.board[move.row][move.col] = this.playerColor;
                    const result = this.minimaxMove(depth - 1, this.getAvailableMoves(), alpha, beta, true);
                    this.board[move.row][move.col] = null;
                    if (result.score < bestScore) {
                        bestScore = result.score;
                        bestMove = move;
                    }
                    beta = Math.min(beta, bestScore);
                    if (beta <= alpha) break;
                }
                const result = { score: bestScore, move: bestMove };
                this.transpositionTable.set(cacheKey, depth, result);
                return result;
            }

            findWinningMove(player, availableMoves) {
                for (const move of availableMoves) {
                    this.board[move.row][move.col] = player;
                    const win = this.checkWin(move.row, move.col);
                    this.board[move.row][move.col] = null;
                    if (win) return move;
                }
                return null;
            }

            scoreMove(move, player) {
                this.board[move.row][move.col] = player;
                const score = this.evaluatePosition(move.row, move.col, player) + this.scoreThreats(move.row, move.col, player);
                this.board[move.row][move.col] = null;
                return score;
            }

            scoreCenter(move) {
                const center = (this.boardSize - 1) / 2;
                return BoardGameAI.centerBias(move.row, move.col, center, center);
            }

            scoreDefense(move) {
                this.board[move.row][move.col] = this.playerColor;
                const score = this.evaluatePosition(move.row, move.col, this.playerColor) * 1.25;
                this.board[move.row][move.col] = null;
                return score;
            }

            evaluateMove(move) {
                return this.scoreMove(move, this.aiColor) + this.scoreCenter(move) + this.scoreDefense(move);
            }

            scoreThreats(row, col, player) {
                const lines = [
                    [[1, 0], [-1, 0]],
                    [[0, 1], [0, -1]],
                    [[1, 1], [-1, -1]],
                    [[1, -1], [-1, 1]]
                ];
                let score = 0;
                for (const [a, b] of lines) {
                    const [dr1, dc1] = a;
                    const [dr2, dc2] = b;
                    const count1 = this.countLine(row, col, dr1, dc1, player);
                    const count2 = this.countLine(row, col, dr2, dc2, player);
                    const total = count1 + count2 + 1;
                    const open1 = this.isOpenEnd(row, col, dr1, dc1, count1, player);
                    const open2 = this.isOpenEnd(row, col, dr2, dc2, count2, player);
                    if (total >= 5) score += 100000;
                    else if (total === 4 && open1 && open2) score += 12000;
                    else if (total === 4) score += 4000;
                    else if (total === 3 && open1 && open2) score += 2200;
                    else if (total === 3) score += 900;
                    else if (total === 2 && open1 && open2) score += 220;
                }
                return score;
            }

            countLine(row, col, dr, dc, player) {
                let count = 0;
                let r = row + dr;
                let c = col + dc;
                while (r >= 0 && r < this.boardSize && c >= 0 && c < this.boardSize && this.board[r][c] === player) {
                    count++;
                    r += dr;
                    c += dc;
                }
                return count;
            }

            isOpenEnd(row, col, dr, dc, distance, player) {
                const r = row + dr * (distance + 1);
                const c = col + dc * (distance + 1);
                return r >= 0 && r < this.boardSize && c >= 0 && c < this.boardSize && !this.board[r][c];
            }

            rankCandidateMoves(availableMoves, player) {
                return BoardGameAI.orderMoves(availableMoves, move => {
                    this.board[move.row][move.col] = player;
                    const score = this.scoreMove(move, player) + this.scoreCenter(move);
                    this.board[move.row][move.col] = null;
                    return score;
                });
            }

            evaluateBoard() {
                let score = 0;
                for (let i = 0; i < this.boardSize; i++) {
                    for (let j = 0; j < this.boardSize; j++) {
                        if (this.board[i][j] === this.aiColor) {
                            score += this.evaluatePosition(i, j, this.aiColor);
                        } else if (this.board[i][j] === this.playerColor) {
                            score -= this.evaluatePosition(i, j, this.playerColor) * 1.05;
                        }
                    }
                }
                return score;
            }

            getAvailableMoves() {
                const moves = [];
                let hasStone = false;
                for (let i = 0; i < this.boardSize; i++) {
                    for (let j = 0; j < this.boardSize; j++) {
                        if (this.board[i][j] !== null) {
                            hasStone = true;
                            continue;
                        }
                        if (!hasStone || this.hasNeighbor(i, j)) moves.push({ row: i, col: j });
                    }
                }
                if (moves.length === 0) return [{ row: 7, col: 7 }];
                return moves;
            }

            hasNeighbor(row, col) {
                const directions = [
                    [-1, -1], [-1, 0], [-1, 1],
                    [0, -1],           [0, 1],
                    [1, -1],  [1, 0],  [1, 1]
                ];

                for (const [dr, dc] of directions) {
                    const r = row + dr;
                    const c = col + dc;
                    if (r >= 0 && r < this.boardSize && c >= 0 && c < this.boardSize) {
                        if (this.board[r][c]) return true;
                    }
                }
                return false;
            }

            findDefendMove() {
                const moves = this.getAvailableMoves();
                return this.findWinningMove(this.playerColor, moves);
            }

            hashBoardState(currentColor, depth, maximizing) {
                const boardHash = BoardGameAI.hashBoard(this.board, cell => {
                    if (!cell) return '.';
                    return cell === 'black' ? 'b' : 'w';
                });
                return `${boardHash}|${currentColor}|${depth}|${maximizing ? 'max' : 'min'}`;
            }

            evaluatePosition(row, col, player) {
                const directions = [
                    [[0, 1], [0, -1]],
                    [[1, 0], [-1, 0]],
                    [[1, 1], [-1, -1]],
                    [[1, -1], [-1, 1]]
                ];

                let score = 0;
                for (const [dir1, dir2] of directions) {
                    const count1 = this.countLine(row, col, dir1[0], dir1[1], player);
                    const count2 = this.countLine(row, col, dir2[0], dir2[1], player);
                    const total = count1 + count2 + 1;
                    const open1 = this.isOpenEnd(row, col, dir1[0], dir1[1], count1, player);
                    const open2 = this.isOpenEnd(row, col, dir2[0], dir2[1], count2, player);
                    const openEnds = (open1 ? 1 : 0) + (open2 ? 1 : 0);
                    score += BoardGameAI.scorePattern(total, openEnds, {
                        '5:0': 100000,
                        '5:1': 100000,
                        '5:2': 100000,
                        '4:2': 15000,
                        '4:1': 5000,
                        '3:2': 1800,
                        '3:1': 500,
                        '2:2': 120,
                        '2:1': 40,
                        '1:0': 8,
                        '1:1': 8,
                        '1:2': 8
                    });
                }

                return score;
            }
        }

        const game = new Gomoku();
        game.applyDifficultyPreset();
        game.updateAiControls();
        game.renderBoard();
