import { mkdir, writeFile } from 'node:fs/promises';
import { buildWeapons, TYPE_COLORS } from '../src/roulette.js';

const outDir = new URL('../assets/weapons/', import.meta.url);
await mkdir(outDir, { recursive: true });

function escapeXml(value) {
  return String(value).replace(/[&<>'"]/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&apos;', '"': '&quot;'
  })[char]);
}

function shapeFor(type) {
  if (type === 'ローラー') return '<rect x="80" y="118" width="210" height="58" rx="28" fill="url(#metal)"/><rect x="110" y="96" width="52" height="120" rx="24" fill="url(#ink)" transform="rotate(-18 136 156)"/>';
  if (type === 'チャージャー') return '<rect x="60" y="138" width="260" height="26" rx="13" fill="url(#metal)"/><circle cx="255" cy="151" r="40" fill="url(#ink)"/><rect x="45" y="130" width="55" height="42" rx="14" fill="url(#ink)"/>';
  if (type === 'スピナー') return '<rect x="65" y="128" width="225" height="38" rx="19" fill="url(#metal)"/><circle cx="140" cy="147" r="56" fill="url(#ink)"/><circle cx="140" cy="147" r="25" fill="#10131d"/>';
  if (type === 'マニューバー') return '<rect x="92" y="104" width="82" height="128" rx="30" fill="url(#ink)" transform="rotate(-16 133 168)"/><rect x="196" y="104" width="82" height="128" rx="30" fill="url(#ink)" transform="rotate(16 237 168)"/><rect x="134" y="144" width="100" height="28" rx="14" fill="url(#metal)"/>';
  if (type === 'シェルター') return '<path d="M58 170 C86 82 262 82 298 170 Z" fill="url(#ink)"/><rect x="168" y="150" width="24" height="92" rx="12" fill="url(#metal)"/><path d="M58 170 C114 152 238 152 298 170" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="8"/>';
  if (type === 'ブラスター') return '<rect x="70" y="116" width="210" height="72" rx="34" fill="url(#metal)"/><circle cx="96" cy="152" r="44" fill="url(#ink)"/><rect x="246" y="128" width="72" height="44" rx="22" fill="url(#ink)"/>';
  if (type === 'フデ') return '<rect x="95" y="68" width="44" height="190" rx="22" fill="url(#metal)" transform="rotate(34 117 163)"/><path d="M178 192 C226 198 266 226 286 262 C236 255 193 239 164 214 Z" fill="url(#ink)"/>';
  if (type === 'ストリンガー') return '<path d="M92 74 C244 82 244 232 92 240" fill="none" stroke="url(#ink)" stroke-width="26" stroke-linecap="round"/><line x1="96" y1="78" x2="96" y2="238" stroke="url(#metal)" stroke-width="10"/><rect x="88" y="138" width="210" height="26" rx="13" fill="url(#metal)"/>';
  if (type === 'ワイパー') return '<path d="M72 230 L235 58 L292 96 L126 258 Z" fill="url(#ink)"/><path d="M94 214 L232 82" stroke="#fff" stroke-opacity=".38" stroke-width="12" stroke-linecap="round"/><rect x="92" y="210" width="60" height="46" rx="16" fill="url(#metal)"/>';
  if (type === 'スロッシャー') return '<path d="M96 92 H260 L238 226 H116 Z" fill="url(#ink)"/><path d="M106 92 C134 58 222 58 252 92" fill="none" stroke="url(#metal)" stroke-width="16"/><ellipse cx="178" cy="92" rx="82" ry="22" fill="#fff" fill-opacity=".18"/>';
  return '<rect x="66" y="116" width="230" height="54" rx="27" fill="url(#metal)"/><rect x="100" y="92" width="96" height="96" rx="34" fill="url(#ink)"/><rect x="232" y="132" width="78" height="26" rx="13" fill="url(#ink)"/><circle cx="128" cy="208" r="30" fill="url(#metal)"/>';
}

for (const weapon of buildWeapons()) {
  const [a, b] = TYPE_COLORS[weapon.type] ?? ['#dfff12', '#27f3ff'];
  const badge = weapon.isOrder ? '<rect x="18" y="18" width="112" height="34" rx="17" fill="#fff" fill-opacity=".92"/><text x="74" y="41" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" font-weight="900" fill="#111">ORDER</text>' : '';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="360" height="300" viewBox="0 0 360 300" role="img" aria-label="${escapeXml(weapon.name)}">
  <defs>
    <linearGradient id="ink" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>
    <linearGradient id="metal" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#f8fbff"/><stop offset=".45" stop-color="#8b93a7"/><stop offset="1" stop-color="#252838"/></linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="14" stdDeviation="12" flood-color="#000" flood-opacity=".4"/></filter>
  </defs>
  <rect width="360" height="300" rx="42" fill="#11131e"/>
  <circle cx="294" cy="62" r="92" fill="${a}" opacity=".16"/>
  <circle cx="64" cy="246" r="74" fill="${b}" opacity=".14"/>
  <g filter="url(#shadow)">${shapeFor(weapon.type)}</g>
  ${badge}
  <text x="180" y="264" text-anchor="middle" font-family="Arial, 'Noto Sans JP', sans-serif" font-size="22" font-weight="900" fill="#fff">${escapeXml(weapon.name)}</text>
  <text x="180" y="286" text-anchor="middle" font-family="Arial, 'Noto Sans JP', sans-serif" font-size="14" font-weight="800" fill="${a}">${escapeXml(weapon.type)}</text>
</svg>`;
  await writeFile(new URL(`${weapon.id}.svg`, outDir), svg, 'utf8');
}

console.log(`generated ${buildWeapons().length} weapon SVGs`);
