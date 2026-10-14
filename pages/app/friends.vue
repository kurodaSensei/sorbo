<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

// Mis amigos v2: agregar por correo y tres listas agrupadas.
// Aceptar solo se ofrece en solicitudes recibidas (las reglas solo dejan aceptar al destinatario).
definePageMeta({ hideTabBar: true })

const router = useRouter()
const friendsStore = useFriendsStore()
const { confirm } = useConfirm()

// `ready` evita el flash del vacío mientras carga.
const ready = ref(false)

onMounted(async () => {
  try {
    await friendsStore.load()
  }
  finally {
    ready.value = true
  }
})

const inviteEmail = ref('')
const inviting = ref(false)
const inviteMessage = ref<{ tone: 'success' | 'error'; text: string } | null>(null)

async function sendInvite() {
  const email = inviteEmail.value.trim()
  if (!email || inviting.value) return
  inviting.value = true
  inviteMessage.value = null
  try {
    const result = await friendsStore.addFriendByEmail(email)
    inviteMessage.value = { tone: result.success ? 'success' : 'error', text: result.message }
    if (result.success) inviteEmail.value = ''
  }
  finally {
    inviting.value = false
  }
}

const accepted = computed(() => friendsStore.accepted)
const pendingIncoming = computed(() => friendsStore.pendingIncoming)
const pendingOutgoing = computed(() => friendsStore.pendingOutgoing)

function getOther(f: any) {
  return friendsStore.getOtherUser(f)
}
const label = (f: any) => getOther(f)?.displayName || getOther(f)?.email || '?'

function back() {
  if (window.history.length > 1) router.back()
  else router.replace('/app/yo')
}

async function onAccept(id: string) {
  await friendsStore.accept(id)
}
async function onReject(id: string) {
  const ok = await confirm({ title: 'Rechazar solicitud', confirmLabel: 'Rechazar', destructive: true })
  if (!ok) return
  await friendsStore.reject(id)
}
async function onCancel(id: string) {
  const ok = await confirm({ title: 'Cancelar solicitud', confirmLabel: 'Cancelar solicitud', cancelLabel: 'Volver', destructive: true })
  if (!ok) return
  await friendsStore.reject(id)
}
async function onRemove(id: string) {
  const ok = await confirm({
    title: 'Eliminar amigo',
    message: 'Dejarán de ver tus cafés y notas compartidas.',
    confirmLabel: 'Eliminar',
    destructive: true,
  })
  if (!ok) return
  await friendsStore.remove(id)
}
</script>

