<script setup lang="ts">
// Landing v3, propuesta B «El diario abierto» del canvas Sorbo v3 · Pantallas.
// ponytail: el registro repite la lógica de pages/register.vue; se unifica al retirar la v1.
const { register, loginWithGoogle, currentUser } = useAuth()
const { trackEvent } = useAnalytics()
const router = useRouter()

const isLoggedIn = computed(() => !!currentUser.value)
const menuOpen = ref(false)
onKeyStroke('Escape', () => { menuOpen.value = false })

const week = [
  { day: 'Lunes', what: 'Llega una bolsa nueva: Sidra honey.', tool: 'Tus cafés', how: 'Marca, origen, proceso y variedades, aunque sea un blend.' },
  { day: 'Martes', what: 'Primera taza. Rico, con algo de fresa.', tool: 'Nota rápida', how: 'Puntaje de 1 a 5, sabores y una frase. Una pantalla.' },
  { day: 'Miércoles', what: 'Subes a 15 g y bajas a 3:10.', tool: 'Recetas con cronómetro', how: '12 métodos con su receta base, paso a paso.' },
  { day: 'Jueves', what: 'Muy rico. La subes a tu historia.', tool: 'Compartir como imagen', how: 'Lista para Instagram o el estado de WhatsApp.' },
  { day: 'Viernes', what: 'Un amigo te recomienda un Geisha.', tool: 'Amigos y Quiero probar', how: 'Lo guardas para buscarlo la próxima vez.' },
  { day: 'Domingo', what: 'Sin anotar desde el jueves.', tool: 'Recordatorio', how: 'Sorbo te avisa a la hora que elijas.' },
]

const scale = SCORE_WORDS.slice(1).map((word, i) => ({ n: i + 1, word }))

const levels = [
  { name: 'Solo tú', desc: 'Así nace todo lo que anotas.', tag: 'Por defecto', on: true },
  { name: 'Amigos', desc: 'Las personas que tú eliges.', tag: '', on: false },
  { name: 'Comunidad', desc: 'Aparece en Explora para otros cafeteros.', tag: '', on: false },
]

const faq = [
  { q: '¿Qué es Sorbo?', a: 'Un diario para café de especialidad. Guardas tus cafés, anotas cada taza y tienes tus recetas a mano. Funciona en el navegador y se instala en el teléfono como una app.' },
  { q: '¿Cuánto cuesta?', a: 'Nada. Sorbo es gratis, sin tarjeta y sin versión de pago.' },
  { q: '¿Cómo se puntúa una taza?', a: 'De 1 a 5, con palabras. Si quieres más detalle, puntúas aroma, acidez, dulzura, cuerpo y retrogusto. Si la bolsa trae puntaje SCA, lo guardas en el café.' },
  { q: '¿Qué métodos de preparación hay?', a: 'V60, Kalita, Chemex, AeroPress, prensa francesa, Origami, Suiren, espresso, moka, phin, cold brew y otro, cada uno con su receta base.' },
  { q: '¿Quién ve mis notas?', a: 'Solo tú, hasta que decidas otra cosa: tus amigos o la comunidad en Explora, nota por nota.' },
  { q: '¿Funciona sin internet?', a: 'En parte. Instalada, la abres sin conexión y ves lo que ya tenías. Para guardar algo nuevo necesitas conexión.' },
]

const name = ref('')
const email = ref('')
const password = ref('')
const acceptedTerms = ref(false)
const errors = ref<{ name?: string, email?: string, password?: string, terms?: string, general?: string }>({})
const loading = ref(false)
const loadingGoogle = ref(false)

function validate() {
  errors.value = {}
  if (!name.value.trim()) errors.value.name = 'Cuéntanos tu nombre'
  if (!email.value) errors.value.email = 'Correo requerido'
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) errors.value.email = 'Correo no válido'
  if (!password.value) errors.value.password = 'Contraseña requerida'
  else if (password.value.length < 8) errors.value.password = 'Mínimo 8 caracteres'
  if (!acceptedTerms.value) errors.value.terms = 'Debes aceptar los términos para continuar'
  return Object.keys(errors.value).length === 0
}

