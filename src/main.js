import {
  CATEGORY_DEFINITIONS,
  X_MATCH_RANGE_LABELS,
  appendWeaponHistory,
  applyDrawnWeaponExclusion,
  updateWeaponUsageState,
  updateWeaponsUsageState,
  buildWeapons,
  drawAssignments,
  drawSingleWeapon,
  filterWeapons,
  generateShareText,
  createResultSnapshot,
  summarizeRule,
  validatePlayers,
} from './roulette.js';

const weapons = buildWeapons();
const state = {
  selectedTypes: new Set(CATEGORY_DEFINITIONS.map((category) => category.type)),
  excludedWeaponIds: new Set(),
  drawnWeaponIds: new Set(),
  drawMode: 'multi',
  singleHistory: [],
  latestAssignments: [],
  latestRuleSummary: '',
  latestResultSnapshot: null,
  openWeaponTypes: new Set(),
  focusedWeaponId: null,
  isSpinning: false,
  presentationMode: false,
  spinTimers: [],
  teamMode: {
    enabled: false,
  },
  teamAssignments: {},
  rangeRule: {
    enabled: false,
    counts: createDefaultRangeCounts(4),
    minimums: createDefaultRangeMinimums(),
    thresholdFixed: null,
  },
};

const els = {
  playersInput: document.querySelector('#playersInput'),
  typeFilters: document.querySelector('#typeFilters'),
  noDuplicateWeapons: document.querySelector('#noDuplicateWeapons'),
  includeOrderWeapons: document.querySelector('#includeOrderWeapons'),
  autoMarkDrawnWeapon: document.querySelector('#autoMarkDrawnWeapon'),
  soundEffectsEnabled: document.querySelector('#soundEffectsEnabled'),
  soundVolume: document.querySelector('#soundVolume'),
  candidateCounter: document.querySelector('#candidateCounter'),
  ruleSummary: document.querySelector('#ruleSummary'),
  drawBtn: document.querySelector('#drawBtn'),
  backToSettingsBtn: document.querySelector('#backToSettingsBtn'),
  copyBtn: document.querySelector('#copyBtn'),
  results: document.querySelector('#results'),
  singleHistory: document.querySelector('#singleHistory'),
  errorBox: document.querySelector('#errorBox'),
  copyToast: document.querySelector('#copyToast'),
  rouletteDisplay: document.querySelector('#rouletteDisplay'),
  weaponList: document.querySelector('#weaponList'),
  compactWeaponList: document.querySelector('#compactWeaponList'),
  enableAllWeaponsBtn: document.querySelector('#enableAllWeaponsBtn'),
  disableAllWeaponsBtn: document.querySelector('#disableAllWeaponsBtn'),
  collapseAllWeaponGroupsBtn: document.querySelector('#collapseAllWeaponGroupsBtn'),
  selectAllTypesBtn: document.querySelector('#selectAllTypesBtn'),
  clearTypesBtn: document.querySelector('#clearTypesBtn'),
  clearPlayersBtn: document.querySelector('#clearPlayersBtn'),
  modeInputs: [...document.querySelectorAll('input[name="drawMode"]')],
  openRuleDrawerBtn: document.querySelector('#openRuleDrawerBtn'),
  closeRuleDrawerBtn: document.querySelector('#closeRuleDrawerBtn'),
  ruleDrawer: document.querySelector('#ruleDrawer'),
  ruleDrawerBackdrop: document.querySelector('#ruleDrawerBackdrop'),
  advancedRuleSummary: document.querySelector('#advancedRuleSummary'),
  teamModeEnabled: document.querySelector('#teamModeEnabled'),
  resetTeamSplitBtn: document.querySelector('#resetTeamSplitBtn'),
  teamPreview: document.querySelector('#teamPreview'),
  rangeRuleEnabled: document.querySelector('#rangeRuleEnabled'),
  rangePresetActions: document.querySelector('#rangePresetActions'),
  rangeBalanceTable: document.querySelector('#rangeBalanceTable'),
  rangeBalanceTotal: document.querySelector('#rangeBalanceTotal'),
  resetAdvancedRulesBtn: document.querySelector('#resetAdvancedRulesBtn'),
  applyAdvancedRulesBtn: document.querySelector('#applyAdvancedRulesBtn'),
};

const samples = {
  1: ['プレイヤー1'],
  4: ['プレイヤー1', 'プレイヤー2', 'プレイヤー3', 'プレイヤー4'],
  8: ['プレイヤー1', 'プレイヤー2', 'プレイヤー3', 'プレイヤー4', 'プレイヤー5', 'プレイヤー6', 'プレイヤー7', 'プレイヤー8'],
};

const soundState = {
  context: null,
  masterGain: null,
  rouletteAudio: null,
  resultAudio: null,
  rouletteTimerId: null,
  rouletteStep: 0,
  runId: 0,
};

let draggedTeamPlayer = null;

const customSoundPaths = {
  roulette: 'assets/sounds/roulette-loop.mp3',
  result: 'assets/sounds/result-se.mp3',
};

const rangeShortLabels = {
  短射程: '短',
  短中射程: '短中',
  中射程: '中',
  中長射程: '中長',
  長射程: '長',
  超長射程: '超長',
};

const MAX_RANGE_COUNT = 4;

function soundVolume() {
  return Math.max(0, Math.min(1, Number(els.soundVolume?.value ?? 55) / 100));
}

function soundEnabled() {
  return Boolean(els.soundEffectsEnabled?.checked) && soundVolume() > 0;
}

function ensureAudioContext() {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext || !soundEnabled()) return null;
  if (!soundState.context) {
    soundState.context = new AudioContext();
    soundState.masterGain = soundState.context.createGain();
    soundState.masterGain.connect(soundState.context.destination);
  }
  soundState.masterGain.gain.setTargetAtTime(soundVolume(), soundState.context.currentTime, 0.02);
  if (soundState.context.state === 'suspended') soundState.context.resume();
  return soundState.context;
}

function playTone({ frequency = 880, duration = 0.06, type = 'square', gain = 0.18, detune = 0, startDelay = 0 }) {
  const context = ensureAudioContext();
  if (!context || !soundState.masterGain) return;
  const startAt = context.currentTime + startDelay;
  const oscillator = context.createOscillator();
  const envelope = context.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, startAt);
  oscillator.detune.setValueAtTime(detune, startAt);
  envelope.gain.setValueAtTime(0.0001, startAt);
  envelope.gain.exponentialRampToValueAtTime(Math.max(0.0001, gain), startAt + 0.006);
  envelope.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
  oscillator.connect(envelope);
  envelope.connect(soundState.masterGain);
  oscillator.start(startAt);
  oscillator.stop(startAt + duration + 0.02);
}

function createCustomAudio(kind, { loop = false } = {}) {
  const audio = new Audio(customSoundPaths[kind]);
  audio.preload = 'auto';
  audio.loop = loop;
  audio.volume = soundVolume();
  return audio;
}

function syncCustomAudioVolume() {
  const volume = soundVolume();
  if (soundState.rouletteAudio) soundState.rouletteAudio.volume = volume;
  if (soundState.resultAudio) soundState.resultAudio.volume = volume;
}

function isCurrentSoundRun(runId) {
  return runId === soundState.runId;
}

function startSyntheticRouletteTicks(runId) {
  if (!isCurrentSoundRun(runId) || !state.isSpinning || !soundEnabled()) return;
  soundState.rouletteStep = 0;
  playRouletteTick(runId);
  soundState.rouletteTimerId = window.setInterval(() => playRouletteTick(runId), 86);
}

function tryPlayCustomRouletteSound(runId) {
  if (!soundEnabled()) return false;
  if (!soundState.rouletteAudio) soundState.rouletteAudio = createCustomAudio('roulette', { loop: true });
  const audio = soundState.rouletteAudio;
  syncCustomAudioVolume();
  audio.currentTime = 0;
  const playPromise = audio.play();
  let settled = false;
  const lateStartGuard = window.setTimeout(() => {
    if (settled || !isCurrentSoundRun(runId)) return;
    settled = true;
    audio.pause();
    audio.currentTime = 0;
    if (state.isSpinning && soundEnabled() && !soundState.rouletteTimerId) {
      const fallbackRunId = ++soundState.runId;
      startSyntheticRouletteTicks(fallbackRunId);
    }
  }, 700);
  if (playPromise?.then) {
    playPromise.then(() => {
      if (settled) {
        audio.pause();
        audio.currentTime = 0;
        return;
      }
      settled = true;
      window.clearTimeout(lateStartGuard);
      if (!isCurrentSoundRun(runId) || !state.isSpinning || !soundEnabled()) {
        audio.pause();
        audio.currentTime = 0;
      }
    }).catch(() => {
      if (settled) {
        audio.pause();
        audio.currentTime = 0;
        return;
      }
      settled = true;
      window.clearTimeout(lateStartGuard);
      if (isCurrentSoundRun(runId) && state.isSpinning && !soundState.rouletteTimerId) startSyntheticRouletteTicks(runId);
    });
  }
  return true;
}

