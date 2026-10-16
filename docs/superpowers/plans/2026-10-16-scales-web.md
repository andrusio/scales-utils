# Identificador de escalas en el mástil — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir una página estática (abre con doble clic, sin servidor ni build) con un mástil de guitarra horizontal donde se clickean notas y se identifican las escalas que las contienen, replicando el modo `-notas` del programa de Go, con un panel aparte para los modos griegos.

**Architecture:** Toda la lógica pura (notas, generación de escalas, búsqueda/ranking, modos, geometría del mástil, serialización de config) vive en `src/scales.js`, escrito con un envoltorio UMD para poder cargarse como script clásico en el navegador *y* con `require` en Node para los tests. La capa DOM (`src/app.js`) es fina: lee el DOM, llama a `ScalesCore` y pinta. `index.html` carga los scripts clásicos (funciona con `file://`).

**Tech Stack:** HTML + CSS + JavaScript sin dependencias. Tests con el runner integrado de Node (`node:test` + `node:assert`), ya instalado en la máquina. La app no necesita Node.

**Spec:** `docs/superpowers/specs/2026-10-16-scales-web-design.md`

## Global Constraints

- Sin servidor, sin build, sin ES modules: `index.html` debe abrir bien con `file://` usando `<script>` clásicos.
- Sin CDN, frameworks ni librerías externas: todo local, funciona offline.
- Nomenclatura de notas solo sostenidos: `C C# D D# E F F# G G# A A# B`.
- El matching debe replicar `main.go` exactamente (es anti-objetivo desviarse).
- Orden de cuerdas: afinación guardada de grave a agudo; al dibujar, la aguda arriba y la grave abajo.
- Persistencia solo por exportar/importar `.json` (no localStorage, no File System APIs).
- Comandos de test: `node --test tests/scales.test.js`.
- Idioma de la interfaz: español (como el programa y el README existentes).

## Review Focus

Clases de entrada / modos de falla que el spec implica pero que ningún test obvio cubre, y que más probablemente molesten a quien use esto. Cada una tiene su test añadido a la tarea dueña del código.

1. **Importar un `.json` malformado o con campos faltantes** — debe rechazarse con un mensaje claro, no romper la página. (Test en Tareas 4 y 8.)
2. **Afinación inválida** (nombre de nota inexistente como `H`, lista vacía, una sola cuerda) — no debe romper render ni cálculo. (Test en Tarea 4.)
3. **Cantidad de trastes fuera de rango** (0, negativa, enorme) — se acota sin romper. (Test en Tarea 4.)
4. **Selección extrema**: ninguna nota (estado vacío) y las 12 notas — sin `NaN` ni excepciones. (Test en Tarea 2.)
5. **Catálogo/selección degenerados**: selección con notas repetidas cuenta una vez; un conjunto que produce empates de similitud ordena estable. (Test en Tarea 2.)

---

### Task 1: Modelo de notas y generación de escalas

**Files:**
- Create: `src/scales.js`
- Create: `tests/scales.test.js`

**Interfaces:**
- Consumes: nada.
- Produces:
  - `NOTES: string[12]` — los 12 nombres en sostenidos.
  - `noteIndex(name: string): number` — índice 0..11, o `-1` si no es una nota válida.
  - `SCALES: {name: string, intervals: string[], count: number}[]` — las 7 escalas.
  - `generateScale(root: string, scale: {intervals: string[], count: number}): string[]`.

- [ ] **Step 1: Escribir los tests que fallan**

`tests/scales.test.js`:

```js
const test = require('node:test');
const assert = require('node:assert');
const { NOTES, noteIndex, SCALES, generateScale } = require('../src/scales.js');

const mayor = SCALES.find(s => s.name === 'Mayor');
const naturalMenor = SCALES.find(s => s.name === 'Natural Menor');
const pentaMenor = SCALES.find(s => s.name === 'Pentatónica Menor');
const enigma = SCALES.find(s => s.name === 'Enigmática');

test('NOTES son los 12 sostenidos', () => {
  assert.deepStrictEqual(NOTES, ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B']);
});

test('noteIndex devuelve -1 para nota inválida', () => {
  assert.strictEqual(noteIndex('C'), 0);
  assert.strictEqual(noteIndex('B'), 11);
  assert.strictEqual(noteIndex('H'), -1);
});

test('generateScale C Mayor', () => {
  assert.deepStrictEqual(generateScale('C', mayor), ['C','D','E','F','G','A','B']);
});

test('generateScale C# Natural Menor (del README)', () => {
  assert.deepStrictEqual(generateScale('C#', naturalMenor), ['C#','D#','E','F#','G#','A','B']);
});

test('generateScale D Pentatónica Menor tiene 5 notas', () => {
  assert.deepStrictEqual(generateScale('D', pentaMenor), ['D','F','G','A','C']);
});

test('generateScale F# Enigmática (del README)', () => {
  assert.deepStrictEqual(generateScale('F#', enigma), ['F#','G','A#','C','D','E','F']);
});

test('generateScale da la vuelta al llegar a B', () => {
  assert.deepStrictEqual(generateScale('A', mayor), ['A','B','C#','D','E','F#','G#']);
});
```

