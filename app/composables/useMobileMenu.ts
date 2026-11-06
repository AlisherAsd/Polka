/** Состояние мобильного меню (сайдбар навигации как шторка). */
export function useMobileMenu() {
  const open = useState<boolean>('mobile-menu-open', () => false)

  function openMenu(): void {
    open.value = true
  }

  function closeMenu(): void {
    open.value = false
  }

  function toggleMenu(): void {
    open.value = !open.value
  }

  return { open, openMenu, closeMenu, toggleMenu }
}