function playCustomResultSound(runId) {
  if (!soundEnabled()) return false;
  if (!soundState.resultAudio) soundState.resultAudio = createCustomAudio('result');
  const audio = soundState.resultAudio;
  syncCustomAudioVolume();
  audio.currentTime = 0;
  const playPromise = audio.play();
  let settled = false;
  const lateStartGuard = window.setTimeout(() => {
    if (settled || !isCurrentSoundRun(runId)) return;
    settled = true;
    audio.pause();
    audio.currentTime = 0;
    soundState.runId += 1;
    if (soundEnabled()) playSyntheticResultSound();
  }, 700);
  if (playPromise?.then) {
    playPromise.then(() => {
      if (settled) {
        audio.pause();
        audio.currentTime = 0;
        return;
      }
      settled = true;
      window.clearTimeout(lateStartGuard);
      if (!isCurrentSoundRun(runId) || !soundEnabled()) {
        audio.pause();
        audio.currentTime = 0;
      }
    }).catch(() => {
      if (settled) {
        audio.pause();
        audio.currentTime = 0;
        return;
      }
      settled = true;
      window.clearTimeout(lateStartGuard);
      if (isCurrentSoundRun(runId) && soundEnabled()) playSyntheticResultSound();
    });
  }
  return true;
}

function playRouletteTick(runId = soundState.runId) {
  if (!isCurrentSoundRun(runId) || !state.isSpinning || !soundEnabled()) return;
  const sequence = [740, 820, 920, 1040, 980, 860];
  const frequency = sequence[soundState.rouletteStep % sequence.length];
  soundState.rouletteStep += 1;
  playTone({ frequency, duration: 0.035, type: 'square', gain: 0.09 });
  playTone({ frequency: frequency * 1.48, duration: 0.018, type: 'triangle', gain: 0.045, startDelay: 0.012 });
}

function startRouletteSound() {
  stopAllSounds();
  if (!soundEnabled()) return;
  const runId = ++soundState.runId;
  if (!tryPlayCustomRouletteSound(runId)) startSyntheticRouletteTicks(runId);
}

function stopRouletteSound({ invalidate = true } = {}) {
  if (invalidate) soundState.runId += 1;
  if (soundState.rouletteTimerId) {
    window.clearInterval(soundState.rouletteTimerId);
    soundState.rouletteTimerId = null;
  }
  if (soundState.rouletteAudio) {
    soundState.rouletteAudio.pause();
    soundState.rouletteAudio.currentTime = 0;
  }
}

function stopResultSound({ invalidate = true } = {}) {
  if (invalidate) soundState.runId += 1;
  if (soundState.resultAudio) {
    soundState.resultAudio.pause();
    soundState.resultAudio.currentTime = 0;
  }
}

function stopAllSounds() {
  soundState.runId += 1;
  stopRouletteSound({ invalidate: false });
  stopResultSound({ invalidate: false });
}

function playSyntheticResultSound() {
  if (!soundEnabled()) return;
  [0, 0.055, 0.11].forEach((delay, index) => {
    playTone({ frequency: [660, 990, 1320][index], duration: 0.12, type: 'triangle', gain: 0.15, startDelay: delay });
  });
  playTone({ frequency: 1980, duration: 0.18, type: 'sine', gain: 0.11, startDelay: 0.16 });
}

function playResultSound() {
  if (!soundEnabled()) return;
  stopRouletteSound();
  stopResultSound({ invalidate: false });
  const runId = ++soundState.runId;
  if (!playCustomResultSound(runId)) playSyntheticResultSound();
}

function preloadWeaponImages() {
  for (const weapon of weapons) {
    const image = new Image();
    image.src = weapon.imagePath;
  }
}

function currentPlayers() {
  return validatePlayers(els.playersInput.value).players;
}

function createDefaultRangeCounts() {
  return Object.fromEntries(X_MATCH_RANGE_LABELS.map((label) => [label, null]));
}

function createDefaultRangeMinimums() {
  return Object.fromEntries(X_MATCH_RANGE_LABELS.map((label) => [label, 0]));
}

function ensureRangeCountsShape() {
  state.rangeRule.counts = {
    ...Object.fromEntries(X_MATCH_RANGE_LABELS.map((label) => [label, null])),
    ...(state.rangeRule.counts ?? {}),
  };
  state.rangeRule.minimums = {
    ...Object.fromEntries(X_MATCH_RANGE_LABELS.map((label) => [label, 0])),
    ...(state.rangeRule.minimums ?? {}),
  };
  if (state.rangeRule.thresholdFixed && state.rangeRule.thresholdFixed.thresholdLabel !== '長射程') {
    state.rangeRule.thresholdFixed = null;
  }
}

function resetTeamAssignments(players = currentPlayers()) {
  const splitAt = Math.ceil(players.length / 2);
  state.teamAssignments = Object.fromEntries(players.map((player, index) => [player, index < splitAt ? 'A' : 'B']));
}

function reconcileTeamAssignments(players = currentPlayers()) {
  const validPlayers = new Set(players);
  Object.keys(state.teamAssignments).forEach((player) => {
    if (!validPlayers.has(player)) delete state.teamAssignments[player];
  });
  const splitAt = Math.ceil(players.length / 2);
  players.forEach((player, index) => {
    if (!['A', 'B'].includes(state.teamAssignments[player])) {
      state.teamAssignments[player] = index < splitAt ? 'A' : 'B';
    }
  });
}

function effectiveTeamMode(players = currentPlayers()) {
  return {
    enabled: state.teamMode.enabled && players.length >= 2,
  };
}

function buildTeamPreviewGroups(players = currentPlayers()) {
  if (!state.teamMode.enabled || players.length < 2) {
    return [{ id: 'all', name: '全体', players }];
  }
  reconcileTeamAssignments(players);
  return [
    { id: 'A', name: 'Aチーム', players: players.filter((player) => state.teamAssignments[player] !== 'B') },
    { id: 'B', name: 'Bチーム', players: players.filter((player) => state.teamAssignments[player] === 'B') },
  ];
}

function teamModeForRule(players = currentPlayers()) {
  const teamMode = effectiveTeamMode(players);
  if (!teamMode.enabled) return teamMode;
  const groups = buildTeamPreviewGroups(players).map((team) => ({
    id: team.id,
    name: team.name,
    playerIndexes: team.players.map((player) => players.indexOf(player)),
  }));
  return { enabled: true, groups };
}

function rangeCountTotal() {
  ensureRangeCountsShape();
  return X_MATCH_RANGE_LABELS.reduce((total, label) => {
    const count = state.rangeRule.counts[label];
    return Number.isInteger(count) ? total + count : total;
  }, 0);
}

function rangeAutoCount() {
  ensureRangeCountsShape();
  return X_MATCH_RANGE_LABELS.filter((label) => state.rangeRule.counts[label] === null).length;
}

function thresholdFixedRule() {
  ensureRangeCountsShape();
  return state.rangeRule.thresholdFixed?.thresholdLabel === '長射程'
    ? state.rangeRule.thresholdFixed
    : null;
}

function isThresholdFixedLabel(label) {
  const fixedRule = thresholdFixedRule();
  return Boolean(fixedRule) && ['長射程', '超長射程'].includes(label);
}

function rangeTargetInfo(players = currentPlayers()) {
  if (!players.length) return { target: 1, error: null };
  const teamMode = effectiveTeamMode(players);
  if (!teamMode.enabled) return { target: players.length, error: null };
  const groups = buildTeamPreviewGroups(players);
  const sizes = groups.map((team) => team.players.length);
  const expectedTeamSize = Math.min(MAX_RANGE_COUNT, Math.max(1, Math.ceil(players.length / 2)));
  if (sizes.some((size) => size === 0)) {
    return { target: expectedTeamSize, error: 'A/Bチームの両方に参加者を入れてください。' };
  }
  if (!sizes.every((size) => size === sizes[0])) {
    const evenSplitMessage = players.length === 8
      ? '射程表を使う場合はA/Bチームを4人ずつにしてください。'
      : '射程表を使う場合はA/Bチームの人数をそろえてください。';
    return { target: expectedTeamSize, error: evenSplitMessage };
  }
  return { target: Math.min(MAX_RANGE_COUNT, sizes[0]), error: null };
}

