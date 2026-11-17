import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'

const readJson = (path) => JSON.parse(readFileSync(new URL('../' + path, import.meta.url), 'utf8'))

function sortedObject(value) {
  if (typeof value !== 'object' || value === null) return value
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, sortedObject(value[key])]))
}

export function buildLegalRelease() {
  const { version } = readJson('src/content/legalRelease.json')
  const documents = {}
  for (const language of ['pt-BR', 'en']) {
    const overrides = readJson('src/i18n/preview-copy/' + language + '.json')
    documents[language] = {}
    for (const namespace of ['termsOfUsePage', 'privacyPolicyPage']) {
      documents[language][namespace] = {
        ...readJson('src/content/' + language + '/' + namespace + '.i18n.json'),
        ...overrides[namespace],
      }
    }
    assert.equal(documents[language].termsOfUsePage.termsOfUsePage_vigencia_em_revisao, version)
    assert.equal(documents[language].privacyPolicyPage.privacyPolicyPage_vigencia_em_revisao, version)
  }
  const content = JSON.stringify(sortedObject({ version, scope: 'local-preview', documents }), null, 2)
  return { version, content, sha256: createHash('sha256').update(content).digest('hex') }
}

export function verifyLegalRelease() {
  const manifest = readJson('src/content/legalRelease.json')
  assert.equal(buildLegalRelease().sha256, manifest.sha256,
    'Legal documents changed. Create a new version and immutable snapshot before recording acceptance.')
}
