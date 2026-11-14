(function () {
  'use strict';

  // Pestañas. Cada una tiene su hash (#acordes, #circulo...) y puede recibir
  // parámetros para links compartidos: #acordes?lista=...
  const VIEWS = {
    scales:   { hashes: ['', '#escalas'], app: 'scalesApp',   subtitle: 'Tocá notas en el instrumento para ver qué escalas las contienen, o elegí una escala para verla.' },
    chords:   { hashes: ['#acordes'],     app: 'chordsApp',   subtitle: 'Tocá notas en el instrumento para ver qué acorde forman y de qué intervalos está hecho.' },
    circle:   { hashes: ['#circulo'],     app: 'circleApp',   subtitle: 'Elegí una nota o cargá los acordes de una canción para ver el círculo y los modos.' },
    practice: { hashes: ['#practica'],    app: 'practiceApp', subtitle: 'Ejercicios cortos para entrenar el oído y la teoría.' },
  };

  const subtitleEl = document.getElementById('subtitle');
  const tabs = Array.prototype.slice.call(document.querySelectorAll('.tabs [role="tab"]'));

  function show(view) {
    if (!VIEWS[view]) view = 'scales';
    tabs.forEach(function (tab) {
      const active = tab.dataset.view === view;
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
      document.getElementById('view-' + tab.dataset.view).hidden = !active;
    });
    subtitleEl.textContent = VIEWS[view].subtitle;
    const hash = VIEWS[view].hashes[0];
    if (location.hash !== hash) history.replaceState(null, '', hash || location.pathname + location.search);
    if (view === 'circle' && window.circleApp) window.circleApp.render();
    if (view === 'chords' && window.chordsApp) window.chordsApp.render();
    if (view === 'practice' && window.practiceApp) window.practiceApp.render();
  }

  tabs.forEach(function (tab) {
    tab.addEventListener('click', function () { show(tab.dataset.view); });
  });

  // Copia un link a la vista actual (`hash` con sus parámetros) y avisa en `btn`.
  function share(hash, btn) {
    const url = location.href.split('#')[0] + hash;
    const done = function () {
      if (!btn) return;
      const old = btn.textContent;
      btn.textContent = '¡Link copiado!';
      setTimeout(function () { btn.textContent = old; }, 1600);
    };
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(url).then(done, function () { window.prompt('Copiá este link:', url); });
    } else {
      window.prompt('Copiá este link:', url);
    }
  }

  // Vista inicial y parámetros del link.
  const parts = location.hash.split('?');
  const params = new URLSearchParams(parts[1] || '');
  const initial = Object.keys(VIEWS).filter(function (v) { return VIEWS[v].hashes.indexOf(parts[0]) >= 0; })[0] || 'scales';
  show(initial);
  const app = window[VIEWS[initial].app];
  if (parts[1] && app && app.applyParams) app.applyParams(params);

  window.tabsApp = { show: show, share: share };
})();
