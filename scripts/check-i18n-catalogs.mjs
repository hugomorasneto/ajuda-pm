import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'

const locales = new URL('../src/i18n/locales/', import.meta.url)
const catalogs = (language) => readdirSync(new URL(language + '/', locales)).sort()
const read = (language, name) => JSON.parse(readFileSync(new URL(language + '/' + name, locales), 'utf8'))
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

const ptAbout = (await import('../src/content/pt-BR/about.js')).default
const enAbout = (await import('../src/content/en/about.js')).default
compare(ptAbout, enAbout, 'about content')
console.log('Catálogos do piloto: chaves e parâmetros correspondentes.')
