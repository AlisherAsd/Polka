/**
 * Мок-авторизация: флаг «вошёл» только в памяти.
 * По умолчанию `false` — чат и папки заблокированы.
 */
export function useAuth() {
  const isAuth = useState<boolean>('auth-is-authenticated', () => false)

  function signIn(): void {
    isAuth.value = true
  }

  function signOut(): void {
    isAuth.value = false
  }

  return { isAuth, signIn, signOut }
}
