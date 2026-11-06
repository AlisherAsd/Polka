// Аутентификация: пароли (PBKDF2) и сессии (случайный токен + хеш в D1).
//
// Только WebCrypto — в Cloudflare Workers нет Node-крипты, но есть `crypto.subtle`.
// Пароли не хранятся в открытом виде, токены сессий — только их SHA-256,
// поэтому дамп базы не даёт ни паролей, ни готовых токенов.
import type { H3Event } from 'h3'

/** Итерации PBKDF2: достаточно для MVP и укладывается в лимиты воркера. */
const ITERATIONS = 100_000
const KEY_LENGTH = 32

/** Срок жизни сессии — 30 дней. */
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000

/** Имя cookie с токеном сессии (для сайта; натив шлёт `Authorization: Bearer`). */
export const SESSION_COOKIE = 'polka_session'

export interface UserRow {
  id: string
  email: string
  password_hash: string
  password_salt: string
  iterations: number
  /** 1 — ИИ работает серверным ключом (`OPENROUTER_KEY`). */
  is_premium: number
  created_at: string
}

export interface SessionRow {
  id: string
  user_id: string
  token_hash: string
  user_agent: string | null
  created_at: string
  expires_at: string
}

/** Публичное представление пользователя (без хешей). */
export interface PublicUser {
  id: string
  email: string
  /** Премиум: запросы к ИИ идут серверным ключом. */
  isPremium: boolean
  createdAt: string
}

function toBase64(bytes: Uint8Array): string {
  let binary = ''

  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }

  return btoa(binary)
}

function fromBase64(value: string): Uint8Array {
  const binary = atob(value)
  const bytes = new Uint8Array(binary.length)

  for (let index = 0; index < binary.length; index++) {
    bytes[index] = binary.charCodeAt(index)
  }

  return bytes
}

/** Случайная соль/токен в base64url. */
export function randomToken(bytes = 32): string {
  const buffer = new Uint8Array(bytes)
  crypto.getRandomValues(buffer)

  return toBase64(buffer).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/** SHA-256 в hex — для хранения токена сессии. */
export async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))

  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

/** PBKDF2-SHA256 → base64. */
async function derive(password: string, salt: string, iterations: number): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  )

  // `BufferSource` в TS требует ArrayBuffer, а не TypedArray-оверлей.
  const saltBytes = fromBase64(salt)
  const saltBuffer = saltBytes.buffer.slice(
    saltBytes.byteOffset,
    saltBytes.byteOffset + saltBytes.byteLength,
  ) as ArrayBuffer

  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: saltBuffer, iterations, hash: 'SHA-256' },
    key,
    KEY_LENGTH * 8,
  )

  return toBase64(new Uint8Array(bits))
}

/** Сравнение строк за постоянное время (защита от тайминг-атак). */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false
  }

  let diff = 0

  for (let index = 0; index < a.length; index++) {
    diff |= a.charCodeAt(index) ^ b.charCodeAt(index)
  }

  return diff === 0
}

/** Хеш пароля + соль для записи в базу. */
export async function hashPassword(password: string): Promise<{
  hash: string
  salt: string
  iterations: number
}> {
  const salt = toBase64(crypto.getRandomValues(new Uint8Array(16)))
  const hash = await derive(password, salt, ITERATIONS)

  return { hash, salt, iterations: ITERATIONS }
}

/** Проверка пароля по сохранённому хешу. */
export async function verifyPassword(password: string, user: UserRow): Promise<boolean> {
  const hash = await derive(password, user.password_salt, user.iterations)

  return safeEqual(hash, user.password_hash)
}

/** Простая проверка адреса: достаточно для MVP. */
export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)
}

/** Требования к паролю. */
export const PASSWORD_MIN_LENGTH = 8

/** Строка пользователя → публичный JSON. */
export function toPublicUser(user: UserRow): PublicUser {
  return {
    id: user.id,
    email: user.email,
    isPremium: Boolean(user.is_premium),
    createdAt: user.created_at,
  }
}

/** `event` → устройства для записи в сессию (обрезано, чтобы не раздувать базу). */
export function userAgentOf(event: H3Event): string {
  return (getHeader(event, 'user-agent') ?? '').slice(0, 200)
}