<template>
  <div class="fr">
    <header class="fr-head">
      <button type="button" class="fr-icon" aria-label="Volver" @click="back">
        <AppIcon name="right" :size="22" :stroke="2" style="transform: rotate(180deg)" />
      </button>
      <h1 class="fr-title">Mis amigos</h1>
    </header>

    <form class="fr-add" @submit.prevent="sendInvite">
      <label class="fr-field">
        <span class="fr-label">Correo de tu amigo</span>
        <input v-model="inviteEmail" type="email" autocomplete="email" inputmode="email" placeholder="amigo@correo.com" class="fr-input">
      </label>
      <p v-if="inviteMessage" :class="['fr-msg', inviteMessage.tone]" role="status">{{ inviteMessage.text }}</p>
      <button type="submit" class="fr-primary" :disabled="!inviteEmail.trim() || inviting">
        {{ inviting ? 'Enviando…' : 'Enviar solicitud' }}
      </button>
    </form>

    <section v-if="pendingIncoming.length" class="fr-group">
      <h2 class="fr-label">Solicitudes recibidas · {{ pendingIncoming.length }}</h2>
      <ul class="fr-list">
        <li v-for="f in pendingIncoming" :key="f.id" class="fr-row">
          <UiAvatar :name="label(f)" size="md" />
          <span class="fr-col">
            <span class="fr-name">{{ label(f) }}</span>
            <span class="fr-sub">Quiere ser tu amigo</span>
          </span>
          <button type="button" class="fr-act fr-accept" @click="onAccept(f.id)">Aceptar</button>
          <button type="button" class="fr-act" @click="onReject(f.id)">Rechazar</button>
        </li>
      </ul>
    </section>

    <section class="fr-group">
      <h2 class="fr-label">Amigos{{ accepted.length ? ` · ${accepted.length}` : '' }}</h2>
      <ul v-if="accepted.length" class="fr-list">
        <li v-for="f in accepted" :key="f.id" class="fr-row">
          <UiAvatar :name="label(f)" size="md" />
          <span class="fr-col">
            <span class="fr-name">{{ label(f) }}</span>
            <span class="fr-sub">{{ getOther(f)?.email }}</span>
          </span>
          <button type="button" class="fr-act" :aria-label="`Eliminar a ${label(f)}`" @click="onRemove(f.id)">Eliminar</button>
        </li>
      </ul>
      <p v-else-if="ready" class="fr-empty">Aún no tienes amigos. Envía una solicitud con su correo.</p>
    </section>

    <section v-if="pendingOutgoing.length" class="fr-group">
      <h2 class="fr-label">Solicitudes enviadas · {{ pendingOutgoing.length }}</h2>
      <ul class="fr-list">
        <li v-for="f in pendingOutgoing" :key="f.id" class="fr-row">
          <UiAvatar :name="label(f)" size="md" tone="surface" />
          <span class="fr-col">
            <span class="fr-name">{{ label(f) }}</span>
            <span class="fr-sub">Esperando respuesta</span>
          </span>
          <button type="button" class="fr-act" @click="onCancel(f.id)">Cancelar</button>
        </li>
      </ul>
    </section>
  </div>
</template>

<style scoped>
.fr { max-width: 640px; margin: 0 auto; padding: 12px 16px 32px; display: flex; flex-direction: column; gap: 20px; color: var(--ink); font-family: var(--font-sans); }
.fr-head { display: flex; align-items: center; gap: 4px; margin: 0 -8px; }
.fr-title { flex: 1; margin: 0; font: 400 28px/30px var(--font-display); }
.fr-icon { width: var(--touch-min); height: var(--touch-min); border-radius: 12px; display: flex; align-items: center; justify-content: center; color: var(--ink); }
.fr-add { display: flex; flex-direction: column; gap: 12px; }
.fr-field { display: flex; flex-direction: column; gap: 8px; }
.fr-label { margin: 0; font: 600 13px/16px var(--font-sans); color: var(--ink-soft); }
.fr-input { box-sizing: border-box; width: 100%; height: var(--field-height); border: 0; border-radius: var(--radius-sm); background: var(--surface); padding: 0 14px; font: 400 16px/22px var(--font-sans); color: var(--ink); }
.fr-input::placeholder { color: var(--ink-soft); }
.fr-input:focus-visible { outline: none; box-shadow: 0 0 0 2px var(--primary); }
.fr-msg { margin: 0; font-size: 12px; line-height: 16px; color: var(--ink-soft); }
.fr-msg.error { color: var(--danger); }
.fr-primary { height: var(--button-height); border-radius: var(--radius-md); background: var(--primary); color: var(--on-primary); font: 600 16px/1 var(--font-sans); }
.fr-primary:disabled { opacity: 0.5; pointer-events: none; }
.fr-group { display: flex; flex-direction: column; gap: 6px; }
.fr-list { list-style: none; margin: 0; padding: 0; border-radius: var(--radius-md); background: var(--surface); }
.fr-row { display: flex; align-items: center; gap: 12px; min-height: 56px; padding: 6px 8px 6px 14px; }
.fr-row + .fr-row { border-top: 1px solid var(--line); }
.fr-col { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.fr-name { font-size: 15px; line-height: 20px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.fr-sub { font-size: 12px; line-height: 16px; color: var(--ink-soft); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.fr-act { min-height: var(--touch-min); padding: 0 10px; font-size: 14px; color: var(--ink-soft); flex-shrink: 0; }
.fr-accept { color: var(--primary); font-weight: 600; }
.fr-empty { margin: 8px 0; font-size: 14px; line-height: 20px; color: var(--ink-soft); }
button:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; }
</style>
