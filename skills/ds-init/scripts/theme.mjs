#!/usr/bin/env node
// Heliostack theme engine — zero dependencies.
//
//   node theme.mjs list                                   list presets (built-in + project)
//   node theme.mjs preview [--themes a,b] [--out file]    write an HTML preview of palettes
//   node theme.mjs from-color <#hex> --id brand [--label "Brand"] [--dir design/themes]
//   node theme.mjs generate [--config design-system.json] write token CSS per the config
//   node theme.mjs check [--themes a,b]                   WCAG contrast report
//
// Presets are parametric: a neutral hue/chroma and a primary hue/chroma/lightness.
// Every other colour is derived, so a custom theme is one brand colour away.

import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
// Built-in presets live next to the script once vendored into a project (design/themes),
// or one level up inside the skill (ds-init/themes).
const BUILTIN_DIR = [resolve(here, 'themes'), resolve(here, '../themes')].find((d) => existsSync(d))

// ---------------------------------------------------------------- colour math (OKLCH ⇄ sRGB)

function oklchToLinear([L, C, H]) {
  const h = (H * Math.PI) / 180
  const a = C * Math.cos(h)
  const b = C * Math.sin(h)
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ]
}

const inGamut = (rgb) => rgb.every((v) => v >= -1e-4 && v <= 1 + 1e-4)

// Reduce chroma until the colour fits in sRGB (keeps lightness and hue stable).
function fit([L, C, H]) {
  if (inGamut(oklchToLinear([L, C, H]))) return [L, C, H]
  let lo = 0
  let hi = C
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2
    if (inGamut(oklchToLinear([L, mid, H]))) lo = mid
    else hi = mid
  }
  return [L, lo, H]
}

const encode = (x) => (x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055)
const decode = (x) => (x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4)

function luminance(lch) {
  const [r, g, b] = oklchToLinear(fit(lch)).map((v) => Math.min(1, Math.max(0, v)))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export function contrast(a, b) {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p)
  return (x + 0.05) / (y + 0.05)
}

