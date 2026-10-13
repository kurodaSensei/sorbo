// Navegación v2: Diario · Amigos · + · Preparar · Yo (design/v2/README.md).
// `match` lista los prefijos de ruta que cuentan como dentro de cada pestaña,
// para que una pantalla empujada (detalle, Mis cafés…) mantenga su pestaña.
export interface AppTab {
  key: 'diario' | 'amigos' | 'preparar' | 'yo'
  label: string
  to: string
  icon: 'book' | 'users' | 'timer' | 'user'
  match: string[]
}

export const APP_TABS: AppTab[] = [
  { key: 'diario', label: 'Diario', to: '/app', icon: 'book', match: ['/app/tastings'] },
  { key: 'amigos', label: 'Amigos', to: '/app/explore', icon: 'users', match: ['/app/friends'] },
  { key: 'preparar', label: 'Preparar', to: '/app/recipes', icon: 'timer', match: ['/app/vertido', '/app/timer'] },
  {
    key: 'yo',
    label: 'Yo',
    to: '/app/yo',
    icon: 'user',
    match: ['/app/coffees', '/app/wishlist', '/app/settings', '/app/profile', '/app/roasters',
      '/app/varieties', '/app/methods', '/app/processes', '/app/notes'],
  },
]

export function isTabActive(tab: AppTab, path: string): boolean {
  if (path === tab.to) return true
  if (tab.to !== '/app' && path.startsWith(`${tab.to}/`)) return true
  return tab.match.some(p => path === p || path.startsWith(`${p}/`))
}
