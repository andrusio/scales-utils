(function () {
  'use strict';

  const C = window.CircleCore;

  // Radios (en unidades del viewBox) de cada anillo del disco.
  const RING = {
    major: { r1: 225, r2: 300, size: 30, alias: 14 },
    minor: { r1: 160, r2: 225, size: 23, alias: 13 },
    dim:   { r1: 110, r2: 160, size: 17, alias: 11 },
  };
  const TAG_RADIUS = 335;
  const STEP = 30; // grados por posición

  const state = {
    center: C.NAMES.indexOf('A'), // tonalidad mayor que queda arriba
    root: C.NAMES.indexOf('A'),   // nota fundamental cuyos modos se muestran
    quality: 'major',             // calidad de la raíz: 'major' | 'minor'
    chords: [],                   // [{root, quality}] en el orden en que se cargaron
    chordQuality: 'major',        // tipo con el que se agregan acordes
    rot: 0,                       // rotación actual del disco en grados
  };
  state.rot = -C.positionOf(state.center) * STEP;

  const el = {
    wheel: document.getElementById('wheel'),
    disc: document.getElementById('disc'),
    note: document.getElementById('wheel-note'),
    left: document.getElementById('rot-left'),
    right: document.getElementById('rot-right'),
    rootGrid: document.getElementById('root-grid'),
    rootQuality: document.getElementById('root-quality'),
    chordGrid: document.getElementById('chord-grid'),
    chordQuality: document.getElementById('chord-quality'),
    chips: document.getElementById('chord-chips'),
    keys: document.getElementById('chord-keys'),
  };

  const mod = C.mod;
  const f = function (n) { return Math.round(n * 100) / 100; };

  // ---- Utilidades de texto ----
  function noteHtml(pc) {
    const alias = C.FLAT_ALIAS[pc];
    return C.NAMES[pc] + (alias ? '<span class="alias">/' + alias + '</span>' : '');
  }
  function majorName(pc) { return C.NAMES[pc] + ' mayor'; }
  function rootLabel() { return C.NAMES[state.root] + (state.quality === 'minor' ? 'm' : ''); }
  function adjText(adj) { return adj > 0 ? '+½' : adj < 0 ? '−½' : ''; }

  // ---- Geometría ----
  function polar(r, deg) {
    const a = deg * Math.PI / 180;
    return [r * Math.sin(a), -r * Math.cos(a)];
  }
  function sectorPath(r1, r2, a0, a1) {
    const p1 = polar(r2, a0), p2 = polar(r2, a1), p3 = polar(r1, a1), p4 = polar(r1, a0);
    return 'M' + f(p1[0]) + ' ' + f(p1[1]) +
      'A' + r2 + ' ' + r2 + ' 0 0 1 ' + f(p2[0]) + ' ' + f(p2[1]) +
      'L' + f(p3[0]) + ' ' + f(p3[1]) +
      'A' + r1 + ' ' + r1 + ' 0 0 0 ' + f(p4[0]) + ' ' + f(p4[1]) + 'Z';
  }
  function text(cls, r, deg, str, extra) {
    const p = polar(r, deg);
    return '<text class="' + cls + '" x="' + f(p[0]) + '" y="' + f(p[1]) + '"' + (extra || '') + '>' + str + '</text>';
  }

  // ---- Dibujo del disco ----
  function isSelected(chord) {
    return state.chords.some(function (c) { return C.sameChord(c, chord); });
  }

  function cellSvg(pos, quality) {
    const ring = RING[quality];
    const key = C.pcAt(pos); // tonalidad mayor de esta columna
    const chord = {
      root: quality === 'major' ? key : quality === 'minor' ? C.relativeMinor(key) : mod(key + 11),
      quality: quality,
    };
    const theta = pos * STEP + state.rot;
    const rel = mod(pos - C.positionOf(state.center));
    const degree = C.degreeOfChord(chord, state.center);
    const inWindow = !!degree;
    const selected = isSelected(chord);
    const outside = selected && !inWindow;

    const cls = 'wc ' + quality + (inWindow ? ' win' : '') + (selected ? ' sel' : '') + (outside ? ' out' : '');
    const mid = (ring.r1 + ring.r2) / 2;
    let s = '<g class="' + cls + '" data-pos="' + pos + '">';
    s += '<path d="' + sectorPath(ring.r1, ring.r2, theta - 14.6, theta + 14.6) + '"/>';

    const label = C.chordLabel(chord);
    const alias = C.chordAliasLabel(chord);
    // Nombre y enarmonía siempre uno sobre el otro en pantalla, gire como gire el disco.
    const c = polar(mid, theta);
    const dyName = alias ? -ring.size * 0.28 : 0;
    s += '<text class="wc-name" x="' + f(c[0]) + '" y="' + f(c[1] + dyName) + '" style="font-size:' + ring.size + 'px">' + label + '</text>';
    if (alias) {
      s += '<text class="wc-alias" x="' + f(c[0]) + '" y="' + f(c[1] + ring.size * 0.55) + '" style="font-size:' + ring.alias + 'px">' + alias + '</text>';
    }

    if (inWindow && quality === 'major') {
      // verde: grado en la mayor · rosa: grado si la tónica es la relativa menor
      s += text('wc-num green', ring.r2 - 14, theta - 8.5, degree.numeral);
      s += text('wc-num pink', ring.r1 + 14, theta + 8.5, degree.minorNumeral);
      s += text('wc-fn', ring.r2 - 14, theta + 8.5, degree.fn);
    } else if (inWindow) {
      s += text('wc-num green', ring.r2 - 11, theta - 8.5 * (225 / ring.r2), degree.numeral);
      s += text('wc-num pink', ring.r1 + 11, theta + 8.5 * (225 / ring.r2), degree.minorNumeral);
      s += text('wc-fn', ring.r2 - 11, theta + 8.5 * (225 / ring.r2), degree.fn);
    }
    return s + '</g>';
  }

  function tagsSvg() {
    const principal = state.quality === 'minor' ? 'Eólico' : 'Jónico';
    return C.modesOfRoot(state.root).map(function (m) {
      const theta = m.parentPos * STEP + state.rot;
      const p = polar(TAG_RADIUS, theta);
      const hint = m.hint.degree + (m.hint.adj ? ' ' + adjText(m.hint.adj) : '');
      const cls = 'tag' + (m.name === principal ? ' principal' : '');
      return '<g class="' + cls + '" transform="translate(' + f(p[0]) + ' ' + f(p[1]) + ')">' +
        '<rect x="-46" y="-22" width="92" height="44" rx="9"/>' +
        '<text class="tag-name" y="-5">' + m.name + '</text>' +
        '<text class="tag-hint" y="12">' + hint + '</text></g>';
    }).join('');
  }

  function hubSvg() {
    const centerLabel = state.center === state.root && state.quality === 'major'
      ? 'tonalidad ' + majorName(state.center)
      : 'centro en ' + majorName(state.center);
    return '<circle class="hub" r="104"/>' +
      '<text class="hub-small" y="-34">Raíz</text>' +
      '<text class="hub-name" y="2">' + rootLabel() + '</text>' +
      '<text class="hub-small" y="34">' + centerLabel + '</text>';
  }

  function drawWheel() {
    let s = '';
    for (let pos = 0; pos < 12; pos++) s += cellSvg(pos, 'major');
    for (let pos = 0; pos < 12; pos++) s += cellSvg(pos, 'minor');
    for (let pos = 0; pos < 12; pos++) s += cellSvg(pos, 'dim');
    s += tagsSvg();
    s += hubSvg();
    // Marca de la "ventana" fija arriba (IV · I · V)
    s += '<path class="window-mark" d="M-10 -311 L0 -303 L10 -311" />';
    el.disc.innerHTML = s;
  }

  // ---- Rotación ----
  let anim = null;
  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function rotateTo(target, immediate) {
    if (anim) cancelAnimationFrame(anim);
    const diff = ((target - state.rot) % 360 + 540) % 360 - 180;
    const start = state.rot;
    const goal = start + diff;
    if (immediate || reduceMotion || Math.abs(diff) < 0.01) {
      state.rot = goal;
      drawWheel();
      return;
    }
    const t0 = performance.now();
    const dur = 380;
    (function step(now) {
      const p = Math.min(1, (now - t0) / dur);
      state.rot = start + (goal - start) * (1 - Math.pow(1 - p, 3));
      drawWheel();
      anim = p < 1 ? requestAnimationFrame(step) : null;
    })(t0);
  }

  function targetRot() { return -C.positionOf(state.center) * STEP; }

  // Giro hecho a mano: sigue la tonalidad, la raíz acompaña y los acordes se borran.
  function manualCenter(pc) {
    const had = state.chords.length > 0;
    state.chords = [];
    state.center = pc;
    state.root = state.quality === 'minor' ? C.relativeMinor(pc) : pc;
    el.note.textContent = had ? 'Se borraron los acordes porque moviste el círculo a mano.' : '';
    rotateTo(targetRot());
    renderPanels();
  }

  function stepBy(delta) {
    manualCenter(C.pcAt(mod(C.positionOf(state.center) + delta)));
  }

  // ---- Arrastre ----
  let drag = null;
  function pointerAngle(e) {
    const r = el.wheel.getBoundingClientRect();
    return Math.atan2(e.clientX - (r.left + r.width / 2), -(e.clientY - (r.top + r.height / 2))) * 180 / Math.PI;
  }
  el.wheel.addEventListener('pointerdown', function (e) {
    if (anim) { cancelAnimationFrame(anim); anim = null; }
    const cell = e.target.closest ? e.target.closest('[data-pos]') : null;
    drag = {
      startAngle: pointerAngle(e), startRot: state.rot, moved: false,
      pos: cell ? Number(cell.dataset.pos) : null,
      x: e.clientX, y: e.clientY,
    };
    el.wheel.setPointerCapture(e.pointerId);
  });
  el.wheel.addEventListener('pointermove', function (e) {
    if (!drag) return;
    if (!drag.moved && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < 6) return;
    drag.moved = true;
    let d = pointerAngle(e) - drag.startAngle;
    d = ((d + 540) % 360) - 180;
    state.rot = drag.startRot + d;
    drawWheel();
  });
  function endDrag(e) {
    if (!drag) return;
    const d = drag;
    drag = null;
    if (e.type === 'pointercancel') { rotateTo(targetRot(), true); return; }
    if (d.moved) {
      const pos = mod(Math.round(-state.rot / STEP));
      const pc = C.pcAt(pos);
      if (pc === state.center) rotateTo(targetRot());
      else manualCenter(pc);
    } else if (d.pos !== null && d.pos !== C.positionOf(state.center)) {
      manualCenter(C.pcAt(d.pos));
    }
  }
  el.wheel.addEventListener('pointerup', endDrag);
  el.wheel.addEventListener('pointercancel', endDrag);
  el.left.addEventListener('click', function () { stepBy(-1); });
  el.right.addEventListener('click', function () { stepBy(1); });

  // ---- Selectores ----
  function noteGrid(container, onPick, isActive) {
    container.innerHTML = '';
    for (let pc = 0; pc < 12; pc++) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'note-btn' + (isActive(pc) ? ' active' : '');
      b.innerHTML = noteHtml(pc);
      b.addEventListener('click', function () { onPick(pc); });
      container.appendChild(b);
    }
  }

  function seg(container, options, current, onPick) {
    container.innerHTML = '';
    options.forEach(function (o) {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = o.label;
      b.setAttribute('aria-pressed', String(o.value === current));
      b.addEventListener('click', function () { onPick(o.value); });
      container.appendChild(b);
    });
  }

  function setRoot(pc) {
    state.root = pc;
    // Sin acordes la rueda sigue a la raíz; con acordes queda en su tonalidad.
    if (state.chords.length === 0) {
      state.center = C.keyCenterOf(pc, state.quality);
      rotateTo(targetRot());
    } else {
      drawWheel();
    }
    renderPanels();
  }

  function setRootQuality(q) {
    state.quality = q;
    if (state.chords.length === 0) {
      state.center = C.keyCenterOf(state.root, q);
      rotateTo(targetRot());
    } else {
      drawWheel();
    }
    renderPanels();
  }

  function applySuggestion() {
    const s = C.suggestFromChords(state.chords);
    if (!s) return;
    state.center = s.center;
    state.root = s.root;
    state.quality = s.quality;
    rotateTo(targetRot());
  }

  function toggleChord(chord) {
    const i = state.chords.findIndex(function (c) { return C.sameChord(c, chord); });
    el.note.textContent = '';
    if (i >= 0) state.chords.splice(i, 1);
    else state.chords.push(chord);
    if (state.chords.length) applySuggestion();
    else drawWheel();
    renderPanels();
  }

  function pickKey(key) {
    const r = C.rootForKey(key, state.chords[0]);
    state.center = key;
    state.root = r.root;
    state.quality = r.quality;
    rotateTo(targetRot());
    renderPanels();
  }

  // ---- Paneles ----
  function renderChords() {
    noteGrid(el.chordGrid,
      function (pc) { toggleChord({ root: pc, quality: state.chordQuality }); },
      function (pc) { return isSelected({ root: pc, quality: state.chordQuality }); });
    seg(el.chordQuality,
      [{ value: 'major', label: 'Mayor' }, { value: 'minor', label: 'menor' }, { value: 'dim', label: 'dim °' }],
      state.chordQuality,
      function (q) { state.chordQuality = q; renderChords(); });

    el.chips.innerHTML = '';
    state.chords.forEach(function (chord) {
      const d = C.degreeOfChord(chord, state.center);
      const chip = document.createElement('span');
      chip.className = 'chip' + (d ? '' : ' out');
      const alias = C.chordAliasLabel(chord);
      chip.innerHTML = '<strong>' + C.chordLabel(chord) + '</strong>' +
        (alias ? '<span class="alias">/' + alias + '</span>' : '') +
        '<span class="chip-deg">' + (d ? d.numeral : 'fuera') + '</span>';
      const x = document.createElement('button');
      x.type = 'button';
      x.className = 'chip-x';
      x.setAttribute('aria-label', 'Quitar ' + C.chordLabel(chord));
      x.textContent = '×';
      x.addEventListener('click', function () { toggleChord(chord); });
      chip.appendChild(x);
      el.chips.appendChild(chip);
    });
    if (state.chords.length) {
      const clear = document.createElement('button');
      clear.type = 'button';
      clear.className = 'link-btn';
      clear.textContent = 'Limpiar';
      clear.addEventListener('click', function () { state.chords = []; el.note.textContent = ''; drawWheel(); renderPanels(); });
      el.chips.appendChild(clear);
    }

    // Tonalidades que contienen los acordes cargados
    el.keys.innerHTML = '';
    const s = C.suggestFromChords(state.chords);
    if (s) {
      const head = document.createElement('p');
      head.className = 'keys-head';
      head.textContent = s.complete
        ? 'Tonalidades que contienen todos los acordes:'
        : 'Ninguna tonalidad contiene todos los acordes. Las más cercanas:';
      el.keys.appendChild(head);
      s.candidates.forEach(function (cand) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'key-btn' + (cand.key === state.center ? ' active' : '');
        b.innerHTML = noteHtml(cand.key) + ' mayor <span class="alias">/ ' + C.NAMES[C.relativeMinor(cand.key)] + 'm</span>';
        b.addEventListener('click', function () { pickKey(cand.key); });
        el.keys.appendChild(b);
      });
      if (!s.complete) {
        const p = document.createElement('p');
        p.className = 'keys-head warn';
        p.textContent = 'Fuera de la tonalidad: ' + s.outside.map(C.chordLabel).join(', ') +
          ' (préstamos de otro modo o tonalidad).';
        el.keys.appendChild(p);
      }
    }
  }

  function renderPanels() {
    noteGrid(el.rootGrid, setRoot, function (pc) { return pc === state.root; });
    seg(el.rootQuality,
      [{ value: 'major', label: 'Mayor' }, { value: 'minor', label: 'menor' }],
      state.quality, setRootQuality);
    renderChords();
  }

  function render() {
    state.rot = targetRot();
    drawWheel();
    renderPanels();
  }

  render();

  window.circleApp = {
    state: state,
    render: render,
    toggleChord: toggleChord,
    setRoot: setRoot,
    manualCenter: manualCenter,
  };
})();
