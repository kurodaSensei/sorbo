<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { updateProfile } from 'firebase/auth'
import type { UserProfile } from '~/types'

const router = useRouter()
const { currentUser } = useAuth()
const { $auth } = useNuxtApp()
const { upsertProfile, getById } = useUsers()
const toast = useToast()

const name = ref('')
const bio = ref('')
const profile = ref<UserProfile | null>(null)
const loading = ref(true)
const saving = ref(false)
const errors = ref<{ name?: string; bio?: string }>({})

const initialAvatar = computed(() => name.value || currentUser.value?.email?.split('@')[0] || '')

onMounted(async () => {
  if (!currentUser.value?.uid) return
  try {
    profile.value = await getById(currentUser.value.uid)
    name.value = profile.value?.displayName || currentUser.value.displayName || ''
    bio.value = profile.value?.bio || ''
  }
  catch {
    // ignore — fields stay empty
  }
  finally {
    loading.value = false
  }
})

const BIO_MAX = 80
const bioCount = computed(() => bio.value.length)
const bioOver = computed(() => bioCount.value > BIO_MAX)

function validate(): boolean {
  errors.value = {}
  if (!name.value.trim()) errors.value.name = 'El nombre es obligatorio'
  if (bioOver.value) errors.value.bio = `Máximo ${BIO_MAX} caracteres`
  return Object.keys(errors.value).length === 0
}

async function save() {
  if (saving.value || !validate()) return
  if (!currentUser.value) return
  saving.value = true
  try {
    const newName = name.value.trim()
    const newBio = bio.value.trim()
    if (newName !== (currentUser.value.displayName || '') && $auth.currentUser) {
      await updateProfile($auth.currentUser, { displayName: newName })
    }
    await upsertProfile({
      id: currentUser.value.uid,
      email: currentUser.value.email!,
      displayName: newName || undefined,
      photoURL: currentUser.value.photoURL || undefined,
      bio: newBio || undefined,
    })
    toast.success('Perfil actualizado')
    router.back()
  }
  catch (e: any) {
    toast.error('No pudimos guardar el perfil', e)
  }
  finally {
    saving.value = false
  }
}

// Perfil v3 (interruptor «cuenta»). Misma lógica de arriba.
const v3 = useFlag('cuenta')
const hasGooglePhoto = computed(() => !!currentUser.value?.photoURL)
const bioHelp = computed(() =>
  bioOver.value ? `Te pasaste por ${bioCount.value - BIO_MAX} caracteres: acórtala a ${BIO_MAX}.` : `Hasta ${BIO_MAX} caracteres.`,
)
</script>

<template>
  <div v-if="v3" class="v3 profile">
    <header class="profile-head">
      <button type="button" class="back" aria-label="Volver" @click="router.back()">
        <Icon name="lucide:arrow-left" size="22" />
        <span class="back-label">Ajustes</span>
      </button>
      <h1 class="title">Tu <span class="v3-accent-word">perfil</span></h1>
    </header>

    <div class="layout">
      <form class="form" novalidate @submit.prevent="save">
        <div class="photo">
          <UiAvatar :name="initialAvatar" :src="currentUser?.photoURL ?? undefined" size="lg" class="photo-avatar" />
          <span class="v3-meta">{{ hasGooglePhoto ? 'Usamos la foto de tu cuenta de Google.' : 'Si entras con Google, usamos su foto.' }}</span>
        </div>

        <V3Field v-model="name" label="Nombre" autocomplete="name" placeholder="Tu nombre" :error="errors.name" />

        <div class="bio">
          <div class="bio-head">
            <label for="bio-v3" class="v3-label">Bio corta</label>
            <span id="bio-count" :class="['bio-count', { over: bioOver }]">{{ bioCount }}/{{ BIO_MAX }}</span>
          </div>
          <textarea
            id="bio-v3"
            v-model="bio"
            rows="3"
            :maxlength="BIO_MAX + 20"
            placeholder="Cuenta algo sobre ti y tu café"
            :aria-invalid="bioOver || undefined"
            aria-describedby="bio-help bio-count"
            :class="['bio-input', { invalid: bioOver }]"
          />
          <p id="bio-help" :class="['v3-meta', 'bio-help', { 'v3-error': bioOver }]">{{ bioHelp }}</p>
        </div>

        <div class="actions">
          <button type="submit" class="v3-btn v3-btn--primary" :disabled="loading || saving" :aria-busy="saving || undefined">
            <span v-if="saving" class="v3-spinner" aria-hidden="true" />
            Guardar cambios
          </button>
          <button type="button" class="v3-btn cancel desktop-only" @click="router.back()">Cancelar</button>
        </div>
      </form>

      <section aria-labelledby="preview-title" class="preview desktop-only">
        <h2 id="preview-title" class="v3-label m-0">Así te ven en Sorbo</h2>
        <div class="preview-card">
          <span aria-hidden="true" class="preview-blob" />
          <div class="preview-who">
            <UiAvatar :name="initialAvatar" :src="currentUser?.photoURL ?? undefined" size="md" />
            <span class="preview-name">{{ name.trim() || 'Tu nombre' }}</span>
          </div>
          <p v-if="bio.trim()" class="preview-bio">«{{ bio.trim() }}»</p>
          <p v-else class="preview-bio preview-bio--empty">Todavía no tienes bio.</p>
        </div>
        <p class="v3-meta m-0">Solo ven las catas y los cafés que compartes con ellos o con la comunidad.</p>
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
      <UiEyebrow>Perfil</UiEyebrow>
      <div class="size-[44px]" aria-hidden="true" />
    </header>

    <h1 class="mt-md font-display tracking-[-0.02em] leading-[1.05] text-moss text-[40px] sm:text-[48px]">
      Tu <span class="italic text-olive">perfil</span>
    </h1>

    <!-- Avatar (large) -->
    <div class="mt-xl flex justify-center">
      <div class="relative">
        <UiAvatar :name="initialAvatar" :src="currentUser?.photoURL ?? undefined" size="lg" class="!size-[140px] !text-[44px]" />
      </div>
    </div>

    <!-- Form -->
    <div class="mt-xl flex flex-col gap-xs">
      <UiInput
        v-model="name"
        label="Nombre"
        placeholder="Tu nombre"
        :error="errors.name"
      />

      <div class="flex flex-col gap-xs pt-[14px] pb-[13px] border-b border-moss/10">
        <div class="flex items-baseline justify-between gap-md">
          <label for="bio" class="font-mono text-[10px] font-medium uppercase tracking-eyebrow text-moss-soft">
            <span aria-hidden="true">— </span>Bio
            <span class="lowercase normal-case font-display italic text-moss-soft">corta · {{ BIO_MAX }} chars</span>
          </label>
          <span :class="['font-mono text-[10px] tracking-eyebrow uppercase', bioOver ? 'text-terracotta' : 'text-moss-ghost']">
            {{ bioCount }}/{{ BIO_MAX }}
          </span>
        </div>
        <textarea
          id="bio"
          v-model="bio"
          rows="2"
          :maxlength="BIO_MAX + 20"
          placeholder="Cuenta algo sobre ti…"
          class="w-full bg-transparent border-0 p-0 leading-snug text-moss outline-none font-display italic text-[16px] resize-none placeholder:text-moss-ghost"
        />
        <p
          v-if="errors.bio"
          class="font-mono text-[10px] font-medium uppercase tracking-eyebrow text-terracotta"
        >
          <span aria-hidden="true">— </span>{{ errors.bio }}
        </p>
      </div>
    </div>

    <UiButton
      type="button"
      variant="primary"
      class="mt-xl"
      :loading="saving"
      :disabled="loading"
      @click="save"
    >
      Guardar cambios
    </UiButton>
  </div>
