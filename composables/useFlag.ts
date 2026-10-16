// Interruptores para las pantallas de v3. Cada pantalla nueva vive detrás de uno
// hasta que se publique para todos:
//   · NUXT_PUBLIC_FLAGS="acceso,inicio" los enciende para todo el despliegue.
//   · ?flags=acceso los enciende en este navegador y ?flags=-acceso los apaga.
// ponytail: se guarda por navegador; pasa a userPreferences cuando haya pantallas
// dentro de la app que se quieran encender por persona.
export function useFlag(name: string) {
  const route = useRoute()
  const fromEnv = String(useRuntimeConfig().public.flags || '')
    .split(',')
    .map(s => s.trim())
    .includes(name)
  const stored = useLocalStorage<boolean | null>(`sorbo:flag:${name}`, null)

  watchEffect(() => {
    const q = route.query.flags
    const list = (Array.isArray(q) ? q.join(',') : q || '').split(',').map(s => s.trim())
    if (list.includes(name)) stored.value = true
    else if (list.includes(`-${name}`)) stored.value = false
  })

  return computed(() => stored.value ?? fromEnv)
}
