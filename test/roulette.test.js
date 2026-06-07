import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildWeapons,
  filterWeapons,
  drawSingleWeapon,
  appendWeaponHistory,
  applyDrawnWeaponExclusion,
  updateWeaponUsageState,
  updateWeaponsUsageState,
  drawAssignments,
  generateShareText,
  createResultSnapshot,
  validatePlayers,
  CATEGORY_DEFINITIONS,
} from '../src/roulette.js';

const definitions = [
  { type: 'シューター', weapons: ['わかばシューター', { name: 'オーダーシューター レプリカ', order: true }] },
  { type: 'ローラー', weapons: ['スプラローラー', 'カーボンローラー'] },
  { type: 'チャージャー', weapons: ['リッター4K'] },
];

test('buildWeapons creates stable ids, type metadata, order flag, and image path', () => {
  const weapons = buildWeapons(definitions);
  assert.deepEqual(weapons[0], {
    id: 'shooter-0',
    name: 'わかばシューター',
    type: 'シューター',
    isOrder: false,
    imagePath: './assets/weapons/shooter-0.png',
  });
  assert.equal(weapons[1].isOrder, true);
  assert.equal(weapons[1].imagePath, './assets/weapons/shooter-1.png');
  assert.equal(weapons.length, 5);
});

test('default weapon list contains normal and order weapons with required fields', () => {
  const weapons = buildWeapons(CATEGORY_DEFINITIONS);
  assert.ok(weapons.length >= 80);
  assert.ok(weapons.some((weapon) => weapon.isOrder));
  for (const weapon of weapons) {
    assert.ok(weapon.id);
    assert.ok(weapon.name);
    assert.ok(weapon.type);
    assert.equal(typeof weapon.isOrder, 'boolean');
    assert.match(weapon.imagePath, /^\.\/assets\/weapons\/.+\.png$/);
  }
});

test('filterWeapons narrows by enabled weapon types, excluded weapon ids, and order flag', () => {
  const weapons = buildWeapons(definitions);
  const result = filterWeapons(weapons, {
    enabledTypes: ['シューター', 'ローラー'],
    excludedWeaponIds: ['shooter-0'],
    includeOrderWeapons: false,
  });
  assert.deepEqual(result.map((w) => w.name), ['スプラローラー', 'カーボンローラー']);
});

test('filterWeapons treats an explicit empty enabledTypes array as no selected weapon types', () => {
  const weapons = buildWeapons(definitions);
  assert.deepEqual(filterWeapons(weapons, { enabledTypes: [] }), []);
  assert.equal(filterWeapons(weapons, {}).length, weapons.length);
});

test('validatePlayers removes blank lines and rejects duplicate player names', () => {
  assert.deepEqual(validatePlayers('たむた\n\nりん').players, ['たむた', 'りん']);
  assert.equal(validatePlayers('たむた\nたむた').error, '同じ参加者名が重複しています。');
});

test('drawAssignments assigns one weapon to each player without duplicates when requested', () => {
  const weapons = buildWeapons(definitions);
  const randomValues = [0.99, 0.99, 0.99];
  const result = drawAssignments(['A', 'B', 'C'], weapons, {
    noDuplicateWeapons: true,
    random: () => randomValues.shift() ?? 0,
  });
  assert.equal(result.error, null);
  assert.equal(result.assignments.length, 3);
  assert.equal(new Set(result.assignments.map((a) => a.weapon.id)).size, 3);
});

test('drawAssignments reports impossible no-duplicate conditions', () => {
  const weapons = buildWeapons([{ type: 'フデ', weapons: ['パブロ'] }]);
  const result = drawAssignments(['A', 'B'], weapons, { noDuplicateWeapons: true, random: () => 0 });
  assert.equal(result.error, '重複なしで抽選するには、参加者数より候補ブキ数が少なすぎます。');
});

test('drawSingleWeapon returns one weapon and reports empty candidate error', () => {
  const weapons = buildWeapons(definitions);
  const result = drawSingleWeapon(weapons, { random: () => 0.99 });
  assert.equal(result.error, null);
  assert.equal(result.weapon.id, 'charger-0');

  const empty = drawSingleWeapon([], { random: () => 0 });
  assert.equal(empty.weapon, null);
  assert.equal(empty.error, '条件に合うブキがありません。縛りをゆるめてください。');
});

