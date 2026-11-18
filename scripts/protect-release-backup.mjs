import { createReadStream, createWriteStream, readFileSync, appendFileSync, statSync, unlinkSync, openSync, readSync, closeSync } from 'node:fs'
import { createPublicKey, createCipheriv, createDecipheriv, publicEncrypt, privateDecrypt, randomBytes, constants } from 'node:crypto'
import { pipeline } from 'node:stream/promises'

// Public CI artifacts must never contain the unencrypted site snapshot.
export async function encryptBackup(input, output, publicPem) {
  const publicKey = createPublicKey(publicPem)
  if (publicKey.asymmetricKeyType !== 'rsa' || publicKey.asymmetricKeyDetails.modulusLength < 3072) throw new Error('RSA key must have at least 3072 bits')
  const key = randomBytes(32)
  const iv = randomBytes(12)
  const wrapped = publicEncrypt({ key: publicKey, oaepHash: 'sha256', padding: constants.RSA_PKCS1_OAEP_PADDING }, key)
  const header = Buffer.from(JSON.stringify({ version: 1, iv: iv.toString('base64'), wrapped: wrapped.toString('base64') }))
  const size = Buffer.alloc(4)
  size.writeUInt32BE(header.length)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  cipher.setAAD(header)
  const destination = createWriteStream(output, { flags: 'wx', mode: 0o600 })
  destination.write(size)
  destination.write(header)
  await pipeline(createReadStream(input), cipher, destination)
  appendFileSync(output, cipher.getAuthTag())
  key.fill(0)
}

export async function decryptBackup(input, output, privatePem) {
  const length = statSync(input).size
  const descriptor = openSync(input, 'r')
  let size, header
  const tag = Buffer.alloc(16)
  try {
    const prefix = Buffer.alloc(4)
    readSync(descriptor, prefix, 0, 4, 0)
    size = prefix.readUInt32BE()
    if (size > 4096 || length < size + 20) throw new Error('Invalid backup envelope')
    header = Buffer.alloc(size)
    readSync(descriptor, header, 0, size, 4)
    readSync(descriptor, tag, 0, 16, length - 16)
  } finally { closeSync(descriptor) }
  const envelope = JSON.parse(header)
  if (envelope.version !== 1) throw new Error('Unsupported backup version')
  const key = privateDecrypt({ key: privatePem, oaepHash: 'sha256', padding: constants.RSA_PKCS1_OAEP_PADDING }, Buffer.from(envelope.wrapped, 'base64'))
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(envelope.iv, 'base64'))
  decipher.setAAD(header)
  decipher.setAuthTag(tag)
  const destination = createWriteStream(output, { flags: 'wx', mode: 0o600 })
  let created = false
  destination.on('open', () => { created = true })
  try {
    await pipeline(createReadStream(input, { start: size + 4, end: statSync(input).size - 17 }), decipher, destination)
  } catch (error) {
    if (created) unlinkSync(output)
    throw error
  } finally { key.fill(0) }
}

if (process.argv[1]?.replaceAll('\\', '/').endsWith('/protect-release-backup.mjs')) {
  const [operation, input, output, keyPath] = process.argv.slice(2)
  if (operation === 'encrypt') await encryptBackup(input, output, Buffer.from(process.env.BACKUP_PUBLIC_KEY_BASE64, 'base64'))
  else if (operation === 'decrypt') await decryptBackup(input, output, readFileSync(keyPath))
  else throw new Error('Use encrypt input output or decrypt input output private-key-file')
}
