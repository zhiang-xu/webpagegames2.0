(function () {
    var pageAudio = window.GamePageUI.mount({ home: true, sound: true, muted: false });

    // ===================== 规则内容 =====================
    var RULES = {
        bigsmall: '🎯 掷三颗骰子，猜测「大」（4-17点）或「小」（3-10点）。<br>豹子（三个相同）通吃，大小皆输！',
        compare: '🎮 掷三颗骰子比大小，点数大者获胜。<br>点数相同时为平局。',
        oddeven: '🎯 掷三颗骰子，猜测点数「单」或「双」。<br>3颗骰子之和为单数或双数。',
        dice21: '🎲 掷骰子，累积点数尽量接近21点。<br>超过21点爆掉，直接输。掷到21点立刻获胜！',
    };

    function showRules(mode) {
        var el = document.getElementById('rulesContent');
        if (el) el.innerHTML = RULES[mode] || '';
    }

    // ===================== 骰子 DOM 渲染 =====================
    var DOT_PATTERNS = {
        1: [4],
        2: [0, 8],
        3: [0, 4, 8],
        4: [0, 2, 6, 8],
        5: [0, 2, 4, 6, 8],
        6: [0, 2, 3, 5, 6, 8],
    };

    function createDieEl(value) {
        var el = document.createElement('div');
        el.className = 'die';
        el.setAttribute('data-face', value);
        for (var i = 0; i < 9; i++) {
            var dot = document.createElement('div');
            dot.className = 'dot' + (DOT_PATTERNS[value].indexOf(i) > -1 ? ' on' : '');
            el.appendChild(dot);
        }
        return el;
    }

    function renderDiceStatic(container, values) {
        container.innerHTML = '';
        for (var i = 0; i < values.length; i++) {
            var el = createDieEl(values[i]);
            el.classList.add('placed');
            container.appendChild(el);
        }
    }

    function rollDie() { return 1 + Math.floor(Math.random() * 6); }

    // ===================== 骰子物理动画 =====================

    /**
     * 核心骰子动画引擎：逐帧requestAnimationFrame控制
     * - 翻滚阶段：骰子显示空白面，随机旋转
     * - 弹跳阶段：骰子弹跳+旋转，逐渐变慢
     * - 定住阶段：最后一帧闪现最终点数
     */
    function animateRoll(container, finalValues, totalDuration, onDone) {
        container.innerHTML = '';

        var numDice   = finalValues.length;
        var diceW     = 64;
        var gap       = 10;
        var totalW    = numDice * diceW + (numDice - 1) * gap;

        // 每颗骰子的物理参数
        var diceStates = [];
        for (var i = 0; i < numDice; i++) {
            var finalLeft = (totalW / 2) - (diceW / 2) - i * (diceW + gap);
            diceStates.push({
                finalLeft: finalLeft,
                // 翻滚阶段
                spinAngle:    Math.random() * Math.PI * 2,
                spinSpeed:    0.18 + Math.random() * 0.12,   // 角速度（弧度/帧）
                spinDir:      Math.random() > 0.5 ? 1 : -1,
                // 弹跳阶段
                vx:           (Math.random() - 0.5) * 2.5,
                vy:           -(3.5 + Math.random() * 2.5),
                gravity:      0.18,
                // 落点偏移（碗内）
                finalX:       finalLeft + (Math.random() - 0.5) * 20,
                finalY:       0,
                // 随机量
                bounceScale:  0.55 + Math.random() * 0.3,     // 弹跳高度因子
                delay:        i * 55,                         // 错开落碗时间
                // 轨迹关键点（预计算弹道曲线，让每次弹跳方向/高度不同）
                bounceX:       [],
                bounceY:       [],
            });
        }

        // 为每颗骰子预生成 3 段弹道的关键帧（用于曲线动画）
        for (var k = 0; k < diceStates.length; k++) {
            var s = diceStates[k];
            // 预计算最终位置周围的散布
            s.finalX = s.finalLeft + (Math.random() - 0.5) * 16;
        }

        // 空白骰子面（不显示点数）
        function createBlankDie() {
            var el = document.createElement('div');
            el.className = 'die die-anim';
            for (var i = 0; i < 9; i++) {
                var dot = document.createElement('div');
                dot.className = 'dot';
                el.appendChild(dot);
            }
            return el;
        }

        // 创建骰子DOM
        var els = [];
        for (var i = 0; i < numDice; i++) {
            var el = createBlankDie();
            el.style.position = 'absolute';
            el.style.left = '50%';
            el.style.top  = '50%';
            el.style.transform = 'translate(-50%, -50%)';
            el.style.opacity = '0';
            container.appendChild(el);
            els.push(el);
        }

        var startTime  = null;
        var running     = true;
        var settled     = new Array(numDice).fill(false);
        var revealTimer = null;

        // 弹道预计算：每个骰子预先生成一系列 (x,y,rot) 目标点
        // 分段：下落(0→0.35) → 弹跳(0.35→0.85) → 静止(0.85→1)
        var TRAJ_STEPS = 80;
        var trajectories = diceStates.map(function (s) {
            var pts = [];
            var trayW  = container.offsetWidth  || 280;
            var trayH  = container.offsetHeight || 100;
            var bottomY = trayH / 2 - diceW / 2;   // 碗底部y（向上为正）
            var startY = -(trayH / 2 + 20);         // 碗上方起点

            // 初始旋转角度
            var rot = s.spinAngle;
            var x   = s.finalX;
            var y   = startY;
            var phase = 0; // 0=下落, 1=弹跳, 2=静止

            for (var t = 0; t <= TRAJ_STEPS; t++) {
                var nt = t / TRAJ_STEPS;

                if (nt < 0.30) {
                    // 下落阶段：快速旋转着掉入碗
                    var pt = nt / 0.30;
                    y = startY + (bottomY - startY) * easeOutBounce(pt);
                    rot += s.spinSpeed * 3 * s.spinDir;
                    x = s.finalX + Math.sin(pt * Math.PI * 2) * 15;
                } else if (nt < 0.80) {
                    // 弹跳阶段：3次弹跳，逐渐停止
                    var pt = (nt - 0.30) / 0.50;
                    var b3 = easeOutBounce(pt);
                    y = bottomY * b3;
                    // 弹跳时左右晃
                    x = s.finalX + Math.sin(pt * Math.PI * 4) * 12 * (1 - pt);
                    // 旋转逐渐减速
                    rot += s.spinSpeed * (1 - pt * 0.85) * 2 * s.spinDir;
                } else {
                    // 静止阶段：微震后定住
                    var pt = (nt - 0.80) / 0.20;
                    y = 0;
                    x = s.finalX * (1 - pt) + s.finalX * pt; // 收敛到finalX
                    rot += s.spinDir * 0.02 * (1 - pt);
                }

                pts.push({ x: x, y: y, rot: rot, scale: 1 });
            }
            return pts;
        });

        function getPos(diceIdx, progress) {
            var pts  = trajectories[diceIdx];
            var s    = diceStates[diceIdx];
            var pt   = Math.min(progress, 1);
            var idx  = Math.min(Math.floor(pt * TRAJ_STEPS), TRAJ_STEPS - 1);
            var frac = (pt * TRAJ_STEPS) - idx;
            var p0   = pts[Math.max(0, idx - 1)];
            var p1   = pts[idx];
            var p2   = pts[Math.min(TRAJ_STEPS - 1, idx + 1)];
            var p3   = pts[Math.min(TRAJ_STEPS - 1, idx + 2)];
            // clamp frac to [0,1]
            frac = Math.max(0, Math.min(1, frac));
            return {
                x:     p1.x + (p2.x - p0.x) * 0.5 * frac,
                y:     p1.y + (p2.y - p0.y) * 0.5 * frac,
                rot:   p1.rot + (p2.rot - p1.rot) * frac,
                scale: 1
            };
        }

        function frame(ts) {
            if (!running) return;
            if (!startTime) startTime = ts;
            var rawProgress = (ts - startTime) / totalDuration;

            for (var i = 0; i < numDice; i++) {
                var el = els[i];
                var s  = diceStates[i];
                if (settled[i]) continue;

                // 每颗骰子有 delay
                var progress = Math.max(0, (rawProgress - s.delay / totalDuration) / (1 - s.delay / totalDuration));
                progress = Math.min(progress, 1);

                var pos;
                if (progress >= 0.995) {
                    settled[i] = true;
                    el.style.transform = 'translate(' + s.finalX.toFixed(1) + 'px,0) rotate(0deg)';
                    continue;
                }

                pos = getPos(i, progress);
                var scaleX = 1 + Math.sin(pos.rot * 3) * 0.04; // 轻微横向压缩感（模拟透视）
                el.style.transform = 'translate(' + pos.x.toFixed(1) + 'px,' + pos.y.toFixed(1) + 'px) rotate(' + (pos.rot * 180 / Math.PI).toFixed(1) + 'deg) scaleX(' + scaleX.toFixed(2) + ')';
                el.style.opacity = progress < 0.02 ? progress / 0.02 : 1; // 淡入
            }

            if (rawProgress >= 1) {
                running = false;
                // 最后一帧：显示真实点数
                for (var j = 0; j < numDice; j++) {
                    var el2 = els[j];
                    var sv  = finalValues[j];
                    var newEl = createDieEl(sv);
                    newEl.className = 'die placed';
                    newEl.style.position = 'absolute';
                    newEl.style.left = '50%';
                    newEl.style.top  = '50%';
                    newEl.style.transform = 'translate(-50%, -50%)';
                    newEl.style.opacity = '0';
                    container.replaceChild(newEl, el2);
                    // 闪现最终点数
                    (function (ne, delay) {
                        setTimeout(function () {
                            ne.style.transition = 'opacity 0.15s ease, transform 0.2s cubic-bezier(0.34,1.56,0.64,1)';
                            ne.style.opacity = '1';
                            ne.style.transform = 'translate(calc(-50% + ' + diceStates[delay].finalX.toFixed(1) + 'px), -50%)';
                            setTimeout(function () {
                                ne.style.transition = '';
                                ne.style.transform = 'translate(calc(-50% + ' + diceStates[delay].finalX.toFixed(1) + 'px), -50%) rotate(0deg)';
                            }, 220);
                        }, delay * 25);
                    })(newEl, j);
                }
                setTimeout(onDone, numDice * 25 + 280);
                return;
            }

            requestAnimationFrame(frame);
        }

        requestAnimationFrame(frame);
    }

    /**
     * 单颗骰子弹入（21点"再来一颗"）
     */
    function animateSingleDie(container, value, onDone) {
        var el = createDieEl(value);
        el.className = 'die die-anim';
        // 空白面
        var dots = el.querySelectorAll('.dot');
        for (var i = 0; i < dots.length; i++) dots[i].classList.remove('on');
        el.style.position = 'absolute';
        el.style.left = '50%';
        el.style.top  = '50%';
        el.style.transform = 'translate(-50%, -50%) rotate(720deg) scale(0.5)';
        el.style.opacity = '0';
        container.appendChild(el);

        var startTime = null;
        var duration  = 600;
        var startX    = 60 + Math.random() * 30;
        var startY    = -80;
        var vx        = -1.5 - Math.random() * 1;
        var vy        = -2;
        var gravity   = 0.22;
        var rot       = 0;
        var rotSpeed  = (Math.random() - 0.5) * 0.3;
        var settled   = false;
        var finalX    = 0;

        function tick(ts) {
            if (!startTime) startTime = ts;
            var elapsed = ts - startTime;
            var progress = Math.min(elapsed / duration, 1);

            if (progress < 0.6 && !settled) {
                // 飞行+弹跳
                vy += gravity;
                var cx = startX + vx * (elapsed / 16);
                var cy = startY + vy * (elapsed / 16);
                rot += rotSpeed;
                el.style.transform = 'translate(calc(-50% + ' + cx.toFixed(1) + 'px), calc(-50% + ' + cy.toFixed(1) + 'px)) rotate(' + (rot * 180 / Math.PI).toFixed(1) + 'deg)';
                el.style.opacity = progress < 0.05 ? progress / 0.05 : '1';
                requestAnimationFrame(tick);
            } else {
                // 静止
                if (!settled) {
                    settled = true;
                    finalX = (Math.random() - 0.5) * 10;
                }
                el.style.transform = 'translate(calc(-50% + ' + finalX.toFixed(1) + 'px), -50%) rotate(0deg)';

                if (progress >= 1) {
                    // 闪现最终点数
                    var newEl = createDieEl(value);
                    newEl.className = 'die placed';
                    newEl.style.position = 'absolute';
                    newEl.style.left = '50%';
                    newEl.style.top  = '50%';
                    newEl.style.transform = 'translate(calc(-50% + ' + finalX.toFixed(1) + 'px), -50%)';
                    newEl.style.opacity = '0';
                    container.replaceChild(newEl, el);
                    setTimeout(function () {
                        newEl.style.transition = 'opacity 0.12s ease';
                        newEl.style.opacity = '1';
                        setTimeout(onDone, 180);
                    }, 20);
                    return;
                }
                requestAnimationFrame(tick);
            }
        }
        requestAnimationFrame(tick);
    }

    // ===================== 状态 =====================
    var mode        = 'bigsmall';
    var score       = 0;
    var bestScore   = parseInt(localStorage.getItem('dice_best') || '0', 10);
    var isRolling   = false;
    var chosenGuess = null;

    var currentDice = [];
    var currentSum  = 0;
    var playerDice = [];
    var aiDice     = [];
    var p21Dice    = [];
    var ai21Dice   = [];
    var ai21Stopped = false;
    var game21Over  = false;

    var elScore = document.getElementById('scoreDisplay');
    var elBest  = document.getElementById('bestDisplay');

    elBest.textContent = bestScore;

    // ===================== 工具 =====================
    function showResult(which, html) {
        var map = { guess: 'resultDisplay', compare: 'compareResult', dice21: 'result21Display' };
        var el  = document.getElementById(map[which]);
        if (el) el.innerHTML = html;
    }

    function resultHTML(text, cls, detail) {
        return '<div class="result-text ' + cls + '">' + text + '</div>' +
               (detail ? '<div class="result-detail">' + detail + '</div>' : '');
    }

    function updateScore(delta) {
        score += delta;
        if (score < 0) score = 0;
        elScore.textContent = score;
        if (score > bestScore) {
            bestScore = score;
            elBest.textContent = bestScore;
            try { localStorage.setItem('dice_best', bestScore); } catch(e) {}
        }
    }

    function sum21(arr) {
        var s = 0;
        for (var i = 0; i < arr.length; i++) s += arr[i];
        return s;
    }

    // ===================== 模式切换 =====================
    function switchMode(newMode) {
        if (isRolling) return;
        mode = newMode;
        document.querySelectorAll('.mode-tab').forEach(function (t) {
            t.classList.toggle('active', t.dataset.mode === newMode);
        });

        var panelMap = {
            bigsmall: 'panelGuess',
            oddeven:  'panelGuess',
            compare:  'panelCompare',
            dice21:   'panel21',
        };
        ['panelGuess', 'panelCompare', 'panel21'].forEach(function (id) {
            var el = document.getElementById(id);
            if (el) el.style.display = 'none';
        });

        var panelId = panelMap[newMode];
        var panel   = document.getElementById(panelId);
        if (panel) panel.style.display = 'flex';

        document.getElementById('bigSmallBtns').style.display = newMode === 'bigsmall' ? '' : 'none';
        document.getElementById('oddEvenBtns').style.display = newMode === 'oddeven'   ? '' : 'none';

        showRules(newMode);
        resetRound();
    }

    document.querySelectorAll('.mode-tab').forEach(function (tab) {
        tab.addEventListener('click', function () { switchMode(tab.dataset.mode); });
    });

    document.getElementById('btnSwitch').addEventListener('click', function () {
        var modes = ['bigsmall', 'compare', 'oddeven', 'dice21'];
        var idx   = modes.indexOf(mode);
        switchMode(modes[(idx + 1) % modes.length]);
    });

    // ===================== 押注 =====================
    function guess(type) {
        if (isRolling) return;
        chosenGuess = type;
        document.querySelectorAll('.btn-bet').forEach(function (b) { b.classList.remove('selected'); });
        document.getElementById('btn-' + type).classList.add('selected');
        pageAudio.play('select');
    }

    document.getElementById('btn-big').addEventListener('click',   function () { guess('big');   });
    document.getElementById('btn-small').addEventListener('click', function () { guess('small'); });
    document.getElementById('btn-odd').addEventListener('click',  function () { guess('odd');   });
    document.getElementById('btn-even').addEventListener('click', function () { guess('even');  });

    // ===================== 掷骰主按钮 =====================
    document.getElementById('btnRoll').addEventListener('click', function () {
        if (mode === 'dice21') return;
        doGuessRoll();
    });

    document.getElementById('btnStart21').addEventListener('click', function () {
        if (mode === 'dice21') start21Game();
    });

    document.getElementById('btnCompareRoll').addEventListener('click', doCompareRoll);

    // ===================== 猜大小 / 猜单双 =====================
    function doGuessRoll() {
        if (isRolling) return;
        if (mode === 'bigsmall' && !chosenGuess) return;
        if (mode === 'oddeven'  && !chosenGuess) return;

        isRolling   = true;
        var savedGuess = chosenGuess;

        var d1 = rollDie(), d2 = rollDie(), d3 = rollDie();
        currentDice = [d1, d2, d3];
        currentSum  = d1 + d2 + d3;

        animateRoll(document.getElementById('diceRow'), currentDice, 900, function () {
            judgeGuess(savedGuess);
            isRolling = false;
        });
    }

    function judgeGuess(savedGuess) {
        var isBig = currentSum >= 11;
        var isOdd = currentSum % 2 === 1;
        var label, win, cls;

        if (mode === 'bigsmall') {
            label = isBig ? '大' : '小';
            win   = (savedGuess === 'big' && isBig) || (savedGuess === 'small' && !isBig);
        } else {
            label = isOdd ? '单' : '双';
            win   = (savedGuess === 'odd' && isOdd) || (savedGuess === 'even' && !isOdd);
        }

        cls = win ? 'win' : 'lose';
        showResult('guess', resultHTML(
            win ? '你赢了！' : '你输了！',
            cls,
            currentDice.join(' + ') + ' = ' + currentSum + ' → ' + label
        ));
        updateScore(win ? 1 : -1);
        pageAudio.play(win ? 'success' : 'error');
    }

    // ===================== 比大小 =====================
    function doCompareRoll() {
        if (isRolling) return;
        isRolling = true;

        var pd = [rollDie(), rollDie(), rollDie()];
        var ad = [rollDie(), rollDie(), rollDie()];
        playerDice = pd; aiDice = ad;

        var dur = 900;

        animateRoll(document.getElementById('playerDiceRow'), pd, dur, function () {});
        animateRoll(document.getElementById('aiDiceRow'),     ad, dur, function () {});

        setTimeout(function () {
            renderDiceStatic(document.getElementById('playerDiceRow'), pd);
            renderDiceStatic(document.getElementById('aiDiceRow'),     ad);

            var pSum = pd[0] + pd[1] + pd[2];
            var aSum = ad[0] + ad[1] + ad[2];
            document.getElementById('playerTotal').textContent = pSum;
            document.getElementById('aiTotal').textContent     = aSum;

            var cls, text;
            if (pSum > aSum) {
                cls = 'win';  text = '你赢了！';
                updateScore(2); pageAudio.play('success');
            } else if (pSum < aSum) {
                cls = 'lose'; text = '你输了！';
                updateScore(-1); pageAudio.play('error');
            } else {
                cls = 'draw'; text = '平局！';
                pageAudio.play('select');
            }

            showResult('compare', resultHTML(text, cls,
                pd.join('+') + '=' + pSum + '  vs  ' + ad.join('+') + '=' + aSum
            ));
            isRolling = false;
        }, dur + 350);
    }

    // ===================== 21点 =====================
    function set21Buttons(canDraw, canStand) {
        document.getElementById('btnDraw').disabled  = !canDraw;
        document.getElementById('btnStand').disabled = !canStand;
    }

    function clearAIDiceContainer() {
        var old = document.getElementById('aiDiceContainer');
        if (old) old.parentNode.removeChild(old);
    }

    function init21() {
        p21Dice = []; ai21Dice = []; ai21Stopped = false; game21Over = false;
        clearAIDiceContainer();

        document.getElementById('dice21Row').innerHTML = '';
        document.getElementById('player21Score').textContent = '0';
        document.getElementById('player21Score').classList.remove('bust');
        document.getElementById('ai21Score').textContent = '?';
        document.getElementById('ai21Score').classList.remove('bust');
        showResult('dice21', '');
        set21Buttons(false, false);

        var btnStart = document.getElementById('btnStart21');
        if (btnStart) {
            btnStart.style.display = '';
            btnStart.textContent   = '🎮 开始游戏';
            btnStart.disabled = false;
        }
    }

    function start21Game() {
        if (isRolling || game21Over) return;
        isRolling = true;
        var btnStart = document.getElementById('btnStart21');
        if (btnStart) btnStart.style.display = 'none';

        p21Dice.push(rollDie());
        ai21Dice.push(rollDie());

        animateRoll(document.getElementById('dice21Row'), p21Dice, 900, function () {
            update21Scores();
            isRolling = false;
            set21Buttons(true, true);
        });
    }

    function update21Scores() {
        var ps = sum21(p21Dice);
        var as = sum21(ai21Dice);

        var elPS = document.getElementById('player21Score');
        elPS.textContent = ps;
        elPS.classList.toggle('bust', ps > 21);

        var elAS = document.getElementById('ai21Score');
        if (!ai21Stopped) {
            elAS.textContent = as;
            elAS.classList.toggle('bust', as > 21);
        }
    }

    function dice21Draw() {
        if (isRolling || game21Over) return;
        isRolling = true;
        set21Buttons(false, false);

        var d = rollDie();
        p21Dice.push(d);

        animateSingleDie(document.getElementById('dice21Row'), d, function () {
            update21Scores();
            isRolling = false;

            var ps = sum21(p21Dice);
            if (ps > 21) {
                showResult('dice21', resultHTML('你爆了！', 'lose', '点数 ' + ps + ' 超过 21'));
                pageAudio.play('error');
                updateScore(-1);
                set21Buttons(false, false);
                game21Over = true;
                aiPlay();
            } else if (ps === 21) {
                dice21Stand();
            } else {
                set21Buttons(true, true);
            }
        });
    }

    function dice21Stand() {
        if (isRolling || game21Over) return;
        set21Buttons(false, false);
        game21Over = true;
        aiPlay();
    }

    function aiPlay() {
        ai21Stopped = true;
        var aiScoreEl = document.getElementById('ai21Score');
        aiScoreEl.textContent = '?';

        function tick() {
            var pts = sum21(ai21Dice);
            if (pts < 16 && ai21Dice.length < 8) {
                ai21Dice.push(rollDie());
                aiScoreEl.textContent = sum21(ai21Dice);
                setTimeout(tick, 320);
            } else {
                setTimeout(function () {
                    aiScoreEl.textContent = sum21(ai21Dice);
                    aiFinalize();
                }, 300);
            }
        }
        aiScoreEl.textContent = sum21(ai21Dice);
        setTimeout(tick, 280);
    }

    function aiFinalize() {
        var ps = sum21(p21Dice);
        var as = sum21(ai21Dice);
        var cls, text;

        if (ps > 21) {
            cls = 'lose'; text = '你爆了！';
            updateScore(-1); pageAudio.play('error');
        } else if (as > 21) {
            cls = 'win'; text = '电脑爆了，你赢！';
            updateScore(2); pageAudio.play('success');
        } else if (ps > as) {
            cls = 'win'; text = '你赢了！';
            updateScore(2); pageAudio.play('success');
        } else if (ps < as) {
            cls = 'lose'; text = '你输了！';
            updateScore(-1); pageAudio.play('error');
        } else {
            cls = 'draw'; text = '平局！';
            pageAudio.play('select');
        }

        var panel21 = document.getElementById('panel21');
        clearAIDiceContainer();

        var cont = document.createElement('div');
        cont.id  = 'aiDiceContainer';
        cont.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:8px;width:100%;';

        var row = document.createElement('div');
        row.style.cssText = 'display:flex;align-items:center;gap:10px;flex-wrap:wrap;justify-content:center;';

        p21Dice.forEach(function (v) {
            var el = createDieEl(v);
            el.style.boxShadow = '0 4px 12px rgba(78,205,196,0.5)';
            el.classList.add('placed');
            row.appendChild(el);
        });

        var vs = document.createElement('span');
        vs.textContent = 'vs';
        vs.style.cssText = 'font-size:1.2rem;color:rgba(255,255,255,0.45);font-weight:700;';

        ai21Dice.forEach(function (v) {
            var el = createDieEl(v);
            el.style.boxShadow = '0 4px 12px rgba(162,155,254,0.5)';
            el.classList.add('placed');
            row.appendChild(el);
        });

        cont.appendChild(row);
        panel21.appendChild(cont);

        showResult('dice21', resultHTML(text, cls, '你：' + ps + '  vs  电脑：' + as));
    }

    document.getElementById('btnDraw').addEventListener('click',  dice21Draw);
    document.getElementById('btnStand').addEventListener('click', dice21Stand);

    // ===================== 重置回合 =====================
    function resetRound() {
        chosenGuess = null; isRolling = false;
        document.querySelectorAll('.btn-bet').forEach(function (b) { b.classList.remove('selected'); });

        if (mode === 'bigsmall' || mode === 'oddeven') {
            currentDice = []; currentSum = 0;
            showResult('guess', '');
            document.getElementById('diceRow').innerHTML = '';
            var btnRoll = document.getElementById('btnRoll');
            if (btnRoll) {
                btnRoll.style.display = '';
                btnRoll.textContent   = '🎲 掷骰子';
                btnRoll.disabled = false;
            }

        } else if (mode === 'compare') {
            playerDice = []; aiDice = [];
            showResult('compare', '');
            document.getElementById('playerDiceRow').innerHTML = '';
            document.getElementById('aiDiceRow').innerHTML = '';
            document.getElementById('playerTotal').textContent = '-';
            document.getElementById('aiTotal').textContent     = '-';
            var btnRoll2 = document.getElementById('btnCompareRoll');
            if (btnRoll2) btnRoll2.disabled = false;

        } else if (mode === 'dice21') {
            init21();
        }
    }

    document.getElementById('btnReplay').addEventListener('click', resetRound);

    // ===================== 初始化 =====================
    showRules('bigsmall');
    resetRound();

})();
