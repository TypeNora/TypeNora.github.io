/**
 * @file Application state management and cookie persistence helpers.
 * Provides shared state objects and mutation utilities that can be consumed
 * by the UI and animation layers without relying on global variables.
 */

/** @type {Record<string, string[]>} */
export const PRESETS = {
  OMG: ['テムジン','バイパ－Ⅱ','ドルカス','ベルグドル','バルバスバウ','アファームド','フェイ','ライデン'],
  オラタン: ['ライデン','シュタイン','グリス','テムジン','テンパチ','バル','エンジェ','アジム','スぺ','コマンダー','バトラー','ストライカー','サイファー','フェイ','ドル'],
  フォース: ['TEMJIN系列','RAIDEN系列','VOX系列','BAL系列','APHARMD J系列','APHARMD T系列','MYZR系列','SPECINEFF系列','景清系列','FEI-YEN系列','ANGELAN系列','GUARAYAKHA'],
  禁書VO: ['テムジン','バルルルーン','ライデン','スペシネフ','フェイ・イェン','エンジェラン','グリスボック','アファームドS','アファームドB','アファームドC','ドルドレイ','サイファー','バルバドス','ブルーストーカー']
};

/** アプリ内の共有状態 */
export const state = {
  /** @type {string[]} */
  names: [],
  /** @type {Record<string, boolean>} */
  on: {},
  /** @type {Record<string, number>} */
  weight: {}
};

const COOKIE_KEY = 'vrState';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1年
let cookieSaveTimer = 0;

/**
 * 文字列や数値から重みを正規化して返す。
 * @param {number|string} value 入力値。
 * @returns {number} 0.1〜10の範囲に収めた数値。未入力時は1。
 */
export function normalizeWeightValue(value) {
  let num = typeof value === 'number' ? value : parseFloat(String(value));
  if (Number.isNaN(num)) num = 1;
  if (num < 0.1) num = 0.1;
  if (num > 10) num = 10;
  return num;
}

/**
 * キャラクターを新規追加する。
 * @param {string} name キャラクター名。
 * @param {number|string} [weight=1] 重み。
 * @returns {boolean} 追加できた場合は true。
 */
export function addCharacter(name, weight = 1) {
  const trimmed = (name ?? '').trim();
  if (!trimmed) return false;
  const normalized = normalizeWeightValue(weight);
  state.names.push(trimmed);
  state.on[trimmed] = true;
  state.weight[trimmed] = normalized;
  return true;
}

/**
 * 既存キャラクターの重みを更新する。
 * @param {string} name キャラクター名。
 * @param {number|string} value 入力値。
 * @returns {number} 設定後の重み。
 */
export function updateWeight(name, value) {
  const normalized = normalizeWeightValue(value);
  if (Object.prototype.hasOwnProperty.call(state.weight, name)) {
    state.weight[name] = normalized;
  }
  return normalized;
}

/**
 * 既存キャラクターのON/OFF状態を設定する。
 * @param {string} name キャラクター名。
 * @param {boolean} active trueで有効化。
 */
export function setActive(name, active) {
  if (state.names.includes(name)) {
    state.on[name] = !!active;
  }
}

/**
 * すべてのキャラクターのON/OFFを一括変更する。
 * @param {(prev: boolean, name: string) => boolean} mapper 現在の状態から次の状態を返す関数。
 * @returns {boolean} 1件以上変化があった場合は true。
 */
export function updateAllActive(mapper) {
  let changed = false;
  for (const name of state.names) {
    const prev = !!state.on[name];
    const next = !!mapper(prev, name);
    if (prev !== next) {
      state.on[name] = next;
      changed = true;
    }
  }
  return changed;
}

/**
 * キャラクター名を変更する。
 * @param {string} oldName 変更前の名称。
 * @param {string} newName 変更後の名称。
 * @returns {boolean} 変更に成功した場合は true。
 */
export function renameCharacter(oldName, newName) {
  const trimmed = (newName ?? '').trim();
  if (!trimmed || trimmed === oldName) {
    return false;
  }
  const index = state.names.indexOf(oldName);
  if (index === -1) {
    return false;
  }
  const active = !!state.on[oldName];
  const weight = normalizeWeightValue(state.weight[oldName]);
  state.names[index] = trimmed;
  delete state.on[oldName];
  delete state.weight[oldName];
  state.on[trimmed] = active;
  state.weight[trimmed] = weight;
  return true;
}

/**
 * キャラクターを削除する。
 * @param {string} name 削除対象の名称。
 * @returns {boolean} 削除が行われた場合は true。
 */
