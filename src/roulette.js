export const CATEGORY_DEFINITIONS = [
  { type: 'シューター', weapons: ['わかばシューター', 'スプラシューター', 'N-ZAP85', 'もみじシューター', 'スペースシューター', 'ボールドマーカー', 'プライムシューター', 'スプラシューターコラボ', '.52ガロン', 'N-ZAP89', 'スペースシューターコラボ', 'L3リールガン', 'ボールドマーカーネオ', '.52ガロンデコ', 'ジェットスイーパー', 'シャープマーカー', '.96ガロン', 'プロモデラーMG', 'プロモデラーRG', 'ボトルガイザー', 'L3リールガンD', 'ジェットスイーパーカスタム', 'プライムシューターコラボ', 'シャープマーカーネオ', '.96ガロンデコ', 'H3リールガン', 'ボトルガイザーフォイル', 'H3リールガンD', { name: 'オーダーシューター レプリカ', order: true }] },
  { type: 'ローラー', weapons: ['スプラローラー', 'カーボンローラー', 'スプラローラーコラボ', 'ダイナモローラー', 'ワイドローラー', 'ダイナモローラーテスラ', 'ワイドローラーコラボ', 'ヴァリアブルローラー', 'カーボンローラーデコ', 'ヴァリアブルローラーフォイル', { name: 'オーダーローラー レプリカ', order: true }] },
  { type: 'チャージャー', weapons: ['スプラチャージャー', 'スクイックリンα', 'スプラチャージャーコラボ', 'スプラスコープ', 'スクイックリンβ', 'R-PEN/5H', 'スプラスコープコラボ', 'リッター4K', 'R-PEN/5B', 'リッター4Kカスタム', '14式竹筒銃・甲', 'ソイチューバー', '14式竹筒銃・乙', '4Kスコープ', 'ソイチューバーカスタム', '4Kスコープカスタム', { name: 'オーダーチャージャー レプリカ', order: true }] },
  { type: 'スロッシャー', weapons: ['バケットスロッシャー', 'ヒッセン', 'バケットスロッシャーデコ', 'スクリュースロッシャー', 'モップリン', 'ヒッセンヒュー', 'モップリンD', 'オーバーフロッシャー', 'スクリュースロッシャーネオ', 'オーバーフロッシャーデコ', 'エクスプロッシャー', 'エクスプロッシャーカスタム', { name: 'オーダースロッシャー レプリカ', order: true }] },
  { type: 'スピナー', weapons: ['バレルスピナー', 'スプラスピナー', 'イグザミナー', 'バレルスピナーデコ', 'イグザミナーヒュー', 'ハイドラント', 'ハイドラントカスタム', 'スプラスピナーコラボ', 'ノーチラス47', 'ノーチラス79', 'クーゲルシュライバー', 'クーゲルシュライバーヒュー', { name: 'オーダースピナー レプリカ', order: true }] },
  { type: 'マニューバー', weapons: ['スプラマニューバー', 'デュアルスイーパー', 'スプラマニューバーコラボ', 'スパッタリー', 'デュアルスイーパーカスタム', 'クアッドホッパーブラック', 'ケルビン525', 'ガエンFF', 'クアッドホッパーホワイト', 'スパッタリーヒュー', 'ケルビン525デコ', 'ガエンFFカスタム', { name: 'オーダーマニューバー レプリカ', order: true }] },
  { type: 'シェルター', weapons: ['パラシェルター', '24式張替傘・甲', 'キャンピングシェルター', 'スパイガジェット', 'パラシェルターソレーラ', '24式張替傘・乙', 'キャンピングシェルターソレーラ', 'スパイガジェットソレーラ', { name: 'オーダーシェルター レプリカ', order: true }] },
  { type: 'ブラスター', weapons: ['ホットブラスター', 'ラピッドブラスター', 'ホットブラスターカスタム', 'ラピッドブラスターデコ', 'ロングブラスター', 'ノヴァブラスター', 'ロングブラスターカスタム', 'S-BLAST92', 'クラッシュブラスター', 'ノヴァブラスターネオ', 'クラッシュブラスターネオ', 'Rブラスターエリート', 'S-BLAST91', 'Rブラスターエリートデコ', { name: 'オーダーブラスター レプリカ', order: true }] },
  { type: 'フデ', weapons: ['ホクサイ', 'パブロ', 'ホクサイヒュー', 'フィンセント', 'パブロヒュー', 'フィンセントヒュー', { name: 'オーダーブラシ レプリカ', order: true }] },
  { type: 'ストリンガー', weapons: ['トライストリンガー', 'LACT-450', 'トライストリンガーコラボ', 'LACT-450デコ', 'フルイドV', 'フルイドVカスタム', { name: 'オーダーストリンガー レプリカ', order: true }] },
  { type: 'ワイパー', weapons: ['ドライブワイパー', 'ドライブワイパーデコ', 'ジムワイパー', 'ジムワイパーヒュー', 'デンタルワイパーミント', 'デンタルワイパースミ', { name: 'オーダーワイパー レプリカ', order: true }] },
];

