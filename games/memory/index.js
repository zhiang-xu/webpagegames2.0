        const pageAudio = window.GamePageUI.mount({ home: true, sound: true, muted: false });
        const EMOJIS = ['🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐮','🐷','🐸','🐵','🐔'];

        const DIFFICULTY = {
            easy:   { rows: 4, cols: 4, pairs: 8 },
            medium: { rows: 4, cols: 5, pairs: 10 },
            hard:   { rows: 4, cols: 6, pairs: 12 }
        };

        let difficulty = 'easy';
        let cards = [];
        let flippedCards = [];
        let matchedPairs = 0;
        let moves = 0;
        let timer = null;
        let seconds = 0;
        let gameStarted = false;
        let gameWon = false;

        const grid = document.getElementById('gameGrid');
        const movesEl = document.getElementById('moves');
        const timeEl = document.getElementById('time');
        const pairsEl = document.getElementById('pairs');

        function shuffle(array) {
            const arr = [...array];
            for (let i = arr.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [arr[i], arr[j]] = [arr[j], arr[i]];
            }
            return arr;
        }

        function formatTime(s) {
            const m = Math.floor(s / 60);
            const sec = s % 60;
            return String(m).padStart(2, '0') + ':' + String(sec).padStart(2, '0');
        }

        function setDifficulty(diff) {
            difficulty = diff;
            document.querySelectorAll('.btn-diff').forEach(btn => btn.classList.remove('active'));
            document.querySelector('.btn-diff.' + diff).classList.add('active');
            initGame();
            pageAudio.play('tap');
        }

        function startTimer() {
            if (gameStarted) return;
            gameStarted = true;
            seconds = 0;
            timer = setInterval(() => {
                seconds++;
                timeEl.textContent = formatTime(seconds);
            }, 1000);
        }

        function stopTimer() {
            clearInterval(timer);
        }

        function initGame() {
            stopTimer();
            gameStarted = false;
            gameWon = false;
            flippedCards = [];
            matchedPairs = 0;
            moves = 0;
            seconds = 0;

            movesEl.textContent = '0';
            timeEl.textContent = '00:00';

            const config = DIFFICULTY[difficulty];
            pairsEl.textContent = `0/${config.pairs}`;

            // 设置网格
            grid.style.gridTemplateColumns = `repeat(${config.cols}, 1fr)`;

            // 选择并复制emoji
            const selected = shuffle(EMOJIS).slice(0, config.pairs);
            const doubled = shuffle([...selected, ...selected]);

            // 创建卡片
            grid.innerHTML = '';
            doubled.forEach((emoji, i) => {
                const card = document.createElement('div');
                card.className = 'card';
                card.dataset.index = i;
                card.dataset.emoji = emoji;

                const inner = document.createElement('div');
                inner.className = 'card-inner';

                const front = document.createElement('div');
                front.className = 'card-front';
                front.textContent = '🃏';

                const back = document.createElement('div');
                back.className = 'card-back emoji-' + ((i % 8) + 1);
                back.textContent = emoji;

                inner.appendChild(front);
                inner.appendChild(back);
                card.appendChild(inner);

                card.addEventListener('click', () => flipCard(card));
                grid.appendChild(card);
            });

            document.getElementById('victory').classList.remove('show');
            pageAudio.play('start');
        }

        function flipCard(card) {
            if (gameWon) return;
            if (flippedCards.length >= 2) return;
            if (card.classList.contains('flipped')) return;

            startTimer();

            card.classList.add('flipped');
            flippedCards.push(card);
            pageAudio.play('select');

            if (flippedCards.length === 2) {
                moves++;
                movesEl.textContent = moves;

                const [c1, c2] = flippedCards;
                if (c1.dataset.emoji === c2.dataset.emoji) {
                    // 配对成功
                    c1.classList.add('matched');
                    c2.classList.add('matched');
                    pageAudio.play('success');
                    matchedPairs++;
                    const config = DIFFICULTY[difficulty];
                    pairsEl.textContent = `${matchedPairs}/${config.pairs}`;
                    flippedCards = [];

                    if (matchedPairs === config.pairs) {
                        gameWon = true;
                        stopTimer();
                        setTimeout(() => showVictory(), 500);
                    }
                } else {
                    // 配对失败
                    pageAudio.play('error');
                    setTimeout(() => {
                        c1.classList.remove('flipped');
                        c2.classList.remove('flipped');
                        flippedCards = [];
                    }, 1000);
                }
            }
        }

        function showVictory() {
            document.getElementById('finalTime').textContent = formatTime(seconds);
            document.getElementById('finalMoves').textContent = moves;

            // 评分
            const config = DIFFICULTY[difficulty];
            const idealMoves = config.pairs;
            let stars = '★';
            if (moves <= idealMoves * 1.5) stars = '★★★';
            else if (moves <= idealMoves * 2) stars = '★★';

            document.getElementById('finalScore').textContent = stars;
            document.getElementById('victory').classList.add('show');
            pageAudio.play('win');
        }

        // 初始化
        initGame();
