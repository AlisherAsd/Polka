// Подготовка окружения до первого обращения к wrangler/miniflare.
// Они пишут служебные данные в ~/Library/Preferences/.wrangler (может быть
// недоступен), поэтому конфиг-каталог уводим внутрь проекта.
import { mkdirSync } from 'node:fs'
import { join, resolve } from 'node:path'

const configHome = resolve(import.meta.dirname, '../.wrangler/config')

mkdirSync(configHome, { recursive: true })
process.env.XDG_CONFIG_HOME = join(configHome, 'xdg')
