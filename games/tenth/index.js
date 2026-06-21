/* =============================================
   index.js — 十点半游戏逻辑
   ============================================= */

(function () {
  'use strict';

  // ============ DOM Elements ============
  var els = {
    dealerCards: document.getElementById('dealer-cards'),
    playerCards: document.getElementById('player-cards'),
    dealerPoints: document.getElementById('dealer-points'),
    playerPoints: document.getElementById('player-points'),
    gameStatus: document.querySelector('.status-text'),
    newGameBtn: document.getElementById('new-game-btn'),
    hitBtn: document.getElementById('hit-btn'),
    standBtn: document.getElementById('stand-btn'),
    winsCount: document.getElementById('wins-count'),
    bestScore: document.getElementById('best-score'),
    winOverlay: document.getElementById('win-overlay'),
    winParticles: document.querySelector('.win-particles'),
    soundBtn: document.querySelector('.sound-btn')
  };

  // ============ Game State ============
  var state = {
    deck: [],
    playerHand: [],
    dealerHand: [],
    playerScore: 0,
    dealerScore: 0,
    gameOver: false,
    playerStood: false,
    wins: 0,
    best: 0,
    isPlayerTurn: false
  };

  // ============ Audio ============
  var pageAudio = null;

  // ============ Card Data ============
  var SUITS = ['♠', '♥', '♦', '♣'];
  var SUIT_COLORS = { '♠': 'black', '♥': 'red', '♦': 'red', '♣': 'black' };
  var RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

  // ============ Utility Functions ============
  function shuffle(array) {
    var arr = array.slice();
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var temp = arr[i];
      arr[i] = arr[j];
      arr[j] = temp;
    }
    return arr;
  }

  function createDeck() {
    var deck = [];
    SUITS.forEach(function (suit) {
      RANKS.forEach(function (rank) {
        deck.push({ suit: suit, rank: rank });
      });
    });
    return shuffle(deck);
  }

  function getCardValue(card) {
    var rank = card.rank;
    if (rank === 'A') return 1; // 先给1，后面再优化
    if (['J', 'Q', 'K'].indexOf(rank) !== -1) return 0.5;
    return parseInt(rank, 10);
  }

  function calculateBestScore(cards) {
    if (cards.length === 0) return 0;

    // 计算所有可能的选择
    var aces = cards.filter(function (c) { return c.rank === 'A'; }).length;
    var others = cards.filter(function (c) { return c.rank !== 'A'; });
    var baseScore = others.reduce(function (sum, c) { return sum + getCardValue(c); }, 0);

    // 尝试不同的A的值（1或0.5）
    var bestScore = 0;
    for (var i = 0; i <= aces; i++) {
      var score = baseScore + i * 1 + (aces - i) * 0.5;
      if (score <= 10.5 && score > bestScore) {
        bestScore = score;
      }
    }

    // 如果所有选择都超过10.5，返回最小值
    if (bestScore === 0) {
      bestScore = baseScore + aces * 0.5;
    }

    return bestScore;
  }

  function isBust(score) {
    return score > 10.5;
  }

  function getScoreClass(score) {
    if (score === 0) return '';
    if (score <= 5) return 'safe';
    if (score <= 8) return 'risky';
    return 'danger';
  }

  // ============ Rendering ============
  function createCardElement(card, faceDown) {
    var div = document.createElement('div');
    div.className = 'card';

    if (faceDown) {
      div.className += ' face-down';
    } else {
      div.className += ' ' + SUIT_COLORS[card.suit];
      div.innerHTML =
        '<span class="card-rank">' + card.rank + '</span>' +
        '<span class="card-suit">' + card.suit + '</span>' +
        '<span class="card-value">' + getCardValue(card) + '</span>';
    }

    return div;
  }

  function renderCards() {
    // Clear containers
    els.dealerCards.innerHTML = '';
    els.playerCards.innerHTML = '';

    // Render dealer cards (first card face down until game ends)
    state.dealerHand.forEach(function (card, index) {
      var faceDown = index === 0 && !state.gameOver;
      els.dealerCards.appendChild(createCardElement(card, faceDown));
    });

    // Render player cards
    state.playerHand.forEach(function (card) {
      els.playerCards.appendChild(createCardElement(card, false));
    });
  }

  function updatePointsDisplay() {
    // Dealer points
    if (state.dealerHand.length > 0) {
      var dealerScore = calculateBestScore(state.dealerHand);
      els.dealerPoints.textContent = state.gameOver ? dealerScore : '?';
      els.dealerPoints.className = 'points-badge ' + getScoreClass(dealerScore);
      if (isBust(dealerScore)) {
        els.dealerPoints.classList.add('bust');
      }
    } else {
      els.dealerPoints.textContent = '-';
      els.dealerPoints.className = 'points-badge';
    }

    // Player points
    els.playerPoints.textContent = state.playerScore;
    els.playerPoints.className = 'points-badge ' + getScoreClass(state.playerScore);
    if (isBust(state.playerScore)) {
      els.playerPoints.classList.add('bust');
    }
  }

  function setStatus(text, type) {
    els.gameStatus.textContent = text;
    els.gameStatus.className = 'status-text';
    if (type) {
      els.gameStatus.classList.add(type);
    }
  }

  function updateButtons() {
    els.hitBtn.disabled = !state.isPlayerTurn;
    els.standBtn.disabled = !state.isPlayerTurn;
    els.newGameBtn.disabled = !state.gameOver;
  }

  // ============ Win Animation ============
  function showWinAnimation() {
    els.winOverlay.classList.remove('hidden');
    els.winParticles.innerHTML = '';

    var emojis = ['💰', '🪙', '⭐', '✨', '💎', '🎉', '🏆'];
    var count = 30;

    for (var i = 0; i < count; i++) {
      var particle = document.createElement('div');
      particle.textContent = emojis[Math.floor(Math.random() * emojis.length)];
      particle.style.cssText = [
        'position: absolute',
        'font-size: ' + (20 + Math.random() * 30) + 'px',
        'left: ' + (Math.random() * 100) + '%',
        'top: 100%',
        'animation: coinFall ' + (1.5 + Math.random() * 2) + 's ease-out forwards',
        'animation-delay: ' + (Math.random() * 0.5) + 's',
        'opacity: 0',
        'pointer-events: none'
      ].join(';');
      els.winParticles.appendChild(particle);
    }

    // Add keyframes dynamically
    if (!document.getElementById('win-anim-style')) {
      var style = document.createElement('style');
      style.id = 'win-anim-style';
      style.textContent = [
        '@keyframes coinFall {',
        '  0% { transform: translateY(0) rotate(0deg); opacity: 1; }',
        '  100% { transform: translateY(-100vh) rotate(' + (Math.random() * 720 - 360) + 'deg); opacity: 0; }',
        '}'
      ].join('');
      document.head.appendChild(style);
    }

    setTimeout(function () {
      els.winOverlay.classList.add('hidden');
    }, 3000);
  }

  // ============ Game Logic ============
  function startNewGame() {
    // Reset state
    state.deck = createDeck();
    state.playerHand = [];
    state.dealerHand = [];
    state.playerScore = 0;
    state.dealerScore = 0;
    state.gameOver = false;
    state.playerStood = false;
    state.isPlayerTurn = true;

    // Deal initial cards
    state.playerHand.push(state.deck.pop());
    state.dealerHand.push(state.deck.pop());
    state.playerHand.push(state.deck.pop());
    state.dealerHand.push(state.deck.pop());

    // Calculate scores
    state.playerScore = calculateBestScore(state.playerHand);
    state.dealerScore = calculateBestScore(state.dealerHand);

    // Update UI
    renderCards();
    updatePointsDisplay();
    setStatus('请选择要牌或停牌');
    updateButtons();

    // Check for immediate bust
    if (isBust(state.playerScore)) {
      endGame('player-bust');
    }

    // Play sound
    if (pageAudio) pageAudio.play('start');
  }

  function playerHit() {
    if (!state.isPlayerTurn || state.gameOver) return;

    state.playerHand.push(state.deck.pop());
    state.playerScore = calculateBestScore(state.playerHand);

    renderCards();
    updatePointsDisplay();

    if (pageAudio) pageAudio.play('tap');

    if (isBust(state.playerScore)) {
      endGame('player-bust');
    }
  }

  function playerStand() {
    if (!state.isPlayerTurn || state.gameOver) return;

    state.isPlayerTurn = false;
    state.playerStood = true;
    setStatus('等待庄家...');
    updateButtons();

    if (pageAudio) pageAudio.play('tap');

    // Dealer turn
    setTimeout(dealerPlay, 800);
  }

  function dealerPlay() {
    // Reveal dealer's hidden card
    renderCards();
    updatePointsDisplay();

    var dealerScore = calculateBestScore(state.dealerHand);
    state.dealerScore = dealerScore;

    // Dealer AI: <7必补，7-8.5可选，>=9必停
    var shouldHit = false;
    if (dealerScore < 7) {
      shouldHit = true;
    } else if (dealerScore >= 7 && dealerScore <= 8.5) {
      // 50% chance to hit when between 7 and 8.5
      shouldHit = Math.random() < 0.5;
    }
    // >=9 always stands

    if (shouldHit && dealerScore < 10.5) {
      state.dealerHand.push(state.deck.pop());
      state.dealerScore = calculateBestScore(state.dealerHand);
      renderCards();
      updatePointsDisplay();

      if (pageAudio) pageAudio.play('drop');

      if (isBust(state.dealerScore)) {
        setTimeout(function () { endGame('dealer-bust'); }, 500);
      } else {
        setTimeout(dealerPlay, 800);
      }
    } else {
      setTimeout(function () { determineWinner(); }, 500);
    }
  }

  function determineWinner() {
    var playerScore = state.playerScore;
    var dealerScore = state.dealerScore;

    if (playerScore > dealerScore) {
      endGame('player-win');
    } else if (dealerScore > playerScore) {
      endGame('dealer-win');
    } else {
      endGame('push');
    }
  }

  function endGame(result) {
    state.gameOver = true;
    state.isPlayerTurn = false;

    var resultText = '';
    var resultClass = '';

    switch (result) {
      case 'player-bust':
        resultText = '💥 爆牌了！庄家获胜';
        resultClass = 'lose';
        if (pageAudio) pageAudio.play('error');
        break;
      case 'dealer-bust':
        resultText = '🎉 庄家爆牌！你赢了！';
        resultClass = 'win';
        state.wins++;
        if (state.playerScore > state.best) {
          state.best = state.playerScore;
          localStorage.setItem('tenth_best', state.best);
        }
        showWinAnimation();
        if (pageAudio) pageAudio.play('win');
        break;
      case 'player-win':
        resultText = '🏆 恭喜！你赢了！';
        resultClass = 'win';
        state.wins++;
        if (state.playerScore > state.best) {
          state.best = state.playerScore;
          localStorage.setItem('tenth_best', state.best);
        }
        showWinAnimation();
        if (pageAudio) pageAudio.play('win');
        break;
      case 'dealer-win':
        resultText = '😢 庄家获胜，再接再厉';
        resultClass = 'lose';
        if (pageAudio) pageAudio.play('lose');
        break;
      case 'push':
        resultText = '🤝 平局！';
        resultClass = 'push';
        if (pageAudio) pageAudio.play('clear');
        break;
    }

    setStatus(resultText, resultClass);
    updateStats();
    renderCards();
    updatePointsDisplay();
    updateButtons();
  }

  function updateStats() {
    els.winsCount.textContent = state.wins;
    els.bestScore.textContent = state.best > 0 ? state.best : '-';
  }

  // ============ Event Listeners ============
  function init() {
    // Load saved data
    state.wins = parseInt(localStorage.getItem('tenth_wins') || '0', 10);
    state.best = parseFloat(localStorage.getItem('tenth_best') || '0') || 0;
    updateStats();

    // Button events
    els.newGameBtn.addEventListener('click', startNewGame);
    els.hitBtn.addEventListener('click', playerHit);
    els.standBtn.addEventListener('click', playerStand);

    // Save wins periodically
    setInterval(function () {
      localStorage.setItem('tenth_wins', state.wins);
    }, 5000);

    // Initialize UI
    setStatus('点击开始游戏');
    updateButtons();
  }

  // ============ Initialize ============
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      // Mount game UI
      var ui = GamePageUI.mount({ sound: true, home: true });
      pageAudio = ui;

      init();
    });
  } else {
    var ui = GamePageUI.mount({ sound: true, home: true }, 'bar');
    pageAudio = ui;
    init();
  }
})();
