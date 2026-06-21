        const pageAudio = window.GamePageUI.mount({ home: true, sound: true, muted: false });
        // 难度网格尺寸（奇数保证 Prim 迷宫对齐）
        const DIFFICULTY = {
            easy:   { cols: 31, rows: 31, cellSize: 18 },
            medium: { cols: 61, rows: 61, cellSize: 10 },
            hard:   { cols: 101, rows: 101, cellSize: 6 },
            expert: { cols: 101, rows: 101, cellSize: 6, fog: true, fogRadius: 10 }
        };

        let difficulty = 'easy';
        let maze = [];
        let player = { x: 0, y: 0 };
        let goal = { x: 0, y: 0 };
        let steps = 0;
        let timer = null;
        let seconds = 0;
        let gameActive = false;
        let pathHistory = [];

        const canvas = document.getElementById('maze');
        const ctx = canvas.getContext('2d');
        const timeDisplay = document.getElementById('timeDisplay');
        const stepsDisplay = document.getElementById('stepsDisplay');
        const victoryOverlay = document.getElementById('victory');

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

        function formatTime(s) {
            const m = Math.floor(s / 60);
            const sec = s % 60;
            return String(m).padStart(2, '0') + ':' + String(sec).padStart(2, '0');
        }

        function startGame() {
            gameActive = true;
            startTimer();
            pageAudio.play('start');
        }

        function newMaze(diff) {
            difficulty = diff;
            document.querySelectorAll('.btn-diff').forEach(btn => btn.classList.remove('active'));
            document.querySelector('.btn-diff.' + diff).classList.add('active');

            const config = DIFFICULTY[diff];

            // 生成迷宫
            maze = generateMaze(config.cols, config.rows);

            // 设置玩家和终点
            player = { x: 1, y: 0 };                  // 入口：左上侧边缘
            goal = { x: config.cols - 2, y: config.rows - 1 }; // 出口：右下侧边缘
            steps = 0;
            pathHistory = [{ x: 1, y: 0 }];
            gameActive = false;

            // 设置画布尺寸
            canvas.width = config.cols * config.cellSize;
            canvas.height = config.rows * config.cellSize;
            offCanvas.width = canvas.width;
            offCanvas.height = canvas.height;

            // 专家模式重置已探索格子
            explored.clear();

            stopTimer();
            timeDisplay.textContent = '00:00';
            stepsDisplay.textContent = '0';
            victoryOverlay.classList.remove('show');

            draw();
        }

        function generateMaze(cols, rows) {
            // 初始化全墙
            const m = Array.from({length: rows}, () => Array(cols).fill(1));

            // Prim 算法：生成密集死胡同、高难度迷宫
            // 1. 将起点加入墙壁列表
            const wallList = [];
            const visited = Array.from({length: rows}, () => Array(cols).fill(false));

            // 起点必须是偶数坐标（与墙壁交错）
            const sx = 1, sy = 1;
            m[sy][sx] = 0;
            visited[sy][sx] = true;

            // 将起点的邻居墙加入列表
            const dirs = [[0,-1],[1,0],[0,1],[-1,0]];
            for (const [dx, dy] of dirs) {
                const nx = sx + dx;
                const ny = sy + dy;
                if (nx > 0 && nx < cols - 1 && ny > 0 && ny < rows - 1 && m[ny][nx] === 1) {
                    wallList.push({x: nx, y: ny, fx: sx, fy: sy});
                }
            }

            // 2. Prim 主循环：随机选墙，打通它
            while (wallList.length > 0) {
                const idx = Math.floor(Math.random() * wallList.length);
                const wall = wallList[idx];
                wallList.splice(idx, 1);

                const {x: wx, y: wy, fx, fy} = wall;

                // 墙已打通，跳过
                if (m[wy][wx] === 0) continue;

                // 检查对面格子是否已访问
                const dx = wx - fx;
                const dy = wy - fy;
                const cx = wx + dx;
                const cy = wy + dy;

                if (cx < 0 || cx >= cols || cy < 0 || cy >= rows) continue;
                if (visited[cy][cx]) continue;

                // 打通墙壁和对面格子
                m[wy][wx] = 0;
                m[cy][cx] = 0;
                visited[cy][cx] = true;

                // 将对面格子的新邻居墙加入列表
                for (const [ndx, ndy] of dirs) {
                    const nnx = cx + ndx;
                    const nny = cy + ndy;
                    if (nnx > 0 && nnx < cols - 1 && nny > 0 && nny < rows - 1 &&
                        m[nny][nnx] === 1 && !visited[nny][nnx]) {
                        wallList.push({x: nnx, y: nny, fx: cx, fy: cy});
                    }
                }
            }

            // 3. 打通入口和出口
            m[0][1] = 0;                  // 入口：左侧边缘
            m[rows - 1][cols - 2] = 0;   // 出口：右侧边缘

            return m;
        }

        function shuffle(array) {
            const arr = [...array];
            for (let i = arr.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [arr[i], arr[j]] = [arr[j], arr[i]];
            }
            return arr;
        }

        // 离屏画布：存放原始迷宫图像（用于迷雾渲染）
        const offCanvas = document.createElement('canvas');
        const offCtx = offCanvas.getContext('2d');

        // 已访问过的格子（专家模式迷雾探索）
        const explored = new Set();

        function inFogRadius(x, y, px, py, radius) {
            const dist = Math.sqrt((x - px) * (x - px) + (y - py) * (y - py));
            return dist <= radius;
        }

        function draw() {
            const config = DIFFICULTY[difficulty];
            const cellSize = config.cellSize;
            const fogMode = config.fog === true;
            const fogRadius = config.fogRadius || 0;

            // ---- 1. 绘制完整迷宫到底层离屏画布 ----
            offCtx.clearRect(0, 0, offCanvas.width, offCanvas.height);

            for (let y = 0; y < maze.length; y++) {
                for (let x = 0; x < maze[0].length; x++) {
                    if (maze[y][x] === 1) {
                        const gradient = offCtx.createRadialGradient(
                            x * cellSize + cellSize * 0.3, y * cellSize + cellSize * 0.3, 0,
                            x * cellSize + cellSize * 0.5, y * cellSize + cellSize * 0.5, cellSize * 0.6
                        );
                        gradient.addColorStop(0, '#667eea');
                        gradient.addColorStop(1, '#4a5568');
                        offCtx.fillStyle = gradient;
                        offCtx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);

                        offCtx.fillStyle = 'rgba(255,255,255,0.1)';
                        offCtx.fillRect(x * cellSize, y * cellSize, cellSize, 2);
                        offCtx.fillRect(x * cellSize, y * cellSize, 2, cellSize);
                    } else {
                        offCtx.fillStyle = '#f8fafc';
                        offCtx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
                        offCtx.strokeStyle = 'rgba(203, 213, 225, 0.5)';
                        offCtx.lineWidth = 0.5;
                        offCtx.strokeRect(x * cellSize, y * cellSize, cellSize, cellSize);
                    }
                }
            }

            // 路径历史
            for (let i = 0; i < pathHistory.length; i++) {
                const p = pathHistory[i];
                const alpha = 0.15 + (i / pathHistory.length) * 0.2;
                offCtx.fillStyle = `rgba(78, 205, 196, ${alpha})`;
                offCtx.beginPath();
                offCtx.arc(
                    p.x * cellSize + cellSize * 0.5,
                    p.y * cellSize + cellSize * 0.5,
                    cellSize * 0.3, 0, Math.PI * 2
                );
                offCtx.fill();
            }

            // 终点
            offCtx.fillStyle = 'rgba(251, 191, 36, 0.3)';
            offCtx.beginPath();
            offCtx.arc(
                goal.x * cellSize + cellSize * 0.5,
                goal.y * cellSize + cellSize * 0.5,
                cellSize * 0.5, 0, Math.PI * 2
            );
            offCtx.fill();
            offCtx.fillStyle = '#fbbf24';
            offCtx.beginPath();
            offCtx.arc(
                goal.x * cellSize + cellSize * 0.5,
                goal.y * cellSize + cellSize * 0.5,
                cellSize * 0.35, 0, Math.PI * 2
            );
            offCtx.fill();

            // 玩家
            offCtx.fillStyle = '#ef4444';
            offCtx.beginPath();
            offCtx.arc(
                player.x * cellSize + cellSize * 0.5,
                player.y * cellSize + cellSize * 0.5,
                cellSize * 0.3, 0, Math.PI * 2
            );
            offCtx.fill();
            offCtx.fillStyle = 'rgba(255,255,255,0.4)';
            offCtx.beginPath();
            offCtx.arc(
                player.x * cellSize + cellSize * 0.35,
                player.y * cellSize + cellSize * 0.35,
                cellSize * 0.12, 0, Math.PI * 2
            );
            offCtx.fill();

            // ---- 2. 复制离屏画布到主画布 ----
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(offCanvas, 0, 0);

            // ---- 3. 专家模式：应用迷雾遮罩 ----
            if (fogMode) {
                const cx = player.x * cellSize + cellSize * 0.5;
                const cy = player.y * cellSize + cellSize * 0.5;
                const outerR = fogRadius * cellSize;
                const innerR = outerR * 0.65; // 内圈完全可见，过渡到外圈

                ctx.save();
                // 用 destination-in 将迷宫和迷雾叠加：中心透明 → 外圈实黑
                ctx.globalCompositeOperation = 'destination-in';
                const grad = ctx.createRadialGradient(cx, cy, innerR, cx, cy, outerR);
                grad.addColorStop(0, 'rgba(0,0,0,1)');
                grad.addColorStop(0.6, 'rgba(0,0,0,1)');
                grad.addColorStop(1, 'rgba(0,0,0,0)');
                ctx.fillStyle = grad;
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.restore();

                // 再覆盖一层深色半透明蒙版，外围完全黑
                ctx.save();
                ctx.globalCompositeOperation = 'source-over';
                const overlay = ctx.createRadialGradient(cx, cy, outerR * 0.7, cx, cy, outerR * 1.4);
                overlay.addColorStop(0, 'rgba(0,0,0,0)');
                overlay.addColorStop(1, 'rgba(8,8,30,0.92)');
                ctx.fillStyle = overlay;
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.restore();
            }
        }

        function movePlayer(dx, dy) {
            if (!gameActive) return;

            const nx = player.x + dx;
            const ny = player.y + dy;

            if (nx >= 0 && nx < maze[0].length && ny >= 0 && ny < maze.length && maze[ny][nx] === 0) {
                player.x = nx;
                player.y = ny;
                steps++;
                pathHistory.push({ x: nx, y: ny });
                stepsDisplay.textContent = steps;
                draw();
                pageAudio.play('move');

                // 检查是否到达终点
                if (player.x === goal.x && player.y === goal.y) {
                    gameWon();
                }
            }
        }

        function gameWon() {
            gameActive = false;
            stopTimer();

            const config = DIFFICULTY[difficulty];
            const minSteps = (config.cols - 1) + (config.rows - 2);

            // 评分
            let stars = '★';
            if (steps <= minSteps * 1.5) stars = '★★★';
            else if (steps <= minSteps * 2.5) stars = '★★';

            document.getElementById('finalTime').textContent = formatTime(seconds);
            document.getElementById('finalSteps').textContent = steps;
            document.getElementById('finalScore').textContent = stars;

            victoryOverlay.classList.add('show');
            pageAudio.play('win');
        }

        function showHint() {
            if (!gameActive) return;
            const config = DIFFICULTY[difficulty];
            const path = bfs(player.x, player.y, goal.x, goal.y);
            if (path && path.length > 1) {
                pageAudio.play('success');
                // 高亮前几步（在当前迷雾层上方绘制，1.5秒后随迷雾重绘消失）
                for (let i = 1; i < Math.min(5, path.length); i++) {
                    const p = path[i];
                    ctx.fillStyle = 'rgba(255, 215, 0, 0.7)';
                    ctx.beginPath();
                    ctx.arc(
                        p.x * config.cellSize + config.cellSize * 0.5,
                        p.y * config.cellSize + config.cellSize * 0.5,
                        config.cellSize * 0.25, 0, Math.PI * 2
                    );
                    ctx.fill();
                }
                setTimeout(draw, 1500);
            }
        }

        function bfs(sx, sy, ex, ey) {
            const rows = maze.length;
            const cols = maze[0].length;
            const visited = Array.from({length: rows}, () => Array(cols).fill(false));
            const parent = new Map();
            const queue = [{x: sx, y: sy}];
            visited[sy][sx] = true;

            const dirs = [[0,-1], [1,0], [0,1], [-1,0]];

            while (queue.length > 0) {
                const cur = queue.shift();
                if (cur.x === ex && cur.y === ey) {
                    // 回溯路径
                    const path = [];
                    let key = `${ex},${ey}`;
                    while (key) {
                        const [x, y] = key.split(',').map(Number);
                        path.unshift({x, y});
                        key = parent.get(key);
                    }
                    return path;
                }

                for (const [dx, dy] of dirs) {
                    const nx = cur.x + dx;
                    const ny = cur.y + dy;
                    const key = `${nx},${ny}`;

                    if (nx >= 0 && nx < cols && ny >= 0 && ny < rows &&
                        maze[ny][nx] === 0 && !visited[ny][nx]) {
                        visited[ny][nx] = true;
                        parent.set(key, `${cur.x},${cur.y}`);
                        queue.push({x: nx, y: ny});
                    }
                }
            }
            return null;
        }

        function solveMaze() {
            if (!gameActive) return;
            const path = bfs(player.x, player.y, goal.x, goal.y);
            if (path) {
                gameActive = false;
                stopTimer();
                pageAudio.play('success');
                const config = DIFFICULTY[difficulty];
                const fogMode = config.fog === true;

                // 专家模式：先去掉迷雾再画答案
                if (fogMode) {
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    ctx.drawImage(offCanvas, 0, 0);
                }

                // 画完整路径
                for (let i = 0; i < path.length; i++) {
                    const p = path[i];
                    const alpha = 0.3 + (i / path.length) * 0.4;
                    ctx.fillStyle = `rgba(251, 191, 36, ${alpha})`;
                    ctx.beginPath();
                    ctx.arc(
                        p.x * config.cellSize + config.cellSize * 0.5,
                        p.y * config.cellSize + config.cellSize * 0.5,
                        config.cellSize * 0.35, 0, Math.PI * 2
                    );
                    ctx.fill();
                }
                // 画玩家到终点
                ctx.fillStyle = '#ef4444';
                ctx.beginPath();
                ctx.arc(
                    goal.x * config.cellSize + config.cellSize * 0.5,
                    goal.y * config.cellSize + config.cellSize * 0.5,
                    config.cellSize * 0.3, 0, Math.PI * 2
                );
                ctx.fill();
            }
        }

        // 键盘控制
        document.addEventListener('keydown', (e) => {
            if (!gameActive) return;
            switch(e.key) {
                case 'ArrowUp': case 'w': case 'W': e.preventDefault(); movePlayer(0, -1); break;
                case 'ArrowDown': case 's': case 'S': e.preventDefault(); movePlayer(0, 1); break;
                case 'ArrowLeft': case 'a': case 'A': e.preventDefault(); movePlayer(-1, 0); break;
                case 'ArrowRight': case 'd': case 'D': e.preventDefault(); movePlayer(1, 0); break;
            }
        });

        // 触摸滑动
        let touchStartX = 0, touchStartY = 0;
        canvas.addEventListener('touchstart', (e) => {
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
            e.preventDefault();
        }, { passive: false });

        canvas.addEventListener('touchend', (e) => {
            if (!gameActive) return;
            if (!touchStartX || !touchStartY) return;
            const dx = e.changedTouches[0].clientX - touchStartX;
            const dy = e.changedTouches[0].clientY - touchStartY;
            if (Math.abs(dx) > Math.abs(dy)) {
                movePlayer(dx > 0 ? 1 : -1, 0);
            } else {
                movePlayer(0, dy > 0 ? 1 : -1);
            }
            touchStartX = 0;
            touchStartY = 0;
            e.preventDefault();
        }, { passive: false });

        // 初始化
        newMaze('easy');
