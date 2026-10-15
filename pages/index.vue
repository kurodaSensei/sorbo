<script setup lang="ts">
import { computed, ref } from 'vue'

definePageMeta({ layout: false, auth: false })

const SITE_URL = 'https://sorbo.app'
// PNG (no SVG) — WhatsApp/Telegram rechazan SVG. El SVG sigue en /public
// como source of truth para regenerar; render via Chrome headless con las
// webfonts cargadas vía CSS, sin necesidad de tener las TTF locales.
const OG_IMAGE = `${SITE_URL}/og-image.png`
const DESCRIPTION = 'Tu diario para cada café de especialidad. Registra catas, guarda recetas, descubre lo que otros cafeteros toman. Sin Excel, sin red social, sin ruido.'

useHead({
  title: 'Sorbo · Un diario para cada sorbo',
  meta: [
    // SEO base
    { name: 'description', content: DESCRIPTION },
    { name: 'robots', content: 'index, follow' },
    { name: 'theme-color', content: '#141712' },

    // Open Graph (Facebook, LinkedIn, WhatsApp, Discord, Slack...)
    { property: 'og:type', content: 'website' },
    { property: 'og:url', content: `${SITE_URL}/` },
    { property: 'og:title', content: 'Sorbo · Un diario para cada sorbo' },
    { property: 'og:description', content: DESCRIPTION },
    { property: 'og:image', content: OG_IMAGE },
    { property: 'og:image:type', content: 'image/png' },
    { property: 'og:image:width', content: '1200' },
    { property: 'og:image:height', content: '630' },
    { property: 'og:image:alt', content: 'Sorbo · Un diario para cada sorbo de café' },
    { property: 'og:site_name', content: 'Sorbo' },
    { property: 'og:locale', content: 'es_ES' },

    // Twitter / X
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:title', content: 'Sorbo · Un diario para cada sorbo' },
    { name: 'twitter:description', content: DESCRIPTION },
    { name: 'twitter:image', content: OG_IMAGE },
    { name: 'twitter:image:alt', content: 'Sorbo · Un diario para cada sorbo de café' },
  ],
  link: [
    { rel: 'canonical', href: `${SITE_URL}/` },
  ],
  script: [
    {
      type: 'application/ld+json',
      // @graph: une 3 entidades (SoftwareApplication + WebSite + Org)
      // bajo @ids cruzados, dándole a Google/AI engines un modelo
      // coherente del producto y su autoría. SoftwareApplication es
      // elegible para Rich Results (a diferencia de WebApplication).
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'SoftwareApplication',
            '@id': `${SITE_URL}/#software`,
            'name': 'Sorbo',
            'alternateName': 'Sorbo App',
            'description': DESCRIPTION,
            'disambiguatingDescription': 'Aplicación web progresiva (PWA) para registro de cafés de especialidad, catas SCA y recetas de extracción. No confundir con la palabra común "sorbo" (sip).',
            'url': `${SITE_URL}/`,
            'applicationCategory': 'LifestyleApplication',
            'operatingSystem': 'Web, iOS, Android',
            'inLanguage': 'es',
            'datePublished': '2026-06-15',
            'dateModified': new Date().toISOString().split('T')[0],
            'featureList': [
              'Registro de cafés de especialidad con detalle (origen, variedad, proceso, SCA score)',
              'Catas guiadas con scoring estándar SCA',
              'Recetas con temporizador integrado para 12 métodos de extracción',
              'Wishlist de cafés que aún no compras',
              'Feed comunitario con visibilidad granular (privado, amigos, comunidad)',
              'Catálogo de marcas y tostadores',
              'PWA instalable en iOS, Android, macOS y Windows',
            ],
            'offers': {
              '@type': 'Offer',
              'name': 'Plan gratuito',
              'price': '0',
              'priceCurrency': 'USD',
              'availability': 'https://schema.org/InStock',
              'seller': { '@id': `${SITE_URL}/#organization` },
            },
            'creator': { '@id': `${SITE_URL}/#organization` },
            'publisher': { '@id': `${SITE_URL}/#organization` },
            'image': OG_IMAGE,
          },
          {
            '@type': 'WebSite',
            '@id': `${SITE_URL}/#website`,
            'url': `${SITE_URL}/`,
            'name': 'Sorbo',
            'description': DESCRIPTION,
            'inLanguage': 'es',
            'publisher': { '@id': `${SITE_URL}/#organization` },
          },
          {
            '@type': 'Organization',
            '@id': `${SITE_URL}/#organization`,
            'name': 'KurodaCafe',
            'url': `${SITE_URL}/`,
            'email': 'info@sorbo.app',
            'logo': {
              '@type': 'ImageObject',
              'url': `${SITE_URL}/icons/icon-512.png`,
              'width': 512,
              'height': 512,
            },
            'sameAs': [
              'https://instagram.com/kurodacafe',
            ],
          },
        ],
      }),
    },
  ],
  htmlAttrs: {
    lang: 'es',
  },
})

// ─────────────────────────────────────────────────────────────────────────────
// Registro inline en la landing — reemplaza la waitlist.
// El producto ya está disponible: pedir email "para avisar cuando salga"
// era contradictorio. Mantenemos el diseño de la sección, cambia el flujo.
// ─────────────────────────────────────────────────────────────────────────────

const { register, loginWithGoogle, currentUser } = useAuth()
const { trackEvent } = useAnalytics()
const router = useRouter()

const isLoggedIn = computed(() => !!currentUser.value)

const name = ref('')
const email = ref('')
const password = ref('')
const acceptedTerms = ref(false)

const errors = ref<{ name?: string; email?: string; password?: string; terms?: string; general?: string }>({})
const loading = ref(false)
const loadingGoogle = ref(false)

function validate(): boolean {
  errors.value = {}
  if (!name.value.trim()) errors.value.name = 'Cuéntanos tu nombre'
  if (!email.value) errors.value.email = 'Correo requerido'
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) errors.value.email = 'Correo no válido'
  if (!password.value) errors.value.password = 'Contraseña requerida'
  else if (password.value.length < 8) errors.value.password = 'Mínimo 8 caracteres'
  if (!acceptedTerms.value) errors.value.terms = 'Debes aceptar los términos para continuar'
  return Object.keys(errors.value).length === 0
}