function rangeBalanceError(players = currentPlayers()) {
  if (!state.rangeRule.enabled) return null;
  const targetInfo = rangeTargetInfo(players);
  if (targetInfo.error) return targetInfo.error;
  ensureRangeCountsShape();
  const impossibleFixedLabel = X_MATCH_RANGE_LABELS.find((label) => (
    Number.isInteger(state.rangeRule.counts[label])
    && Number.isInteger(state.rangeRule.minimums[label])
    && state.rangeRule.minimums[label] > state.rangeRule.counts[label]
  ));
  if (impossibleFixedLabel) {
    return `${impossibleFixedLabel}の固定枠が上限を超えています。上限を増やすか、固定プリセットを解除してください。`;
  }
  const total = rangeCountTotal();
  if (rangeAutoCount() === 0 && total < targetInfo.target) {
    return `数値指定だけでは${targetInfo.target}人に届きません。どこかをおまかせにするか、上限を増やしてください。`;
  }
  return null;
}

function rangeBalanceSummary() {
  ensureRangeCountsShape();
  return X_MATCH_RANGE_LABELS
    .filter((label) => Number.isInteger(state.rangeRule.counts[label]))
    .map((label) => `${rangeShortLabels[label]}${state.rangeRule.counts[label]}以下`)
    .join(' / ') || 'すべておまかせ';
}

function rangeRequiredSummary() {
  ensureRangeCountsShape();
  const exactText = X_MATCH_RANGE_LABELS
    .filter((label) => Number.isInteger(state.rangeRule.minimums[label]) && state.rangeRule.minimums[label] > 0)
    .map((label) => `${rangeShortLabels[label]}${state.rangeRule.minimums[label]}枠固定`)
  const thresholdText = thresholdFixedRule() ? ['長or超長1枠固定'] : [];
  return [...thresholdText, ...exactText].join(' / ');
}

function currentAssignmentConstraints(players = currentPlayers()) {
  if (!state.rangeRule.enabled) return [];
  ensureRangeCountsShape();
  const scope = effectiveTeamMode(players).enabled ? 'eachTeam' : 'all';
  const maxConstraints = X_MATCH_RANGE_LABELS
    .filter((label) => Number.isInteger(state.rangeRule.counts[label]))
    .map((label) => ({
      kind: 'maxExactXMatchRangeLabel',
      scope,
      label,
      maxCount: Number(state.rangeRule.counts[label]),
    }));
  const minConstraints = X_MATCH_RANGE_LABELS
    .filter((label) => Number.isInteger(state.rangeRule.minimums[label]) && state.rangeRule.minimums[label] > 0)
    .map((label) => ({
      kind: 'minExactXMatchRangeLabel',
      scope,
      label,
      minCount: Number(state.rangeRule.minimums[label]),
    }));
  const fixedThreshold = thresholdFixedRule();
  const thresholdConstraints = fixedThreshold ? [
    {
      kind: 'maxAtOrAboveXMatchRangeLabel',
      scope,
      thresholdLabel: fixedThreshold.thresholdLabel,
      maxCount: fixedThreshold.count,
    },
    {
      kind: 'minAtOrAboveXMatchRangeLabel',
      scope,
      thresholdLabel: fixedThreshold.thresholdLabel,
      minCount: fixedThreshold.count,
    },
  ] : [];
  return [...maxConstraints, ...minConstraints, ...thresholdConstraints];
}

function currentRule() {
  const players = currentPlayers();
  return {
    enabledTypes: [...state.selectedTypes],
    excludedWeaponIds: [...state.excludedWeaponIds],
    noDuplicateWeapons: els.noDuplicateWeapons.checked,
    includeOrderWeapons: els.includeOrderWeapons.checked,
    teamMode: teamModeForRule(players),
    assignmentConstraints: currentAssignmentConstraints(players),
  };
}

function setError(message) {
  if (!message) {
    els.errorBox.hidden = true;
    els.errorBox.textContent = '';
    return;
  }
  els.errorBox.hidden = false;
  els.errorBox.textContent = message;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;',
  })[char]);
}

function orderBadge(weapon, label = 'ORDER') {
  return weapon.isOrder ? `<span class="order-badge" title="オーダー武器">${label}</span>` : '';
}

function orderTypeMarkup(weapon) {
  return `${escapeHtml(weapon.type)}${orderBadge(weapon)}`;
}

function applySingleRangeRule(candidateWeapons) {
  if (!state.rangeRule.enabled) return candidateWeapons;
  ensureRangeCountsShape();
  const blockedLabels = new Set(X_MATCH_RANGE_LABELS.filter((label) => state.rangeRule.counts[label] === 0));
  return candidateWeapons.filter((weapon) => !blockedLabels.has(weapon.xMatchRangeLabel));
}

function preflightAssignmentError(candidates, playerCheck, rule) {
  if (state.drawMode !== 'multi' || playerCheck.error || !rule.assignmentConstraints.length) return null;
  return drawAssignments(playerCheck.players, candidates, rule).error;
}

function advancedRuleSummaryText(players = currentPlayers()) {
  const teamMode = effectiveTeamMode(players);
  const targetInfo = rangeTargetInfo(players);
  const teamText = teamMode.enabled
    ? `チームON: ${buildTeamPreviewGroups(players).map((team) => `${team.name.replace('チーム', '')}${team.players.length}`).join(' / ')}`
    : 'チームなし';
  const requiredText = rangeRequiredSummary();
  const rangeText = state.rangeRule.enabled
    ? `${teamMode.enabled ? '各チーム' : '全体'}射程配分: ${rangeBalanceSummary()}${requiredText ? ` / ${requiredText}` : ''}（上限${rangeCountTotal()}/${targetInfo.target}・おまかせ${rangeAutoCount()}）`
    : '射程制限なし';
  return `${teamText} / ${rangeText}`;
}

function renderAdvancedRuleSummary() {
  if (!els.advancedRuleSummary) return;
  const players = currentPlayers();
  const canUseTeams = players.length >= 2;
  const suggested = players.length === 8 && !state.teamMode.enabled
    ? '<button class="ghost-btn small suggestion-chip" type="button" data-rule-preset="team-4v4">4 vs 4 にする</button>'
    : '';
  els.advancedRuleSummary.innerHTML = `
    <div>
      <b>${escapeHtml(advancedRuleSummaryText(players))}</b>
      <small>${canUseTeams ? 'チームは上から半分で初期化し、詳細画面でドラッグ移動できます。' : '1人のときは射程表だけ使えます。'}</small>
    </div>
    <div class="advanced-rule-actions">
      ${canUseTeams ? `<button class="ghost-btn small team-quick-toggle" type="button" id="teamModeQuickBtn">${state.teamMode.enabled ? 'チームOFF' : 'チームON'}</button>` : ''}
      ${suggested}
      <button class="ghost-btn small" type="button" id="openRuleDrawerBtnInline">詳細を編集</button>
    </div>
  `;
  els.advancedRuleSummary.querySelector('#openRuleDrawerBtnInline')?.addEventListener('click', openRuleDrawer);
  els.advancedRuleSummary.querySelector('#teamModeQuickBtn')?.addEventListener('click', () => {
    state.teamMode.enabled = !state.teamMode.enabled;
    if (state.teamMode.enabled) resetTeamAssignments(players);
    renderAdvancedRuleControls();
    updateSummary();
  });
  els.advancedRuleSummary.querySelector('[data-rule-preset="team-4v4"]')?.addEventListener('click', () => {
    state.teamMode.enabled = true;
    resetTeamAssignments(players);
    state.rangeRule.counts = createDefaultRangeCounts(4);
    state.rangeRule.minimums = createDefaultRangeMinimums();
    state.rangeRule.thresholdFixed = null;
    renderAdvancedRuleControls();
    updateSummary();
  });
}