async function onSubmit(e: Event) {
  e.preventDefault()
  if (!validate()) return
  loading.value = true
  try {
    await register(email.value.trim(), password.value, name.value.trim())
    trackEvent('signup_success', { method: 'email', source: 'landing' })
    router.replace('/app')
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
  if (!acceptedTerms.value) {
    errors.value = { terms: 'Debes aceptar los términos para continuar' }
    return
  }
  loadingGoogle.value = true
  try {
    await loginWithGoogle()
    trackEvent('signup_success', { method: 'google', source: 'landing' })
    router.replace('/app')
  }
  catch (err: any) {
    errors.value = { general: err?.message || mapAuthError(err?.code) }
  }
  finally {
    loadingGoogle.value = false
  }
}

function mapAuthError(code?: string) {
  switch (code) {
    case 'auth/invalid-email': return 'Correo no válido'
    case 'auth/email-already-in-use': return 'Ese correo ya tiene cuenta. Entra con él.'
    case 'auth/weak-password': return 'Contraseña muy débil. Mínimo 8 caracteres.'
    case 'auth/network-request-failed': return 'Sin conexión. Revisa tu red.'
    case 'auth/popup-closed-by-user': return 'Cerraste la ventana de Google.'
    default: return 'No pudimos crear tu cuenta. Inténtalo otra vez.'
  }
}
</script>

<template>
  <div class="v3 landing">
    <!-- Hero oscuro con la barra encima -->
    <div class="dark">
      <span aria-hidden="true" class="blob blob--hero" />
      <header class="wrap nav">
        <NuxtLink to="/" class="logo" aria-label="Sorbo, inicio">Sorbo<span class="dot">.</span></NuxtLink>
        <nav aria-label="Principal" class="nav-links">
          <a href="#semana">Cómo se usa</a>
          <a href="#preguntas">Preguntas</a>
        </nav>
        <span class="nav-actions">
          <template v-if="isLoggedIn">
            <NuxtLink to="/app" class="v3-btn btn-accent btn-sm">Ir a tu diario</NuxtLink>
          </template>
          <template v-else>
            <NuxtLink to="/login" class="nav-login">Entrar</NuxtLink>
            <a href="#registro" class="v3-btn btn-accent btn-sm hide-sm">Crear cuenta</a>
          </template>
          <button
            type="button"
            class="burger"
            aria-label="Abrir menú"
            :aria-expanded="menuOpen"
            aria-controls="landing-menu"
            @click="menuOpen = true"
          >
            <Icon name="lucide:menu" size="20" />
          </button>
        </span>
      </header>

      <section id="inicio" class="wrap hero">
        <div class="hero-copy">
          <span class="v3-eyebrow on-dark-soft">— Un diario para cada sorbo</span>
          <h1 class="v3-display-xl hero-title">¿Te acuerdas del café de la <span class="accent-word">semana pasada?</span></h1>
          <p class="hero-sub">Sorbo sí. Anota cada taza en segundos y vuelve a ella cuando quieras prepararla otra vez.</p>
          <span class="hero-cta">
            <NuxtLink v-if="isLoggedIn" to="/app" class="v3-btn btn-accent">Ir a tu diario</NuxtLink>
            <a v-else href="#registro" class="v3-btn btn-accent">
              Empieza gratis
              <Icon name="lucide:arrow-right" size="18" />
            </a>
            <span class="on-dark-soft hero-meta">Sin tarjeta · Web, iPhone y Android</span>
          </span>
        </div>

        <!-- La nota como imagen para compartir -->
        <div aria-hidden="true" class="story-wrap">
          <div class="story">
            <span class="v3-eyebrow story-eb">— Mi nota · martes</span>
            <span class="story-circle" />
            <span class="story-name">Sidra honey</span>
            <span class="v3-subtitle">de Green Coffee Shop · V60</span>
            <span class="story-score"><span class="story-n">4</span><span class="story-word">Muy rico</span></span>
            <span class="story-quote">«Dulce como postre, con un final a panela.»</span>
            <span class="story-foot">sorbo.app<span class="story-dot">.</span></span>
          </div>
        </div>
      </section>
    </div>

    <!-- Menú en móvil -->
    <div v-if="menuOpen" class="menu-veil" @click.self="menuOpen = false">
      <div id="landing-menu" role="dialog" aria-modal="true" aria-label="Menú" class="menu">
        <span class="menu-head">
          <span class="logo logo--ink">Sorbo<span class="dot">.</span></span>
          <button type="button" class="menu-close" aria-label="Cerrar menú" @click="menuOpen = false">
            <Icon name="lucide:x" size="20" />
          </button>
        </span>
        <nav aria-label="Menú" class="menu-links">
          <a href="#semana" @click="menuOpen = false">Cómo se usa</a>
          <a href="#preguntas" @click="menuOpen = false">Preguntas</a>
          <NuxtLink to="/about">Sobre el proyecto</NuxtLink>
        </nav>
        <NuxtLink v-if="isLoggedIn" to="/app" class="v3-btn v3-btn--primary">Ir a tu diario</NuxtLink>
        <template v-else>
          <a href="#registro" class="v3-btn v3-btn--primary" @click="menuOpen = false">Crear cuenta</a>
          <NuxtLink to="/login" class="v3-btn v3-btn--secondary">Ya tengo cuenta</NuxtLink>
        </template>
      </div>
    </div>

    <main>
      <!-- Una semana con Sorbo -->
      <section id="semana" class="wrap section split">
        <div class="split-head">
          <span class="v3-eyebrow soft">— Cómo se usa</span>
          <h2 class="v3-display-l m0">Una semana <span class="v3-accent-word">con Sorbo</span></h2>
          <p class="soft m0">Así se ve una bolsa de café, de la primera taza a la última.</p>
        </div>
        <ol class="week">
          <li v-for="d in week" :key="d.day" class="week-row">
            <span class="week-day">{{ d.day }}</span>
            <span class="week-what">{{ d.what }}</span>
            <span class="week-tool"><span class="week-tool-name">{{ d.tool }}</span><span class="v3-meta">{{ d.how }}</span></span>
          </li>
        </ol>
      </section>

      <!-- El puntaje -->
      <section class="band">
        <div class="wrap section centered">
          <div class="centered-head">
            <span class="v3-eyebrow soft">— El puntaje</span>
            <h2 class="v3-display-l m0">Cinco palabras <span class="v3-accent-word">bastan</span></h2>
            <p class="soft m0">Sin decimales ni fichas de cata. Si un día quieres más detalle, puntúas aroma, acidez, dulzura, cuerpo y retrogusto.</p>
          </div>
          <ul class="scale" aria-label="Escala de puntaje">
            <li v-for="s in scale" :key="s.n" :class="['scale-item', `scale-item--${s.n}`]">
              <span class="scale-n">{{ s.n }}</span>
              <span class="scale-word">{{ s.word }}</span>
            </li>
          </ul>
        </div>
      </section>

      <!-- Privacidad -->
      <section class="wrap section split split--center">
        <div class="split-head">
          <span class="v3-eyebrow soft">— Tuyo primero</span>
          <h2 class="v3-display-l m0">Un diario, <span class="v3-accent-word">no una red social</span></h2>
          <p class="soft m0">Todo nace privado. Sin likes, sin seguidores, sin prisa. Cada café, nota y receta tiene su propio interruptor.</p>
          <p class="v3-subtitle m0">Hecho en Colombia por un cafetero, de tomar demasiados naturales y querer recordarlos todos.</p>
        </div>
        <ul class="levels">
          <li v-for="l in levels" :key="l.name" :class="['level', { 'level--on': l.on }]">
            <span aria-hidden="true" class="level-dot" />
            <span class="level-text"><span class="level-name">{{ l.name }}</span><span class="v3-meta">{{ l.desc }}</span></span>
            <span v-if="l.tag" class="v3-meta">{{ l.tag }}</span>
          </li>
        </ul>
      </section>

      <!-- Preguntas -->
      <section id="preguntas" class="band">
        <div class="wrap section">
          <div class="split-head">
            <span class="v3-eyebrow soft">— Preguntas</span>
            <h2 class="v3-display-l m0">Lo que <span class="v3-accent-word">quieres saber</span></h2>
          </div>
          <dl class="faq">
            <div v-for="f in faq" :key="f.q" class="faq-item">
              <dt class="faq-q">{{ f.q }}</dt>
              <dd class="faq-a">{{ f.a }}</dd>
            </div>
          </dl>
          <p class="soft m0">¿Otra duda? <a href="mailto:info@sorbo.app" class="v3-link">info@sorbo.app</a></p>
        </div>
      </section>

      <!-- Registro -->
      <section id="registro" class="wrap section">
        <div class="signup">
          <div class="signup-panel">
            <span aria-hidden="true" class="blob blob--signup" />
            <span class="v3-eyebrow on-dark-soft">— Empieza hoy</span>
            <h2 class="v3-display-l m0">Tu próxima taza <span class="accent-word">ya cuenta.</span></h2>
            <p class="signup-sub">Gratis, sin tarjeta y en menos de un minuto.</p>
          </div>
          <div class="signup-form">
            <div v-if="isLoggedIn" class="signed">
              <h3 class="signed-title">Tu <span class="v3-accent-word">diario</span> te espera</h3>
              <p class="v3-subtitle m0">Sigue donde lo dejaste.</p>
              <NuxtLink to="/app" class="v3-btn v3-btn--primary signed-btn">Ir a tu diario</NuxtLink>
            </div>
            <template v-else>
              <form novalidate class="form" @submit="onSubmit">
                <V3Field v-model="name" label="Nombre" autocomplete="name" placeholder="Cómo te llamas" :error="errors.name" />
                <V3Field v-model="email" label="Correo" type="email" autocomplete="email" inputmode="email" placeholder="tucorreo@ejemplo.com" :error="errors.email" />
                <V3Field v-model="password" label="Contraseña" type="password" autocomplete="new-password" placeholder="Mínimo 8 caracteres" :error="errors.password" />
                <div class="terms">
                  <label class="terms-label">
                    <input
                      v-model="acceptedTerms"
                      type="checkbox"
                      class="terms-check"
                      :aria-invalid="!!errors.terms || undefined"
                      :aria-describedby="errors.terms ? 'landing-terms-error' : undefined"
                    >
                    <span class="v3-meta">
                      Leí y acepto los
                      <NuxtLink to="/terms" target="_blank" class="v3-link">Términos</NuxtLink>
                      y la
                      <NuxtLink to="/privacy" target="_blank" class="v3-link">Política de privacidad</NuxtLink>.
                    </span>
                  </label>
                  <p v-if="errors.terms" id="landing-terms-error" class="v3-meta v3-error m0">{{ errors.terms }}</p>
                </div>
                <p v-if="errors.general" role="alert" class="v3-alert v3-alert--error">{{ errors.general }}</p>
                <button type="submit" class="v3-btn v3-btn--primary" :disabled="loading || loadingGoogle" :aria-busy="loading || undefined">
                  <span v-if="loading" class="v3-spinner" aria-hidden="true" />
                  Crear cuenta
                </button>
              </form>
              <V3GoogleButton :loading="loadingGoogle" :disabled="loading" @click="onGoogle" />
              <p class="soft m0 center">¿Ya tienes cuenta? <NuxtLink to="/login" class="v3-link">Entra</NuxtLink></p>
            </template>
          </div>
        </div>
      </section>
    </main>

    <footer class="wrap foot">
      <span class="foot-brand">
        <span class="logo logo--ink logo--sm">Sorbo<span class="dot">.</span></span>
        <span class="foot-copy">© {{ new Date().getFullYear() }} Sorbo, por KurodaCafe</span>
      </span>
      <nav aria-label="Pie de página" class="foot-links">
        <NuxtLink to="/about">Sobre el proyecto</NuxtLink>
        <a href="https://instagram.com/sorbo.app" target="_blank" rel="noopener">Instagram</a>
        <a href="mailto:info@sorbo.app">Contacto</a>
        <NuxtLink to="/terms">Términos</NuxtLink>
        <NuxtLink to="/privacy">Privacidad</NuxtLink>
      </nav>
    </footer>
  </div>
</template>

<style scoped>
.landing { min-height: 100vh; }
.wrap { box-sizing: border-box; width: 100%; max-width: 1200px; margin: 0 auto; padding: 0 16px; }
.m0 { margin: 0; }
.soft { color: var(--ink-soft); }
.center { text-align: center; }
.on-dark-soft { color: var(--on-brand-surface); opacity: 0.75; }
.accent-word { font-style: italic; color: var(--accent); }

/* Hero */
.dark { position: relative; overflow: hidden; background: var(--brand-surface); color: var(--on-brand-surface); }
.blob { position: absolute; border-radius: 9999px; pointer-events: none; }
.blob--hero { right: -160px; top: 120px; width: 520px; height: 520px; background: var(--tint); opacity: 0.12; }
.nav { position: relative; display: flex; align-items: center; gap: 24px; min-height: 64px; }
.logo { margin-right: auto; font: 400 26px/1 var(--font-display); color: var(--on-brand-surface); text-decoration: none; }
.logo--ink { color: var(--ink); }
.logo--sm { margin-right: 0; font-size: 24px; }
.dot { color: var(--accent); }
.nav-links { display: none; gap: 28px; }
.nav-links a { padding: 12px 0; font: 500 15px/20px var(--font-sans); color: var(--on-brand-surface); opacity: 0.8; text-decoration: none; }
.nav-links a:hover { opacity: 1; }
.nav-actions { display: flex; align-items: center; gap: 4px; }
.nav-login { display: inline-flex; align-items: center; height: 44px; padding: 0 12px; font: 600 13px/16px var(--font-sans); color: var(--on-brand-surface); text-decoration: none; }
.btn-accent { background: var(--accent); color: var(--on-accent); }
.btn-accent:hover { background: color-mix(in srgb, var(--accent) 88%, var(--on-brand-surface)); }
.btn-sm { height: 40px; padding: 0 18px; font-size: 13px; line-height: 16px; }
.hide-sm { display: none; }
.burger { width: 44px; height: 44px; border: 0; border-radius: 12px; background: color-mix(in srgb, var(--on-brand-surface) 10%, transparent); color: var(--on-brand-surface); display: flex; align-items: center; justify-content: center; cursor: pointer; }

.hero { position: relative; display: flex; flex-wrap: wrap; align-items: center; gap: 48px 72px; padding-top: 32px; padding-bottom: 56px; }
.hero-copy { flex: 1 1 320px; min-width: 0; display: flex; flex-direction: column; gap: 20px; }
.hero-title { margin: 0; font-size: 48px; line-height: 46px; }
.hero-sub { margin: 0; max-width: 500px; font: italic 400 17px/26px var(--font-display); opacity: 0.85; }
.hero-cta { display: flex; flex-wrap: wrap; align-items: center; gap: 12px 20px; }
.hero-cta .v3-btn { flex: 1 1 100%; }
.hero-meta { flex: 1 1 100%; text-align: center; font: 400 13px/18px var(--font-sans); }

.story-wrap { flex: 1 1 260px; min-width: 0; display: flex; justify-content: center; }
.story { box-sizing: border-box; width: 100%; max-width: 280px; aspect-ratio: 9 / 16; padding: 24px; border-radius: 24px; background: var(--bg); color: var(--ink); display: flex; flex-direction: column; gap: 10px; box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35); }
.story-eb { color: var(--ink-soft); }
.story-circle { flex: none; width: 80px; height: 80px; margin-top: 8px; border-radius: 9999px; background: var(--tint); }
.story-name { margin-top: auto; font: 400 30px/28px var(--font-display); letter-spacing: -0.01em; }
.story-score { display: flex; align-items: baseline; gap: 10px; }
.story-n { font: 400 48px/1 var(--font-display); }
.story-word { font: 500 15px/20px var(--font-sans); }
.story-quote { font: italic 400 15px/22px var(--font-display); }
.story-foot { padding-top: 10px; border-top: 1px solid var(--line); font: 400 20px/1 var(--font-display); }
.story-dot { color: var(--primary); }