test('single weapon history prepends latest draw and caps length', () => {
  const weapons = buildWeapons(definitions);
  const history = appendWeaponHistory([{ weapon: weapons[0], drawnAt: 'old' }], weapons[1], {
    now: () => 'new',
    limit: 1,
  });
  assert.deepEqual(history, [{ weapon: weapons[1], drawnAt: 'new' }]);
});

test('applyDrawnWeaponExclusion excludes drawn weapon only when enabled', () => {
  const enabled = applyDrawnWeaponExclusion(new Set(['roller-0']), { id: 'shooter-0' }, true);
  assert.deepEqual([...enabled].sort(), ['roller-0', 'shooter-0']);

  const disabled = applyDrawnWeaponExclusion(new Set(['roller-0']), { id: 'shooter-0' }, false);
  assert.deepEqual([...disabled], ['roller-0']);
});

test('updateWeaponUsageState keeps checked history and weapon-list exclusion in sync', () => {
  const weapon = { id: 'shooter-0' };
  const used = updateWeaponUsageState({
    excludedWeaponIds: new Set(['roller-0']),
    usedWeaponIds: new Set(),
  }, weapon, true);
  assert.deepEqual([...used.excludedWeaponIds].sort(), ['roller-0', 'shooter-0']);
  assert.deepEqual([...used.usedWeaponIds], ['shooter-0']);

  const unused = updateWeaponUsageState(used, weapon, false);
  assert.deepEqual([...unused.excludedWeaponIds], ['roller-0']);
  assert.deepEqual([...unused.usedWeaponIds], []);
});

test('updateWeaponsUsageState marks all unique multi-assignment weapons as used and excluded', () => {
  const weapons = [{ id: 'shooter-0' }, { id: 'roller-0' }, { id: 'shooter-0' }];
  const used = updateWeaponsUsageState({
    excludedWeaponIds: new Set(['charger-0']),
    usedWeaponIds: new Set(),
  }, weapons, true);
  assert.deepEqual([...used.excludedWeaponIds].sort(), ['charger-0', 'roller-0', 'shooter-0']);
  assert.deepEqual([...used.usedWeaponIds].sort(), ['roller-0', 'shooter-0']);

  const unused = updateWeaponsUsageState(used, [{ id: 'roller-0' }], false);
  assert.deepEqual([...unused.excludedWeaponIds].sort(), ['charger-0', 'shooter-0']);
  assert.deepEqual([...unused.usedWeaponIds], ['shooter-0']);
});

test('createResultSnapshot freezes copy text to draw-time title, rule, and assignments', () => {
  const weapons = buildWeapons(definitions);
  const assignments = [
    { player: 'たむた', weapon: weapons[0] },
    { player: 'りん', weapon: weapons[1] },
  ];
  const snapshot = createResultSnapshot({
    title: '次の武器縛りプラベ',
    ruleSummary: '抽選時点のルール',
    assignments,
  });

  assignments[0] = { player: '後から変更', weapon: weapons[2] };
  const text = generateShareText(snapshot);

  assert.match(text, /次の武器縛りプラベ/);
  assert.match(text, /抽選時点のルール/);
  assert.match(text, /たむた: わかばシューター/);
  assert.doesNotMatch(text, /後から変更/);
});

test('generateShareText creates a compact Discord-friendly result with order marker', () => {
  const weapons = buildWeapons(definitions);
  const text = generateShareText({
    title: '次の武器縛りプラベ',
    ruleSummary: '対象: シューター / 重複なし',
    assignments: [
      { player: 'たむた', weapon: weapons[0] },
      { player: 'りん', weapon: weapons[1] },
    ],
  });
  assert.match(text, /次の武器縛りプラベ/);
  assert.match(text, /たむた: わかばシューター/);
  assert.match(text, /りん: オーダーシューター レプリカ.*オーダー/);
  assert.match(text, /対象: シューター \/ 重複なし/);
});
