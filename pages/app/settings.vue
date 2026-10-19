<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { DEFAULT_VARIETIES } from '~/utils/constants'

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

// Recordatorio diario (interruptor «recordatorios»).
const remindersOn = useFlag('recordatorios')

const userName = computed(() =>
  currentUser.value?.displayName || currentUser.value?.email?.split('@')[0] || '',
)

const coffeesCount = computed(() => coffeesStore.list.length)
const tastingsCount = computed(() => tastingsStore.list.length)
const roastersCount = computed(() => roastersStore.list.length)

const variedadesActiveCount = computed(() => {
  const disabled = settings.prefs?.disabledVarieties ?? []
  const custom = settings.prefs?.customVarieties ?? []
  // Misma lista que /app/varieties (antes contaba sobre 8 nombres fijos y desactualizados).
  return [...new Set([...DEFAULT_VARIETIES, ...custom])].filter(v => !disabled.includes(v)).length
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

// ─────────────────────────────────────────────────────────────────────────
// Configuración v3 (interruptor «cuenta»). Misma lógica de arriba; la vista
// v1 se borra en la limpieza final.
// ─────────────────────────────────────────────────────────────────────────
const v3 = useFlag('cuenta')
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

const catalogRows = computed(() => [
  { to: '/app/roasters', icon: 'lucide:flame', title: 'Marcas', hint: plural(roastersCount.value, 'activa', 'activas') },
  { to: '/app/varieties', icon: 'lucide:sprout', title: 'Variedades', hint: plural(variedadesActiveCount.value, 'activa', 'activas') },
  { to: '/app/methods', icon: 'lucide:filter', title: 'Métodos', hint: plural(metodosActiveCount.value, 'activo', 'activos') },
  { to: '/app/processes', icon: 'lucide:beaker', title: 'Procesos', hint: plural(procesosActiveCount.value, 'activo', 'activos') },
  { to: '/app/notes', icon: 'lucide:sparkles', title: 'Notas de sabor', hint: plural(notasActiveCount.value, 'activa', 'activas') },
])

const pendingFriends = computed(() => friendsStore.pendingIncoming.length)
const friendsLine = computed(() => {
  const base = friendsAcceptedCount.value > 0 ? plural(friendsAcceptedCount.value, 'amigo', 'amigos') : 'Invita a tu primer amigo'
  return pendingFriends.value > 0 ? `${base} · ${plural(pendingFriends.value, 'solicitud nueva', 'solicitudes nuevas')}` : base
})

const checklistHidden = computed(() => settings.prefs?.hideOnboardingChecklist === true)
async function onRestoreChecklist() {
  await settings.restoreOnboardingChecklist().catch(() => {})
  toast.success('Los primeros pasos vuelven a Inicio')
}
</script>

<template>
  <div v-if="v3" class="v3 settings">
    <header class="settings-head">
      <button type="button" class="back mobile-only" aria-label="Volver" @click="router.back()">
        <Icon name="lucide:arrow-left" size="22" />
      </button>
      <h1 class="title">Tus <span class="v3-accent-word">ajustes</span></h1>
    </header>

    <NuxtLink to="/app/profile" class="account">
      <UiAvatar :name="userName" :src="currentUser?.photoURL ?? undefined" size="lg" class="account-avatar" />
      <span class="account-text">
        <span class="account-name-row">
          <span class="account-name">{{ userName || 'Tu perfil' }}</span>
          <span v-if="pwaIsStandalone" class="chip-app" aria-label="App instalada"><Icon name="lucide:check" size="12" /> App</span>
        </span>
        <span class="v3-meta">{{ plural(coffeesCount, 'café', 'cafés') }} · {{ plural(tastingsCount, 'cata', 'catas') }}<span class="mobile-only"> · Editar perfil</span></span>
      </span>
      <span class="account-edit desktop-only">Editar perfil</span>
      <Icon name="lucide:chevron-right" size="18" class="chev mobile-only" />
    </NuxtLink>

    <div class="columns">
      <section aria-labelledby="g-catalogs" class="group">
        <h2 id="g-catalogs" class="v3-label group-title">Catálogos</h2>
        <p class="v3-meta group-desc desktop-only">Las listas que eliges al anotar un café o una cata.</p>
        <div class="rows">
          <NuxtLink v-for="r in catalogRows" :key="r.to" :to="r.to" class="row">
            <Icon :name="r.icon" size="20" class="row-icon" />
            <span class="row-title">{{ r.title }}</span>
            <span class="v3-meta">{{ r.hint }}</span>
            <Icon name="lucide:chevron-right" size="18" class="chev" />
          </NuxtLink>
        </div>
      </section>

      <div class="stack">
        <section aria-labelledby="g-social" class="group">
          <h2 id="g-social" class="v3-label group-title">Social</h2>
          <div class="rows">
            <NuxtLink to="/app/friends" class="row">
              <Icon name="lucide:users" size="20" class="row-icon" />
              <span class="row-text"><span class="row-title">Amigos</span><span class="v3-meta">{{ friendsLine }}</span></span>
              <span v-if="pendingFriends" class="badge" :aria-label="`${pendingFriends} solicitudes nuevas`">{{ pendingFriends }}</span>
              <Icon name="lucide:chevron-right" size="18" class="chev" />
            </NuxtLink>
          </div>
        </section>

        <V3ReminderSettings v-if="remindersOn" />

        <section v-if="(pwaCanShow && !pwaIsStandalone) || checklistHidden" aria-labelledby="g-app" class="group">
          <h2 id="g-app" class="v3-label group-title">App</h2>
          <div class="rows">
            <button v-if="pwaCanShow && !pwaIsStandalone" type="button" class="row" @click="pwaInstall">
              <Icon name="lucide:download" size="20" class="row-icon" />
              <span class="row-text"><span class="row-title">Instalar Sorbo</span><span class="v3-meta">Como app en tu teléfono o tu computador</span></span>
              <Icon name="lucide:chevron-right" size="18" class="chev" />
            </button>
            <button v-if="checklistHidden" type="button" class="row" @click="onRestoreChecklist">
              <Icon name="lucide:list-checks" size="20" class="row-icon" />
              <span class="row-text"><span class="row-title">Mostrar primeros pasos</span><span class="v3-meta">La guía de inicio vuelve a Inicio</span></span>
            </button>
          </div>
        </section>

        <section aria-labelledby="g-account" class="group">
          <h2 id="g-account" class="v3-label group-title">Cuenta</h2>
          <div class="rows">
            <button type="button" class="row" @click="onLogout">
              <Icon name="lucide:log-out" size="20" class="row-icon row-icon--soft" />
              <span class="row-title">Cerrar sesión</span>
            </button>
            <button type="button" class="row row--danger" :disabled="deleting" @click="onDeleteAccount">
              <Icon name="lucide:trash-2" size="20" />
              <span class="row-text">
                <span class="row-title">{{ deleting ? 'Eliminando…' : 'Eliminar mi cuenta' }}</span>
                <span class="v3-meta">Borra todo de inmediato. No se puede deshacer.</span>
              </span>
            </button>
          </div>
        </section>
      </div>
    </div>

    <footer class="foot">
      <span class="v3-meta">
        <NuxtLink to="/terms" class="v3-link">Términos de uso</NuxtLink> ·
        <NuxtLink to="/privacy" class="v3-link">Política de privacidad</NuxtLink>
      </span>
      <span class="v3-meta">Sorbo, por KurodaCafe</span>
    </footer>
  </div>

  <div v-else class="mx-auto w-full max-w-[640px] px-md pt-md pb-2xl lg:px-xl lg:pt-xl">
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

<style scoped>
.settings { box-sizing: border-box; max-width: 1060px; padding: 8px 20px 32px; display: flex; flex-direction: column; gap: 28px; }
.settings-head { display: flex; flex-direction: column; gap: 8px; }
.back { width: 44px; height: 44px; margin-left: -12px; border: 0; background: transparent; color: var(--ink); display: flex; align-items: center; justify-content: center; cursor: pointer; }
.title { margin: 0; font: 400 38px/35px var(--font-display); letter-spacing: -0.01em; }
.desktop-only { display: none; }

.account { display: flex; align-items: center; gap: 14px; padding: 16px; border-radius: 18px; background: var(--surface-strong); color: var(--ink); text-decoration: none; }
.account-avatar { flex: none; }
.account-text { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.account-name-row { display: flex; align-items: center; gap: 8px; min-width: 0; }
.account-name { font: 400 22px/24px var(--font-display); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.chip-app { flex: none; display: inline-flex; align-items: center; gap: 4px; height: 22px; padding: 0 8px; border-radius: 9999px; background: var(--surface); font: 500 12px/16px var(--font-sans); color: var(--ink-soft); }
.account-edit { flex: none; font: 600 15px/20px var(--font-sans); color: var(--primary); }

.columns { display: flex; flex-direction: column; gap: 28px; }
.stack { display: flex; flex-direction: column; gap: 28px; }
.group { display: flex; flex-direction: column; gap: 10px; }
.group-title { margin: 0; padding: 0 4px; }
.group-desc { margin: 0 4px 4px; }
.rows { display: flex; flex-direction: column; padding: 0 14px; border-radius: 16px; background: var(--surface); }
.row {
  display: flex;
  align-items: center;
  gap: 14px;
  min-height: 60px;
  padding: 0;
  border: 0;
  border-bottom: 1px solid var(--line);
  background: transparent;
  color: var(--ink);
  font: inherit;
  text-align: left;
  text-decoration: none;
  cursor: pointer;
}
.row:last-child { border-bottom: 0; }
.row:disabled { opacity: 0.5; cursor: not-allowed; }
.row-icon { flex: none; color: var(--primary); }
.row-icon--soft { color: var(--ink-soft); }
.row-text { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.row > .row-title { flex: 1; }
.row-title { font: 500 15px/22px var(--font-sans); }
.row--danger { color: var(--danger); }
.chev { flex: none; color: var(--ink-soft); }
.badge { flex: none; min-width: 22px; height: 22px; padding: 0 6px; box-sizing: border-box; border-radius: 9999px; background: var(--danger); color: var(--on-danger); display: flex; align-items: center; justify-content: center; font: 600 12px/1 var(--font-sans); }
.foot { display: flex; flex-direction: column; align-items: center; gap: 6px; text-align: center; }

@media (min-width: 1024px) {
  .mobile-only { display: none; }
  .desktop-only { display: block; }
  .account-edit.desktop-only { display: inline; }
  .settings { padding: 40px 48px 64px; gap: 32px; }
  .title { font-size: 56px; line-height: 52px; letter-spacing: -0.02em; }
  .account { padding: 20px 24px; gap: 18px; }
  .account-name { font-size: 26px; line-height: 28px; }
  .columns { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 32px; align-items: start; }
  .rows { padding: 0 16px; }
  .foot { flex-direction: row; justify-content: space-between; padding-top: 20px; border-top: 1px solid var(--line); }
}
</style>
