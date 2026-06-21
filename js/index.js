/* =============================================
   index.js — 主页交互逻辑
   ============================================= */

(function () {
  // 搜索功能
  function searchGames() {
    var query = document.getElementById('searchInput').value.toLowerCase();
    var cards = document.querySelectorAll('.game-card');

    cards.forEach(function (card) {
      var title = card.querySelector('.game-title').textContent.toLowerCase();
      var desc = card.querySelector('.game-description').textContent.toLowerCase();

      if (title.includes(query) || desc.includes(query)) {
        card.style.display = 'block';
        card.style.animation = 'bounce 0.5s ease-out';
      } else {
        card.style.display = 'none';
      }
    });
  }

  // 回车搜索
  var searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.addEventListener('keypress', function (e) {
      if (e.key === 'Enter') {
        searchGames();
      }
    });
  }

  // 分类筛选
  function filterGames(category, triggerButton) {
    // 更新按钮状态
    document.querySelectorAll('.category-btn').forEach(function (btn) {
      btn.classList.remove('active');
    });
    if (triggerButton) {
      triggerButton.classList.add('active');
    } else {
      var defaultButton = document.querySelector('.category-btn.' + category) ||
                          document.querySelector('.category-btn.all');
      if (defaultButton) defaultButton.classList.add('active');
    }

    // 筛选游戏
    var cards = document.querySelectorAll('.game-card');
    cards.forEach(function (card) {
      if (category === 'all' || card.dataset.category === category) {
        card.style.display = 'block';
        card.style.animation = 'bounce 0.5s ease-out';
      } else {
        card.style.display = 'none';
      }
    });
  }

  // 暴露到全局，供 HTML onclick 调用
  window.filterGames = filterGames;
  window.searchGames = searchGames;

  // 添加 bounce 动画（如果尚未添加）
  if (!document.getElementById('index-animations')) {
    var style = document.createElement('style');
    style.id = 'index-animations';
    style.textContent = [
      '@keyframes bounce {',
      '  0%, 100% { transform: translateY(0); }',
      '  50%       { transform: translateY(-10px); }',
      '}'
    ].join('');
    document.head.appendChild(style);
  }

  // 初始化：显示所有游戏
  filterGames('all');
})();
