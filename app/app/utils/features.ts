/**
 * Флаги функций из env (`NUXT_PUBLIC_*`).
 *
 * Нужны, чтобы временно убирать куски интерфейса без правок кода:
 * выставил переменную в `wrangler.jsonc`/`.env` — и после деплоя фича скрыта.
 */

/**
 * Активен ли премиум: корона в хедере, покупка, упоминания в профиле и подсказках.
 * По умолчанию выключен — включается `NUXT_PUBLIC_PREMIUM_ACTIVE=true`.
 */
export function isFeaturePremiumActive(): boolean {
  const raw = String(useRuntimeConfig().public?.premiumActive ?? '')
    .trim()
    .toLowerCase()

  // По умолчанию премиум выключен: включается только явным true/1/on.
  return ['1', 'true', 'yes', 'on'].includes(raw)
}

