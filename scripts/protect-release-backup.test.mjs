import { test } from 'node:test'
import assert from 'node:assert/strict'
import { generateKeyPairSync } from 'node:crypto'
import { mkdtempSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { encryptBackup, decryptBackup } from './protect-release-backup.mjs'

test('backup decrypts exactly, rejects tampering and preserves existing recovery files', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'prodforge-backup-test-'))
  const { publicKey, privateKey } = generateKeyPairSync('rsa', {
    modulusLength: 3072,
    publicKeyEncoding: { type: 'spki', format: 'pem' }, privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  })
  const path = (name) => join(directory, name)
  try {
    writeFileSync(path('input'), 'Fictional site snapshot: recuperação com acentuação.')
    await encryptBackup(path('input'), path('encrypted'), publicKey)
    await decryptBackup(path('encrypted'), path('recovered'), privateKey)
    assert.deepEqual(readFileSync(path('input')), readFileSync(path('recovered')))
    await assert.rejects(decryptBackup(path('encrypted'), path('recovered'), privateKey))
    assert.deepEqual(readFileSync(path('input')), readFileSync(path('recovered')))
    const tampered = readFileSync(path('encrypted'))
    tampered[tampered.length - 17] ^= 1
    writeFileSync(path('tampered'), tampered)
    await assert.rejects(decryptBackup(path('tampered'), path('invalid'), privateKey))
    assert.equal(existsSync(path('invalid')), false)
  } finally { rmSync(directory, { recursive: true, force: true }) }
})
