import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

// AES-256-GCM for values that must be readable again (tax IDs, account numbers).
// Stored as enc:v1:<iv>:<auth tag>:<ciphertext>, all base64.
const PREFIX = 'enc:v1:'

function getKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY
  if (!raw) throw new Error('ENCRYPTION_KEY is not set')

  const key = Buffer.from(raw, 'base64')
  if (key.length !== 32) throw new Error('ENCRYPTION_KEY must be 32 bytes, base64 encoded')

  return key
}

export function isEncrypted(value: string): boolean {
  return value.startsWith(PREFIX)
}

export function encrypt(plaintext: string): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', getKey(), iv)
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])

  return PREFIX + [iv, cipher.getAuthTag(), ciphertext].map((b) => b.toString('base64')).join(':')
}

// Values saved before encryption was added are returned as they are, until
// scripts/encrypt-existing.ts has converted them.
export function decrypt(stored: string): string {
  if (!isEncrypted(stored)) return stored

  const [iv, tag, ciphertext] = stored
    .slice(PREFIX.length)
    .split(':')
    .map((part) => Buffer.from(part, 'base64'))

  const decipher = createDecipheriv('aes-256-gcm', getKey(), iv)
  decipher.setAuthTag(tag)

  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8')
}

// An empty value is saved as null rather than as an encrypted empty string.
export function encryptIfPresent(value: string | null | undefined): string | null {
  return value ? encrypt(value) : null
}