</template>

<style scoped>
.profile { box-sizing: border-box; max-width: 1060px; min-height: calc(100svh - 88px); padding: 8px 20px 32px; display: flex; flex-direction: column; gap: 28px; }
.profile-head { display: flex; flex-direction: column; gap: 8px; }
.back { align-self: flex-start; display: inline-flex; align-items: center; gap: 6px; min-height: 44px; margin-left: -12px; padding: 0 12px; border: 0; background: transparent; color: var(--ink); font: 600 15px/20px var(--font-sans); cursor: pointer; }
.back-label { display: none; }
.title { margin: 0; font: 400 38px/35px var(--font-display); letter-spacing: -0.01em; }
.desktop-only { display: none !important; }
.layout { flex: 1; display: flex; flex-direction: column; gap: 40px; }
.form { flex: 1; display: flex; flex-direction: column; gap: 22px; }
.photo { display: flex; flex-direction: column; align-items: center; gap: 10px; text-align: center; }
.photo-avatar { width: 112px !important; height: 112px !important; font-size: 44px !important; }
.bio { display: flex; flex-direction: column; gap: 8px; }
.bio-head { display: flex; align-items: baseline; justify-content: space-between; }
.bio-count { font: 500 12px/16px var(--font-mono); color: var(--ink-soft); }
.bio-count.over { color: var(--danger); }
.bio-input { box-sizing: border-box; width: 100%; min-height: 96px; border: 0; border-radius: 12px; background: var(--surface); padding: 12px 16px; font: italic 400 18px/26px var(--font-display); color: var(--ink); outline: none; resize: none; }
.bio-input::placeholder { color: var(--ink-soft); }
.bio-input:focus-visible { box-shadow: inset 0 0 0 2px var(--primary); }
.bio-input.invalid { box-shadow: inset 0 0 0 2px var(--danger); }
.bio-help { margin: 0; }
.actions { margin-top: auto; display: flex; flex-direction: column; gap: 12px; }
.cancel { background: transparent; color: var(--ink); }
.cancel:hover { background: var(--surface); }

.preview { display: flex; flex-direction: column; gap: 12px; }
.preview-card { position: relative; overflow: hidden; display: flex; flex-direction: column; gap: 14px; padding: 24px; border-radius: 18px; background: var(--surface-strong); }
.preview-blob { position: absolute; top: -60px; right: -60px; width: 180px; height: 180px; border-radius: 9999px; background: var(--accent); opacity: 0.35; }
.preview-who { position: relative; display: flex; align-items: center; gap: 14px; }
.preview-name { font: 400 26px/28px var(--font-display); }
.preview-bio { position: relative; margin: 0; font: italic 400 17px/25px var(--font-display); color: var(--ink-soft); overflow-wrap: anywhere; }
.preview-bio--empty { font-style: normal; font: 400 15px/22px var(--font-sans); }

@media (min-width: 1024px) {
  .profile { min-height: 0; padding: 40px 48px 64px; gap: 32px; }
  .back-label { display: inline; }
  .back svg { width: 18px; height: 18px; }
  .title { font-size: 56px; line-height: 52px; letter-spacing: -0.02em; }
  .desktop-only { display: flex !important; }
  .layout { flex-direction: row; flex-wrap: wrap; align-items: flex-start; }
  .form { flex: 1 1 380px; min-width: 0; }
  .preview { flex: 1 1 320px; min-width: 0; }
  .photo { flex-direction: row; text-align: left; gap: 18px; }
  .photo-avatar { width: 88px !important; height: 88px !important; font-size: 36px !important; }
  .actions { flex-direction: row; margin-top: 0; }
}
</style>
