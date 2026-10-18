<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

const router = useRouter()
const friendsStore = useFriendsStore()

// `ready` evita el flash del "Aún no tienes amigos" mientras carga.
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

const search = ref('')

const accepted = computed(() => {
  const list = friendsStore.accepted
  const q = search.value.trim().toLowerCase()
  if (!q) return list
  return list.filter((f) => {
    const u = friendsStore.getOtherUser(f)
    return (
      (u?.displayName || '').toLowerCase().includes(q)
      || (u?.email || '').toLowerCase().includes(q)
    )
  })
})
const pendingIncoming = computed(() => friendsStore.pendingIncoming)
const pendingOutgoing = computed(() => friendsStore.pendingOutgoing)

function getOther(f: any) {
  return friendsStore.getOtherUser(f)
}

const { confirm } = useConfirm()

async function onAccept(id: string) {
  await friendsStore.accept(id)
}
async function onReject(id: string) {
  const ok = await confirm({
    title: 'Rechazar solicitud',
    confirmLabel: 'Rechazar',
    destructive: true,
  })
  if (!ok) return
  await friendsStore.reject(id)
}
async function onRemove(id: string) {
  const ok = await confirm({
    title: 'Eliminar amigo',
    message: 'Dejarán de ver tus cafés y catas compartidas.',
    confirmLabel: 'Eliminar',
    destructive: true,
  })
  if (!ok) return
  await friendsStore.remove(id)
}

// ─── Amigos v3 (interruptor «social») ─────────────────────────────────────
const v3 = useFlag('social')
const initial = (f: any) => (getOther(f)?.displayName || getOther(f)?.email || '?').charAt(0).toUpperCase()
async function onCancel(id: string) {
  const ok = await confirm({ title: 'Cancelar invitación', confirmLabel: 'Cancelar invitación', cancelLabel: 'Volver', destructive: true })
  if (!ok) return
  await friendsStore.reject(id)
}
</script>