/* Menú */
.menu-veil { position: fixed; inset: 0; z-index: 50; background: color-mix(in srgb, #141712 60%, transparent); }
.menu { display: flex; flex-direction: column; gap: 8px; padding: 12px 16px 24px; border-radius: 0 0 24px 24px; background: var(--bg); color: var(--ink); }
.menu-head { display: flex; align-items: center; justify-content: space-between; height: 44px; }
.menu-close { width: 44px; height: 44px; border: 0; border-radius: 12px; background: var(--surface); color: var(--ink); display: flex; align-items: center; justify-content: center; cursor: pointer; }
.menu-links { display: flex; flex-direction: column; margin-bottom: 8px; }
.menu-links a { display: flex; align-items: center; min-height: 52px; border-bottom: 1px solid var(--line); font: 400 22px/24px var(--font-display); color: var(--ink); text-decoration: none; }
.menu-links a:last-child { border-bottom: 0; }

/* Secciones */
.section { display: flex; flex-direction: column; gap: 24px; padding-top: 56px; padding-bottom: 56px; }
.band { background: var(--surface); }
.split-head, .centered-head { display: flex; flex-direction: column; gap: 10px; }
.split { flex-direction: row; flex-wrap: wrap; gap: 24px 56px; }
.split > .split-head { flex: 1 1 300px; min-width: 0; }
.split > ol, .split > ul { flex: 2 1 420px; min-width: 0; }
.split--center { align-items: center; }
.centered { align-items: center; text-align: center; }
.centered-head { align-items: center; max-width: 640px; }

.week { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; border-radius: 18px; background: var(--surface); }
.week-row { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 24px; padding: 18px 16px; border-bottom: 1px solid var(--line); }
.week-row:last-child { border-bottom: 0; }
.week-day { flex: 1 1 100%; font: 500 12px/16px var(--font-mono); letter-spacing: 0.08em; text-transform: uppercase; color: var(--ink-soft); }
.week-what { flex: 1 1 260px; min-width: 0; font: 400 22px/26px var(--font-display); }
.week-tool { flex: 1 1 220px; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.week-tool-name { font: 600 13px/16px var(--font-sans); color: var(--primary); }

.scale { margin: 0; padding: 0; list-style: none; width: 100%; max-width: 880px; display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 6px; }
.scale-item { display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 16px 2px; border-radius: 14px; background: var(--bg); color: var(--ink); }
.scale-item--4 { background: var(--tint); color: var(--on-tint); }
.scale-item--5 { background: var(--accent); color: var(--on-accent); }
.scale-n { font: 400 30px/1 var(--font-display); }
.scale-word { font: 500 12px/14px var(--font-sans); white-space: nowrap; }

.levels { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 10px; }
.level { display: flex; align-items: center; gap: 14px; padding: 16px 20px; border-radius: 18px; box-shadow: inset 0 0 0 1px var(--line-strong); }
.level--on { background: var(--surface); box-shadow: inset 0 0 0 2px var(--primary); }
.level-dot { flex: none; width: 12px; height: 12px; border-radius: 9999px; background: var(--line-strong); }
.level--on .level-dot { background: var(--primary); }
.level-text { flex: 1; display: flex; flex-direction: column; gap: 2px; }
.level-name { font-weight: 600; }

.faq { margin: 0; display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 340px), 1fr)); gap: 24px 56px; }
.faq-item { display: flex; flex-direction: column; gap: 6px; padding-top: 16px; border-top: 1px solid var(--line); }
.faq-q { font: 400 19px/22px var(--font-display); }
.faq-a { margin: 0; color: var(--ink-soft); }

