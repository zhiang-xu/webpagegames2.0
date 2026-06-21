        const pageAudio = window.GamePageUI.mount({ home: true, sound: true, muted: false });
        const DIFFICULTY = {
            easy:   { max: 10, operations: ['+', '-'], time: 30, timeDecay: 0 },
            medium: { max: 20, operations: ['+', '-', '×'], time: 25, timeDecay: 1 },
            hard:   { max: 50, operations: ['+', '-', '×', '÷'], time: 20, timeDecay: 2 }
        };

        let difficulty = 'easy';
        let score = 0;
        let level = 1;
        let streak = 0;
        let timeLeft = 30;
        let timeTimer = null;
        let currentAnswer = 0;
        let gameActive = false;

        const scoreEl = document.getElementById('score');
        const levelEl = document.getElementById('level');
        const streakEl = document.getElementById('streak');
        const timeEl = document.getElementById('timeLeft');
        const equationEl = document.getElementById('equation');
        const operationEl = document.getElementById('operation');
        const inputEl = document.getElementById('answerInput');
        const feedbackEl = document.getElementById('feedback');
        const progressBar = document.getElementById('progressBar');

        function setDifficulty(diff) {
            difficulty = diff;
            document.querySelectorAll('.btn-diff').forEach(btn => btn.classList.remove('active'));
            document.querySelector('.btn-diff.' + diff).classList.add('active');
            pageAudio.play('tap');
            resetGame();
        }

        function resetGame() {
            score = 0;
            level = 1;
            streak = 0;
            timeLeft = DIFFICULTY[difficulty].time;
            gameActive = true;
            stopTimer();
            updateDisplay();
            generateQuestion();
            inputEl.value = '';
            inputEl.classList.remove('correct', 'wrong');
            feedbackEl.textContent = '';
            timeEl.textContent = timeLeft;
            progressBar.style.width = '100%';
            startTimer();
            pageAudio.play('start');
        }

        function startTimer() {
            if (timeTimer) return;
            const baseTime = DIFFICULTY[difficulty].time;
            const timeDecay = DIFFICULTY[difficulty].timeDecay;
            timeTimer = setInterval(() => {
                timeLeft--;
                timeEl.textContent = timeLeft;
                const pct = (timeLeft / baseTime) * 100;
                progressBar.style.width = Math.max(0, pct) + '%';

                if (timeLeft <= 0) {
                    clearInterval(timeTimer);
                    timeOut();
                }
            }, 1000);
        }

        function stopTimer() {
            clearInterval(timeTimer);
            timeTimer = null;
        }

        function timeOut() {
            gameActive = false;
            streak = 0;
            showFeedback('⏰ 时间到！', 'wrong');
            inputEl.classList.add('wrong');
            pageAudio.play('error');
            generateQuestion();
            setTimeout(() => {
                inputEl.classList.remove('wrong');
                timeLeft = DIFFICULTY[difficulty].time;
                timeEl.textContent = timeLeft;
                progressBar.style.width = '100%';
                startTimer();
                gameActive = true;
            }, 1500);
        }

        function randomInt(max) {
            return Math.floor(Math.random() * (max + 1));
        }

        function generateQuestion() {
            const config = DIFFICULTY[difficulty];
            const ops = config.operations;
            const op = ops[randomInt(ops.length - 1)];
            const a = randomInt(config.max);
            const b = randomInt(config.max);

            let equation, answer;

            switch(op) {
                case '+':
                    equation = `${a} + ${b}`;
                    answer = a + b;
                    break;
                case '-':
                    // 确保结果非负
                    const maxSub = Math.max(a, b);
                    const minSub = Math.min(a, b);
                    equation = `${maxSub} − ${minSub}`;
                    answer = maxSub - minSub;
                    break;
                case '×':
                    const maxMul = Math.min(config.max, 12);
                    equation = `${randomInt(maxMul)} × ${randomInt(maxMul)}`;
                    answer = eval(equation);
                    break;
                case '÷':
                    // 确保整除
                    const divisor = randomInt(9) + 1;
                    const quotient = randomInt(Math.min(config.max / divisor, 12));
                    equation = `${divisor * quotient} ÷ ${divisor}`;
                    answer = quotient;
                    break;
            }

            const opNames = { '+': '加法', '-': '减法', '×': '乘法', '÷': '除法' };
            operationEl.textContent = opNames[op];
            equationEl.textContent = equation + ' = ?';
            currentAnswer = answer;

            inputEl.value = '';
            inputEl.focus();
        }

        function checkAnswer() {
            if (!gameActive) return;

            const userAnswer = parseFloat(inputEl.value);

            if (isNaN(userAnswer)) {
                inputEl.classList.add('wrong');
                pageAudio.play('error');
                setTimeout(() => inputEl.classList.remove('wrong'), 500);
                return;
            }

            if (userAnswer === currentAnswer) {
                // 正确
                gameActive = false;
                stopTimer();

                // 计算得分：基础分 + 时间奖励 + 连击奖励
                const basePoints = 10;
                const timeBonus = Math.floor(timeLeft / 2);
                const streakBonus = streak * 2;
                const points = basePoints + timeBonus + streakBonus;

                score += points;
                streak++;

                // 每5题升级
                const questionsAnswered = Math.floor(score / 10);
                level = Math.min(10, Math.floor(questionsAnswered / 5) + 1);

                showFeedback('✅ 正确！ +' + points, 'correct');
                inputEl.classList.add('correct');
                pageAudio.play('success');

                // 检查是否升级
                if (level > 1 && score % 50 < 20) {
                    showFeedback('🎉 升级了！现在是等级 ' + level, 'correct');
                }

                generateQuestion();
                setTimeout(() => {
                    inputEl.classList.remove('correct');
                    feedbackEl.textContent = '';
                    timeLeft = DIFFICULTY[difficulty].time;
                    timeEl.textContent = timeLeft;
                    progressBar.style.width = '100%';
                    startTimer();
                    gameActive = true;
                }, 1200);
            } else {
                // 错误
                streak = 0;
                showFeedback('❌ 答案是 ' + currentAnswer, 'wrong');
                inputEl.classList.add('wrong');
                pageAudio.play('error');
                generateQuestion();
                setTimeout(() => {
                    inputEl.classList.remove('wrong');
                    feedbackEl.textContent = '';
                    timeLeft = DIFFICULTY[difficulty].time;
                    timeEl.textContent = timeLeft;
                    progressBar.style.width = '100%';
                    startTimer();
                    gameActive = true;
                }, 1500);
            }

            updateDisplay();
        }

        function skipQuestion() {
            if (!gameActive) return;
            gameActive = false;
            stopTimer();
            streak = 0;
            pageAudio.play('tap');
            showFeedback('⏭ 答案是 ' + currentAnswer, 'wrong');
            inputEl.classList.add('wrong');
            generateQuestion();
            setTimeout(() => {
                inputEl.classList.remove('wrong');
                feedbackEl.textContent = '';
                timeLeft = DIFFICULTY[difficulty].time;
                timeEl.textContent = timeLeft;
                progressBar.style.width = '100%';
                startTimer();
                gameActive = true;
            }, 1500);
            updateDisplay();
        }

        function showFeedback(text, type) {
            feedbackEl.textContent = text;
            feedbackEl.className = 'feedback ' + type;
        }

        function updateDisplay() {
            scoreEl.textContent = score;
            levelEl.textContent = level;
            streakEl.textContent = streak;
        }

        // 回车提交
        inputEl.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') checkAnswer();
        });

        // 初始化
        resetGame();
