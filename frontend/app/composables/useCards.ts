import { computed, readonly, ref } from "vue";
import type { Ref } from "vue";
import type { Card, RawLink } from "~/types/card";
import { normalizeUrl, parseLink } from "~/utils/parsers";
import { createItem, deleteItem, fetchItems } from "~/api/items";
import type { ApiBase } from "~/api/items";

/** Состояние приложения в модульном синглтоне. */
interface CardsState {
  cards: Ref<Card[]>;
  loading: Ref<boolean>;
  error: Ref<string | null>;
  /** Выделенные карточки. Сессионные: на сервер не пишутся. */
  selectedIds: Ref<string[]>;
}

/** Общие рефы хранятся в модуле: на клиенте это единственный экземпляр состояния. */
let sharedState: CardsState | null = null;

/** Текущая загрузка `init()` — общий промис, чтобы не дублировать запросы. */
let initPromise: Promise<void> | null = null;

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

/** Подсказка об ошибке для `$fetch`-ошибок с телом `{ message }` бэкенда. */
function errorMessage(error: unknown, fallback: string): string {
  const message = (error as { data?: { message?: unknown } })?.data?.message;

  return typeof message === "string" && message.length > 0 ? message : fallback;
}
/**
 * Единый источник состояния карточек для всех компонентов.
 *
 * Источник истины — бэкенд `/api/items`; в браузере ничего не персистится.
 * Состояние лежит в модульной переменной (не в `useState`), потому что
 * приложение клиентское: на сервере список пуст, а модульный синглтон
 * гарантирует, что все вызовы composable работают с одним массивом.
 */
