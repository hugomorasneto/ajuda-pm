import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'

const readJson = (url) => JSON.parse(readFileSync(url, 'utf8'))
const locales = new URL('../src/i18n/locales/', import.meta.url)
const catalogs = (language) => readdirSync(new URL(language + '/', locales)).sort()
const read = (language, name) => readJson(new URL(language + '/' + name, locales))
const placeholders = (value) => [...value.matchAll(/\{\{\s*(\w+)\s*\}\}/g)].map((match) => match[1]).sort()

function compare(pt, en, path) {
  assert.deepEqual(Object.keys(pt).sort(), Object.keys(en).sort(), 'Different keys in ' + path)
  for (const [key, entry] of Object.entries(pt)) {
    const entryPath = path + '.' + key
    if (typeof entry === 'object') {
      compare(entry, en[key], entryPath)
    } else {
      assert.ok(entry.trim() && typeof en[key] === 'string' && en[key].trim(), 'Empty translation in ' + entryPath)
      assert.deepEqual(placeholders(entry), placeholders(en[key]), 'Different placeholders in ' + entryPath)
    }
  }
}

assert.deepEqual(catalogs('pt-BR'), catalogs('en'), 'Different catalog namespaces')
for (const name of catalogs('pt-BR')) compare(read('pt-BR', name), read('en', name), name)

const content = new URL('../src/content/', import.meta.url)
const editorialFiles = (lang) => readdirSync(new URL(lang + '/', content))
  .filter((name) => name.endsWith('.json')).sort()
assert.deepEqual(editorialFiles('pt-BR'), editorialFiles('en'), 'Different editorial catalogs')
for (const name of editorialFiles('pt-BR')) {
  const load = (lang) => readJson(new URL(lang + '/' + name, content))
  compare(load('pt-BR'), load('en'), name)
}

const ptAbout = (await import('../src/content/pt-BR/about.js')).default
const enAbout = (await import('../src/content/en/about.js')).default
compare(ptAbout, enAbout, 'about content')

const preview = new URL('../src/i18n/preview-copy/', import.meta.url)
const ptPreview = readJson(new URL('pt-BR.json', preview))
const enPreview = readJson(new URL('en.json', preview))
compare(ptPreview, enPreview, 'preview copy')

const richTextTags = (value) => (value.match(/<\/?[a-z][a-z0-9]*>/gi) ?? []).sort()
for (const [language, overrides] of [['pt-BR', ptPreview], ['en', enPreview]]) {
  for (const [namespace, entries] of Object.entries(overrides)) {
    const name = namespace + '.json'
    const base = catalogs(language).includes(name)
      ? read(language, name)
      : readJson(new URL(language + '/' + namespace + '.i18n.json', content))

    for (const [key, value] of Object.entries(entries)) {
      const label = language + ' ' + namespace + '.' + key
      assert.equal(typeof base[key], 'string', 'Unknown preview key in ' + label)
      assert.deepEqual(placeholders(value), placeholders(base[key]), 'Different preview placeholders in ' + label)
      assert.deepEqual(richTextTags(value), richTextTags(base[key]), 'Different preview tags in ' + label)
    }
  }
}

console.log('Catálogos do piloto: chaves e parâmetros correspondentes.')