async function onRegister(e: Event) {
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

function mapAuthError(code?: string): string {
  switch (code) {
    case 'auth/invalid-email': return 'Correo no válido'
    case 'auth/email-already-in-use': return 'Ese correo ya tiene cuenta. Inicia sesión.'
    case 'auth/weak-password': return 'Contraseña muy débil. Mínimo 8 caracteres.'
    case 'auth/network-request-failed': return 'Sin conexión. Revisa tu red.'
    case 'auth/popup-closed-by-user': return 'Cancelaste el registro con Google'
    default: return 'No pudimos crear tu cuenta. Inténtalo otra vez.'
  }
}

function smoothScroll(id: string) {
  const el = document.getElementById(id)
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

// ─── Mobile nav ───
const mobileNavOpen = ref(false)

function openMobileNav() { mobileNavOpen.value = true }
function closeMobileNav() { mobileNavOpen.value = false }

function mobileScrollAndClose(id: string) {
  closeMobileNav()
  // pequeño delay para que el panel se cierre antes del scroll
  setTimeout(() => smoothScroll(id), 200)
}
</script>

<template>
  <div class="landing">
    <!-- ============ NAV ============ -->
    <nav class="nav">
      <NuxtLink to="/" class="brand" aria-label="Sorbo · Inicio">
        <img src="/sorbo.svg" alt="" aria-hidden="true" class="mark-svg">
        <div class="name">
          Sorbo<span class="dot">.</span>
        </div>
      </NuxtLink>
      <div class="links">
        <a href="#features" @click.prevent="smoothScroll('features')">Features</a>
        <a href="#como" @click.prevent="smoothScroll('como')">Cómo funciona</a>
        <a href="#por-que" @click.prevent="smoothScroll('por-que')">Por qué Sorbo</a>
        <template v-if="isLoggedIn">
          <NuxtLink to="/app" class="nav-cta">Ir a la app →</NuxtLink>
        </template>
        <template v-else>
          <NuxtLink to="/login" class="nav-login">Ingresar</NuxtLink>
          <a href="#registro" class="nav-cta" @click.prevent="smoothScroll('registro')">Crear cuenta</a>
        </template>
      </div>

      <!-- Hamburger (solo <760px) — abre panel con todos los links. -->
      <button
        type="button"
        class="nav-burger"
        :aria-expanded="mobileNavOpen"
        aria-label="Abrir menú"
        aria-controls="mobile-nav-panel"
        @click="openMobileNav"
      >
        <span aria-hidden="true" />
        <span aria-hidden="true" />
        <span aria-hidden="true" />
      </button>
    </nav>

    <!-- ============ MOBILE NAV PANEL ============ -->
    <Transition
      enter-active-class="mobile-nav-transition-enter"
      leave-active-class="mobile-nav-transition-leave"
    >
      <div
        v-if="mobileNavOpen"
        id="mobile-nav-panel"
        class="mobile-nav"
        role="dialog"
        aria-modal="true"
        aria-label="Menú principal"
        @keydown.esc="closeMobileNav"
      >
        <div class="mobile-nav-header">
          <NuxtLink to="/" class="brand" aria-label="Sorbo · Inicio" @click="closeMobileNav">
            <img src="/sorbo.svg" alt="" aria-hidden="true" class="mark-svg">
            <div class="name">Sorbo<span class="dot">.</span></div>
          </NuxtLink>
          <button
            type="button"
            class="mobile-nav-close"
            aria-label="Cerrar menú"
            @click="closeMobileNav"
          >
            ×
          </button>
        </div>

        <nav class="mobile-nav-links" aria-label="Navegación principal móvil">
          <a href="#features" @click.prevent="mobileScrollAndClose('features')">Features</a>
          <a href="#como" @click.prevent="mobileScrollAndClose('como')">Cómo funciona</a>
          <a href="#por-que" @click.prevent="mobileScrollAndClose('por-que')">Por qué Sorbo</a>
          <a href="#faq" @click.prevent="mobileScrollAndClose('faq')">Preguntas frecuentes</a>
          <NuxtLink to="/about" @click="closeMobileNav">Sobre el proyecto</NuxtLink>
        </nav>

        <div class="mobile-nav-cta">
          <template v-if="isLoggedIn">
            <NuxtLink to="/app" class="mobile-nav-btn primary" @click="closeMobileNav">
              Ir a la app →
            </NuxtLink>
          </template>
          <template v-else>
            <a
              href="#registro"
              class="mobile-nav-btn primary"
              @click.prevent="mobileScrollAndClose('registro')"
            >
              Crear cuenta
            </a>
            <NuxtLink to="/login" class="mobile-nav-btn ghost" @click="closeMobileNav">
              Ya tengo cuenta
            </NuxtLink>
          </template>
        </div>

        <p class="mobile-nav-foot">
          <a href="https://instagram.com/kurodacafe" target="_blank" rel="noopener">@kurodacafe</a>
          ·
          <a href="mailto:info@sorbo.app">info@sorbo.app</a>
        </p>
      </div>
    </Transition>

    <!-- ============ HERO ============ -->
    <section class="hero">
      <div class="hero-inner">
        <div>
          <div class="hero-eyebrow">
            <span class="dot-live" aria-hidden="true" />
            <span class="label">En vivo · gratis</span>
          </div>
          <h1>
            Un diario<br>
            para cada<br>
            <em>sorbo</em><span class="dot">.</span>
          </h1>
          <p class="subtitle">
            Tu memoria de taza, en una sola colección. Cataloga cafés, registra catas y guarda recetas — sin convertirlo en una hoja de cálculo.
          </p>

          <div class="hero-cta">
            <template v-if="isLoggedIn">
              <NuxtLink to="/app" class="btn-primary">
                Ir a la app →
              </NuxtLink>
              <a href="https://instagram.com/kurodacafe" target="_blank" rel="noopener" class="btn-ghost-light">
                Sígueme en Instagram
              </a>
            </template>
            <template v-else>
              <a href="#registro" class="btn-primary" @click.prevent="smoothScroll('registro')">
                Empieza tu diario →
              </a>
              <NuxtLink to="/login" class="btn-ghost-light">
                Ya tengo cuenta
              </NuxtLink>
            </template>
          </div>

          <div class="hero-meta">
            <div class="hero-meta-item">
              <div class="num"><em>12</em></div>
              <div class="lbl">métodos de extracción</div>
            </div>
            <div class="hero-meta-item">
              <div class="num"><em>SCA</em></div>
              <div class="lbl">scoring estándar</div>
            </div>
            <div class="hero-meta-item">
              <div class="num"><em>0</em>$</div>
              <div class="lbl">para siempre</div>
            </div>
          </div>
        </div>

        <!-- iPhone mockup -->
        <div class="device" aria-hidden="true">
          <div class="screen">
            <div class="notch" />
            <div class="statusbar">
              <span>9:41</span><span>●●●● · 100%</span>
            </div>

            <div class="app-header">
              <div class="app-eyebrow">— Cafés · 4</div>
              <div class="avatar">S</div>
            </div>

            <div class="content">
              <div class="title-l">
                Mi <em>colección</em>
              </div>

              <div class="seg-toggle">
                <div class="seg-on">míos · 4</div>
                <div class="seg-off">compart · 2</div>
              </div>

              <!-- Mood card 1 -->
              <div class="mood-card">
                <div class="mood-blob" />
                <div class="mood-content">
                  <div class="mood-eyebrow">— Natural · Tarqui</div>
                  <div class="mood-name">Special</div>
                  <div class="mood-roaster">de KurodaCafe</div>
                  <div class="mood-notes">
                    <span class="mood-chip">Cereza</span>
                    <span class="mood-chip">Panela</span>
                    <span class="mood-chip">+2</span>
                  </div>
                  <div class="mood-footer">
                    <div>
                      <div class="mood-eyebrow">— SCA</div>
                      <div class="mood-score">86.5</div>
                    </div>
                    <div class="mood-meta">$60K · 250g</div>
                  </div>
                </div>
              </div>

              <!-- Mood card 2 -->
              <div class="mood-card">
                <div class="mood-blob olive" />
                <div class="mood-content">
                  <div class="mood-eyebrow">— Lavado · Yirgacheffe</div>
                  <div class="mood-name small">Gold</div>
                  <div class="mood-roaster">de KurodaCafe</div>
                </div>
              </div>
            </div>

            <div class="tabbar">
              <div class="tab">inicio</div>
              <div class="tab">explora</div>
              <div class="tab active">cafés</div>
              <div class="tab">catas</div>
              <div class="tab">recetas</div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ============ MANIFIESTO ============ -->
    <section class="manifiesto">
      <div class="manifiesto-inner">
        <blockquote>
          "Cada sorbo es un<br>pequeño viaje. <span class="accent">Sorbo</span><br>
          es donde los <span class="accent">recuerdas</span>"
        </blockquote>
        <div class="author">
          <div class="line" aria-hidden="true" />
          <div class="label">Manifiesto · KurodaCafe</div>
          <div class="line" aria-hidden="true" />
        </div>
      </div>
    </section>

    <!-- ============ FEATURES ============ -->
    <section id="features" class="features">
      <div class="features-inner">
        <div class="section-head">
          <div class="eyebrow">— Features</div>
          <h2>
            Todo lo que necesitas,<br>nada de <em>relleno</em>
          </h2>
          <p>Sorbo es para quien toma café como ritual, no como combustible. Cuatro herramientas para tu diario — y una comunidad para descubrir más.</p>
        </div>

        <div class="features-grid">
          <div class="feature-card">
            <div class="num">01</div>
            <h3>Tu <em>colección</em></h3>
            <p>Registra cada café que pase por tu taza — origen, variedad, proceso, score SCA. Sin formularios eternos.</p>
          </div>
          <div class="feature-card dark">
            <div class="num">02</div>
            <h3>Catas con <em>memoria</em></h3>
            <p>Aroma, acidez, dulzura, cuerpo. Notas en taza. Una frase para recordar — todo guiado en 3 pasos.</p>
          </div>
          <div class="feature-card olive">
            <div class="num">03</div>
            <h3>Recetas <em>cronometradas</em></h3>
            <p>V60, Aeropress, French Press. Pasos con timestamps y timer integrado para ejecutar exacto.</p>
          </div>
          <div class="feature-card">
            <div class="num">04</div>
            <h3>Wishlist <em>activa</em></h3>
            <p>Los cafés que vas a perseguir. Prioriza, anota por qué te llamó la atención, y márcalos cuando los consigas.</p>
          </div>

          <div class="feature-card wide dark">
            <div class="num">05</div>
            <div class="wide-text">
              <h3>Explora la <em>comunidad</em></h3>
              <p>Cafés, catas y recetas que otros cafeteros comparten — un feed para descubrir tu próximo origen favorito. Sin likes, sin seguidores, sin la prisa de una red social.</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ============ CÓMO FUNCIONA ============ -->
    <section id="como" class="how">
      <div class="how-inner">
        <div class="section-head">
          <div class="eyebrow">— Cómo funciona</div>
          <h2>De la taza al diario,<br>en <em>tres pasos</em></h2>
        </div>

        <div class="steps">
          <div class="step">
            <div class="step-num">— 01 / Agrega</div>
            <h3>Registra el <em>café</em></h3>
            <p>Nombre, marca, origen. Solo lo esencial — los detalles son opcionales.</p>
            <div class="visual">
              <div class="v-add">
                <div class="lbl">— Nombre</div>
                <div class="val">Gold natural</div>
                <div class="sep" />
                <div class="lbl">— Marca</div>
                <div class="val olive">KurodaCafe</div>
              </div>
            </div>
          </div>

          <div class="step">
            <div class="step-num">— 02 / Cata</div>
            <h3>Puntúa la <em>taza</em></h3>
            <p>Atributos guiados, score automático y una nota que recordarás.</p>
            <div class="visual">
              <div class="v-cata">
                <div class="lbl">— Puntuación general</div>
                <div class="score">8.7<sub>/10</sub></div>
                <div class="bar"><div /></div>
              </div>
            </div>
          </div>

          <div class="step">
            <div class="step-num">— 03 / Recuerda</div>
            <h3>Tu <em>memoria</em></h3>
            <p>Cada café se vuelve una mood card visual. Tu colección crece, sin perderse.</p>
            <div class="visual">
              <div class="v-mem">
                <div class="blob" />
                <div class="lbl">— Honey · Caicedonia</div>
                <div class="name">Sereno</div>
                <div class="quote">"Cuerpo redondo, dulce."</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ============ SOCIAL PROOF / TESTIMONIALES ============
         Placeholder editable — cambia las 3 quotes por reseñas reales
         cuando estén. Cada quote es <blockquote> con <cite> para que los
         crawlers los reconozcan como testimonio. -->
    <section class="voices">
      <div class="voices-inner">
        <div class="eyebrow">— Lo que dicen</div>
        <h2>Voces de la <em>comunidad</em></h2>
        <div class="voices-grid">
          <figure class="voice">
            <blockquote>"Por fin dejé la hoja de Excel. Registrar una cata se siente como escribir en mi cuaderno favorito."</blockquote>
            <figcaption>
              <cite>Ana M.</cite> · Bogotá
            </figcaption>
          </figure>
          <figure class="voice">
            <blockquote>"Lo que más uso: puedo repetir la última cata con dos taps. Encontré mi ritmo."</blockquote>
            <figcaption>
              <cite>Diego R.</cite> · Medellín
            </figcaption>
          </figure>
          <figure class="voice">
            <blockquote>"Explora es la parte que me hace volver. Descubro cafés que jamás habría pedido."</blockquote>
            <figcaption>
              <cite>Mariana V.</cite> · Ciudad de México
            </figcaption>
          </figure>
        </div>
        <p class="voices-note">
          Placeholder — los testimonios se actualizarán con quotes reales conforme lleguen.
        </p>

        <!-- Imagen real para crawlers (el resto de la landing es CSS
             mockup y los bots no lo indexan como imagen). Usamos el
             mismo OG image ya renderizado; el alt describe el producto. -->
        <img
          src="/og-image.png"
          alt="Sorbo — un diario para cada sorbo de café · pour-over, dulzura editorial y comunidad"
          width="1200"
          height="630"
          loading="lazy"
          class="voices-image"
        >
      </div>
    </section>

    <!-- ============ POR QUÉ SORBO ============ -->
    <section id="por-que" class="why">
      <div class="why-inner">
        <div class="eyebrow paper">— Por qué Sorbo</div>
        <h2>
          No es un Excel,<br>ni una red social,<br>ni un cuaderno <em>perdido</em>
        </h2>

        <div class="why-grid">
          <div class="why-item">
            <div class="icon">"</div>
            <h3>Editorial, no <em>técnico</em></h3>
            <p>Cada café tiene un nombre propio, una historia. Sorbo lo trata como tal — con tipografía serif, frases cortas y mood cards que se sienten más cerca de una revista que de una hoja de datos.</p>
          </div>
          <div class="why-item">
            <div class="icon">·</div>
            <h3>Privado por <em>defecto</em></h3>
            <p>Es tu diario antes que nada. Cada café nace privado — tú decides si lo compartes con amigos o lo llevas a Explora. Sin likes, sin seguidores, sin presión.</p>
          </div>
          <div class="why-item">
            <div class="icon">↺</div>
            <h3>Hecho por un <em>cafetero</em></h3>
            <p>Sorbo nace de KurodaCafe — de tomar demasiados naturales colombianos y querer recordarlos todos. Cada decisión de UX viene de ese ritual diario.</p>
          </div>
        </div>
      </div>
    </section>

    <!-- ============ FAQ ============
         Headings tipo pregunta + respuesta directa al inicio de cada
         bloque, optimizado para extracción por AI engines y para que
         Google muestre People Also Ask. -->
    <section id="faq" class="faq">
      <div class="faq-inner">
        <div class="eyebrow">— Preguntas frecuentes</div>
        <h2>Lo que <em>quieres saber</em></h2>

        <div class="faq-list">
          <article class="faq-item">
            <h3>¿Qué es Sorbo?</h3>
            <p>
              Sorbo es un diario digital para café de especialidad. Es una PWA gratuita —
              Web, iOS y Android — donde registras cafés, haces catas con scoring SCA,
              guardas recetas con temporizador y, opcionalmente, exploras una comunidad de
              cafeteros. No es una red social ni una hoja de cálculo: es un cuaderno editorial.
            </p>
          </article>

          <article class="faq-item">
            <h3>¿Cuánto cuesta?</h3>
            <p>
              Sorbo es gratuito y sin tarjeta. No hay versión "Pro" ni paywall escondido. El
              proyecto vive en el tier gratuito de Firebase y Vercel, lo cual nos permite
              ofrecer todas las funciones sin cobrar.
            </p>
          </article>

          <article class="faq-item">
            <h3>¿Qué métodos de extracción soporta?</h3>
            <p>
              12 métodos: V60, Chemex, Kalita, Origami, Suiren, AeroPress, Prensa francesa,
              Espresso, Moka, Phin, Cold brew, y un genérico "otro". Cada método tiene una
              receta estándar incorporada (dosis, agua, temperatura, tiempos) que puedes usar
              tal cual o personalizar.
            </p>
          </article>

          <article class="faq-item">
            <h3>¿Mis catas son privadas?</h3>
            <p>
              Sí, por defecto. Cada café, cata y receta nace en modo privado — solo tú las ves.
              Tienes tres niveles de visibilidad por item: privado, amigos (UIDs que tú eliges),
              o comunidad (feed público en Explora). Tú decides ítem por ítem.
            </p>
          </article>

          <article class="faq-item">
            <h3>¿Sorbo funciona sin internet?</h3>
            <p>
              Parcialmente. Como PWA puedes instalarla en tu teléfono y abrirla sin conexión —
              verás los datos que ya cargaste. Los registros nuevos requieren conexión para
              sincronizar con Firestore.
            </p>
          </article>

          <article class="faq-item">
            <h3>¿Usa el sistema de scoring SCA?</h3>
            <p>
              Sí. La puntuación de cafés sigue el estándar de la Specialty Coffee Association
              (0-100 puntos). Para catas usamos un sistema editorial complementario de 0-10
              puntos en aroma, dulzor, acidez, cuerpo, acabado y un score overall.
            </p>
          </article>
        </div>
      </div>
    </section>

    <!-- ============ REGISTRO ============ -->
    <section id="registro" class="waitlist">
      <div class="waitlist-inner">
        <template v-if="isLoggedIn">
          <div class="eyebrow">— Ya estás dentro</div>
          <h2>Tu <em>diario</em><br>te espera</h2>
          <p>Continúa donde lo dejaste.</p>
          <NuxtLink to="/app" class="btn-primary signup-cta-go">
            Ir a tu diario →
          </NuxtLink>
        </template>

        <template v-else>
          <div class="eyebrow">— Crea tu cuenta · es gratis</div>
          <h2>Empieza tu <em>diario</em><br>en menos de un minuto</h2>
          <p>Sin tarjeta, sin trial. Solo tú y tu memoria de taza.</p>

          <form class="signup-form" novalidate @submit="onRegister">
            <div class="field">
              <label for="su-name">— Nombre</label>
              <input
                id="su-name"
                v-model="name"
                type="text"
                autocomplete="name"
                placeholder="Cómo te llamas"
                :aria-invalid="!!errors.name || undefined"
              >
              <p v-if="errors.name" class="field-error">{{ errors.name }}</p>
            </div>
            <div class="field">
              <label for="su-email">— Correo</label>
              <input
                id="su-email"
                v-model="email"
                type="email"
                autocomplete="email"
                inputmode="email"
                placeholder="tucorreo@ejemplo.com"
                :aria-invalid="!!errors.email || undefined"
              >
              <p v-if="errors.email" class="field-error">{{ errors.email }}</p>
            </div>
            <div class="field">
              <label for="su-password">— Contraseña</label>
              <input
                id="su-password"
                v-model="password"
                type="password"
                autocomplete="new-password"
                placeholder="Mínimo 8 caracteres"
                :aria-invalid="!!errors.password || undefined"
              >
              <p v-if="errors.password" class="field-error">{{ errors.password }}</p>
            </div>

            <label class="terms">
              <input v-model="acceptedTerms" type="checkbox">
              <span>
                He leído y acepto los
                <NuxtLink to="/terms" target="_blank">Términos</NuxtLink>
                y la
                <NuxtLink to="/privacy" target="_blank">Política de Privacidad</NuxtLink>.
              </span>
            </label>
            <p v-if="errors.terms" class="field-error terms-error">{{ errors.terms }}</p>

            <p v-if="errors.general" class="form-error" role="alert">{{ errors.general }}</p>

            <button type="submit" :disabled="loading || loadingGoogle" class="signup-submit">
              <template v-if="loading">Creando…</template>
              <template v-else>Crear cuenta →</template>
            </button>
          </form>

          <div class="signup-divider">
            <span class="line" aria-hidden="true" />
            <span class="lbl">o</span>
            <span class="line" aria-hidden="true" />
          </div>

          <button
            type="button"
            class="btn-google"
            :disabled="loading || loadingGoogle"
            @click="onGoogle"
          >
            <svg aria-hidden="true" width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
              <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4" />
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853" />
              <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05" />
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335" />
            </svg>
            <template v-if="loadingGoogle">Conectando…</template>
            <template v-else>Continuar con Google</template>
          </button>

          <div class="meta">
            <span>Sin tarjeta</span>
            <span>Cancela cuando quieras</span>
            <span>PWA en iOS · Android · Web</span>
          </div>

          <div class="login-link">
            <span>¿Ya tienes cuenta?</span>
            <NuxtLink to="/login">Inicia sesión</NuxtLink>
          </div>
        </template>
      </div>
    </section>

    <!-- ============ FOOTER ============ -->
    <footer class="footer">
      <div class="footer-inner">
        <div class="footer-top">
          <div class="footer-brand">
            <div class="logo">
              <img src="/sorbo.svg" alt="" aria-hidden="true" class="mark-svg-lg">
              <div class="name">Sorbo<span class="dot">.</span></div>
            </div>
            <p class="tag">"Un diario para cada sorbo. Hecho desde Colombia, con demasiados naturales."</p>
          </div>

          <!-- Una sola columna de links — las anteriores Comunidad y Cuenta
               tenían solo 1 item cada una y se veían desbalanceadas. -->
          <div class="footer-col">
            <h4>— Links</h4>
            <ul>
              <li><a href="#features" @click.prevent="smoothScroll('features')">Features</a></li>
              <li><a href="#como" @click.prevent="smoothScroll('como')">Cómo funciona</a></li>
              <li><a href="#por-que" @click.prevent="smoothScroll('por-que')">Por qué Sorbo</a></li>
              <li v-if="isLoggedIn"><NuxtLink to="/app">Ir a la app</NuxtLink></li>
              <li v-else><a href="#registro" @click.prevent="smoothScroll('registro')">Crear cuenta</a></li>
              <li v-if="!isLoggedIn"><NuxtLink to="/login">Iniciar sesión</NuxtLink></li>
              <li><a href="#faq" @click.prevent="smoothScroll('faq')">FAQ</a></li>
              <li><NuxtLink to="/about">Sobre el proyecto</NuxtLink></li>
              <li><a href="https://instagram.com/kurodacafe" target="_blank" rel="noopener">Instagram</a></li>
              <li><a href="mailto:info@sorbo.app">Contacto</a></li>
            </ul>
          </div>
        </div>

        <div class="footer-bottom">
          <div class="copy">© {{ new Date().getFullYear() }} KURODACAFE · TODOS LOS DERECHOS RESERVADOS</div>
          <div class="footer-legal">
            <NuxtLink to="/terms">Términos</NuxtLink>
            <span aria-hidden="true">·</span>
            <NuxtLink to="/privacy">Privacidad</NuxtLink>
          </div>
          <div class="made">Hecho con <span class="heart">♥</span> y demasiada cafeína</div>
        </div>
      </div>
    </footer>
  </div>
</template>

<style scoped>
/* All design tokens come from assets/css/main.css :root */
.landing {
  background: var(--paper);
  color: var(--moss);
  -webkit-font-smoothing: antialiased;
  overflow-x: hidden;
}
.landing :deep(html) { scroll-behavior: smooth; }

.eyebrow {
  font-family: var(--font-mono);
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.16em;
  color: var(--moss-soft);
  font-weight: 500;
}
.eyebrow.paper { color: rgba(244, 242, 235, 0.55); }
.eyebrow.honey { color: var(--honey); }

/* ==================== NAV ==================== */
.nav {
  position: fixed;
  top: 0; left: 0; right: 0;
  z-index: 50;
  padding: calc(env(safe-area-inset-top) + 18px) calc(env(safe-area-inset-right) + 32px) 18px calc(env(safe-area-inset-left) + 32px);
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(20, 23, 18, 0.85);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}
.nav .brand {
  display: flex;
  align-items: center;
  gap: 12px;
}
.nav .brand .mark-svg {
  width: 32px; height: 32px;
  display: block;
}
.nav .brand .name {
  font-family: var(--font-display);
  font-size: 22px;
  color: var(--paper);
  line-height: 1;
}
.nav .brand .name .dot { color: var(--honey); }
.nav .links {
  display: flex;
  gap: 28px;
  align-items: center;
}
.nav .links a {
  font-family: var(--font-mono);
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.16em;
  color: rgba(244, 242, 235, 0.6);
  transition: color 0.2s;
  cursor: pointer;
}
.nav .links a:hover { color: var(--paper); }
.nav .nav-cta {
  background: var(--honey);
  color: var(--moss);
  font-family: var(--font-sans);
  font-weight: 500;
  font-size: 13px;
  padding: 9px 16px;
  border-radius: 999px;
  transition: transform 0.2s;
}
.nav .nav-cta:hover { transform: translateY(-1px); color: var(--moss); }
/* Subtle text link, slightly heavier than the section links so el ojo
   lo separa del scroll-nav y lo lee como acción. */
.nav .nav-login {
  font-family: var(--font-sans) !important;
  text-transform: none !important;
  font-size: 13px !important;
  letter-spacing: 0 !important;
  color: rgba(244, 242, 235, 0.85) !important;
  font-weight: 500;
}
.nav .nav-login:hover { color: var(--paper) !important; }
/* Hamburger button — solo visible en mobile. */
.nav-burger {
  display: none;
  width: 44px;
  height: 44px;
  flex-direction: column;
  justify-content: center;
  gap: 5px;
  background: transparent;
  border: 0;
  cursor: pointer;
  padding: 0;
}
.nav-burger span {
  display: block;
  width: 22px;
  height: 1.5px;
  background: var(--paper);
  border-radius: 1px;
  margin: 0 auto;
  transition: opacity 0.15s;
}
.nav-burger:hover span { opacity: 0.7; }

@media (max-width: 760px) {
  .nav { padding: 14px 18px; }
  /* En mobile escondemos toda la nav-row de links y dejamos solo el
     hamburger — los links viven dentro del panel mobile. */
  .nav .links { display: none; }
  .nav-burger { display: flex; }
}

/* ──── Mobile nav panel ──── */
.mobile-nav {
  position: fixed;
  inset: 0;
  z-index: 100;
  background: var(--jungle);
  display: flex;
  flex-direction: column;
  padding: calc(env(safe-area-inset-top) + 18px) 24px calc(env(safe-area-inset-bottom) + 24px);
}
.mobile-nav-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 48px;
}
.mobile-nav-header .brand {
  display: flex;
  align-items: center;
  gap: 12px;
  color: var(--paper);
}
.mobile-nav-header .brand .mark-svg { width: 32px; height: 32px; display: block; }
.mobile-nav-header .brand .name {
  font-family: var(--font-display);
  font-size: 22px;
  color: var(--paper);
  line-height: 1;
}
.mobile-nav-header .brand .name .dot { color: var(--honey); }
.mobile-nav-close {
  width: 44px;
  height: 44px;
  background: transparent;
  border: 1px solid rgba(244, 242, 235, 0.18);
  border-radius: 50%;
  color: var(--paper);
  font-size: 26px;
  line-height: 1;
  cursor: pointer;
  transition: border-color 0.15s;
}
.mobile-nav-close:hover { border-color: rgba(244, 242, 235, 0.5); }

.mobile-nav-links {
  display: flex;
  flex-direction: column;
  gap: 0;
  flex: 1;
}
.mobile-nav-links a {
  font-family: var(--font-display);
  font-size: 26px;
  color: var(--paper);
  padding: 18px 0;
  border-bottom: 1px solid rgba(244, 242, 235, 0.08);
  transition: color 0.15s;
}
.mobile-nav-links a:hover { color: var(--honey); }
.mobile-nav-links a:last-child { border-bottom: 0; }

.mobile-nav-cta {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 32px;
}
.mobile-nav-btn {
  display: block;
  text-align: center;
  padding: 16px 22px;
  border-radius: 12px;
  font-family: var(--font-sans);
  font-weight: 500;
  font-size: 14px;
  transition: transform 0.2s;
}
.mobile-nav-btn:hover { transform: translateY(-1px); }
.mobile-nav-btn.primary {
  background: var(--honey);
  color: var(--moss);
}
.mobile-nav-btn.ghost {
  background: transparent;
  color: var(--paper);
  border: 1px solid rgba(244, 242, 235, 0.25);
}

.mobile-nav-foot {
  margin-top: 24px;
  text-align: center;
  font-family: var(--font-mono);
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.16em;
  color: rgba(244, 242, 235, 0.45);
}
.mobile-nav-foot a {
  color: var(--paper);
  margin: 0 6px;
}
.mobile-nav-foot a:hover { color: var(--honey); }

.mobile-nav-transition-enter,
.mobile-nav-transition-leave {
  transition: transform 0.28s cubic-bezier(0.32, 0, 0.18, 1), opacity 0.2s;
}
.mobile-nav-transition-enter.mobile-nav-transition-enter-from { transform: translateY(-12px); opacity: 0; }
/* CSS-only safety: hide the panel when not actively mounted (Vue Transition handles it,
   but ensures no leftover bug from class timing). */

/* ==================== HERO ==================== */
.hero {
  background: var(--moss);
  color: var(--paper);
  min-height: 100vh;
  padding: 140px 32px 80px;
  position: relative;
  overflow: hidden;
}
.hero::before {
  content: '';
  position: absolute;
  top: -10%; left: -10%;
  width: 60%; height: 60%;
  background: radial-gradient(circle, rgba(85, 107, 58, 0.45) 0%, transparent 65%);
  pointer-events: none;
}
.hero::after {
  content: '';
  position: absolute;
  bottom: -20%; right: -10%;
  width: 50%; height: 60%;
  background: radial-gradient(circle, rgba(229, 184, 75, 0.18) 0%, transparent 60%);
  pointer-events: none;
}
.hero-inner {
  max-width: 1280px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1.1fr 1fr;
  gap: 48px;
  align-items: center;
  position: relative;
  z-index: 1;
}
.hero-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 8px 14px;
  border: 1px solid rgba(244, 242, 235, 0.14);
  border-radius: 999px;
  margin-bottom: 32px;
}
.hero-eyebrow .dot-live {
  width: 6px; height: 6px;
  border-radius: 50%;
  background: var(--honey);
  box-shadow: 0 0 0 0 rgba(229, 184, 75, 0.5);
  animation: pulse 2s infinite;
}
@keyframes pulse {
  0% { box-shadow: 0 0 0 0 rgba(229, 184, 75, 0.6); }
  70% { box-shadow: 0 0 0 8px rgba(229, 184, 75, 0); }
  100% { box-shadow: 0 0 0 0 rgba(229, 184, 75, 0); }
}
.hero-eyebrow .label {
  font-family: var(--font-mono);
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.16em;
  color: var(--paper);
}
.hero h1 {
  font-family: var(--font-display);
  font-size: clamp(56px, 8vw, 112px);
  line-height: 0.92;
  letter-spacing: -0.02em;
  color: var(--paper);
  font-weight: 400;
}
.hero h1 em {
  font-style: italic;
  color: var(--honey);
}
.hero h1 .dot { color: var(--honey); }
.hero .subtitle {
  font-family: var(--font-display);
  font-style: italic;
  font-size: clamp(18px, 1.6vw, 22px);
  color: rgba(244, 242, 235, 0.65);
  margin-top: 28px;
  max-width: 460px;
  line-height: 1.4;
}
.hero-cta {
  margin-top: 44px;
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}
.btn-primary {
  background: var(--honey);
  color: var(--moss);
  font-family: var(--font-sans);
  font-weight: 500;
  font-size: 14px;
  padding: 16px 24px;
  border-radius: 14px;
  transition: transform 0.2s, box-shadow 0.2s;
  box-shadow: 0 6px 20px rgba(229, 184, 75, 0.18);
  cursor: pointer;
}
.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 28px rgba(229, 184, 75, 0.28);
  color: var(--moss);
}
.btn-ghost-light {
  background: transparent;
  color: var(--paper);
  font-family: var(--font-sans);
  font-weight: 500;
  font-size: 14px;
  padding: 16px 24px;
  border-radius: 14px;
  border: 1px solid rgba(244, 242, 235, 0.14);
  transition: background 0.2s;
}
.btn-ghost-light:hover {
  background: rgba(244, 242, 235, 0.06);
  color: var(--paper);
}
.hero-meta {
  margin-top: 44px;
  display: flex;
  gap: 32px;
  flex-wrap: wrap;
}
.hero-meta-item .num {
  font-family: var(--font-display);
  font-size: 32px;
  color: var(--paper);
  line-height: 1;
}
.hero-meta-item .num em { color: var(--honey); font-style: italic; }
.hero-meta-item .lbl {
  font-family: var(--font-display);
  font-style: italic;
  font-size: 13px;
  color: rgba(244, 242, 235, 0.55);
  margin-top: 4px;
}

