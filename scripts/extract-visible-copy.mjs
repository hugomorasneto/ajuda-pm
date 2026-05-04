import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const DEFAULT_TARGETS = [
  'src/App.jsx',
  'src/components',
  'src/content',
  'src/hooks/usePageMetadata.js',
  'src/layout',
  'src/pages',
  'aprender',
  'index.html',
  'public/site.webmanifest',
]

const TARGET_EXTENSIONS = new Set(['.js', '.jsx', '.html', '.json'])
const IGNORED_DIRS = new Set([
  '.git',
  'artifacts',
  'dist',
  'dist-ssr',
  'docs',
  'node_modules',
  'temp',
])

const MACHINE_KEYS = new Set([
  'aria-hidden',
  'charset',
  'class',
  'className',
  'clipPath',
  'contentEditable',
  'crossOrigin',
  'cx',
  'cy',
  'd',
  'display',
  'emoji',
  'fill',
  'height',
  'href',
  'icon',
  'id',
  'key',
  'lang',
  'name',
  'path',
  'property',
  'purpose',
  'rel',
  'role',
  'sizes',
  'slug',
  'src',
  'srcSet',
  'stroke',
  'style',
  'targetGuideSlug',
  'to',
  'type',
  'value',
  'viewBox',
  'width',
  'x',
  'xmlns',
  'y',
])

const VISIBLE_KEYS = new Set([
  'alt',
  'aria-label',
  'content',
  'description',
  'eyebrow',
  'label',
  'message',
  'microcopy',
  'note',
  'placeholder',
  'text',
  'title',
])

const MACHINE_TEXT_PATTERNS = [
  /^@(?:context|type)$/i,
  /^(?:Article|Organization|ImageObject|WebSite|BreadcrumbList)$/u,
  /^(?:articleSection|inLanguage|mainEntityOfPage|datePublished|dateModified)$/u,
  /^(?:index,follow|width=device-width,\s*initial-scale=1\.0)$/u,
  /^(?:pt_BR|pt-BR)$/u,
  /^(?:summary_large_image|image\/png|application\/ld\+json)$/u,
  /^(?:meta|link)\[[^\]]+\]$/u,
  /^(?:Blocking|Empty|right|tool|property|width|height|theme|sidebar)$/u,
  /^\(min-width:\s*\d+px\)$/u,
]

function toPosix(relativePath) {
  return relativePath.split(path.sep).join('/')
}

function walk(entryPath, files = []) {
  const stat = fs.statSync(entryPath)

  if (stat.isDirectory()) {
    if (IGNORED_DIRS.has(path.basename(entryPath))) return files

    for (const child of fs.readdirSync(entryPath)) {
      walk(path.join(entryPath, child), files)
    }

    return files
  }

  if (TARGET_EXTENSIONS.has(path.extname(entryPath))) {
    files.push(entryPath)
  }

  return files
}

export function listCopyFiles() {
  return DEFAULT_TARGETS.flatMap((target) => {
    const absolutePath = path.join(ROOT_DIR, target)
    if (!fs.existsSync(absolutePath)) return []
    return walk(absolutePath)
  }).sort((left, right) => left.localeCompare(right))
}

function buildLineStarts(source) {
  const starts = [0]

  for (let index = 0; index < source.length; index += 1) {
    if (source[index] === '\n') starts.push(index + 1)
  }

  return starts
}

function getLineColumn(lineStarts, offset) {
  let low = 0
  let high = lineStarts.length - 1

  while (low <= high) {
    const mid = Math.floor((low + high) / 2)
    if (lineStarts[mid] <= offset) {
      low = mid + 1
    } else {
      high = mid - 1
    }
  }

  const lineIndex = Math.max(0, high)
  return {
    line: lineIndex + 1,
    column: offset - lineStarts[lineIndex] + 1,
  }
}

function getLineText(source, lineStarts, line) {
  const start = lineStarts[line - 1] ?? 0
  const end = source.indexOf('\n', start)
  return source.slice(start, end === -1 ? source.length : end)
}

function decodeHtmlEntities(value) {
  return value
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
}

