        const pageAudio = window.GamePageUI.mount({ home: true, sound: true, muted: false });
        const DIFFICULTY = {
            easy:   { cols: 10, rows: 10, cellSize: 36 },
            medium: { cols: 15, rows: 15, cellSize: 28 },
            hard:   { cols: 20, rows: 20, cellSize: 22 }
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

        function newMaze(diff) {
            difficulty = diff;
            document.querySelectorAll('.btn-diff').forEach(btn => btn.classList.remove('active'));
            document.querySelector('.btn-diff.' + diff).classList.add('active');

            const config = DIFFICULTY[diff];

            // 生成迷宫
            maze = generateMaze(config.cols, config.rows);

            // 设置玩家和终点
            player = { x: 0, y: 0 };
            goal = { x: config.cols - 1, y: config.rows - 1 };
            steps = 0;
            pathHistory = [{ x: 0, y: 0 }];
            gameActive = true;

            // 设置画布尺寸
            canvas.width = config.cols * config.cellSize;
            canvas.height = config.rows * config.cellSize;

            stopTimer();
            timeDisplay.textContent = '00:00';
            stepsDisplay.textContent = '0';
            victoryOverlay.classList.remove('show');

            draw();
            startTimer();
            pageAudio.play('start');
        }

        function generateMaze(cols, rows) {
            // 初始化全墙
            const m = Array.from({length: rows}, () => Array(cols).fill(1));

            // DFS递归回溯生成迷宫
            const stack = [{x: 0, y: 0}];
            m[0][0] = 0;

            const directions = [
                {dx: 0, dy: -2}, // 上
                {dx: 2, dy: 0},  // 右
                {dx: 0, dy: 2},  // 下
                {dx: -2, dy: 0}  // 左
            ];

            while (stack.length > 0) {
                const current = stack[stack.length - 1];
                const dirs = shuffle([...directions]);
                let found = false;

                for (const dir of dirs) {
                    const nx = current.x + dir.dx;
                    const ny = current.y + dir.dy;

                    if (nx > 0 && nx < cols - 1 && ny > 0 && ny < rows - 1 && m[ny][nx] === 1) {
                        m[ny][nx] = 0;
                        m[current.y + dir.dy / 2][current.x + dir.dx / 2] = 0;
                        stack.push({x: nx, y: ny});
                        found = true;
                        break;
                    }
                }

                if (!found) stack.pop();
            }

            // 确保起点和终点是通的
            m[0][0] = 0;
            m[rows - 1][cols - 1] = 0;

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

        function draw() {
            const config = DIFFICULTY[difficulty];
            const cellSize = config.cellSize;

            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // 画墙壁和路径
            for (let y = 0; y < maze.length; y++) {
                for (let x = 0; x < maze[y].length; x++) {
                    if (maze[y][x] === 1) {
                        // 墙壁
                        const gradient = ctx.createRadialGradient(
                            x * cellSize + cellSize * 0.3, y * cellSize + cellSize * 0.3, 0,
                            x * cellSize + cellSize * 0.5, y * cellSize + cellSize * 0.5, cellSize * 0.6
                        );
                        gradient.addColorStop(0, '#667eea');
                        gradient.addColorStop(1, '#4a5568');
                        ctx.fillStyle = gradient;
                        ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);

                        // 墙壁高光
                        ctx.fillStyle = 'rgba(255,255,255,0.1)';
                        ctx.fillRect(x * cellSize, y * cellSize, cellSize, 2);
                        ctx.fillRect(x * cellSize, y * cellSize, 2, cellSize);
                    } else {
                        // 路径
                        ctx.fillStyle = '#f8fafc';
                        ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
                        ctx.strokeStyle = 'rgba(203, 213, 225, 0.5)';
                        ctx.lineWidth = 0.5;
                        ctx.strokeRect(x * cellSize, y * cellSize, cellSize, cellSize);
                    }
                }
            }

            // 画路径历史
            for (let i = 0; i < pathHistory.length; i++) {
                const p = pathHistory[i];
                const alpha = 0.15 + (i / pathHistory.length) * 0.2;
                ctx.fillStyle = `rgba(78, 205, 196, ${alpha})`;
                ctx.beginPath();
                ctx.arc(
                    p.x * cellSize + cellSize * 0.5,
                    p.y * cellSize + cellSize * 0.5,
                    cellSize * 0.3, 0, Math.PI * 2
                );
                ctx.fill();
            }

            // 画终点
            ctx.fillStyle = '#fbbf24';
            ctx.beginPath();
            ctx.arc(
                goal.x * cellSize + cellSize * 0.5,
                goal.y * cellSize + cellSize * 0.5,
                cellSize * 0.35, 0, Math.PI * 2
            );
            ctx.fill();

            // 终点光晕
            ctx.fillStyle = 'rgba(251, 191, 36, 0.3)';
            ctx.beginPath();
            ctx.arc(
                goal.x * cellSize + cellSize * 0.5,
                goal.y * cellSize + cellSize * 0.5,
                cellSize * 0.5, 0, Math.PI * 2
            );
            ctx.fill();

            // 画玩家
            ctx.fillStyle = '#ef4444';
            ctx.beginPath();
            ctx.arc(
                player.x * cellSize + cellSize * 0.5,
                player.y * cellSize + cellSize * 0.5,
                cellSize * 0.3, 0, Math.PI * 2
            );
            ctx.fill();

            // 玩家高光
            ctx.fillStyle = 'rgba(255,255,255,0.4)';
            ctx.beginPath();
            ctx.arc(
                player.x * cellSize + cellSize * 0.35,
                player.y * cellSize + cellSize * 0.35,
                cellSize * 0.12, 0, Math.PI * 2
            );
            ctx.fill();
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
            const minSteps = config.cols + config.rows - 2; // 理论最小步数

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
            const path = bfs(player.x, player.y, goal.x, goal.y);
            if (path && path.length > 1) {
                pageAudio.play('success');
                // 高亮前几步
                const config = DIFFICULTY[difficulty];
                for (let i = 1; i < Math.min(5, path.length); i++) {
                    const p = path[i];
                    ctx.fillStyle = 'rgba(255, 215, 0, 0.6)';
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
            const path = bfs(0, 0, goal.x, goal.y);
            if (path) {
                gameActive = false;
                stopTimer();
                pageAudio.play('success');
                // 画完整路径
                const config = DIFFICULTY[difficulty];
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