/* iPhone mockup */
.device {
  position: relative;
  width: 340px;
  height: 700px;
  margin: 0 auto;
  background: var(--jungle);
  border-radius: 48px;
  padding: 12px;
  box-shadow:
    0 0 0 2px rgba(244, 242, 235, 0.08),
    0 40px 80px rgba(0, 0, 0, 0.5),
    0 20px 40px rgba(0, 0, 0, 0.3);
  transform: rotate(-3deg);
  transition: transform 0.6s cubic-bezier(0.2, 0.8, 0.2, 1);
}
.device:hover { transform: rotate(0deg) translateY(-6px); }
.device .screen {
  background: var(--paper);
  border-radius: 36px;
  width: 100%;
  height: 100%;
  overflow: hidden;
  position: relative;
}
.device .notch {
  position: absolute;
  top: 18px; left: 50%;
  transform: translateX(-50%);
  width: 100px; height: 26px;
  background: var(--jungle);
  border-radius: 999px;
  z-index: 5;
}
.device .statusbar {
  height: 50px;
  padding: 18px 26px 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 600;
  color: var(--moss);
}
.device .app-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 22px 16px;
}
.device .app-eyebrow {
  font-family: var(--font-mono);
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: var(--moss-soft);
}
.device .avatar {
  width: 30px; height: 30px;
  border-radius: 50%;
  background: var(--surface);
  display: flex; align-items: center; justify-content: center;
  font-family: var(--font-display);
  font-size: 13px;
  color: var(--moss);
}
.device .content { padding: 0 22px; }
.device .title-l {
  font-family: var(--font-display);
  font-size: 28px;
  line-height: 0.95;
  color: var(--moss);
}
.device .title-l em { font-style: italic; color: var(--olive); }
.device .seg-toggle {
  display: inline-flex;
  background: var(--surface);
  border-radius: 999px;
  padding: 4px;
  gap: 2px;
  margin-top: 14px;
}
.device .seg-toggle .seg-on {
  background: var(--paper);
  border-radius: 999px;
  padding: 6px 12px;
  font-family: var(--font-mono);
  font-size: 9px;
  font-weight: 500;
  color: var(--moss);
  letter-spacing: 0.14em;
  text-transform: uppercase;
}
.device .seg-toggle .seg-off {
  padding: 6px 12px;
  font-family: var(--font-mono);
  font-size: 9px;
  font-weight: 500;
  color: var(--moss-soft);
  letter-spacing: 0.14em;
  text-transform: uppercase;
}
.device .mood-card {
  position: relative;
  border-radius: 18px;
  padding: 18px 16px 16px;
  background: linear-gradient(135deg, var(--surface), var(--surface-2));
  overflow: hidden;
  margin-top: 16px;
}
.device .mood-blob {
  position: absolute;
  width: 140px; height: 140px;
  border-radius: 50%;
  background: var(--honey);
  opacity: 0.3;
  top: -40px; right: -30px;
  filter: blur(2px);
}
.device .mood-blob.olive { background: var(--olive-light); }
.device .mood-content { position: relative; z-index: 1; }
.device .mood-eyebrow {
  font-family: var(--font-mono);
  font-size: 9px;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: var(--moss-soft);
}
.device .mood-name {
  font-family: var(--font-display);
  font-size: 30px;
  line-height: 0.95;
  margin-top: 6px;
  color: var(--moss);
}
.device .mood-name.small { font-size: 24px; }
.device .mood-roaster {
  font-family: var(--font-display);
  font-style: italic;
  font-size: 11px;
  color: var(--moss-soft);
  margin-top: 3px;
}
.device .mood-notes {
  display: flex;
  gap: 5px;
  margin-top: 12px;
  flex-wrap: wrap;
}
.device .mood-chip {
  background: rgba(255, 255, 255, 0.7);
  color: var(--moss);
  padding: 4px 9px;
  border-radius: 999px;
  font-family: var(--font-sans);
  font-size: 10px;
  font-weight: 500;
}
.device .mood-footer {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-top: 14px;
}
.device .mood-score {
  font-family: var(--font-display);
  font-size: 26px;
  line-height: 1;
  color: var(--olive);
}
.device .mood-meta {
  font-family: var(--font-mono);
  font-size: 9px;
  color: var(--moss-soft);
}
.device .tabbar {
  position: absolute;
  bottom: 0; left: 0; right: 0;
  height: 60px;
  background: var(--paper);
  border-top: 1px solid rgba(47, 53, 40, 0.10);
  display: flex;
  justify-content: space-around;
  align-items: center;
  padding: 8px 12px 14px;
}
.device .tab {
  font-family: var(--font-mono);
  font-size: 8px;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: var(--moss-soft);
}
.device .tab.active {
  font-family: var(--font-display);
  font-style: italic;
  text-transform: none;
  letter-spacing: 0;
  font-size: 12px;
  color: var(--olive);
}
.device .tab.active::before { content: '● '; color: var(--olive); }

