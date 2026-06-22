/* =============================================
   index.js — 钓鱼吃牌游戏逻辑
   使用 game-ui.js 的 pageAudio API
   ============================================= */

(function () {
  'use strict';

  // 游戏常量
  const SUITS = ['♥', '♦', '♣', '♠'];
  const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  const STORAGE_KEY_BEST = 'fishpond_best';
  const TABLE_SIZE = 4;

  // 游戏状态
  const state = {
    deck: [],
    playerHand: [],
    aiHand: [],
    tableCards: [],
    isPlayerTurn: true,
    gameOver: false,
    gameStarted: false,
    round: 0,
    playerScore: 0,
    aiScore: 0,
    isProcessing: false,
    phase: 'idle' // idle, playerTurn, aiTurn, gameOver
  };

  // DOM 元素
  const elements = {
    playerCards: document.getElementById('playerCards'),
    aiCards: document.getElementById('aiCards'),
    tableCards: document.getElementById('tableCards'),
    playerCardCount: document.getElementById('playerCardCount'),
    aiCardCount: document.getElementById('aiCardCount'),
    tableCardCount: document.getElementById('tableCardCount'),
    roundNum: document.getElementById('roundNum'),
    playerScoreEl: document.getElementById('playerScore'),
    aiScoreEl: document.getElementById('aiScore'),
    deckLeft: document.getElementById('deckLeft'),
    resultDisplay: document.getElementById('resultDisplay'),
    resultText: document.getElementById('resultText'),
    turnIndicator: document.getElementById('turnIndicator'),
    turnText: document.querySelector('.turn-text'),
    actionHint: document.getElementById('actionHint'),
    tableMessage: document.getElementById('tableMessage'),
    tableSection: document.getElementById('tableSection'),
    captureZone: document.getElementById('captureZone'),
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

  // 创建52张牌的牌组
  function createDeck() {
    const deck = [];
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        deck.push({
          suit,
          rank,
          id: `${rank}${suit}`
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
  function createCardElement(card, options = {}) {
    const { faceDown = false, clickable = false, index = 0 } = options;
    const cardEl = document.createElement('div');
    const isRed = ['♥', '♦'].includes(card.suit);

    if (faceDown) {
      cardEl.className = 'card back';
      cardEl.innerHTML = `<div class="card-center">🐟</div>`;
    } else {
      let cardClass = 'card ' + (isRed ? 'red' : 'black');
      if (clickable) cardClass += ' clickable';
      cardEl.className = cardClass;
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
      cardEl.dataset.rank = card.rank;
      cardEl.dataset.suit = card.suit;
    }

    cardEl.style.animationDelay = `${index * 0.05}s`;
    return cardEl;
  }

  // 创建AI背面牌元素
  function createAIBackElement(card, index = 0) {
    const cardEl = document.createElement('div');
    cardEl.className = 'card back';
    cardEl.innerHTML = `<div class="card-center">🐟</div>`;
    cardEl.style.animationDelay = `${index * 0.05}s`;
    return cardEl;
  }

  // 查找匹配的牌
  function findMatch(rank, tableCards) {
    for (let i = 0; i < tableCards.length; i++) {
      if (tableCards[i].rank === rank) {
        return i;
      }
    }
    return -1;
  }

  // 从牌堆补牌到桌面
  function fillTable() {
    while (state.tableCards.length < TABLE_SIZE && state.deck.length > 0) {
      state.tableCards.push(state.deck.pop());
    }
    updateAllDisplays();
  }

  // 更新所有显示
  function updateAllDisplays() {
    updatePlayerHand();
    updateAIHand();
    updateTable();
    updateStats();
    updateButtons();
  }

  // 更新玩家手牌显示
  function updatePlayerHand() {
    elements.playerCards.innerHTML = '';

    if (state.playerHand.length === 0) {
      elements.playerCards.innerHTML = '<div class="empty-hint">无手牌</div>';
    } else {
      state.playerHand.forEach((card, index) => {
        const clickable = state.isPlayerTurn && !state.gameOver && !state.isProcessing;
        const cardEl = createCardElement(card, { clickable, index });
        cardEl.dataset.index = index;

        if (clickable) {
          cardEl.addEventListener('click', () => playerPlayCard(index));
        }

        elements.playerCards.appendChild(cardEl);
      });
    }

    elements.playerCardCount.textContent = `(${state.playerHand.length}张)`;
  }

  // 更新AI手牌显示
  function updateAIHand() {
    elements.aiCards.innerHTML = '';

    if (state.aiHand.length === 0) {
      elements.aiCards.innerHTML = '<div class="empty-hint">无手牌</div>';
    } else {
      state.aiHand.forEach((card, index) => {
        const cardEl = createAIBackElement(card, index);
        elements.aiCards.appendChild(cardEl);
      });
    }

    elements.aiCardCount.textContent = `(${state.aiHand.length}张)`;
  }

  // 更新桌面显示
  function updateTable() {
    elements.tableCards.innerHTML = '';

    if (state.tableCards.length === 0) {
      elements.tableCards.innerHTML = '<div class="empty-hint">桌面无牌</div>';
    } else {
      state.tableCards.forEach((card, index) => {
        const cardEl = createCardElement(card, { index });
        elements.tableCards.appendChild(cardEl);
      });
    }

    elements.tableCardCount.textContent = `(${state.tableCards.length}张)`;
  }

  // 更新统计信息
  function updateStats() {
    elements.roundNum.textContent = state.round;
    elements.playerScoreEl.textContent = state.playerScore;
    elements.aiScoreEl.textContent = state.aiScore;
    elements.deckLeft.textContent = state.deck.length;
  }

  // 更新按钮状态
  function updateButtons() {
    elements.btnStart.style.display = state.gameStarted ? 'none' : 'inline-block';
    elements.btnNew.style.display = state.gameOver ? 'inline-block' : 'none';
  }

  // 更新回合指示器
  function updateTurnIndicator(text) {
    elements.turnText.textContent = text;
  }

  // 更新操作提示
  function updateActionHint(text) {
    elements.actionHint.textContent = text;
  }

  // 更新桌面消息
  function updateTableMessage(text) {
    elements.tableMessage.textContent = text;
  }

  // 显示吃牌动画
  function showCaptureAnimation(cards, isPlayer, clearBonus = false) {
    const rect = elements.tableSection.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    // 显示水花效果
    const splashEmojis = ['💦', '🌊', '💧', '🌊'];
    for (let i = 0; i < 6; i++) {
      const splash = document.createElement('div');
      splash.className = 'capture-splash';
      splash.textContent = splashEmojis[Math.floor(Math.random() * splashEmojis.length)];
      splash.style.left = `${centerX + (Math.random() - 0.5) * 150}px`;
      splash.style.top = `${centerY + (Math.random() - 0.5) * 80}px`;
      splash.style.animationDelay = `${i * 0.1}s`;
      elements.captureZone.appendChild(splash);

      setTimeout(() => splash.remove(), 1000);
    }

    // 清台特效
    if (clearBonus) {
      elements.tableSection.classList.add('table-cleared');
      setTimeout(() => elements.tableSection.classList.remove('table-cleared'), 1000);
    }
  }

  // 玩家出牌
  async function playerPlayCard(cardIndex) {
    if (!state.isPlayerTurn || state.isProcessing || state.gameOver) return;
    if (cardIndex < 0 || cardIndex >= state.playerHand.length) return;

    state.isProcessing = true;
    playSound('tap');

    const playedCard = state.playerHand[cardIndex];
    state.playerHand.splice(cardIndex, 1);

    // 查找匹配的牌
    const matchIndex = findMatch(playedCard.rank, state.tableCards);

    if (matchIndex !== -1) {
      // 找到匹配，吃牌
      await captureCards(playedCard, matchIndex, true);
    } else {
      // 没有匹配，留在桌面
      state.tableCards.push(playedCard);
      playSound('drop');
      updateTableMessage('没有匹配，留在桌面');
      await new Promise(r => setTimeout(r, 400));
    }

    updatePlayerHand();

    // 检查游戏是否结束
    if (checkGameOver()) return;

    // 切换到AI回合
    state.isPlayerTurn = false;
    state.phase = 'aiTurn';
    updateTurnIndicator('🖥️ 电脑回合...');
    updateActionHint('');

    // AI出牌
    await new Promise(r => setTimeout(r, 800));
    await aiPlayCard();
  }

  // 吃牌逻辑
  async function captureCards(playedCard, matchIndex, isPlayer) {
    // 吃桌上的所有牌
    const capturedCount = state.tableCards.length + 1; // 包含刚出的牌

    playSound('success');

    // 高亮匹配的牌
    const tableCardEls = elements.tableCards.querySelectorAll('.card');
    if (tableCardEls[matchIndex]) {
      tableCardEls[matchIndex].classList.add('match-highlight');
    }

    await new Promise(r => setTimeout(r, 300));

    // 显示吃牌动画
    const isCleared = state.tableCards.length === 0;
    showCaptureAnimation(state.tableCards, isPlayer, isCleared);

    // 收集要吃掉的牌
    const capturedCards = [...state.tableCards, playedCard];
    state.tableCards = [];

    // 清台奖励
    if (isCleared) {
      if (isPlayer) {
        state.playerScore += 3;
        updateTableMessage('🎉 清台！+3分！');
      } else {
        state.aiScore += 3;
        updateTableMessage('😅 电脑清台！+3分');
      }
      playSound('win');
    } else {
      const msg = isPlayer ? `🐟 吃${capturedCount}张牌！` : `😅 电脑吃${capturedCount}张牌！`;
      updateTableMessage(msg);
    }

    // 添加动画效果
    tableCardEls.forEach(el => {
      el.classList.add('captured');
    });

    await new Promise(r => setTimeout(r, 600));

    updateStats();
  }

  // AI出牌
  async function aiPlayCard() {
    if (state.aiHand.length === 0) {
      await finishRound();
      return;
    }

    playSound('tap');

    // AI简单策略：优先出能匹配的牌
    let playIndex = -1;
    let matchedRank = null;

    // 先找能匹配的牌
    for (let i = 0; i < state.aiHand.length; i++) {
      const card = state.aiHand[i];
      if (findMatch(card.rank, state.tableCards) !== -1) {
        playIndex = i;
        matchedRank = card.rank;
        break;
      }
    }

    // 如果没有能匹配的，随机出一张
    if (playIndex === -1) {
      playIndex = Math.floor(Math.random() * state.aiHand.length);
    }

    const playedCard = state.aiHand[playIndex];
    state.aiHand.splice(playIndex, 1);

    // 查找匹配
    const matchIndex = findMatch(playedCard.rank, state.tableCards);

    if (matchIndex !== -1) {
      // 找到匹配，吃牌
      await captureCards(playedCard, matchIndex, false);
    } else {
      // 没有匹配，留在桌面
      state.tableCards.push(playedCard);
      updateTableMessage('电脑出牌无匹配');
      await new Promise(r => setTimeout(r, 400));
    }

    updateAIHand();

    // 检查游戏是否结束
    if (checkGameOver()) return;

    // 完成本轮，从牌堆补牌
    await finishRound();
  }

  // 完成一轮
  async function finishRound() {
    state.round++;
    updateStats();

    // 从牌堆补牌到桌面
    fillTable();

    await new Promise(r => setTimeout(r, 500));

    // 检查游戏是否结束
    if (checkGameOver()) return;

    // 切换到玩家回合
    state.isPlayerTurn = true;
    state.isProcessing = false;
    state.phase = 'playerTurn';

    updateTurnIndicator('👤 你的回合！');
    updateActionHint('👆 点击手牌出牌');
    updatePlayerHand();
  }

  // 检查游戏是否结束
  function checkGameOver() {
    const playerEmpty = state.playerHand.length === 0;
    const aiEmpty = state.aiHand.length === 0;
    const deckEmpty = state.deck.length === 0;

    // 双方都出完手牌或牌堆已空
    if ((playerEmpty && aiEmpty) || deckEmpty) {
      endGame();
      return true;
    }

    // 一方手牌出完，从牌堆补满13张
    if (playerEmpty && state.deck.length >= 13) {
      for (let i = 0; i < 13 && state.deck.length > 0; i++) {
        state.playerHand.push(state.deck.pop());
      }
      updatePlayerHand();
      updateStats();
    }

    if (aiEmpty && state.deck.length >= 13) {
      for (let i = 0; i < 13 && state.deck.length > 0; i++) {
        state.aiHand.push(state.deck.pop());
      }
      updateAIHand();
      updateStats();
    }

    // 检查是否还有牌可出
    if (state.deck.length === 0 && playerEmpty && aiEmpty) {
      endGame();
      return true;
    }

    return false;
  }

  // 游戏结束
  function endGame() {
    state.gameOver = true;
    state.isProcessing = false;
    state.phase = 'gameOver';

    // 计算胜负
    const playerCards = state.playerHand.length;
    const aiCards = state.aiHand.length;
    const playerWins = playerCards < aiCards;
    const tie = playerCards === aiCards;

    // 保存最高分
    const bestScore = parseInt(localStorage.getItem(STORAGE_KEY_BEST)) || 0;
    if (state.playerScore > bestScore) {
      localStorage.setItem(STORAGE_KEY_BEST, state.playerScore);
    }

    let resultMsg, resultClass;

    if (tie) {
      resultMsg = '🤝 平局！';
      resultClass = '';
      playSound('clear');
    } else if (playerWins) {
      resultMsg = '🎉 你赢了！';
      resultClass = 'win';
      playSound('win');
      state.playerScore += 1;
    } else {
      resultMsg = '😢 你输了...';
      resultClass = 'lose';
      playSound('lose');
      state.aiScore += 1;
    }

    elements.resultText.textContent = resultMsg;
    elements.resultText.className = `result-text show ${resultClass}`;

    updateStats();
    updateTurnIndicator(playerWins ? '🏆 恭喜获胜！' : (tie ? '🤝 平局！' : '💀 电脑获胜！'));
    updateActionHint(`最终：玩家 ${playerCards}张 | 电脑 ${aiCards}张`);
    updateButtons();

    state.isProcessing = false;
  }

  // 开始新游戏
  async function startNewGame() {
    playSound('start');

    state.gameStarted = true;
    state.gameOver = false;
    state.isPlayerTurn = true;
    state.isProcessing = false;
    state.phase = 'playerTurn';
    state.round = 1;
    state.playerScore = 0;
    state.aiScore = 0;

    // 重置所有牌组
    state.deck = shuffleDeck(createDeck());
    state.playerHand = [];
    state.aiHand = [];
    state.tableCards = [];

    // 发4张明牌到桌面
    for (let i = 0; i < TABLE_SIZE; i++) {
      state.tableCards.push(state.deck.pop());
    }

    // 发13张手牌给玩家
    for (let i = 0; i < 13; i++) {
      state.playerHand.push(state.deck.pop());
    }

    // 发13张手牌给电脑
    for (let i = 0; i < 13; i++) {
      state.aiHand.push(state.deck.pop());
    }

    // 清空结果
    elements.resultText.className = 'result-text';
    elements.resultText.textContent = '';

    updateAllDisplays();
    updateTurnIndicator('👤 你的回合！');
    updateActionHint('👆 点击手牌出牌');
  }

  // 事件绑定
  function bindEvents() {
    elements.btnStart.addEventListener('click', startNewGame);
    elements.btnNew.addEventListener('click', startNewGame);
  }

  // 初始化
  function init() {
    initAudio();
    bindEvents();
    updateButtons();
    updateStats();

    // 显示最佳分数提示
    const bestScore = localStorage.getItem(STORAGE_KEY_BEST);
    if (bestScore) {
      updateTableMessage(`最佳得分：${bestScore}`);
    }
  }

  // 启动游戏
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
