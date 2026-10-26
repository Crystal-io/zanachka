// Generates the app icons in public/ from code: an engraved rosette (like the
// guilloché on banknotes) with a euro sign. Run with `npm run icons`.
import sharp from 'sharp';
import { writeFile } from 'node:fs/promises';

const INK = '#18202B';
const PAPER = '#F1F3EF';
const MINT = '#8FD3B4';
const SAVE = '#12805A';

function rosette(cx, cy, { base, step, amp, lobes, count, phaseStep }) {
  let out = '';
  for (let k = 0; k < count; k++) {
    let d = '';
    for (let s = 0; s <= 360; s++) {
      const t = (s / 360) * Math.PI * 2;
      const r = base + k * step + amp * Math.sin(lobes * t + k * phaseStep);
      d += `${s ? 'L' : 'M'}${(cx + r * Math.cos(t)).toFixed(2)} ${(cy + r * Math.sin(t)).toFixed(2)}`;
    }
    out += `<path d="${d}Z"/>`;
  }
  return out;
}

function euro(cx, cy, r) {
  const a0 = (50 * Math.PI) / 180;
  const a1 = (310 * Math.PI) / 180;
  const ox = cx + r * 0.18;
  const p = (a) => `${(ox + r * Math.cos(a)).toFixed(2)} ${(cy + r * Math.sin(a)).toFixed(2)}`;
  const bar = (y) => `M${(ox - r * 1.38).toFixed(2)} ${y.toFixed(2)}H${(ox + r * 0.2).toFixed(2)}`;
  return `<g fill="none" stroke="${PAPER}" stroke-linecap="round">
    <path stroke-width="${(r * 0.34).toFixed(2)}" d="M${p(a0)}A${r} ${r} 0 1 1 ${p(a1)}"/>
    <path stroke-width="${(r * 0.22).toFixed(2)}" d="${bar(cy - r * 0.24)}${bar(cy + r * 0.24)}"/>
  </g>`;
}

function appIcon({ rounded }) {
  const bg = rounded
    ? `<rect width="512" height="512" rx="112" fill="${INK}"/>`
    : `<rect width="512" height="512" fill="${INK}"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  ${bg}
  <g fill="none" stroke="${MINT}" stroke-width="2" stroke-opacity="0.55">
    ${rosette(256, 256, { base: 112, step: 2.4, amp: 18, lobes: 8, count: 14, phaseStep: 0.06 })}
  </g>
  ${euro(256, 256, 62)}
</svg>`;
}

function shortcutIcon(fill, sign) {
  const v = sign === '+' ? '<path d="M48 30V66"/>' : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96">
  <circle cx="48" cy="48" r="48" fill="${fill}"/>
  <g stroke="${PAPER}" stroke-width="7" stroke-linecap="round"><path d="M30 48H66"/>${v}</g>
</svg>`;
}

const png = (svg, size, file) => sharp(Buffer.from(svg)).resize(size, size).png().toFile(`public/${file}`);

const rounded = appIcon({ rounded: true });
const fullBleed = appIcon({ rounded: false });

await writeFile('public/favicon.svg', rounded);
await Promise.all([
  png(rounded, 192, 'pwa-192.png'),
  png(rounded, 512, 'pwa-512.png'),
  png(fullBleed, 512, 'maskable-512.png'),
  png(shortcutIcon(INK, '-'), 96, 'shortcut-expense.png'),
  png(shortcutIcon(SAVE, '+'), 96, 'shortcut-income.png'),
]);
console.log('Icons written to public/');
