/* =============================================
   index.js — 抽乌龟游戏逻辑
   使用 game-ui.js 的 pageAudio API
   ============================================= */

(function () {
  'use strict';

  // 游戏常量
  const SUITS = ['♥', '♦', '♣', '♠'];
  const RANKS = ['7', '8', '9', '10', 'J', 'Q'];
  const GHOST_RANK = 'Q';  // 梅花Q是鬼牌
  const STORAGE_KEY_WINS = 'oldmaid_wins';
  const STORAGE_KEY_BEST = 'oldmaid_best';
  const STORAGE_KEY_STREAK = 'oldmaid_streak';

  // 游戏状态
  const state = {
    deck: [],
    playerHand: [],
    aiHand: [],
    isPlayerTurn: true,
    gameOver: false,
    gameStarted: false,
    wins: 0,
    bestStreak: 0,
    currentStreak: 0,
    isProcessing: false
  };

  // DOM 元素
  const elements = {
    playerCards: document.getElementById('playerCards'),
    aiCards: document.getElementById('aiCards'),
    playerCardCount: document.getElementById('playerCardCount'),
    aiCardCount: document.getElementById('aiCardCount'),
    wins: document.getElementById('wins'),
    bestStreak: document.getElementById('bestStreak'),
    currentStreak: document.getElementById('currentStreak'),
    resultDisplay: document.getElementById('resultDisplay'),
    resultText: document.getElementById('resultText'),
    turnIndicator: document.getElementById('turnIndicator'),
    turnText: document.querySelector('.turn-text'),
    actionHint: document.getElementById('actionHint'),
    btnStart: document.getElementById('btnStart'),
    btnNew: document.getElementById('btnNew')
  };

  // 音频管理器
  let audio = null;

  function initAudio() {
    if (typeof GamePageUI !== 'undefined') {
      const pageUI = GamePageUI.mount({ home: true, sound: true }, 'bar');
      audio = {
        play: function (type) { pageUI.play(type); }
      };
    }
  }

  function playSound(type) {
    if (audio) {
      audio.play(type);
    }
  }

  // 创建牌组（24张：4花色×6点数，其中梅花Q是鬼牌）
  function createDeck() {
    const deck = [];
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        deck.push({
          suit,
          rank,
          isGhost: suit === '♣' && rank === GHOST_RANK
        });
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

  // 创建牌元素
  function createCardElement(card, faceDown = false, clickable = false) {
    const cardEl = document.createElement('div');
    const isRed = ['♥', '♦'].includes(card.suit);

    if (faceDown) {
      cardEl.className = 'card back';
      cardEl.innerHTML = `<div class="card-center">🎴</div>`;
    } else {
      let cardClass = 'card ' + (card.isGhost ? 'ghost' : (isRed ? 'red' : 'black'));
      if (clickable) cardClass += ' clickable';

      const ghostIcon = card.isGhost ? '🕷️' : card.suit;
      cardEl.className = cardClass;
      cardEl.innerHTML = `
        <div class="card-corner top">
          <span class="card-rank">${card.rank}</span>
          <span class="card-suit">${card.suit}</span>
        </div>
        <div class="card-center">${ghostIcon}</div>
        <div class="card-corner bottom">
          <span class="card-rank">${card.rank}</span>
          <span class="card-suit">${card.suit}</span>
        </div>
      `;
    }

    return cardEl;
  }

  // 检查是否有配对
  function findPair(hand) {
    const rankCount = {};
    for (const card of hand) {
      if (rankCount[card.rank]) {
        return [card, rankCount[card.rank]];
      }
      rankCount[card.rank] = card;
    }
    return null;
  }

  // 移除配对
  function removePair(hand, card1, card2) {
    const idx1 = hand.indexOf(card1);
    if (idx1 > -1) hand.splice(idx1, 1);
    const idx2 = hand.indexOf(card2);
    if (idx2 > -1) hand.splice(idx2, 1);
  }

  // 更新手牌显示
  function updateHandDisplay() {
    // 更新玩家手牌
    elements.playerCards.innerHTML = '';
    state.playerHand.forEach((card, index) => {
      const cardEl = createCardElement(card, false, false);
      cardEl.style.animationDelay = `${index * 0.05}s`;
      elements.playerCards.appendChild(cardEl);
    });
    elements.playerCardCount.textContent = `(${state.playerHand.length}张)`;

    // 更新AI手牌（背面朝上，点击可抽）
    elements.aiCards.innerHTML = '';
    state.aiHand.forEach((card, index) => {
      const cardEl = createCardElement(card, true, state.isPlayerTurn && !state.gameOver);
      cardEl.style.animationDelay = `${index * 0.05}s`;
      cardEl.dataset.index = index;

      if (state.isPlayerTurn && !state.gameOver && state.gameStarted) {
        cardEl.addEventListener('click', () => playerDrawFromAI(index));
      }

      elements.aiCards.appendChild(cardEl);
    });
    elements.aiCardCount.textContent = `(${state.aiHand.length}张)`;
  }

  // 更新分数显示
  function updateStatsDisplay() {
    elements.wins.textContent = state.wins;
    elements.bestStreak.textContent = state.bestStreak;
    elements.currentStreak.textContent = state.currentStreak;
  }

  // 加载存档
  function loadStats() {
    state.wins = parseInt(localStorage.getItem(STORAGE_KEY_WINS)) || 0;
    state.bestStreak = parseInt(localStorage.getItem(STORAGE_KEY_BEST)) || 0;
    state.currentStreak = parseInt(localStorage.getItem(STORAGE_KEY_STREAK)) || 0;
    updateStatsDisplay();
  }

  // 保存存档
  function saveStats() {
    localStorage.setItem(STORAGE_KEY_WINS, state.wins);
    localStorage.setItem(STORAGE_KEY_BEST, state.bestStreak);
    localStorage.setItem(STORAGE_KEY_STREAK, state.currentStreak);
  }

  // 显示结果
  function showResult(message, type) {
    elements.resultText.textContent = message;
    elements.resultText.className = `result-text show ${type}`;
  }

  // 更新回合指示器
  function updateTurnIndicator(text) {
    elements.turnText.textContent = text;
  }

  // 更新操作提示
  function updateActionHint(text) {
    elements.actionHint.textContent = text;
  }

  // 更新按钮状态
  function updateButtons() {
    elements.btnStart.style.display = state.gameStarted ? 'none' : 'inline-block';
    elements.btnNew.style.display = state.gameOver ? 'inline-block' : 'none';
  }

  // 玩家从AI手牌抽牌
  async function playerDrawFromAI(cardIndex) {
    if (!state.isPlayerTurn || state.isProcessing || state.gameOver) return;

    state.isProcessing = true;
    playSound('tap');

    // 获取被抽的牌
    const drawnCard = state.aiHand[cardIndex];

    // 移除AI的牌
    state.aiHand.splice(cardIndex, 1);

    // 添加到玩家手牌
    state.playerHand.push(drawnCard);

    // 更新显示
    updateHandDisplay();
    playSound('move');

    await new Promise(r => setTimeout(r, 300));

    // 检查配对
    await checkAndRemovePairs(state.playerHand, elements.playerCards, true);

    // 检查输赢
    if (checkGameOver()) return;

    // 切换回合
    state.isPlayerTurn = false;
    state.isProcessing = false;

    updateTurnIndicator('🖥️ 电脑回合...');
    updateActionHint('');

    // 电脑回合
    await new Promise(r => setTimeout(r, 800));
    await aiTurn();
  }

  // 检查并移除配对
  async function checkAndRemovePairs(hand, container, isPlayer) {
    let pair = findPair(hand);

    while (pair) {
      playSound('success');

      // 找到配对的DOM元素并添加动画
      const cards = container.querySelectorAll('.card');
      let matchedCount = 0;

      for (const cardEl of cards) {
        const cardRank = cardEl.querySelector('.card-rank').textContent;
        const cardSuit = cardEl.querySelector('.card-suit').textContent;

        for (const p of pair) {
          if (cardRank === p.rank && cardSuit === p.suit) {
            cardEl.classList.add('matched');
            matchedCount++;
            break;
          }
        }

        if (matchedCount >= 2) break;
      }

      await new Promise(r => setTimeout(r, 500));

      // 移除配对
      removePair(hand, pair[0], pair[1]);

      // 重新显示
      updateHandDisplay();

      await new Promise(r => setTimeout(r, 200));

      // 继续检查
      pair = findPair(hand);
    }
  }

  // AI回合
  async function aiTurn() {
    if (state.gameOver || state.playerHand.length === 0) {
      // AI输了
      endGame(true);
      return;
    }

    playSound('tap');
    updateTurnIndicator('🖥️ 电脑正在抽牌...');

    await new Promise(r => setTimeout(r, 600));

    // AI随机抽一张
    const randomIndex = Math.floor(Math.random() * state.playerHand.length);
    const drawnCard = state.playerHand[randomIndex];

    // 移除玩家手牌
    state.playerHand.splice(randomIndex, 1);

    // 添加到AI手牌
    state.aiHand.push(drawnCard);

    playSound('move');

    // 更新显示
    updateHandDisplay();

    await new Promise(r => setTimeout(r, 300));

    // 检查配对
    await checkAndRemovePairs(state.aiHand, elements.aiCards, false);

    // 检查输赢
    if (checkGameOver()) return;

    // 切换到玩家回合
    state.isPlayerTurn = true;
    state.isProcessing = false;

    updateTurnIndicator('👤 你的回合！');
    updateActionHint('👆 点击电脑的牌来抽取一张');
    updateHandDisplay();
  }

  // 检查游戏是否结束
  function checkGameOver() {
    // 玩家只剩一张牌
    if (state.playerHand.length === 1) {
      const card = state.playerHand[0];
      if (card.isGhost) {
        // 玩家拿到鬼牌，AI赢
        endGame(false);
      } else {
        // 玩家没拿到鬼牌，继续（只有一张牌，不能再抽）
        // 检查AI是否也只剩一张
        if (state.aiHand.length === 1) {
          const aiCard = state.aiHand[0];
          if (aiCard.isGhost) {
            // AI拿鬼牌，玩家赢
            endGame(true);
          } else {
            // 继续游戏（但双方都只有一张，无法继续）
            // 判定最后拿鬼牌的人输
            endGame(true); // 玩家没拿鬼牌，AI拿了
          }
        }
      }
      return true;
    }

    // AI只剩一张牌
    if (state.aiHand.length === 1) {
      const card = state.aiHand[0];
      if (card.isGhost) {
        // AI拿鬼牌，玩家赢
        endGame(true);
      } else {
        // AI没拿鬼牌，玩家赢
        endGame(true);
      }
      return true;
    }

    return false;
  }

  // 游戏结束
  function endGame(playerWins) {
    state.gameOver = true;
    state.isProcessing = false;

    if (playerWins) {
      playSound('win');
      state.wins++;
      state.currentStreak++;
      if (state.currentStreak > state.bestStreak) {
        state.bestStreak = state.currentStreak;
      }
      saveStats();
      updateStatsDisplay();
      showResult('🎉 你赢了！', 'win');
      updateTurnIndicator('🏆 恭喜获胜！');
    } else {
      playSound('lose');
      state.currentStreak = 0;
      saveStats();
      updateStatsDisplay();
      showResult('😢 你输了...', 'lose');
      updateTurnIndicator('💀 鬼牌是你的了！');
    }

    updateActionHint('');

    // 显示鬼牌
    revealGhostCard();

    updateButtons();
  }

  // 揭示鬼牌位置
  function revealGhostCard() {
    // 揭示玩家手中的鬼牌
    const playerCards = elements.playerCards.querySelectorAll('.card');
    playerCards.forEach(cardEl => {
      const cardRank = cardEl.querySelector('.card-rank').textContent;
      const cardSuit = cardEl.querySelector('.card-suit').textContent;
      if (cardRank === 'Q' && cardSuit === '♣') {
        cardEl.className = 'card ghost';
        cardEl.innerHTML = `
          <div class="card-corner top">
            <span class="card-rank">Q</span>
            <span class="card-suit">♣</span>
          </div>
          <div class="card-center">🕷️</div>
          <div class="card-corner bottom">
            <span class="card-rank">Q</span>
            <span class="card-suit">♣</span>
          </div>
        `;
      }
    });

    // 揭示AI手中的鬼牌
    const aiCards = elements.aiCards.querySelectorAll('.card');
    aiCards.forEach(cardEl => {
      // 需要翻转卡片
      cardEl.className = 'card ghost';
      cardEl.innerHTML = `
        <div class="card-corner top">
          <span class="card-rank">Q</span>
          <span class="card-suit">♣</span>
        </div>
        <div class="card-center">🕷️</div>
        <div class="card-corner bottom">
          <span class="card-rank">Q</span>
          <span class="card-suit">♣</span>
        </div>
      `;
    });
  }

  // 开始新游戏
  async function startNewGame() {
    playSound('start');

    state.gameStarted = true;
    state.gameOver = false;
    state.isPlayerTurn = true;
    state.isProcessing = false;

    // 重置手牌
    state.playerHand = [];
    state.aiHand = [];

    // 创建并洗牌
    state.deck = shuffleDeck(createDeck());

    // 发牌：每人11张，剩余2张作为备用牌堆
    for (let i = 0; i < 11; i++) {
      state.playerHand.push(state.deck.pop());
      state.aiHand.push(state.deck.pop());
    }

    // 确保鬼牌在AI手中（如果不在，交换）
    let playerHasGhost = state.playerHand.some(c => c.isGhost);
    let aiHasGhost = state.aiHand.some(c => c.isGhost);

    if (playerHasGhost && !aiHasGhost) {
      // 玩家拿到鬼牌，随机从玩家换一张给AI
      const ghostIdx = state.playerHand.findIndex(c => c.isGhost);
      const normalIdx = state.aiHand.findIndex(c => !c.isGhost);
      [state.playerHand[ghostIdx], state.aiHand[normalIdx]] =
      [state.aiHand[normalIdx], state.playerHand[ghostIdx]];
    }

    // 检查初始配对并移除
    await checkAndRemovePairs(state.playerHand, elements.playerCards, true);
    await checkAndRemovePairs(state.aiHand, elements.aiCards, false);

    updateHandDisplay();
    updateButtons();

    updateTurnIndicator('👤 你的回合！');
    updateActionHint('👆 点击电脑的牌来抽取一张');
  }

  // 事件绑定
  function bindEvents() {
    elements.btnStart.addEventListener('click', startNewGame);
    elements.btnNew.addEventListener('click', startNewGame);
  }

  // 初始化
  function init() {
    loadStats();
    initAudio();
    bindEvents();
    updateButtons();
  }

  // 启动游戏
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
