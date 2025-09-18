/**
 * @file Entry point that wires together state, UI and animation modules.
 */

import {
  loadStateFromCookie,
  queueSaveStateToCookie,
  applyPreset,
  getActiveEntries
} from './state.js';
import { createWheel } from './wheel.js';
import { WheelAnimationController } from './animation.js';
import { CharacterListUI } from './ui.js';

/**
 * DOMクエリの簡易ヘルパー。
 * @template {Element} T
 * @param {string} selector CSSセレクタ。
 * @param {ParentNode} [parent=document] 親要素。
 * @returns {T}
 */
function $(selector, parent = document) {
  const el = parent.querySelector(selector);
  if (!el) {
    throw new Error(`Element not found for selector: ${selector}`);
  }
  return /** @type {T} */ (el);
}

/** 初期化処理 */
function init() {
  const refs = {
    checks: /** @type {HTMLElement} */ ($('#checks')),
    allOn: /** @type {HTMLButtonElement} */ ($('#allOn')),
    allOff: /** @type {HTMLButtonElement} */ ($('#allOff')),
    invert: /** @type {HTMLButtonElement} */ ($('#invert')),
    add: /** @type {HTMLButtonElement} */ ($('#add')),
    newName: /** @type {HTMLInputElement} */ ($('#newName')),
    newWeight: /** @type {HTMLInputElement} */ ($('#newWeight')),
    start: /** @type {HTMLButtonElement} */ ($('#start')),
    stop: /** @type {HTMLButtonElement} */ ($('#stop')),
    wheel: /** @type {HTMLCanvasElement} */ ($('#wheel')),
    current: /** @type {HTMLElement} */ ($('#current')),
    presets: /** @type {HTMLElement} */ ($('#presets')),
    favorites: /** @type {HTMLElement} */ ($('#favorites')),
    maxTime: /** @type {HTMLInputElement} */ ($('#maxTime')),
    decelTime: /** @type {HTMLInputElement} */ ($('#decelTime'))
  };

  const wheel = createWheel(refs.wheel, refs.current);
  /** @type {CharacterListUI | undefined} */
  let ui;
  const animation = new WheelAnimationController(wheel, {
    onStateChange: (running, info) => {
      if (ui) {
        ui.updateStartButton();
        ui.setStopButtonEnabled(running && info.stopEnabled);
      }
    },
    onFinalize: (winner) => {
      if (ui) {
        ui.showWinner(winner);
        ui.setStopButtonEnabled(false);
      }
    }
  });

  ui = new CharacterListUI(
    {
      checks: refs.checks,
      allOn: refs.allOn,
      allOff: refs.allOff,
      invert: refs.invert,
      add: refs.add,
      newName: refs.newName,
      newWeight: refs.newWeight,
      start: refs.start,
      stop: refs.stop,
      current: refs.current,
      presets: refs.presets,
      favorites: refs.favorites
    },
    { wheel, animation }
  );
  ui.init();
  ui.setStopButtonEnabled(false);
  ui.refreshFavoriteButtons();

  const startHandler = (event) => {
    event.preventDefault();
    if (!wheel.hasSegments) {
      wheel.rebuild(getActiveEntries());
    }
    if (!wheel.hasSegments) {
      ui.updateStartButton();
      return;
    }
    const result = animation.start(refs.maxTime.value, refs.decelTime.value);
    if (result) {
      refs.maxTime.value = result.total.toFixed(1);
      refs.decelTime.value = result.decel.toFixed(1);
    }
  };
  refs.start.addEventListener('click', startHandler);
  refs.start.addEventListener('pointerdown', startHandler, { passive: false });
  refs.start.addEventListener('touchstart', startHandler, { passive: false });

  refs.stop.addEventListener('click', () => {
    animation.requestDecel(refs.decelTime.value);
  });

  ui.bindPresetHandler((value) => {
    if (applyPreset(value)) {
      ui.renderChecks();
      wheel.rebuild(getActiveEntries());
      ui.updateStartButton();
      queueSaveStateToCookie();
    }
  });

  const { loaded, matchedPreset } = loadStateFromCookie();
  if (loaded) {
    ui.renderChecks();
    wheel.rebuild(getActiveEntries());
    ui.updateStartButton();
    if (matchedPreset) {
      ui.selectPresetRadio(matchedPreset);
    }
  } else {
    const defaultPreset = 'オラタン';
    ui.selectPresetRadio(defaultPreset);
    if (applyPreset(defaultPreset)) {
      ui.renderChecks();
      wheel.rebuild(getActiveEntries());
      ui.updateStartButton();
    }
  }

  ui.refreshFavoriteButtons();
  queueSaveStateToCookie();
  window.requestAnimationFrame(() => wheel.resize());
}

document.addEventListener('DOMContentLoaded', init, { once: true });

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('./sw.js')
      .then((registration) => {
        console.info('Service Worker registration succeeded', registration);
      })
      .catch((err) => {
        console.error('SW registration failed', err);
        const reasonParts = [];
        if (err && err.name) reasonParts.push(err.name);
        if (err && err.message) reasonParts.push(err.message);
        const reason = reasonParts.length ? reasonParts.join(': ') : String(err);
        alert(`Service Worker の登録に失敗しました。\n理由: ${reason}`);
      });
  });
}