- [ ] **Step 2: Correr los tests y verificar que fallan**

Run: `node --test tests/scales.test.js`
Esperado: FAIL — `Cannot find module '../src/scales.js'`.

- [ ] **Step 3: Implementar `src/scales.js`**

Envoltorio UMD (funciona como script clásico en el navegador vía `window.ScalesCore` y con `require` en Node):

```js
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ScalesCore = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const NOTES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];

  const SCALES = [
    { name: 'Mayor',             intervals: ['T','T','S','T','T','T','S'], count: 7 },
    { name: 'Natural Menor',     intervals: ['T','S','T','T','S','T','T'], count: 7 },
    { name: 'Melódica Menor',    intervals: ['T','S','T','T','T','T','S'], count: 7 },
    { name: 'Harmónica Menor',   intervals: ['T','S','T','T','S','TS','S'], count: 7 },
    { name: 'Pentatónica Mayor', intervals: ['T','T','TS','T','TS'],       count: 5 },
    { name: 'Pentatónica Menor', intervals: ['TS','T','T','TS','T'],       count: 5 },
    { name: 'Enigmática',        intervals: ['S','TS','T','T','T','S','S'], count: 7 },
  ];

  function noteIndex(name) {
    return NOTES.indexOf(name);
  }

  // Avanza desde root sumando semitonos: T=2, S=1, TS=3. Devuelve count notas.
  function generateScale(root, scale) {
    const out = [root];
    let idx = noteIndex(root);
    for (const interval of scale.intervals) {
      const step = interval === 'TS' ? 3 : interval === 'T' ? 2 : 1;
      idx = (idx + step) % NOTES.length;
      out.push(NOTES[idx]);
    }
    return out.slice(0, scale.count);
  }

  return { NOTES, noteIndex, SCALES, generateScale };
});
```

- [ ] **Step 4: Correr los tests y verificar que pasan**

Run: `node --test tests/scales.test.js`
Esperado: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add src/scales.js tests/scales.test.js
git commit -m "feat(scales): modelo de notas y generacion de escalas"
```

---

### Task 2: Búsqueda y ranking (paridad con Go)

**Files:**
- Modify: `src/scales.js`
- Modify: `tests/scales.test.js`

**Interfaces:**
- Consumes: `NOTES`, `noteIndex`, `SCALES`, `generateScale` (Tarea 1).
- Produces:
  - `MAX_RESULTS: number` = `10`.
  - `findScales(selected: string[]): ScaleMatch[]`
  - `ScaleMatch = { root: string, name: string, notes: string[], matched: number, total: number, coincidencePercent: number, similarity: number, missing: string[] }`

`findScales` replica `encontrar_escala` de `main.go`: para cada escala generada en las 12 raíces, cuenta las notas seleccionadas presentes (deduplicadas), calcula `coincidencePercent = Math.floor(matched*100/total)`, `similarity = matched/selected.length*100`, guarda `missing`; incluye solo las de `matched > 0`; ordena por `similarity` desc y, en empate, por `coincidencePercent` desc (orden estable); recorta a `MAX_RESULTS`.

- [ ] **Step 1: Escribir los tests que fallan**

Agregar a `tests/scales.test.js`:

```js
const { findScales, MAX_RESULTS } = require('../src/scales.js');

test('README: C,D,E,F,G encuentra C Mayor 5/7, similitud 100, sin faltantes', () => {
  const r = findScales(['C','D','E','F','G']);
  const cMayor = r.find(x => x.root === 'C' && x.name === 'Mayor');
  assert.ok(cMayor);
  assert.strictEqual(cMayor.matched, 5);
  assert.strictEqual(cMayor.total, 7);
  assert.strictEqual(cMayor.coincidencePercent, 71);
  assert.strictEqual(Math.round(cMayor.similarity), 100);
  assert.deepStrictEqual(cMayor.missing, []);
});

