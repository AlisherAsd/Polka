<script setup lang="ts">
/**
 * Поиск по сайту в хедере: страницы, разделы руководства и действия.
 *
 * Поле — то же, что было; ниже выпадает панель с результатами:
 * ↑↓ выбор, Enter — переход/действие, Esc — закрыть. `⌘K` (macOS) / `Ctrl+K`
 * фокусирует поле из любого места приложения.
 */
import type { SiteEntry } from '~/data/siteIndex'
import { searchSite } from '~/utils/siteSearch'

/** Подпись хоткея под текущую платформу: на macOS «⌘K», на остальных «Ctrl+K». */
const hotkeyLabel = computed<string>(() => {
  if (!import.meta.client || typeof navigator === 'undefined') {
    return 'Ctrl+K'
  }

  return /Mac|iPhone|iPad/i.test(navigator.platform || navigator.userAgent) ? '⌘K' : 'Ctrl+K'
})

const query = ref<string>('')
const isOpen = ref<boolean>(false)
const activeIndex = ref<number>(0)
const inputEl = ref<{ inputRef?: HTMLInputElement } | null>(null)

const { openModal: openAddModal } = useAddModal()
const { openModal: openProfileModal } = useProfileModal()
const { openModal: openKeyModal } = useAiKeyModal()
const { openModal: openPremiumModal } = usePremiumModal()
const { openModal: openAuthModal } = useAuthModal()
const { openSidePanel, closeSidePanel } = useSidePanel()
const { rootFolder } = useFiles()
const { isAuth, signOut } = useAuth()
const notify = useNotify()

const results = computed<SiteEntry[]>(() => searchSite(query.value))

watch(results, () => {
  activeIndex.value = 0
})

/** Выполняет пункт: переход или открытие нужной модалки. */
async function runEntry(entry: SiteEntry): Promise<void> {
  isOpen.value = false
  query.value = ''

  if (entry.to) {
    await navigateTo(entry.to)

    return
  }

  switch (entry.action) {
    case 'add-link':
      if (!isAuth.value) {
        openAuthModal()
        break
      }

      openAddModal()
      break
    case 'go-board': {
      const tabs = useBoardTabs()
      tabs.restore()

      if (rootFolder.value) {
        tabs.open(rootFolder.value.id, rootFolder.value.name)
        await navigateTo({ path: '/board', query: { folder: rootFolder.value.id } })
        break
      }

      await navigateTo('/board')
      break
    }
    case 'open-side-panel':
      openSidePanel()
      break
    case 'close-side-panel':
      closeSidePanel()
      break
    case 'open-profile':
      openProfileModal()
      break
    case 'open-key':
      openKeyModal()
      break
    case 'open-premium':
      openPremiumModal()
      break
    case 'sign-in':
      openAuthModal()
      break
    case 'sign-out':
      if (!isAuth.value) {
        notify.error('Вы не вошли в аккаунт')
        break
      }

      await signOut()
      notify.success('Вы вышли из аккаунта')
      break
    default:
      break
  }
}

function move(delta: number): void {
  if (results.value.length === 0) {
    return
  }

  const next = activeIndex.value + delta
  const size = results.value.length

  activeIndex.value = (next + size) % size
}

function handleKeydown(event: KeyboardEvent): void {
  if (event.key === 'ArrowDown') {
    event.preventDefault()
    isOpen.value = true
    move(1)

    return
  }

  if (event.key === 'ArrowUp') {
    event.preventDefault()
    isOpen.value = true
    move(-1)

    return
  }

  if (event.key === 'Enter') {
    const entry = results.value[activeIndex.value]

    if (entry) {
      event.preventDefault()
      void runEntry(entry)
    }

    return
  }

  if (event.key === 'Escape') {
    isOpen.value = false
    query.value = ''

    return
  }

  isOpen.value = true
}

/** `⌘K` / `Ctrl+K` — фокус в поиск. */
function handleGlobalKeydown(event: KeyboardEvent): void {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault()
    isOpen.value = true
    inputEl.value?.inputRef?.focus()
  }
}

onMounted(() => window.addEventListener('keydown', handleGlobalKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', handleGlobalKeydown))

/** Закрываем панель при клике вне поиска. */
const rootEl = ref<HTMLElement | null>(null)

function handleOutside(event: PointerEvent): void {
  if (!rootEl.value?.contains(event.target as Node)) {
    isOpen.value = false
  }
}

onMounted(() => window.addEventListener('pointerdown', handleOutside))
onBeforeUnmount(() => window.removeEventListener('pointerdown', handleOutside))

defineExpose({ focus: () => inputEl.value?.inputRef?.focus() })
</script>

<template>
  <div ref="rootEl" class="relative w-full max-w-[450px] shrink-0">
    <UInput
      ref="inputEl"
      v-model="query"
      type="search"
      size="md"
      color="neutral"
      icon="i-lucide-search"
      :placeholder="`Поиск по сайту · ${hotkeyLabel}`"
      aria-label="Поиск по сайту"
      aria-controls="site-search-results"
      :aria-expanded="isOpen"
      autocomplete="off"
      class="w-full"
      :ui="{
        base: 'rounded-xl ring-0 ring-transparent outline-none focus:outline-none focus-visible:outline-none focus-visible:ring-0',
      }"
      @focus="isOpen = true"
      @keydown="handleKeydown"
    />

    <div
      v-if="isOpen && results.length > 0"
      id="site-search-results"
      class="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-line bg-surface shadow-[0_12px_32px_rgba(0,0,0,0.12)]"
      role="listbox"
      aria-label="Результаты поиска"
    >
      <button
        v-for="(entry, index) in results"
        :key="entry.id"
        type="button"
        role="option"
        :aria-selected="index === activeIndex"
        class="flex w-full items-baseline gap-2 px-3 py-2 text-left transition-colors"
        :class="index === activeIndex ? 'bg-app' : 'hover:bg-app/60'"
        @mouseenter="activeIndex = index"
        @click="runEntry(entry)"
      >
        <span class="min-w-0 truncate text-sm text-ink">{{ entry.title }}</span>
        <span v-if="entry.description" class="min-w-0 flex-1 truncate text-[11px] text-mute">
          {{ entry.description }}
        </span>
      </button>

      <div class="border-t border-line px-3 py-1.5 text-[10px] text-mute">
        ↑↓ — выбор · Enter — открыть
      </div>
    </div>

    <!-- Запрос без совпадений -->
    <div
      v-else-if="isOpen && query.trim().length > 0"
      class="absolute left-0 right-0 top-full z-50 mt-2 rounded-xl border border-line bg-surface px-3 py-2 text-xs text-mute shadow-[0_12px_32px_rgba(0,0,0,0.12)]"
    >
      Ничего не нашлось. Попробуйте «карточки», «файлы», «премиум» или «руководство».
    </div>
  </div>
</template>
