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

    function easeOutBack(x) {
        var c1 = 1.70158;
        var c3 = c1 + 1;
        return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
    }

    function easeOutBounce(x) {
        var n1 = 7.5625, d1 = 2.75;
        if (x < 1 / d1)       return n1 * x * x;
        if (x < 2 / d1)       return n1 * (x -= 1.5 / d1) * x + 0.75;
        if (x < 2.5 / d1)     return n1 * (x -= 2.25 / d1) * x + 0.9375;
        return n1 * (x -= 2.625 / d1) * x + 0.984375;
    }

    function easeInOutQuad(x) {
        return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
    }

    function cubicBezier(t, p0, p1, p2, p3) {
        var u = 1 - t;
        return u * u * u * p0 + 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t * p3;
    }

    function cubicEase(t) { return cubicBezier(t, 0.33, 0, 0.67, 1); }

    /**
     * 骰子弹跳动画：
     * - 每颗骰子有独立的旋转、落点、弹跳高度
     * - 阶段1（0→25%）：骰子从碗外上方旋转着飞入
     * - 阶段2（25→100%）：在碗底弹跳3次，逐渐停止
     * - 最终停在碗内对应位置
     */
    function animateRoll(container, finalValues, duration, onDone) {
        container.innerHTML = '';

        var numDice = finalValues.length;
        var diceWidth = 64; // px
        var gap = 10;
        var totalWidth = numDice * diceWidth + (numDice - 1) * gap;

        for (var i = 0; i < numDice; i++) {
            var dieEl = createDieEl(finalValues[i]);
            container.appendChild(dieEl);

            // 计算最终停留的 left 偏移（居中）
            var finalLeft = (totalWidth / 2) - (diceWidth / 2) - i * (diceWidth + gap);

            // 每颗骰子的随机参数
            var delay       = i * 40;                                  // 错开落点
            var randRot     = (Math.random() - 0.5) * 720;             // 总旋转量
            var randX       = (Math.random() - 0.5) * 30;             // 水平偏移
            var randBounce1 = 0.25 + Math.random() * 0.15;            // 第一次跳高
            var randBounce2 = 0.12 + Math.random() * 0.08;             // 第二次跳高
            var randBounce3 = 0.05 + Math.random() * 0.05;            // 第三次跳高

            // 关键帧：归一化时间 t（0→1），y（向上为正），rot（度数），scale
            // 碗内底部基准线在 y=0
            var frames = [
                // t     y           rot      sx   sy
                { t: 0,   y: -110,   rot: 0,   sx: 0.4, sy: 0.6 },   // 起始：碗外上方，缩小
                { t: 0.20, y: 0,     rot: randRot * 0.3, sx: 1.1, sy: 1.0 },  // 落入碗底，旋转中，横向拉伸
                { t: 0.35, y: -30 * randBounce1, rot: randRot * 0.5,  sx: 1.0, sy: 1.0 },  // 弹起
                { t: 0.50, y: 0,     rot: randRot * 0.65, sx: 1.0, sy: 1.0 },  // 落下
                { t: 0.62, y: -15 * randBounce2, rot: randRot * 0.78, sx: 1.0, sy: 1.0 },  // 再弹起（更小）
                { t: 0.74, y: 0,     rot: randRot * 0.88, sx: 1.0, sy: 1.0 },  // 落下
                { t: 0.83, y: -5 * randBounce3,  rot: randRot * 0.94, sx: 1.0, sy: 1.0 },  // 微弹
                { t: 0.90, y: 0,     rot: randRot * 0.97, sx: 1.0, sy: 1.0 },  // 最终落地
                { t: 1.0,  y: 0,     rot: randRot,        sx: 1.0, sy: 1.0 },  // 固定
            ];

            // 生成 CSS 关键帧字符串
            var steps = frames.map(function (f, idx) {
                // y: 碗内基准向上为正，所以碗底 y=0
                // 转换为 CSS transform: translateY(-y) 使其向下（CSS y轴向下）
                var tx = finalLeft + randX;
                var ty = -f.y;
                return (idx * 100 / (frames.length - 1)) + '%{transform:translate(' +
                    tx.toFixed(1) + 'px,' + ty.toFixed(1) + 'px) rotate(' +
                    f.rot.toFixed(1) + 'deg) scale(' + f.sx + ',' + f.sy + ')}';
            }).join('');

            var animName = 'diceRoll_' + i + '_' + Date.now();
            var styleEl = document.createElement('style');
            styleEl.textContent = '@keyframes ' + animName + '{' + steps + '}';
            document.head.appendChild(styleEl);

            // 应用动画：每颗骰子错开 delay ms 落下
            dieEl.style.animation = animName + ' ' + duration + 'ms ' +
                'cubic-bezier(0.22,0.61,0.36,1) ' + (delay / 1000) + 's both';

            // 最后一帧改为 ease-out 使停止更自然
            setTimeout(function (el, fn, d) {
                return function () {
                    el.style.animation = '';
                    el.style.transform = 'translate(' + (finalLeft + randX).toFixed(1) + 'px,0) rotate(' + randRot.toFixed(1) + 'deg)';
                    setTimeout(function () {
                        el.style.transform = 'translate(' + finalLeft.toFixed(1) + 'px,0) rotate(0deg)';
                    }, 80);
                    setTimeout(function () { el.classList.add('placed'); el.style.transform = ''; el.style.position = 'relative'; el.style.left = ''; }, 250);
                };
            }(dieEl, finalValues, delay), duration - delay + 20);
        }

        setTimeout(onDone, duration + 300);
    }

    /**
     * 单颗骰子弹入（21点"再来一颗"）
     * 骰子从右侧滑入碗内
     */
    function animateSingleDie(container, value, onDone) {
        var el = createDieEl(value);
        el.style.transform = 'translate(80px, -60px) rotate(360deg) scale(0.5)';
        el.style.opacity = '0';
        container.appendChild(el);

        // 触发动画
        requestAnimationFrame(function () {
            el.style.transition = 'transform 0.5s cubic-bezier(0.34,1.56,0.64,1), opacity 0.15s ease';
            el.style.opacity = '1';
            el.style.transform = 'translate(0, 0) rotate(0deg) scale(1)';

            setTimeout(function () {
                el.style.transition = '';
                el.classList.add('placed');
                el.style.transform = '';
                if (onDone) onDone();
            }, 520);
        });
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
