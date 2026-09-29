#!/usr/bin/env node
// Heliostack token checker — keeps component CSS inside the design-system vocabulary.
//
//   node check-tokens.mjs [--root src] [--config design-system.json]
//
// Requires every *.css file to start with the cascade layer order statement, then flags, per line
// (except in the generated tokens file):
//   raw colours     #fff, rgb(), hsl(), oklch(), named colours like `red`
//   raw spacing     px/rem values in margin/padding/gap/inset (1px/2px hairlines are fine)
//   raw type        font-size / line-height / font-weight not from a token
//   raw radius      border-radius not from a token
//   raw z-index     numbers other than 0/1/-1
// Silence a deliberate exception with a trailing comment:  /* ds-allow: reason */

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'

const argv = process.argv.slice(2)
const opt = (name, fallback) => {
  const i = argv.indexOf(`--${name}`)
  return i >= 0 ? argv[i + 1] : fallback
}
const configPath = resolve(opt('config', 'design-system.json'))
const config = existsSync(configPath) ? JSON.parse(readFileSync(configPath, 'utf8')) : {}
const root = resolve(opt('root', 'src'))
const tokensFile = config.paths?.tokens ? resolve(config.paths.tokens) : null

if (config.strategy === 'shadcn') {
  console.log('ds check-tokens: shadcn strategy — Tailwind classes are the vocabulary; skipping CSS scan.')
  process.exit(0)
}

const RULES = [
  { name: 'raw colour', test: (prop, value) => /#[0-9a-f]{3,8}\b|\b(rgba?|hsla?|oklch|oklab|lab|lch)\(/i.test(value) || (/(^|-)color$|^(background|fill|stroke|border|outline)$/.test(prop) && /\b(red|blue|green|black|white|gray|grey|orange|yellow|purple|pink)\b/.test(value)) },
  { name: 'raw spacing', test: (prop, value) => /^(margin|padding|gap|row-gap|column-gap|inset|top|right|bottom|left)(-|$)/.test(prop) && /(?<![\w-])(?!0(px|rem)?\b)(\d*\.?\d+)(px|rem|em)\b/.test(value.replace(/\b[12]px\b/g, '')) },
  { name: 'raw type', test: (prop, value) => /^(font-size|line-height|font-weight)$/.test(prop) && !/var\(--|inherit|normal|^1$|^0$/.test(value) },
  { name: 'raw radius', test: (prop, value) => /radius$/.test(prop) && !/var\(--|^0$|inherit|50%/.test(value) },
  { name: 'raw z-index', test: (prop, value) => prop === 'z-index' && !/var\(--|^-?[01]$|auto/.test(value) },
]

function* walk(dir) {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry.startsWith('.')) continue
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) yield* walk(full)
    else if (entry.endsWith('.css')) yield full
  }
}

const LAYER_ORDER = '@layer reset, tokens, base, components, utilities;'

let problems = 0
for (const file of walk(root)) {
  const lines = readFileSync(file, 'utf8').split('\n')
  // Bundlers may load any stylesheet first, and the first layer mention fixes the cascade order.
  if (lines[0]?.trim() !== LAYER_ORDER) {
    problems++
    console.log(`${relative(process.cwd(), file)}:1  missing layer order  →  first line must be: ${LAYER_ORDER}`)
  }
  if (tokensFile && resolve(file) === tokensFile) continue
  lines.forEach((line, i) => {
    if (line.includes('ds-allow')) return
    const m = line.match(/^\s*([a-z-]+)\s*:\s*([^;]+);?/)
    if (!m || m[1].startsWith('--')) return
    const [, prop, value] = m
    for (const rule of RULES) {
      if (rule.test(prop, value.trim())) {
        problems++
        console.log(`${relative(process.cwd(), file)}:${i + 1}  ${rule.name}  →  ${line.trim()}`)
      }
    }
  })
}

if (problems) {
  console.log(`\n${problems} value(s) outside the design system. Use tokens from ${config.paths?.tokens ?? 'tokens.css'}, or add /* ds-allow: reason */.`)
  process.exit(1)
}
console.log('ds check-tokens: ok')
