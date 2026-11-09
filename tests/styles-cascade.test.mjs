import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {loadCasualCss} from './helpers/styles.mjs';

const CHAPTERS = [
  './styles/shell.css',
  './styles/hud.css',
  './styles/meter.css',
  './styles/board.css',
  './styles/honey-win.css',
  './styles/currency.css',
  './styles/bottles.css',
  './styles/pour.css',
  './styles/direction.css',
  './styles/onboarding.css',
  './styles/chrome.css'
];

test('minimal.css imports style chapters in cascade order', async () => {
  const css = await readFile(new URL('../src/casual/minimal.css', import.meta.url), 'utf8');
  const imports = [...css.matchAll(/@import\s+'([^']+)';/g)].map(match => match[1]);
  assert.deepEqual(imports, CHAPTERS);
});

test('inlined chapters keep later rules after the board they override', async () => {
  const css = await loadCasualCss();
  const hud = css.indexOf('.sgv-hud{');
  const meter = css.indexOf('.sgv-meter-scale{');
  const win = css.indexOf('.sgv-honey-win{');
  const goal = css.indexOf('.sgv-goal-progress{');
  const pair = css.indexOf('.sgv-bottle-pair{');
  const factor = css.indexOf('Factor pill info');
  assert.ok(hud > 0 && hud < meter && meter < win && win < goal && goal < pair && pair < factor);
  assert.match(css, /\.sgv-honey-win \.sgv-honey-cta-wrap\{/);
});
