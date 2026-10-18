/**
 * Recarga la página cuando un service worker nuevo toma el control.
 *
 * Con `registerType: 'autoUpdate'`, vite-plugin-pwa solo recarga si
 * workbox-window vio el `updatefound` del SW nuevo. Pero el navegador busca
 * la actualización al navegar, antes de que corra el registro: el evento se
 * pierde, el SW nuevo se activa (skipWaiting + clientsClaim) y la página
 * sigue mostrando el build viejo que sirvió el precache anterior.
 * `controllerchange` llega siempre, así que recargamos ahí.
 */
export default defineNuxtPlugin(() => {
  if (!('serviceWorker' in navigator)) return

  // Sin controlador al cargar es la primera instalación: no hay build viejo.
  const hadController = Boolean(navigator.serviceWorker.controller)
  let reloading = false
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController || reloading) return
    reloading = true
    window.location.reload()
  })

  // Busca un build nuevo en cada carga, sin depender del chequeo del navegador.
  navigator.serviceWorker.getRegistration().then((r) => r?.update()).catch(() => {})
})
