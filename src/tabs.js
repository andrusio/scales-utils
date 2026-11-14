(function () {
  'use strict';

  // Pestañas. Cada una tiene su hash (#acordes, #escalas...) y puede recibir
  // parámetros para links compartidos: #acordes?lista=... La de inicio (sin
  // hash) es el círculo de quintas.
  const VIEWS = {
    scales:   { hashes: ['#escalas'],     app: 'scalesApp',   subtitle: 'Tocá notas en el instrumento para ver qué escalas las contienen, o elegí una escala para verla.' },
    chords:   { hashes: ['#acordes'],     app: 'chordsApp',   subtitle: 'Tocá notas en el instrumento para ver qué acorde forman y de qué intervalos está hecho.' },
    circle:   { hashes: ['', '#circulo'], app: 'circleApp',   subtitle: 'Elegí una nota o cargá los acordes de una canción para ver el círculo y los modos.' },
    practice: { hashes: ['#practica'],    app: 'practiceApp', subtitle: 'Ejercicios cortos para entrenar el oído y la teoría.' },
  };

  const subtitleEl = document.getElementById('subtitle');
  const tabs = Array.prototype.slice.call(document.querySelectorAll('.tabs [role="tab"]'));

  function show(view) {
    if (!VIEWS[view]) view = 'circle';
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

  // Comparte un link a la vista actual (`hash` con sus parámetros): con el menú
  // de compartir del sistema si existe (celular), o copiándolo y avisando en `btn`.
  function share(hash, btn) {
    const url = location.href.split('#')[0] + hash;
    const done = function () {
      if (!btn) return;
      btn.classList.add('copied');
      setTimeout(function () { btn.classList.remove('copied'); }, 1600);
    };
    // Copia con el método viejo (sirve aunque no haya permiso de portapapeles
    // o la página esté abierta como archivo); si tampoco anda, muestra el link.
    const fallback = function () {
      const ta = document.createElement('textarea');
      ta.value = url;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      let ok = false;
      try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      document.body.removeChild(ta);
      if (ok) done();
      else window.prompt('Copiá este link:', url);
    };
    if (navigator.share && /^https?:/.test(location.protocol)) {
      navigator.share({ title: document.title, url: url }).catch(function () { /* cancelado */ });
    } else if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(url).then(done, fallback);
    } else {
      fallback();
    }
  }

  // Vista inicial y parámetros del link.
  const parts = location.hash.split('?');
  const params = new URLSearchParams(parts[1] || '');
  const initial = Object.keys(VIEWS).filter(function (v) { return VIEWS[v].hashes.indexOf(parts[0]) >= 0; })[0] || 'circle';
  show(initial);
  const app = window[VIEWS[initial].app];
  if (parts[1] && app && app.applyParams) app.applyParams(params);

  window.tabsApp = { show: show, share: share };
})();