@media (max-width: 980px) {
  .hero-inner { grid-template-columns: 1fr; }
  .device { transform: rotate(0deg) scale(0.9); margin-top: 40px; }
}
@media (max-width: 560px) {
  .hero { padding: 120px 18px 60px; }
  .device { width: 300px; height: 620px; }
}

/* ==================== MANIFIESTO ==================== */
.manifiesto {
  background: var(--paper);
  padding: 140px 32px;
  position: relative;
}
.manifiesto-inner {
  max-width: 980px;
  margin: 0 auto;
  text-align: center;
}
.manifiesto blockquote {
  font-family: var(--font-display);
  font-style: italic;
  font-size: clamp(36px, 5vw, 64px);
  line-height: 1.15;
  color: var(--moss);
  letter-spacing: -0.01em;
}
.manifiesto blockquote .accent { color: var(--olive); }
.manifiesto .author {
  margin-top: 40px;
  display: inline-flex;
  align-items: center;
  gap: 14px;
}
.manifiesto .author .line {
  width: 32px; height: 1px;
  background: rgba(47, 53, 40, 0.18);
}
.manifiesto .author .label {
  font-family: var(--font-mono);
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.16em;
  color: var(--moss-soft);
}
@media (max-width: 560px) {
  .manifiesto { padding: 80px 24px; }
}

