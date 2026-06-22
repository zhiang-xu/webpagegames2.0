(function () {
    var pageAudio = window.GamePageUI.mount({ home: true, sound: true, muted: false });

    // ===================== 规则内容 =====================
    var RULES = {
        bigsmall: '🎯 掷三颗骰子，猜测「大」（4-17点）或「小」（3-10点）。<br>豹子（三个相同）通吃，大小皆输！',
        compare:  '🎮 掷三颗骰子比大小，点数大者获胜。<br>点数相同时为平局。',
        oddeven:  '🎯 掷三颗骰子，猜测点数「单」或「双」。<br>3颗骰子之和为单数或双数。',
        dice21:   '🎲 掷骰子，累积点数尽量接近21点。<br>超过21点爆掉，直接输。掷到21点立刻获胜！',
        guessnum: '🎲 先选择 1~3 颗骰子和 2~4 位玩家 (A/B/C/D)。<br>每人输入一个猜测点数（范围 = 骰子数 ~ 骰子数×6）。<br>开始后掷出骰子，点数之和最接近者获胜！多人平分时继续掷，直到决出胜者。',
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
        var diceW  = 64;
        var gap    = 10;
        var num    = values.length;
        var trayW  = container.clientWidth  || 280;
        var trayH  = container.clientHeight || 100;
        var startX = (trayW - num * diceW - (num - 1) * gap) / 2;
        var finalY = (trayH - diceW) / 2;
        for (var i = 0; i < values.length; i++) {
            var el = createDieEl(values[i]);
            el.classList.add('placed');
            el.style.position = 'absolute';
            el.style.left    = startX + i * (diceW + gap) + 'px';
            el.style.top    = finalY + 'px';
            container.appendChild(el);
        }
    }

    function rollDie() { return 1 + Math.floor(Math.random() * 6); }

    // ===================== 骰子物理动画 =====================

    function easeOutBounce(x) {
        var n1 = 7.5625, d1 = 2.75;
        if (x < 1 / d1)       return n1 * x * x;
        if (x < 2 / d1)       return n1 * (x -= 1.5 / d1) * x + 0.75;
        if (x < 2.5 / d1)     return n1 * (x -= 2.25 / d1) * x + 0.9375;
        return n1 * (x -= 2.625 / d1) * x + 0.984375;
    }

    function updateDieFace(el, value) {
        var dots = el.querySelectorAll('.dot');
        for (var i = 0; i < dots.length; i++) {
            dots[i].className = 'dot' + (DOT_PATTERNS[value].indexOf(i) > -1 ? ' on' : '');
        }
    }

    /**
     * 核心骰子动画引擎：逐帧requestAnimationFrame控制
     * - 翻滚阶段：骰子显示空白面，随机旋转
     * - 弹跳阶段：骰子弹跳+旋转，逐渐变慢
     * - 定住阶段：原地更新点数，轻微弹出效果
     */
    function animateRoll(container, finalValues, totalDuration, onDone) {
        var numDice = finalValues.length;
        var diceW   = 64;
        var gap     = 10;
        var trayW   = container.clientWidth  || 280;
        var trayH   = container.clientHeight || 100;
        var startX  = (trayW - numDice * diceW - (numDice - 1) * gap) / 2;
        var finalY  = (trayH - diceW) / 2;
        container.innerHTML = '';

        // 空白骰子面（不显示点数）
        function createBlankDie() {
            var el = document.createElement('div');
            el.className = 'die';
            for (var i = 0; i < 9; i++) {
                var dot = document.createElement('div');
                dot.className = 'dot';
                el.appendChild(dot);
            }
            return el;
        }

        // 创建骰子DOM，每颗独立div，绝对定位
        var els = [];
        for (var i = 0; i < numDice; i++) {
            var el = createBlankDie();
            el.classList.add('placed');
            el.style.position = 'absolute';
            el.style.left    = startX + i * (diceW + gap) + 'px';
            el.style.top     = finalY + 'px';
            el.style.opacity = '0';
            container.appendChild(el);
            els.push(el);
        }

        // 预计算每颗骰子的动画参数
        var finalPositions = [];
        for (var i = 0; i < numDice; i++) {
            finalPositions.push({
                delay:    i * 60,
                spinDir:   Math.random() > 0.5 ? 1 : -1,
                spinSpeed: 8 + Math.random() * 6,
                bounceH:   18 + Math.random() * 16,
                bounce2:    8 + Math.random() * 8,
                bounce3:    3 + Math.random() * 4,
                fallDur:   0.18 + Math.random() * 0.08,
            });
        }

        var startTime = null;
        var done      = false;

        function frame(ts) {
            if (done) return;
            if (!startTime) startTime = ts;
            var elapsed = ts - startTime;

            for (var i = 0; i < numDice; i++) {
                var el  = els[i];
                var fp  = finalPositions[i];
                var t   = Math.max(0, elapsed / totalDuration - fp.delay / totalDuration);
                t = Math.min(t, 1);

                if (el.style.opacity === '0' && elapsed > 30) {
                    el.style.opacity = '1';
                }

                if (t < fp.fallDur) {
                    // 阶段1：掉落
                    var pt   = t / fp.fallDur;
                    var fallY = (1 - easeOutBounce(pt)) * -(trayH / 2 + 10);
                    var rot   = fp.spinDir * fp.spinSpeed * 3 * pt;
                    var xOff  = Math.sin(pt * Math.PI * 3) * 6;
                    el.style.transform = 'translate(' + xOff.toFixed(1) + 'px,' + fallY.toFixed(1) + 'px) rotate(' + rot.toFixed(1) + 'deg)';

                } else if (t < 0.72) {
                    // 阶段2：弹跳
                    var pt = (t - fp.fallDur) / (0.72 - fp.fallDur);
                    var subT = pt / 0.33;
                    var bounce;
                    if (subT < 1)      bounce = fp.bounceH * (1 - easeOutBounce(subT));
                    else if (subT < 2) bounce = fp.bounce2 * (1 - easeOutBounce(subT - 1));
                    else               bounce = fp.bounce3 * (1 - easeOutBounce(Math.max(0, subT - 2)));
                    var rot   = fp.spinDir * fp.spinSpeed * (3 + (1 - pt) * 4) + Math.sin(pt * Math.PI * 6) * 5 * (1 - pt);
                    var xOff  = Math.sin(pt * Math.PI * 4) * 6 * (1 - pt);
                    el.style.transform = 'translate(' + xOff.toFixed(1) + 'px,' + (-bounce).toFixed(1) + 'px) rotate(' + rot.toFixed(1) + 'deg)';

                } else if (t < 0.88) {
                    // 阶段3：收敛静止
                    var rot = fp.spinDir * 5 * (1 - (t - 0.72) / 0.16);
                    el.style.transform = 'translate(0px,0px) rotate(' + rot.toFixed(1) + 'deg)';

                } else {
                    // 阶段4：完全停止
                    el.style.transform = 'translate(0px,0px) rotate(0deg)';
                }
            }

            if (elapsed >= totalDuration) {
                done = true;
                // 原地更新点数，逐颗弹出效果
                for (var j = 0; j < numDice; j++) {
                    (function (el, val, delay) {
                        setTimeout(function () {
                            updateDieFace(el, val);
                            el.style.transition = 'transform 0.3s cubic-bezier(0.34,1.56,0.64,1)';
                            el.style.transform  = 'translate(0px,-6px) scale(1.08)';
                            setTimeout(function () {
                                el.style.transform = 'translate(0px,0px) scale(1)';
                            }, 150);
                        }, delay * 50);
                    })(els[j], finalValues[j], j);
                }
                setTimeout(onDone, numDice * 50 + 350);
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
        el.className = 'die placed';
        var dots = el.querySelectorAll('.dot');
        for (var i = 0; i < dots.length; i++) dots[i].className = 'dot';
        var trayW   = container.clientWidth  || 280;
        var trayH   = container.clientHeight || 100;
        var finalY  = (trayH - 64) / 2;
        var finalX  = (trayW - 64) / 2;
        el.style.position = 'absolute';
        el.style.left    = finalX + 'px';
        el.style.top     = finalY + 'px';
        el.style.opacity = '0';
        el.style.transform = 'translate(60px,-80px) rotate(360deg) scale(0.5)';
        container.appendChild(el);

        var startTime = null;
        var duration  = 700;

        function tick(ts) {
            if (!startTime) startTime = ts;
            var elapsed = ts - startTime;
            var t = Math.min(elapsed / duration, 1);

            el.style.opacity = t > 0.05 ? '1' : (t / 0.05).toString();

            if (t < 0.55) {
                var pt  = t / 0.55;
                var y   = -80 + (trayH / 2 + 10) * easeOutBounce(pt);
                var rot = 360 * (1 + pt * 3);
                var x   = 60 * (1 - pt);
                el.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px) rotate(' + rot.toFixed(1) + 'deg)';
            } else {
                el.style.transform = 'translate(0px,0px) rotate(0deg)';
            }

            if (t >= 1) {
                updateDieFace(el, value);
                el.style.transition = 'transform 0.25s cubic-bezier(0.34,1.56,0.64,1)';
                el.style.transform  = 'translate(0px,-5px) scale(1.08)';
                setTimeout(function () {
                    el.style.transform = 'translate(0px,0px) scale(1)';
                    setTimeout(onDone, 200);
                }, 150);
                return;
            }

            requestAnimationFrame(tick);
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
    var p21Stopped  = false;
    var ai21Stopped = false;
    var game21Over  = false;
    var rollingA    = false;
    var rollingB    = false;
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
            guessnum: 'panelGuessnum',
        };
        ['panelGuess', 'panelCompare', 'panel21', 'panelGuessnum'].forEach(function (id) {
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
        var modes = ['guessnum', 'bigsmall', 'oddeven', 'compare', 'dice21'];
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
    // 双方独立停止标志；只有 p21Stopped && ai21Stopped 才进入结算
    // 摇骰子动作：把"转动中的骰子"投到该方的 rollingSlot，
    // 动画结束后静态搬到该方 dice-zone（一字排开）。
    function clearAIDiceContainer() {
        var old = document.getElementById('aiDiceContainer');
        if (old) old.parentNode.removeChild(old);
    }

    function clearRollingSlot(side) {
        var slot = document.getElementById('rollingSlot' + side);
        if (slot) slot.innerHTML = '';
    }

    function getSlotEl(side) { return document.getElementById('rollingSlot' + side); }
    function getZoneEl(side) {
        return document.getElementById(side === 'A' ? 'player21DiceRow' : 'ai21DiceRow');
    }
    function getScoreEl(side) {
        return document.getElementById(side === 'A' ? 'player21ScoreInline' : 'ai21ScoreInline');
    }
    function getDiceArr(side)  { return side === 'A' ? p21Dice  : ai21Dice;  }
    function isStopped(side)   { return side === 'A' ? p21Stopped : ai21Stopped; }
    function setStopped(side, v) {
        if (side === 'A') p21Stopped = v; else ai21Stopped = v;
    }

    function updateSideScore(side) {
        var arr = getDiceArr(side);
        var pts = sum21(arr);
        var el  = getScoreEl(side);
        el.textContent = pts;
        el.classList.toggle('bust', pts > 21);
    }

    function refresh21Controls() {
        var aStop = isStopped('A'), bStop = isStopped('B');
        var btnDraw = document.getElementById('btnDraw');
        var btnA    = document.getElementById('btnStopA');
        var btnB    = document.getElementById('btnStopB');
        // 21点 面板里"开始游戏" 与 "再来一颗" 互斥显示
        // 仅在"已开始但未结束"区间内才显示 btnDraw
        var btnStart = document.getElementById('btnStart21');
        var inProgress = !game21Over && btnStart && btnStart.style.display === 'none';
        if (btnStart) btnStart.style.display = inProgress ? 'none' : '';
        if (btnDraw)  btnDraw.style.display  = inProgress ? '' : 'none';

        // 再来一颗：双方都没在摇、双方都还没停止
        // (单方停止后, 另一方仍可继续摇; 双方都停才禁用)
        var canDraw = inProgress && !rollingA && !rollingB && !(aStop && bStop);
        if (btnDraw) btnDraw.disabled = !canDraw;
        if (btnA)    btnA.disabled    = aStop || game21Over;
        if (btnB)    btnB.disabled    = bStop || game21Over;
    }

    function maybeFinalize21() {
        if (p21Stopped && ai21Stopped) {
            game21Over = true;
            refresh21Controls();
            aiFinalize();
        } else {
            refresh21Controls();
        }
    }

    // 一方抽一颗：投到该方 rollingSlot，动画结束静态搬到 dice-zone
    function rollForSide(side) {
        if (game21Over) return;
        if (isStopped(side)) return;
        if (side === 'A' ? rollingA : rollingB) return;
        if (getDiceArr(side).length >= 10) {
            // 上限 10 颗，超出则自动停止
            setStopped(side, true);
            maybeFinalize21();
            return;
        }

        if (side === 'A') rollingA = true; else rollingB = true;
        refresh21Controls();

        var d   = rollDie();
        var arr = getDiceArr(side);
        arr.push(d);

        var slot = getSlotEl(side);
        var zone = getZoneEl(side);
        clearRollingSlot(side);

        animateSingleDie(slot, d, function () {
            // 动画结束：把 slot 里的骰子 DOM 搬到 zone 一字排开
            while (slot.firstChild) zone.appendChild(slot.firstChild);
            renderDiceStatic(zone, arr);
            updateSideScore(side);
            if (side === 'A') rollingA = false; else rollingB = false;

            var pts = sum21(arr);
            if (pts > 21) {
                // 爆了：立即结算，对手赢
                setStopped(side, true);
                // 另一方也标记为停止，避免对方继续抽
                var other = side === 'A' ? 'B' : 'A';
                setStopped(other, true);
                clearRollingSlot(other);
                pageAudio.play('error');
                aiFinalize();
            } else {
                maybeFinalize21();
            }
        });
    }

    // 双方同时抽一颗（开始/再来一颗）
    function rollBoth() {
        if (game21Over) return;
        var aStop = isStopped('A'), bStop = isStopped('B');
        if (aStop && bStop) return;
        if (aStop) { rollForSide('B'); return; }
        if (bStop) { rollForSide('A'); return; }
        // 同时抽：A、B 各自独立锁，互不阻塞
        rollForSide('A');
        rollForSide('B');
    }

    function stopSide(side) {
        if (game21Over) return;
        if (isStopped(side)) return;
        setStopped(side, true);
        clearRollingSlot(side);
        updateSideScore(side);
        maybeFinalize21();
    }

    function init21() {
        p21Dice = []; ai21Dice = [];
        p21Stopped = false; ai21Stopped = false;
        game21Over = false;
        rollingA = false; rollingB = false;
        clearAIDiceContainer();

        var pRow = document.getElementById('player21DiceRow');
        var aRow = document.getElementById('ai21DiceRow');
        if (pRow) pRow.innerHTML = '';
        if (aRow) aRow.innerHTML = '';
        clearRollingSlot('A');
        clearRollingSlot('B');

        var psEl = document.getElementById('player21ScoreInline');
        var asEl = document.getElementById('ai21ScoreInline');
        if (psEl) { psEl.textContent = '0'; psEl.classList.remove('bust'); }
        if (asEl) { asEl.textContent = '0'; asEl.classList.remove('bust'); }

        showResult('dice21', '');

        var btnStart = document.getElementById('btnStart21');
        if (btnStart) {
            btnStart.style.display = '';
            btnStart.textContent   = '🎮 开始游戏';
            btnStart.disabled = false;
        }
        // 双方停止按钮在游戏未开始时禁用
        var btnA = document.getElementById('btnStopA');
        var btnB = document.getElementById('btnStopB');
        if (btnA) btnA.disabled = true;
        if (btnB) btnB.disabled = true;
        // btnDraw 与 btnStart 互斥: 通过 display 控制, 由 refresh21Controls 同步
        refresh21Controls();
    }

    function start21Game() {
        if (game21Over) return;
        var btnStart = document.getElementById('btnStart21');
        if (btnStart) btnStart.style.display = 'none';
        refresh21Controls();
        rollBoth();
    }

    function aiFinalize() {
        var ps = sum21(p21Dice);
        var as = sum21(ai21Dice);
        var cls, text;

        if (ps > 21 && as > 21) {
            cls = 'draw'; text = '双方都爆了，平局！';
            pageAudio.play('select');
        } else if (ps > 21) {
            cls = 'lose'; text = '玩家A 爆了，玩家B 赢！';
            updateScore(-1); pageAudio.play('error');
        } else if (as > 21) {
            cls = 'win'; text = '玩家B 爆了，玩家A 赢！';
            updateScore(2); pageAudio.play('success');
        } else if (ps > as) {
            cls = 'win'; text = '玩家A 赢了！';
            updateScore(2); pageAudio.play('success');
        } else if (ps < as) {
            cls = 'lose'; text = '玩家B 赢了！';
            updateScore(-1); pageAudio.play('error');
        } else {
            cls = 'draw'; text = '平局！';
            pageAudio.play('select');
        }

        game21Over = true;
        refresh21Controls();

        showResult('dice21', resultHTML(text, cls, '玩家A：' + ps + '  vs  玩家B：' + as));
    }

    document.getElementById('btnStart21').addEventListener('click', start21Game);
    document.getElementById('btnDraw').addEventListener('click',    rollBoth);
    document.getElementById('btnStopA').addEventListener('click',   function () { stopSide('A'); });
    document.getElementById('btnStopB').addEventListener('click',   function () { stopSide('B'); });

    // ===================== 猜点数 =====================
    // 状态
    var gnDiceCount   = 0;     // 1~3
    var gnPlayerCount = 0;     // 2~4
    var gnGuesses     = [];    // 玩家猜测输入数组, 长度 = gnPlayerCount
    var gnCandidates  = [];    // 当前轮仍在竞争的玩家下标集合 (尚未淘汰)
    var gnEliminated  = [];    // 已淘汰下标 (本局内累计)
    var gnRound       = 0;     // 第几轮 (从 1 开始)
    var gnGameOver    = false; // true = 已决出冠军
    var gnLastResult  = null;  // {values:[...], sum: n}
    var gnStarted     = false; // true = 已首次开始 (骰子数/玩家数锁定, 只能"新开一局"重置)

    function gnRange() {
        return { lo: gnDiceCount, hi: gnDiceCount * 6 };
    }
    function gnAllInputValid() {
        if (!gnDiceCount || !gnPlayerCount) return false;
        var r = gnRange();
        for (var i = 0; i < gnGuesses.length; i++) {
            var v = gnGuesses[i];
            if (v === null || v === undefined || isNaN(v)) return false;
            if (v < r.lo || v > r.hi) return false;
        }
        return true;
    }

    function gnRefreshStartBtn() {
        var btn = document.getElementById('btnGuessnumStart');
        if (!btn) return;
        // rolling: 掷骰中, 不可点
        if (isRolling && gnCandidates.length > 0) {
            btn.disabled = true;
            btn.textContent = '🎲 掷骰中…';
            return;
        }
        // over: 已决出冠军, 可继续
        if (gnGameOver) {
            btn.disabled = !gnAllInputValid();
            btn.textContent = '🎲 继续掷骰';
            return;
        }
        // idle: 未开始
        btn.disabled = !gnAllInputValid();
        btn.textContent = '🎮 开始游戏';
    }

    // 已开局后锁住骰子数/玩家数 chips (只能通过底部"新开一局"重置)
    function gnRefreshSetupChips() {
        var lock = gnStarted;
        document.querySelectorAll('#gnDiceChips .gn-chip').forEach(function (b) {
            b.classList.toggle('locked', lock);
            b.disabled = lock;
        });
        document.querySelectorAll('#gnPlayerChips .gn-chip').forEach(function (b) {
            b.classList.toggle('locked', lock);
            b.disabled = lock;
        });
        var diceRow = document.getElementById('gnDiceChips');
        var playerRow = document.getElementById('gnPlayerChips');
        if (diceRow) diceRow.title = lock ? '已开局, 请点下方"新开一局"重置' : '';
        if (playerRow) playerRow.title = lock ? '已开局, 请点下方"新开一局"重置' : '';
    }

    function gnBuildGuessCards() {
        var wrap = document.getElementById('gnGuessArea');
        if (!wrap) return;
        wrap.innerHTML = '';
        var r = gnRange();
        var emoji = ['👤', '🧑', '👨', '👩'];
        var names = ['玩家A', '玩家B', '玩家C', '玩家D'];
        for (var i = 0; i < gnPlayerCount; i++) {
            var card = document.createElement('div');
            card.className = 'gn-guess-card';
            card.dataset.idx = i;
            card.innerHTML =
                '<div class="gn-card-label">' +
                    '<span>' + (emoji[i] || '👤') + ' ' + names[i] + '</span>' +
                '</div>' +
                '<input class="gn-input" type="number" min="' + r.lo + '" max="' + r.hi + '" placeholder="' + r.lo + '~' + r.hi + '" />' +
                '<div class="gn-meta"><span>猜测</span><span data-meta="diff">差 —</span></div>' +
                '<div class="gn-card-status">准备中</div>';
            wrap.appendChild(card);
            var input = card.querySelector('input');
            (function (idx, inp) {
                inp.addEventListener('input', function () {
                    var v = parseInt(inp.value, 10);
                    gnGuesses[idx] = isNaN(v) ? null : v;
                    gnRefreshStartBtn();
                });
            })(i, input);
        }
    }

    function gnApplyCardStates() {
        var wrap = document.getElementById('gnGuessArea');
        if (!wrap) return;
        var cards = wrap.querySelectorAll('.gn-guess-card');
        for (var i = 0; i < cards.length; i++) {
            var card = cards[i];
            var idx = parseInt(card.dataset.idx, 10);
            var status = card.querySelector('.gn-card-status');
            var diffEl = card.querySelector('[data-meta="diff"]');
            card.classList.remove('eliminated', 'winner');
            var input = card.querySelector('input');
            input.disabled = false;

            if (gnLastResult) {
                var sum = gnLastResult.sum;
                var diff = Math.abs((gnGuesses[idx] || 0) - sum);
                diffEl.textContent = '差 ' + diff;
            } else {
                diffEl.textContent = '差 —';
            }

            if (gnGameOver && gnCandidates.length === 1 && gnCandidates[0] === idx) {
                card.classList.add('winner');
                status.textContent = '🏆 胜出';
                input.disabled = true;
            } else if (gnGameOver && gnEliminated.indexOf(idx) > -1) {
                // 本局已被淘汰 (但本局已结束, 显示留作记录)
                card.classList.add('eliminated');
                status.textContent = '淘汰';
                input.disabled = true;
            } else if (gnGameOver) {
                // 局结束, 玩家可继续掷前调整输入 (兜底分支, 通常不应进入)
                status.textContent = '准备中';
            } else if (gnEliminated.indexOf(idx) > -1) {
                card.classList.add('eliminated');
                status.textContent = '淘汰';
                input.disabled = true;
            } else if (gnCandidates.length > 0) {
                status.textContent = '掷骰中…';
            } else {
                status.textContent = '准备中';
            }
        }
    }

    function gnRollOnce(callback) {
        var dice = [];
        for (var i = 0; i < gnDiceCount; i++) dice.push(rollDie());
        var sum = 0; for (var i = 0; i < dice.length; i++) sum += dice[i];
        gnLastResult = { values: dice, sum: sum };
        animateRoll(document.getElementById('guessnumDiceRow'), dice, 900, function () {
            renderDiceStatic(document.getElementById('guessnumDiceRow'), dice);
            if (callback) callback(dice, sum);
        });
    }

    function gnFindClosest() {
        // 返回差最小的下标数组 (若有并列都包含)
        var sum = gnLastResult ? gnLastResult.sum : 0;
        var minDiff = Infinity;
        for (var i = 0; i < gnCandidates.length; i++) {
            var idx = gnCandidates[i];
            var g = gnGuesses[idx] || 0;
            var d = Math.abs(g - sum);
            if (d < minDiff) minDiff = d;
        }
        var closest = [];
        for (var i = 0; i < gnCandidates.length; i++) {
            var idx = gnCandidates[i];
            var g = gnGuesses[idx] || 0;
            if (Math.abs(g - sum) === minDiff) closest.push(idx);
        }
        return { closest: closest, minDiff: minDiff };
    }

    function gnJudgeAndContinue() {
        gnRound++;
        var res = gnFindClosest();
        var closest = res.closest;
        gnApplyCardStates();

        if (closest.length === 1) {
            // 单人最接近, 胜出
            var winner = closest[0];
            var names = ['玩家A', '玩家B', '玩家C', '玩家D'];
            updateScore(2); pageAudio.play('success');
            gnCandidates = [winner];
            gnGameOver = true;
            isRolling = false;
            gnApplyCardStates();
            gnRefreshStartBtn();
            showResult('guessnum', resultHTML(
                '🏆 ' + names[winner] + ' 获胜！',
                'win',
                '骰子：' + gnLastResult.values.join(' + ') + ' = ' + gnLastResult.sum +
                '  |  胜者猜：' + gnGuesses[winner] + ' (差 ' + res.minDiff + ')'
            ));
        } else {
            // 多人平分
            if (gnCandidates.length <= 2) {
                // 2 人: 继续掷直到分出胜负, 不淘汰
                showResult('guessnum', resultHTML(
                    '🤝 平分！继续掷骰…',
                    'draw',
                    '骰子：' + gnLastResult.values.join(' + ') + ' = ' + gnLastResult.sum +
                    '  |  候选：' + closest.map(function (i) { return names[i] + '(' + gnGuesses[i] + ')'; }).join(', ')
                ));
                setTimeout(function () { gnRollAndJudge(); }, 900);
            } else {
                // 3~4 人: 淘汰差最大者, 在剩下的人中继续掷
                var maxDiff = -1;
                for (var i = 0; i < gnCandidates.length; i++) {
                    var idx = gnCandidates[i];
                    var d = Math.abs((gnGuesses[idx] || 0) - gnLastResult.sum);
                    if (d > maxDiff) maxDiff = d;
                }
                var keep = [];
                for (var i = 0; i < gnCandidates.length; i++) {
                    var idx = gnCandidates[i];
                    var d = Math.abs((gnGuesses[idx] || 0) - gnLastResult.sum);
                    if (d < maxDiff) keep.push(idx);
                }
                // 若全部候选差相同 (极端平局), 无法淘汰任何人, 改为继续掷
                if (keep.length === 0 || keep.length === gnCandidates.length) {
                    showResult('guessnum', resultHTML(
                        '🤝 全员平分！继续掷骰…',
                        'draw',
                        '骰子：' + gnLastResult.values.join(' + ') + ' = ' + gnLastResult.sum +
                        '  |  候选：' + closest.map(function (i) { return names[i] + '(' + gnGuesses[i] + ')'; }).join(', ')
                    ));
                    setTimeout(function () { gnRollAndJudge(); }, 1100);
                    return;
                }
                for (var i = 0; i < gnCandidates.length; i++) {
                    var idx = gnCandidates[i];
                    if (keep.indexOf(idx) === -1) gnEliminated.push(idx);
                }
                gnCandidates = keep;
                var names2 = ['玩家A', '玩家B', '玩家C', '玩家D'];
                showResult('guessnum', resultHTML(
                    '💥 平分！淘汰差最大者',
                    'lose',
                    '骰子：' + gnLastResult.values.join(' + ') + ' = ' + gnLastResult.sum +
                    '  |  晋级：' + gnCandidates.map(function (i) { return names2[i] + '(' + gnGuesses[i] + ')'; }).join(', ')
                ));
                pageAudio.play('error');
                gnApplyCardStates();
                setTimeout(function () { gnRollAndJudge(); }, 1100);
            }
        }
    }

    function gnRollAndJudge() {
        gnRollOnce(function () {
            setTimeout(gnJudgeAndContinue, 250);
        });
    }

    function gnHandleStart() {
        if (!gnAllInputValid()) return;
        if (isRolling) return;
        if (gnDiceCount < 1 || gnPlayerCount < 2) return;

        if (!gnGameOver) {
            // 首轮: 标记为已开局, 骰子数/玩家数锁定
            gnStarted = true;
        }
        // 无论首轮还是继续, 重置候选/淘汰/轮次/结果
        gnCandidates = [];
        for (var i = 0; i < gnPlayerCount; i++) gnCandidates.push(i);
        gnEliminated = [];
        gnRound = 0;
        gnGameOver = false;
        gnLastResult = null;
        isRolling = true;
        gnRefreshSetupChips();
        gnRefreshStartBtn();
        gnApplyCardStates();
        gnRollAndJudge();
    }

    // 绑定骰子数/玩家数 chip
    document.querySelectorAll('#gnDiceChips .gn-chip').forEach(function (b) {
        b.addEventListener('click', function () {
            if (gnStarted) return; // 已开局锁定, 只能"新开一局"重置
            if (isRolling && gnCandidates.length > 0) return;
            gnDiceCount = parseInt(b.dataset.dice, 10);
            document.querySelectorAll('#gnDiceChips .gn-chip').forEach(function (x) {
                x.classList.toggle('selected', x === b);
            });
            gnRefreshStartBtn();
        });
    });
    document.querySelectorAll('#gnPlayerChips .gn-chip').forEach(function (b) {
        b.addEventListener('click', function () {
            if (gnStarted) return; // 已开局锁定, 只能"新开一局"重置
            if (isRolling && gnCandidates.length > 0) return;
            gnPlayerCount = parseInt(b.dataset.players, 10);
            // 重新构建输入卡片, 保留已有猜测
            var prev = gnGuesses.slice();
            gnGuesses = [];
            for (var i = 0; i < gnPlayerCount; i++) {
                gnGuesses.push(prev[i] !== undefined ? prev[i] : null);
            }
            document.querySelectorAll('#gnPlayerChips .gn-chip').forEach(function (x) {
                x.classList.toggle('selected', x === b);
            });
            gnBuildGuessCards();
            gnApplyCardStates();
            gnRefreshStartBtn();
        });
    });
    document.getElementById('btnGuessnumStart').addEventListener('click', gnHandleStart);

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

        } else if (mode === 'guessnum') {
            // 新开一局: 清空所有参数与状态, 让用户重新设置
            gnDiceCount = 0;
            gnPlayerCount = 0;
            gnCandidates = [];
            gnEliminated = [];
            gnRound = 0;
            gnGameOver = false;
            gnLastResult = null;
            gnStarted = false;
            gnGuesses = [];
            document.querySelectorAll('#gnDiceChips .gn-chip').forEach(function (b) { b.classList.remove('selected'); });
            document.querySelectorAll('#gnPlayerChips .gn-chip').forEach(function (b) { b.classList.remove('selected'); });
            var area = document.getElementById('gnGuessArea');
            if (area) area.innerHTML = '';
            var row = document.getElementById('guessnumDiceRow');
            if (row) row.innerHTML = '';
            showResult('guessnum', '');
            var btnStartG = document.getElementById('btnGuessnumStart');
            if (btnStartG) {
                btnStartG.disabled = true;
                btnStartG.textContent = '🎮 开始游戏';
            }
            gnRefreshSetupChips();
        }
    }

    document.getElementById('btnReplay').addEventListener('click', resetRound);

    // ===================== 初始化 =====================
    switchMode('guessnum');

})();
