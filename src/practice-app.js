(function () {
  'use strict';

  const P = window.PracticeCore;

  const state = {
    type: 'interval',
    q: null,
    answered: false,
    score: { ok: 0, total: 0 },
    positions: new Map(), // ejercicio "armar acordes": casillas/teclas marcadas
  };

  const el = {
    select: document.getElementById('ex-select'),
    score: document.getElementById('ex-score'),
    prompt: document.getElementById('ex-prompt'),
    listen: document.getElementById('ex-play'),
    boardWrap: document.getElementById('ex-board-wrap'),
    board: document.getElementById('ex-board'),
    options: document.getElementById('ex-options'),
    check: document.getElementById('ex-check'),
    reveal: document.getElementById('ex-reveal'),
    next: document.getElementById('ex-next'),
    feedback: document.getElementById('ex-feedback'),
  };

  function config() { return window.scalesApp.state.config; }
  function mod(n) { return ((n % 12) + 12) % 12; }

  function play() {
    const l = state.q && state.q.listen;
    if (!l) return;
    if (l.kind === 'interval') {
      // Primero melódico (una y otra) y después las dos juntas.
      window.Sound.sequence(l.pitches, 0.6);
      setTimeout(function () { window.Sound.chord(l.pitches, false); }, 1300);
    } else {
      window.Sound.chord(l.pitches, false);
    }
  }

  function renderSelect() {
    el.select.innerHTML = '';
    P.EXERCISES.forEach(function (ex) {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = ex.name;
      b.setAttribute('aria-pressed', String(ex.id === state.type));
      b.addEventListener('click', function () {
        state.type = ex.id;
        state.score = { ok: 0, total: 0 };
        renderSelect();
        nextQuestion(true);
      });
      el.select.appendChild(b);
    });
  }

  function renderScore() {
    const s = state.score;
    el.score.textContent = s.total ? 'Aciertos: ' + s.ok + ' de ' + s.total + ' (' + Math.round(s.ok * 100 / s.total) + '%)' : '';
  }

  function feedback(ok, text) {
    el.feedback.className = 'ex-feedback ' + (ok ? 'ok' : 'bad');
    el.feedback.textContent = (ok ? '¡Bien! ' : '') + text;
  }

  function finish(ok) {
    if (!state.answered) {
      state.score.total++;
      if (ok) state.score.ok++;
    }
    state.answered = true;
    renderScore();
  }

  function renderOptions() {
    el.options.innerHTML = '';
    if (!state.q.options) return;
    state.q.options.forEach(function (opt) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'ex-opt';
      b.textContent = opt;
      b.addEventListener('click', function () {
        if (state.answered) return;
        const ok = opt === state.q.answer;
        el.options.querySelectorAll('.ex-opt').forEach(function (x) {
          if (x.textContent === state.q.answer) x.classList.add('right');
        });
        if (!ok) b.classList.add('wrong');
        feedback(ok, ok ? state.q.explain : 'Era ' + state.q.answer + '. ' + state.q.explain);
        finish(ok);
        if (state.q.listen) play();
      });
      el.options.appendChild(b);
    });
  }

  // ---- Armar acordes ----
  function renderBoard() {
    window.InstrumentMode.renderBoard(el.board, {
      config: config(),
      cls: function (i) {
        const key = i.string !== undefined ? i.string + ':' + i.fret : 'p' + i.pitch;
        return state.positions.has(key) ? 'selected' : '';
      },
    });
  }

  el.board.addEventListener('click', function (e) {
    const cell = e.target.closest('[data-note]');
    if (!cell || state.answered) return;
    const info = window.InstrumentMode.cellInfo(cell, config());
    if (state.positions.has(info.key)) state.positions.delete(info.key);
    else { state.positions.set(info.key, { pitch: info.pitch }); window.Sound.tap(info.pitch); }
    el.feedback.textContent = '';
    renderBoard();
  });

  el.check.addEventListener('click', function () {
    if (state.answered || state.type !== 'build') return;
    let bass = Infinity;
    const pcs = [];
    state.positions.forEach(function (p) { pcs.push(mod(p.pitch)); if (p.pitch < bass) bass = p.pitch; });
    if (!pcs.length) { feedback(false, 'Marcá las notas del acorde en el instrumento.'); return; }
    const ok = P.checkBuild(state.q, pcs, mod(bass));
    if (ok) {
      feedback(true, state.q.explain);
      finish(true);
    } else {
      const r = window.ChordsCore.identify(pcs, mod(bass));
      const got = r && r.exact.length ? 'Armaste ' + r.exact[0].label + '. ' : '';
      feedback(false, got + 'Probá de nuevo o tocá “Ver respuesta”.');
    }
  });

  el.reveal.addEventListener('click', function () {
    if (state.answered) return;
    feedback(false, state.q.explain);
    finish(false);
    play();
  });

  el.listen.addEventListener('click', play);
  el.next.addEventListener('click', function () { nextQuestion(true); });

  function nextQuestion(autoplay) {
    state.q = P.question(state.type);
    state.answered = false;
    state.positions.clear();
    el.prompt.textContent = state.q.prompt;
    el.feedback.textContent = '';
    el.feedback.className = 'ex-feedback';
    const build = state.type === 'build';
    const ear = state.type === 'interval' || state.type === 'quality';
    el.listen.hidden = !ear;
    el.boardWrap.hidden = !build;
    el.check.hidden = !build;
    el.reveal.hidden = !build;
    if (build) renderBoard();
    renderOptions();
    renderScore();
    if (autoplay && ear) play();
  }

  document.addEventListener('instrumentmodechange', function () {
    if (state.type === 'build') { state.positions.clear(); renderBoard(); }
  });

  function applyParams(params) {
    const ej = params.get('ej');
    if (P.EXERCISES.some(function (x) { return x.id === ej; })) {
      state.type = ej;
      renderSelect();
      nextQuestion(false);
    }
  }

  renderSelect();
  nextQuestion(false);

  window.practiceApp = { state: state, applyParams: applyParams, render: function () { if (state.type === 'build') renderBoard(); } };
})();
