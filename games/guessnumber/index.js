        const pageAudio = window.GamePageUI.mount({ home: true, sound: true, muted: false });
        const DIFFICULTY = {
            easy:   { max: 50,  name: '简单',  bestLabel: '1-50' },
            medium: { max: 100, name: '中等',  bestLabel: '1-100' },
            hard:   { max: 200, name: '困难',  bestLabel: '1-200' }
        };

        let difficulty = 'easy';
        let targetNumber = 0;
        let attempts = 0;
        let gameActive = false;
        let bestScores = JSON.parse(localStorage.getItem('guessNumberBest') || '{}');

        const attemptsEl = document.getElementById('attemptsDisplay');
        const bestEl = document.getElementById('bestDisplay');
        const rangeEl = document.getElementById('rangeDisplay');
        const hintEl = document.getElementById('hintText');
        const inputEl = document.getElementById('guessInput');
        const guessBtn = document.getElementById('guessBtn');
        const historyEl = document.getElementById('guessesHistory');
        const victoryOverlay = document.getElementById('victory');
        const numberPad = document.getElementById('numberPad');

        function updateBestDisplay() {
            const key = DIFFICULTY[difficulty].bestLabel;
            if (bestScores[key] !== undefined) {
                bestEl.textContent = bestScores[key];
            } else {
                bestEl.textContent = '—';
            }
        }

        function renderNumberPad() {
            numberPad.innerHTML = '';
            for (let i = 1; i <= 9; i++) {
                const btn = document.createElement('button');
                btn.className = 'num-btn';
                btn.textContent = i;
                btn.addEventListener('click', () => appendNumber(i));
                numberPad.appendChild(btn);
            }
            // 0
            const btn0 = document.createElement('button');
            btn0.className = 'num-btn';
            btn0.textContent = '0';
            btn0.addEventListener('click', () => appendNumber(0));
            numberPad.appendChild(btn0);
            // 清除
            const clearBtn = document.createElement('button');
            clearBtn.className = 'num-btn clear';
            clearBtn.textContent = '⌫';
            clearBtn.addEventListener('click', () => {
                inputEl.value = inputEl.value.slice(0, -1);
                inputEl.focus();
                pageAudio.play('tap');
            });
            numberPad.appendChild(clearBtn);
            // 提交
            const submitBtn = document.createElement('button');
            submitBtn.className = 'num-btn submit';
            submitBtn.textContent = '✅';
            submitBtn.addEventListener('click', makeGuess);
            numberPad.appendChild(submitBtn);
        }

        function appendNumber(num) {
            if (!gameActive) return;
            inputEl.value += num;
            inputEl.focus();
            pageAudio.play('tap');
        }

        function startGame() {
            gameActive = true;
            inputEl.disabled = false;
            guessBtn.disabled = false;
            hintEl.textContent = '开始猜吧！';
            hintEl.className = 'hint-text';
            pageAudio.play('start');
            inputEl.focus();
        }

        function newGame(diff) {
            difficulty = diff;
            document.querySelectorAll('.btn-diff').forEach(btn => btn.classList.remove('active'));
            document.querySelector('.btn-diff.' + diff).classList.add('active');

            targetNumber = Math.floor(Math.random() * DIFFICULTY[diff].max) + 1;
            attempts = 0;
            gameActive = false;

            rangeEl.textContent = `1 ~ ${DIFFICULTY[diff].max}`;
            hintEl.textContent = '\u70b9\u51fb"\u5f00\u59cb\u6e38\u620f"\u6309\u94ae\u5f00\u59cb';
            hintEl.className = 'hint-text';
            inputEl.value = '';
            inputEl.disabled = true;
            guessBtn.disabled = true;
            historyEl.innerHTML = '';
            victoryOverlay.classList.remove('show');
            updateBestDisplay();
            updateAttempts();
        }

        function updateAttempts() {
            attemptsEl.textContent = attempts;
        }

        function addHistory(num) {
            const tag = document.createElement('span');
            tag.className = 'guess-tag';
            tag.textContent = num;
            historyEl.appendChild(tag);
            historyEl.scrollTop = historyEl.scrollHeight;
        }

        function makeGuess() {
            if (!gameActive) return;

            const guess = parseInt(inputEl.value);
            if (isNaN(guess) || guess < 1 || guess > DIFFICULTY[difficulty].max) {
                hintEl.textContent = '请输入 ' + DIFFICULTY[difficulty].max + ' 以内的数字！';
                hintEl.className = 'hint-text wrong';
                pageAudio.play('error');
                return;
            }

            attempts++;
            updateAttempts();
            addHistory(guess);

            if (guess === targetNumber) {
                gameWon();
            } else if (guess < targetNumber) {
                hintEl.textContent = '📈 太小了！再大一点～';
                hintEl.className = 'hint-text';
                inputEl.value = '';
                inputEl.focus();
                pageAudio.play('move');
            } else {
                hintEl.textContent = '📉 太大了！再小一点～';
                hintEl.className = 'hint-text';
                inputEl.value = '';
                inputEl.focus();
                pageAudio.play('move');
            }
        }

        function gameWon() {
            gameActive = false;
            inputEl.disabled = true;
            guessBtn.disabled = true;

            // 保存最佳成绩
            const key = DIFFICULTY[difficulty].bestLabel;
            if (bestScores[key] === undefined || attempts < bestScores[key]) {
                bestScores[key] = attempts;
                localStorage.setItem('guessNumberBest', JSON.stringify(bestScores));
            }

            // 评分
            const max = DIFFICULTY[difficulty].max;
            const ideal = Math.ceil(Math.log2(max)); // 二分法最优次数
            let stars = '★';
            if (attempts <= ideal + 2) stars = '★★★';
            else if (attempts <= ideal + 5) stars = '★★';

            document.getElementById('targetNumber').textContent = targetNumber;
            document.getElementById('finalAttempts').textContent = attempts;
            document.getElementById('finalScore').textContent = stars;

            victoryOverlay.classList.add('show');
            pageAudio.play('win');
        }

        // 回车提交
        inputEl.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') makeGuess();
        });

        // 初始化
        renderNumberPad();
        newGame('easy');