export function removeCharacter(name) {
  const index = state.names.indexOf(name);
  if (index === -1) {
    return false;
  }
  state.names.splice(index, 1);
  delete state.on[name];
  delete state.weight[name];
  return true;
}

/**
 * 現在有効なキャラクターと重みの一覧を取得する。
 * @returns {{name: string, weight: number}[]} 描画に利用する配列。
 */
export function getActiveEntries() {
  const entries = [];
  for (const name of state.names) {
    if (state.on[name]) {
      entries.push({ name, weight: normalizeWeightValue(state.weight[name]) });
    }
  }
  return entries;
}

/**
 * プリセットキーを指定して状態を置き換える。
 * @param {string} key プリセット名。
 * @returns {boolean} 正常に適用された場合は true。
 */
export function applyPreset(key) {
  const list = PRESETS[key];
  if (!Array.isArray(list)) {
    return false;
  }
  state.names = list.slice();
  state.on = Object.fromEntries(state.names.map((name) => [name, true]));
  state.weight = Object.fromEntries(state.names.map((name) => [name, 1]));
  return true;
}

/**
 * 現在の状態がどのプリセットと一致するかを返す。
 * @returns {string|null} 一致するプリセットキー。なければ null。
 */
export function findMatchingPresetKey() {
  for (const [key, list] of Object.entries(PRESETS)) {
    if (list.length !== state.names.length) {
      continue;
    }
    let matched = true;
    for (let i = 0; i < list.length; i += 1) {
      if (list[i] !== state.names[i]) {
        matched = false;
        break;
      }
    }
    if (!matched) {
      continue;
    }
    for (const name of list) {
      if (!state.on[name]) {
        matched = false;
        break;
      }
      const weight = normalizeWeightValue(state.weight[name]);
      if (weight !== 1) {
        matched = false;
        break;
      }
    }
    if (matched) {
      return key;
    }
  }
  return null;
}

/**
 * 状態をCookieへ即時保存する。
 */
export function saveStateToCookie() {
  try {
    const data = {
      names: state.names.slice(),
      on: Object.fromEntries(state.names.map((name) => [name, !!state.on[name]])),
      weight: Object.fromEntries(state.names.map((name) => [name, normalizeWeightValue(state.weight[name])]))
    };
    const json = JSON.stringify(data);
    document.cookie = `${COOKIE_KEY}=${encodeURIComponent(json)}; Max-Age=${COOKIE_MAX_AGE}; Path=/; SameSite=Lax`;
  } catch (err) {
    console.error('状態の保存に失敗しました', err);
  }
}

/**
 * 直近の操作後にCookie保存をスケジュールする。
 */
export function queueSaveStateToCookie() {
  clearTimeout(cookieSaveTimer);
  cookieSaveTimer = window.setTimeout(() => {
    cookieSaveTimer = 0;
    saveStateToCookie();
  }, 0);
}

/**
 * Cookieから状態を読み込み、成功時はプリセット一致情報を返す。
 * @returns {{loaded: true, matchedPreset: string|null} | {loaded: false, matchedPreset: null}}
 */
export function loadStateFromCookie() {
  try {
    const cookies = document.cookie ? document.cookie.split(';') : [];
    const prefix = `${COOKIE_KEY}=`;
    const entry = cookies.map((c) => c.trim()).find((c) => c.startsWith(prefix));
    if (!entry) {
      return { loaded: false, matchedPreset: null };
    }
    const json = decodeURIComponent(entry.slice(prefix.length));
    if (!json) {
      return { loaded: false, matchedPreset: null };
    }
    const parsed = JSON.parse(json);
    if (!parsed || !Array.isArray(parsed.names)) {
      return { loaded: false, matchedPreset: null };
    }

    const names = [];
    for (const raw of parsed.names) {
      if (typeof raw !== 'string') {
        continue;
      }
      const name = raw.trim();
      if (!name) {
        continue;
      }
      names.push(name);
    }
    const on = {};
    const weight = {};
    const srcOn = parsed.on && typeof parsed.on === 'object' ? parsed.on : {};
    const srcWeight = parsed.weight && typeof parsed.weight === 'object' ? parsed.weight : {};
    for (const name of names) {
      on[name] = Object.prototype.hasOwnProperty.call(srcOn, name) ? !!srcOn[name] : true;
      weight[name] = normalizeWeightValue(srcWeight[name]);
    }
    state.names = names;
    state.on = on;
    state.weight = weight;
    return { loaded: true, matchedPreset: findMatchingPresetKey() };
  } catch (err) {
    console.error('状態の読み込みに失敗しました', err);
    return { loaded: false, matchedPreset: null };
  }
}