/* Registro */
.signup { display: flex; flex-wrap: wrap; border-radius: 24px; overflow: hidden; background: var(--surface); }
.signup-panel { position: relative; overflow: hidden; flex: 1 1 360px; min-width: 0; box-sizing: border-box; padding: 40px 20px; background: var(--brand-surface); color: var(--on-brand-surface); display: flex; flex-direction: column; justify-content: flex-end; gap: 12px; }
.signup-panel > :not(.blob) { position: relative; }
.blob--signup { right: -80px; top: -80px; width: 260px; height: 260px; background: var(--accent); opacity: 0.16; }
.signup-sub { margin: 0; font: italic 400 15px/22px var(--font-display); opacity: 0.85; }
/* Sobre surface, los campos y Google van en bg. */
.signup-form { --surface: var(--bg); --surface-strong: var(--bg); flex: 1 1 380px; min-width: 0; box-sizing: border-box; padding: 32px 20px 40px; display: flex; flex-direction: column; justify-content: center; gap: 20px; }
.form { display: flex; flex-direction: column; gap: 14px; }
.terms { display: flex; flex-direction: column; gap: 6px; }
.terms-label { display: flex; align-items: flex-start; gap: 12px; padding: 8px 0; cursor: pointer; }
.terms-check { flex: none; width: 20px; height: 20px; margin: 0; accent-color: var(--primary); cursor: pointer; }
.signed { display: flex; flex-direction: column; gap: 14px; }
.signed-title { margin: 0; font: 400 30px/28px var(--font-display); }
.signed-btn { align-self: flex-start; padding: 0 22px; }