function renderTeamPreview() {
  if (!els.teamPreview) return;
  const players = currentPlayers();
  const groups = buildTeamPreviewGroups(players);
  els.teamPreview.innerHTML = groups.map((team) => `
    <section class="team-preview-card" data-team-id="${team.id}" data-drop-team="${team.id}">
      <div class="team-preview-head">
        <strong>${escapeHtml(team.name)}</strong>
        <span>${team.players.length}人</span>
      </div>
      <div class="team-member-list" data-drop-team="${team.id}">
        ${team.players.length ? team.players.map((player, index) => `
          <div class="team-member-row" data-member-index="${index}" data-player="${escapeHtml(player)}" draggable="${state.teamMode.enabled && team.id !== 'all'}">
            <span class="drag-handle" aria-hidden="true"></span>
            <b>${escapeHtml(player)}</b>
            ${state.teamMode.enabled && team.id !== 'all'
              ? `<button class="team-move-btn" type="button" data-team-move-player="${escapeHtml(player)}" data-team-move-target="${team.id === 'A' ? 'B' : 'A'}">${team.id === 'A' ? 'Bへ' : 'Aへ'}</button>`
              : ''}
          </div>
        `).join('') : '<p class="empty-team">メンバーなし</p>'}
      </div>
    </section>
  `).join('');
}

function renderRangeControls() {
  ensureRangeCountsShape();
  const players = currentPlayers();
  const targetInfo = rangeTargetInfo(players);
  const targetTotal = Math.max(1, targetInfo.target);
  const countOptions = ['auto', ...Array.from({ length: MAX_RANGE_COUNT + 1 }, (_, index) => index)];
  const total = rangeCountTotal();
  const autoCount = rangeAutoCount();
  const balanceError = rangeBalanceError(players);
  const fixedRule = thresholdFixedRule();
  const fixedSummary = rangeRequiredSummary();
  const visibleCapTotal = total + (fixedRule?.count ?? 0);
  if (els.rangeBalanceTotal) {
    els.rangeBalanceTotal.classList.toggle('ok', state.rangeRule.enabled && !balanceError);
    els.rangeBalanceTotal.classList.toggle('warn', state.rangeRule.enabled && Boolean(balanceError));
    els.rangeBalanceTotal.innerHTML = `
      <b>${fixedRule ? '固定上限' : '数値上限'} ${visibleCapTotal} / 必要${targetTotal}人</b>
      <span>${state.rangeRule.enabled ? (balanceError ?? `${fixedSummary ? `固定: ${fixedSummary}。` : ''}おまかせ${autoCount}区分。未指定の射程は残り枠からランダムに入ります。`) : '射程制限OFFのため抽選には使われません。'}</span>
    `;
  }
  if (els.applyAdvancedRulesBtn && !state.isSpinning) {
    els.applyAdvancedRulesBtn.disabled = Boolean(balanceError);
  }
  if (!els.rangeBalanceTable) return;
  els.rangeBalanceTable.style.setProperty('--range-count-columns', countOptions.length);
  els.rangeBalanceTable.innerHTML = `
    <div class="range-balance-cell head label">射程区分</div>
    ${countOptions.map((count) => `<div class="range-balance-cell head">${count === 'auto' ? 'おまかせ' : count}</div>`).join('')}
    ${X_MATCH_RANGE_LABELS.map((label) => {
      const exactFixed = Number.isInteger(state.rangeRule.minimums[label]) && state.rangeRule.minimums[label] > 0;
      const thresholdFixed = isThresholdFixedLabel(label);
      return `
      <div class="range-balance-cell label ${exactFixed ? 'fixed-label' : ''} ${thresholdFixed ? 'threshold-fixed-label' : ''}">
        <strong>${escapeHtml(label)}</strong>
        <small>${rangeShortLabels[label]}</small>
        ${exactFixed ? '<em>FIX</em>' : ''}
        ${thresholdFixed ? '<em>OR FIX</em>' : ''}
      </div>
      ${countOptions.map((count) => {
        const selected = count === 'auto'
          ? state.rangeRule.counts[label] === null && !thresholdFixed
          : state.rangeRule.counts[label] === count;
        const exactFixedCell = exactFixed && count === state.rangeRule.minimums[label];
        const thresholdFixedCell = thresholdFixed && count === fixedRule?.count;
        return `
        <button
          class="range-count-cell ${count === 'auto' ? 'auto-cell' : ''} ${selected ? 'selected' : ''} ${exactFixedCell ? 'fixed-cell' : ''} ${thresholdFixedCell ? 'threshold-fixed-cell' : ''}"
          type="button"
          data-range-label="${escapeHtml(label)}"
          data-range-count="${count}"
          ${state.rangeRule.enabled ? '' : 'disabled'}
          aria-label="${escapeHtml(label)}を${count === 'auto' ? 'おまかせ' : `${count}人以下`}にする"
        >${thresholdFixedCell ? 'OR' : count === 'auto' ? '任' : count}</button>
      `;
      }).join('')}
    `;
    }).join('')}
  `;
}

function renderAdvancedRuleControls() {
  if (els.teamModeEnabled) els.teamModeEnabled.checked = state.teamMode.enabled;
  if (els.rangeRuleEnabled) els.rangeRuleEnabled.checked = state.rangeRule.enabled;
  renderTeamPreview();
  renderRangeControls();
  renderAdvancedRuleSummary();
}

function openRuleDrawer() {
  renderAdvancedRuleControls();
  if (els.ruleDrawerBackdrop) els.ruleDrawerBackdrop.hidden = false;
  if (els.ruleDrawer) {
    els.ruleDrawer.hidden = false;
    window.requestAnimationFrame(() => els.ruleDrawer.classList.add('open'));
  }
}

function closeRuleDrawer() {
  if (els.ruleDrawer) els.ruleDrawer.classList.remove('open');
  window.setTimeout(() => {
    if (els.ruleDrawer && !els.ruleDrawer.classList.contains('open')) els.ruleDrawer.hidden = true;
    if (els.ruleDrawerBackdrop) els.ruleDrawerBackdrop.hidden = true;
  }, 160);
}

function showCopyToast(message, tone = 'success') {
  if (!els.copyToast) return;
  els.copyToast.textContent = message;
  els.copyToast.dataset.tone = tone;
  els.copyToast.hidden = false;
  els.copyToast.classList.remove('show');
  window.requestAnimationFrame(() => els.copyToast.classList.add('show'));
  window.clearTimeout(showCopyToast.timerId);
  showCopyToast.timerId = window.setTimeout(() => {
    els.copyToast.classList.remove('show');
    window.setTimeout(() => { els.copyToast.hidden = true; }, 180);
  }, 1800);
}

async function writeClipboardText(text) {
  if (navigator.clipboard?.writeText && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return true;
  }
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.className = 'copy-fallback-source';
  document.body.appendChild(textarea);
  textarea.select();
  textarea.setSelectionRange(0, text.length);
  try {
    return document.execCommand('copy');
  } finally {
    textarea.remove();
  }
}

function weaponsByType(type) {
  return weapons.filter((weapon) => weapon.type === type);
}

function selectedCountByType(type) {
  return weaponsByType(type).filter((weapon) => !state.excludedWeaponIds.has(weapon.id)).length;
}

function setDrawMode(mode) {
  state.drawMode = mode;
  els.modeInputs.forEach((input) => { input.checked = input.value === mode; });
  els.noDuplicateWeapons.disabled = mode === 'single' || state.isSpinning;
  updateDrawButtonLabel();
  updateSummary();
}

function updateDrawButtonLabel() {
  if (state.isSpinning) {
    els.drawBtn.textContent = '抽選中...';
  } else if (state.latestAssignments.length > 0) {
    els.drawBtn.textContent = 'もう一度抽選';
  } else {
    els.drawBtn.textContent = '抽選する';
  }
}

function setPresentationMode(enabled) {
  state.presentationMode = enabled;
  document.body.classList.toggle('presentation-mode', enabled);
  if (els.backToSettingsBtn) els.backToSettingsBtn.hidden = !enabled;
  if (enabled) {
    els.drawBtn.blur();
    els.backToSettingsBtn?.focus({ preventScroll: true });
  }
}

function leavePresentationMode() {
  setPresentationMode(false);
  updateDrawButtonLabel();
}

function syncModeFromPlayers() {
  const playerCheck = validatePlayers(els.playersInput.value);
  if (!playerCheck.error && playerCheck.players.length === 1) setDrawMode('single');
  else if (!playerCheck.error && playerCheck.players.length > 1) setDrawMode('multi');
}

