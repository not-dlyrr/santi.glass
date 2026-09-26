// Builds tokens.css from tokens.json.
// Usage: node scripts/build-tokens.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const t = JSON.parse(readFileSync(join(root, 'tokens.json'), 'utf8'));

const themes = t.color.themes.map((th) => th.id);
const first = themes[0];

const valueFor = (tok, theme) => {
  if (typeof tok.value === 'string') return tok.value;
  return tok.value[theme] ?? tok.value[first];
};

const resolve = (v) => v.replace(/^\{(.+)\}$/, 'var(--$1)');

const themed = [...t.color.tokens, ...(t.shadow?.tokens ?? [])];
const plainFamilies = Object.keys(t).filter(
  (k) => !['name', 'version', 'color', 'type', 'shadow'].includes(k) && Array.isArray(t[k]?.tokens)
);

let css = `/* Generated from tokens.json by scripts/build-tokens.mjs. Do not edit by hand. */\n\n`;

themes.forEach((theme, i) => {
  const selector = i === 0 ? `:root,\n[data-theme="${theme}"]` : `[data-theme="${theme}"]`;
  const lines = themed
    .filter((tok) => i === 0 || typeof tok.value !== 'string')
    .map((tok) => `  --${tok.name}: ${resolve(valueFor(tok, theme))};`);
  css += `${selector} {\n${lines.join('\n')}\n}\n\n`;
});

// dark follows the OS unless a theme is set explicitly
if (themes.includes('dark')) {
  const lines = themed
    .filter((tok) => typeof tok.value !== 'string')
    .map((tok) => `    --${tok.name}: ${resolve(valueFor(tok, 'dark'))};`);
  css += `@media (prefers-color-scheme: dark) {\n  :root:not([data-theme]) {\n${lines.join('\n')}\n  }\n}\n\n`;
}

const rootLines = [];
for (const fam of plainFamilies) for (const tok of t[fam].tokens) rootLines.push(`  --${tok.name}: ${tok.value};`);
for (const [key, stack] of Object.entries(t.type.families)) rootLines.push(`  --font-${key}: ${stack};`);
css += `:root {\n${rootLines.join('\n')}\n}\n\n`;

for (const group of t.type.groups) {
  for (const s of group.styles) {
    const family = s.family ?? group.family;
    css += `.${s.name} {\n  font-family: var(--font-${family});\n  font-size: ${s.fontSize};\n  line-height: ${s.lineHeight};\n  font-weight: ${s.fontWeight};\n  letter-spacing: ${s.letterSpacing ?? 'normal'};\n}\n\n`;
  }
}

writeFileSync(join(root, 'tokens.css'), css.trimEnd() + '\n');
console.log('wrote tokens.css');
