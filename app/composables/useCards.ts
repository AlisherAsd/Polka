import { computed, readonly, ref, watch } from "vue";
import type { Ref } from "vue";
import type { Card, RawLink } from "~/types/card";
import { normalizeUrl, parseLink } from "~/utils/parsers";

/** Ключ в localStorage, под которым лежит весь список карточек. */
const STORAGE_KEY = "recall-cards";

/** Состояние приложения в модульном синглтоне. */
interface CardsState {
  cards: Ref<Card[]>;
  loading: Ref<boolean>;
  error: Ref<string | null>;
  /** Выделенные карточки. В localStorage не сохраняется. */
  selectedIds: Ref<string[]>;
}

/** Общие рефы хранятся в модуле: на клиенте это единственный экземпляр состояния. */
let sharedState: CardsState | null = null;

/** Защита от повторного запуска watcher'а сохранения. */
let persisting = false;
/** Защита от повторной инициализации из localStorage. */
let initialized = false;

function ensureState() {
  if (!sharedState) {
    sharedState = {
      cards: ref<Card[]>([]),
      loading: ref(false),
      error: ref<string | null>(null),
      selectedIds: ref<string[]>([]),
    };
  }

  return sharedState;
}

/** Проверка формы элемента из localStorage (данные могли устареть/испортиться). */
function isCard(value: unknown): value is Card {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Partial<Record<keyof Card, unknown>>;

  return (
    typeof candidate.id === "string" &&
    typeof candidate.url === "string" &&
    typeof candidate.title === "string" &&
    typeof candidate.createdAt === "string" &&
    (candidate.type === "youtube" ||
      candidate.type === "tiktok" ||
      candidate.type === "telegram" ||
      candidate.type === "article")
  );
}

/** Чтение списка карточек из localStorage. Вызывать только на клиенте. */
function readStorage(): Card[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return [];
    }

    const parsed: unknown = JSON.parse(raw);

    return Array.isArray(parsed) ? parsed.filter(isCard) : [];
  } catch {
    return [];
  }
}

/** Запись списка карточек в localStorage. Вызывать только на клиенте. */
function writeStorage(cards: Card[]): void {
  try {
    // Теги сессионные: в хранилище их не пишем.
    const serializable = cards.map(
      ({ tags: _tags, ...rest }): Omit<Card, "tags"> => rest,
    );

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(serializable));
  } catch {
    // Приватный режим / переполнение квоты: приложение продолжает работать в памяти.
  }
}

/** Подписка на сохранение — ровно один `watch` на всё приложение. */
function startPersistence(): void {
  if (persisting) {
    return;
  }

  persisting = true;

  const state = ensureState();

  watch(
    state.cards,
    (value) => {
      if (import.meta.client) {
        writeStorage(value);
      }
    },
    { deep: true },
  );
}

/**
 * Единый источник состояния карточек для всех компонентов.
 *
 * Состояние лежит в модульной переменной (не в `useState`), потому что
 * приложение полностью клиентское: localStorage недоступен на сервере,
 * а модульный синглтон на клиенте гарантирует, что все вызовы composable
 * работают с одним и тем же массивом и карточки не дублируются.
 */