function renderTypeFilters() {
  els.typeFilters.innerHTML = CATEGORY_DEFINITIONS.map((category) => {
    const count = category.weapons.length;
    return `
      <label class="type-pill ${state.selectedTypes.has(category.type) ? 'selected' : ''}">
        <input type="checkbox" value="${category.type}" ${state.selectedTypes.has(category.type) ? 'checked' : ''} />
        <span>${category.type}</span>
        <em>${count}</em>
      </label>
    `;
  }).join('');
}

function renderWeaponList() {
  if (!els.weaponList) return;
  els.weaponList.classList.toggle('compact', Boolean(els.compactWeaponList?.checked));
  els.weaponList.innerHTML = CATEGORY_DEFINITIONS.map((category) => {
    const categoryWeapons = weaponsByType(category.type);
    const selectedCount = selectedCountByType(category.type);
    const isAllSelected = selectedCount === categoryWeapons.length;
    const isNoneSelected = selectedCount === 0;
    const hasDrawnWeapon = categoryWeapons.some((weapon) => state.drawnWeaponIds.has(weapon.id));
    const shouldOpen = state.openWeaponTypes.has(category.type);
    return `
      <details class="weapon-group ${hasDrawnWeapon ? 'has-used' : ''}" data-type="${escapeHtml(category.type)}" ${shouldOpen ? 'open' : ''}>
        <summary>
          <span class="group-toggle-icon" aria-hidden="true"></span>
          <label class="group-check" title="${escapeHtml(category.type)}をまとめてON/OFF">
            <input type="checkbox" data-group-toggle="${escapeHtml(category.type)}" ${isAllSelected ? 'checked' : ''} />
            <span class="group-check-mark ${!isAllSelected && !isNoneSelected ? 'mixed' : ''}"></span>
          </label>
          <span class="group-title">${escapeHtml(category.type)}</span>
          <span class="group-count">${selectedCount}/${categoryWeapons.length}</span>
        </summary>
        <div class="weapon-items">
          ${categoryWeapons.map((weapon) => {
            const isExcluded = state.excludedWeaponIds.has(weapon.id);
            const isDrawn = state.drawnWeaponIds.has(weapon.id);
            return `
              <label class="weapon-item ${isExcluded ? 'excluded' : ''} ${isDrawn ? 'drawn' : ''} ${state.focusedWeaponId === weapon.id ? 'focused-used' : ''}" data-weapon-id="${weapon.id}">
                <input type="checkbox" value="${weapon.id}" ${isExcluded ? '' : 'checked'} />
                <img src="${weapon.imagePath}" alt="" loading="lazy" />
                <span>${escapeHtml(weapon.name)}${orderBadge(weapon)}</span>
                ${isDrawn ? '<strong class="picked-badge">使用済み</strong>' : ''}
              </label>
            `;
          }).join('')}
        </div>
      </details>
    `;
  }).join('');
}

function updateDrawAvailability(candidates, playerCheck, constraintError = null) {
  if (state.isSpinning) return;
  const hasNoTargets = state.selectedTypes.size === 0 || candidates.length === 0;
  const hasPlayerError = state.drawMode === 'multi' && Boolean(playerCheck.error);
  els.drawBtn.disabled = hasNoTargets || hasPlayerError || Boolean(constraintError);
  els.copyBtn.disabled = state.latestResultSnapshot === null;
}

function updateSummary() {
  const rule = currentRule();
  const candidates = state.drawMode === 'single'
    ? applySingleRangeRule(filterWeapons(weapons, rule))
    : filterWeapons(weapons, rule);
  const playerCheck = validatePlayers(els.playersInput.value);
  const balanceError = rangeBalanceError(playerCheck.players);
  const constraintError = balanceError ?? preflightAssignmentError(candidates, playerCheck, rule);
  const summary = summarizeRule(rule);
  const orderCount = candidates.filter((weapon) => weapon.isOrder).length;
  const excludedCount = state.excludedWeaponIds.size;
  state.latestRuleSummary = `${state.drawMode === 'single' ? '1ブキずつ' : '参加者へ配る'} / ${summary}`;
  if (els.ruleSummary) els.ruleSummary.textContent = state.latestRuleSummary;
  els.candidateCounter.textContent = `候補ブキ: ${candidates.length} / ${weapons.length}　除外: ${excludedCount}　使用済み: ${state.drawnWeaponIds.size}　オーダー: ${orderCount}　参加者: ${playerCheck.players.length}人`;
  renderAdvancedRuleSummary();

  if (state.selectedTypes.size === 0) {
    setError('ブキ種が1つも選択されていません。全ブキONを押すか、左のブキ種を1つ以上ONにしてください。');
  } else if (!candidates.length) {
    setError('抽選対象のブキがありません。ブキリストのチェックを戻してください。');
  } else if (state.drawMode === 'multi' && playerCheck.error && els.playersInput.value.trim()) {
    setError(playerCheck.error);
  } else if (state.drawMode === 'multi' && playerCheck.error) {
    setError('参加者を1人以上入力してください。');
  } else if (state.drawMode === 'single' && playerCheck.error && els.playersInput.value.trim()) {
    setError(playerCheck.error);
  } else if (constraintError) {
    setError(constraintError);
  } else {
    setError(null);
  }
  updateDrawAvailability(candidates, playerCheck, constraintError);
}

function renderResults(assignments) {
  if (!els.results) return;
  if (!assignments.length) {
    els.results.className = 'results empty';
    els.results.textContent = state.drawMode === 'single' ? '1ブキ抽選の結果がここに表示されます。' : 'ここに抽選結果が表示されます。';
    return;
  }

  els.results.className = 'results';
  els.results.innerHTML = assignments.map((assignment, index) => `
    <article class="result-card" style="--delay:${index * 45}ms">
      <span class="player-index">${String(index + 1).padStart(2, '0')}</span>
      <img class="result-weapon-img" src="${assignment.weapon.imagePath}" alt="${escapeHtml(assignment.weapon.name)}" loading="lazy" />
      <div>
        <h3>${escapeHtml(assignment.player)}</h3>
        <p>${escapeHtml(assignment.weapon.name)}${orderBadge(assignment.weapon)}</p>
      </div>
      <span class="weapon-type ${assignment.weapon.isOrder ? 'order' : ''}">${orderTypeMarkup(assignment.weapon)}</span>
    </article>
  `).join('');
}

function renderSingleHistory() {
  if (!els.singleHistory) return;
  if (!state.singleHistory.length) {
    els.singleHistory.hidden = true;
    els.singleHistory.innerHTML = '';
    return;
  }
  els.singleHistory.hidden = false;
  els.singleHistory.innerHTML = `
    <h3>使用済み履歴 <small>チェックON = 右のブキリストから除外中</small></h3>
    <div class="history-list">
      ${state.singleHistory.map((item, index) => {
        const isUsed = state.drawnWeaponIds.has(item.weapon.id);
        return `
          <article class="history-item ${isUsed ? 'used' : ''}">
            <label class="history-used-toggle" title="使用済みにして右のブキリストから外す">
              <input type="checkbox" data-history-weapon-id="${item.weapon.id}" ${isUsed ? 'checked' : ''} />
              <span><i>${String(state.singleHistory.length - index).padStart(2, '0')}</i><b>${isUsed ? '✓' : ''}</b></span>
            </label>
            <img src="${item.weapon.imagePath}" alt="" loading="lazy" />
            <b>${escapeHtml(item.weapon.name)}${orderBadge(item.weapon)}</b>
            <small>${escapeHtml(item.note ?? item.weapon.type)}${item.weapon.isOrder && !String(item.note ?? '').includes('ORDER') ? ' / ORDER' : ''}</small>
          </article>
        `;
      }).join('')}
    </div>
  `;
}

function rouletteMarkup(weapon, label) {
  return `
    <div class="roulette-image-stage">
      <img src="${weapon.imagePath}" alt="${escapeHtml(weapon.name)}" />
    </div>
    <div class="roulette-meta">
      <span class="display-label">${label}</span>
      <strong>${escapeHtml(weapon.name)}${orderBadge(weapon)}</strong>
      <small>${orderTypeMarkup(weapon)}</small>
    </div>
  `;
}

function clearSpinTimers() {
  state.spinTimers.forEach((timerId) => window.clearTimeout(timerId));
  state.spinTimers = [];
  stopRouletteSound();
}

