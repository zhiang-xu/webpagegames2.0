/* =============================================
   game-ui.js — 共享游戏页面 UI 库
   提供工具栏（返回主页 + 音效开关）
   以及统一的 Web Audio API 音效引擎
   ============================================= */

(function () {
  var injectedStyles = false;

  function injectStyles() {
    if (injectedStyles) return;
    injectedStyles = true;

    var style = document.createElement('style');
    style.id = 'gameUiStyles';
    style.textContent = [
      /* 浮动覆盖风格（固定在视口角落） */
      '.page-floating-controls{position:fixed;top:18px;left:18px;right:18px;display:flex;justify-content:space-between;align-items:flex-start;pointer-events:none;z-index:1200;}',
      '.page-floating-controls .left-slot,.page-floating-controls .right-slot{display:flex;gap:10px;}',
      '.page-floating-controls .page-ui-btn{pointer-events:auto;min-width:48px;height:48px;padding:0 14px;border-radius:999px;display:flex;align-items:center;justify-content:center;text-decoration:none;border:none;cursor:pointer;font-size:20px;font-weight:700;line-height:1;box-shadow:0 6px 18px rgba(0,0,0,.22);transition:transform .2s ease,box-shadow .2s ease,opacity .2s ease;background:rgba(255,255,255,.95);color:#256d1b;}',
      '.page-floating-controls .page-ui-btn:hover{transform:translateY(-2px) scale(1.05);box-shadow:0 10px 24px rgba(0,0,0,.28);}',
      '.page-floating-controls .page-ui-btn:active{transform:scale(.96);}',
      '.page-floating-controls .page-ui-btn.sound-btn{color:#0f766e;}',
      '.page-floating-controls .page-ui-btn.is-muted{opacity:.8;color:#64748b;}',
      '@media (max-width:700px){.page-floating-controls{top:12px;left:12px;right:12px;}.page-floating-controls .page-ui-btn{min-width:44px;height:44px;padding:0 12px;font-size:18px;}}',

      /* 内嵌风格（固定在页面内容区顶部） */
      '.page-bar{position:sticky;top:0;z-index:200;display:flex;justify-content:space-between;align-items:center;padding:8px 16px;background:rgba(255,255,255,.92);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);border-radius:16px;margin-bottom:14px;box-shadow:0 2px 12px rgba(0,0,0,.1);}',
      '.page-bar .bar-btn{width:40px;height:40px;border-radius:999px;display:flex;align-items:center;justify-content:center;text-decoration:none;border:none;cursor:pointer;font-size:18px;font-weight:700;line-height:1;box-shadow:0 2px 8px rgba(0,0,0,.14);transition:transform .18s ease,box-shadow .18s ease;background:#667eea;color:#fff;}',
      '.page-bar .bar-btn:hover{transform:translateY(-1px) scale(1.04);box-shadow:0 4px 12px rgba(0,0,0,.2);}',
      '.page-bar .bar-btn:active{transform:scale(.95);}',
      '.page-bar .bar-btn.sound-btn{background:#4ecdc4;}',
      '.page-bar .bar-btn.sound-btn.is-muted{background:#ccc;}',
      '@media (max-width:700px){.page-bar{padding:6px 12px;}.page-bar .bar-btn{width:36px;height:36px;font-size:16px;}}'
    ].join('');

    document.head.appendChild(style);
  }

  function createAudioManager(initialMuted) {
    return {
      muted: !!initialMuted,
      context: null,
      ensure: function () {
        if (!this.context) {
          this.context = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (this.context.state === 'suspended') {
          this.context.resume();
        }
      },
      toggle: function () {
        this.muted = !this.muted;
        return this.muted;
      },
      play: function (type) {
        if (this.muted) return;

        try {
          this.ensure();
          var ctx = this.context;
          var now = ctx.currentTime;
          var patterns = {
            tap: [{ f: 520, d: 0.05, t: 'triangle', g: 0.05 }],
            select: [{ f: 430, d: 0.08, t: 'sine', g: 0.08 }],
            move: [{ f: 320, d: 0.08, t: 'triangle', g: 0.07 }],
            drop: [{ f: 240, d: 0.12, t: 'square', g: 0.06 }],
            clear: [
              { f: 560, d: 0.07, t: 'triangle', g: 0.06, o: 0 },
              { f: 760, d: 0.12, t: 'triangle', g: 0.08, o: 0.05 }
            ],
            success: [
              { f: 520, d: 0.08, t: 'sine', g: 0.07, o: 0 },
              { f: 660, d: 0.12, t: 'sine', g: 0.08, o: 0.07 }
            ],
            win: [
              { f: 523, d: 0.12, t: 'triangle', g: 0.07, o: 0 },
              { f: 659, d: 0.12, t: 'triangle', g: 0.08, o: 0.1 },
              { f: 784, d: 0.2, t: 'triangle', g: 0.09, o: 0.2 }
            ],
            error: [{ f: 180, d: 0.16, t: 'sawtooth', g: 0.07 }],
            lose: [
              { f: 280, d: 0.1, t: 'sawtooth', g: 0.06, o: 0 },
              { f: 180, d: 0.22, t: 'sawtooth', g: 0.07, o: 0.08 }
            ],
            pause: [{ f: 260, d: 0.08, t: 'square', g: 0.05 }],
            start: [
              { f: 392, d: 0.07, t: 'triangle', g: 0.05, o: 0 },
              { f: 523, d: 0.1, t: 'triangle', g: 0.07, o: 0.05 }
            ]
          };

          var notes = patterns[type] || patterns.tap;
          notes.forEach(function (note) {
            var oscillator = ctx.createOscillator();
            var gain = ctx.createGain();
            var offset = note.o || 0;
            oscillator.type = note.t || 'sine';
            oscillator.frequency.setValueAtTime(note.f, now + offset);
            gain.gain.setValueAtTime(note.g || 0.06, now + offset);
            gain.gain.exponentialRampToValueAtTime(0.001, now + offset + note.d);
            oscillator.connect(gain);
            gain.connect(ctx.destination);
            oscillator.start(now + offset);
            oscillator.stop(now + offset + note.d);
          });
        } catch (error) {
          console.warn('Sound playback skipped:', error);
        }
      }
    };
  }

  function setSoundButtonState(button, muted, style) {
    button.textContent = muted ? '\ud83d\udd07' : '\ud83d\udd0a';
    button.classList.toggle('is-muted', muted);
  }

  // style: 'floating' | 'bar'
  function mount(options, style) {
    style = style || 'floating';

    var settings = Object.assign(
      {
        home: true,
        sound: false,
        muted: false,
        homeHref: '../../index.html'
      },
      options || {}
    );

    injectStyles();

    var container;
    if (style === 'bar') {
      container = document.querySelector('.page-bar');
      if (!container) {
        container = document.createElement('div');
        container.className = 'page-bar';
        var first = document.querySelector('.container > *');
        if (first) {
          document.querySelector('.container').insertBefore(container, first);
        } else {
          document.querySelector('.container').prepend(container);
        }
      }
    } else {
      container = document.querySelector('.page-floating-controls');
      if (!container) {
        container = document.createElement('div');
        container.className = 'page-floating-controls';
        document.body.appendChild(container);
      }
    }

    var audio = null;
    var soundButton = null;

    if (settings.home) {
      var homeLink = document.createElement('a');
      homeLink.className = 'bar-btn home-btn';
      homeLink.href = settings.homeHref;
      homeLink.setAttribute('aria-label', '返回主页');
      homeLink.setAttribute('title', '返回主页');
      homeLink.textContent = '\u2302';
      container.appendChild(homeLink);
    }

    if (settings.sound) {
      audio = createAudioManager(settings.muted);
      soundButton = document.createElement('button');
      soundButton.type = 'button';
      soundButton.className = 'bar-btn sound-btn';
      soundButton.setAttribute('aria-label', '音效开关');
      soundButton.setAttribute('title', '音效开关');
      setSoundButtonState(soundButton, audio.muted, style);
      soundButton.addEventListener('click', function () {
        audio.ensure();
        var muted = audio.toggle();
        setSoundButtonState(soundButton, muted, style);
        if (!muted) audio.play('tap');
      });
      container.appendChild(soundButton);
    }

    return {
      play: function (type) {
        if (audio) audio.play(type);
      },
      toggle: function () {
        if (!audio) return true;
        var muted = audio.toggle();
        if (soundButton) setSoundButtonState(soundButton, muted, style);
        return muted;
      },
      isMuted: function () {
        return audio ? audio.muted : true;
      },
      getAudio: function () {
        return audio;
      }
    };
  }

  window.GamePageUI = {
    mount: mount,
    createAudioManager: createAudioManager
  };
})();