function normalizeCopy(value) {
  return decodeHtmlEntities(value)
    .replace(/\$\{[\s\S]*?\}/g, ' ')
    .replace(/\\[nrt]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function getPrecedingKey(lineText, column) {
  const before = lineText.slice(0, Math.max(0, column - 1))
  const match = before.match(/([A-Za-z_$][\w$-]*)\s*(?::|=)\s*$/)
  return match?.[1] ?? ''
}

function isMachineToken(text) {
  if (/^https?:\/\//i.test(text)) return true
  if (/^\.{1,2}\//.test(text)) return true
  if (/^\/\S*$/.test(text)) return true
  if (/^[#.][A-Za-z0-9_-]+$/.test(text)) return true
  if (/^[A-Za-z0-9_-]+\/[A-Za-z0-9_./-]+$/.test(text)) return true
  if (/\.(?:css|gif|ico|jpg|js|jsx|png|svg|webp)(?:\?|$)/i.test(text)) return true
  if (/^[a-z0-9]+(?:-[a-z0-9]+)+$/.test(text)) return true
  if (/^[a-z0-9_.:-]+$/.test(text) && !text.includes(' ')) return true
  if (/^[A-Z0-9_:-]+$/.test(text) && text.length > 3) return true
  if (/^[A-Za-z_$][\w$]*$/.test(text) && /[a-z][A-Z]/.test(text)) return true
  if (/^[a-z0-9_-]+(?:\s+[a-z0-9_-]+)+$/.test(text) && text.includes('-')) return true
  if (/^[a-z0-9.\s-]+$/i.test(text) && /\d+(?:px|rem|em|s)\b/i.test(text)) return true
  if (/^\W*\)?\s*(?:const|return|:|\?)/u.test(text)) return true
  if (/^[\d.:%#-]+$/.test(text)) return true
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) return true
  return false
}

function isMachineText(text) {
  return MACHINE_TEXT_PATTERNS.some((pattern) => pattern.test(text))
}

function isMachineLine(lineText) {
  return (
    /^\s*import\s/u.test(lineText) ||
    /\bfrom\s+['"`]/u.test(lineText) ||
    /\bconsole\./u.test(lineText) ||
    /\bclassName\s*[:=]/u.test(lineText) ||
    /\b(?:data|aria)-[a-z-]+\s*=\s*['"`](?![^'"`]*[A-ZÀ-Ú])/u.test(lineText)
  )
}

function shouldInclude(item) {
  const text = normalizeCopy(item.text)
  if (!/\p{L}/u.test(text)) return false
  if (text.length < 2) return false
  if (isMachineText(text)) return false
  if (isMachineToken(text)) return false
  if (isMachineLine(item.lineText)) return false

  const key = getPrecedingKey(item.lineText, item.column)
  if (key && MACHINE_KEYS.has(key) && !VISIBLE_KEYS.has(key)) return false

  return true
}

function readQuotedString(source, start) {
  const quote = source[start]
  let index = start + 1
  let value = ''

  while (index < source.length) {
    const char = source[index]

    if (char === '\\') {
      const next = source[index + 1]
      value += next === 'n' || next === 'r' || next === 't' ? ' ' : (next ?? '')
      index += 2
      continue
    }

    if (quote === '`' && char === '$' && source[index + 1] === '{') {
      let depth = 1
      index += 2
      while (index < source.length && depth > 0) {
        if (source[index] === '{') depth += 1
        if (source[index] === '}') depth -= 1
        index += 1
      }
      value += ' '
      continue
    }

    if (char === quote) {
      return { value, end: index + 1 }
    }

    value += char
    index += 1
  }

  return { value, end: index }
}

function collectQuotedStrings(source, file) {
  const lineStarts = buildLineStarts(source)
  const items = []
  let index = 0

  while (index < source.length) {
    const char = source[index]

    if (char !== "'" && char !== '"' && char !== '`') {
      index += 1
      continue
    }

    const { value, end } = readQuotedString(source, index)
    const position = getLineColumn(lineStarts, index)
    const lineText = getLineText(source, lineStarts, position.line)
    const text = normalizeCopy(value)

    if (text) {
      items.push({
        file,
        line: position.line,
        column: position.column,
        lineText,
        text,
        source: 'string',
      })
    }

    index = end
  }

  return items
}

function collectJsxText(source, file) {
  const lineStarts = buildLineStarts(source)
  const items = []
  const pattern = />\s*([^<>{}][^<>{}]*?)\s*</gs

  for (const match of source.matchAll(pattern)) {
    const text = normalizeCopy(match[1])
    if (!text) continue

    const offset = match.index + match[0].indexOf(match[1])
    const position = getLineColumn(lineStarts, offset)
    items.push({
      file,
      line: position.line,
      column: position.column,
      lineText: getLineText(source, lineStarts, position.line),
      text,
      source: 'jsx-text',
    })
  }

  return items
}

function collectHtmlTitleText(source, file) {
  const lineStarts = buildLineStarts(source)
  const items = []
  const pattern = /<title[^>]*>([\s\S]*?)<\/title>/gi

  for (const match of source.matchAll(pattern)) {
    const text = normalizeCopy(match[1])
    if (!text) continue

    const offset = match.index + match[0].indexOf(match[1])
    const position = getLineColumn(lineStarts, offset)
    items.push({
      file,
      line: position.line,
      column: position.column,
      lineText: getLineText(source, lineStarts, position.line),
      text,
      source: 'html-title',
    })
  }

  return items
}

export function collectVisibleCopy() {
  return listCopyFiles().flatMap((absolutePath) => {
    const source = fs.readFileSync(absolutePath, 'utf8')
    const relativePath = toPosix(path.relative(ROOT_DIR, absolutePath))
    const items = [
      ...collectQuotedStrings(source, relativePath),
      ...collectJsxText(source, relativePath),
      ...collectHtmlTitleText(source, relativePath),
    ]

    return items
      .map((item) => ({ ...item, text: normalizeCopy(item.text) }))
      .filter(shouldInclude)
  })
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  for (const item of collectVisibleCopy()) {
    process.stdout.write(`@@ ${item.file}:${item.line}:${item.column}\n`)
    process.stdout.write(`${item.text}\n`)
  }
}