function setControlsDisabled(disabled) {
  els.drawBtn.disabled = disabled;
  updateDrawButtonLabel();
  els.copyBtn.disabled = disabled || state.latestResultSnapshot === null;
  if (els.backToSettingsBtn) els.backToSettingsBtn.disabled = disabled;
  els.playersInput.disabled = disabled;
  els.noDuplicateWeapons.disabled = disabled || state.drawMode === 'single';
  els.includeOrderWeapons.disabled = disabled;
  els.autoMarkDrawnWeapon.disabled = disabled;
  if (els.soundEffectsEnabled) els.soundEffectsEnabled.disabled = disabled;
  if (els.soundVolume) els.soundVolume.disabled = disabled;
  els.selectAllTypesBtn.disabled = disabled;
  els.clearTypesBtn.disabled = disabled;
  els.clearPlayersBtn.disabled = disabled;
  els.modeInputs.forEach((input) => { input.disabled = disabled; });
  els.typeFilters.querySelectorAll('input').forEach((input) => { input.disabled = disabled; });
  if (els.enableAllWeaponsBtn) els.enableAllWeaponsBtn.disabled = disabled;
  if (els.disableAllWeaponsBtn) els.disableAllWeaponsBtn.disabled = disabled;
  if (els.collapseAllWeaponGroupsBtn) els.collapseAllWeaponGroupsBtn.disabled = disabled;
  if (els.compactWeaponList) els.compactWeaponList.disabled = disabled;
  if (els.openRuleDrawerBtn) els.openRuleDrawerBtn.disabled = disabled;
  if (els.teamModeEnabled) els.teamModeEnabled.disabled = disabled;
  if (els.resetTeamSplitBtn) els.resetTeamSplitBtn.disabled = disabled || !state.teamMode.enabled;
  if (els.rangeRuleEnabled) els.rangeRuleEnabled.disabled = disabled;
  if (els.resetAdvancedRulesBtn) els.resetAdvancedRulesBtn.disabled = disabled;
  if (els.applyAdvancedRulesBtn) els.applyAdvancedRulesBtn.disabled = disabled;
  els.rangePresetActions?.querySelectorAll('button').forEach((button) => { button.disabled = disabled; });
  els.rangeBalanceTable?.querySelectorAll('button').forEach((button) => { button.disabled = disabled || !state.rangeRule.enabled; });
  els.weaponList?.querySelectorAll('input').forEach((input) => { input.disabled = disabled; });
  document.querySelectorAll('[data-sample]').forEach((button) => { button.disabled = disabled; });
}

function renderRouletteSlots(assignments) {
  els.rouletteDisplay.className = 'roulette-display multi';
  const hasTeams = assignments.some((assignment) => assignment.teamId && assignment.teamId !== 'all');
  const renderSlot = (assignment, index) => `
    <article class="player-roulette idle" data-index="${index}" style="--slot-delay:${index * 34}ms">
      <span class="player-index">${String(index + 1).padStart(2, '0')}</span>
      <h3>${escapeHtml(assignment.player)}</h3>
      <div class="roulette-image-stage">
        <img src="${assignment.weapon.imagePath}" alt="${escapeHtml(assignment.weapon.name)}" />
      </div>
      <strong class="slot-weapon-name">READY?</strong>
      <small class="slot-weapon-type">同時ルーレット待機中</small>
      <span class="impact-effect" aria-hidden="true"><i></i><b></b><em></em></span>
    </article>
  `;

  if (hasTeams) {
    const teams = [...new Map(assignments.map((assignment) => [
      assignment.teamId,
      { id: assignment.teamId, name: assignment.teamName, index: assignment.teamIndex },
    ])).values()].sort((a, b) => a.index - b.index);
    els.rouletteDisplay.innerHTML = `
      <div class="team-roulette-grid" aria-label="チーム別ブキルーレット">
        ${teams.map((team) => `
          <section class="team-roulette-group" data-team-id="${team.id}">
            <h3>${escapeHtml(team.name)}</h3>
            <div class="roulette-grid team-grid">
              ${assignments
                .map((assignment, index) => ({ assignment, index }))
                .filter((item) => item.assignment.teamId === team.id)
                .sort((a, b) => a.assignment.teamSlotIndex - b.assignment.teamSlotIndex)
                .map((item) => renderSlot(item.assignment, item.index))
                .join('')}
            </div>
          </section>
        `).join('')}
      </div>
    `;
    return;
  }

  els.rouletteDisplay.innerHTML = `
    <div class="roulette-grid" aria-label="参加者別ブキルーレット">
      ${assignments.map((assignment, index) => renderSlot(assignment, index)).join('')}
    </div>
  `;
}

function updateSlot(slot, weapon) {
  const img = slot.querySelector('img');
  const nameEl = slot.querySelector('.slot-weapon-name');
  const typeEl = slot.querySelector('.slot-weapon-type');
  img.src = weapon.imagePath;
  img.alt = weapon.name;
  nameEl.innerHTML = `${escapeHtml(weapon.name)}${orderBadge(weapon)}`;
  typeEl.innerHTML = orderTypeMarkup(weapon);
}

function finishPlayerRoulettes(slots, assignments) {
  clearSpinTimers();
  playResultSound();
  slots.forEach((slot) => {
    const index = Number(slot.dataset.index);
    updateSlot(slot, assignments[index].weapon);
    slot.classList.remove('spinning');
    slot.classList.add('locked', 'baban');
  });
  els.rouletteDisplay.classList.add('baban-screen');

  const releaseTimer = window.setTimeout(() => {
    slots.forEach((slot) => slot.classList.remove('baban'));
    els.rouletteDisplay.classList.remove('baban-screen');
    state.isSpinning = false;
    if (els.autoMarkDrawnWeapon.checked) {
      markAssignmentsUsed(assignments);
      renderWeaponList();
      renderSingleHistory();
      updateSummary();
    }
    setControlsDisabled(false);
    updateSummary();
    renderResults(assignments);
    updateDrawButtonLabel();
  }, 720);
  state.spinTimers.push(releaseTimer);
}

function animatePlayerRoulettes(candidates, assignments) {
  clearSpinTimers();
  state.isSpinning = true;
  setControlsDisabled(true);
  startRouletteSound();

  const slots = [...els.rouletteDisplay.querySelectorAll('.player-roulette')];
  const totalTicks = 38;

  slots.forEach((slot, index) => {
    slot.classList.remove('idle', 'locked', 'baban');
    slot.classList.add('spinning');
    let ticks = 0;

    const spin = () => {
      const weapon = candidates[Math.floor(Math.random() * candidates.length)];
      updateSlot(slot, weapon);
      ticks += 1;
      if (ticks < totalTicks) {
        const intervalMs = Math.min(118, 26 + ticks * 3 + (index % 3) * 5);
        const timerId = window.setTimeout(spin, intervalMs);
        state.spinTimers.push(timerId);
      }
    };

    const startTimer = window.setTimeout(spin, index * 18);
    state.spinTimers.push(startTimer);
  });

  const finalTimer = window.setTimeout(() => {
    finishPlayerRoulettes(slots, assignments);
  }, 2100);
  state.spinTimers.push(finalTimer);
}

function animateRoulette(candidates, finalWeapon, onFinish) {
  state.isSpinning = true;
  setControlsDisabled(true);
  startRouletteSound();
  els.rouletteDisplay.className = 'roulette-display single spinning';

  let ticks = 0;
  const maxTicks = 34;
  let intervalMs = 34;
  const spin = () => {
    const weapon = candidates[Math.floor(Math.random() * candidates.length)];
    els.rouletteDisplay.innerHTML = rouletteMarkup(weapon, 'ROLLING');
    ticks += 1;
    intervalMs = Math.min(120, intervalMs + 3);
    if (ticks >= maxTicks) {
      playResultSound();
      els.rouletteDisplay.classList.remove('spinning');
      els.rouletteDisplay.classList.add('locked', 'baban-screen');
      els.rouletteDisplay.innerHTML = `${rouletteMarkup(finalWeapon, 'RESULT')}<span class="impact-effect single-impact" aria-hidden="true"><i></i><b></b><em></em></span>`;
      const timerId = window.setTimeout(() => {
        els.rouletteDisplay.classList.remove('locked', 'baban-screen');
        state.isSpinning = false;
        setControlsDisabled(false);
        onFinish?.();
      }, 620);
      state.spinTimers.push(timerId);
      return;
    }
    const timerId = window.setTimeout(spin, intervalMs);
    state.spinTimers.push(timerId);
  };
  spin();
}

