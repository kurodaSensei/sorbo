<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

const router = useRouter()
const { currentUser, logout, deleteAccount } = useAuth()
const friendsStore = useFriendsStore()

onMounted(() => {
  friendsStore.load().catch(() => {})
})

const userName = computed(() =>
  currentUser.value?.displayName || currentUser.value?.email?.split('@')[0] || '',
)

const friendsAcceptedCount = computed(() => friendsStore.accepted.length)

const { confirm } = useConfirm()

async function onLogout() {
  const ok = await confirm({
    title: 'Cerrar sesión',
    message: 'Tu sesión actual se cerrará en este dispositivo.',
    confirmLabel: 'Cerrar sesión',
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
</script>

<template>
  <div class="st">
    <header class="st-head">
      <button type="button" class="st-icon" aria-label="Volver" @click="router.back()">
        <AppIcon name="right" :size="22" :stroke="2" style="transform: rotate(180deg)" />
      </button>
      <h1 class="st-title">Ajustes</h1>
    </header>

    <section class="st-group">
      <h2 class="st-label">Cuenta</h2>
      <div class="st-list">
        <NuxtLink to="/app/profile" class="st-row">
          <span class="st-who">
            <UiAvatar :name="userName" :src="currentUser?.photoURL ?? undefined" size="sm" />
            <span class="st-col">
              <span>{{ userName || 'Tu perfil' }}</span>
              <span class="st-sub">Editar perfil</span>
            </span>
          </span>
          <span class="st-end">›</span>
        </NuxtLink>
        <NuxtLink to="/app/lists" class="st-row"><span>Personalizar listas</span><span class="st-end">›</span></NuxtLink>
        <NuxtLink to="/app/friends" class="st-row">
          <span>Mis amigos</span>
          <span class="st-end">{{ friendsAcceptedCount }} ›</span>
        </NuxtLink>
      </div>
    </section>

    <!-- Solo si el navegador deja instalar y la app aún no está instalada. -->
    <section v-if="pwaCanShow && !pwaIsStandalone" class="st-group">
      <h2 class="st-label">App</h2>
      <div class="st-list">
        <button type="button" class="st-row" @click="pwaInstall">
          <span class="st-col">
            <span>Instalar Sorbo</span>
            <span class="st-sub">Como app en tu dispositivo</span>
          </span>
          <span class="st-end">›</span>
        </button>
      </div>
    </section>

    <section class="st-group">
      <h2 class="st-label">Sesión</h2>
      <div class="st-list">
        <button type="button" class="st-row" @click="onLogout"><span>Cerrar sesión</span></button>
        <button type="button" class="st-row st-danger" :disabled="deleting" @click="onDeleteAccount">
          <span class="st-col">
            <span>{{ deleting ? 'Eliminando…' : 'Eliminar mi cuenta' }}</span>
            <span class="st-sub">Borrado inmediato e irreversible</span>
          </span>
        </button>
      </div>
    </section>
  </div>
</template>

<style scoped>
.st { max-width: 640px; margin: 0 auto; padding: 12px 16px 32px; display: flex; flex-direction: column; gap: 20px; color: var(--ink); font-family: var(--font-sans); }
.st-head { display: flex; align-items: center; gap: 4px; margin: 0 -8px; }
.st-title { flex: 1; margin: 0; font: 400 28px/30px var(--font-display); }
.st-icon { width: var(--touch-min); height: var(--touch-min); border-radius: 12px; display: flex; align-items: center; justify-content: center; color: var(--ink); }
.st-group { display: flex; flex-direction: column; }
.st-label { margin: 0 0 6px; font: 600 13px/16px var(--font-sans); color: var(--ink-soft); }
.st-list { border-radius: var(--radius-md); background: var(--surface); display: flex; flex-direction: column; }
.st-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; min-height: 50px; padding: 8px 14px; font-size: 15px; color: var(--ink); text-align: left; width: 100%; }
.st-row + .st-row { border-top: 1px solid var(--line); }
.st-row:disabled { opacity: 0.5; }
.st-row:focus-visible, .st-icon:focus-visible { outline: 2px solid var(--primary); outline-offset: -2px; border-radius: var(--radius-md); }
.st-who { display: flex; align-items: center; gap: 12px; min-width: 0; }
.st-col { display: flex; flex-direction: column; min-width: 0; }
.st-sub { font-size: 12px; line-height: 16px; color: var(--ink-soft); }
.st-end { font-size: 14px; color: var(--ink-soft); flex-shrink: 0; }
.st-danger > .st-col > span:first-child { color: var(--danger); }
</style>
