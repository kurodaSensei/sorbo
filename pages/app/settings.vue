<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

const router = useRouter()
const { currentUser, logout, deleteAccount } = useAuth()
const coffeesStore = useCoffeesStore()
const tastingsStore = useTastingsStore()
const roastersStore = useRoastersStore()
const settings = useSettingsStore()
const friendsStore = useFriendsStore()

onMounted(() => {
  coffeesStore.loadAll().catch(() => {})
  tastingsStore.loadAll().catch(() => {})
  roastersStore.loadAll().catch(() => {})
  friendsStore.load().catch(() => {})
  if (!settings.prefs) settings.load().catch(() => {})
})

const userName = computed(() =>
  currentUser.value?.displayName || currentUser.value?.email?.split('@')[0] || '',
)

const coffeesCount = computed(() => coffeesStore.list.length)
const tastingsCount = computed(() => tastingsStore.list.length)
const roastersCount = computed(() => roastersStore.list.length)

const variedadesActiveCount = computed(() => {
  const disabled = settings.prefs?.disabledVarieties ?? []
  const custom = settings.prefs?.customVarieties ?? []
  return [
    ...['Caturra', 'Geisha', 'Bourbon', 'Typica', 'Pacamara', 'SL28', 'Mundo Novo', 'Catimor'].filter(
      v => !disabled.includes(v),
    ),
    ...custom.filter(v => !disabled.includes(v)),
  ].length
})

const metodosActiveCount = computed(() => {
  const disabled = settings.prefs?.disabledBrewMethods ?? []
  const custom = settings.prefs?.customBrewMethods ?? []
  return 12 - disabled.length + custom.filter(m => !disabled.includes(m.value)).length
})

const procesosActiveCount = computed(() => {
  const disabled = settings.prefs?.disabledProcesses ?? []
  const custom = settings.prefs?.customProcesses ?? []
  return 7 - disabled.length + custom.filter(p => !disabled.includes(p.value)).length
})

const notasActiveCount = computed(() => {
  const disabled = settings.prefs?.disabledFlavorNotes ?? []
  const custom = settings.prefs?.customFlavorNotes ?? []
  return 12 - disabled.length + custom.filter(n => !disabled.includes(n)).length
})

const friendsAcceptedCount = computed(() => friendsStore.accepted.length)

const { confirm } = useConfirm()

async function onLogout() {
  const ok = await confirm({
    title: 'Cerrar sesión',
    message: 'Tu sesión actual se cerrará en este dispositivo.',
    confirmLabel: 'Cerrar sesión',
    destructive: true,
  })
  if (!ok) return
  await logout()
}

const toast = useToast()
const deleting = ref(false)

async function onDeleteAccount() {
  if (deleting.value) return
  const ok = await confirm({
    title: '¿Eliminar tu cuenta?',
    message: 'Se borrarán de forma inmediata e irreversible todos tus cafés, catas, recetas, wishlist, perfil y amigos. Si te arrepientes después, tendrás que crear una cuenta nueva.',
    confirmLabel: 'Sí, eliminar todo',
    destructive: true,
  })
  if (!ok) return
  deleting.value = true
  try {
    await deleteAccount()
    // Si llegamos aquí, todo se borró y el router ya navegó a la landing.
  }
  catch (e: any) {
    if (e?.code === 'auth/requires-recent-login') {
      toast.error(
        'Por seguridad, cierra sesión y vuelve a iniciar antes de eliminar la cuenta.',
      )
    }
    else {
      toast.error('No pudimos eliminar la cuenta', e)
    }
  }
  finally {
    deleting.value = false
  }
}

const {
  canShowFromSettings: pwaCanShow,
  isStandalone: pwaIsStandalone,
  install: pwaInstall,
} = usePwaInstall()

// Subtítulo amigos: prosa cuando aún no tiene a nadie, dato corto cuando sí.
const friendsHint = computed(() =>
  friendsAcceptedCount.value > 0
    ? `${friendsAcceptedCount.value} ${friendsAcceptedCount.value === 1 ? 'amigo' : 'amigos'}`
    : 'invita a tu primer amigo',
)
</script>

