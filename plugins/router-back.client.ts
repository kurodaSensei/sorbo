// «Volver» sin historial: si la página se abrió desde un aviso o un enlace, router.back()
// no hace nada (la X de la nota rápida no cerraba). En ese caso va a la página de arriba:
// /app/tastings/new → /app/tastings, /app/settings → /app. Así lo cubre en todos los botones.
export default defineNuxtPlugin(() => {
  const router = useRouter()
  const back = router.back.bind(router)
  router.back = () => {
    if (window.history.state?.back) return back()
    const up = router.currentRoute.value.path.replace(/\/[^/]+\/?$/, '')
    router.replace(up.startsWith('/app') ? up : '/app')
  }
})
