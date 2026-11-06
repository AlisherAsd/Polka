/**
 * Идентификатор для клиентских сущностей.
 *
 * `crypto.randomUUID()` доступен только в secure context: на `http://localhost`
 * он работает, а при открытии с телефона по локальному IP (`http://192.168.x.x`)
 * — бросает `TypeError`, из-за чего падало создание карточки. Поэтому UUID
 * используем, когда он есть, иначе собираем id из `crypto.getRandomValues`
 * (`crypto` доступен и в небезопасном контексте) или `Math.random`.
 */
export function createId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    try {
      return crypto.randomUUID()
    } catch {
      // Не-secure context — уходим на запасной вариант ниже.
    }
  }

  const bytes = new Uint8Array(16)

  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(bytes)
  } else {
    for (let i = 0; i < bytes.length; i += 1) {
      bytes[i] = Math.floor(Math.random() * 256)
    }
  }

  // Формат UUID v4.
  bytes[6] = (bytes[6]! & 0x0f) | 0x40
  bytes[8] = (bytes[8]! & 0x3f) | 0x80

  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0'))

  return [
    hex.slice(0, 4).join(''),
    hex.slice(4, 6).join(''),
    hex.slice(6, 8).join(''),
    hex.slice(8, 10).join(''),
    hex.slice(10, 16).join(''),
  ].join('-')
}
