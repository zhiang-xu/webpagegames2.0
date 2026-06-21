/* =============================================
   index.js — 二十一点游戏逻辑
   使用 game-ui.js 的 pageAudio API
   ============================================= */

(function () {
  'use strict';

  // 游戏状态
  const state = {
    deck: [],
    playerHand: [],
    dealerHand: [],
    gameOver: false,
    playerStood: false,
    bestScore: 0,
    wins: 0
  };

  // 常量
  const SUITS = ['♥', '♦', '♣', '♠'];
  const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  const STORAGE_KEY = 'blackjack_best';
  const WINS_KEY = 'blackjack_wins';

  // DOM 元素
  const elements = {
    dealerCards: document.getElementById('dealerCards'),
    playerCards: document.getElementById('playerCards'),
    dealerScore: document.getElementById('dealerScore'),
    playerScore: document.getElementById('playerScore'),
    currentScore: document.getElementById('currentScore'),
    bestScore: document.getElementById('bestScore'),
    wins: document.getElementById('wins'),
    resultDisplay: document.getElementById('resultDisplay'),
    resultText: document.getElementById('resultText'),
    btnDeal: document.getElementById('btnDeal'),
    btnHit: document.getElementById('btnHit'),
    btnStand: document.getElementById('btnStand'),
    btnNew: document.getElementById('btnNew'),
    soundBtn: document.getElementById('soundBtn')
  };

  // 初始化音频
  let audio = null;

  function initAudio() {
    if (typeof GamePageUI !== 'undefined') {
      const pageUI = GamePageUI.mount({
        home: false,
        sound: true,
        muted: false
      }, 'bar');
      audio = {
        play: function (type) {
          pageUI.play(type);
        }
      };
      // 设置按钮状态
      elements.soundBtn.textContent = pageUI.isMuted() ? '🔇' : '🔊';
      elements.soundBtn.classList.toggle('is-muted', pageUI.isMuted());
      elements.soundBtn.addEventListener('click', function () {
        const muted = pageUI.toggle();
        elements.soundBtn.textContent = muted ? '🔇' : '🔊';
        elements.soundBtn.classList.toggle('is-muted', muted);
        if (!muted) audio.play('tap');
      });
    }
  }

  function playSound(type) {
    if (audio) {
      audio.play(type);
    }
  }

  // 创建牌组
  function createDeck() {
    const deck = [];
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        deck.push({ suit, rank });
      }
    }
    return deck;
  }

  // Fisher-Yates 洗牌
  function shuffleDeck(deck) {
    const shuffled = [...deck];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  // 获取牌的点数
  function getCardValue(card) {
    if (['J', 'Q', 'K'].includes(card.rank)) {
      return 10;
    }
    if (card.rank === 'A') {
      return 11;
    }
    return parseInt(card.rank);
  }

  // 计算手牌点数
  function calculateHandValue(hand) {
    let value = 0;
    let aces = 0;

    for (const card of hand) {
      value += getCardValue(card);
      if (card.rank === 'A') {
        aces++;
      }
    }

    // A降为1点
    while (value > 21 && aces > 0) {
      value -= 10;
      aces--;
    }

    return value;
  }

  // 创建牌元素
  function createCardElement(card, faceDown = false) {
    const cardEl = document.createElement('div');
    const isRed = ['♥', '♦'].includes(card.suit);

    if (faceDown) {
      cardEl.className = 'card back';
      cardEl.innerHTML = `
        <div class="card-center">?</div>
      `;
    } else {
      cardEl.className = `card ${isRed ? 'red' : 'black'}`;
      cardEl.innerHTML = `
        <div class="card-corner top">
          <span class="card-rank">${card.rank}</span>
          <span class="card-suit">${card.suit}</span>
        </div>
        <div class="card-center">${card.suit}</div>
        <div class="card-corner bottom">
          <span class="card-rank">${card.rank}</span>
          <span class="card-suit">${card.suit}</span>
        </div>
      `;
    }

    return cardEl;
  }

  // 发牌动画
  async function dealCardWithAnimation(hand, container, faceDown = false) {
    return new Promise((resolve) => {
      const card = state.deck.pop();
      hand.push(card);
      const cardEl = createCardElement(card, faceDown);
      container.appendChild(cardEl);

      setTimeout(resolve, 300);
    });
  }

  // 更新分数显示
  function updateScoreDisplay() {
    const playerValue = calculateHandValue(state.playerHand);
    const dealerValue = calculateHandValue(state.dealerHand);

    elements.playerScore.textContent = playerValue > 0 ? `(${playerValue}点)` : '';
    elements.currentScore.textContent = playerValue;

    // 庄家明牌分数
    if (state.dealerHand.length > 0) {
      const visibleDealerValue = calculateHandValue(state.dealerHand.slice(1));
      elements.dealerScore.textContent = state.playerStood || state.gameOver
        ? `(${dealerValue}点)`
        : `(? + ${visibleDealerValue}点)`;
    }
  }

  // 显示结果
  function showResult(message, type) {
    elements.resultText.textContent = message;
    elements.resultText.className = `result-text show ${type}`;
  }

  // 隐藏结果
  function hideResult() {
    elements.resultText.className = 'result-text';
  }

  // 更新最高分
  function updateBestScore() {
    const playerValue = calculateHandValue(state.playerHand);
    if (playerValue > state.bestScore && playerValue <= 21) {
      state.bestScore = playerValue;
      localStorage.setItem(STORAGE_KEY, state.bestScore);
      elements.bestScore.textContent = state.bestScore;
    }
  }

  // 增加胜场
  function incrementWins() {
    state.wins++;
    localStorage.setItem(WINS_KEY, state.wins);
    elements.wins.textContent = state.wins;
  }

  // 加载存档
  function loadStats() {
    state.bestScore = parseInt(localStorage.getItem(STORAGE_KEY)) || 0;
    state.wins = parseInt(localStorage.getItem(WINS_KEY)) || 0;
    elements.bestScore.textContent = state.bestScore;
    elements.wins.textContent = state.wins;
  }

  // 清空手牌
  function clearHands() {
    elements.dealerCards.innerHTML = '';
    elements.playerCards.innerHTML = '';
    elements.dealerScore.textContent = '';
    hideResult();
  }

  // 更新按钮状态
  function updateButtons(playing = false) {
    elements.btnDeal.disabled = playing;
    elements.btnHit.disabled = !playing || state.gameOver;
    elements.btnStand.disabled = !playing || state.gameOver;
    elements.btnNew.style.display = state.gameOver ? 'inline-block' : 'none';
  }

  // 开始新游戏
  async function startNewGame() {
    playSound('start');

    state.deck = shuffleDeck(createDeck());
    state.playerHand = [];
    state.dealerHand = [];
    state.gameOver = false;
    state.playerStood = false;

    clearHands();
    updateButtons(true);
    elements.currentScore.textContent = '0';

    // 发牌：玩家第一张、庄家第一张（暗牌）、玩家第二张、庄家第二张
    await dealCardWithAnimation(state.playerHand, elements.playerCards, false);
    await dealCardWithAnimation(state.dealerHand, elements.dealerCards, true);
    await dealCardWithAnimation(state.playerHand, elements.playerCards, false);
    await dealCardWithAnimation(state.dealerHand, elements.dealerCards, false);

    updateScoreDisplay();
    playSound('deal');

    // 检查初始发牌是否 Blackjack
    const playerValue = calculateHandValue(state.playerHand);
    if (playerValue === 21) {
      await revealDealerCard();
      const dealerValue = calculateHandValue(state.dealerHand);
      if (dealerValue === 21) {
        endGame('平局！', 'push');
      } else {
        endGame('Blackjack! 你赢了!', 'blackjack');
        incrementWins();
      }
    }
  }

  // 要牌
  async function hit() {
    if (state.gameOver || state.playerStood) return;

    playSound('tap');
    await dealCardWithAnimation(state.playerHand, elements.playerCards, false);
    updateScoreDisplay();

    const playerValue = calculateHandValue(state.playerHand);

    if (playerValue > 21) {
      // 爆牌
      playSound('lose');
      showResult('爆牌了！你输了', 'lose');

      // 给所有牌添加爆牌动画
      const cards = elements.playerCards.querySelectorAll('.card');
      cards.forEach((card, i) => {
        setTimeout(() => card.classList.add('bust'), i * 100);
      });

      endGame();
    } else if (playerValue === 21) {
      // 刚好21点，自动停牌
      playSound('success');
      await stand();
    }
  }

  // 停牌
  async function stand() {
    if (state.gameOver) return;

    state.playerStood = true;
    playSound('move');

    // 揭示庄家暗牌
    await revealDealerCard();

    // 庄家要牌直到17点以上
    await dealerPlay();
  }

  // 揭示庄家暗牌
  async function revealDealerCard() {
    const hiddenCard = elements.dealerCards.querySelector('.card.back');
    if (hiddenCard) {
      const card = state.dealerHand[0];
      const isRed = ['♥', '♦'].includes(card.suit);
      hiddenCard.className = `card ${isRed ? 'red' : 'black'}`;
      hiddenCard.innerHTML = `
        <div class="card-corner top">
          <span class="card-rank">${card.rank}</span>
          <span class="card-suit">${card.suit}</span>
        </div>
        <div class="card-center">${card.suit}</div>
        <div class="card-corner bottom">
          <span class="card-rank">${card.rank}</span>
          <span class="card-suit">${card.suit}</span>
        </div>
      `;
      playSound('move');
      await new Promise(r => setTimeout(r, 300));
    }
    updateScoreDisplay();
  }

  // 庄家AI
  async function dealerPlay() {
    let dealerValue = calculateHandValue(state.dealerHand);

    while (dealerValue < 17) {
      await dealCardWithAnimation(state.dealerHand, elements.dealerCards, false);
      updateScoreDisplay();
      dealerValue = calculateHandValue(state.dealerHand);
      playSound('tap');
      await new Promise(r => setTimeout(r, 500));
    }

    // 庄家停牌，判断胜负
    const playerValue = calculateHandValue(state.playerHand);

    await new Promise(r => setTimeout(r, 300));

    if (dealerValue > 21) {
      playSound('win');
      showResult('庄家爆牌！你赢了', 'win');
      incrementWins();
      updateBestScore();
    } else if (dealerValue > playerValue) {
      playSound('lose');
      showResult('庄家获胜', 'lose');
    } else if (dealerValue < playerValue) {
      playSound('win');
      showResult('你赢了！', 'win');
      incrementWins();
      updateBestScore();
    } else {
      playSound('clear');
      showResult('平局！', 'push');
    }

    endGame();
  }

  // 游戏结束
  function endGame(message) {
    state.gameOver = true;
    updateButtons(false);
  }

  // 事件绑定
  function bindEvents() {
    elements.btnDeal.addEventListener('click', startNewGame);
    elements.btnHit.addEventListener('click', hit);
    elements.btnStand.addEventListener('click', stand);
    elements.btnNew.addEventListener('click', startNewGame);
  }

  // 初始化
  function init() {
    loadStats();
    initAudio();
    bindEvents();
    updateButtons(false);
  }

  // 启动游戏
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
