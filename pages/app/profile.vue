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
</script>

<template>
  <div class="pf">
    <header class="pf-head">
      <button type="button" class="pf-icon" aria-label="Volver" @click="router.back()">
        <AppIcon name="right" :size="22" :stroke="2" style="transform: rotate(180deg)" />
      </button>
      <h1 class="pf-title">Editar perfil</h1>
    </header>

    <div class="pf-avatar">
      <UiAvatar :name="initialAvatar" :src="currentUser?.photoURL ?? undefined" size="lg" class="!size-[96px] !text-[34px]" />
    </div>

    <div class="pf-field">
      <label for="pf-name" class="pf-label">Nombre</label>
      <input id="pf-name" v-model="name" class="pf-input" placeholder="Tu nombre" autocomplete="name">
      <span v-if="errors.name" class="pf-error">{{ errors.name }}</span>
    </div>

    <div class="pf-field">
      <div class="pf-bio-h">
        <label for="pf-bio" class="pf-label">Bio (opcional)</label>
        <span :class="['pf-count', { 'pf-over': bioOver }]">{{ bioCount }}/{{ BIO_MAX }}</span>
      </div>
      <textarea
        id="pf-bio"
        v-model="bio"
        rows="2"
        :maxlength="BIO_MAX + 20"
        class="pf-input pf-area"
        placeholder="Cuenta algo sobre ti"
      />
      <span v-if="errors.bio" class="pf-error">{{ errors.bio }}</span>
    </div>

    <button type="button" class="pf-save" :disabled="loading || saving" :aria-busy="saving || undefined" @click="save">
      {{ saving ? 'Guardando…' : 'Guardar cambios' }}
    </button>
  </div>
</template>

<style scoped>
.pf { max-width: 640px; margin: 0 auto; padding: 12px 16px 32px; display: flex; flex-direction: column; gap: 16px; color: var(--ink); font-family: var(--font-sans); }
.pf-head { display: flex; align-items: center; gap: 4px; margin: 0 -8px; }
.pf-title { flex: 1; margin: 0; font: 400 28px/30px var(--font-display); }
.pf-icon { width: var(--touch-min); height: var(--touch-min); border-radius: 12px; display: flex; align-items: center; justify-content: center; color: var(--ink); }
.pf-avatar { display: flex; justify-content: center; padding: 8px 0; }
.pf-field { display: flex; flex-direction: column; gap: 8px; min-width: 0; }
.pf-label { font: 600 13px/16px var(--font-sans); color: var(--ink-soft); }
.pf-bio-h { display: flex; align-items: baseline; justify-content: space-between; }
.pf-count { font: 400 12px/16px var(--font-sans); color: var(--ink-soft); }
.pf-over, .pf-error { color: var(--danger); }
.pf-error { font: 400 12px/16px var(--font-sans); }
.pf-input { box-sizing: border-box; width: 100%; height: var(--field-height); border: 0; border-radius: var(--radius-sm); background: var(--surface); padding: 0 14px; font: 400 16px/22px var(--font-sans); color: var(--ink); }
.pf-input::placeholder { color: var(--ink-soft); }
.pf-input:focus-visible { outline: none; box-shadow: 0 0 0 2px var(--primary); }
.pf-area { height: auto; padding: 12px 14px; resize: none; }
.pf-save { height: var(--button-height); border-radius: var(--radius-md); background: var(--primary); color: var(--on-primary); font: 600 16px/20px var(--font-sans); }
.pf-save:disabled { background: var(--surface-strong); color: var(--ink-soft); }
button:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; }
</style>
