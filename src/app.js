(function () {
  'use strict';

  const Core = window.ScalesCore;

  const state = {
    config: { version: Core.DEFAULT_CONFIG.version, tuning: Core.DEFAULT_CONFIG.tuning.slice(), frets: Core.DEFAULT_CONFIG.frets },
    selected: new Set(),
    // Visor de escala: muestra una escala elegida en el instrumento.
    view: { active: false, root: 0, scale: 'Mayor (Jónico)', labels: 'degrees', position: 0 },
  };

  const S = window.Spelling;
  const ALIAS = { 1: 'Db', 3: 'Eb', 6: 'Gb', 8: 'Ab', 10: 'Bb' };
  // Para relacionar un modo con su escala mayor "madre".
  const MODE_OFFSETS = { 'Mayor (Jónico)': 0, 'Dórico': 2, 'Frigio': 4, 'Lidio': 5, 'Mixolidio': 7, 'Menor natural (Eólico)': 9, 'Locrio': 11 };

  const boardEl = document.getElementById('fretboard');
  const resultsEl = document.getElementById('results');
  const modesEl = document.getElementById('modes');
  const controlsEl = document.getElementById('controls-main');
  const saveBtn = document.getElementById('save-btn');
  const loadBtn = document.getElementById('load-btn');
  const importFile = document.getElementById('import-file');
  const ioError = document.getElementById('io-error');
  const v = {
    root: document.getElementById('view-root'),
    scale: document.getElementById('view-scale'),
    labels: document.getElementById('view-labels'),
    pos: document.getElementById('view-pos'),
    show: document.getElementById('view-show'),
    play: document.getElementById('view-play'),
    share: document.getElementById('view-share'),
    close: document.getElementById('view-close'),
    info: document.getElementById('view-info'),
  };

  function isPiano() { return window.InstrumentMode.get() === 'piano'; }
  function mod(n) { return ((n % 12) + 12) % 12; }

  // ---- Escala del visor ----
  function viewData() {
    const vs = Core.viewScale(state.view.scale);
    const sp = S.spell(state.view.root, vs.degrees);
    const semis = vs.degrees.map(Core.degreeSemis);
    const byPc = {};
    semis.forEach(function (x, i) {
      byPc[mod(state.view.root + x)] = { degree: vs.degrees[i], name: sp.notes[i], index: i };
    });
    return { vs: vs, sp: sp, semis: semis, byPc: byPc };
  }

  function guitarPositions(data) {
    const open = window.ChordsCore.openPitches(state.config.tuning);
    return Core.scalePositions(open, state.config.frets, state.view.root, data.vs.degrees);
  }

  // Dibuja el mástil o el teclado: con el visor activo, la escala elegida (con
  // nombres o grados); si no, las notas seleccionadas en todas las octavas.
  function renderFretboard() {
    const piano = isPiano();
    document.getElementById('controls').hidden = piano;
    boardEl.setAttribute('aria-label', piano ? 'Teclado' : 'Mástil');

    if (!state.view.active) {
      window.InstrumentMode.renderBoard(boardEl, {
        config: state.config,
        cls: function (i) { return state.selected.has(i.note) ? 'selected' : ''; },
      });
      return;
    }

    const data = viewData();
    let inPosition = null;
    if (!piano && state.view.position > 0) {
      const pos = guitarPositions(data)[state.view.position - 1];
      if (pos) {
        inPosition = new Set(pos.cells.map(function (c) { return c.string + ':' + c.fret; }));
      }
    }
    window.InstrumentMode.renderBoard(boardEl, {
      config: state.config,
      cls: function (i) {
        const d = data.byPc[Core.noteIndex(i.note)];
        if (!d) return '';
        if (inPosition && !inPosition.has(i.string + ':' + i.fret)) return '';
        return 'selected' + (d.degree === '1' ? ' chord-root' : '');
      },
      label: function (i) {
        const d = data.byPc[Core.noteIndex(i.note)];
        if (!d) return null;
        return state.view.labels === 'degrees' ? d.degree : d.name;
      },
    });
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

  function renderViewer() {
    v.root.value = String(state.view.root);
    v.scale.value = state.view.scale;
    v.show.hidden = state.view.active;
    v.close.hidden = !state.view.active;
    seg(v.labels, [{ value: 'degrees', label: 'Grados' }, { value: 'notes', label: 'Notas' }], state.view.labels,
      function (x) { state.view.labels = x; renderViewer(); renderFretboard(); });

    const data = viewData();
    const positions = isPiano() ? [] : guitarPositions(data);
    if (state.view.position > positions.length) state.view.position = 0;
    v.pos.hidden = isPiano() || positions.length === 0;
    const posOpts = [{ value: 0, label: 'Todo el mástil' }];
    positions.forEach(function (_, i) { posOpts.push({ value: i + 1, label: String(i + 1) }); });
    seg(v.pos, posOpts, state.view.position, function (x) { state.view.position = x; renderViewer(); renderFretboard(); });

    let html = '<div class="view-notes">';
    data.sp.notes.forEach(function (n, i) {
      html += '<span class="view-note' + (i === 0 ? ' is-root' : '') + '"><strong>' + n + '</strong><small>' + data.vs.degrees[i] + '</small></span>';
    });
    html += '</div>';
    const off = MODE_OFFSETS[state.view.scale];
    if (off !== undefined && off !== 0) {
      const parent = mod(state.view.root - off);
      html += '<p class="view-hint">Mismas notas que <strong>' + S.keyName(parent, 'major') + ' mayor</strong>, empezando desde ' + data.sp.root + '.</p>';
    }
    if (!isPiano() && state.view.active && state.view.position > 0) {
      html += '<p class="view-hint">Posición ' + state.view.position + ': ' + (data.vs.degrees.length >= 7 ? '3' : '2') + ' notas por cuerda.</p>';
    }
    v.info.innerHTML = html;
    v.info.hidden = !state.view.active;
  }

  // Abre el visor con una escala (desde un resultado, un modo, el identificador de acordes...).
  function showScale(rootPc, scaleName) {
    const vs = Core.viewScale(scaleName);
    if (!vs) return;
    state.view.active = true;
    state.view.root = mod(rootPc);
    state.view.scale = vs.name;
    state.view.position = 0;
    renderViewer();
    renderFretboard();
  }

  function playScale(rootPc, scaleName) {
    const vs = Core.viewScale(scaleName);
    window.Sound.sequence(window.Sound.scaleMidis(rootPc, vs.degrees.map(Core.degreeSemis)), 0.3);
  }

  function initViewer() {
    for (let pc = 0; pc < 12; pc++) {
      const o = document.createElement('option');
      o.value = String(pc);
      o.textContent = Core.NOTES[pc] + (ALIAS[pc] ? ' / ' + ALIAS[pc] : '');
      v.root.appendChild(o);
    }
    Core.VIEW_SCALES.forEach(function (vs) {
      const o = document.createElement('option');
      o.value = vs.name;
      o.textContent = vs.name;
      v.scale.appendChild(o);
    });
    v.root.addEventListener('change', function () { state.view.root = Number(v.root.value); state.view.position = 0; renderViewer(); renderFretboard(); });
    v.scale.addEventListener('change', function () { state.view.scale = v.scale.value; state.view.position = 0; renderViewer(); renderFretboard(); });
    v.show.addEventListener('click', function () { state.view.active = true; renderViewer(); renderFretboard(); });
    v.close.addEventListener('click', function () { state.view.active = false; renderViewer(); renderFretboard(); });
    v.play.addEventListener('click', function () { playScale(state.view.root, state.view.scale); });
    v.share.addEventListener('click', function () {
      window.tabsApp.share('#escalas?ver=' + state.view.root + '.' + encodeURIComponent(state.view.scale), v.share);
    });
  }

  // ---- Resultados ----
  function actionBtn(text, title, onClick) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'mini-btn';
    b.textContent = text;
    b.title = title;
    b.addEventListener('click', onClick);
    return b;
  }

  // Lista de escalas que contienen las notas marcadas, en el orden del programa.
  function renderResults() {
    resultsEl.innerHTML = '';
    const selected = [...state.selected];
    if (selected.length === 0) {
      const p = document.createElement('p');
      p.className = 'empty';
      p.textContent = 'Tocá notas en el instrumento para ver qué escalas las contienen.';
      resultsEl.appendChild(p);
      return;
    }

    for (const m of Core.findScales(selected)) {
      const scale = Core.SCALES.filter(function (x) { return x.name === m.name; })[0];
      const rootPc = Core.noteIndex(m.root);
      const sp = S.spell(rootPc, scale.degrees);

      const item = document.createElement('div');
      item.className = 'result' + (m.similarity === 100 ? ' perfect' : '');

      const head = document.createElement('div');
      head.className = 'result-head';
      const title = document.createElement('div');
      title.className = 'title';
      title.textContent = sp.root + ' ' + m.name;
      head.appendChild(title);
      const actions = document.createElement('div');
      actions.className = 'result-actions';
      actions.appendChild(actionBtn('▶', 'Escuchar la escala', function () { playScale(rootPc, m.name); }));
      actions.appendChild(actionBtn('Ver', 'Mostrar la escala en el instrumento', function () { showScale(rootPc, m.name); window.scrollTo({ top: 0, behavior: 'smooth' }); }));
      head.appendChild(actions);

      const notes = document.createElement('div');
      notes.className = 'notes';
      notes.textContent = sp.notes.join(' ');

      const meta = document.createElement('div');
      meta.className = 'meta';
      meta.textContent = 'Coincidencias: ' + m.matched + '/' + m.total + ' (' + m.coincidencePercent + '%)' +
        ' | Similitud: ' + Math.floor(m.similarity) + '%';

      item.appendChild(head);
      item.appendChild(notes);
      item.appendChild(meta);

      if (m.missing.length) {
        const missing = document.createElement('div');
        missing.className = 'meta missing';
        missing.textContent = 'No incluidas: ' + m.missing.join(' ');
        item.appendChild(missing);
      }

      resultsEl.appendChild(item);
    }
  }

  // Panel de modos: por cada conjunto diatónico distinto entre los resultados, un
  // bloque con los 7 modos, marcando el/los modo(s) que corresponden a las escalas
  // que coincidieron. Cada modo se puede ver en el instrumento.
  function renderModes() {
    modesEl.innerHTML = '';
    // Solo cuentan las escalas que contienen TODAS las notas marcadas (similitud 100%),
    // sin el tope de resultados del panel de escalas.
    const matched = Core.findScales([...state.selected], Infinity)
      .filter(function (m) { return m.missing.length === 0; });

    const groups = new Map();
    for (const m of matched) {
      if (m.name !== 'Mayor' && m.name !== 'Natural Menor') continue;
      const key = m.notes.slice().sort().join(',');
      if (!groups.has(key)) groups.set(key, { notes: m.notes, scales: [] });
      groups.get(key).scales.push({ root: m.root, name: m.name });
    }

    for (const group of groups.values()) {
      const first = group.scales[0];
      const modes = Core.modesForScale(first.root, first.name);
      if (!modes) continue;
      // Nombres escritos según la escala mayor madre (la tónica del Jónico).
      const anchor = Core.noteIndex(modes[0].tonic);
      const spelled = S.spell(anchor, S.MAJOR_DEGREES).notes;

      // Índice del modo padre dentro de los 7: 0 (Jónico) para Mayor, 5 (Eólico) para Natural Menor.
      const parentIdx = new Set(
        group.scales.map(function (s) { return s.name === 'Mayor' ? 0 : 5; })
      );

      const block = document.createElement('div');
      block.className = 'modes-block';

      const head = document.createElement('div');
      head.className = 'parent-name';
      head.textContent = 'Estas mismas notas también son (' +
        group.scales.map(function (s) {
          return spelled[s.name === 'Mayor' ? 0 : 5] + ' ' + s.name;
        }).join(', ') + '):';
      block.appendChild(head);

      const list = document.createElement('div');
      modes.forEach(function (mode, i) {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'mode' + (parentIdx.has(i) ? ' is-parent' : '');
        chip.textContent = spelled[i] + ' ' + mode.name;
        chip.title = 'Ver ' + spelled[i] + ' ' + mode.name + ' en el instrumento';
        chip.addEventListener('click', function () {
          showScale(Core.noteIndex(mode.tonic), mode.name);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        });
        list.appendChild(chip);
      });
      block.appendChild(list);

      modesEl.appendChild(block);
    }
  }

  // Editor de configuración: un campo por cuerda (grave → agudo), botones para
  // agregar/quitar cuerdas, input de trastes y botón Aplicar.
  function renderControls() {
    controlsEl.innerHTML = '';

    const tuningLabel = document.createElement('label');
    tuningLabel.textContent = 'Afinación (grave → agudo):';
    controlsEl.appendChild(tuningLabel);

    const fields = document.createElement('div');
    fields.className = 'tuning-fields';
    fields.id = 'tuning-fields';
    state.config.tuning.forEach(function (note) {
      fields.appendChild(makeTuningInput(note));
    });
    controlsEl.appendChild(fields);

    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.textContent = '+ cuerda';
    addBtn.addEventListener('click', function () {
      fields.appendChild(makeTuningInput('E'));
    });
    controlsEl.appendChild(addBtn);

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.textContent = '- cuerda';
    removeBtn.addEventListener('click', function () {
      if (fields.lastElementChild) fields.removeChild(fields.lastElementChild);
    });
    controlsEl.appendChild(removeBtn);

    const fretsLabel = document.createElement('label');
    fretsLabel.textContent = 'Trastes:';
    controlsEl.appendChild(fretsLabel);

    const fretsInput = document.createElement('input');
    fretsInput.type = 'number';
    fretsInput.id = 'frets-input';
    fretsInput.min = String(Core.MIN_FRETS);
    fretsInput.max = String(Core.MAX_FRETS);
    fretsInput.value = String(state.config.frets);
    controlsEl.appendChild(fretsInput);

    const applyBtn = document.createElement('button');
    applyBtn.type = 'button';
    applyBtn.className = 'primary';
    applyBtn.textContent = 'Aplicar';
    applyBtn.addEventListener('click', function () { applyFromControls(); });
    controlsEl.appendChild(applyBtn);

    const errEl = document.createElement('span');
    errEl.className = 'error';
    errEl.id = 'controls-error';
    controlsEl.appendChild(errEl);
  }

  function makeTuningInput(value) {
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'tuning-input';
    input.value = value;
    input.maxLength = 2;
    return input;
  }

  function applyFromControls() {
    const fields = document.getElementById('tuning-fields');
    const fretsInput = document.getElementById('frets-input');
    const errEl = document.getElementById('controls-error');

    const tuning = Array.prototype.slice.call(fields.querySelectorAll('.tuning-input'))
      .map(function (i) { return i.value.trim(); });
    const candidate = { version: 1, tuning: tuning, frets: Number(fretsInput.value) };

    const result = Core.validateConfig(candidate);
    if (!result.ok) {
      errEl.textContent = result.errors.join(' · ');
      return;
    }
    errEl.textContent = '';
    applyConfig(result.config);
  }

  // Aplica una configuración ya validada y refleja todo en pantalla.
  function applyConfig(newConfig) {
    state.config = {
      version: newConfig.version,
      tuning: newConfig.tuning.slice(),
      frets: newConfig.frets,
    };
    renderControls();
    renderAll();
    document.dispatchEvent(new CustomEvent('instrumentchange', { detail: state.config }));
  }

  function renderAll() {
    renderFretboard();
    renderViewer();
    renderResults();
    renderModes();
  }

  function toggleNote(note) {
    if (state.selected.has(note)) state.selected.delete(note);
    else state.selected.add(note);
    renderAll();
  }

  boardEl.addEventListener('click', function (event) {
    const cell = event.target.closest('[data-note]');
    if (!cell) return;
    window.Sound.tap(window.InstrumentMode.cellInfo(cell, state.config).pitch);
    // Con el visor abierto, tocar solo hace sonar la nota.
    if (state.view.active) return;
    toggleNote(cell.dataset.note);
  });

  // Guarda el instrumento actual como archivo .json (descarga por Blob; funciona con file://).
  function exportConfig() {
    const text = Core.serializeConfig(state.config);
    const blob = new Blob([text], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'escalas-config.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // Carga un instrumento desde un archivo .json y, si es válido, lo aplica. Nunca rompe: informa errores.
  function importConfig(file) {
    const reader = new FileReader();
    reader.onload = function () {
      const result = Core.parseConfig(String(reader.result));
      if (!result.ok) {
        ioError.textContent = result.errors.join(' · ');
        return;
      }
      ioError.textContent = '';
      applyConfig(result.config);
    };
    reader.onerror = function () {
      ioError.textContent = 'No se pudo leer el archivo.';
    };
    reader.readAsText(file);
  }

  saveBtn.addEventListener('click', exportConfig);
  loadBtn.addEventListener('click', function () { importFile.click(); });
  importFile.addEventListener('change', function () {
    if (importFile.files && importFile.files[0]) importConfig(importFile.files[0]);
    importFile.value = '';
  });

  document.addEventListener('instrumentmodechange', function () { renderViewer(); renderFretboard(); });

  // Link compartido: #escalas?ver=<raíz>.<escala>
  function applyParams(params) {
    const ver = params.get('ver');
    if (!ver) return;
    const dot = ver.indexOf('.');
    const rootPc = Number(ver.slice(0, dot));
    const name = decodeURIComponent(ver.slice(dot + 1));
    if (rootPc >= 0 && rootPc < 12 && Core.viewScale(name)) showScale(rootPc, name);
  }

  initViewer();
  renderControls();
  renderAll();

  // Expuesto para depuración y para las tareas siguientes.
  window.scalesApp = {
    state: state,
    renderAll: renderAll,
    toggleNote: toggleNote,
    showScale: showScale,
    playScale: playScale,
    applyParams: applyParams,
    applyConfig: applyConfig,
    exportConfig: exportConfig,
    importConfig: importConfig,
  };
})();
