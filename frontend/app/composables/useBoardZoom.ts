/** Общий зум доски. Сессионный, живёт в памяти приложения. */
export function useBoardZoom() {
  const MIN = 0.4
  const MAX = 2

  const scale = useState<number>('board-zoom-scale', () => 1)

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

  function reset(): void {
    scale.value = 1
  }

  return { scale, zoomIn, zoomOut, reset, setScale, MIN, MAX }
}