<template>
  <div v-if="v3" class="v3 friends">
    <header class="head">
      <button type="button" class="back" @click="router.back()"><Icon name="lucide:arrow-left" size="22" />Ajustes</button>
      <h1 class="title">Tus <span class="v3-accent-word">amigos</span></h1>
      <p class="v3-subtitle sub">Con quienes compartes cafés, catas y recetas.</p>
    </header>

    <div class="layout">
      <div class="col">
        <section aria-labelledby="fr-invite" class="invite">
          <h2 id="fr-invite" class="invite-title">Invita a un amigo</h2>
          <p class="v3-meta m0">Con el correo con el que entra a Sorbo. Verá lo que compartas con amigos.</p>
          <form class="invite-row" novalidate @submit.prevent="sendInvite">
            <label for="fr-email" class="sr-only">Correo de tu amigo</label>
            <input id="fr-email" v-model="inviteEmail" type="email" inputmode="email" autocomplete="email" class="v3-input invite-input" placeholder="amigo@correo.com">
            <button type="submit" class="v3-btn v3-btn--primary" :disabled="!inviteEmail.trim() || inviting" :aria-busy="inviting || undefined">
              <span v-if="inviting" class="v3-spinner" aria-hidden="true" />Invitar
            </button>
          </form>
          <p v-if="inviteMessage" role="status" :class="['m0', 'msg', inviteMessage.tone === 'success' ? 'msg--ok' : 'v3-error']">
            <Icon v-if="inviteMessage.tone === 'success'" name="lucide:check" size="16" />{{ inviteMessage.text }}
          </p>
        </section>

        <section v-if="pendingIncoming.length" aria-labelledby="fr-in" class="group">
          <h2 id="fr-in" class="group-label">Quieren ser tus amigos · {{ pendingIncoming.length }}</h2>
          <div v-for="f in pendingIncoming" :key="f.id" class="request">
            <span class="person">
              <span class="avatar avatar--accent" aria-hidden="true">{{ initial(f) }}</span>
              <span class="person-text"><span class="person-name">{{ getOther(f)?.displayName || getOther(f)?.email }}</span><span v-if="getOther(f)?.displayName" class="v3-meta">{{ getOther(f)?.email }}</span></span>
            </span>
            <span class="request-actions">
              <button type="button" class="v3-btn v3-btn--primary small" @click="onAccept(f.id)">Aceptar</button>
              <button type="button" class="v3-btn plain small" @click="onReject(f.id)">Rechazar</button>
            </span>
          </div>
        </section>

        <section v-if="pendingOutgoing.length" aria-labelledby="fr-out" class="group">
          <h2 id="fr-out" class="group-label">Invitaciones enviadas · {{ pendingOutgoing.length }}</h2>
          <div v-for="f in pendingOutgoing" :key="f.id" class="sent">
            <span class="person-text"><span class="person-name small-name">{{ getOther(f)?.email }}</span><span class="v3-meta">Esperando respuesta</span></span>
            <button type="button" class="v3-btn danger small" @click="onCancel(f.id)">Cancelar</button>
          </div>
        </section>
      </div>

      <section aria-labelledby="fr-list" class="group col col--wide">
        <h2 id="fr-list" class="group-label">Tus amigos · {{ friendsStore.accepted.length }}</h2>
        <div v-if="friendsStore.accepted.length > 5" class="search">
          <Icon name="lucide:search" size="18" class="search-icon" />
          <label for="fr-search" class="sr-only">Buscar amigo</label>
          <input id="fr-search" v-model="search" type="search" class="v3-input search-input" placeholder="Buscar amigo" autocomplete="off">
        </div>
        <div v-if="!ready" class="list"><div v-for="n in 3" :key="n" class="row"><UiSkeleton class="h-11 w-11 rounded-full" /><UiSkeleton class="h-4 w-1/2" /></div></div>
        <p v-else-if="!friendsStore.accepted.length" class="empty">Aún no tienes amigos. Invita a alguien con su correo.</p>
        <p v-else-if="!accepted.length" class="empty">Ningún amigo se llama así.</p>
        <div v-else class="list">
          <div v-for="f in accepted" :key="f.id" class="row">
            <span class="avatar" aria-hidden="true">{{ initial(f) }}</span>
            <span class="person-text"><span class="person-name">{{ getOther(f)?.displayName || getOther(f)?.email }}</span><span class="v3-meta ellipsis">{{ getOther(f)?.email }}</span></span>
            <button type="button" class="v3-btn plain small quit" :aria-label="`Eliminar a ${getOther(f)?.displayName || getOther(f)?.email}`" @click="onRemove(f.id)">Eliminar</button>
          </div>
        </div>
      </section>
    </div>
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
      <UiEyebrow>Social</UiEyebrow>
      <div class="size-[44px]" aria-hidden="true" />
    </header>

    <h1 class="mt-md font-display tracking-[-0.02em] leading-[1.05] text-moss text-[40px] sm:text-[48px]">
      Tus <span class="italic text-olive">amigos</span>
    </h1>
    <p class="subtitle-italic mt-xs">
      Comparte tu memoria de taza.
    </p>

    <!-- Invite -->
    <div class="mt-xl rounded-card-lg bg-surface-2 p-md flex flex-col gap-sm">
      <UiEyebrow>Invitar por correo</UiEyebrow>
      <input
        v-model="inviteEmail"
        type="email"
        autocomplete="email"
        inputmode="email"
        placeholder="amigo@email.com"
        class="rounded-input bg-paper border border-moss/10 px-md py-sm font-display italic text-[16px] text-moss placeholder:text-moss-ghost outline-none focus:border-moss transition-colors"
        @keydown.enter.prevent="sendInvite"
      >
      <UiButton variant="primary" :loading="inviting" :disabled="!inviteEmail.trim()" @click="sendInvite">
        Enviar invitación
      </UiButton>
      <p
        v-if="inviteMessage"
        :class="['font-mono text-[10px] font-medium uppercase tracking-eyebrow', inviteMessage.tone === 'success' ? 'text-olive' : 'text-terracotta']"
      >
        <span aria-hidden="true">— </span>{{ inviteMessage.text }}
      </p>
    </div>

    <!-- Pending incoming -->
    <section v-if="pendingIncoming.length > 0" class="mt-xl">
      <UiEyebrow>Solicitudes recibidas · {{ pendingIncoming.length }}</UiEyebrow>
      <ul class="mt-sm flex flex-col">
        <li
          v-for="f in pendingIncoming"
          :key="f.id"
          class="flex items-center gap-md py-md border-b border-moss/10"
        >
          <UiAvatar :name="getOther(f)?.displayName || getOther(f)?.email || '?'" size="sm" />
          <div class="flex-1 min-w-0">
            <div class="font-sans text-[14px] font-medium text-moss truncate">
              {{ getOther(f)?.displayName || getOther(f)?.email }}
            </div>
            <UiEyebrow>quiere ser tu amigo</UiEyebrow>
          </div>
          <div class="flex items-center gap-xs shrink-0">
            <button
              type="button"
              class="inline-flex items-center justify-center size-[44px] rounded-pill bg-olive text-paper hover:bg-olive-dark transition-colors"
              aria-label="Aceptar"
              @click="onAccept(f.id)"
            >
              <Icon name="lucide:check" class="size-4" />
            </button>
            <button
              type="button"
              class="inline-flex items-center justify-center size-[44px] rounded-pill bg-surface-2 text-moss hover:bg-surface transition-colors"
              aria-label="Rechazar"
              @click="onReject(f.id)"
            >
              <Icon name="lucide:x" class="size-4" />
            </button>
          </div>
        </li>
      </ul>
    </section>

    <!-- Accepted -->
    <section class="mt-xl">
      <UiEyebrow>{{ accepted.length }} {{ accepted.length === 1 ? 'amigo' : 'amigos' }}</UiEyebrow>
      <UiListSearch
        v-if="friendsStore.accepted.length > 5"
        v-model="search"
        placeholder="Buscar amigo…"
        class="mt-sm"
      />
      <ul v-if="accepted.length > 0" class="mt-sm flex flex-col">
        <li
          v-for="f in accepted"
          :key="f.id"
          class="flex items-center gap-md py-md border-b border-moss/10"
        >
          <UiAvatar :name="getOther(f)?.displayName || getOther(f)?.email || '?'" size="sm" />
          <div class="flex-1 min-w-0">
            <div class="font-sans text-[14px] font-medium text-moss truncate">
              {{ getOther(f)?.displayName || getOther(f)?.email }}
            </div>
            <UiEyebrow>{{ getOther(f)?.email }}</UiEyebrow>
          </div>
          <UiActionMenu>
            <UiActionMenuItem destructive icon="lucide:user-minus" @click="onRemove(f.id)">
              Eliminar amigo
            </UiActionMenuItem>
          </UiActionMenu>
        </li>
      </ul>
      <p v-else-if="ready" class="mt-sm font-display italic text-[14px] text-moss-soft">
        Aún no tienes amigos. Invita a alguien con su correo.
      </p>
    </section>

    <!-- Pending outgoing -->
    <section v-if="pendingOutgoing.length > 0" class="mt-xl">
      <UiEyebrow>Invitaciones enviadas · {{ pendingOutgoing.length }}</UiEyebrow>
      <ul class="mt-sm flex flex-col">
        <li
          v-for="f in pendingOutgoing"
          :key="f.id"
          class="flex items-center gap-md py-md border-b border-moss/10"
        >
          <UiAvatar :name="getOther(f)?.displayName || getOther(f)?.email || '?'" size="sm" tone="surface" />
          <div class="flex-1 min-w-0">
            <div class="font-sans text-[14px] text-moss-soft truncate">
              {{ getOther(f)?.email }}
            </div>
            <UiEyebrow>esperando respuesta</UiEyebrow>
          </div>
          <button
            type="button"
            class="inline-flex items-center justify-center size-[44px] rounded-pill text-moss-ghost hover:bg-surface-2/60 transition-colors"
            aria-label="Cancelar invitación"
            @click="onReject(f.id)"
          >
            <Icon name="lucide:x" class="size-4" />
          </button>
        </li>
      </ul>
    </section>
  </div>
