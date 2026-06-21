        const pageAudio = window.GamePageUI.mount({ home: true, sound: true, muted: false });
        // ============ 棋子定义 ============
        const PIECES = {
            'commander': { name: '司令', rank: 10, symbol: '司' },
            'general': { name: '军长', rank: 9, symbol: '军' },
            'division': { name: '师长', rank: 8, symbol: '师' },
            'brigade': { name: '旅长', rank: 7, symbol: '旅' },
            'regiment': { name: '团长', rank: 6, symbol: '团' },
            'battalion': { name: '营长', rank: 5, symbol: '营' },
            'company': { name: '连长', rank: 4, symbol: '连' },
            'platoon': { name: '排长', rank: 3, symbol: '排' },
            'sapper': { name: '工兵', rank: 2, symbol: '工' },
            'bomb': { name: '炸弹', rank: 99, symbol: '炸' },
            'mine': { name: '地雷', rank: 0, symbol: '雷' },
            'flag': { name: '军旗', rank: 1, symbol: '旗' }
        };

        // ============ 棋盘布局 ============
        // 10行 x 12列
        // 地形标记
        const TERRAIN = {
            EMPTY: 0,
            RAILWAY: 1,    // 铁路（工兵飞）
            HIGHWAY: 2,    // 公路
            RIVER: 3,      // 河流（工兵可过）
            TRAP: 4,       // 陷阱
            BASE: 5,       // 大本营
            FLAG_BASE: 6   // 军旗大本营
        };

        // 棋盘地形布局
        const boardLayout = [
            // 行0-4: 红方区域
            [0,1,1,1,1,1,1,1,1,1,1,0],  // 铁路
            [1,1,1,1,1,1,1,1,1,1,1,1],  // 铁路
            [2,2,2,2,2,2,2,2,2,2,2,2],  // 公路
            [1,1,1,1,1,3,3,1,1,1,1,1],  // 铁路+河流
            [2,2,2,2,2,2,2,2,2,2,2,2],  // 公路
            // 行5-9: 蓝方区域
            [2,2,2,2,2,2,2,2,2,2,2,2],  // 公路
            [1,1,1,1,1,3,3,1,1,1,1,1],  // 铁路+河流
            [2,2,2,2,2,2,2,2,2,2,2,2],  // 公路
            [1,1,1,1,1,1,1,1,1,1,1,1],  // 铁路
            [0,1,1,1,1,1,1,1,1,1,1,0],  // 铁路
        ];

        // 大本营位置
        const BASES = [
            { r: 0, c: 0 }, { r: 0, c: 11 },
            { r: 9, c: 0 }, { r: 9, c: 11 },
            { r: 4, c: 5 }, { r: 4, c: 6 },
            { r: 5, c: 5 }, { r: 5, c: 6 }
        ];

        // 陷阱位置
        const TRAPS = [
            { r: 1, c: 1 }, { r: 1, c: 10 },
            { r: 8, c: 1 }, { r: 8, c: 10 }
        ];

        // 军旗大本营
        const FLAG_BASES = [
            { r: 0, c: 5 }, { r: 0, c: 6 },
            { r: 9, c: 5 }, { r: 9, c: 6 }
        ];

        // ============ 游戏状态 ============
        let board = [];  // 10x12 棋盘
        let pieces = []; // 所有棋子
        let currentTurn = 'red';  // 'red' or 'blue'
        let selectedPiece = null;
        let validMoves = [];
        let gameMode = 'visible';  // 'visible' (明棋) or 'hidden' (暗棋)
        let gameActive = false;
        let log = [];

        const boardEl = document.getElementById('board');
        const turnDisplay = document.getElementById('turnDisplay');
        const modeDisplay = document.getElementById('modeDisplay');
        const logContent = document.getElementById('logContent');
        const victoryOverlay = document.getElementById('victory');
        const winnerText = document.getElementById('winnerText');

        // ============ 初始化 ============
        function newGame() {
            victoryOverlay.classList.remove('show');
            currentTurn = 'red';
            selectedPiece = null;
            validMoves = [];
            gameActive = true;
            pageAudio.play('start');
            log = [];
            updateLog('游戏开始！红方先走');
            updateDisplay();
            renderBoard();
            initPieces();
        }

        function toggleMode() {
            gameMode = gameMode === 'visible' ? 'hidden' : 'visible';
            pageAudio.play('tap');
            modeDisplay.textContent = gameMode === 'visible' ? '明棋' : '暗棋';
            renderBoard();
        }

        function updateDisplay() {
            turnDisplay.textContent = currentTurn === 'red' ? '🔴 红方' : '🔵 蓝方';
            turnDisplay.style.color = currentTurn === 'red' ? '#ff6b6b' : '#74b9ff';
        }

        function updateLog(message) {
            log.unshift(message);
            if (log.length > 20) log.pop();
            logContent.innerHTML = log.map(entry => 
                `<div class="log-entry">${entry}</div>`
            ).join('');
        }

        // ============ 棋子初始化 ============
        function initPieces() {
            board = Array.from({length: 10}, () => Array(12).fill(null));

            // 红方棋子（下方）
            const redPieces = createRedPieces();
            placePieces(redPieces, 'red');

            // 蓝方棋子（上方）
            const bluePieces = createBluePieces();
            placePieces(bluePieces, 'blue');

            pieces = [...redPieces, ...bluePieces];
            renderBoard();
        }

        function createRedPieces() {
            return [
                { id: 'r1', type: 'flag', side: 'red', r: 9, c: 5 },
                { id: 'r2', type: 'bomb', side: 'red', r: 9, c: 4 },
                { id: 'r3', type: 'bomb', side: 'red', r: 9, c: 7 },
                { id: 'r4', type: 'mine', side: 'red', r: 8, c: 2 },
                { id: 'r5', type: 'mine', side: 'red', r: 8, c: 3 },
                { id: 'r6', type: 'mine', side: 'red', r: 8, c: 8 },
                { id: 'r7', type: 'mine', side: 'red', r: 8, c: 9 },
                { id: 'r8', type: 'commander', side: 'red', r: 7, c: 1 },
                { id: 'r9', type: 'general', side: 'red', r: 7, c: 2 },
                { id: 'r10', type: 'division', side: 'red', r: 7, c: 3 },
                { id: 'r11', type: 'brigade', side: 'red', r: 7, c: 4 },
                { id: 'r12', type: 'regiment', side: 'red', r: 7, c: 6 },
                { id: 'r13', type: 'battalion', side: 'red', r: 7, c: 7 },
                { id: 'r14', type: 'company', side: 'red', r: 7, c: 8 },
                { id: 'r15', type: 'platoon', side: 'red', r: 7, c: 9 },
                { id: 'r16', type: 'sapper', side: 'red', r: 6, c: 1 },
                { id: 'r17', type: 'sapper', side: 'red', r: 6, c: 2 },
                { id: 'r18', type: 'sapper', side: 'red', r: 6, c: 9 },
                { id: 'r19', type: 'sapper', side: 'red', r: 6, c: 10 },
                { id: 'r20', type: 'division', side: 'red', r: 0, c: 1 },
                { id: 'r21', type: 'brigade', side: 'red', r: 0, c: 2 },
                { id: 'r22', type: 'regiment', side: 'red', r: 0, c: 3 },
                { id: 'r23', type: 'battalion', side: 'red', r: 0, c: 8 },
                { id: 'r24', type: 'company', side: 'red', r: 0, c: 9 },
                { id: 'r25', type: 'platoon', side: 'red', r: 0, c: 10 }
            ];
        }

        function createBluePieces() {
            return [
                { id: 'b1', type: 'flag', side: 'blue', r: 0, c: 6 },
                { id: 'b2', type: 'bomb', side: 'blue', r: 0, c: 4 },
                { id: 'b3', type: 'bomb', side: 'blue', r: 0, c: 7 },
                { id: 'b4', type: 'mine', side: 'blue', r: 1, c: 2 },
                { id: 'b5', type: 'mine', side: 'blue', r: 1, c: 3 },
                { id: 'b6', type: 'mine', side: 'blue', r: 1, c: 8 },
                { id: 'b7', type: 'mine', side: 'blue', r: 1, c: 9 },
                { id: 'b8', type: 'commander', side: 'blue', r: 2, c: 1 },
                { id: 'b9', type: 'general', side: 'blue', r: 2, c: 2 },
                { id: 'b10', type: 'division', side: 'blue', r: 2, c: 3 },
                { id: 'b11', type: 'brigade', side: 'blue', r: 2, c: 4 },
                { id: 'b12', type: 'regiment', side: 'blue', r: 2, c: 6 },
                { id: 'b13', type: 'battalion', side: 'blue', r: 2, c: 7 },
                { id: 'b14', type: 'company', side: 'blue', r: 2, c: 8 },
                { id: 'b15', type: 'platoon', side: 'blue', r: 2, c: 9 },
                { id: 'b16', type: 'sapper', side: 'blue', r: 3, c: 1 },
                { id: 'b17', type: 'sapper', side: 'blue', r: 3, c: 2 },
                { id: 'b18', type: 'sapper', side: 'blue', r: 3, c: 9 },
                { id: 'b19', type: 'sapper', side: 'blue', r: 3, c: 10 },
                { id: 'b20', type: 'division', side: 'blue', r: 9, c: 1 },
                { id: 'b21', type: 'brigade', side: 'blue', r: 9, c: 2 },
                { id: 'b22', type: 'regiment', side: 'blue', r: 9, c: 3 },
                { id: 'b23', type: 'battalion', side: 'blue', r: 9, c: 8 },
                { id: 'b24', type: 'company', side: 'blue', r: 9, c: 9 },
                { id: 'b25', type: 'platoon', side: 'blue', r: 9, c: 10 }
            ];
        }

        function placePieces(pieceList, side) {
            pieceList.forEach(p => {
                board[p.r][p.c] = p;
            });
        }

        // ============ 渲染 ============
        function renderBoard() {
            boardEl.innerHTML = '';

            for (let r = 0; r < 10; r++) {
                for (let c = 0; c < 12; c++) {
                    const cell = document.createElement('div');
                    cell.className = 'cell';
                    cell.dataset.r = r;
                    cell.dataset.c = c;

                    // 地形
                    const terrain = getTerrain(r, c);
                    if (terrain === TERRAIN.RIVER) cell.classList.add('terrain-river');
                    else if (terrain === TERRAIN.RAILWAY) cell.classList.add('terrain-railway');
                    else if (terrain === TERRAIN.HIGHWAY) cell.classList.add('terrain-highway');
                    else if (terrain === TERRAIN.TRAP) cell.classList.add('terrain-trap');
                    else if (terrain === TERRAIN.BASE) cell.classList.add('terrain-base');
                    else if (terrain === TERRAIN.FLAG_BASE) cell.classList.add('terrain-flag');

                    // 棋子
                    const piece = board[r][c];
                    if (piece) {
                        const pieceEl = createPieceElement(piece);
                        cell.appendChild(pieceEl);
                    }

                    // 选中高亮
                    if (selectedPiece && selectedPiece.r === r && selectedPiece.c === c) {
                        cell.classList.add('selected');
                    }

                    // 可行走位置高亮
                    if (validMoves.some(m => m.r === r && m.c === c)) {
                        const target = board[r][c];
                        if (!target) {
                            cell.classList.add('valid-move');
                        } else if (target.side !== currentTurn) {
                            cell.classList.add('valid-capture');
                        }
                    }

                    cell.addEventListener('click', () => handleCellClick(r, c));
                    boardEl.appendChild(cell);
                }
            }
        }

        function createPieceElement(piece) {
            const el = document.createElement('div');
            el.className = `piece ${piece.side}`;

            // 暗棋模式
            if (gameMode === 'hidden' && piece.side !== currentTurn) {
                el.classList.add('back');
            } else {
                el.dataset.rank = PIECES[piece.type].rank;
                const span = document.createElement('span');
                span.textContent = PIECES[piece.type].symbol;
                el.appendChild(span);
            }

            if (selectedPiece && selectedPiece.r === piece.r && selectedPiece.c === piece.c) {
                el.classList.add('selected');
            }

            return el;
        }

        // ============ 地形判断 ============
        function getTerrain(r, c) {
            // 大本营
            if (BASES.some(b => b.r === r && b.c === c)) {
                if (FLAG_BASES.some(f => f.r === r && f.c === c)) return TERRAIN.FLAG_BASE;
                return TERRAIN.BASE;
            }
            // 陷阱
            if (TRAPS.some(t => t.r === r && t.c === c)) return TERRAIN.TRAP;
            // 河流
            if (r === 3 || r === 6) {
                if (c >= 5 && c <= 6) return TERRAIN.RIVER;
            }
            // 铁路
            if (r === 0 || r === 1 || r === 8 || r === 9) return TERRAIN.RAILWAY;
            // 公路
            return TERRAIN.HIGHWAY;
        }

        function canMoveThrough(r1, c1, r2, c2, piece) {
            const terrain = getTerrain(r2, c2);

            // 工兵可以过河流
            if (terrain === TERRAIN.RIVER && piece.type !== 'sapper') {
                return false;
            }

            // 不能进入陷阱（除非是工兵）
            // 实际上陷阱只是降低防御，不是不能进入

            return true;
        }

        function isRailway(r, c) {
            return r === 0 || r === 1 || r === 8 || r === 9 || c === 0 || c === 11;
        }

        // ============ 移动规则 ============
        function getValidMoves(piece) {
            const moves = [];
            const { r, c, type, side } = piece;
            const isSapper = type === 'sapper';

            // 检查所有方向
            const directions = [
                { dr: -1, dc: 0 }, // 上
                { dr: 1, dc: 0 },  // 下
                { dr: 0, dc: -1 }, // 左
                { dr: 0, dc: 1 }   // 右
            ];

            for (const { dr, dc } of directions) {
                let nr = r + dr;
                let nc = c + dc;

                // 工兵飞棋（铁路）
                if (isSapper && isRailway(r, c)) {
                    while (nr >= 0 && nr < 10 && nc >= 0 && nc < 12) {
                        const target = board[nr][nc];
                        const terrain = getTerrain(nr, nc);

                        // 河流阻挡
                        if (terrain === TERRAIN.RIVER) break;

                        if (!target) {
                            moves.push({ r: nr, c: nc });
                        } else if (target.side !== side) {
                            moves.push({ r: nr, c: nc, capture: true });
                            break;
                        } else {
                            break;
                        }

                        nr += dr;
                        nc += dc;
                    }
                } else {
                    // 普通移动
                    if (nr >= 0 && nr < 10 && nc >= 0 && nc < 12) {
                        const target = board[nr][nc];
                        if (!target || target.side !== side) {
                            if (canMoveThrough(r, c, nr, nc, piece)) {
                                moves.push({ r: nr, c: nc, capture: !!target });
                            }
                        }
                    }
                }
            }

            return moves;
        }

        // ============ 战斗逻辑 ============
        function comparePieces(attacker, defender) {
            const atkType = attacker.type;
            const defType = defender.type;

            // 炸弹
            if (atkType === 'bomb' || defType === 'bomb') {
                return 'draw'; // 同归于尽
            }

            // 地雷
            if (defType === 'mine') {
                if (atkType === 'sapper') return 'win'; // 工兵挖雷
                if (atkType === 'bomb') return 'draw';  // 炸弹炸雷
                return 'lose'; // 其他都被雷挡住
            }

            if (atkType === 'mine') {
                return 'lose'; // 地雷不会主动攻击
            }

            // 军旗
            if (defType === 'flag') {
                return 'win'; // 任何棋子都可以占领军旗
            }

            // 等级比较
            const atkRank = PIECES[atkType].rank;
            const defRank = PIECES[defType].rank;

            if (atkRank > defRank) return 'win';
            if (atkRank < defRank) return 'lose';
            return 'draw'; // 同级同归于尽
        }

        function handleCellClick(r, c) {
            if (!gameActive) return;

            const piece = board[r][c];

            // 选择己方棋子
            if (piece && piece.side === currentTurn) {
                selectedPiece = { r, c, ...piece };
                validMoves = getValidMoves(selectedPiece);
                pageAudio.play('select');
                renderBoard();
                return;
            }

            // 移动或攻击
            if (selectedPiece) {
                const move = validMoves.find(m => m.r === r && m.c === c);
                if (move) {
                    executeMove(selectedPiece, r, c, move.capture);
                }
            }
        }

        function executeMove(from, toR, toC, isCapture) {
            const target = board[toR][toC];

            if (isCapture && target) {
                // 战斗
                const result = comparePieces(from, target);
                const fromPiece = pieces.find(p => p.id === from.id);

                if (result === 'win') {
                    // 胜利
                    board[toR][toC] = fromPiece;
                    board[from.r][from.c] = null;
                    fromPiece.r = toR;
                    fromPiece.c = toC;
                    pageAudio.play('clear');

                    // 移除被吃掉的棋子
                    const idx = pieces.findIndex(p => p.id === target.id);
                    if (idx !== -1) pieces.splice(idx, 1);

                    updateLog(`${fromPiece.side === 'red' ? '🔴' : '🔵'} ${PIECES[fromPiece.type].name} 吃掉 ${PIECES[target.type].name}`);

                    // 检查是否占领军旗
                    if (target.type === 'flag') {
                        endGame(fromPiece.side);
                        return;
                    }
                } else if (result === 'lose') {
                    // 失败
                    board[from.r][from.c] = null;
                    pageAudio.play('error');
                    const idx = pieces.findIndex(p => p.id === fromPiece.id);
                    if (idx !== -1) pieces.splice(idx, 1);

                    updateLog(`${fromPiece.side === 'red' ? '🔴' : '🔵'} ${PIECES[fromPiece.type].name} 被 ${PIECES[target.type].name} 吃掉`);
                } else {
                    // 同归于尽
                    board[from.r][from.c] = null;
                    board[toR][toC] = null;
                    pageAudio.play('clear');

                    const fromIdx = pieces.findIndex(p => p.id === fromPiece.id);
                    if (fromIdx !== -1) pieces.splice(fromIdx, 1);

                    const targetIdx = pieces.findIndex(p => p.id === target.id);
                    if (targetIdx !== -1) pieces.splice(targetIdx, 1);

                    updateLog(`${PIECES[fromPiece.type].name} 与 ${PIECES[target.type].name} 同归于尽`);
                }
            } else {
                // 普通移动
                const fromPiece = pieces.find(p => p.id === from.id);
                board[from.r][from.c] = null;
                board[toR][toC] = fromPiece;
                fromPiece.r = toR;
                fromPiece.c = toC;
                pageAudio.play('move');

                const terrain = getTerrain(toR, toC);
                const terrainName = terrain === TERRAIN.RIVER ? '河流' :
                                   terrain === TERRAIN.TRAP ? '陷阱' :
                                   terrain === TERRAIN.BASE ? '大本营' :
                                   terrain === TERRAIN.FLAG_BASE ? '军旗大本营' : '公路';
                updateLog(`${fromPiece.side === 'red' ? '🔴' : '🔵'} ${PIECES[fromPiece.type].name} 移动到 (${toR+1},${String.fromCharCode(97+toC)}) ${terrainName}`);
            }

            // 切换回合
            currentTurn = currentTurn === 'red' ? 'blue' : 'red';
            selectedPiece = null;
            validMoves = [];
            updateDisplay();
            renderBoard();
        }

        function endGame(winner) {
            gameActive = false;
            winnerText.textContent = winner === 'red' ? '🔴 红方获胜!' : '🔵 蓝方获胜!';
            winnerText.className = 'winner ' + winner;
            victoryOverlay.classList.add('show');
            pageAudio.play('win');
            updateLog(`游戏结束！${winner === 'red' ? '红方' : '蓝方'}获胜！`);
        }

        // 初始化
        newGame();