function revealUsedWeaponInList(weapon) {
  if (!weapon) return;
  state.openWeaponTypes.add(weapon.type);
  state.focusedWeaponId = weapon.id;
  window.requestAnimationFrame(() => {
    const target = els.weaponList?.querySelector(`[data-weapon-id="${CSS.escape(weapon.id)}"]`);
    target?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  });
}

function uniqueAssignmentsByWeapon(assignments) {
  const byWeapon = new Map();
  assignments.forEach((assignment) => {
    const existing = byWeapon.get(assignment.weapon.id);
    if (existing) existing.players.push(assignment.player);
    else byWeapon.set(assignment.weapon.id, { weapon: assignment.weapon, players: [assignment.player] });
  });
  return [...byWeapon.values()];
}

function prependUsedHistoryFromAssignments(assignments) {
  const now = new Date().toISOString();
  const existingIds = new Set(state.singleHistory.map((item) => item.weapon.id));
  const newItems = uniqueAssignmentsByWeapon(assignments)
    .filter((item) => !existingIds.has(item.weapon.id))
    .map((item) => ({
      weapon: item.weapon,
      drawnAt: now,
      note: `${item.weapon.type}${item.weapon.isOrder ? ' / ORDER' : ''} / ${item.players.join('・')}`,
    }));
  state.singleHistory = [...newItems, ...state.singleHistory].slice(0, 50);
}

function markAssignmentsUsed(assignments) {
  const unique = uniqueAssignmentsByWeapon(assignments);
  const next = updateWeaponsUsageState({
    excludedWeaponIds: state.excludedWeaponIds,
    usedWeaponIds: state.drawnWeaponIds,
  }, unique.map((item) => item.weapon), true);
  state.excludedWeaponIds = next.excludedWeaponIds;
  state.drawnWeaponIds = next.usedWeaponIds;
  prependUsedHistoryFromAssignments(assignments);
  unique.forEach((item) => state.openWeaponTypes.add(item.weapon.type));
  if (unique.length) state.focusedWeaponId = unique[unique.length - 1].weapon.id;
}

function afterSingleDraw(weapon) {
  state.singleHistory = appendWeaponHistory(state.singleHistory, weapon, { limit: 50 });
  if (els.autoMarkDrawnWeapon.checked) {
    const next = updateWeaponUsageState({
      excludedWeaponIds: state.excludedWeaponIds,
      usedWeaponIds: state.drawnWeaponIds,
    }, weapon, true);
    state.excludedWeaponIds = next.excludedWeaponIds;
    state.drawnWeaponIds = next.usedWeaponIds;
    revealUsedWeaponInList(weapon);
  }
  state.latestAssignments = [{ player: '今回のブキ', weapon }];
  state.latestResultSnapshot = createResultSnapshot({
    title: '今回の1ブキ抽選結果',
    ruleSummary: state.latestRuleSummary,
    assignments: state.latestAssignments,
  });
  renderWeaponList();
  updateSummary();
  renderSingleHistory();
  renderResults(state.latestAssignments);
  updateDrawButtonLabel();
}

function drawSingle() {
  setPresentationMode(false);
  const playerCheck = validatePlayers(els.playersInput.value || 'プレイヤー1');
  if (playerCheck.error) {
    setError(playerCheck.error);
    return;
  }
  const balanceError = rangeBalanceError(playerCheck.players);
  if (balanceError) {
    setError(balanceError);
    return;
  }
  const candidates = applySingleRangeRule(filterWeapons(weapons, currentRule()));
  const result = drawSingleWeapon(candidates);
  if (result.error) {
    setError(result.error);
    return;
  }
  setError(null);
  renderResults([]);
  animateRoulette(candidates, result.weapon, () => afterSingleDraw(result.weapon));
}

function drawMulti() {
  setPresentationMode(false);
  const playerCheck = validatePlayers(els.playersInput.value);
  if (playerCheck.error) {
    setError(playerCheck.error);
    return;
  }
  const balanceError = rangeBalanceError(playerCheck.players);
  if (balanceError) {
    setError(balanceError);
    return;
  }

  const rule = currentRule();
  const candidates = filterWeapons(weapons, rule);
  const result = drawAssignments(playerCheck.players, candidates, rule);
  if (result.error) {
    setError(result.error);
    return;
  }

  setError(null);
  state.latestAssignments = result.assignments;
  state.latestResultSnapshot = createResultSnapshot({
    title: '次の武器縛りプラベ結果',
    ruleSummary: `${state.drawMode === 'single' ? '1ブキずつ' : '参加者へ配る'} / ${summarizeRule(rule)}`,
    assignments: result.assignments,
    teams: result.teams,
  });
  renderResults([]);
  renderRouletteSlots(result.assignments);
  animatePlayerRoulettes(candidates, result.assignments);
}

function draw() {
  if (state.isSpinning) return;
  if (state.drawMode === 'single') drawSingle();
  else drawMulti();
}

async function copyResult() {
  const text = generateShareText(state.latestResultSnapshot ?? {
    title: state.drawMode === 'single' ? '今回の1ブキ抽選結果' : '次の武器縛りプラベ結果',
    ruleSummary: state.latestRuleSummary,
    assignments: state.latestAssignments,
  });
  try {
    const copied = await writeClipboardText(text);
    if (!copied) throw new Error('copy failed');
    els.copyBtn.textContent = 'コピー完了！';
    showCopyToast('結果をクリップボードにコピーしました');
    window.setTimeout(() => { els.copyBtn.textContent = '結果コピー'; }, 1200);
  } catch {
    showCopyToast('自動コピーできませんでした。表示された文章をコピーしてください', 'warn');
    window.prompt('コピーできない環境です。下のテキストをコピーしてください。', text);
  }
}