export function useCards() {
  const state = ensureState();

  startPersistence();

  const cards = readonly(state.cards);
  const loading = readonly(state.loading);
  const error = readonly(state.error);
  const isEmpty = computed<boolean>(
    () => !loading.value && state.cards.value.length === 0,
  );
  const count = computed<number>(() => state.cards.value.length);
  const selectedIds = readonly(state.selectedIds);
  const selectedCount = computed<number>(() => state.selectedIds.value.length);

  /** Загружает из localStorage один раз за жизнь вкладки. */
  function loadFromStorage(): void {
    if (!import.meta.client || initialized) {
      return;
    }

    initialized = true;
    state.cards.value = readStorage();
  }

  /**
   * Вызывается из страницы в `onMounted`: к этому моменту
   * состояние смонтировано на клиенте и совпадает с разметкой SSR (пустой список),
   * поэтому перенос данных из localStorage не даёт hydration mismatch.
   */
  function init(): void {
    if (import.meta.client) {
      loadFromStorage();
    }
  }

  /** Строит карточки из массива сырых ссылок. Битые ссылки тихо пропускаются. */
  async function loadFromRawLinks(rawLinks: RawLink[]): Promise<void> {
    if (rawLinks.length === 0) {
      return;
    }

    state.loading.value = true;
    state.error.value = null;

    try {
      const results = await Promise.allSettled(
        rawLinks.map((link) => parseLink(normalizeUrl(link.url))),
      );

      const fulfilled = results.flatMap<Card>((result) =>
        result.status === "fulfilled" ? [result.value] : [],
      );

      if (fulfilled.length > 0) {
        state.cards.value = [...fulfilled, ...state.cards.value];
      }

      if (fulfilled.length < rawLinks.length) {
        state.error.value = "Часть ссылок не удалось обработать";
      }
    } catch {
      state.error.value = "Не удалось загрузить ссылки";
    } finally {
      state.loading.value = false;
    }
  }

  /** Добавляет одну ссылку. При ошибке парсинга карточка всё равно появится. */
  async function addLink(url: string): Promise<void> {
    const normalized = normalizeUrl(url);

    if (normalized.length === 0) {
      return;
    }

    state.loading.value = true;
    state.error.value = null;

    try {
      const card = await parseLink(normalized);

      state.cards.value = [card, ...state.cards.value];
    } catch {
      state.error.value = "Не удалось добавить ссылку";
    } finally {
      state.loading.value = false;
    }
  }

  /** Оптимистичное удаление: карточка исчезает сразу, localStorage обновит watcher. */
  function removeCard(id: string): void {
    state.cards.value = state.cards.value.filter((card) => card.id !== id);
    // Удалённая карточка не должна оставаться в выделении.
    state.selectedIds.value = state.selectedIds.value.filter(
      (selectedId) => selectedId !== id,
    );
  }

  /** Переключает выделение одной карточки. */
  function toggleSelection(id: string): void {
    state.selectedIds.value = state.selectedIds.value.includes(id)
      ? state.selectedIds.value.filter((selectedId) => selectedId !== id)
      : [...state.selectedIds.value, id];
  }

  /** Снимает выделение со всех карточек. */
  function clearSelection(): void {
    state.selectedIds.value = [];
  }

  /** Перезаписывает набор тегов у указанных карточек. Сессионно — в storage не пишется. */
  function setTags(ids: string[], tags: string[]): void {
    const targets = new Set(ids);
    const nextTags = [...tags];

    state.cards.value = state.cards.value.map((card) =>
      targets.has(card.id) ? { ...card, tags: nextTags } : card,
    );
  }

  /** Сессионно запоминает папку (коллекцию) для указанных карточек. */
  function setFolder(ids: string[], folder: string, folderId: string): void {
    const targets = new Set(ids);

    state.cards.value = state.cards.value.map((card) =>
      targets.has(card.id) ? { ...card, folder, folderId } : card,
    );
  }

  /** Карточки, лежащие в указанной папке. */
  function cardsInFolder(folderId: string): Card[] {
    return state.cards.value.filter((card) => card.folderId === folderId);
  }

  /** Удаляет все выделенные карточки и очищает выделение. */
  function removeSelected(): void {
    const ids = new Set(state.selectedIds.value);

    state.cards.value = state.cards.value.filter((card) => !ids.has(card.id));
    state.selectedIds.value = [];
  }

  return {
    cards,
    loading,
    error,
    isEmpty,
    count,
    selectedIds,
    selectedCount,
    loadFromStorage,
    loadFromRawLinks,
    addLink,
    removeCard,
    toggleSelection,
    clearSelection,
    removeSelected,
    setTags,
    setFolder,
    cardsInFolder,
    init,
  };
}