</template>

<style scoped>
.friends { box-sizing: border-box; max-width: 1180px; padding: 8px 20px 120px; display: flex; flex-direction: column; gap: 22px; }
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
.m0 { margin: 0; }
.head { display: flex; flex-direction: column; gap: 8px; }
.back { align-self: flex-start; display: inline-flex; align-items: center; gap: 6px; min-height: 44px; margin-left: -12px; padding: 0 12px; border: 0; background: transparent; color: var(--ink); font: 600 15px/20px var(--font-sans); cursor: pointer; }
.title { margin: 0; font: 400 38px/35px var(--font-display); letter-spacing: -0.01em; }
.sub { margin: 0; }
.layout, .col { display: flex; flex-direction: column; gap: 22px; min-width: 0; }
.invite { display: flex; flex-direction: column; gap: 10px; padding: 18px; border-radius: 20px; background: var(--surface-strong); }
.invite-title { margin: 0; font: 400 22px/26px var(--font-display); }
.invite-row { display: flex; gap: 8px; }
.invite-input { flex: 1; min-width: 0; background: var(--bg); }
.msg { display: flex; align-items: center; gap: 6px; font: 500 13px/18px var(--font-sans); }
.msg--ok { color: var(--primary); }
.group { display: flex; flex-direction: column; gap: 8px; }
.group-label { margin: 0; font: 600 13px/16px var(--font-sans); color: var(--ink-soft); }
.request { display: flex; flex-direction: column; gap: 12px; padding: 14px; border-radius: 16px; background: color-mix(in srgb, var(--accent) 22%, var(--bg)); }
.request-actions { display: flex; gap: 8px; }
.request-actions .v3-btn { flex: 1; }
.person { display: flex; align-items: center; gap: 12px; }
.avatar { flex: none; width: 44px; height: 44px; border-radius: 50%; background: var(--tint); color: var(--on-tint); display: flex; align-items: center; justify-content: center; font: 400 19px/1 var(--font-display); }
.avatar--accent { background: var(--accent); color: var(--on-accent); }
.person-text { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.person-name { font: 400 19px/22px var(--font-display); overflow-wrap: anywhere; }
.small-name { font-size: 17px; }
.ellipsis { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.small { height: 40px; font-size: 14px; }
.plain { background: var(--bg); color: var(--ink); }
.plain:hover { background: var(--surface); }
.danger { background: transparent; color: var(--danger); }
.danger:hover { background: var(--surface); }
.sent { display: flex; align-items: center; gap: 12px; min-height: 64px; padding: 6px 6px 6px 14px; border-radius: 16px; box-shadow: inset 0 0 0 1px var(--line-strong); }
.search { position: relative; }
.search-icon { position: absolute; left: 14px; top: 15px; color: var(--ink-soft); }
.search-input { padding-left: 42px; }
.list { display: flex; flex-direction: column; padding: 4px 6px 4px 14px; border-radius: 16px; background: var(--surface); }
.row { display: flex; align-items: center; gap: 12px; min-height: 68px; border-bottom: 1px solid var(--line); }
.row:last-child { border-bottom: 0; }
.quit { flex: none; background: transparent; color: var(--ink-soft); }
.quit:hover { color: var(--danger); background: var(--bg); }
.empty { margin: 0; padding: 24px 0; font: italic 400 18px/26px var(--font-display); color: var(--ink-soft); }

@media (min-width: 1024px) {
  .friends { padding: 32px 48px 64px; gap: 24px; }
  .title { font-size: 56px; line-height: 52px; letter-spacing: -0.02em; }
  .sub { font-size: 19px; line-height: 26px; }
  .layout { flex-direction: row; align-items: flex-start; gap: 40px; }
  .col { flex: 2 1 320px; }
  .col--wide { flex: 3 1 420px; }
}
</style>