/* ==================== FEATURES ==================== */
.features {
  background: var(--surface-2);
  padding: 120px 32px;
}
.features-inner {
  max-width: 1280px;
  margin: 0 auto;
}
.section-head {
  margin-bottom: 64px;
  max-width: 720px;
}
.section-head h2 {
  font-family: var(--font-display);
  font-size: clamp(40px, 5vw, 64px);
  line-height: 0.95;
  letter-spacing: -0.01em;
  color: var(--moss);
  margin-top: 16px;
  font-weight: 400;
}
.section-head h2 em { color: var(--olive); font-style: italic; }
.section-head p {
  font-family: var(--font-display);
  font-style: italic;
  font-size: 18px;
  color: var(--moss-soft);
  margin-top: 16px;
  max-width: 580px;
}
.features-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 18px;
}
.feature-card {
  background: var(--paper);
  border: 1px solid rgba(47, 53, 40, 0.10);
  border-radius: 18px;
  padding: 28px;
  transition: transform 0.3s, box-shadow 0.3s;
  position: relative;
  overflow: hidden;
}
.feature-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 14px 40px rgba(47, 53, 40, 0.08);
}
.feature-card.dark { background: var(--moss); color: var(--paper); border-color: transparent; }
.feature-card.olive { background: var(--olive); color: var(--paper); border-color: transparent; }
.feature-card .num {
  font-family: var(--font-display);
  font-size: 60px;
  line-height: 1;
  color: var(--olive);
  opacity: 0.25;
}
.feature-card.dark .num { color: var(--honey); opacity: 0.35; }
.feature-card.olive .num { color: var(--honey); opacity: 0.55; }
.feature-card h3 {
  font-family: var(--font-display);
  font-size: 26px;
  line-height: 1;
  margin-top: 24px;
  font-weight: 400;
}
.feature-card h3 em { font-style: italic; color: var(--olive); }
.feature-card.dark h3 em,
.feature-card.olive h3 em { color: var(--honey); }
.feature-card p {
  font-family: var(--font-sans);
  font-size: 13px;
  line-height: 1.6;
  color: var(--moss-soft);
  margin-top: 12px;
}
.feature-card.dark p { color: rgba(244, 242, 235, 0.65); }
.feature-card.olive p { color: rgba(244, 242, 235, 0.75); }

