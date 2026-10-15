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