/* Pie */
.foot { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px 32px; padding-top: 32px; padding-bottom: 32px; border-top: 1px solid var(--line); }
.foot-brand { display: flex; align-items: baseline; gap: 16px; flex-wrap: wrap; }
.foot-copy { font: 400 12px/16px var(--font-sans); color: var(--ink-soft); }
.foot-links { display: flex; flex-wrap: wrap; gap: 0 24px; }
.foot-links a { padding: 14px 0; font: 500 13px/16px var(--font-sans); color: var(--ink-soft); text-decoration: none; }
.foot-links a:hover { color: var(--ink); }

@media (min-width: 768px) {
  .wrap { padding: 0 40px; }
  .nav { min-height: 80px; gap: 32px; }
  .logo { font-size: 28px; }
  .nav-links { display: flex; }
  .hide-sm { display: inline-flex; }
  .burger { display: none; }
  .hero { padding-top: 72px; padding-bottom: 112px; }
  .hero-copy { gap: 28px; }
  .hero-title { font-size: 56px; line-height: 52px; }
  .hero-sub { font-size: 19px; line-height: 28px; }
  .hero-cta .v3-btn { flex: none; padding: 0 22px; }
  .hero-meta { flex: none; text-align: left; }
  .story { max-width: 320px; padding: 28px; }
  .story-name { font-size: 38px; line-height: 35px; }
  .story-n { font-size: 56px; }
  .section { gap: 48px; padding-top: 112px; padding-bottom: 112px; }
  .week-row { padding: 22px 24px; }
  .week-day { flex: 0 0 96px; }
  .scale { grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 12px; }
  .scale-item { padding: 28px 12px; border-radius: 18px; gap: 8px; }
  .scale-n { font-size: 56px; }
  .scale-word { font: 600 15px/20px var(--font-sans); }
  .faq-q { font-size: 22px; line-height: 26px; }
  .signup-panel { padding: 56px; min-height: 360px; }
  .signup-form { padding: 48px 56px; }
  .foot { padding-bottom: 40px; }
}
</style>