test('solo devuelve escalas con al menos una coincidencia', () => {
  const r = findScales(['C']);
  assert.ok(r.length > 0);
  for (const m of r) assert.ok(m.notes.includes('C'));
});

test('desempata por porcentaje de coincidencias, no por conteo crudo (paridad Go)', () => {
  const r = findScales(['D','F','G']);
  const dPenta = r.find(x => x.root === 'D' && x.name === 'Pentatónica Menor');
  const fMayor = r.find(x => x.root === 'F' && x.name === 'Mayor');
  assert.strictEqual(dPenta.matched, 3);
  assert.strictEqual(dPenta.coincidencePercent, 60); // 3*100/5
  assert.strictEqual(fMayor.matched, 3);
  assert.strictEqual(fMayor.coincidencePercent, 42); // 3*100/7 truncado
  assert.ok(r.indexOf(dPenta) < r.indexOf(fMayor));
});

test('recorta a MAX_RESULTS', () => {
  const r = findScales(['C','D','E','F','G','A','B']);
  assert.strictEqual(MAX_RESULTS, 10);
  assert.ok(r.length <= MAX_RESULTS);
});

test('Review Focus: selección con repetidas cuenta una vez', () => {
  assert.deepStrictEqual(findScales(['C','C','C']), findScales(['C']));
});

test('Review Focus: selección vacía no rompe', () => {
  assert.deepStrictEqual(findScales([]), []);
});

test('Review Focus: las 12 notas no producen NaN', () => {
  const r = findScales(NOTES);
  assert.ok(r.length > 0);
  for (const m of r) {
    assert.ok(Number.isFinite(m.similarity));
    assert.ok(Number.isFinite(m.coincidencePercent));
  }
});
```

- [ ] **Step 2: Correr los tests y verificar que fallan**

Run: `node --test tests/scales.test.js`
Esperado: FAIL — `findScales is not a function`.

- [ ] **Step 3: Implementar `findScales` y `MAX_RESULTS` en `src/scales.js`**

Generar todas las escalas de las 12 raíces; para cada una, `matched` = notas seleccionadas (únicas) presentes en sus `notes`; `missing` = seleccionadas ausentes; `total` = `scale.count`. Empujar las de `matched > 0`, ordenar con comparador que primero mira `similarity` y si empata `coincidencePercent` (usar `Array.prototype.sort`, que es estable), y `slice(0, MAX_RESULTS)`. Deduplicar la selección antes de calcular. Si la selección está vacía, devolver `[]`. Exportar ambos en el `return` del módulo.

- [ ] **Step 4: Correr los tests y verificar que pasan**

Run: `node --test tests/scales.test.js`
Esperado: PASS (todos).

- [ ] **Step 5: Commit**

```bash
git add src/scales.js tests/scales.test.js
git commit -m "feat(scales): busqueda y ranking de escalas con paridad a Go"
```

---

### Task 3: Modos griegos

**Files:**
- Modify: `src/scales.js`
- Modify: `tests/scales.test.js`

**Interfaces:**
- Consumes: `NOTES`, `noteIndex` (Tarea 1).
- Produces:
  - `MODE_NAMES: string[7]` = `['Jónico','Dórico','Frigio','Lidio','Mixolidio','Eólico','Locrio']`.
  - `modesForScale(root: string, scaleName: string): {tonic: string, name: string, isParent: boolean}[] | null` — los 7 modos del conjunto diatónico, marcando el que corresponde a la escala; `null` si `scaleName` no es `'Mayor'` ni `'Natural Menor'`.

`modesForScale` deriva las tónicas rotando la escala mayor desde el "ancla": para `'Mayor'` el ancla es `root`; para `'Natural Menor'` es `root` + 3 semitonos (su relativa mayor). Las tónicas de los 7 modos son las 7 notas de la escala mayor desde el ancla (offsets `[0,2,4,5,7,9,11]`), con `name` de `MODE_NAMES`. `isParent` es `true` en el índice 0 para Mayor y en el índice 5 (Eólico) para Natural Menor.

- [ ] **Step 1: Escribir los tests que fallan**

Agregar a `tests/scales.test.js`:

```js
const { modesForScale, MODE_NAMES } = require('../src/scales.js');