export function hexToOklch(hex) {
  const m = hex.replace('#', '').match(/^([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i)
  if (!m) throw new Error(`Not a #rrggbb colour: ${hex}`)
  const [r, g, b] = m.slice(1).map((h) => decode(parseInt(h, 16) / 255))
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const mm = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
  const L = 0.2104542553 * l + 0.793617785 * mm - 0.0040720468 * s
  const A = 1.9779984951 * l - 2.428592205 * mm + 0.4505937099 * s
  const B = 0.0259040371 * l + 0.7827717662 * mm - 0.808675766 * s
  const C = Math.hypot(A, B)
  const H = C < 1e-4 ? 0 : ((Math.atan2(B, A) * 180) / Math.PI + 360) % 360
  return [L, C, H]
}

function toHex(lch) {
  return (
    '#' +
    oklchToLinear(fit(lch))
      .map((v) => Math.round(Math.min(1, Math.max(0, encode(v))) * 255).toString(16).padStart(2, '0'))
      .join('')
  )
}

const css = (lch) => {
  const [L, C, H] = fit(lch)
  return `oklch(${+(L * 100).toFixed(1)}% ${+C.toFixed(3)} ${+H.toFixed(1)})`
}

// ---------------------------------------------------------------- palette derivation

// Semantic colour contract. Names follow shadcn/ui so both strategies share one vocabulary.
export const COLOR_TOKENS = [
  'background', 'foreground', 'card', 'card-foreground', 'popover', 'popover-foreground',
  'primary', 'primary-foreground', 'primary-subtle', 'secondary', 'secondary-foreground',
  'muted', 'muted-foreground', 'accent', 'accent-foreground', 'destructive', 'destructive-foreground',
  'success', 'warning', 'like', 'border', 'input', 'ring', 'overlay',
]

function derive(preset, mode) {
  const { hue: nh, chroma: nc } = preset.neutral
  const p = preset.primary
  const N = (L, k = 1) => [L, nc * k, nh]
  const light = mode === 'light'
  const primary = [light ? p.light : p.dark, p.chroma, p.hue]
  // Pick whichever of near-white / near-black reads better on a filled surface.
  const on = (fill) => [N(0.99, 0.3), N(0.16)].sort((a, b) => contrast(b, fill) - contrast(a, fill))[0]
  const destructive = light ? [0.55, 0.22, 27] : [0.58, 0.2, 25]

  const t = light
    ? {
        background: N(1, 0), foreground: N(0.16), card: N(0.985, 0.4), 'card-foreground': N(0.16),
        popover: N(1, 0), 'popover-foreground': N(0.16), secondary: N(0.96), 'secondary-foreground': N(0.2),
        muted: N(0.967), 'muted-foreground': N(0.52), accent: N(0.955), 'accent-foreground': N(0.16),
        border: N(0.92), input: N(0.87), success: [0.58, 0.15, 150], warning: [0.72, 0.16, 70], like: [0.6, 0.23, 8],
        'primary-subtle': [0.955, Math.min(p.chroma, 0.05), p.hue],
      }
    : {
        background: N(0.13, 0.6), foreground: N(0.985, 0.3), card: N(0.175, 0.6), 'card-foreground': N(0.985, 0.3),
        popover: N(0.195, 0.6), 'popover-foreground': N(0.985, 0.3), secondary: N(0.23, 0.6), 'secondary-foreground': N(0.96),
        muted: N(0.21, 0.6), 'muted-foreground': N(0.72, 0.5), accent: N(0.22, 0.6), 'accent-foreground': N(0.985, 0.3),
        border: N(0.28, 0.6), input: N(0.32, 0.6), success: [0.72, 0.17, 150], warning: [0.8, 0.15, 75], like: [0.66, 0.22, 8],
        'primary-subtle': [0.3, Math.min(p.chroma, 0.07), p.hue],
      }

  Object.assign(t, {
    primary, 'primary-foreground': on(primary), ring: primary, destructive,
    'destructive-foreground': on(destructive), overlay: [0, 0, 0],
  })
  for (const [k, v] of Object.entries(preset.overrides?.[mode] ?? {})) t[k] = v
  return t
}

export function palette(preset) {
  return { light: derive(preset, 'light'), dark: derive(preset, 'dark') }
}

// ---------------------------------------------------------------- non-colour scales

const RADIUS = { none: 0, sm: 0.375, md: 0.625, lg: 0.875, xl: 1.25 } // rem, base (= --radius-md)
const DENSITY = { compact: 0.875, comfortable: 1, spacious: 1.125 }
const FONT_STACKS = {
  sans: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Noto Sans KR", sans-serif',
  mono: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
}

function scaleTokens(cfg) {
  const r = RADIUS[cfg.radius ?? 'md'] ?? RADIUS.md
  const d = DENSITY[cfg.density ?? 'comfortable'] ?? 1
  const rem = (n) => `${+n.toFixed(4)}rem`
  const lines = []
  // 4px grid scaled by density: --space-1 … --space-12
  ;[1, 2, 3, 4, 5, 6, 8, 10, 12, 16].forEach((n) => lines.push(`--space-${n}: ${rem(n * 0.25 * d)};`))
  lines.push(
    `--radius-sm: ${rem(r * 0.6)};`, `--radius-md: ${rem(r)};`, `--radius-lg: ${rem(r * 1.4)};`,
    `--radius-xl: ${rem(r * 2)};`, '--radius-full: 9999px;',
  )
  // Product type scale (px): 12/16 · 14/20 · 16/24 · 18/28 · 20/28 · 24/32 · 30/36 — every line height on the 4px grid.
  const type = { xs: [0.75, 1], sm: [0.875, 1.25], md: [1, 1.5], lg: [1.125, 1.75], xl: [1.25, 1.75], '2xl': [1.5, 2], '3xl': [1.875, 2.25] }
  for (const [k, [size, lh]] of Object.entries(type)) lines.push(`--text-${k}: ${rem(size)};`, `--leading-${k}: ${rem(lh)};`)
  lines.push(
    `--font-sans: var(--font-sans-loaded, ${FONT_STACKS.sans});`,
    `--font-mono: var(--font-mono-loaded, ${FONT_STACKS.mono});`,
    '--weight-regular: 400;', '--weight-medium: 500;', '--weight-semibold: 600;', '--weight-bold: 700;',
    '--shadow-sm: 0 1px 2px oklch(0% 0 0 / 0.06);',
    '--shadow-md: 0 4px 12px oklch(0% 0 0 / 0.08), 0 1px 3px oklch(0% 0 0 / 0.06);',
    '--shadow-lg: 0 12px 32px oklch(0% 0 0 / 0.14), 0 2px 6px oklch(0% 0 0 / 0.08);',
    '--ease-standard: cubic-bezier(0.2, 0, 0, 1);', '--ease-emphasized: cubic-bezier(0.3, 0, 0, 1.2);',
    '--duration-fast: 150ms;', '--duration-normal: 200ms;', '--duration-slow: 320ms;',
    '--z-sticky: 10;', '--z-header: 20;', '--z-toast: 50;',
    '--size-control-xs: 1.75rem;', '--size-control-sm: 2rem;', '--size-control-md: 2.25rem;', '--size-control-lg: 2.75rem;',
    '--size-avatar-sm: 2rem;', '--size-avatar-md: 2.5rem;', '--size-avatar-lg: 4rem;',
    '--layout-content: 38rem;', '--layout-rail: 21.5rem;', '--layout-nav: 17.5rem;', '--layout-header: 3.75rem;', '--layout-tabs: 3rem;',
  )
  return lines
}

// ---------------------------------------------------------------- presets I/O

function readPresets(dirs) {
  const out = new Map()
  for (const dir of dirs) {
    if (!existsSync(dir)) continue
    for (const f of readdirSync(dir).filter((f) => f.endsWith('.json'))) {
      const p = JSON.parse(readFileSync(join(dir, f), 'utf8'))
      out.set(p.id, { ...p, source: dir === BUILTIN_DIR ? 'built-in' : dir })
    }
  }
  return out
}

function pick(presets, ids) {
  return ids.map((id) => {
    const p = presets.get(id)
    if (!p) throw new Error(`Unknown theme "${id}". Available: ${[...presets.keys()].join(', ')}`)
    return p
  })
}

// ---------------------------------------------------------------- emitters

// Cascade layer order is fixed by the FIRST stylesheet that mentions any layer, and bundlers do
// not guarantee base.css loads first. So every CSS file in the project starts with this line.
export const LAYER_ORDER = '@layer reset, tokens, base, components, utilities;'

function emitNative(cfg, themes) {
  const [first] = themes
  const block = (p) => {
    const { light, dark } = palette(p)
    return COLOR_TOKENS.map((k) => `    --${k}: light-dark(${css(light[k])}, ${css(dark[k])});`).join('\n')
  }
  const scheme = cfg.colorScheme ?? 'system'
  return `${LAYER_ORDER}
/* Generated by heliostack ds-init — do not edit by hand.
 * Source: design-system.json. Regenerate: node <ds-init>/scripts/theme.mjs generate
 * Themes: ${themes.map((t) => t.id).join(', ')} · default: ${first.id} · scheme: ${scheme}
 */
@layer tokens {
  :root {
    color-scheme: ${scheme === 'system' ? 'light dark' : scheme};
${scaleTokens(cfg).map((l) => `    ${l}`).join('\n')}
  }
  :root[data-color-scheme='light'] { color-scheme: light; }
  :root[data-color-scheme='dark'] { color-scheme: dark; }

${themes
  .map((t, i) => `  /* ${t.label} — ${t.description} */\n  ${i === 0 ? ":root,\n  " : ''}[data-theme='${t.id}'] {\n${block(t)}\n  }`)
  .join('\n\n')}
}
`
}

function emitShadcn(cfg, themes) {
  const [first] = themes
  const r = RADIUS[cfg.radius ?? 'md'] ?? RADIUS.md
  const vars = (pal) => COLOR_TOKENS.map((k) => `  --${k}: ${css(pal[k])};`).join('\n')
  const blocks = themes.map((t, i) => {
    const { light, dark } = palette(t)
    const lightSel = i === 0 ? `:root,\n[data-theme='${t.id}']` : `[data-theme='${t.id}']`
    const darkSel = i === 0 ? `.dark,\n[data-theme='${t.id}'].dark` : `[data-theme='${t.id}'].dark`
    return `/* ${t.label} */\n${lightSel} {\n${vars(light)}\n}\n${darkSel} {\n${vars(dark)}\n}`
  })
  return `/* Generated by heliostack ds-init (shadcn strategy) — do not edit by hand.
 * Import after "tailwindcss" in globals.css and delete shadcn's default :root/.dark colour blocks.
 * Themes: ${themes.map((t) => t.id).join(', ')} · default: ${first.id}
 */
:root { --radius: ${r}rem; }

${blocks.join('\n\n')}

@theme inline {
${COLOR_TOKENS.map((k) => `  --color-${k}: var(--${k});`).join('\n')}
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);
}
`
}

function emitPreview(themes) {
  const card = (t, mode) => {
    const pal = palette(t)[mode]
    const v = Object.entries(pal).map(([k, c]) => `--${k}:${toHex(c)}`).join(';')
    const sw = ['primary', 'primary-subtle', 'accent', 'muted', 'border', 'destructive', 'success', 'warning']
      .map((k) => `<div class="sw" style="background:var(--${k})" title="${k}"><span>${k}</span></div>`).join('')
    return `<section class="card" style="${v}">
  <header><strong>${t.label}</strong><small>${mode}</small></header>
  <div class="swatches">${sw}</div>
  <article class="post"><div class="avatar"></div><div><b>Ada Lovelace</b> <span class="muted">@ada · 2h</span>
  <p>Shipping a design system generated from one colour. Tokens in, consistency out.</p>
  <div class="row"><button class="primary">Post</button><button class="ghost">Follow</button><span class="badge">New</span></div></div></article>
</section>`
  }
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Heliostack themes</title><style>
body{margin:0;padding:24px;font:14px/1.45 system-ui,sans-serif;background:#f4f4f5;color:#111}
@media (prefers-color-scheme:dark){body{background:#0b0b0c;color:#eee}}
h1{font-size:20px;margin:0 0 4px}p.lead{margin:0 0 20px;opacity:.7}
.grid{display:grid;gap:16px;grid-template-columns:repeat(auto-fill,minmax(320px,1fr))}
.card{background:var(--background);color:var(--foreground);border:1px solid var(--border);border-radius:14px;padding:16px}
.card header{display:flex;justify-content:space-between;margin-bottom:12px}.card small{color:var(--muted-foreground)}
.swatches{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:14px}
.sw{height:44px;border-radius:8px;border:1px solid var(--border);display:flex;align-items:end;padding:3px 5px}
.sw span{font-size:10px;background:var(--background);color:var(--foreground);padding:0 3px;border-radius:3px}
.post{display:flex;gap:10px;background:var(--card);color:var(--card-foreground);border:1px solid var(--border);border-radius:12px;padding:12px}
.post p{margin:4px 0 10px}.avatar{flex:none;width:36px;height:36px;border-radius:50%;background:var(--primary-subtle);border:2px solid var(--primary)}
.muted{color:var(--muted-foreground)}.row{display:flex;gap:8px;align-items:center}
button{font:inherit;font-weight:600;border-radius:999px;padding:6px 14px;border:1px solid transparent;cursor:pointer}
.primary{background:var(--primary);color:var(--primary-foreground)}
.ghost{background:transparent;color:var(--foreground);border-color:var(--border)}
.badge{background:var(--primary-subtle);color:var(--foreground);font-size:12px;padding:2px 8px;border-radius:999px}
</style></head><body><h1>Heliostack theme presets</h1><p class="lead">Each preset in light and dark. Pick one or more; the first becomes the default.</p>
<div class="grid">${themes.map((t) => card(t, 'light') + card(t, 'dark')).join('\n')}</div></body></html>`
}

function report(themes) {
  const pairs = [
    ['foreground', 'background', 7], ['muted-foreground', 'background', 4.5], ['card-foreground', 'card', 7],
    ['primary-foreground', 'primary', 4.5], ['primary', 'background', 3], ['destructive-foreground', 'destructive', 4.5],
    ['border', 'background', 1.2],
  ]
  let failures = 0
  for (const t of themes) {
    for (const mode of ['light', 'dark']) {
      const pal = palette(t)[mode]
      const rows = pairs.map(([fg, bg, min]) => {
        const ratio = contrast(pal[fg], pal[bg])
        const ok = ratio >= min
        if (!ok) failures++
        return `  ${ok ? '✓' : '✗'} ${fg} on ${bg}: ${ratio.toFixed(2)} (min ${min})`
      })
      console.log(`${t.id} / ${mode}\n${rows.join('\n')}`)
    }
  }
  return failures
}

// ---------------------------------------------------------------- CLI

function args(argv) {
  const out = { _: [] }
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) out[argv[i].slice(2)] = argv[i + 1]?.startsWith('--') ? true : (argv[++i] ?? true)
    else out._.push(argv[i])
  }
  return out
}

function loadConfig(path) {
  if (!existsSync(path)) return null
  return JSON.parse(readFileSync(path, 'utf8'))
}

function main() {
  const a = args(process.argv.slice(2))
  const [cmd] = a._
  const cfgPath = resolve(a.config ?? 'design-system.json')
  const cfg = loadConfig(cfgPath)
  const projectDirs = (cfg?.themeDirs ?? ['design/themes']).map((d) => resolve(dirname(cfgPath), d))
  const presets = readPresets([BUILTIN_DIR, ...projectDirs])
  const ids = a.themes ? String(a.themes).split(',') : null

  switch (cmd) {
    case 'list':
      for (const p of presets.values()) console.log(`${p.id.padEnd(10)} ${p.label.padEnd(10)} ${p.description} [${p.source}]`)
      break
    case 'preview': {
      const out = resolve(a.out ?? 'theme-preview.html')
      writeFileSync(out, emitPreview(ids ? pick(presets, ids) : [...presets.values()]))
      console.log(out)
      break
    }
    case 'from-color': {
      const hex = a._[1]
      if (!hex || !a.id) throw new Error('Usage: from-color <#hex> --id <id> [--label L] [--dir design/themes]')
      const [L, C, H] = hexToOklch(hex)
      const neutralHue = C < 0.02 ? 0 : H
      const preset = {
        id: a.id,
        label: a.label ?? a.id[0].toUpperCase() + a.id.slice(1),
        description: `Custom theme from brand colour ${hex}.`,
        brand: hex,
        neutral: { hue: +neutralHue.toFixed(1), chroma: C < 0.02 ? 0 : 0.01 },
        primary: {
          hue: +H.toFixed(1),
          chroma: +C.toFixed(3),
          light: +Math.min(Math.max(L, 0.45), 0.66).toFixed(3),
          dark: +Math.min(Math.max(L, 0.66), 0.8).toFixed(3),
        },
      }
      const dir = resolve(a.dir ?? projectDirs[0])
      mkdirSync(dir, { recursive: true })
      const file = join(dir, `${a.id}.json`)
      writeFileSync(file, JSON.stringify(preset, null, 2) + '\n')
      console.log(file)
      break
    }
    case 'check': {
      const list = ids ? pick(presets, ids) : cfg ? pick(presets, cfg.themes) : [...presets.values()]
      process.exitCode = report(list) ? 1 : 0
      break
    }
    case 'generate': {
      if (!cfg) throw new Error(`No config at ${cfgPath}. Run ds-init first.`)
      const themes = pick(presets, cfg.themes)
      const out = resolve(dirname(cfgPath), cfg.paths.tokens)
      mkdirSync(dirname(out), { recursive: true })
      writeFileSync(out, cfg.strategy === 'shadcn' ? emitShadcn(cfg, themes) : emitNative(cfg, themes))
      console.log(out)
      break
    }
    default:
      console.log(readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').slice(1, 9).join('\n'))
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main()
