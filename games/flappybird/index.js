(function () {
    // ---- 难度配置 ----
    const DIFFICULTY = {
        easy:   { pipeSpeed: 1.8, gapHeight: 145, pipeInterval: 200 },
        medium: { pipeSpeed: 2.5, gapHeight: 120, pipeInterval: 160 },
        hard:   { pipeSpeed: 3.2, gapHeight: 100, pipeInterval: 125 },
        expert: { pipeSpeed: 4.0, gapHeight: 82,  pipeInterval: 95  }
    };

    // ---- 物理常量 ----
    const GRAVITY    = 0.22;  // 每帧重力加速度（正值 = 向下拉）
    const FLAP_POWER = -4.5;   // 扇翅初速度（向上为负）
    const MAX_VY_UP = -7.0;   // 向上速度上限

    const LOGICAL_W = 320;
    const LOGICAL_H = 480;
    const GROUND_H  = 60;
    const CEIL_H    = 0;

    // ---- 状态 ----
    let difficulty  = 'easy';
    let gameState   = 'idle';  // 'idle' | 'playing' | 'gameover'
    let score       = 0;
    let bestScore   = 0;
    let rafId       = null;
    let lastTs      = 0;
    let idleTime    = 0;       // idle 模式下用于正弦浮动计时

    // ---- 小鸟 ----
    let bird = {
        x: 60,
        y: LOGICAL_H / 2 - 40,
        vy: 0,
        rotation: 0,
        flapPhase: 0,
    };

    // ---- 水管 ----
    let pipes     = [];
    let pipeTimer = 0;

    // ---- 背景 ----
    let clouds  = [];
    let groundX = 0;

    // ---- DOM ----
    const canvas    = document.getElementById('gameCanvas');
    const ctx       = canvas.getContext('2d');
    const overlay   = document.getElementById('startOverlay');
    const goOverlay = document.getElementById('gameOverOverlay');

    // ---- 缩放适配 ----
    let scale = 1;
    function computeScale() {
        const maxW = Math.min(window.innerWidth  - 40, 360);
        const maxH = Math.min(window.innerHeight - 300, 560);
        const sw = maxW / LOGICAL_W;
        const sh = maxH / LOGICAL_H;
        scale = Math.min(sw, sh, 2.2);
        canvas.width  = LOGICAL_W;
        canvas.height = LOGICAL_H;
        canvas.style.width  = (LOGICAL_W * scale) + 'px';
        canvas.style.height = (LOGICAL_H * scale) + 'px';
    }

    // ---- 初始化背景 ----
    function initBgElements() {
        clouds = [];
        for (let i = 0; i < 6; i++) {
            clouds.push({
                x: Math.random() * LOGICAL_W,
                y: 20 + Math.random() * (LOGICAL_H * 0.45),
                r: 18 + Math.random() * 22,
                speed: 0.15 + Math.random() * 0.2,
                opacity: 0.55 + Math.random() * 0.35
            });
        }
        groundX = 0;
    }

    // ---- 重置游戏 ----
    function resetGame() {
        computeScale();
        initBgElements();

        score     = 0;
        pipes     = [];
        pipeTimer = 0;
        bird = {
            x: 60,
            y: LOGICAL_H / 2 - 40,
            vy: 0,
            rotation: 0,
            flapPhase: 0,
        };

        document.getElementById('scoreDisplay').textContent = score;
        document.getElementById('bestDisplay').textContent  = bestScore;
        goOverlay.classList.remove('show');
        overlay.style.display = 'flex';
        gameState = 'idle';
        idleTime  = 0;
    }

    // ---- 设置难度 ----
    function setDifficulty(diff) {
        difficulty = diff;
        document.querySelectorAll('.btn-diff').forEach(b => b.classList.remove('active'));
        document.querySelector('.btn-diff.' + diff).classList.add('active');
        resetGame();
    }

    // ---- 开始游戏 ----
    function startGame() {
        if (gameState !== 'idle') return;
        overlay.style.display = 'none';
        gameState = 'playing';
        bird.vy = FLAP_POWER;
        pageAudio.play('tap');
    }

    // ---- 扇翅 ----
    function flap() {
        if (gameState === 'idle') {
            startGame();
            return;
        }
        if (gameState !== 'playing') return;
        bird.vy = FLAP_POWER;
        bird.flapPhase = 1;
        pageAudio.play('tap');
    }

    // ---- 游戏结束 ----
    function gameOver() {
        gameState = 'gameover';
        pageAudio.play('lose');

        if (score > bestScore) {
            bestScore = score;
            try { localStorage.setItem('flappybird_best_' + difficulty, bestScore); } catch(e) {}
        }

        document.getElementById('goScore').textContent = score;
        document.getElementById('goBest').textContent  = bestScore;
        document.getElementById('scoreDisplay').textContent = score;
        document.getElementById('bestDisplay').textContent  = bestScore;

        setTimeout(() => goOverlay.classList.add('show'), 500);
    }

    // =========================================================
    // 统一循环：idle / playing / gameover 状态统一处理
    // =========================================================
    function loop(ts) {
        rafId = requestAnimationFrame(loop);

        if (lastTs === 0) lastTs = ts;
        const dt = Math.min((ts - lastTs) / 16.667, 3);
        lastTs = ts;

        if (gameState === 'idle') {
            // idle 动画
            idleTime += dt;
            drawIdle();
            return;  // 不执行 playing 逻辑
        }

        if (gameState !== 'playing') return;

        const cfg   = DIFFICULTY[difficulty];
        const topY  = CEIL_H;

        // ---- 物理更新 ----
        bird.vy = Math.min(bird.vy + GRAVITY * dt, MAX_VY_UP);
        bird.y += bird.vy * dt;
        bird.rotation = Math.min(Math.max(bird.vy * 5, -30), 80);
        if (bird.flapPhase > 0) bird.flapPhase -= 0.12 * dt;

        // 撞天 / 撞地
        if (bird.y < topY) {
            bird.y  = topY;
            bird.vy = 0;
        }
        if (bird.y > LOGICAL_H - GROUND_H - 16) {
            bird.y = LOGICAL_H - GROUND_H - 16;
            gameOver();
            return;
        }

        // 地板滚动
        groundX = (groundX - cfg.pipeSpeed * dt) % 24;

        // 生成水管
        pipeTimer += dt;
        if (pipeTimer >= cfg.pipeInterval) {
            pipeTimer = 0;
            const minTop = topY + 50;
            const maxTop = LOGICAL_H - GROUND_H - cfg.gapHeight - 50;
            const topH   = minTop + Math.random() * (maxTop - minTop);
            pipes.push({ x: LOGICAL_W, topH, gapH: cfg.gapHeight, scored: false, capH: 20, capW: 52 });
        }

        // 移动水管 + 碰撞 + 计分
        const bw = 30, bh = 22;
        const bx = bird.x - bw / 2;
        const by = bird.y - bh / 2;

        for (let i = pipes.length - 1; i >= 0; i--) {
            const p  = pipes[i];
            p.x -= cfg.pipeSpeed * dt;

            if (p.x + p.capW < 0) { pipes.splice(i, 1); continue; }

            const pLeft  = p.x;
            const pRight = p.x + p.capW;
            const pTopH  = p.topH;

            const hitTop = bx < pRight && bx + bw > pLeft && by < pTopH + p.capH;
            const hitBot = bx < pRight && bx + bw > pLeft &&
                           by + bh > LOGICAL_H - GROUND_H - (LOGICAL_H - GROUND_H - p.topH - p.gapH);

            if (hitTop || hitBot) { gameOver(); return; }

            if (!p.scored && bird.x > p.x + p.capW) {
                p.scored = true;
                score++;
                document.getElementById('scoreDisplay').textContent = score;
                pageAudio.play('success');
            }
        }

        draw();
    }

    // ---- 绘制 ----
    function draw() {
        const topY  = CEIL_H;
        const groundY = LOGICAL_H - GROUND_H;

        // 天空渐变
        const sky = ctx.createLinearGradient(0, 0, 0, groundY);
        sky.addColorStop(0,   '#4ec9f0');
        sky.addColorStop(0.6, '#87ceeb');
        sky.addColorStop(1,   '#b8e994');
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, LOGICAL_W, groundY);

        // 云朵
        clouds.forEach(c => {
            c.x -= c.speed;
            if (c.x + c.r < 0) c.x = LOGICAL_W + c.r;
            ctx.globalAlpha = c.opacity;
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
            ctx.arc(c.x + c.r * 0.7, c.y - c.r * 0.2, c.r * 0.7, 0, Math.PI * 2);
            ctx.arc(c.x + c.r * 1.2, c.y + c.r * 0.1, c.r * 0.6, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
        });

        // 远处小山剪影
        ctx.fillStyle = '#7ec850';
        ctx.beginPath();
        ctx.moveTo(0, groundY);
        for (let x = 0; x <= LOGICAL_W; x += 40) {
            const h = 20 + Math.sin(x * 0.04) * 15 + Math.cos(x * 0.07) * 10;
            ctx.lineTo(x, groundY - h);
        }
        ctx.lineTo(LOGICAL_W, groundY);
        ctx.closePath();
        ctx.fill();

        // 水管
        pipes.forEach(p => {
            const g1 = ctx.createLinearGradient(p.x, 0, p.x + p.capW, 0);
            g1.addColorStop(0,    '#3db86a');
            g1.addColorStop(0.3,  '#5ecf85');
            g1.addColorStop(0.6,  '#4dbe73');
            g1.addColorStop(1,    '#2e9f58');

            ctx.fillStyle = g1;
            ctx.fillRect(p.x, topY, p.capW, p.topH);

            const capG = ctx.createLinearGradient(p.x - 4, 0, p.x + p.capW + 4, 0);
            capG.addColorStop(0,    '#3db86a');
            capG.addColorStop(0.5,  '#5ecf85');
            capG.addColorStop(1,    '#3db86a');
            ctx.fillStyle = capG;
            ctx.fillRect(p.x - 4, p.topH - 6, p.capW + 8, p.capH);

            ctx.fillStyle = 'rgba(255,255,255,0.18)';
            ctx.fillRect(p.x + 6, topY, 8, p.topH);

            const botTop = LOGICAL_H - GROUND_H - p.gapH;
            ctx.fillStyle = g1;
            ctx.fillRect(p.x, botTop, p.capW, LOGICAL_H - GROUND_H - botTop);
            ctx.fillStyle = capG;
            ctx.fillRect(p.x - 4, botTop - p.capH + 2, p.capW + 8, p.capH);
            ctx.fillStyle = 'rgba(255,255,255,0.18)';
            ctx.fillRect(p.x + 6, botTop, 8, LOGICAL_H - GROUND_H - botTop);
        });

        // 地面
        const gnd = ctx.createLinearGradient(0, groundY, 0, LOGICAL_H);
        gnd.addColorStop(0,   '#98d982');
        gnd.addColorStop(0.3, '#7ec850');
        gnd.addColorStop(1,   '#5ea030');
        ctx.fillStyle = gnd;
        ctx.fillRect(0, groundY, LOGICAL_W, GROUND_H);

        ctx.fillStyle = 'rgba(0,0,0,0.07)';
        for (let x = groundX; x < LOGICAL_W; x += 24) ctx.fillRect(x, groundY, 8, GROUND_H);

        ctx.fillStyle = '#b8e994';
        ctx.fillRect(0, groundY, LOGICAL_W, 3);

        // 小鸟
        drawBird(bird.x, bird.y, bird.rotation, bird.flapPhase);

        // 分数
        if (gameState === 'playing') {
            ctx.save();
            ctx.font = 'bold 38px "Comic Neue", cursive';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.fillStyle = 'rgba(0,0,0,0.25)';
            ctx.fillText(score, LOGICAL_W / 2 + 2, 14);
            ctx.fillStyle = '#fff';
            ctx.strokeStyle = 'rgba(0,0,0,0.3)';
            ctx.lineWidth = 3;
            ctx.strokeText(score, LOGICAL_W / 2, 12);
            ctx.fillText(score, LOGICAL_W / 2, 12);
            ctx.restore();
        }
    }

    // ---- idle 绘制：用正弦让小鸟浮动 ----
    function drawIdle() {
        const idleY = LOGICAL_H / 2 - 40 + Math.sin(idleTime * 0.05) * 8;
        drawBird(bird.x, idleY, 0, Math.abs(Math.sin(idleTime * 0.12)));
    }

    // ---- 绘制小鸟 ----
    function drawBird(x, y, rotation, flapPhase) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rotation * Math.PI / 180);

        const wingAngle = -0.4 + flapPhase * 0.9;
        ctx.save();
        ctx.rotate(wingAngle);
        ctx.fillStyle = '#f5c842';
        ctx.beginPath();
        ctx.ellipse(2, 4, 11, 6, -0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        const bodyGrad = ctx.createRadialGradient(-4, -5, 2, 0, 0, 14);
        bodyGrad.addColorStop(0,   '#ffe066');
        bodyGrad.addColorStop(0.6, '#f5c842');
        bodyGrad.addColorStop(1,   '#e8a820');
        ctx.fillStyle = bodyGrad;
        ctx.beginPath();
        ctx.ellipse(0, 0, 14, 11, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#fffbe6';
        ctx.beginPath();
        ctx.ellipse(2, 4, 8, 7, 0.2, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(7, -4, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#222';
        ctx.beginPath();
        ctx.arc(9, -4, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(10, -5, 1.2, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ff6b35';
        ctx.beginPath();
        ctx.moveTo(13, -1);
        ctx.lineTo(21, 1);
        ctx.lineTo(13, 4);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = '#e8a820';
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(2, -10);
        ctx.quadraticCurveTo(4, -16, 0, -18);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(6, -10);
        ctx.quadraticCurveTo(9, -15, 7, -18);
        ctx.stroke();

        ctx.restore();
    }

    // ---- 输入绑定 ----
    function bindInput() {
        const wrapper = document.getElementById('canvasWrapper');

        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space' || e.key === 'ArrowUp') { e.preventDefault(); flap(); }
        });

        canvas.addEventListener('mousedown', (e) => { e.preventDefault(); flap(); });
        canvas.addEventListener('touchstart', (e) => { e.preventDefault(); flap(); }, { passive: false });

        wrapper.addEventListener('mousedown', (e) => {
            if (gameState === 'idle' || gameState === 'playing') { e.preventDefault(); flap(); }
        });
        wrapper.addEventListener('touchstart', (e) => {
            if (gameState === 'idle' || gameState === 'playing') { e.preventDefault(); flap(); }
        }, { passive: false });
    }

    // ---- 读取最高分 ----
    function loadBest() {
        try {
            const saved = localStorage.getItem('flappybird_best_' + difficulty);
            if (saved) bestScore = parseInt(saved, 10) || 0;
        } catch(e) {}
        document.getElementById('bestDisplay').textContent = bestScore;
    }

    // ---- 初始化 ----
    function init() {
        computeScale();
        loadBest();
        initBgElements();
        bindInput();
        resetGame();

        window.addEventListener('resize', () => {
            computeScale();
            draw();
        });
    }

    // ---- 暴露全局函数 ----
    window.setDifficulty = setDifficulty;
    window.resetGame     = resetGame;

    init();

    // ---- 统一工具栏（必须在 init 之后） ----
    const pageAudio = GamePageUI.mount({ home: true, sound: true }, 'bar');

    // ---- 启动统一循环 ----
    rafId = requestAnimationFrame(loop);
})();