test('C Mayor -> tónicas C D E F G A B y padre C Jónico', () => {
  const m = modesForScale('C', 'Mayor');
  assert.deepStrictEqual(m.map(x => x.tonic), ['C','D','E','F','G','A','B']);
  assert.deepStrictEqual(m.map(x => x.name), MODE_NAMES);
  assert.deepStrictEqual(m.map(x => x.isParent), [true,false,false,false,false,false,false]);
});

test('A Natural Menor -> mismas tónicas y padre A Eólico', () => {
  const m = modesForScale('A', 'Natural Menor');
  assert.deepStrictEqual(m.map(x => x.tonic), ['C','D','E','F','G','A','B']);
  assert.strictEqual(m[5].name, 'Eólico');
  assert.strictEqual(m[5].isParent, true);
  assert.strictEqual(m.filter(x => x.isParent).length, 1);
});

test('escala no diatónica -> null', () => {
  assert.strictEqual(modesForScale('C', 'Pentatónica Mayor'), null);
});
```

- [ ] **Step 2: Correr los tests y verificar que fallan**

Run: `node --test tests/scales.test.js`
Esperado: FAIL — `modesForScale is not a function`.

- [ ] **Step 3: Implementar `MODE_NAMES` y `modesForScale` en `src/scales.js`**

Calcular el ancla según la escala, generar las 7 tónicas con los offsets de la escala mayor y armar el array de modos con su `isParent`. Devolver `null` para cualquier `scaleName` que no sea Mayor/Natural Menor. Exportar ambos.

- [ ] **Step 4: Correr los tests y verificar que pasan**

Run: `node --test tests/scales.test.js`
Esperado: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/scales.js tests/scales.test.js
git commit -m "feat(scales): derivacion de modos griegos"
```

---

### Task 4: Geometría del mástil y esquema de configuración

**Files:**
- Modify: `src/scales.js`
- Modify: `tests/scales.test.js`

**Interfaces:**
- Consumes: `NOTES`, `noteIndex` (Tarea 1).
- Produces:
  - `DEFAULT_CONFIG = { version: 1, tuning: ['E','A','D','G','B','E'], frets: 15 }` — `tuning` de grave a agudo.
  - `noteAtPosition(tuning: string[], stringIndex: number, fret: number): string`.
  - `renderOrder(tuning: string[]): {note: string, tuningIndex: number}[]` — de agudo a grave.
  - `MIN_FRETS = 1`, `MAX_FRETS = 24`.
  - `validateConfig(obj: any): {ok: boolean, config?: object, errors: string[]}`.
  - `serializeConfig(config: object): string`.
  - `parseConfig(text: string): {ok: boolean, config?: object, errors: string[]}`.

- [ ] **Step 1: Escribir los tests que fallan**

Agregar a `tests/scales.test.js`:

```js
const {
  DEFAULT_CONFIG, MIN_FRETS, MAX_FRETS,
  noteAtPosition, renderOrder, validateConfig, serializeConfig, parseConfig,
} = require('../src/scales.js');

test('DEFAULT_CONFIG estándar', () => {
  assert.deepStrictEqual(DEFAULT_CONFIG.tuning, ['E','A','D','G','B','E']);
  assert.strictEqual(DEFAULT_CONFIG.frets, 15);
  assert.strictEqual(DEFAULT_CONFIG.version, 1);
});

test('noteAtPosition en afinación estándar', () => {
  const t = DEFAULT_CONFIG.tuning;
  assert.strictEqual(noteAtPosition(t, 0, 0), 'E');
  assert.strictEqual(noteAtPosition(t, 0, 1), 'F');
  assert.strictEqual(noteAtPosition(t, 5, 0), 'E'); // cuerda aguda
  assert.strictEqual(noteAtPosition(t, 0, 12), 'E'); // da la vuelta
});

test('renderOrder pone la cuerda aguda arriba', () => {
  const r = renderOrder(DEFAULT_CONFIG.tuning);
  assert.strictEqual(r[0].tuningIndex, 5);
  assert.strictEqual(r[0].note, 'E');
  assert.strictEqual(r[r.length - 1].tuningIndex, 0);
});

test('round-trip serialize/parse', () => {
  const p = parseConfig(serializeConfig(DEFAULT_CONFIG));
  assert.strictEqual(p.ok, true);
  assert.deepStrictEqual(p.config, DEFAULT_CONFIG);
});

test('Review Focus: JSON inválido se rechaza sin romper', () => {
  const p = parseConfig('{no soy json');
  assert.strictEqual(p.ok, false);
  assert.ok(p.errors.length > 0);
});

test('Review Focus: afinación vacía o con nota inexistente', () => {
  assert.strictEqual(validateConfig({ version: 1, tuning: [], frets: 15 }).ok, false);
  assert.strictEqual(validateConfig({ version: 1, tuning: ['H'], frets: 15 }).ok, false);
});

test('Review Focus: trastes fuera de rango', () => {
  assert.strictEqual(validateConfig({ version: 1, tuning: ['E'], frets: MIN_FRETS - 1 }).ok, false);
  assert.strictEqual(validateConfig({ version: 1, tuning: ['E'], frets: MAX_FRETS + 1 }).ok, false);
  assert.strictEqual(validateConfig({ version: 1, tuning: ['E'], frets: 12 }).ok, true);
});
```

