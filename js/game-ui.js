/* =============================================
   game-ui.js — 共享游戏页面 UI 库
   提供浮动工具栏（返回主页 + 音效开关）
   以及统一的 Web Audio API 音效引擎
   ============================================= */

(function () {
  function injectStyles() {
    if (document.getElementById('gameUiStyles')) return;

    var style = document.createElement('style');
    style.id = 'gameUiStyles';
    style.textContent = [
      '.page-floating-controls{position:fixed;top:18px;left:18px;right:18px;display:flex;justify-content:space-between;align-items:flex-start;pointer-events:none;z-index:1200;}',
      '.page-floating-controls .left-slot,.page-floating-controls .right-slot{display:flex;gap:10px;}',
      '.page-floating-controls .page-ui-btn{pointer-events:auto;min-width:48px;height:48px;padding:0 14px;border-radius:999px;display:flex;align-items:center;justify-content:center;text-decoration:none;border:none;cursor:pointer;font-size:20px;font-weight:700;line-height:1;box-shadow:0 6px 18px rgba(0,0,0,.22);transition:transform .2s ease,box-shadow .2s ease,opacity .2s ease;background:rgba(255,255,255,.95);color:#256d1b;}',
      '.page-floating-controls .page-ui-btn:hover{transform:translateY(-2px) scale(1.05);box-shadow:0 10px 24px rgba(0,0,0,.28);}',
      '.page-floating-controls .page-ui-btn:active{transform:scale(.96);}',
      '.page-floating-controls .page-ui-btn.sound-btn{color:#0f766e;}',
      '.page-floating-controls .page-ui-btn.is-muted{opacity:.8;color:#64748b;}',
      '@media (max-width:700px){.page-floating-controls{top:12px;left:12px;right:12px;}.page-floating-controls .page-ui-btn{min-width:44px;height:44px;padding:0 12px;font-size:18px;}}'
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

  function setSoundButtonState(button, muted) {
    button.textContent = muted ? '\ud83d\udd07' : '\ud83d\udd0a';
    button.classList.toggle('is-muted', muted);
  }

  function mount(options) {
    var settings = Object.assign(
      {
        home: true,
        sound: false,
        muted: false,
        homeHref: '../index.html'
      },
      options || {}
    );

    injectStyles();

    var controls = document.querySelector('.page-floating-controls');
    if (!controls) {
      controls = document.createElement('div');
      controls.className = 'page-floating-controls';
      document.body.appendChild(controls);
    }

    var leftSlot = controls.querySelector('.left-slot');
    if (!leftSlot) {
      leftSlot = document.createElement('div');
      leftSlot.className = 'left-slot';
      controls.appendChild(leftSlot);
    }

    var rightSlot = controls.querySelector('.right-slot');
    if (!rightSlot) {
      rightSlot = document.createElement('div');
      rightSlot.className = 'right-slot';
      controls.appendChild(rightSlot);
    }

    if (settings.home && !document.querySelector('.back-btn') && !controls.querySelector('.home-btn')) {
      var homeLink = document.createElement('a');
      homeLink.className = 'page-ui-btn home-btn';
      homeLink.href = settings.homeHref;
      homeLink.setAttribute('aria-label', '\u8fd4\u56de\u4e3b\u9875');
      homeLink.setAttribute('title', '\u8fd4\u56de\u4e3b\u9875');
      homeLink.textContent = '\u2302';
      leftSlot.appendChild(homeLink);
    }

    var audio = null;
    var soundButton = null;
    if (settings.sound && !controls.querySelector('.sound-btn')) {
      audio = createAudioManager(settings.muted);
      soundButton = document.createElement('button');
      soundButton.type = 'button';
      soundButton.className = 'page-ui-btn sound-btn';
      soundButton.setAttribute('aria-label', '\u97f3\u6548\u5f00\u5173');
      soundButton.setAttribute('title', '\u97f3\u6548\u5f00\u5173');
      setSoundButtonState(soundButton, audio.muted);
      soundButton.addEventListener('click', function () {
        audio.toggle();
        setSoundButtonState(soundButton, audio.muted);
        if (!audio.muted) {
          audio.play('tap');
        }
      });
      rightSlot.appendChild(soundButton);
    } else if (settings.sound) {
      soundButton = controls.querySelector('.sound-btn');
      audio = createAudioManager(settings.muted);
      setSoundButtonState(soundButton, audio.muted);
    }

    return {
      play: function (type) {
        if (audio) audio.play(type);
      },
      toggle: function () {
        if (!audio) return true;
        var muted = audio.toggle();
        if (soundButton) {
          setSoundButtonState(soundButton, muted);
        }
        return muted;
      },
      isMuted: function () {
        return audio ? audio.muted : true;
      }
    };
  }

  window.GamePageUI = {
    mount: mount,
    createAudioManager: createAudioManager
  };
})();