const TYPE_SLUGS = {
  'シューター': 'shooter',
  'ローラー': 'roller',
  'チャージャー': 'charger',
  'スロッシャー': 'slosher',
  'スピナー': 'splatling',
  'マニューバー': 'dualies',
  'シェルター': 'brella',
  'ブラスター': 'blaster',
  'フデ': 'brush',
  'ストリンガー': 'stringer',
  'ワイパー': 'splatana',
};

export const TYPE_COLORS = {
  'シューター': ['#35f2ff', '#0984ff'],
  'ローラー': ['#dfff12', '#7dff2a'],
  'チャージャー': ['#ff3cd5', '#7c4dff'],
  'スロッシャー': ['#ff8a1d', '#ff3d68'],
  'スピナー': ['#00ff9c', '#00a86b'],
  'マニューバー': ['#8effff', '#23a6ff'],
  'シェルター': ['#ffd166', '#ef476f'],
  'ブラスター': ['#ff4b4b', '#ff9f1c'],
  'フデ': ['#c77dff', '#ff70a6'],
  'ストリンガー': ['#b8f7ff', '#48cae4'],
  'ワイパー': ['#caffbf', '#2dc653'],
};

function normalizeWeaponEntry(entry) {
  if (typeof entry === 'string') return { name: entry, order: false };
  return { name: entry.name, order: Boolean(entry.order) };
}

export function buildWeapons(definitions = CATEGORY_DEFINITIONS) {
  return definitions.flatMap((category) => {
    const slug = TYPE_SLUGS[category.type] ?? category.type.toLowerCase().replace(/\s+/g, '-');
    return category.weapons.map((entry, index) => {
      const weapon = normalizeWeaponEntry(entry);
      const id = `${slug}-${index}`;
      return {
        id,
        name: weapon.name,
        type: category.type,
        isOrder: weapon.order,
        imagePath: `./assets/weapons/${id}.png`,
      };
    });
  });
}

export function validatePlayers(rawText) {
  const players = rawText
    .split(/\r?\n|,|、/)
    .map((name) => name.trim())
    .filter(Boolean);

  if (players.length === 0) return { players: [], error: '参加者を1人以上入力してください。' };
  const normalized = players.map((name) => name.toLocaleLowerCase('ja-JP'));
  if (new Set(normalized).size !== normalized.length) {
    return { players, error: '同じ参加者名が重複しています。' };
  }
  if (players.length > 10) return { players, error: 'シンプル版では参加者は10人までにしてください。' };
  return { players, error: null };
}

export function filterWeapons(weapons, rule = {}) {
  const enabledTypes = Array.isArray(rule.enabledTypes) ? new Set(rule.enabledTypes) : null;
  const excludedIds = new Set(rule.excludedWeaponIds ?? []);
  return weapons.filter((weapon) => {
    if (enabledTypes && !enabledTypes.has(weapon.type)) return false;
    if (excludedIds.has(weapon.id)) return false;
    if (rule.includeOrderWeapons === false && weapon.isOrder) return false;
    return true;
  });
}