- [ ] **Step 2: Correr los tests y verificar que fallan**

Run: `node --test tests/scales.test.js`
Esperado: FAIL — `noteAtPosition is not a function`.

- [ ] **Step 3: Implementar geometría y configuración en `src/scales.js`**

`noteAtPosition`: `NOTES[(noteIndex(tuning[stringIndex]) + fret) % 12]`. `renderOrder`: devolver la lista invertida (agudo→grave) con su índice original. `validateConfig`: verificar `version === 1`, `tuning` es array no vacío de nombres válidos (`noteIndex >= 0`), `frets` entero en `[MIN_FRETS, MAX_FRETS]`; devolver `{ok, config, errors}`. `serializeConfig`: `JSON.stringify(config)`. `parseConfig`: `try/catch` de `JSON.parse` y luego `validateConfig`; nunca lanzar.

- [ ] **Step 4: Correr los tests y verificar que pasan**

Run: `node --test tests/scales.test.js`
Esperado: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/scales.js tests/scales.test.js
git commit -m "feat(scales): geometria del mastil y esquema de configuracion"
```

---

### Task 5: La página — mástil y selección

**Files:**
- Create: `index.html`
- Create: `styles.css`
- Create: `src/app.js`
- Test: manual en navegador

**Interfaces:**
- Consumes: `window.ScalesCore` (Tareas 1–4): `DEFAULT_CONFIG`, `renderOrder`, `noteAtPosition`.
- Produces (para Tareas 6–8):
  - Estado global `state = { config, selected: Set<string> }` con `config` y `selected` (clases de altura seleccionadas).
  - Funciones `renderFretboard()`, `toggleNote(note)`, y un `.container` con ids: `#fretboard`, `#results`, `#modes`, `#controls`.

**Comportamiento:**
- Mástil horizontal estilo tablatura: una fila por cuerda, **la aguda arriba** (`renderOrder`). Columna de "al aire" (traste 0) más `config.frets` columnas.
- Cada posición (cuerda, traste) muestra el **nombre de la nota**, visible siempre a **opacidad muy baja**; al estar su nota en `selected`, se ve **sólida/resaltada** (todas las octavas y cuerdas donde aparezca).
- Click en una posición → `toggleNote(nota)`: si estaba, se quita; si no, se agrega. Vuelve a renderizar.

- [ ] **Step 1: Crear `index.html`**

Estructura mínima: `<!DOCTYPE html>`, `<meta charset>`, `<link rel="stylesheet" href="styles.css">`, un contenedor con `#fretboard`, `#results`, `#modes`, `#controls`; y al final los scripts **clásicos**:

```html
<script src="src/scales.js"></script>
<script src="src/app.js"></script>
```

- [ ] **Step 2: Implementar `renderFretboard()` y `toggleNote()` en `src/app.js`**

Leer `window.ScalesCore`. Inicializar `state.config = { ...DEFAULT_CONFIG }` y `state.selected = new Set()`. `renderFretboard` recorre `renderOrder(config.tuning)` y, por cada traste `0..config.frets`, crea un elemento con `data-note` y clase `selected` si corresponde. Adjuntar un listener delegado en `#fretboard` que llame a `toggleNote`.

- [ ] **Step 3: Estilar en `styles.css`**

