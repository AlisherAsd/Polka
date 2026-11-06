/**
 * Цветовая схема Nuxt UI.
 *
 * Nuxt UI v4 кладёт в `appConfig.ui.colors` дефолты (`primary: 'green'`,
 * `neutral: 'slate'`). Здесь они переопределяются: `primary` указывает на наши
 * токены `--color-primary-*` из `main.css`, нейтраль — на `--color-neutral-*`.
 * Без этого кнопки красились во встроенный зелёный, особенно заметно в
 * статической сборке для нативного приложения.
 */
export default defineAppConfig({
  ui: {
    colors: {
      primary: 'primary',
      neutral: 'neutral',
    },
  },
})
