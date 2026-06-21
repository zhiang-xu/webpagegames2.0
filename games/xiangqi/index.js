        const pageAudio = window.GamePageUI.mount({ home: false, sound: true, muted: false });

        // 中国象棋游戏核心逻辑
        class Xiangqi {
            constructor() {
                this.boardSize = { cols: 9, rows: 10 };
                this.board = [];
                this.currentPlayer = 'red';
                this.gameOver = false;
                this.moves = [];
                this.mode = 'pvp';
                this.difficulty = 'medium';
                this.searchDepth = 2;
                this.playerColor = 'red';
                this.aiColor = 'black';
                this.selectedPiece = null;
                this.gameActive = false;
                this.transpositionTable = BoardGameAI.createTranspositionTable(40000);
                
                this.initBoard();
                this.setupEventListeners();
            }

            initBoard() {
                // 初始化棋盘 - 标准象棋布局
                this.board = Array(10).fill(null).map(() => Array(9).fill(null));
                
                // 红方棋子（下方）- 使用标准象棋汉字：帅、仕、相、车、马、炮、兵
                const redPieces = [
                    { row: 9, col: 0, type: '车' }, { row: 9, col: 1, type: '马' },
                    { row: 9, col: 2, type: '相' }, { row: 9, col: 3, type: '仕' },
                    { row: 9, col: 4, type: '帅' }, { row: 9, col: 5, type: '仕' },
                    { row: 9, col: 6, type: '相' }, { row: 9, col: 7, type: '马' },
                    { row: 9, col: 8, type: '车' },
                    { row: 7, col: 1, type: '炮' }, { row: 7, col: 7, type: '炮' },
                    { row: 6, col: 0, type: '兵' }, { row: 6, col: 2, type: '兵' },
                    { row: 6, col: 4, type: '兵' }, { row: 6, col: 6, type: '兵' },
                    { row: 6, col: 8, type: '兵' }
                ];

                // 黑方棋子（上方）- 使用标准象棋汉字：将、士、象、车、马、炮、卒
                const blackPieces = [
                    { row: 0, col: 0, type: '车' }, { row: 0, col: 1, type: '马' },
                    { row: 0, col: 2, type: '象' }, { row: 0, col: 3, type: '士' },
                    { row: 0, col: 4, type: '将' }, { row: 0, col: 5, type: '士' },
                    { row: 0, col: 6, type: '象' }, { row: 0, col: 7, type: '马' },
                    { row: 0, col: 8, type: '车' },
                    { row: 2, col: 1, type: '炮' }, { row: 2, col: 7, type: '炮' },
                    { row: 3, col: 0, type: '卒' }, { row: 3, col: 2, type: '卒' },
                    { row: 3, col: 4, type: '卒' }, { row: 3, col: 6, type: '卒' },
                    { row: 3, col: 8, type: '卒' }
                ];

                redPieces.forEach(p => {
                    this.board[p.row][p.col] = { type: p.type, color: 'red' };
                });

                blackPieces.forEach(p => {
                    this.board[p.row][p.col] = { type: p.type, color: 'black' };
                });
            }

            setupEventListeners() {
                document.getElementById('gameMode').addEventListener('change', (e) => {
                    this.mode = e.target.value;
                    this.updateAiControls();
                    pageAudio.play('tap');
                });

                document.getElementById('difficulty').addEventListener('change', (e) => {
                    this.difficulty = e.target.value;
                    this.applyDifficultyPreset();
                    pageAudio.play('tap');
                });

                document.getElementById('playerColor').addEventListener('change', (e) => {
                    this.playerColor = e.target.value;
                    this.aiColor = this.playerColor === 'red' ? 'black' : 'red';
                    pageAudio.play('tap');
                });
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

            start() {
                this.initBoard();
                this.currentPlayer = 'red';
                this.gameOver = false;
                this.gameActive = true;
                this.moves = [];
                this.selectedPiece = null;
                this.transpositionTable.clear();
                this.renderBoard();
                this.updateStatus();
                this.updateHistory();
                pageAudio.play('start');

                if (this.mode === 'pve' && this.playerColor === 'black') {
                    setTimeout(() => this.aiMove(), 500);
                }
            }

            reset() {
                this.initBoard();
                this.currentPlayer = 'red';
                this.gameOver = false;
                this.moves = [];
                this.selectedPiece = null;
                this.transpositionTable.clear();
                this.renderBoard();
                this.updateStatus('请选择游戏模式开始');
                this.updateHistory();
            }

            undo() {
                if (this.moves.length === 0) return;

                this.gameOver = false;

                if (this.mode === 'pvp') {
                    this.restoreMove(this.moves.pop());
                } else {
                    const stepsToUndo = this.currentPlayer === this.playerColor
                        ? Math.min(2, this.moves.length)
                        : 1;

                    for (let i = 0; i < stepsToUndo; i++) {
                        this.restoreMove(this.moves.pop());
                    }
                }

                this.selectedPiece = null;
                this.renderBoard();
                this.updateStatus();
                this.updateHistory();
            }

            restoreMove(move) {
                if (!move) return;

                this.board[move.fromRow][move.fromCol] = { ...move.piece };
                this.board[move.toRow][move.toCol] = move.captured ? { ...move.captured } : null;
                this.currentPlayer = move.piece.color;
            }

            renderBoard() {
                const grid = document.getElementById('grid');
                const markers = document.getElementById('moveMarkers');
                grid.innerHTML = '';
                markers.innerHTML = '';

                for (let row = 0; row < 10; row++) {
                    for (let col = 0; col < 9; col++) {
                        const cell = document.createElement('div');
                        cell.className = 'cell';
                        cell.dataset.row = row;
                        cell.dataset.col = col;
                        cell.addEventListener('click', () => this.handleClick(row, col));
                        grid.appendChild(cell);

                        if (this.board[row][col]) {
                            const piece = document.createElement('div');
                            piece.className = `piece ${this.board[row][col].color}`;
                            piece.textContent = this.board[row][col].type;
                            
                            if (this.selectedPiece && 
                                this.selectedPiece.row === row && 
                                this.selectedPiece.col === col) {
                                piece.classList.add('selected');
                            }
                            
                            if (this.moves.length > 0) {
                                const lastMove = this.moves[this.moves.length - 1];
                                if ((lastMove.fromRow === row && lastMove.fromCol === col) ||
                                    (lastMove.toRow === row && lastMove.toCol === col)) {
                                    piece.classList.add('last-move');
                                }
                            }
                            
                            cell.appendChild(piece);
                        }

                    }
                }

                if (this.selectedPiece) {
                    for (let row = 0; row < 10; row++) {
                        for (let col = 0; col < 9; col++) {
                            if (!this.isValidMove(this.selectedPiece.row, this.selectedPiece.col, row, col)) {
                                continue;
                            }

                            const highlight = document.createElement('div');
                            highlight.className = 'highlight';
                            highlight.style.left = `calc((0.5 + ${col}) * var(--board-cell))`;
                            highlight.style.top = `calc((0.5 + ${row}) * var(--board-cell))`;
                            markers.appendChild(highlight);
                        }
                    }
                }
            }

            handleClick(row, col) {
                if (!this.gameActive) return;
                if (this.gameOver) return;

                if (this.mode === 'pve') {
                    if (this.currentPlayer !== this.playerColor) return;
                }

                const piece = this.board[row][col];

                // 选中己方棋子
                if (piece && piece.color === this.currentPlayer) {
                    this.selectedPiece = { row, col };
                    this.renderBoard();
                    pageAudio.play('select');
                    return;
                }

                // 移动棋子
                if (this.selectedPiece) {
                    if (this.isValidMove(this.selectedPiece.row, this.selectedPiece.col, row, col)) {
                        this.makeMove(
                            this.selectedPiece.row, 
                            this.selectedPiece.col, 
                            row, 
                            col
                        );
                        this.selectedPiece = null;
                        this.renderBoard();

                        if (this.mode === 'pve' && !this.gameOver) {
                            setTimeout(() => this.aiMove(), 300);
                        }
                    }
                }
            }

            makeMove(fromRow, fromCol, toRow, toCol) {
                const piece = this.board[fromRow][fromCol];
                const captured = this.board[toRow][toCol];

                // 记录移动
                this.moves.push({
                    fromRow, fromCol, toRow, toCol,
                    piece: { ...piece },
                    captured: captured ? { ...captured } : null
                });

                // 执行移动
                this.board[toRow][toCol] = piece;
                this.board[fromRow][fromCol] = null;

                this.updateHistory();

                // 检查胜负 - 将/帅被吃掉即获胜
                if (captured && (captured.type === '将' || captured.type === '帅')) {
                    this.gameOver = true;
                    pageAudio.play('win');
                    this.updateStatus(`${piece.color === 'red' ? '红方' : '黑方'} 获胜！🎉`);
                    this.updateStatusClass('winner');
                    return;
                }

                pageAudio.play(captured ? 'clear' : 'move');
                this.currentPlayer = this.currentPlayer === 'red' ? 'black' : 'red';
                this.updateStatus();
            }

            isValidMove(fromRow, fromCol, toRow, toCol) {
                if (fromRow === toRow && fromCol === toCol) return false;
                
                const piece = this.board[fromRow][fromCol];
                const target = this.board[toRow][toCol];

                // 不能吃己方棋子
                if (target && target.color === piece.color) return false;

                const dx = toCol - fromCol;
                const dy = toRow - fromRow;

                switch (piece.type) {
                    case '将':
                    case '帅':
                        return this.isValidKingMove(fromRow, fromCol, toRow, toCol, piece.color);
                    case '士':
                    case '仕':
                        return this.isValidAdvisorMove(fromRow, fromCol, toRow, toCol, piece.color);
                    case '象':
                    case '相':
                        return this.isValidElephantMove(fromRow, fromCol, toRow, toCol, piece.color);
                    case '马':
                        return this.isValidHorseMove(fromRow, fromCol, toRow, toCol);
                    case '车':
                        return this.isValidRookMove(fromRow, fromCol, toRow, toCol);
                    case '炮':
                        return this.isValidCannonMove(fromRow, fromCol, toRow, toCol);
                    case '兵':
                    case '卒':
                        return this.isValidPawnMove(fromRow, fromCol, toRow, toCol, piece.color);
                    default:
                        return false;
                }
            }

            isValidKingMove(fromRow, fromCol, toRow, toCol, color) {
                // 将只能在九宫格内移动
                const palaceCols = [3, 4, 5];
                const palaceRows = color === 'red' ? [7, 8, 9] : [0, 1, 2];

                if (!palaceCols.includes(toCol) || !palaceRows.includes(toRow)) return false;
                if (Math.abs(fromRow - toRow) + Math.abs(fromCol - toCol) !== 1) return false;

                return true;
            }

            isValidAdvisorMove(fromRow, fromCol, toRow, toCol, color) {
                // 士走斜线，只能在九宫格内
                const palaceCols = [3, 4, 5];
                const palaceRows = color === 'red' ? [7, 8, 9] : [0, 1, 2];

                if (!palaceCols.includes(toCol) || !palaceRows.includes(toRow)) return false;
                if (Math.abs(fromRow - toRow) !== 1 || Math.abs(fromCol - toCol) !== 1) return false;

                return true;
            }

            isValidElephantMove(fromRow, fromCol, toRow, toCol, color) {
                // 象走田字，不能过河
                if (color === 'red' && toRow < 5) return false;
                if (color === 'black' && toRow > 4) return false;

                if (Math.abs(fromRow - toRow) !== 2 || Math.abs(fromCol - toCol) !== 2) return false;

                // 检查象眼
                const eyeRow = (fromRow + toRow) / 2;
                const eyeCol = (fromCol + toCol) / 2;
                if (this.board[eyeRow][eyeCol]) return false;

                return true;
            }

            isValidHorseMove(fromRow, fromCol, toRow, toCol) {
                // 马走日字
                const dx = Math.abs(fromCol - toCol);
                const dy = Math.abs(fromRow - toRow);

                if ((dx === 1 && dy === 2) || (dx === 2 && dy === 1)) {
                    // 检查蹩马腿
                    if (dx === 2) {
                        const legCol = fromCol + (toCol > fromCol ? 1 : -1);
                        if (this.board[fromRow][legCol]) return false;
                    } else {
                        const legRow = fromRow + (toRow > fromRow ? 1 : -1);
                        if (this.board[legRow][fromCol]) return false;
                    }
                    return true;
                }

                return false;
            }

            isValidRookMove(fromRow, fromCol, toRow, toCol) {
                // 车走直线
                if (fromRow !== toRow && fromCol !== toCol) return false;

                // 检查路径上是否有棋子
                return this.isPathClear(fromRow, fromCol, toRow, toCol);
            }

            isValidCannonMove(fromRow, fromCol, toRow, toCol) {
                // 炮走直线，吃子时需要跳过一个棋子
                if (fromRow !== toRow && fromCol !== toCol) return false;

                const piece = this.board[fromRow][fromCol];
                const target = this.board[toRow][toCol];

                const count = this.countPiecesOnPath(fromRow, fromCol, toRow, toCol);

                if (target) {
                    // 吃子：中间必须有一个棋子
                    return count === 1;
                } else {
                    // 移动：中间不能有棋子
                    return count === 0;
                }
            }

            isValidPawnMove(fromRow, fromCol, toRow, toCol, color) {
                // 兵/卒只能前进，过河后可以横走
                const dx = Math.abs(fromCol - toCol);
                const dy = fromRow - toRow;

                if (color === 'red') {
                    // 红兵只能向上走
                    if (dy < 0) return false;
                    // 未过河只能直行
                    if (fromRow >= 5 && dx > 0) return false;
                } else {
                    // 黑卒只能向下走
                    if (dy > 0) return false;
                    // 未过河只能直行
                    if (fromRow <= 4 && dx > 0) return false;
                }

                // 每次只能走一步
                if (Math.abs(fromRow - toRow) + Math.abs(fromCol - toCol) !== 1) return false;

                return true;
            }

            isPathClear(fromRow, fromCol, toRow, toCol) {
                if (fromRow === toRow) {
                    // 横向
                    const minCol = Math.min(fromCol, toCol);
                    const maxCol = Math.max(fromCol, toCol);
                    for (let col = minCol + 1; col < maxCol; col++) {
                        if (this.board[fromRow][col]) return false;
                    }
                } else {
                    // 纵向
                    const minRow = Math.min(fromRow, toRow);
                    const maxRow = Math.max(fromRow, toRow);
                    for (let row = minRow + 1; row < maxRow; row++) {
                        if (this.board[row][fromCol]) return false;
                    }
                }
                return true;
            }

            countPiecesOnPath(fromRow, fromCol, toRow, toCol) {
                let count = 0;
                if (fromRow === toRow) {
                    const minCol = Math.min(fromCol, toCol);
                    const maxCol = Math.max(fromCol, toCol);
                    for (let col = minCol + 1; col < maxCol; col++) {
                        if (this.board[fromRow][col]) count++;
                    }
                } else {
                    const minRow = Math.min(fromRow, toRow);
                    const maxRow = Math.max(fromRow, toRow);
                    for (let row = minRow + 1; row < maxRow; row++) {
                        if (this.board[row][fromCol]) count++;
                    }
                }
                return count;
            }

            updateStatus(message) {
                const statusEl = document.getElementById('status');
                if (message) {
                    statusEl.textContent = message;
                    this.updateStatusClass('winner');
                } else if (this.gameOver) {
                    return;
                } else {
                    const playerName = this.currentPlayer === 'red' ? '红方' : '黑方';
                    if (this.mode === 'pve') {
                        const isPlayerTurn = this.currentPlayer === this.playerColor;
                        statusEl.textContent = isPlayerTurn ? `你的回合（${playerName}）` : `AI 思考中...`;
                        this.updateStatusClass(isPlayerTurn ? this.playerColor : 'ai');
                    } else {
                        statusEl.textContent = `${playerName} 的回合`;
                        this.updateStatusClass(this.currentPlayer);
                    }
                }
            }

            updateStatusClass(className) {
                const statusEl = document.getElementById('status');
                statusEl.className = 'status ' + className;
            }

            updateHistory() {
                const historyList = document.getElementById('historyList');
                historyList.innerHTML = '';
                
                this.moves.forEach((move, index) => {
                    const item = document.createElement('div');
                    item.className = 'history-item';
                    const fromPos = this.getPositionName(move.fromRow, move.fromCol);
                    const toPos = this.getPositionName(move.toRow, move.toCol);
                    const pieceName = move.piece.type;
                    const colorName = move.piece.color === 'red' ? '红' : '黑';
                    item.textContent = `${index + 1}. ${colorName}${pieceName}${fromPos}→${toPos}`;
                    historyList.appendChild(item);
                });

                historyList.scrollTop = historyList.scrollHeight;
            }

            getPositionName(row, col) {
                const cols = ['一', '二', '三', '四', '五', '六', '七', '八', '九'];
                const rows = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];
                return cols[col] + rows[row];
            }

            // AI 逻辑
            aiMove() {
                if (this.gameOver) return;

                const move = this.getBestMove();
                if (move) {
                    this.makeMove(move.fromRow, move.fromCol, move.toRow, move.toCol);
                    this.renderBoard();
                }
            }

            getBestMove() {
                const winningMove = this.findImmediateWinningMove(this.aiColor);
                if (winningMove) return winningMove;

                switch (this.difficulty) {
                    case 'easy':
                        return this.easyMove();
                    case 'medium':
                        return this.mediumMove();
                    case 'hard':
                    case 'expert':
                        return this.hardMove();
                    default:
                        return this.mediumMove();
                }
            }

            easyMove() {
                // 初级：从较优候选里随机，保留一点变化
                const moves = this.getAllPossibleMoves(this.aiColor);
                
                if (moves.length === 0) return null;

                const safeMoves = moves.filter(move => this.isMoveSafe(move, this.aiColor));
                const candidates = (safeMoves.length > 0 ? safeMoves : moves)
                    .map(move => ({ move, score: this.evaluateMove(move, this.aiColor) }))
                    .sort((a, b) => b.score - a.score)
                    .slice(0, Math.min(6, moves.length));

                return candidates[Math.floor(Math.random() * candidates.length)].move;
            }

            mediumMove() {
                // 中级：浅层搜索 + 战术评分
                const moves = this.orderMoves(this.getAllPossibleMoves(this.aiColor), this.aiColor).slice(0, 16);
                
                if (moves.length === 0) return null;

                let bestScore = -Infinity;
                let bestMove = moves[0];

                for (const move of moves) {
                    const captured = this.applyTemporaryMove(move);
                    const score = this.minimax(Math.max(1, this.searchDepth - 1), false, -Infinity, Infinity).score;
                    this.undoTemporaryMove(move, captured);

                    if (score > bestScore) {
                        bestScore = score;
                        bestMove = move;
                    }
                }

                return bestMove;
            }

            hardMove() {
                // 高级：Alpha-Beta 搜索
                return this.minimax(this.searchDepth, true, -Infinity, Infinity).move;
            }

            getAllPossibleMoves(color) {
                const moves = [];

                for (let row = 0; row < 10; row++) {
                    for (let col = 0; col < 9; col++) {
                        const piece = this.board[row][col];
                        if (piece && piece.color === color) {
                            // 检查所有可能的位置
                            for (let toRow = 0; toRow < 10; toRow++) {
                                for (let toCol = 0; toCol < 9; toCol++) {
                                    if (this.isValidMove(row, col, toRow, toCol)) {
                                        moves.push({ fromRow: row, fromCol: col, toRow, toCol });
                                    }
                                }
                            }
                        }
                    }
                }

                return moves;
            }

            findImmediateWinningMove(color) {
                const targetKing = color === 'red' ? '将' : '帅';
                const moves = this.getAllPossibleMoves(color);
                return moves.find(move => this.board[move.toRow][move.toCol]?.type === targetKing) || null;
            }

            applyTemporaryMove(move) {
                const movingPiece = this.board[move.fromRow][move.fromCol];
                const captured = this.board[move.toRow][move.toCol];
                this.board[move.toRow][move.toCol] = movingPiece;
                this.board[move.fromRow][move.fromCol] = null;
                return captured ? { ...captured } : null;
            }

            undoTemporaryMove(move, captured) {
                this.board[move.fromRow][move.fromCol] = this.board[move.toRow][move.toCol];
                this.board[move.toRow][move.toCol] = captured;
            }

            findKing(color) {
                const kingType = color === 'red' ? '帅' : '将';
                for (let row = 0; row < 10; row++) {
                    for (let col = 0; col < 9; col++) {
                        const piece = this.board[row][col];
                        if (piece && piece.color === color && piece.type === kingType) {
                            return { row, col };
                        }
                    }
                }
                return null;
            }

            canCaptureKing(attackerColor, defenderColor) {
                const kingPos = this.findKing(defenderColor);
                if (!kingPos) return true;

                for (let row = 0; row < 10; row++) {
                    for (let col = 0; col < 9; col++) {
                        const piece = this.board[row][col];
                        if (piece && piece.color === attackerColor) {
                            if (this.isValidMove(row, col, kingPos.row, kingPos.col)) {
                                return true;
                            }
                        }
                    }
                }

                return false;
            }

            isMoveSafe(move, color) {
                const opponent = color === 'red' ? 'black' : 'red';
                const captured = this.applyTemporaryMove(move);
                const safe = !this.canCaptureKing(opponent, color);
                this.undoTemporaryMove(move, captured);
                return safe;
            }

            getPieceValue(type) {
                const pieceValues = {
                    '将': 10000, '帅': 10000,
                    '车': 900,
                    '马': 450,
                    '炮': 420,
                    '象': 220, '相': 220,
                    '士': 200, '仕': 200,
                    '兵': 120, '卒': 120
                };
                return pieceValues[type] || 0;
            }

            getPositionalBonus(piece, row, col) {
                let bonus = 0;
                const centerFileBonus = 4 - Math.abs(4 - col);

                if (piece.type === '兵' || piece.type === '卒') {
                    const advance = piece.color === 'red' ? 9 - row : row;
                    bonus += advance * 14;
                    if ((piece.color === 'red' && row <= 4) || (piece.color === 'black' && row >= 5)) {
                        bonus += 36 + centerFileBonus * 8;
                    }
                } else if (piece.type === '马') {
                    bonus += centerFileBonus * 14;
                } else if (piece.type === '炮') {
                    bonus += centerFileBonus * 10;
                } else if (piece.type === '车') {
                    bonus += centerFileBonus * 8;
                } else if (piece.type === '将' || piece.type === '帅') {
                    bonus += (col === 4 ? 20 : 0);
                }

                return bonus;
            }

            evaluateMove(move, color) {
                const piece = this.board[move.fromRow][move.fromCol];
                const target = this.board[move.toRow][move.toCol];
                const opponent = color === 'red' ? 'black' : 'red';
                let score = 0;

                if (target) {
                    score += this.getPieceValue(target.type) * 10 - this.getPieceValue(piece.type) * 0.4;
                }

                score += this.getPositionalBonus(piece, move.toRow, move.toCol);

                const captured = this.applyTemporaryMove(move);

                if (captured && (captured.type === '将' || captured.type === '帅')) {
                    this.undoTemporaryMove(move, captured);
                    return 999999;
                }

                if (this.canCaptureKing(opponent, color)) {
                    score -= 200000;
                }

                if (this.canCaptureKing(color, opponent)) {
                    score += 1600;
                }

                const movedPiece = this.board[move.toRow][move.toCol];
                if (this.isSquareThreatened(move.toRow, move.toCol, opponent)) {
                    score -= this.getPieceValue(movedPiece.type) * 0.55;
                }

                this.undoTemporaryMove(move, captured);
                return score;
            }

            isSquareThreatened(targetRow, targetCol, attackerColor) {
                for (let row = 0; row < 10; row++) {
                    for (let col = 0; col < 9; col++) {
                        const piece = this.board[row][col];
                        if (piece && piece.color === attackerColor) {
                            if (this.isValidMove(row, col, targetRow, targetCol)) {
                                return true;
                            }
                        }
                    }
                }
                return false;
            }

            orderMoves(moves, color) {
                return BoardGameAI.orderMoves(moves, move => this.evaluateMove(move, color));
            }

            minimax(depth, isMaximizing, alpha = -Infinity, beta = Infinity) {
                const currentColor = isMaximizing ? this.aiColor : this.playerColor;
                const opponentColor = currentColor === 'red' ? 'black' : 'red';
                const cacheKey = this.hashBoardState(currentColor, depth, isMaximizing);
                const cached = this.transpositionTable.get(cacheKey, depth);
                if (cached) return cached;

                if (!this.findKing(this.aiColor)) return { score: -999999, move: null };
                if (!this.findKing(this.playerColor)) return { score: 999999, move: null };

                let moves = this.getAllPossibleMoves(currentColor);
                
                if (depth === 0 || moves.length === 0) {
                    const leaf = { score: this.evaluateBoard(), move: null };
                    this.transpositionTable.set(cacheKey, depth, leaf);
                    return leaf;
                }

                moves = this.orderMoves(moves, currentColor);
                const moveLimit = depth >= 3 ? 18 : 12;
                moves = moves.slice(0, moveLimit);

                if (isMaximizing) {
                    let bestScore = -Infinity;
                    let bestMove = moves[0];

                    for (const move of moves) {
                        const captured = this.applyTemporaryMove(move);
                        let score;

                        if (captured && (captured.type === '将' || captured.type === '帅')) {
                            score = 999999 - (3 - depth);
                        } else if (this.canCaptureKing(opponentColor, currentColor)) {
                            score = -200000;
                        } else {
                            score = this.minimax(depth - 1, false, alpha, beta).score;
                        }

                        this.undoTemporaryMove(move, captured);

                        if (score > bestScore) {
                            bestScore = score;
                            bestMove = move;
                        }

                        alpha = Math.max(alpha, bestScore);
                        if (beta <= alpha) break;
                    }

                    const result = { score: bestScore, move: bestMove };
                    this.transpositionTable.set(cacheKey, depth, result);
                    return result;
                } else {
                    let bestScore = Infinity;

                    for (const move of moves) {
                        const captured = this.applyTemporaryMove(move);
                        let score;

                        if (captured && (captured.type === '将' || captured.type === '帅')) {
                            score = -999999 + (3 - depth);
                        } else if (this.canCaptureKing(opponentColor, currentColor)) {
                            score = 200000;
                        } else {
                            score = this.minimax(depth - 1, true, alpha, beta).score;
                        }

                        this.undoTemporaryMove(move, captured);

                        if (score < bestScore) bestScore = score;

                        beta = Math.min(beta, bestScore);
                        if (beta <= alpha) break;
                    }

                    const result = { score: bestScore, move: null };
                    this.transpositionTable.set(cacheKey, depth, result);
                    return result;
                }
            }

            hashBoardState(currentColor, depth, isMaximizing) {
                const boardHash = BoardGameAI.hashBoard(this.board, cell => {
                    if (!cell) return '..';
                    return `${cell.color[0]}${cell.type}`;
                });
                return `${boardHash}|${currentColor}|${depth}|${isMaximizing ? 'max' : 'min'}`;
            }

            evaluateBoard() {
                let score = 0;
                const aiMoves = this.getAllPossibleMoves(this.aiColor).length;
                const playerMoves = this.getAllPossibleMoves(this.playerColor).length;

                for (let row = 0; row < 10; row++) {
                    for (let col = 0; col < 9; col++) {
                        const piece = this.board[row][col];
                        if (piece) {
                            const value = this.getPieceValue(piece.type);
                            const positionBonus = this.getPositionalBonus(piece, row, col);

                            if (piece.color === this.aiColor) {
                                score += value + positionBonus;
                            } else {
                                score -= value + positionBonus;
                            }
                        }
                    }
                }

                score += (aiMoves - playerMoves) * 6;

                if (this.canCaptureKing(this.aiColor, this.playerColor)) score += 1500;
                if (this.canCaptureKing(this.playerColor, this.aiColor)) score -= 1500;

                return score;
            }
        }

        // 初始化游戏
        const game = new Xiangqi();
        game.applyDifficultyPreset();
        game.updateAiControls();
        game.renderBoard();
        game.updateStatus('点击"开始游戏"按钮开始');

        // 统一工具栏：返回主页 + 音效开关
        GamePageUI.mount({ home: true, sound: true }, 'bar');