Fila por cuerda con separación, columnas alineadas; `.note { opacity: 0.12 }` y `.note.selected { opacity: 1 }` (con algún color de resalte). `cursor: pointer` en las posiciones.

- [ ] **Step 4: Verificar a mano en el navegador**

Abrir `index.html` con doble clic. Esperado:
- Se ven 6 filas; la cuerda aguda (E) arriba y la grave (E) abajo; columnas 0..15.
- Los nombres se ven tenues pero legibles.
- Click en un `C` cualquiera → **todos** los `C` del mástil se ponen sólidos.
- Click de nuevo en ese `C` → vuelven todos a tenue.

- [ ] **Step 5: Commit**

```bash
git add index.html styles.css src/app.js
git commit -m "feat(web): mastil interactivo con seleccion de notas"
```

---

### Task 6: Paneles de resultados y modos

**Files:**
- Modify: `index.html`
- Modify: `styles.css`
- Modify: `src/app.js`
- Test: manual en navegador

**Interfaces:**
- Consumes: `window.ScalesCore.findScales`, `MAX_RESULTS`, `modesForScale` (Tareas 2–3); `state.selected` (Tarea 5).
- Produces: `renderResults()` y `renderModes()`, llamados tras cada cambio de selección.

**Comportamiento:**
- `#results`: con selección vacía, mensaje breve invitando a clickear el mástil. Con notas, la lista de `findScales([...state.selected])` (hasta `MAX_RESULTS`), cada ítem con: `root + ' ' + name`, las notas de la escala, `Coincidencias: n/total (x%)`, `Similitud: x%`, y las notas marcadas que faltan.
- `#modes`: por cada resultado cuyo `name` sea `'Mayor'` o `'Natural Menor'`, un bloque con `modesForScale(root, name)`: los 7 modos con su tónica y nombre, resaltando el `isParent`. Texto: "Estas mismas notas también son…". Si no hay ninguna escala diatónica en los resultados, el panel queda vacío.

- [ ] **Step 1: Agregar los contenedores de resultado y modos si faltan en `index.html`**

Asegurar `#results` y `#modes` bien identificados.

- [ ] **Step 2: Implementar `renderResults()` y `renderModes()` en `src/app.js`**

Llamarlas al final de `renderFretboard()` (o tras cada `toggleNote`). Formatear los números como el script de Go (porcentajes enteros, `n/total`).

- [ ] **Step 3: Estilar ambos paneles en `styles.css`**

Lista de resultados legible; bloque de modos diferenciado; resalte claro del modo padre.

- [ ] **Step 4: Verificar a mano en el navegador**

Abrir `index.html`, clickear `C, D, E, F, G` uno por uno. Esperado:
- En `#results` aparece `C Mayor` con `Coincidencias: 5/7 (71%)`, `Similitud: 100%`, sin notas faltantes; y otros resultados ordenados.
- En `#modes` aparece el bloque de `C Mayor` con los 7 modos, `C Jónico` resaltado.
- Destildar todo → estado vacío en `#results`, `#modes` vacío.

- [ ] **Step 5: Commit**

```bash
git add index.html styles.css src/app.js
git commit -m "feat(web): paneles de resultados y modos en vivo"
```

---

### Task 7: Editor de configuración (afinación, cuerdas, trastes)

**Files:**
- Modify: `index.html`
- Modify: `styles.css`
- Modify: `src/app.js`
- Test: manual en navegador

**Interfaces:**
- Consumes: `window.ScalesCore.DEFAULT_CONFIG`, `MIN_FRETS`, `MAX_FRETS`, `validateConfig` (Tarea 4); `state` (Tarea 5).
- Produces: `renderControls()`, `applyConfig(newConfig)`.

**Comportamiento:**
- `#controls`: un campo por cada cuerda de la afinación (editable, de grave a agudo), botones para **agregar/quitar cuerda** (agrega/quita entradas de `config.tuning`), y un campo numérico para `config.frets` acotado a `[MIN_FRETS, MAX_FRETS]`.
- Al aplicar, validar con `validateConfig`; si es válido, actualizar `state.config` y re-renderizar mástil, resultados y modos. Si no, mostrar el mensaje de error y no cambiar nada.

- [ ] **Step 1: Agregar los controles en `index.html`**

Dentro de `#controls`: lista editable de afinación, botones `+ cuerda` / `- cuerda`, input numérico de trastes y un botón `Aplicar`.

