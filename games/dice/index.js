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

    // ===================== 骰子渲染 =====================
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
        for (var i = 0; i < 9; i++) {
            var dot = document.createElement('div');
            dot.className = 'dot' + (DOT_PATTERNS[value].indexOf(i) > -1 ? ' on' : '');
            el.appendChild(dot);
        }
        return el;
    }

    function renderDice(container, values, rolling) {
        container.innerHTML = '';
        for (var i = 0; i < values.length; i++) {
            var el = createDieEl(values[i]);
            if (rolling) el.classList.add('rolling');
            container.appendChild(el);
        }
    }

    function animateRoll(container, finalValues, duration, onDone) {
        renderDice(container, finalValues, true);
        var interval = setInterval(function () {
            var fake = [];
            for (var i = 0; i < finalValues.length; i++) fake.push(1 + Math.floor(Math.random() * 6));
            renderDice(container, fake, true);
        }, 55);
        setTimeout(function () {
            clearInterval(interval);
            renderDice(container, finalValues, false);
            if (onDone) onDone();
        }, duration);
    }

    function rollDie() { return 1 + Math.floor(Math.random() * 6); }

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
        if (newMode === 'dice21') ensure21ButtonReady();
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
        if (mode === 'dice21') {
            console.log('[dice] start21Game called, game21Over=', game21Over, 'isRolling=', isRolling);
            start21Game();
        } else {
            doGuessRoll();
        }
    });

    // ===================== 模式切换 =====================
    function ensure21ButtonReady() {
        var btnRoll = document.getElementById('btnRoll');
        if (btnRoll) {
            btnRoll.style.display = '';
            btnRoll.textContent   = '🎮 开始游戏';
            btnRoll.disabled = false;
        }
        set21Buttons(false, false);
    }

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

        animateRoll(document.getElementById('diceRow'), currentDice, 850, function () {
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

        var dur = 850;
        animateRoll(document.getElementById('playerDiceRow'), pd, dur, function () {});
        animateRoll(document.getElementById('aiDiceRow'),     ad, dur, function () {});

        setTimeout(function () {
            renderDice(document.getElementById('playerDiceRow'), pd, false);
            renderDice(document.getElementById('aiDiceRow'),     ad, false);

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
        }, dur + 80);
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

        var btnRoll = document.getElementById('btnRoll');
        if (btnRoll) {
            btnRoll.style.display = '';
            btnRoll.textContent   = '🎮 开始游戏';
            btnRoll.disabled = false;
        }
    }

    function start21Game() {
        if (isRolling || game21Over) return;
        var btnRoll = document.getElementById('btnRoll');
        if (btnRoll) btnRoll.style.display = 'none';

        p21Dice.push(rollDie());
        ai21Dice.push(rollDie());
        renderDice(document.getElementById('dice21Row'), p21Dice, false);
        update21Scores();
        set21Buttons(true, true);
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

        var container = document.getElementById('dice21Row');
        var el = createDieEl(d);
        container.appendChild(el);

        setTimeout(function () {
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
        }, 350);
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
            row.appendChild(el);
        });

        var vs = document.createElement('span');
        vs.textContent = 'vs';
        vs.style.cssText = 'font-size:1.2rem;color:rgba(255,255,255,0.45);font-weight:700;';

        ai21Dice.forEach(function (v) {
            var el = createDieEl(v);
            el.style.boxShadow = '0 4px 12px rgba(162,155,254,0.5)';
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
