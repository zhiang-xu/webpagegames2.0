// 贪吃蛇游戏
class SnakeGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.gridSize = 20;
        // 先设置 canvas 尺寸，再计算 tileCount
        this.canvas.width = Math.min(600, window.innerWidth - 100);
        this.canvas.height = this.canvas.width;
        this.tileCount = this.canvas.width / this.gridSize;

        this.ui = GamePageUI.mount({ home: true, sound: true, homeHref: '../../index.html' });
        this.score = 0;
        this.highScore = parseInt(localStorage.getItem('snakeHighScore')) || 0;
        this.direction = { x: 0, y: 0 };
        this.nextDirection = { x: 0, y: 0 };
        this.snake = [];
        this.food = { x: 0, y: 0 };
        this.gameLoop = null;
        this.isRunning = false;
        this.isPaused = false;
        this.speed = 100;

        this.updateHighScoreDisplay();
        this.setupControls();
        this.setupDifficulty();
        this.reset();
    }

    setupControls() {
        document.addEventListener('keydown', (e) => {
            if (!this.isRunning) return;

            switch(e.key) {
                case 'ArrowUp':
                case 'w':
                case 'W':
                    this.changeDirection('up');
                    e.preventDefault();
                    break;
                case 'ArrowDown':
                case 's':
                case 'S':
                    this.changeDirection('down');
                    e.preventDefault();
                    break;
                case 'ArrowLeft':
                case 'a':
                case 'A':
                    this.changeDirection('left');
                    e.preventDefault();
                    break;
                case 'ArrowRight':
                case 'd':
                case 'D':
                    this.changeDirection('right');
                    e.preventDefault();
                    break;
                case ' ':
                    this.pause();
                    e.preventDefault();
                    break;
            }
        });

        let touchStartX = 0;
        let touchStartY = 0;

        this.canvas.addEventListener('touchstart', (e) => {
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
            e.preventDefault();
        }, { passive: false });

        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
        }, { passive: false });

        this.canvas.addEventListener('touchend', (e) => {
            if (!this.isRunning) return;

            const touchEndX = e.changedTouches[0].clientX;
            const touchEndY = e.changedTouches[0].clientY;

            const diffX = touchEndX - touchStartX;
            const diffY = touchEndY - touchStartY;

            if (Math.abs(diffX) > Math.abs(diffY)) {
                if (Math.abs(diffX) > 30) {
                    this.changeDirection(diffX > 0 ? 'right' : 'left');
                }
            } else {
                if (Math.abs(diffY) > 30) {
                    this.changeDirection(diffY > 0 ? 'down' : 'up');
                }
            }
        });
    }

    setupDifficulty() {
        const select = document.getElementById('difficulty');
        select.addEventListener('change', () => {
            switch(select.value) {
                case 'easy':
                    this.speed = 150;
                    break;
                case 'medium':
                    this.speed = 100;
                    break;
                case 'hard':
                    this.speed = 60;
                    break;
            }
        });
    }

    changeDirection(dir) {
        if (this.isPaused) return;

        const directions = {
            'up': { x: 0, y: -1 },
            'down': { x: 0, y: 1 },
            'left': { x: -1, y: 0 },
            'right': { x: 1, y: 0 }
        };

        const newDir = directions[dir];
        if (!newDir) return;

        if (this.direction.x + newDir.x === 0 && this.direction.y + newDir.y === 0) {
            return;
        }

        this.nextDirection = newDir;
    }

    start() {
        if (this.isRunning) return;

        this.isRunning = true;
        this.isPaused = false;
        this.direction = { x: 1, y: 0 };
        this.nextDirection = { x: 1, y: 0 };
        this.snake = [
            { x: 10, y: 10 },
            { x: 9, y: 10 },
            { x: 8, y: 10 }
        ];
        this.score = 0;
        this.updateScore();
        this.placeFood();
        this.hideGameOver();

        if (this.gameLoop) clearInterval(this.gameLoop);
        this.gameLoop = setInterval(() => this.update(), this.speed);
    }

    pause() {
        if (!this.isRunning) return;

        this.isPaused = !this.isPaused;

        if (this.isPaused) {
            clearInterval(this.gameLoop);
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.fillStyle = 'white';
            this.ctx.font = '30px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('\u5df2\u66ae\u505c', this.canvas.width / 2, this.canvas.height / 2);
        } else {
            this.gameLoop = setInterval(() => this.update(), this.speed);
        }
    }

    reset() {
        this.stop();
        this.snake = [
            { x: 10, y: 10 },
            { x: 9, y: 10 },
            { x: 8, y: 10 }
        ];
        this.direction = { x: 1, y: 0 };
        this.nextDirection = { x: 1, y: 0 };
        this.score = 0;
        this.updateScore();
        this.placeFood();
        this.draw();
    }

    restart() {
        this.reset();
        this.start();
    }

    stop() {
        if (this.gameLoop) {
            clearInterval(this.gameLoop);
            this.gameLoop = null;
        }
        this.isRunning = false;
        this.isPaused = false;
    }

    update() {
        if (this.isPaused) return;

        this.direction = this.nextDirection;
        this.ui.play('move');

        const head = {
            x: this.snake[0].x + this.direction.x,
            y: this.snake[0].y + this.direction.y
        };

        if (head.x < 0 || head.x >= this.tileCount ||
            head.y < 0 || head.y >= this.tileCount) {
            this.endGame();
            return;
        }

        for (let i = 0; i < this.snake.length; i++) {
            if (head.x === this.snake[i].x && head.y === this.snake[i].y) {
                this.endGame();
                return;
            }
        }

        this.snake.unshift(head);

        if (head.x === this.food.x && head.y === this.food.y) {
            this.score += 10;
            this.updateScore();
            this.ui.play('tap');
            this.placeFood();

            if (this.speed > 40 && this.score % 50 === 0) {
                clearInterval(this.gameLoop);
                this.speed -= 5;
                this.gameLoop = setInterval(() => this.update(), this.speed);
            }
        } else {
            this.snake.pop();
        }

        this.draw();
    }

    draw() {
        this.ctx.fillStyle = '#1a1a2e';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        for (let i = 0; i <= this.tileCount; i++) {
            this.ctx.beginPath();
            this.ctx.moveTo(i * this.gridSize, 0);
            this.ctx.lineTo(i * this.gridSize, this.canvas.height);
            this.ctx.stroke();

            this.ctx.beginPath();
            this.ctx.moveTo(0, i * this.gridSize);
            this.ctx.lineTo(this.canvas.width, i * this.gridSize);
            this.ctx.stroke();
        }

        this.ctx.fillStyle = '#ff6b6b';
        this.ctx.beginPath();
        this.ctx.arc(
            this.food.x * this.gridSize + this.gridSize / 2,
            this.food.y * this.gridSize + this.gridSize / 2,
            this.gridSize / 2 - 2,
            0,
            Math.PI * 2
        );
        this.ctx.fill();

        this.snake.forEach((segment, index) => {
            const gradient = this.ctx.createRadialGradient(
                segment.x * this.gridSize + this.gridSize / 2,
                segment.y * this.gridSize + this.gridSize / 2,
                0,
                segment.x * this.gridSize + this.gridSize / 2,
                segment.y * this.gridSize + this.gridSize / 2,
                this.gridSize / 2
            );

            if (index === 0) {
                gradient.addColorStop(0, '#667eea');
                gradient.addColorStop(1, '#4a5568');
            } else {
                gradient.addColorStop(0, '#764ba2');
                gradient.addColorStop(1, '#5a67d8');
            }

            this.ctx.fillStyle = gradient;
            this.ctx.beginPath();
            this.ctx.roundRect(
                segment.x * this.gridSize + 1,
                segment.y * this.gridSize + 1,
                this.gridSize - 2,
                this.gridSize - 2,
                5
            );
            this.ctx.fill();

            if (index === 0) {
                this.ctx.fillStyle = 'white';
                const eyeSize = 4;
                const eyeOffset = 5;

                let eye1X, eye1Y, eye2X, eye2Y;

                if (this.direction.x === 1) {
                    eye1X = segment.x * this.gridSize + this.gridSize - eyeOffset;
                    eye1Y = segment.y * this.gridSize + eyeOffset;
                    eye2X = segment.x * this.gridSize + this.gridSize - eyeOffset;
                    eye2Y = segment.y * this.gridSize + this.gridSize - eyeOffset;
                } else if (this.direction.x === -1) {
                    eye1X = segment.x * this.gridSize + eyeOffset;
                    eye1Y = segment.y * this.gridSize + eyeOffset;
                    eye2X = segment.x * this.gridSize + eyeOffset;
                    eye2Y = segment.y * this.gridSize + this.gridSize - eyeOffset;
                } else if (this.direction.y === -1) {
                    eye1X = segment.x * this.gridSize + eyeOffset;
                    eye1Y = segment.y * this.gridSize + eyeOffset;
                    eye2X = segment.x * this.gridSize + this.gridSize - eyeOffset;
                    eye2Y = segment.y * this.gridSize + eyeOffset;
                } else {
                    eye1X = segment.x * this.gridSize + eyeOffset;
                    eye1Y = segment.y * this.gridSize + this.gridSize - eyeOffset;
                    eye2X = segment.x * this.gridSize + this.gridSize - eyeOffset;
                    eye2Y = segment.y * this.gridSize + this.gridSize - eyeOffset;
                }

                this.ctx.beginPath();
                this.ctx.arc(eye1X, eye1Y, eyeSize, 0, Math.PI * 2);
                this.ctx.arc(eye2X, eye2Y, eyeSize, 0, Math.PI * 2);
                this.ctx.fill();
            }
        });
    }

    placeFood() {
        let validPosition = false;

        while (!validPosition) {
            this.food = {
                x: Math.floor(Math.random() * this.tileCount),
                y: Math.floor(Math.random() * this.tileCount)
            };

            validPosition = true;
            for (let segment of this.snake) {
                if (segment.x === this.food.x && segment.y === this.food.y) {
                    validPosition = false;
                    break;
                }
            }
        }
    }

    updateScore() {
        document.getElementById('score').textContent = this.score;

        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('snakeHighScore', this.highScore);
            this.updateHighScoreDisplay();
        }
    }

    updateHighScoreDisplay() {
        document.getElementById('highScore').textContent = this.highScore;
    }

    endGame() {
        this.stop();
        this.ui.play('lose');

        document.getElementById('finalScore').textContent = this.score;
        document.getElementById('gameOverOverlay').classList.add('show');
    }

    hideGameOver() {
        document.getElementById('gameOverOverlay').classList.remove('show');
    }
}

// 初始化游戏
const game = new SnakeGame();