<template>
  <div class="mx-auto w-full max-w-[640px] px-md pt-md pb-2xl lg:px-xl lg:pt-xl">
    <header class="flex items-center justify-between gap-md">
      <button
        type="button"
        class="inline-flex items-center justify-center size-[44px] rounded-pill text-moss hover:bg-surface-2/60 transition-colors"
        aria-label="Volver"
        @click="router.back()"
      >
        <Icon name="lucide:arrow-left" class="size-5" />
      </button>
      <UiEyebrow>Ajustes</UiEyebrow>
      <div class="size-[44px]" aria-hidden="true" />
    </header>

    <h1 class="mt-md font-display tracking-[-0.02em] leading-[1.05] text-moss text-[40px] sm:text-[48px]">
      Configuración
    </h1>

    <!-- User card -->
    <NuxtLink
      to="/app/profile"
      class="mt-lg flex items-center gap-md rounded-card-lg bg-surface-2 p-md transition-colors duration-150 ease-sorbo hover:bg-surface"
    >
      <UiAvatar :name="userName" :src="currentUser?.photoURL ?? undefined" size="lg" />
      <div class="flex flex-col gap-[2px] flex-1 min-w-0">
        <div class="flex items-center gap-xs">
          <span class="font-sans text-[17px] font-medium text-moss truncate">{{ userName || 'Tu perfil' }}</span>
          <span
            v-if="pwaIsStandalone"
            aria-label="App instalada"
            class="inline-flex items-center gap-xxs rounded-pill bg-olive/10 text-olive px-xs py-[2px] font-mono text-[9px] font-medium uppercase tracking-eyebrow shrink-0"
          >
            <Icon name="lucide:check" class="size-[10px]" aria-hidden="true" /> app
          </span>
        </div>
        <span class="font-sans text-[12px] text-moss-soft truncate">
          {{ coffeesCount }} {{ coffeesCount === 1 ? 'café' : 'cafés' }} · {{ tastingsCount }} {{ tastingsCount === 1 ? 'cata' : 'catas' }}
        </span>
      </div>
      <Icon name="lucide:chevron-right" class="size-5 text-moss-ghost" />
    </NuxtLink>

    <!-- Catálogos -->
    <section class="mt-2xl">
      <UiEyebrow>Catálogos</UiEyebrow>
      <div class="mt-sm flex flex-col">
        <NuxtLink
          to="/app/roasters"
          class="group flex items-center gap-md py-md border-b border-moss/10 last:border-b-0 hover:bg-surface-2/40 transition-colors"
        >
          <Icon name="lucide:flame" class="size-[18px] text-moss-soft group-hover:text-moss transition-colors shrink-0" aria-hidden="true" />
          <div class="flex flex-col gap-[2px] flex-1 min-w-0">
            <span class="font-sans text-[17px] font-medium text-moss leading-tight">Marcas</span>
            <span class="font-sans text-[12px] text-moss-soft leading-tight">
              {{ roastersCount }} {{ roastersCount === 1 ? 'activo' : 'activos' }}
            </span>
          </div>
          <Icon name="lucide:chevron-right" class="size-5 text-moss-ghost shrink-0" />
        </NuxtLink>

        <NuxtLink
          to="/app/varieties"
          class="group flex items-center gap-md py-md border-b border-moss/10 last:border-b-0 hover:bg-surface-2/40 transition-colors"
        >
          <Icon name="lucide:sprout" class="size-[18px] text-moss-soft group-hover:text-moss transition-colors shrink-0" aria-hidden="true" />
          <div class="flex flex-col gap-[2px] flex-1 min-w-0">
            <span class="font-sans text-[17px] font-medium text-moss leading-tight">Variedades</span>
            <span class="font-sans text-[12px] text-moss-soft leading-tight">
              {{ variedadesActiveCount }} {{ variedadesActiveCount === 1 ? 'activa' : 'activas' }}
            </span>
          </div>
          <Icon name="lucide:chevron-right" class="size-5 text-moss-ghost shrink-0" />
        </NuxtLink>

        <NuxtLink
          to="/app/methods"
          class="group flex items-center gap-md py-md border-b border-moss/10 last:border-b-0 hover:bg-surface-2/40 transition-colors"
        >
          <Icon name="lucide:filter" class="size-[18px] text-moss-soft group-hover:text-moss transition-colors shrink-0" aria-hidden="true" />
          <div class="flex flex-col gap-[2px] flex-1 min-w-0">
            <span class="font-sans text-[17px] font-medium text-moss leading-tight">Métodos</span>
            <span class="font-sans text-[12px] text-moss-soft leading-tight">
              {{ metodosActiveCount }} {{ metodosActiveCount === 1 ? 'activo' : 'activos' }}
            </span>
          </div>
          <Icon name="lucide:chevron-right" class="size-5 text-moss-ghost shrink-0" />
        </NuxtLink>

        <NuxtLink
          to="/app/processes"
          class="group flex items-center gap-md py-md border-b border-moss/10 last:border-b-0 hover:bg-surface-2/40 transition-colors"
        >
          <Icon name="lucide:beaker" class="size-[18px] text-moss-soft group-hover:text-moss transition-colors shrink-0" aria-hidden="true" />
          <div class="flex flex-col gap-[2px] flex-1 min-w-0">
            <span class="font-sans text-[17px] font-medium text-moss leading-tight">Procesos</span>
            <span class="font-sans text-[12px] text-moss-soft leading-tight">
              {{ procesosActiveCount }} {{ procesosActiveCount === 1 ? 'activo' : 'activos' }}
            </span>
          </div>
          <Icon name="lucide:chevron-right" class="size-5 text-moss-ghost shrink-0" />
        </NuxtLink>

        <NuxtLink
          to="/app/notes"
          class="group flex items-center gap-md py-md border-b border-moss/10 last:border-b-0 hover:bg-surface-2/40 transition-colors"
        >
          <Icon name="lucide:sparkles" class="size-[18px] text-moss-soft group-hover:text-moss transition-colors shrink-0" aria-hidden="true" />
          <div class="flex flex-col gap-[2px] flex-1 min-w-0">
            <span class="font-sans text-[17px] font-medium text-moss leading-tight">Notas</span>
            <span class="font-sans text-[12px] text-moss-soft leading-tight">
              {{ notasActiveCount }} {{ notasActiveCount === 1 ? 'activa' : 'activas' }}
            </span>
          </div>
          <Icon name="lucide:chevron-right" class="size-5 text-moss-ghost shrink-0" />
        </NuxtLink>
      </div>
    </section>

    <!-- Social -->
    <section class="mt-2xl">
      <UiEyebrow>Social</UiEyebrow>
      <div class="mt-sm flex flex-col">
        <NuxtLink
          to="/app/friends"
          class="group flex items-center gap-md py-md border-b border-moss/10 last:border-b-0 hover:bg-surface-2/40 transition-colors"
        >
          <Icon name="lucide:users" class="size-[18px] text-moss-soft group-hover:text-moss transition-colors shrink-0" aria-hidden="true" />
          <div class="flex flex-col gap-[2px] flex-1 min-w-0">
            <span class="font-sans text-[17px] font-medium text-moss leading-tight">Amigos</span>
            <span class="font-sans text-[12px] text-moss-soft leading-tight">
              {{ friendsHint }}
            </span>
          </div>
          <Icon name="lucide:chevron-right" class="size-5 text-moss-ghost shrink-0" />
        </NuxtLink>
      </div>
    </section>

    <!-- App — solo cuando NO está instalada. El estado "instalada" se
         comunica con el chip pequeño en la card del usuario arriba. -->
    <section v-if="pwaCanShow && !pwaIsStandalone" class="mt-2xl">
      <UiEyebrow>App</UiEyebrow>
      <div class="mt-sm flex flex-col">
        <button
          type="button"
          class="group flex items-center gap-md py-md border-b border-moss/10 last:border-b-0 hover:bg-surface-2/40 transition-colors text-left"
          @click="pwaInstall"
        >
          <Icon name="lucide:download" class="size-[18px] text-moss-soft group-hover:text-moss transition-colors shrink-0" aria-hidden="true" />
          <div class="flex flex-col gap-[2px] flex-1 min-w-0">
            <span class="font-sans text-[17px] font-medium text-moss leading-tight">Instalar Sorbo</span>
            <span class="font-sans text-[12px] text-moss-soft leading-tight">
              como app en tu dispositivo
            </span>
          </div>
          <Icon name="lucide:chevron-right" class="size-5 text-moss-ghost shrink-0" />
        </button>
      </div>
    </section>

    <!-- Cuenta — el Perfil ya es la card del avatar arriba; aquí van las
         acciones destructivas que el usuario espera al final. -->
    <section class="mt-2xl">
      <UiEyebrow>Cuenta</UiEyebrow>
      <div class="mt-sm flex flex-col">
        <button
          type="button"
          class="group flex items-center gap-md py-md border-b border-moss/10 hover:bg-terracotta/5 transition-colors text-left"
          @click="onLogout"
        >
          <Icon name="lucide:log-out" class="size-[18px] text-terracotta/70 group-hover:text-terracotta transition-colors shrink-0" aria-hidden="true" />
          <div class="flex flex-col gap-[2px] flex-1 min-w-0">
            <span class="font-sans text-[17px] font-medium text-terracotta leading-tight">Cerrar sesión</span>
          </div>
          <Icon name="lucide:chevron-right" class="size-5 text-terracotta/50 shrink-0" />
        </button>
        <button
          type="button"
          class="group flex items-center gap-md py-md border-b border-moss/10 last:border-b-0 hover:bg-terracotta/5 transition-colors text-left disabled:opacity-50 disabled:pointer-events-none"
          :disabled="deleting"
          @click="onDeleteAccount"
        >
          <Icon name="lucide:trash-2" class="size-[18px] text-terracotta/70 group-hover:text-terracotta transition-colors shrink-0" aria-hidden="true" />
          <div class="flex flex-col gap-[2px] flex-1 min-w-0">
            <span class="font-sans text-[17px] font-medium text-terracotta leading-tight">
              {{ deleting ? 'Eliminando…' : 'Eliminar mi cuenta' }}
            </span>
            <span class="font-sans text-[12px] text-moss-soft leading-tight">
              Borrado inmediato e irreversible
            </span>
          </div>
          <Icon name="lucide:chevron-right" class="size-5 text-terracotta/50 shrink-0" />
        </button>
      </div>
    </section>
  </div>
</template>