export function useCards() {
  const state = ensureState();

  /**
   * Адрес бэкенда читаем только внутри Nuxt-контекста (в setup composable)
   * и дальше передаём в хелперы параметром: в фоновых промисах контекста уже нет.
   */
  const apiBase: ApiBase =
    typeof useRuntimeConfig === "function"
      ? String(useRuntimeConfig().public.apiBase ?? "")
      : "";

  const cards = readonly(state.cards);
  const loading = readonly(state.loading);
  const error = readonly(state.error);
  const isEmpty = computed<boolean>(
    () => !loading.value && state.cards.value.length === 0,
  );
  const count = computed<number>(() => state.cards.value.length);
  const selectedIds = readonly(state.selectedIds);
  const selectedCount = computed<number>(() => state.selectedIds.value.length);

  /** Кладёт карточки в начало списка, пересоздавая массив (как и раньше). */
  function prepend(next: Card[]): void {
    if (next.length > 0) {
      state.cards.value = [...next, ...state.cards.value];
    }
  }

  /** Загружает карточки с бэкенда — единственный источник данных. */
  async function loadFromBackend(): Promise<void> {
    state.loading.value = true;
    state.error.value = null;

    try {
      state.cards.value = await fetchItems(apiBase, 200);
    } catch (err) {
      state.error.value = errorMessage(err, "Не удалось загрузить карточки");
    } finally {
      state.loading.value = false;
    }
  }

  /**
   * Вызывается из страницы в `onMounted`: к этому моменту состояние смонтировано
   * на клиенте и совпадает с разметкой SSR (пустой список), поэтому данные
   * с бэкенда не дают hydration mismatch. Повторные вызовы получают тот же промис.
   */
  function init(): Promise<void> {
    if (!import.meta.client) {
      return Promise.resolve();
    }

    if (!initPromise) {
      initPromise = loadFromBackend();
    }

    return initPromise;
  }

  /** Синоним `init()`, оставлен для совместимости с прежним API. */
  function loadFromStorage(): Promise<void> {
    return init();
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

      const parsed = results.flatMap<Card>((result) =>
        result.status === "fulfilled" ? [result.value] : [],
      );

      // Локально разобранные карточки на сервере заменяются серверными (с id из БД).
      const saved = await Promise.allSettled(
        parsed.map((card) =>
          createItem(apiBase, {
            type: card.type,
            url: card.url,
            title: card.title,
            thumbnail: card.thumbnail,
            summary: card.summary,
            content: card.content,
            fileId: card.fileId,
          }),
        ),
      );

      const created = saved.flatMap<Card>((result) =>
        result.status === "fulfilled" ? [result.value] : [],
      );

      // Несохранённые карточки не теряем — оставляем локально.
      const unsaved = parsed.filter((_, index) => saved[index]?.status !== "fulfilled");

      prepend([...created, ...unsaved]);

      if (unsaved.length > 0 && created.length > 0) {
        state.error.value = "Часть ссылок не удалось сохранить";
      } else if (unsaved.length > 0) {
        state.error.value = "Не удалось сохранить ссылки";
      } else if (parsed.length < rawLinks.length) {
        state.error.value = "Часть ссылок не удалось обработать";
      }
    } catch {
      state.error.value = "Не удалось загрузить ссылки";
    } finally {
      state.loading.value = false;
    }
  }

  /** Добавляет одну ссылку. При ошибке сохранения карточка остаётся локально. */
  async function addLink(url: string): Promise<void> {
    const normalized = normalizeUrl(url);

    if (normalized.length === 0) {
      return;
    }

    state.loading.value = true;
    state.error.value = null;

    try {
      const card = await parseLink(normalized);

      try {
        const saved = await createItem(apiBase, {
          type: card.type,
          url: card.url,
          title: card.title,
          thumbnail: card.thumbnail,
          summary: card.summary,
          content: card.content,
          fileId: card.fileId,
        });

        prepend([saved]);
      } catch (err) {
        prepend([card]);
        state.error.value = errorMessage(err, "Не удалось сохранить ссылку");
      }
    } catch {
      state.error.value = "Не удалось добавить ссылку";
    } finally {
      state.loading.value = false;
    }
  }

  /**
   * Оптимистичное удаление: карточки исчезают сразу, удаление на сервере
   * идёт следом. Если сервер отказал — карточки возвращаются на место.
   */
  function removeCards(ids: string[]): void {
    if (ids.length === 0) {
      return;
    }

    const removed = new Set(ids);
    const snapshot = state.cards.value;
    const backup = snapshot.filter((card) => removed.has(card.id));

    state.cards.value = snapshot.filter((card) => !removed.has(card.id));

    void Promise.allSettled(backup.map((card) => deleteItem(apiBase, card.id))).then(
      (results) => {
        if (results.every((result) => result.status === "fulfilled")) {
          return;
        }

        const restored = new Set(
          backup
            .filter((_, index) => results[index]?.status !== "fulfilled")
            .map((card) => card.id),
        );
        const present = new Set(state.cards.value.map((card) => card.id));

        state.cards.value = [
          ...state.cards.value,
          ...backup.filter((card) => restored.has(card.id) && !present.has(card.id)),
        ];
        state.error.value = "Не удалось удалить карточку";
      },
    );
  }

  /** Удаляет карточку (оптимистично, с откатом при ошибке). */
  function removeCard(id: string): void {
    // Удалённая карточка не должна оставаться в выделении.
    state.selectedIds.value = state.selectedIds.value.filter(
      (selectedId) => selectedId !== id,
    );
    removeCards([id]);
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

  /** Перезаписывает набор тегов у указанных карточек. Сессионно — на сервер не пишется. */
  function setTags(ids: string[], tags: string[]): void {
    const targets = new Set(ids);
    const nextTags = [...tags];

    state.cards.value = state.cards.value.map((card) =>
      targets.has(card.id) ? { ...card, tags: nextTags } : card,
    );
  }

  /**
   * Запоминает папку у карточек в локальном состоянии.
   * Файл в папке создаёт `AppFolderModal` через `/api/notes`, поэтому
   * здесь нет ни HTTP, ни работы с папками.
   */
  function setFolder(ids: string[], folder: string, folderId: string): void {
    const targets = new Set(ids);

    state.cards.value = state.cards.value.map((card) =>
      targets.has(card.id) ? { ...card, folder, folderId } : card,
    );
  }

  /**
   * Заменяет поля карточки в локальном состоянии (например, после сохранения
   * саммари на сервере). Саммари приходит с бэкенда — карточка уже обновлена там.
   */
  function replaceCard(next: Card): void {
    state.cards.value = state.cards.value.map((card) =>
      card.id === next.id ? { ...card, ...next } : card,
    );
  }

  /** Карточки, лежащие в указанной папке. */
  function cardsInFolder(folderId: string): Card[] {
    return state.cards.value.filter((card) => card.folderId === folderId);
  }

  /** Удаляет все выделенные карточки и очищает выделение. */
  function removeSelected(): void {
    const ids = [...state.selectedIds.value];

    state.selectedIds.value = [];
    removeCards(ids);
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
    replaceCard,
    cardsInFolder,
    init,
  };
}
