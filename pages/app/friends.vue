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