/* Card 05 (Explora) — destacada a lo ancho de toda la fila */
.feature-card.wide {
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
  gap: 40px;
}
.feature-card.wide .num { flex-shrink: 0; }
.feature-card.wide .wide-text h3 { margin-top: 0; }
.feature-card.wide .wide-text p { max-width: 620px; }

@media (max-width: 980px) {
  .features-grid { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 560px) {
  .features { padding: 80px 18px; }
  .features-grid { grid-template-columns: 1fr; }
  .feature-card.wide {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
}

/* ==================== HOW ==================== */
.how {
  background: var(--paper);
  padding: 120px 32px;
}
.how-inner {
  max-width: 1280px;
  margin: 0 auto;
}
.steps {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0;
  border-top: 1px solid rgba(47, 53, 40, 0.18);
  border-bottom: 1px solid rgba(47, 53, 40, 0.18);
}
.step {
  padding: 48px 32px 56px;
  border-right: 1px solid rgba(47, 53, 40, 0.10);
  position: relative;
}
.step:last-child { border-right: 0; }
.step .step-num {
  font-family: var(--font-mono);
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.18em;
  color: var(--olive);
}
.step h3 {
  font-family: var(--font-display);
  font-size: 38px;
  line-height: 1;
  margin-top: 24px;
  letter-spacing: -0.01em;
  font-weight: 400;
}
.step h3 em { font-style: italic; color: var(--olive); }
.step p {
  font-family: var(--font-display);
  font-style: italic;
  font-size: 15px;
  color: var(--moss-soft);
  margin-top: 14px;
  line-height: 1.5;
}
.step .visual {
  margin-top: 32px;
  padding: 18px;
  background: var(--surface-2);
  border-radius: 14px;
  min-height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
}
@media (max-width: 880px) {
  .steps { grid-template-columns: 1fr; }
  .step { border-right: 0; border-bottom: 1px solid rgba(47, 53, 40, 0.10); }
  .step:last-child { border-bottom: 0; }
}
@media (max-width: 560px) {
  .how { padding: 80px 18px; }
  .step { padding: 32px 18px 40px; }
}

.v-add {
  width: 100%;
  background: var(--paper);
  border: 1px solid rgba(47, 53, 40, 0.10);
  border-radius: 12px;
  padding: 14px;
}
.v-add .lbl {
  font-family: var(--font-mono);
  font-size: 9px;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: var(--moss-soft);
}
.v-add .val {
  font-family: var(--font-display);
  font-size: 18px;
  color: var(--moss);
  margin-top: 4px;
}
.v-add .val.olive { color: var(--olive); }
.v-add .sep {
  height: 1px;
  background: rgba(47, 53, 40, 0.10);
  margin: 14px 0;
}

.v-cata {
  background: var(--moss);
  color: var(--paper);
  border-radius: 14px;
  padding: 18px;
  width: 100%;
}
.v-cata .lbl {
  font-family: var(--font-mono);
  font-size: 9px;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: rgba(244, 242, 235, 0.5);
}
.v-cata .score {
  font-family: var(--font-display);
  font-size: 48px;
  line-height: 1;
  color: var(--honey);
  margin-top: 4px;
}
.v-cata .score sub {
  font-size: 16px;
  color: rgba(244, 242, 235, 0.4);
  font-style: italic;
  vertical-align: baseline;
}
.v-cata .bar {
  height: 3px;
  background: rgba(229, 184, 75, 0.18);
  border-radius: 3px;
  margin-top: 14px;
  position: relative;
  overflow: hidden;
}
.v-cata .bar div {
  position: absolute;
  left: 0; top: 0; bottom: 0;
  width: 87%;
  background: var(--honey);
  border-radius: 3px;
}

.v-mem {
  width: 100%;
  background: linear-gradient(135deg, var(--surface), var(--surface-2));
  border-radius: 14px;
  padding: 18px;
  position: relative;
  overflow: hidden;
}
.v-mem .blob {
  position: absolute;
  width: 100px; height: 100px;
  border-radius: 50%;
  background: var(--olive-light);
  opacity: 0.35;
  top: -30px; right: -20px;
  filter: blur(2px);
}
.v-mem .lbl {
  font-family: var(--font-mono);
  font-size: 9px;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: var(--moss-soft);
  position: relative;
  z-index: 1;
}
.v-mem .name {
  font-family: var(--font-display);
  font-size: 24px;
  color: var(--moss);
  margin-top: 4px;
  position: relative;
  z-index: 1;
}
.v-mem .quote {
  font-family: var(--font-display);
  font-style: italic;
  font-size: 12px;
  color: var(--moss-soft);
  margin-top: 8px;
  position: relative;
  z-index: 1;
}

/* ==================== POR QUÉ SORBO ==================== */
.why {
  background: var(--moss);
  color: var(--paper);
  padding: 120px 32px;
  position: relative;
  overflow: hidden;
}
.why::before {
  content: '';
  position: absolute;
  top: 50%; left: -10%;
  transform: translateY(-50%);
  width: 50%; height: 80%;
  background: radial-gradient(ellipse, rgba(85, 107, 58, 0.4) 0%, transparent 70%);
  pointer-events: none;
}
.why-inner {
  max-width: 1280px;
  margin: 0 auto;
  position: relative;
  z-index: 1;
}
.why-inner h2 {
  font-family: var(--font-display);
  font-size: clamp(40px, 5vw, 72px);
  line-height: 0.95;
  letter-spacing: -0.01em;
  color: var(--paper);
  max-width: 880px;
  margin-top: 16px;
  font-weight: 400;
}
.why-inner h2 em { color: var(--honey); font-style: italic; }
.why-grid {
  margin-top: 48px;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0;
  border-top: 1px solid rgba(244, 242, 235, 0.14);
}
.why-item {
  padding: 40px 32px 0 32px;
  border-right: 1px solid rgba(244, 242, 235, 0.14);
}
/* La primera columna alinea con el H2; las demás llevan aire a la
   izquierda para no pegarse a la línea divisoria. */
.why-item:first-child { padding-left: 0; }
.why-item:last-child { border-right: 0; padding-right: 0; }
.why-item .icon {
  font-family: var(--font-display);
  font-size: 56px;
  line-height: 1;
  color: var(--honey);
}
.why-item h3 {
  font-family: var(--font-display);
  font-size: 24px;
  margin-top: 24px;
  color: var(--paper);
  font-weight: 400;
}
.why-item h3 em { font-style: italic; color: var(--honey); }
.why-item p {
  font-family: var(--font-sans);
  font-size: 14px;
  line-height: 1.6;
  color: rgba(244, 242, 235, 0.65);
  margin-top: 12px;
}
@media (max-width: 880px) {
  .why-grid { grid-template-columns: 1fr; }
  .why-item {
    border-right: 0;
    border-bottom: 1px solid rgba(244, 242, 235, 0.14);
    padding: 32px 0;
  }
  .why-item:last-child { border-bottom: 0; }
}
@media (max-width: 560px) {
  .why { padding: 80px 18px; }
}

/* ==================== VOICES / TESTIMONIALES ==================== */
.voices {
  background: var(--surface);
  padding: 100px 32px;
}
.voices-inner {
  max-width: 1080px;
  margin: 0 auto;
}
.voices h2 {
  font-family: var(--font-display);
  font-size: clamp(36px, 4.5vw, 60px);
  line-height: 0.95;
  letter-spacing: -0.02em;
  color: var(--moss);
  margin-top: 14px;
  font-weight: 400;
}
.voices h2 em { font-style: italic; color: var(--olive); }
.voices-grid {
  margin-top: 40px;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
}
.voice {
  padding: 28px;
  background: var(--paper);
  border: 1px solid rgba(47, 53, 40, 0.08);
  border-radius: 14px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  margin: 0;
}
.voice blockquote {
  font-family: var(--font-display);
  font-style: italic;
  font-size: 18px;
  line-height: 1.45;
  color: var(--moss);
  margin: 0;
}
.voice figcaption {
  font-family: var(--font-mono);
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: var(--moss-soft);
}
.voice figcaption cite {
  color: var(--olive);
  font-style: normal;
  font-weight: 500;
}
.voices-note {
  margin-top: 32px;
  font-family: var(--font-mono);
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.16em;
  color: var(--moss-ghost);
  text-align: center;
}
.voices-image {
  display: block;
  margin: 48px auto 0;
  width: 100%;
  max-width: 560px;
  height: auto;
  border-radius: 12px;
  box-shadow: 0 12px 40px rgba(20, 23, 18, 0.12);
}
@media (max-width: 880px) {
  .voices-grid { grid-template-columns: 1fr; }
}
@media (max-width: 560px) {
  .voices { padding: 72px 18px; }
}

/* ==================== FAQ ====================
   Lista vertical de Q/A. Cada pregunta es H3 con tipo serif italic;
   la respuesta arranca con la frase clave para extracción por AI
   engines (primera oración debe poder citarse sola). */
.faq {
  background: var(--paper);
  padding: 120px 32px;
}
.faq-inner {
  max-width: 920px;
  margin: 0 auto;
}
.faq h2 {
  font-family: var(--font-display);
  font-size: clamp(40px, 5vw, 72px);
  line-height: 0.95;
  letter-spacing: -0.02em;
  color: var(--moss);
  margin-top: 18px;
  font-weight: 400;
}
.faq h2 em { font-style: italic; color: var(--olive); }
.faq-list {
  margin-top: 56px;
  display: flex;
  flex-direction: column;
  gap: 0;
}
.faq-item {
  padding: 32px 0;
  border-top: 1px solid rgba(47, 53, 40, 0.10);
}
.faq-item:last-child {
  border-bottom: 1px solid rgba(47, 53, 40, 0.10);
}
.faq-item h3 {
  font-family: var(--font-display);
  font-size: 24px;
  line-height: 1.2;
  color: var(--moss);
  font-weight: 400;
  margin-bottom: 14px;
}
.faq-item h3::before {
  content: '— ';
  color: var(--olive);
  font-style: normal;
}
.faq-item p {
  font-family: var(--font-sans);
  font-size: 15px;
  line-height: 1.7;
  color: var(--moss-soft);
  max-width: 720px;
}
@media (max-width: 560px) {
  .faq { padding: 80px 18px; }
  .faq-item h3 { font-size: 20px; }
  .faq-item p { font-size: 14px; }
}

/* ==================== WAITLIST ==================== */
.waitlist {
  background: var(--surface-2);
  padding: 140px 32px;
  position: relative;
}
.waitlist-inner {
  max-width: 720px;
  margin: 0 auto;
  text-align: center;
}
.waitlist h2 {
  font-family: var(--font-display);
  font-size: clamp(44px, 6vw, 80px);
  line-height: 0.95;
  letter-spacing: -0.02em;
  color: var(--moss);
  margin-top: 18px;
  font-weight: 400;
}
.waitlist h2 em { font-style: italic; color: var(--olive); }
.waitlist p {
  font-family: var(--font-display);
  font-style: italic;
  font-size: 18px;
  color: var(--moss-soft);
  margin-top: 20px;
}
.waitlist-form {
  margin: 48px auto 0;
  display: flex;
  gap: 8px;
  max-width: 480px;
  background: var(--paper);
  padding: 8px;
  border-radius: 16px;
  border: 1px solid rgba(47, 53, 40, 0.10);
}
.waitlist-form input {
  flex: 1;
  background: transparent;
  border: 0;
  outline: 0;
  padding: 12px 16px;
  font-family: var(--font-sans);
  font-size: 14px;
  color: var(--moss);
}
.waitlist-form input::placeholder {
  color: var(--moss-ghost);
  font-style: italic;
  font-family: var(--font-display);
}
.waitlist-form button {
  background: var(--moss);
  color: var(--paper);
  padding: 12px 22px;
  border-radius: 12px;
  font-family: var(--font-sans);
  font-weight: 500;
  font-size: 13px;
  transition: background 0.2s;
  border: 0;
  cursor: pointer;
}
.waitlist-form button:hover { background: var(--jungle); }
.waitlist-form button:disabled { cursor: default; }
.waitlist-form button.done { background: var(--olive); }
.waitlist .form-error {
  margin-top: 12px;
  font-family: var(--font-sans);
  font-size: 14px;
  color: var(--terracotta);
  text-align: center;
}
.waitlist .meta {
  margin-top: 24px;
  display: flex;
  justify-content: center;
  gap: 24px;
  flex-wrap: wrap;
}
.waitlist .meta span {
  font-family: var(--font-mono);
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.16em;
  color: var(--moss-soft);
}
.waitlist .meta span::before { content: '· '; color: var(--olive); margin-right: 4px; }
.waitlist .login-link {
  margin-top: 32px;
  font-family: var(--font-display);
  font-style: italic;
  font-size: 13px;
  color: var(--moss-soft);
}
.waitlist .login-link a {
  color: var(--olive);
  font-style: normal;
  font-family: var(--font-sans);
  font-weight: 500;
  margin-left: 6px;
}
.waitlist .login-link a:hover { text-decoration: underline; }
.waitlist-fineprint {
  margin-top: 18px;
  font-family: var(--font-mono);
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: var(--moss-soft);
}
.waitlist-fineprint a {
  color: var(--olive);
  font-weight: 500;
}
.waitlist-fineprint a:hover { text-decoration: underline; }

/* ───── Registro inline (reemplaza al waitlist-form) ───── */
.signup-form {
  margin: 40px auto 0;
  max-width: 420px;
  text-align: left;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.signup-form .field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px 14px 8px;
  background: var(--paper);
  border: 1px solid rgba(47, 53, 40, 0.10);
  border-radius: 12px;
  transition: border-color 0.15s;
}
.signup-form .field:focus-within {
  border-color: rgba(85, 107, 58, 0.5);
}
.signup-form .field label {
  font-family: var(--font-mono);
  font-size: 9px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.18em;
  color: var(--moss-soft);
}
.signup-form .field input {
  background: transparent;
  border: 0;
  outline: 0;
  padding: 0;
  font-family: var(--font-sans);
  font-size: 15px;
  color: var(--moss);
  width: 100%;
}
.signup-form .field input::placeholder {
  color: var(--moss-ghost);
  font-style: italic;
  font-family: var(--font-display);
  font-size: 14px;
}
.signup-form .field-error {
  font-family: var(--font-mono);
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: var(--terracotta);
  margin-top: -4px;
}
.signup-form .terms {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-top: 4px;
  cursor: pointer;
}
.signup-form .terms input[type="checkbox"] {
  margin-top: 3px;
  width: 16px; height: 16px;
  flex-shrink: 0;
  accent-color: var(--olive);
  cursor: pointer;
}
.signup-form .terms span {
  font-family: var(--font-sans);
  font-size: 13px;
  color: var(--moss-soft);
  line-height: 1.5;
  text-align: left;
}
.signup-form .terms a {
  color: var(--olive);
  font-weight: 500;
}
.signup-form .terms a:hover { text-decoration: underline; }
.signup-form .terms-error {
  margin-top: 0;
  text-align: left;
}
.signup-form .signup-submit {
  margin-top: 10px;
  background: var(--moss);
  color: var(--paper);
  font-family: var(--font-sans);
  font-weight: 500;
  font-size: 14px;
  padding: 14px 22px;
  border-radius: 12px;
  border: 0;
  cursor: pointer;
  transition: background 0.2s, transform 0.2s;
}
.signup-form .signup-submit:hover:not(:disabled) {
  background: var(--jungle);
  transform: translateY(-1px);
}
.signup-form .signup-submit:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

/* ───── Divider "o" ───── */
.signup-divider {
  margin: 24px auto 18px;
  max-width: 420px;
  display: flex;
  align-items: center;
  gap: 14px;
}
.signup-divider .line {
  flex: 1;
  height: 1px;
  background: rgba(47, 53, 40, 0.15);
}
.signup-divider .lbl {
  font-family: var(--font-mono);
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.2em;
  color: var(--moss-soft);
}

/* ───── Google button ───── */
.btn-google {
  margin: 0 auto;
  max-width: 420px;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  background: var(--paper);
  color: var(--moss);
  font-family: var(--font-sans);
  font-weight: 500;
  font-size: 14px;
  padding: 13px 22px;
  border-radius: 12px;
  border: 1px solid rgba(47, 53, 40, 0.15);
  cursor: pointer;
  transition: border-color 0.2s, transform 0.2s;
}
.btn-google:hover:not(:disabled) {
  border-color: rgba(47, 53, 40, 0.35);
  transform: translateY(-1px);
}
.btn-google:disabled { opacity: 0.6; cursor: not-allowed; }

/* ───── CTA logged-in state (Ir a tu diario) ───── */
.signup-cta-go {
  margin: 40px auto 0;
  display: inline-block;
}

@media (max-width: 560px) {
  .waitlist { padding: 80px 18px; }
  .waitlist-form { flex-direction: column; }
  .waitlist-form button { width: 100%; }
}

/* ==================== FOOTER ==================== */
.footer {
  background: var(--jungle);
  color: var(--paper);
  padding: 80px 32px 40px;
}
.footer-inner {
  max-width: 1280px;
  margin: 0 auto;
}
.footer-top {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 40px;
  padding-bottom: 56px;
  border-bottom: 1px solid rgba(244, 242, 235, 0.14);
}
.footer-brand .logo {
  display: flex;
  align-items: center;
  gap: 14px;
}
.footer-brand .mark-svg-lg {
  width: 56px; height: 56px;
  display: block;
}
.footer-brand .name {
  font-family: var(--font-display);
  font-size: 36px;
  line-height: 1;
}
.footer-brand .name .dot { color: var(--honey); }
.footer-brand .tag {
  font-family: var(--font-display);
  font-style: italic;
  font-size: 14px;
  color: rgba(244, 242, 235, 0.5);
  margin-top: 18px;
  max-width: 280px;
  line-height: 1.4;
}
.footer-col h4 {
  font-family: var(--font-mono);
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.18em;
  color: rgba(244, 242, 235, 0.5);
  font-weight: 500;
  margin-bottom: 18px;
}
.footer-col ul {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 0;
  margin: 0;
}
.footer-col a {
  font-family: var(--font-sans);
  font-size: 14px;
  color: rgba(244, 242, 235, 0.7);
  transition: color 0.2s;
}
.footer-col a:hover { color: var(--honey); }
.footer-bottom {
  padding-top: 32px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
}
.footer-bottom .copy {
  font-family: var(--font-mono);
  font-size: 11px;
  color: rgba(244, 242, 235, 0.4);
  letter-spacing: 0.12em;
}
.footer-bottom .made {
  font-family: var(--font-display);
  font-style: italic;
  font-size: 13px;
  color: rgba(244, 242, 235, 0.5);
}
.footer-bottom .made .heart { color: var(--terracotta); }
.footer-legal {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-family: var(--font-mono);
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: rgba(244, 242, 235, 0.5);
}
.footer-legal a {
  color: rgba(244, 242, 235, 0.7);
  transition: color 0.2s;
}
.footer-legal a:hover { color: var(--honey); }
@media (max-width: 880px) {
  .footer-top { grid-template-columns: 1fr 1fr; }
}
@media (max-width: 520px) {
  .footer-top { grid-template-columns: 1fr; }
}
</style>
