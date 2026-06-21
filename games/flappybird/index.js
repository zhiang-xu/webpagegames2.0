(function () {
    const pageAudio = window.GamePageUI.mount({ home: true, sound: true, muted: false });

    // ---- 难度配置 ----
    const DIFFICULTY = {
        easy:   { pipeSpeed: 2.0, gapHeight: 160, pipeInterval: 220, label: 'easy' },
        medium: { pipeSpeed: 2.8, gapHeight: 130, pipeInterval: 180, label: 'medium' },
        hard:   { pipeSpeed: 3.6, gapHeight: 105, pipeInterval: 150, label: 'hard' },
        expert: { pipeSpeed: 4.5, gapHeight: 82,  pipeInterval: 120, label: 'expert' }
    };

    const LOGICAL_W = 320;
    const LOGICAL_H = 480;
    const GROUND_H  = 60;
    const CEIL_H    = 0;

    let difficulty = 'easy';
    let gameState  = 'idle';   // 'idle' | 'playing' | 'gameover'
    let score      = 0;
    let bestScore  = 0;
    let rafId      = null;
    let lastTs     = 0;

    // 小鸟状态
    let bird = {
        x: 60,
        y: LOGICAL_H / 2 - 40,
        vy: 0,
        rotation: 0,
        flapPhase: 0,
    };

    // 水管状态
    let pipes = [];
    let pipeTimer = 0;

    // 背景元素
    let clouds = [];
    let groundX = 0;

    const canvas  = document.getElementById('gameCanvas');
    const ctx     = canvas.getContext('2d');
    const overlay = document.getElementById('startOverlay');
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

    // ---- 初始化 ----
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

    function resetGame() {
        computeScale();
        initBgElements();

        score    = 0;
        pipes    = [];
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
        pageAudio.play('start');
    }

    function setDifficulty(diff) {
        difficulty = diff;
        document.querySelectorAll('.btn-diff').forEach(b => b.classList.remove('active'));
        document.querySelector('.btn-diff.' + diff).classList.add('active');
        resetGame();
    }

    function startGame() {
        if (gameState !== 'idle') return;
        overlay.style.display = 'none';
        gameState = 'playing';
        bird.vy = -6.5;
        pageAudio.play('tap');
        requestAnimationFrame(loop);
    }

    function flap() {
        if (gameState === 'idle') {
            startGame();
            return;
        }
        if (gameState !== 'playing') return;
        bird.vy = -6.5;
        bird.flapPhase = 1;
        pageAudio.play('tap');
    }

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

        setTimeout(() => {
            goOverlay.classList.add('show');
        }, 500);
    }

    // ---- 游戏循环 ----
    function loop(ts) {
        if (gameState !== 'playing') return;

        if (lastTs === 0) lastTs = ts;
        const dt = Math.min((ts - lastTs) / 16.667, 3);
        lastTs = ts;

        const cfg = DIFFICULTY[difficulty];
        const topY = CEIL_H;

        // 重力 + 移动
        bird.vy += 0.32 * dt;
        bird.y  += bird.vy * dt;
        bird.rotation = Math.min(Math.max(bird.vy * 4, -25), 90);
        if (bird.flapPhase > 0) bird.flapPhase -= 0.15 * dt;

        // 撞天 / 撞地
        if (bird.y < topY) {
            bird.y = topY;
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
        pipeTimer += cfg.pipeSpeed * dt;
        if (pipeTimer >= cfg.pipeInterval) {
            pipeTimer = 0;
            const minTop = topY + 50;
            const maxTop = LOGICAL_H - GROUND_H - cfg.gapHeight - 50;
            const topH   = minTop + Math.random() * (maxTop - minTop);
            pipes.push({
                x:        LOGICAL_W,
                topH:     topH,
                gapH:     cfg.gapHeight,
                scored:   false,
                capH:     20,
                capW:     52,
            });
        }

        // 移动水管 + 检测
        const bw = 30, bh = 22;
        const bx = bird.x - bw / 2;
        const by = bird.y - bh / 2;

        for (let i = pipes.length - 1; i >= 0; i--) {
            const p = pipes[i];
            p.x -= cfg.pipeSpeed * dt;

            // 出屏移除
            if (p.x + p.capW < 0) {
                pipes.splice(i, 1);
                continue;
            }

            // 碰撞检测（矩形 vs 矩形）
            const pLeft   = p.x;
            const pRight  = p.x + p.capW;
            const pTopH   = p.topH;
            const pBotH   = LOGICAL_H - GROUND_H - p.topH - p.gapH;

            const hitTop = bx < pRight && bx + bw > pLeft &&
                            by < pTopH + p.capH;
            const hitBot = bx < pRight && bx + bw > pLeft &&
                            by + bh > LOGICAL_H - GROUND_H - pBotH;

            if (hitTop || hitBot) {
                gameOver();
                return;
            }

            // 计分（仅第一次穿过时）
            if (!p.scored && bird.x > p.x + p.capW) {
                p.scored = true;
                score++;
                document.getElementById('scoreDisplay').textContent = score;
                pageAudio.play('success');
            }
        }

        draw();
        rafId = requestAnimationFrame(loop);
    }

    // ---- 绘制 ----
    function draw() {
        const topY = CEIL_H;
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
            // 水管主体（浅绿色渐变）
            const g1 = ctx.createLinearGradient(p.x, 0, p.x + p.capW, 0);
            g1.addColorStop(0,    '#3db86a');
            g1.addColorStop(0.3,  '#5ecf85');
            g1.addColorStop(0.6,  '#4dbe73');
            g1.addColorStop(1,    '#2e9f58');

            // 上面管子
            ctx.fillStyle = g1;
            ctx.fillRect(p.x, topY, p.capW, p.topH);

            // 上面管子帽
            const capG = ctx.createLinearGradient(p.x - 4, 0, p.x + p.capW + 4, 0);
            capG.addColorStop(0,    '#3db86a');
            capG.addColorStop(0.5,  '#5ecf85');
            capG.addColorStop(1,    '#3db86a');
            ctx.fillStyle = capG;
            ctx.fillRect(p.x - 4, p.topH - 6, p.capW + 8, p.capH);

            // 上面管子内壁高光
            ctx.fillStyle = 'rgba(255,255,255,0.18)';
            ctx.fillRect(p.x + 6, topY, 8, p.topH);

            // 下面管子
            const botTop = LOGICAL_H - GROUND_H - p.gapH;
            ctx.fillStyle = g1;
            ctx.fillRect(p.x, botTop, p.capW, LOGICAL_H - GROUND_H - botTop);

            // 下面管子帽
            ctx.fillStyle = capG;
            ctx.fillRect(p.x - 4, botTop - p.capH + 2, p.capW + 8, p.capH);

            // 下面管子内壁高光
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

        // 地面纹理（竖条纹）
        ctx.fillStyle = 'rgba(0,0,0,0.07)';
        for (let x = groundX; x < LOGICAL_W; x += 24) {
            ctx.fillRect(x, groundY, 8, GROUND_H);
        }

        // 地面顶部高亮线
        ctx.fillStyle = '#b8e994';
        ctx.fillRect(0, groundY, LOGICAL_W, 3);

        // 小鸟
        drawBird(bird.x, bird.y, bird.rotation, bird.flapPhase);

        // 分数（大字显示）
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

    function drawBird(x, y, rotation, flapPhase) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rotation * Math.PI / 180);

        // 翅膀（根据 flapPhase 动画）
        const wingAngle = -0.4 + flapPhase * 0.9;
        ctx.save();
        ctx.rotate(wingAngle);
        ctx.fillStyle = '#f5c842';
        ctx.beginPath();
        ctx.ellipse(2, 4, 11, 6, -0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // 身体
        const bodyGrad = ctx.createRadialGradient(-4, -5, 2, 0, 0, 14);
        bodyGrad.addColorStop(0, '#ffe066');
        bodyGrad.addColorStop(0.6, '#f5c842');
        bodyGrad.addColorStop(1, '#e8a820');
        ctx.fillStyle = bodyGrad;
        ctx.beginPath();
        ctx.ellipse(0, 0, 14, 11, 0, 0, Math.PI * 2);
        ctx.fill();

        // 白色肚皮
        ctx.fillStyle = '#fffbe6';
        ctx.beginPath();
        ctx.ellipse(2, 4, 8, 7, 0.2, 0, Math.PI * 2);
        ctx.fill();

        // 眼睛（白色底 + 黑色瞳）
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

        // 嘴巴（橙红色）
        ctx.fillStyle = '#ff6b35';
        ctx.beginPath();
        ctx.moveTo(13, -1);
        ctx.lineTo(21, 1);
        ctx.lineTo(13, 4);
        ctx.closePath();
        ctx.fill();

        // 头顶呆毛
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

    // ---- 闲置状态绘制 ----
    function drawIdle() {
        draw();
        // 在小鸟位置画一只漂浮的小鸟
        const idleY = LOGICAL_H / 2 - 40 + Math.sin(Date.now() * 0.003) * 8;
        drawBird(bird.x, idleY, 0, Math.abs(Math.sin(Date.now() * 0.008)));
    }

    // ---- 输入绑定 ----
    function bindInput() {
        const wrapper = document.getElementById('canvasWrapper');

        // 键盘
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space' || e.key === 'ArrowUp') {
                e.preventDefault();
                flap();
            }
        });

        // 点击画布
        canvas.addEventListener('mousedown', (e) => { e.preventDefault(); flap(); });
        canvas.addEventListener('touchstart', (e) => { e.preventDefault(); flap(); }, { passive: false });

        // 点击 wrapper（防止冒泡）
        wrapper.addEventListener('mousedown', (e) => {
            if (gameState === 'idle' || gameState === 'playing') {
                e.preventDefault();
                flap();
            }
        });
        wrapper.addEventListener('touchstart', (e) => {
            if (gameState === 'idle' || gameState === 'playing') {
                e.preventDefault();
                flap();
            }
        }, { passive: false });
    }

    // ---- 闲置动画循环 ----
    function idleLoop() {
        if (gameState !== 'idle') return;
        drawIdle();
        requestAnimationFrame(idleLoop);
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
        draw();
        idleLoop();

        window.addEventListener('resize', () => {
            computeScale();
            draw();
        });
    }

    // ---- 暴露全局函数 ----
    window.setDifficulty = setDifficulty;
    window.resetGame     = resetGame;

    init();
})();

// 统一工具栏：返回主页 + 音效开关
GamePageUI.mount({ home: true, sound: true }, 'bar');
