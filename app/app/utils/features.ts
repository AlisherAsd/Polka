/**
 * Флаги функций из env (`NUXT_PUBLIC_*`).
 *
 * Нужны, чтобы временно убирать куски интерфейса без правок кода:
 * выставил переменную в `wrangler.jsonc`/`.env` — и после деплоя фича скрыта.
 */

/** Активен ли премиум: корона в хедере, покупка, упоминания в профиле и подсказках. */
export function isFeaturePremiumActive(): boolean {
  const raw = String(useRuntimeConfig().public?.premiumActive ?? '')
    .trim()
    .toLowerCase()

  // Пусто — фича включена (поведение до появления флага).
  if (raw.length === 0) {
    return true
  }

  return ['1', 'true', 'yes', 'on'].includes(raw)
}

