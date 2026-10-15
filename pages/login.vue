<script setup lang="ts">
import { computed, ref, watchEffect } from 'vue'

definePageMeta({ layout: 'auth', auth: false })

const { login, loginWithGoogle, currentUser } = useAuth()
const router = useRouter()
const route = useRoute()

const email = ref('')
const password = ref('')

const errors = ref<{ email?: string; password?: string; general?: string }>({})
const loading = ref(false)
const loadingGoogle = ref(false)

const redirectTo = computed(() => {
  const r = route.query.redirect
  return typeof r === 'string' && r.startsWith('/') ? r : '/app'
})

watchEffect(() => {
  if (currentUser.value) router.replace(redirectTo.value)
})

function validate() {
  errors.value = {}
  if (!email.value) errors.value.email = 'Correo requerido'
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value))
    errors.value.email = 'Correo no válido'
  if (!password.value) errors.value.password = 'Contraseña requerida'
  return Object.keys(errors.value).length === 0
}

async function onSubmit(e: Event) {
  e.preventDefault()
  if (!validate()) return
  loading.value = true
  try {
    await login(email.value.trim(), password.value)
    router.replace(redirectTo.value)
  }
  catch (err: any) {
    errors.value = { general: mapAuthError(err?.code) }
  }
  finally {
    loading.value = false
  }
}

async function onGoogle() {
  errors.value = {}
  loadingGoogle.value = true
  try {
    await loginWithGoogle()
    router.replace(redirectTo.value)
  }
  catch (err: any) {
    errors.value = { general: err?.message || mapAuthError(err?.code) }
  }
  finally {
    loadingGoogle.value = false
  }
}

function mapAuthError(code?: string): string {
  switch (code) {
    case 'auth/invalid-email': return 'Correo no válido'
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential': return 'Correo o contraseña incorrectos'
    case 'auth/too-many-requests': return 'Demasiados intentos. Espera un momento.'
    case 'auth/network-request-failed': return 'Sin conexión. Revisa tu red.'
    case 'auth/popup-closed-by-user': return 'Cancelaste el inicio con Google'
    default: return 'No pudimos iniciar sesión. Inténtalo otra vez.'
  }
}
</script>

<template>
  <main class="flex min-h-svh items-center justify-center px-md py-2xl">
    <div class="w-full max-w-[390px]">
      <UiEyebrow>Sorbo · by KurodaCafe</UiEyebrow>

      <h1 class="mt-md font-display text-[46px] leading-[42px] tracking-[-0.01em] text-moss">
        Bienvenido<br>
        de <span class="italic text-olive">vuelta</span>
      </h1>

      <p class="subtitle-italic mt-md">Continúa donde dejaste el sorbo.</p>

      <form class="mt-xl flex flex-col gap-xs" novalidate @submit="onSubmit">
        <UiInput
          v-model="email"
          label="Correo"
          type="email"
          autocomplete="email"
          inputmode="email"
          :error="errors.email"
          required
        />
        <UiInput
          v-model="password"
          label="Contraseña"
          type="password"
          autocomplete="current-password"
          :error="errors.password"
          required
        />

        <p
          v-if="errors.general"
          role="alert"
          class="mt-xs font-mono text-[10px] font-medium uppercase tracking-eyebrow text-terracotta"
        >
          <span aria-hidden="true">— </span>{{ errors.general }}
        </p>

        <UiButton
          type="submit"
          variant="primary"
          class="mt-lg"
          :loading="loading"
          :disabled="loadingGoogle"
        >
          Entrar
        </UiButton>
      </form>

      <div class="my-md flex items-center gap-md">
        <span aria-hidden="true" class="h-px flex-1 bg-moss/10" />
        <UiEyebrow>o continúa con</UiEyebrow>
        <span aria-hidden="true" class="h-px flex-1 bg-moss/10" />
      </div>

      <UiButton
        variant="secondary"
        :loading="loadingGoogle"
        :disabled="loading"
        @click="onGoogle"
      >
        <svg aria-hidden="true" width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg" class="shrink-0">
          <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4" />
          <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853" />
          <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05" />
          <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335" />
        </svg>
        Continuar con Google
      </UiButton>

      <p class="mt-2xl text-center font-display text-[13px] italic text-moss-soft">
        ¿Primera vez?
        <NuxtLink to="/register" class="font-sans font-medium not-italic text-olive">
          Crea tu cuenta
        </NuxtLink>
      </p>
    </div>
  </main>
</template>
