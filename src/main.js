import {
  CATEGORY_DEFINITIONS,
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
};

const els = {
  playersInput: document.querySelector('#playersInput'),
  typeFilters: document.querySelector('#typeFilters'),
  noDuplicateWeapons: document.querySelector('#noDuplicateWeapons'),
  includeOrderWeapons: document.querySelector('#includeOrderWeapons'),
  autoMarkDrawnWeapon: document.querySelector('#autoMarkDrawnWeapon'),
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
};

const samples = {
  1: ['プレイヤー1'],
  8: ['プレイヤー1', 'プレイヤー2', 'プレイヤー3', 'プレイヤー4', 'プレイヤー5', 'プレイヤー6', 'プレイヤー7', 'プレイヤー8'],
};

function preloadWeaponImages() {
  for (const weapon of weapons) {
    const image = new Image();
    image.src = weapon.imagePath;
  }
}

function currentRule() {
  return {
    enabledTypes: [...state.selectedTypes],
    excludedWeaponIds: [...state.excludedWeaponIds],
    noDuplicateWeapons: els.noDuplicateWeapons.checked,
    includeOrderWeapons: els.includeOrderWeapons.checked,
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

function updateDrawAvailability(candidates, playerCheck) {
  if (state.isSpinning) return;
  const hasNoTargets = state.selectedTypes.size === 0 || candidates.length === 0;
  const hasPlayerError = state.drawMode === 'multi' && Boolean(playerCheck.error);
  els.drawBtn.disabled = hasNoTargets || hasPlayerError;
  els.copyBtn.disabled = state.latestResultSnapshot === null;
}

function updateSummary() {
  const rule = currentRule();
  const candidates = filterWeapons(weapons, rule);
  const playerCheck = validatePlayers(els.playersInput.value);
  const summary = summarizeRule(rule);
  const orderCount = candidates.filter((weapon) => weapon.isOrder).length;
  const excludedCount = state.excludedWeaponIds.size;
  state.latestRuleSummary = `${state.drawMode === 'single' ? '1ブキずつ' : '参加者へ配る'} / ${summary}`;
  els.ruleSummary.textContent = state.latestRuleSummary;
  els.candidateCounter.textContent = `候補ブキ: ${candidates.length} / ${weapons.length}　除外: ${excludedCount}　使用済み: ${state.drawnWeaponIds.size}　オーダー: ${orderCount}　参加者: ${playerCheck.players.length}人`;

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
  } else {
    setError(null);
  }
  updateDrawAvailability(candidates, playerCheck);
}

function renderResults(assignments) {
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
  els.selectAllTypesBtn.disabled = disabled;
  els.clearTypesBtn.disabled = disabled;
  els.clearPlayersBtn.disabled = disabled;
  els.modeInputs.forEach((input) => { input.disabled = disabled; });
  els.typeFilters.querySelectorAll('input').forEach((input) => { input.disabled = disabled; });
  if (els.enableAllWeaponsBtn) els.enableAllWeaponsBtn.disabled = disabled;
  if (els.disableAllWeaponsBtn) els.disableAllWeaponsBtn.disabled = disabled;
  if (els.collapseAllWeaponGroupsBtn) els.collapseAllWeaponGroupsBtn.disabled = disabled;
  if (els.compactWeaponList) els.compactWeaponList.disabled = disabled;
  els.weaponList?.querySelectorAll('input').forEach((input) => { input.disabled = disabled; });
  document.querySelectorAll('[data-sample]').forEach((button) => { button.disabled = disabled; });
}

function renderRouletteSlots(assignments) {
  els.rouletteDisplay.className = 'roulette-display multi';
  els.rouletteDisplay.innerHTML = `
    <div class="roulette-grid" aria-label="参加者別ブキルーレット">
      ${assignments.map((assignment, index) => `
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
      `).join('')}
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
  slots.forEach((slot, index) => {
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
  const candidates = filterWeapons(weapons, currentRule());
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
els.playersInput.addEventListener('input', () => {
  syncModeFromPlayers();
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
  updateSummary();
  setControlsDisabled(false);
  updateDrawButtonLabel();
});
document.querySelectorAll('[data-sample]').forEach((button) => {
  button.addEventListener('click', () => {
    els.playersInput.value = samples[button.dataset.sample].join('\n');
    setDrawMode(button.dataset.sample === '1' ? 'single' : 'multi');
    updateSummary();
  });
});

preloadWeaponImages();
renderTypeFilters();
renderWeaponList();
renderSingleHistory();
updateSummary();
updateDrawButtonLabel();
