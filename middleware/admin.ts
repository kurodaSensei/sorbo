// Solo entra la cuenta con el claim admin (scripts/set-admin.mjs). La función adminPulse
// vuelve a revisarlo: esto solo evita mostrar una pantalla vacía a quien no es admin.
export default defineNuxtRouteMiddleware(async () => {
  const { currentUser } = useAuth()
  // auth.global ya esperó la sesión. `true` trae un claim recién puesto sin cerrar sesión.
  const token = await currentUser.value?.getIdTokenResult(true).catch(() => null)
  if (token?.claims.admin !== true) return navigateTo('/app')
})