function pickRandom(items, random = Math.random) {
  return items[Math.floor(random() * items.length)];
}

export function drawAssignments(players, candidateWeapons, options = {}) {
  if (!players.length) return { assignments: [], error: '参加者を1人以上入力してください。' };
  if (!candidateWeapons.length) return { assignments: [], error: '条件に合うブキがありません。縛りをゆるめてください。' };
  if (options.noDuplicateWeapons && candidateWeapons.length < players.length) {
    return { assignments: [], error: '重複なしで抽選するには、参加者数より候補ブキ数が少なすぎます。' };
  }

  const random = options.random ?? Math.random;
  const remaining = [...candidateWeapons];
  const assignments = players.map((player) => {
    const weapon = pickRandom(remaining, random);
    if (options.noDuplicateWeapons) {
      remaining.splice(remaining.findIndex((item) => item.id === weapon.id), 1);
    }
    return { player, weapon };
  });

  return { assignments, error: null };
}

export function drawSingleWeapon(candidateWeapons, options = {}) {
  if (!candidateWeapons.length) {
    return { weapon: null, error: '条件に合うブキがありません。縛りをゆるめてください。' };
  }
  const random = options.random ?? Math.random;
  return { weapon: pickRandom(candidateWeapons, random), error: null };
}

export function appendWeaponHistory(history, weapon, options = {}) {
  const now = options.now ?? (() => new Date().toISOString());
  const limit = options.limit ?? 30;
  return [{ weapon, drawnAt: now() }, ...history].slice(0, limit);
}

export function applyDrawnWeaponExclusion(excludedWeaponIds, weapon, enabled = true) {
  const next = new Set(excludedWeaponIds ?? []);
  if (enabled && weapon?.id) next.add(weapon.id);
  return next;
}

export function updateWeaponUsageState(state, weapon, isUsed) {
  const excludedWeaponIds = new Set(state.excludedWeaponIds ?? []);
  const usedWeaponIds = new Set(state.usedWeaponIds ?? []);
  if (!weapon?.id) return { excludedWeaponIds, usedWeaponIds };
  if (isUsed) {
    excludedWeaponIds.add(weapon.id);
    usedWeaponIds.add(weapon.id);
  } else {
    excludedWeaponIds.delete(weapon.id);
    usedWeaponIds.delete(weapon.id);
  }
  return { excludedWeaponIds, usedWeaponIds };
}

export function updateWeaponsUsageState(state, weaponList, isUsed) {
  return [...new Map((weaponList ?? []).filter((weapon) => weapon?.id).map((weapon) => [weapon.id, weapon])).values()]
    .reduce((nextState, weapon) => updateWeaponUsageState(nextState, weapon, isUsed), state);
}

export function summarizeRule(rule = {}) {
  const typeText = rule.enabledTypes?.length ? rule.enabledTypes.join(' / ') : '全ブキ種';
  const duplicateText = rule.noDuplicateWeapons ? 'ブキ重複なし' : 'ブキ重複あり';
  const orderText = rule.includeOrderWeapons === false ? 'オーダー武器なし' : 'オーダー武器あり';
  return `対象: ${typeText} / ${duplicateText} / ${orderText}`;
}

export function createResultSnapshot({ title = 'ブキ縛りプラベ結果', ruleSummary = '', assignments = [] } = {}) {
  return {
    title,
    ruleSummary,
    assignments: assignments.map((assignment) => ({
      player: assignment.player,
      weapon: { ...assignment.weapon },
    })),
  };
}

export function generateShareText({ title = 'ブキ縛りプラベ結果', ruleSummary = '', assignments = [] }) {
  const lines = [title];
  if (ruleSummary) lines.push(ruleSummary);
  lines.push('');
  assignments.forEach((assignment, index) => {
    const marker = assignment.weapon.isOrder ? ' / オーダー' : '';
    lines.push(`${index + 1}. ${assignment.player}: ${assignment.weapon.name}（${assignment.weapon.type}${marker}）`);
  });
  lines.push('', '文句はルーレットに言ってください。');
  return lines.join('\n');
}
