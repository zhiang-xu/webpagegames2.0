    const ROWS = 9;
    const COLS = 7;
    const PIECES = {
      elephant: { name: '\u8c61', rank: 8, value: 800, avatar: 'elephant' },
      lion: { name: '\u72ee', rank: 7, value: 700, avatar: 'lion' },
      tiger: { name: '\u864e', rank: 6, value: 600, avatar: 'tiger' },
      leopard: { name: '\u8c79', rank: 5, value: 500, avatar: 'leopard' },
      wolf: { name: '\u72fc', rank: 4, value: 400, avatar: 'wolf' },
      dog: { name: '\u72d7', rank: 3, value: 300, avatar: 'dog' },
      cat: { name: '\u732b', rank: 2, value: 200, avatar: 'cat' },
      rat: { name: '\u9f20', rank: 1, value: 100, avatar: 'rat' }
    };

    const AVATARS = {
      elephant: `
        <svg viewBox="0 0 64 64" aria-hidden="true">
          <g stroke="#4e3326" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="32" cy="34" r="20" fill="#9fd0e8"/>
            <ellipse cx="18" cy="31" rx="8" ry="11" fill="#c9ebf8"/>
            <ellipse cx="46" cy="31" rx="8" ry="11" fill="#c9ebf8"/>
            <circle cx="32" cy="35" r="14" fill="#dff5fb"/>
            <circle cx="27" cy="33" r="1.8" fill="#4e3326" stroke="none"/>
            <circle cx="37" cy="33" r="1.8" fill="#4e3326" stroke="none"/>
            <path d="M28 39c2 2 6 2 8 0" fill="none"/>
            <path d="M31 40c-1 4-2 7-1 10" fill="none"/>
            <path d="M34 40c1 4 2 7 1 10" fill="none"/>
            <path d="M30 52c2 1 3 1 4 0" fill="none"/>
            <circle cx="26" cy="41" r="2.1" fill="#ffcccf" stroke="none" opacity=".8"/>
            <circle cx="38" cy="41" r="2.1" fill="#ffcccf" stroke="none" opacity=".8"/>
          </g>
        </svg>`,
      lion: `
        <svg viewBox="0 0 64 64" aria-hidden="true">
          <g stroke="#533018" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="32" cy="31" r="22" fill="#f59b2f"/>
            <circle cx="32" cy="34" r="14" fill="#ffe8bf"/>
            <path d="M18 19c3-6 9-9 14-8" fill="none"/>
            <path d="M46 19c-3-6-9-9-14-8" fill="none"/>
            <circle cx="27" cy="33" r="1.8" fill="#533018" stroke="none"/>
            <circle cx="37" cy="33" r="1.8" fill="#533018" stroke="none"/>
            <path d="M29 39c2 2 4 2 6 0" fill="none"/>
            <path d="M32 38v3" fill="none"/>
            <circle cx="24" cy="38" r="2.2" fill="#ffcf9f" stroke="none"/>
            <circle cx="40" cy="38" r="2.2" fill="#ffcf9f" stroke="none"/>
          </g>
        </svg>`,
      tiger: `
        <svg viewBox="0 0 64 64" aria-hidden="true">
          <g stroke="#4d2e17" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="32" cy="33" r="19.5" fill="#ffa733"/>
            <path d="M21 20l4 6 7-7 7 7 4-6" fill="#ffba50"/>
            <circle cx="32" cy="36" r="13.2" fill="#fff2d4"/>
            <path d="M24 28l4 3M40 28l-4 3" fill="none"/>
            <path d="M24 30l4 2M40 30l-4 2M25 35h14M25 40h14" fill="none"/>
            <circle cx="27" cy="34" r="1.8" fill="#4d2e17" stroke="none"/>
            <circle cx="37" cy="34" r="1.8" fill="#4d2e17" stroke="none"/>
            <path d="M29 40c2 2 4 2 6 0" fill="none"/>
            <circle cx="26" cy="39" r="2.1" fill="#ffcf9f" stroke="none"/>
            <circle cx="38" cy="39" r="2.1" fill="#ffcf9f" stroke="none"/>
          </g>
        </svg>`,
      leopard: `
        <svg viewBox="0 0 64 64" aria-hidden="true">
          <g stroke="#533118" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="32" cy="34" r="19" fill="#f5c35a"/>
            <circle cx="32" cy="36" r="13.5" fill="#fff5da"/>
            <circle cx="22" cy="24" r="3.2" fill="#d89a33"/>
            <circle cx="42" cy="24" r="3.2" fill="#d89a33"/>
            <circle cx="24" cy="32" r="2.6" fill="#8a5a19" stroke="none"/>
            <circle cx="40" cy="30" r="2.6" fill="#8a5a19" stroke="none"/>
            <circle cx="47" cy="37" r="2.6" fill="#8a5a19" stroke="none"/>
            <circle cx="20" cy="39" r="2.4" fill="#8a5a19" stroke="none"/>
            <circle cx="30" cy="28" r="1.6" fill="#533118" stroke="none"/>
            <circle cx="34" cy="28" r="1.6" fill="#533118" stroke="none"/>
            <path d="M29 39c2 2 4 2 6 0" fill="none"/>
            <circle cx="26" cy="37" r="2" fill="#ffe0a6" stroke="none" opacity=".75"/>
            <circle cx="38" cy="37" r="2" fill="#ffe0a6" stroke="none" opacity=".75"/>
          </g>
        </svg>`,
      wolf: `
        <svg viewBox="0 0 64 64" aria-hidden="true">
          <g stroke="#4a4f59" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">
            <path d="M18 24l6-8 8 4 8-4 6 8v11c0 8-6 14-14 14s-14-6-14-14V24Z" fill="#9da5b2"/>
            <path d="M20 22l-4-4 2 6M44 22l4-4-2 6" fill="none"/>
            <path d="M25 33h14" fill="none"/>
            <path d="M27 39c3 2 7 2 10 0" fill="none"/>
            <circle cx="26" cy="31" r="1.8" fill="#4a4f59" stroke="none"/>
            <circle cx="38" cy="31" r="1.8" fill="#4a4f59" stroke="none"/>
            <path d="M29 41c1 1 5 1 6 0" fill="none"/>
            <circle cx="24" cy="37" r="2.1" fill="#cdd3dd" stroke="none" opacity=".85"/>
            <circle cx="40" cy="37" r="2.1" fill="#cdd3dd" stroke="none" opacity=".85"/>
          </g>
        </svg>`,
      dog: `
        <svg viewBox="0 0 64 64" aria-hidden="true">
          <g stroke="#4f3423" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="32" cy="34" r="18.5" fill="#d7b08a"/>
            <path d="M18 24c-4 4-5 10-1 15" fill="#c5966b"/>
            <path d="M46 24c4 4 5 10 1 15" fill="#c5966b"/>
            <circle cx="27" cy="33" r="1.8" fill="#4f3423" stroke="none"/>
            <circle cx="37" cy="33" r="1.8" fill="#4f3423" stroke="none"/>
            <ellipse cx="32" cy="38" rx="4" ry="3.2" fill="#7b4e31"/>
            <path d="M29 40c2 2 4 2 6 0" fill="none"/>
            <circle cx="24" cy="38" r="2" fill="#f2d3bf" stroke="none"/>
            <circle cx="40" cy="38" r="2" fill="#f2d3bf" stroke="none"/>
            <path d="M31 41c1 1 2 2 2 4" fill="none"/>
          </g>
        </svg>`,
      cat: `
        <svg viewBox="0 0 64 64" aria-hidden="true">
          <g stroke="#5a3c2e" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="32" cy="34" r="18" fill="#fff2d9"/>
            <path d="M21 20l5 7 6-9 6 9 5-7" fill="#fdeac2"/>
            <circle cx="27" cy="33" r="1.8" fill="#5a3c2e" stroke="none"/>
            <circle cx="37" cy="33" r="1.8" fill="#5a3c2e" stroke="none"/>
            <path d="M29 39c2 2 4 2 6 0" fill="none"/>
            <path d="M24 36l-5 1M24 39l-5 2M40 36l5 1M40 39l5 2" fill="none"/>
            <circle cx="25" cy="38" r="2" fill="#f6cfd2" stroke="none"/>
            <circle cx="39" cy="38" r="2" fill="#f6cfd2" stroke="none"/>
          </g>
        </svg>`,
      rat: `
        <svg viewBox="0 0 64 64" aria-hidden="true">
          <g stroke="#5d5f66" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="32" cy="35" r="16" fill="#bdc4ce"/>
            <circle cx="21" cy="24" r="6" fill="#d8dde5"/>
            <circle cx="43" cy="24" r="6" fill="#d8dde5"/>
            <circle cx="27" cy="34" r="1.8" fill="#5d5f66" stroke="none"/>
            <circle cx="37" cy="34" r="1.8" fill="#5d5f66" stroke="none"/>
            <ellipse cx="32" cy="39" rx="3.2" ry="2.6" fill="#8d6d68"/>
            <path d="M29 41c2 2 4 2 6 0" fill="none"/>
            <path d="M39 41c4 1 6 3 9 7" fill="none"/>
            <circle cx="24" cy="39" r="1.8" fill="#f2d0d0" stroke="none"/>
            <circle cx="40" cy="39" r="1.8" fill="#f2d0d0" stroke="none"/>
          </g>
        </svg>`
    };

    const TEXT = {
      title: '\u6597\u517d\u68cb',
      subtitle: '\u7eaf\u5355\u673a JS \u5b9e\u73b0 \u00b7 \u53cc\u4eba / \u4eba\u673a \u00b7 \u79fb\u52a8\u7aef\u53ef\u73a9',
      modeLabel: '\u6e38\u620f\u6a21\u5f0f',
      difficultyLabel: '\u96be\u5ea6',
      newBtn: '\u65b0\u6e38\u620f',
      undoBtn: '\u60e8\u68cb',
      hintBtn: '\u5207\u6362\u6a21\u5f0f',
      redLabel: '\u7ea2\u65b9',
      blueLabel: '\u84dd\u65b9',
      historyTitle: '\u8d70\u5b50\u8bb0\u5f55',
      overTitle: '\u6e38\u620f\u7ed3\u675f',
      againBtn: '\u518d\u6765\u4e00\u5c40',
      modePvp: '\u53cc\u4eba\u6a21\u5f0f',
      modeAi: '\u4eba\u673a\u6a21\u5f0f',
      easy: '\u521d\u7ea7',
      medium: '\u4e2d\u7ea7',
      hard: '\u9ad8\u7ea7',
      expert: '\u4e13\u5bb6\u7ea7',
      turnRed: '\u4f60\u7684\u56de\u5408',
      turnBlueAi: '\u7535\u8111\u601d\u8003\u4e2d',
      turnBlueHuman: '\u4f60\u7684\u56de\u5408',
      waiting: '\u7b49\u5f85\u5bf9\u624b',
      selectHint: '\u9009\u4e2d\u68cb\u5b50\u540e\uff0c\u7eff\u70b9\u662f\u53ef\u8d70\uff0c\u7ea2\u70b9\u662f\u53ef\u5403',
      redTurnHint: '\u7ea2\u65b9\u56de\u5408',
      blueTurnHint: '\u84dd\u65b9\u56de\u5408',
      blueStall: '\u84dd\u65b9\u65e0\u6cd5\u79fb\u52a8\uff0c\u8f6e\u5230\u7ea2\u65b9',
      redWin: '\u7ea2\u65b9\u83b7\u80dc',
      blueWin: '\u84dd\u65b9\u83b7\u80dc',
      redSide: '\u7ea2\u65b9',
      blueSide: '\u84dd\u65b9'
    };

    class DouShouQiGame {
      constructor() {
        this.gridEl = document.getElementById('grid');
        this.decorEl = document.getElementById('decor');
        this.boardEl = document.getElementById('board');
        this.statusEl = document.getElementById('status');
        this.historyEl = document.getElementById('historyList');
        this.overlayEl = document.getElementById('overlay');
        this.winnerText = document.getElementById('winnerText');
        this.redStatus = document.getElementById('redStatus');
        this.blueStatus = document.getElementById('blueStatus');
        this.redCard = document.getElementById('redCard');
        this.blueCard = document.getElementById('blueCard');
        this.modeSel = document.getElementById('modeSel');
        this.difficultySel = document.getElementById('difficultySel');
        this.difficultyGroup = document.getElementById('difficultyGroup');
        this.ui = GamePageUI.mount({ home: true, sound: true, homeHref: '../../index.html' });
        this.cells = [];
        this.mode = 'ai';
        this.difficulty = 'medium';
        this.currentPlayer = 'red';
        this.selected = null;
        this.validMoves = [];
        this.gameOver = false;
        this.gameActive = false;
        this.turnToken = 0;
        this.history = [];
        this.pieces = [];
        this.terrain = [];
        this.setupText();
        this.buildGrid();
        this.bindEvents();
        this.init();
      }

      setupText() {
        document.title = TEXT.title;
        document.getElementById('title').textContent = TEXT.title;
        document.getElementById('subtitle').textContent = TEXT.subtitle;
        document.getElementById('modeLabel').textContent = TEXT.modeLabel;
        document.getElementById('difficultyLabel').textContent = TEXT.difficultyLabel;
        document.getElementById('newBtn').textContent = TEXT.newBtn;
        document.getElementById('undoBtn').textContent = TEXT.undoBtn;
        document.getElementById('hintBtn').textContent = TEXT.hintBtn;
        document.getElementById('redLabel').textContent = TEXT.redLabel;
        document.getElementById('blueLabel').textContent = TEXT.blueLabel;
        document.getElementById('historyTitle').textContent = TEXT.historyTitle;
        document.getElementById('overTitle').textContent = TEXT.overTitle;
        document.getElementById('againBtn').textContent = TEXT.againBtn;

        this.modeSel.innerHTML = '';
        [
          { value: 'pvp', label: TEXT.modePvp },
          { value: 'ai', label: TEXT.modeAi }
        ].forEach(({ value, label }) => {
          const opt = document.createElement('option');
          opt.value = value;
          opt.textContent = label;
          this.modeSel.appendChild(opt);
        });

        this.difficultySel.innerHTML = '';
        [
          { value: 'easy', label: TEXT.easy },
          { value: 'medium', label: TEXT.medium },
          { value: 'hard', label: TEXT.hard },
          { value: 'expert', label: TEXT.expert }
        ].forEach(({ value, label }) => {
          const opt = document.createElement('option');
          opt.value = value;
          opt.textContent = label;
          this.difficultySel.appendChild(opt);
        });
        this.modeSel.value = this.mode;
        this.difficultySel.value = this.difficulty;
      }

      bindEvents() {
        document.getElementById('newBtn').addEventListener('click', () => this.startGame());
        document.getElementById('undoBtn').addEventListener('click', () => this.undo());
        document.getElementById('hintBtn').addEventListener('click', () => this.toggleMode());
        document.getElementById('againBtn').addEventListener('click', () => this.startGame());
        this.modeSel.addEventListener('change', () => {
          this.mode = this.modeSel.value;
          this.difficultyGroup.style.display = this.mode === 'ai' ? '' : 'none';
          this.init();
        });
        this.difficultySel.addEventListener('change', () => {
          this.difficulty = this.difficultySel.value;
        });
        window.addEventListener('resize', () => this.updateDecor());
      }

      init() {
        this.turnToken += 1;
        this.gameOver = false;
        this.gameActive = false;
        this.currentPlayer = 'red';
        this.selected = null;
        this.validMoves = [];
        this.history = [];
        this.buildTerrain();
        this.buildPieces();
        this.buildDecor();
        this.overlayEl.classList.remove('show');
        this.render();
        this.updateStatus(TEXT.redTurnHint);
        this.difficultyGroup.style.display = this.mode === 'ai' ? '' : 'none';
        this.modeSel.value = this.mode;
        this.difficultySel.value = this.difficulty;
        this.updateTurnLabel();
      }

      startGame() {
        this.turnToken += 1;
        this.gameOver = false;
        this.gameActive = true;
        this.currentPlayer = 'red';
        this.selected = null;
        this.validMoves = [];
        this.history = [];
        this.buildTerrain();
        this.buildPieces();
        this.buildDecor();
        this.overlayEl.classList.remove('show');
        this.render();
        this.updateStatus(TEXT.redTurnHint);
        this.difficultyGroup.style.display = this.mode === 'ai' ? '' : 'none';
        this.modeSel.value = this.mode;
        this.difficultySel.value = this.difficulty;
        this.updateTurnLabel();
        this.ui.play('start');
      }

      buildGrid() {
        this.gridEl.innerHTML = '';
        this.cells = [];
        for (let r = 0; r < ROWS; r++) {
          this.cells[r] = [];
          for (let c = 0; c < COLS; c++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.dataset.row = String(r);
            cell.dataset.col = String(c);
            cell.addEventListener('click', () => this.handleCellClick(r, c));
            this.gridEl.appendChild(cell);
            this.cells[r][c] = cell;
          }
        }
      }

      buildDecor() {
        this.decorEl.innerHTML = '';
      }

      updateDecor() {
        if (this.gridEl.children.length) this.buildDecor();
        this.render();
      }

      buildTerrain() {
        this.terrain = Array.from({ length: ROWS }, () => Array.from({ length: COLS }, () => 'land'));
        const bridgeCols = new Set([0, 3, 6]);
        for (let r = 3; r <= 5; r++) {
          for (let c = 0; c < COLS; c++) {
            this.terrain[r][c] = bridgeCols.has(c) ? 'bridge' : 'river';
          }
        }
        this.terrain[0][3] = 'den-blue';
        this.terrain[8][3] = 'den-red';
        [[0, 2], [0, 4], [1, 3]].forEach(([r, c]) => this.terrain[r][c] = 'trap');
        [[8, 2], [8, 4], [7, 3]].forEach(([r, c]) => this.terrain[r][c] = 'trap');
      }

      buildPieces() {
        const blue = [
          ['lion', 0, 0], ['tiger', 0, 6], ['wolf', 2, 4], ['leopard', 2, 2],
          ['rat', 2, 0], ['elephant', 2, 6], ['cat', 1, 5], ['dog', 1, 1]
        ];
        const red = [
          ['elephant', 6, 0], ['wolf', 6, 2], ['leopard', 6, 4], ['rat', 6, 6],
          ['cat', 7, 1], ['dog', 7, 5], ['tiger', 8, 0], ['lion', 8, 6]
        ];
        this.pieces = [...blue.map(([type, row, col], i) => this.makePiece('blue', type, row, col, i)),
          ...red.map(([type, row, col], i) => this.makePiece('red', type, row, col, i))];
      }

      makePiece(color, type, row, col, i) {
        return {
          id: `${color}-${type}-${i}`,
          color,
          type,
          row,
          col,
          alive: true
        };
      }

      cellSize() {
        return Math.max(32, Math.min(82, Math.round(this.boardEl.getBoundingClientRect().width / COLS)));
      }

      terrainAt(row, col) {
        return this.terrain[row]?.[col] || null;
      }

      isRiver(row, col) {
        return this.terrainAt(row, col) === 'river';
      }

      isBridge(row, col) {
        return this.terrainAt(row, col) === 'bridge';
      }

      isOwnDen(row, col, color) {
        return color === 'red' ? row === 8 && col === 3 : row === 0 && col === 3;
      }

      isEnemyDen(row, col, color) {
        return color === 'red' ? row === 0 && col === 3 : row === 8 && col === 3;
      }

      isEnemyTrap(row, col, color) {
        const traps = color === 'red'
          ? [[0, 2], [0, 4], [1, 3]]
          : [[8, 2], [8, 4], [7, 3]];
        return traps.some(([r, c]) => r === row && c === col);
      }

      inBounds(row, col) {
        return row >= 0 && row < ROWS && col >= 0 && col < COLS;
      }

      getPieceAt(row, col, state = this.pieces) {
        return state.find(p => p.alive && p.row === row && p.col === col) || null;
      }

      snapshot() {
        return this.pieces.map(p => ({ ...p }));
      }

      cloneState(state) {
        return state.map(p => ({ ...p }));
      }

      render() {
        this.renderCells();
        this.renderPieces();
        this.renderHighlights();
        this.updateUI();
      }

      renderCells() {
        for (let r = 0; r < ROWS; r++) {
          for (let c = 0; c < COLS; c++) {
            const cell = this.cells[r][c];
            cell.className = `cell ${this.terrainAt(r, c)}`;
            if (r === 0 || r === ROWS - 1 || c === 0 || c === COLS - 1) cell.classList.add('edge-node');
            if (this.selected && this.selected.row === r && this.selected.col === c) cell.classList.add('selected');
          }
        }
      }

      renderPieces() {
        this.gridEl.querySelectorAll('.piece').forEach(node => node.remove());
        for (const piece of this.pieces) {
          if (!piece.alive) continue;
          const cell = this.cells[piece.row]?.[piece.col];
          if (!cell) continue;
          const el = document.createElement('div');
          el.className = `piece ${piece.color}` + (this.selected && this.selected.id === piece.id ? ' selected' : '');
          const avatar = AVATARS[PIECES[piece.type].avatar] || '';
          el.innerHTML = `<span class="label">${PIECES[piece.type].name}</span><span class="avatar">${avatar}</span><span class="rank">${PIECES[piece.type].rank}</span>`;
          el.title = `${piece.color === 'red' ? TEXT.redSide : TEXT.blueSide} ${PIECES[piece.type].name}`;
          cell.appendChild(el);
        }
      }

      renderHighlights() {
        this.gridEl.querySelectorAll('.cell.valid-move,.cell.valid-capture').forEach(cell => cell.classList.remove('valid-move', 'valid-capture'));
        for (const move of this.validMoves) {
          const cell = this.cells[move.row]?.[move.col];
          if (cell) cell.classList.add(move.capture ? 'valid-capture' : 'valid-move');
        }
      }

      updateUI() {
        this.redCard.classList.toggle('current', this.currentPlayer === 'red');
        this.blueCard.classList.toggle('current', this.currentPlayer === 'blue');
        this.redStatus.textContent = this.currentPlayer === 'red' ? TEXT.turnRed : TEXT.waiting;
        this.blueStatus.textContent = this.currentPlayer === 'blue'
          ? (this.mode === 'ai' ? TEXT.turnBlueAi : TEXT.turnBlueHuman)
          : TEXT.waiting;
        document.getElementById('modeSel').value = this.mode;
        document.getElementById('difficultySel').value = this.difficulty;
      }

      updateTurnLabel() {
        if (this.mode === 'ai' && this.currentPlayer === 'blue') {
          this.updateStatus(TEXT.turnBlueAi);
        } else if (this.currentPlayer === 'red') {
          this.updateStatus(TEXT.redTurnHint);
        } else {
          this.updateStatus(TEXT.blueTurnHint);
        }
      }

      updateStatus(text) {
        this.statusEl.textContent = text;
      }

      setHistoryLabel(text) {
        this.historyEl.dataset.label = text;
      }

      handleCellClick(row, col) {
        if (!this.gameActive) return;
        if (this.gameOver) return;
        if (this.mode === 'ai' && this.currentPlayer === 'blue') return;

        const move = this.validMoves.find(m => m.row === row && m.col === col);
        if (move && this.selected) {
          this.performMove(this.selected.id, move);
          return;
        }

        const piece = this.getPieceAt(row, col);
        if (piece && piece.color === this.currentPlayer) {
          this.selectPiece(piece);
          return;
        }

        this.clearSelection();
      }

      selectPiece(piece) {
        this.ui.play('select');
        this.selected = piece;
        this.validMoves = this.getValidMoves(piece, this.pieces);
        this.render();
        this.updateStatus(TEXT.selectHint);
      }

      clearSelection() {
        this.selected = null;
        this.validMoves = [];
        this.render();
        this.updateTurnLabel();
      }

      canJump(piece, dir, state) {
        if (!['lion', 'tiger'].includes(piece.type)) return null;
        const nextRow = piece.row + dir.dr;
        const nextCol = piece.col + dir.dc;
        if (!this.inBounds(nextRow, nextCol) || !this.isRiver(nextRow, nextCol)) return null;
        let r = nextRow;
        let c = nextCol;
        while (this.inBounds(r, c) && this.isRiver(r, c)) {
          const blocker = this.getPieceAt(r, c, state);
          if (blocker && blocker.type === 'rat') return null;
          if (blocker) return null;
          r += dir.dr;
          c += dir.dc;
        }
        if (!this.inBounds(r, c) || this.isOwnDen(r, c, piece.color)) return null;
        return { row: r, col: c };
      }

      canCapture(attacker, defender, targetRow, targetCol) {
        const isInEnemyTrap = this.isEnemyTrap(targetRow, targetCol, attacker.color);
        if (isInEnemyTrap) {
          return this.hasAdjacentEnemy(attacker.row, attacker.col, targetRow, targetCol, attacker.color);
        }
        const attackerMeta = PIECES[attacker.type];
        const defenderMeta = PIECES[defender.type];
        if (attacker.type === 'rat' && defender.type === 'elephant') return true;
        if (attacker.type === 'elephant' && defender.type === 'rat') return false;
        if (this.terrainAt(attacker.row, attacker.col) === 'river' && this.terrainAt(targetRow, targetCol) === 'river') {
          return attacker.type === 'rat' && defender.type === 'rat';
        }
        return attackerMeta.rank >= defenderMeta.rank;
      }

      hasAdjacentEnemy(pieceRow, pieceCol, trapRow, trapCol, color) {
        const dirs = [{ dr: -1, dc: 0 }, { dr: 1, dc: 0 }, { dr: 0, dc: -1 }, { dr: 0, dc: 1 }];
        for (const dir of dirs) {
          const ar = pieceRow + dir.dr;
          const ac = pieceCol + dir.dc;
          if (this.inBounds(ar, ac)) {
            const adj = this.getPieceAt(ar, ac);
            if (adj && adj.color !== color) return true;
          }
          const tr = trapRow + dir.dr;
          const tc = trapCol + dir.dc;
          if (this.inBounds(tr, tc)) {
            const adjTrap = this.getPieceAt(tr, tc);
            if (adjTrap && adjTrap.color !== color) return true;
          }
        }
        return false;
      }

      getValidMoves(piece, state = this.pieces) {
        const moves = [];
        const dirs = [
          { dr: -1, dc: 0 },
          { dr: 1, dc: 0 },
          { dr: 0, dc: -1 },
          { dr: 0, dc: 1 }
        ];
        for (const dir of dirs) {
          const nr = piece.row + dir.dr;
          const nc = piece.col + dir.dc;
          if (!this.inBounds(nr, nc)) continue;
          if (this.isOwnDen(nr, nc, piece.color)) continue;

          const jump = this.canJump(piece, dir, state);
          if (jump) {
            const target = this.getPieceAt(jump.row, jump.col, state);
            if (!target || target.color !== piece.color) {
              if (!target || this.canCapture(piece, target, jump.row, jump.col)) {
                moves.push({
                  row: jump.row,
                  col: jump.col,
                  capture: !!target,
                  jump: true,
                  targetId: target?.id || null
                });
              }
            }
            continue;
          }

          if (this.terrainAt(nr, nc) === 'river' && piece.type !== 'rat') continue;
          const target = this.getPieceAt(nr, nc, state);
          if (target && target.color === piece.color) continue;
          if (target) {
            if (this.canCapture(piece, target, nr, nc)) {
              moves.push({ row: nr, col: nc, capture: true, targetId: target.id });
            }
          } else if (this.isEnemyTrap(nr, nc, piece.color)) {
            moves.push({ row: nr, col: nc, capture: false, targetId: null });
          } else {
            moves.push({ row: nr, col: nc, capture: false, targetId: null });
          }
        }
        return this.uniqueMoves(moves);
      }

      uniqueMoves(moves) {
        const seen = new Set();
        return moves.filter(m => {
          const key = `${m.row}-${m.col}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
      }

      getAllMoves(color, state) {
        const moves = [];
        for (const piece of state.filter(p => p.alive && p.color === color)) {
          const pieceMoves = this.getValidMoves(piece, state);
          for (const move of pieceMoves) {
            const target = this.getPieceAt(move.row, move.col, state);
            moves.push({
              ...move,
              pieceId: piece.id,
              piece: { ...piece },
              targetType: target?.type || null,
              win: this.isEnemyDen(move.row, move.col, color)
            });
          }
        }
        return moves;
      }

      applyMove(state, move) {
        const piece = state.find(p => p.id === move.pieceId && p.alive);
        if (!piece) return null;
        const target = state.find(p => p.alive && p.row === move.row && p.col === move.col);
        if (target) target.alive = false;
        piece.row = move.row;
        piece.col = move.col;
        return target ? { ...target } : null;
      }

      evaluateState(state, perspective) {
        let score = 0;
        const enemy = perspective === 'red' ? 'blue' : 'red';
        for (const piece of state) {
          if (!piece.alive) continue;
          const meta = PIECES[piece.type];
          const sign = piece.color === perspective ? 1 : -1;
          const advance = perspective === 'red' ? (ROWS - 1 - piece.row) : piece.row;
          score += sign * meta.value;
          score += sign * advance * 10;
          if (this.isEnemyTrap(piece.row, piece.col, piece.color)) score += sign * 60;
          if (this.terrainAt(piece.row, piece.col) === 'bridge') score += sign * 8;
          score += sign * this.mobility(piece, state) * 3;
        }
        const enemyMoves = this.getAllMoves(enemy, state);
        if (enemyMoves.some(m => m.win)) score -= 9000;
        score += (this.getAllMoves(perspective, state).length - enemyMoves.length) * 4;
        return score;
      }

      mobility(piece, state) {
        return this.getValidMoves(piece, state).length;
      }

      scoreMove(move, color, state) {
        const next = this.cloneState(state);
        const captured = this.applyMove(next, move);
        let score = this.evaluateState(next, color);
        if (captured) score += PIECES[captured.type].value * 1.15;
        if (move.win) score += 10000;
        if (this.isEnemyTrap(move.row, move.col, color)) score += 45;
        if (this.terrainAt(move.row, move.col) === 'bridge') score += 12;
        const progress = color === 'red' ? (ROWS - 1 - move.row) : move.row;
        score += progress * 2;
        return score;
      }

      searchBestMove(state, color, depth, alpha, beta, rootColor, limit) {
        const moves = this.getAllMoves(color, state);
        if (!moves.length || depth === 0) {
          return { score: this.evaluateState(state, rootColor), move: null };
        }

        const ordered = moves
          .map(move => ({ move, score: this.scoreMove(move, color, state) }))
          .sort((a, b) => b.score - a.score)
          .slice(0, limit)
          .map(item => item.move);

        const maximizing = color === rootColor;
        let bestMove = ordered[0] || null;
        let bestScore = maximizing ? -Infinity : Infinity;
        const nextColor = color === 'red' ? 'blue' : 'red';

        for (const move of ordered) {
          const next = this.cloneState(state);
          this.applyMove(next, move);
          const score = move.win
            ? (color === rootColor ? 100000 + depth * 100 : -100000 - depth * 100)
            : this.searchBestMove(next, nextColor, depth - 1, alpha, beta, rootColor, limit).score;

          if (maximizing) {
            if (score > bestScore) {
              bestScore = score;
              bestMove = move;
            }
            alpha = Math.max(alpha, bestScore);
          } else {
            if (score < bestScore) {
              bestScore = score;
              bestMove = move;
            }
            beta = Math.min(beta, bestScore);
          }

          if (alpha >= beta) break;
        }

        return { score: bestScore, move: bestMove };
      }

      chooseAiMove(color) {
        const state = this.snapshot();
        const moves = this.getAllMoves(color, state);
        if (!moves.length) return null;

        const winNow = moves.find(m => m.win);
        if (winNow) return winNow;

        const depthMap = { easy: 1, medium: 2, hard: 3, expert: 4 };
        const limitMap = { easy: 5, medium: 8, hard: 10, expert: 14 };
        const depth = depthMap[this.difficulty] || 2;
        const limit = limitMap[this.difficulty] || 8;
        const ordered = moves
          .map(move => ({ move, score: this.scoreMove(move, color, state) }))
          .sort((a, b) => b.score - a.score)
          .map(item => item.move);

        if (this.difficulty === 'easy') {
          const pool = ordered.slice(0, Math.min(4, ordered.length));
          return pool[Math.floor(Math.random() * pool.length)] || ordered[0];
        }

        const best = this.searchBestMove(state, color, depth, -Infinity, Infinity, color, limit);
        if (best.move) return best.move;
        return ordered[0];
      }

      performMove(pieceId, move) {
        const piece = this.pieces.find(p => p.id === pieceId && p.alive);
        if (!piece || this.gameOver) return;
        const target = this.getPieceAt(move.row, move.col);
        const captured = target ? { ...target } : null;

        this.history.push({
          pieceId,
          from: { row: piece.row, col: piece.col },
          to: { row: move.row, col: move.col },
          captured,
          prevTurn: this.currentPlayer
        });

        if (target) target.alive = false;
        piece.row = move.row;
        piece.col = move.col;
        this.ui.play(target ? 'drop' : 'move');

        if (this.isEnemyDen(move.row, move.col, piece.color)) {
          this.finishGame(piece.color);
          return;
        }

        const opponentAlive = this.pieces.some(p => p.alive && p.color !== piece.color);
        if (!opponentAlive) {
          this.finishGame(piece.color);
          return;
        }

        this.selected = null;
        this.validMoves = [];
        this.currentPlayer = this.currentPlayer === 'red' ? 'blue' : 'red';
        this.render();
        this.appendHistory(piece, move, target);
        this.updateTurnLabel();

        if (this.mode === 'ai' && this.currentPlayer === 'blue' && !this.gameOver) {
          this.scheduleAiMove();
        }
      }

      appendHistory(piece, move, target) {
        const item = document.createElement('div');
        item.className = 'history-item';
        const side = piece.color === 'red' ? TEXT.redSide : TEXT.blueSide;
        const captureText = target ? ` \u2192 ${PIECES[target.type].name}` : '';
        item.textContent = `${side} ${PIECES[piece.type].name} (${move.row + 1},${move.col + 1})${captureText}`;
        this.historyEl.prepend(item);
      }

      finishGame(winnerColor) {
        this.gameOver = true;
        this.selected = null;
        this.validMoves = [];
        this.render();
        this.winnerText.textContent = winnerColor === 'red' ? TEXT.redWin : TEXT.blueWin;
        this.winnerText.className = `winner ${winnerColor}`;
        this.overlayEl.classList.add('show');
        this.ui.play('win');
        this.updateStatus(winnerColor === 'red' ? TEXT.redWin : TEXT.blueWin);
      }

      undo() {
        if (!this.history.length || this.gameOver) {
          if (this.gameOver) return;
          return;
        }
        const steps = this.mode === 'ai' ? 2 : 1;
        for (let i = 0; i < steps && this.history.length; i++) {
          const step = this.history.pop();
          const piece = this.pieces.find(p => p.id === step.pieceId);
          if (piece) {
            piece.row = step.from.row;
            piece.col = step.from.col;
            piece.alive = true;
          }
          if (step.captured) {
            const restored = this.pieces.find(p => p.id === step.captured.id);
            if (restored) restored.alive = true;
          }
          this.currentPlayer = step.prevTurn;
        }
        this.gameOver = false;
        this.selected = null;
        this.validMoves = [];
        this.overlayEl.classList.remove('show');
        this.render();
        this.updateTurnLabel();
      }

      toggleMode() {
        this.mode = this.mode === 'ai' ? 'pvp' : 'ai';
        this.init();
      }

      scheduleAiMove() {
        const token = this.turnToken;
        setTimeout(() => {
          if (this.gameOver || token !== this.turnToken || this.currentPlayer !== 'blue') return;
          const move = this.chooseAiMove('blue');
          if (move) {
            this.performMove(move.pieceId, move);
          } else {
            this.currentPlayer = 'red';
            this.render();
            this.updateStatus(TEXT.blueStall);
            this.updateTurnLabel();
          }
        }, 260);
      }
    }

    const game = new DouShouQiGame();
