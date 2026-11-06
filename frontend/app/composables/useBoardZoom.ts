/** Общий зум доски. Сессионный, живёт в памяти приложения. */
export function useBoardZoom() {
  const MIN = 0.4
  const MAX = 2

  /** Стартовый масштаб доски — 40%. */
  const DEFAULT = 0.4

  const scale = useState<number>('board-zoom-scale', () => DEFAULT)

  function clamp(value: number): number {
    return Math.min(MAX, Math.max(MIN, Number(value.toFixed(2))))
  }

  function setScale(value: number): void {
    scale.value = clamp(value)
  }

  function zoomIn(): void {
    setScale(scale.value + 0.1)
  }

  function zoomOut(): void {
    setScale(scale.value - 0.1)
  }

  /** Сброс к стартовому масштабу (40%). */
  function reset(): void {
    scale.value = DEFAULT
  }

  return { scale, zoomIn, zoomOut, reset, setScale, MIN, MAX, DEFAULT }
}
