(function () {
  'use strict';

  const Core = window.ScalesCore;

  const state = {
    config: { version: Core.DEFAULT_CONFIG.version, tuning: Core.DEFAULT_CONFIG.tuning.slice(), frets: Core.DEFAULT_CONFIG.frets },
    selected: new Set(),
  };

  const boardEl = document.getElementById('fretboard');
  const resultsEl = document.getElementById('results');
  const modesEl = document.getElementById('modes');
  const controlsEl = document.getElementById('controls');
  const exportBtn = document.getElementById('export-btn');
  const importBtn = document.getElementById('import-btn');
  const importFile = document.getElementById('import-file');
  const ioError = document.getElementById('io-error');

  // Dibuja el mástil: una fila por cuerda (aguda arriba) y una columna por traste
  // (0 = al aire). Los nombres están siempre visibles a baja opacidad; las notas
  // seleccionadas se resaltan en todas las cuerdas y octavas.
  function renderFretboard() {
    boardEl.innerHTML = '';
    const rows = Core.renderOrder(state.config.tuning);
    for (const row of rows) {
      const rowEl = document.createElement('div');
      rowEl.className = 'string-row';
      for (let fret = 0; fret <= state.config.frets; fret++) {
        const note = Core.noteAtPosition(state.config.tuning, row.tuningIndex, fret);
        const cell = document.createElement('div');
        cell.className = 'note' + (state.selected.has(note) ? ' selected' : '');
        cell.dataset.note = note;
        cell.dataset.string = String(row.tuningIndex);
        cell.dataset.fret = String(fret);
        cell.textContent = note;
        rowEl.appendChild(cell);
      }
      boardEl.appendChild(rowEl);
    }
  }

  // Lista de escalas que contienen las notas marcadas, en el orden del programa.
  function renderResults() {
    resultsEl.innerHTML = '';
    const selected = [...state.selected];
    if (selected.length === 0) {
      const p = document.createElement('p');
      p.className = 'empty';
      p.textContent = 'Clickeá notas en el mástil para ver qué escalas las contienen.';
      resultsEl.appendChild(p);
      return;
    }

    for (const m of Core.findScales(selected)) {
      const item = document.createElement('div');
      item.className = 'result';

      const title = document.createElement('div');
      title.className = 'title';
      title.textContent = m.root + ' ' + m.name;

      const notes = document.createElement('div');
      notes.className = 'notes';
      notes.textContent = m.notes.join(' ');

      const meta = document.createElement('div');
      meta.className = 'meta';
      meta.textContent = 'Coincidencias: ' + m.matched + '/' + m.total + ' (' + m.coincidencePercent + '%)' +
        ' | Similitud: ' + Math.floor(m.similarity) + '%';

      item.appendChild(title);
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
  // que coincidieron. No aparece si no hay escalas Mayor/Natural Menor.
  function renderModes() {
    modesEl.innerHTML = '';
    const matched = Core.findScales([...state.selected]);

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

      // Índice del modo padre dentro de los 7: 0 (Jónico) para Mayor, 5 (Eólico) para Natural Menor.
      const parentIdx = new Set(
        group.scales.map(function (s) { return s.name === 'Mayor' ? 0 : 5; })
      );

      const block = document.createElement('div');
      block.className = 'modes-block';

      const head = document.createElement('div');
      head.className = 'parent-name';
      head.textContent = 'Estas mismas notas también son (' +
        group.scales.map(function (s) { return s.root + ' ' + s.name; }).join(', ') + '):';
      block.appendChild(head);

      const list = document.createElement('div');
      modes.forEach(function (mode, i) {
        const chip = document.createElement('span');
        chip.className = 'mode' + (parentIdx.has(i) ? ' is-parent' : '');
        chip.textContent = mode.tonic + ' ' + mode.name;
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
  }

  function renderAll() {
    renderFretboard();
    renderResults();
    renderModes();
  }

  function toggleNote(note) {
    if (state.selected.has(note)) state.selected.delete(note);
    else state.selected.add(note);
    renderAll();
  }

  boardEl.addEventListener('click', function (event) {
    const cell = event.target.closest('.note');
    if (!cell) return;
    toggleNote(cell.dataset.note);
  });

  // Exporta la configuración actual como archivo .json (descarga por Blob; funciona con file://).
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

  // Lee un archivo .json y, si es válido, aplica la configuración. Nunca rompe: informa errores.
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

  exportBtn.addEventListener('click', exportConfig);
  importBtn.addEventListener('click', function () { importFile.click(); });
  importFile.addEventListener('change', function () {
    if (importFile.files && importFile.files[0]) importConfig(importFile.files[0]);
    importFile.value = '';
  });

  renderControls();
  renderAll();

  // Expuesto para depuración y para las tareas siguientes.
  window.scalesApp = {
    state: state,
    renderAll: renderAll,
    toggleNote: toggleNote,
    applyConfig: applyConfig,
    exportConfig: exportConfig,
    importConfig: importConfig,
  };
})();