- [ ] **Step 2: Implementar `renderControls()` y `applyConfig()` en `src/app.js`**

`applyConfig` construye un objeto config candidato desde los inputs, lo pasa por `validateConfig`, y solo si `ok` reemplaza `state.config` y re-renderiza.

- [ ] **Step 3: Verificar a mano en el navegador**

- Cambiar trastes a 12 → el mástil se redibuja con 12 columnas.
- Poner un nombre inválido (`H`) en una cuerda y aplicar → aparece un error y el mástil no cambia.
- Agregar una cuerda y agregar su nota → aparece una fila nueva en el mástil.
- Poner trastes `0` y aplicar → error, sin cambios.

- [ ] **Step 4: Commit**

```bash
git add index.html styles.css src/app.js
git commit -m "feat(web): editor de afinacion, cuerdas y trastes"
```

---

### Task 8: Exportar / importar configuración

**Files:**
- Modify: `index.html`
- Modify: `src/app.js`
- Test: manual en navegador

**Interfaces:**
- Consumes: `window.ScalesCore.serializeConfig`, `parseConfig` (Tarea 4); `state`, `applyConfig` (Tareas 5, 7).
- Produces: `exportConfig()`, `importConfig(file)`.

**Comportamiento:**
- Botón **Exportar**: `serializeConfig(state.config)` → descarga un archivo `escalas-config.json` (vía `Blob` + `URL.createObjectURL`, funciona con `file://`).
- Botón **Importar**: abre `<input type="file" accept=".json">`; lee el texto con `FileReader` y lo pasa por `parseConfig`; si `ok`, aplica con `applyConfig`; si no, muestra los errores sin romper.

- [ ] **Step 1: Agregar los botones y el input de archivo en `index.html`**

- [ ] **Step 2: Implementar `exportConfig()` e `importConfig(file)` en `src/app.js`**

- [ ] **Step 3: Verificar a mano en el navegador**

- Configurar (p. ej.) trastes 20 y una cuerda extra; **Exportar** → se descarga `escalas-config.json`; abrirlo y ver que el JSON tiene `version`, `tuning`, `frets`.
- Recargar la página (vuelve a default); **Importar** el archivo → la config vuelve a la exportada.
- Importar un archivo con texto basura (p. ej. guardar un `.json` con `{no soy json`) → aparece un mensaje de error y la página sigue funcionando.

- [ ] **Step 4: Commit**

```bash
git add index.html src/app.js
git commit -m "feat(web): exportar e importar configuracion en JSON"
```

---

## Self-Review

**Cobertura del spec:**
- Página estática `file://`, sin dependencias → Tareas 5–8 (scripts clásicos, sin CDN).
- Mástil horizontal estilo tablatura, aguda arriba → Tareas 4 (`renderOrder`) y 5.
- Nombres visibles siempre, resaltado por clase de altura, toggle → Tarea 5.
- Selección como conjunto de clases de altura (sin repetir) → Tareas 2 y 5.
- Resultados con paridad a Go (incluye el desempate por porcentaje truncado) → Tarea 2.
- Panel de modos aparte, 7 modos marcando el padre, deriva del conjunto diatónico → Tarea 3 y 6.
- Afinación / cuerdas / trastes configurables → Tarea 7.
- Exportar/importar `.json` → Tareas 4 y 8.
- Catálogo de escalas editable en el código → Tarea 1 (`SCALES`).

**Consistencia de tipos/nombres:** `findScales` devuelve `{root,name,notes,matched,total,coincidencePercent,similarity,missing}` y la Tarea 6 los consume con esos nombres. `modesForScale` devuelve `{tonic,name,isParent}` y la Tarea 6 usa `isParent`. `renderOrder` devuelve `{note,tuningIndex}` y la Tarea 5 lo usa. `validateConfig`/`parseConfig` devuelven `{ok,config,errors}` y las Tareas 7 y 8 los consumen igual.

**Review Focus cubierto:** (1) malformado/faltantes → Tareas 4 y 8; (2) afinación inválida → Tarea 4; (3) trastes fuera de rango → Tarea 4; (4) selección vacía / 12 notas → Tarea 2; (5) repetidas y empates → Tarea 2.

**Proporción:** el plan describe decisiones e interfaces; los cuerpos de código aparecen solo donde la firma y los tests no los determinan (envoltorio UMD, `generateScale`, algoritmo de modos).