els.typeFilters.addEventListener('change', (event) => {
  if (!event.target.matches('input[type="checkbox"]')) return;
  if (event.target.checked) state.selectedTypes.add(event.target.value);
  else state.selectedTypes.delete(event.target.value);
  renderTypeFilters();
  updateSummary();
});
els.weaponList?.addEventListener('change', (event) => {
  if (!event.target.matches('input[type="checkbox"]')) return;
  const groupType = event.target.dataset.groupToggle;
  if (groupType) {
    weaponsByType(groupType).forEach((weapon) => {
      if (event.target.checked) {
        state.excludedWeaponIds.delete(weapon.id);
        state.drawnWeaponIds.delete(weapon.id);
        if (state.focusedWeaponId === weapon.id) state.focusedWeaponId = null;
      } else {
        state.excludedWeaponIds.add(weapon.id);
      }
    });
  } else {
    const weaponId = event.target.value;
    if (event.target.checked) {
      state.excludedWeaponIds.delete(weaponId);
      state.drawnWeaponIds.delete(weaponId);
      if (state.focusedWeaponId === weaponId) state.focusedWeaponId = null;
    } else {
      state.excludedWeaponIds.add(weaponId);
    }
  }
  renderSingleHistory();
  renderWeaponList();
  updateSummary();
});
els.weaponList?.addEventListener('toggle', (event) => {
  if (!event.target.matches('details.weapon-group')) return;
  const type = event.target.dataset.type;
  if (event.target.open) state.openWeaponTypes.add(type);
  else state.openWeaponTypes.delete(type);
}, true);
els.openRuleDrawerBtn?.addEventListener('click', openRuleDrawer);
els.closeRuleDrawerBtn?.addEventListener('click', closeRuleDrawer);
els.ruleDrawerBackdrop?.addEventListener('click', closeRuleDrawer);
els.teamModeEnabled?.addEventListener('change', () => {
  state.teamMode.enabled = els.teamModeEnabled.checked;
  if (state.teamMode.enabled) {
    resetTeamAssignments(currentPlayers());
    state.rangeRule.counts = createDefaultRangeCounts(rangeTargetInfo().target);
    state.rangeRule.minimums = createDefaultRangeMinimums();
    state.rangeRule.thresholdFixed = null;
  }
  renderAdvancedRuleControls();
  updateSummary();
});
els.resetTeamSplitBtn?.addEventListener('click', () => {
  resetTeamAssignments(currentPlayers());
  state.rangeRule.counts = createDefaultRangeCounts(rangeTargetInfo().target);
  state.rangeRule.minimums = createDefaultRangeMinimums();
  state.rangeRule.thresholdFixed = null;
  renderAdvancedRuleControls();
  updateSummary();
});
els.teamPreview?.addEventListener('click', (event) => {
  const button = event.target.closest('[data-team-move-player][data-team-move-target]');
  if (!button || !state.teamMode.enabled) return;
  state.teamAssignments[button.dataset.teamMovePlayer] = button.dataset.teamMoveTarget;
  renderAdvancedRuleControls();
  updateSummary();
});
els.teamPreview?.addEventListener('dragstart', (event) => {
  const row = event.target.closest('.team-member-row');
  if (!row || !state.teamMode.enabled) return;
  draggedTeamPlayer = row.dataset.player;
  row.classList.add('dragging');
  event.dataTransfer.effectAllowed = 'move';
  event.dataTransfer.setData('text/plain', draggedTeamPlayer);
});
els.teamPreview?.addEventListener('dragend', () => {
  draggedTeamPlayer = null;
  els.teamPreview?.querySelectorAll('.dragging, .drag-over').forEach((element) => {
    element.classList.remove('dragging', 'drag-over');
  });
});
els.teamPreview?.addEventListener('dragover', (event) => {
  const list = event.target.closest('[data-drop-team]');
  if (!list || !state.teamMode.enabled || list.dataset.dropTeam === 'all') return;
  event.preventDefault();
  event.dataTransfer.dropEffect = 'move';
  list.classList.add('drag-over');
});
els.teamPreview?.addEventListener('dragleave', (event) => {
  const list = event.target.closest('[data-drop-team]');
  if (list && !list.contains(event.relatedTarget)) list.classList.remove('drag-over');
});
els.teamPreview?.addEventListener('drop', (event) => {
  const list = event.target.closest('[data-drop-team]');
  if (!list || !state.teamMode.enabled || list.dataset.dropTeam === 'all') return;
  event.preventDefault();
  const player = draggedTeamPlayer || event.dataTransfer.getData('text/plain');
  if (player) state.teamAssignments[player] = list.dataset.dropTeam;
  list.classList.remove('drag-over');
  draggedTeamPlayer = null;
  renderAdvancedRuleControls();
  updateSummary();
});
els.rangeRuleEnabled?.addEventListener('change', () => {
  state.rangeRule.enabled = els.rangeRuleEnabled.checked;
  if (state.rangeRule.enabled) {
    state.rangeRule.counts = createDefaultRangeCounts(rangeTargetInfo().target);
    state.rangeRule.minimums = createDefaultRangeMinimums();
    state.rangeRule.thresholdFixed = null;
  }
  renderAdvancedRuleControls();
  updateSummary();
});
els.rangePresetActions?.addEventListener('click', (event) => {
  const button = event.target.closest('[data-range-preset]');
  if (!button) return;
  state.rangeRule.enabled = true;
  const nextCounts = createDefaultRangeCounts();
  const nextMinimums = createDefaultRangeMinimums();
  let nextThresholdFixed = null;
  if (button.dataset.rangePreset === 'long-or-ultra-1') {
    nextThresholdFixed = { thresholdLabel: '長射程', count: 1 };
  }
  if (button.dataset.rangePreset === 'long-1') {
    nextCounts.長射程 = 1;
    nextMinimums.長射程 = 1;
  }
  if (button.dataset.rangePreset === 'ultra-1') {
    nextCounts.超長射程 = 1;
    nextMinimums.超長射程 = 1;
  }
  state.rangeRule.counts = nextCounts;
  state.rangeRule.minimums = nextMinimums;
  state.rangeRule.thresholdFixed = nextThresholdFixed;
  renderAdvancedRuleControls();
  updateSummary();
});
els.rangeBalanceTable?.addEventListener('click', (event) => {
  const button = event.target.closest('[data-range-label][data-range-count]');
  if (!button) return;
  ensureRangeCountsShape();
  state.rangeRule.counts[button.dataset.rangeLabel] = button.dataset.rangeCount === 'auto'
    ? null
    : Number(button.dataset.rangeCount);
  state.rangeRule.minimums[button.dataset.rangeLabel] = 0;
  if (['長射程', '超長射程'].includes(button.dataset.rangeLabel)) {
    state.rangeRule.thresholdFixed = null;
  }
  renderAdvancedRuleControls();
  updateSummary();
});
els.resetAdvancedRulesBtn?.addEventListener('click', () => {
  state.teamMode.enabled = false;
  resetTeamAssignments(currentPlayers());
  state.rangeRule.enabled = false;
  state.rangeRule.counts = createDefaultRangeCounts(4);
  state.rangeRule.minimums = createDefaultRangeMinimums();
  state.rangeRule.thresholdFixed = null;
  renderAdvancedRuleControls();
  updateSummary();
});
els.applyAdvancedRulesBtn?.addEventListener('click', closeRuleDrawer);
els.singleHistory?.addEventListener('change', (event) => {
  const weaponId = event.target.dataset.historyWeaponId;
  if (!weaponId) return;
  const weapon = weapons.find((item) => item.id === weaponId);
  const next = updateWeaponUsageState({
    excludedWeaponIds: state.excludedWeaponIds,
    usedWeaponIds: state.drawnWeaponIds,
  }, weapon, event.target.checked);
  state.excludedWeaponIds = next.excludedWeaponIds;
  state.drawnWeaponIds = next.usedWeaponIds;
  if (event.target.checked) revealUsedWeaponInList(weapon);
  else if (state.focusedWeaponId === weaponId) state.focusedWeaponId = null;
  renderSingleHistory();
  renderWeaponList();
  updateSummary();
});
els.compactWeaponList?.addEventListener('change', renderWeaponList);
els.enableAllWeaponsBtn?.addEventListener('click', () => {
  state.excludedWeaponIds.clear();
  state.drawnWeaponIds.clear();
  state.focusedWeaponId = null;
  renderSingleHistory();
  renderWeaponList();
  updateSummary();
});
els.disableAllWeaponsBtn?.addEventListener('click', () => {
  state.excludedWeaponIds = new Set(weapons.map((weapon) => weapon.id));
  renderWeaponList();
  updateSummary();
});
els.collapseAllWeaponGroupsBtn?.addEventListener('click', () => {
  state.openWeaponTypes.clear();
  renderWeaponList();
});
els.noDuplicateWeapons.addEventListener('change', updateSummary);
els.includeOrderWeapons.addEventListener('change', updateSummary);
els.autoMarkDrawnWeapon.addEventListener('change', updateSummary);
els.soundEffectsEnabled?.addEventListener('change', () => {
  if (!els.soundEffectsEnabled.checked) stopAllSounds();
});
els.soundVolume?.addEventListener('input', () => {
  syncCustomAudioVolume();
  if (soundState.masterGain && soundState.context) {
    soundState.masterGain.gain.setTargetAtTime(soundVolume(), soundState.context.currentTime, 0.02);
  }
  if (!soundEnabled()) stopAllSounds();
});
els.playersInput.addEventListener('input', () => {
  syncModeFromPlayers();
  renderAdvancedRuleControls();
  updateSummary();
});
els.modeInputs.forEach((input) => {
  input.addEventListener('change', () => setDrawMode(input.value));
});
els.drawBtn.addEventListener('click', draw);
els.backToSettingsBtn?.addEventListener('click', leavePresentationMode);
els.copyBtn.addEventListener('click', copyResult);
els.selectAllTypesBtn.addEventListener('click', () => {
  state.selectedTypes = new Set(CATEGORY_DEFINITIONS.map((category) => category.type));
  renderTypeFilters();
  updateSummary();
});
els.clearTypesBtn.addEventListener('click', () => {
  state.selectedTypes.clear();
  renderTypeFilters();
  updateSummary();
});
els.clearPlayersBtn.addEventListener('click', () => {
  clearSpinTimers();
  state.isSpinning = false;
  setPresentationMode(false);
  els.playersInput.value = '';
  state.latestAssignments = [];
  state.latestResultSnapshot = null;
  renderResults([]);
  renderAdvancedRuleControls();
  updateSummary();
  setControlsDisabled(false);
  updateDrawButtonLabel();
});
document.querySelectorAll('[data-sample]').forEach((button) => {
  button.addEventListener('click', () => {
    els.playersInput.value = samples[button.dataset.sample].join('\n');
    setDrawMode(button.dataset.sample === '1' ? 'single' : 'multi');
    renderAdvancedRuleControls();
    updateSummary();
  });
});

preloadWeaponImages();
renderTypeFilters();
renderWeaponList();
renderSingleHistory();
renderAdvancedRuleControls();
updateSummary();
updateDrawButtonLabel();
