<script setup lang="ts">
import { computed } from 'vue'

definePageMeta({ layout: 'admin' })

interface Health {
  runs: { at: string | null, candidates: number, sent: number, failed: number, pruned: number }[]
  waitlist: { email: string, source: string, createdAt: string | null }[]
}
const { data, error, load } = useAdminCall<Health>('adminHealth')

const MIN = 60_000
const tz = 'America/Bogota'
const hour = new Intl.DateTimeFormat('es-CO', { hour: 'numeric', minute: '2-digit', hour12: false, timeZone: tz })
const day = new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short', timeZone: tz })
const dayKey = new Intl.DateTimeFormat('en-CA', { timeZone: tz })
const when = (iso: string | null) => {
  if (!iso) return '—'
  const d = new Date(iso)
  const today = dayKey.format(new Date())
  const yesterday = dayKey.format(new Date(Date.now() - 1440 * MIN))
  const k = dayKey.format(d)
  return `${k === today ? 'Hoy' : k === yesterday ? 'Ayer' : day.format(d).replace('.', '')} ${hour.format(d)}`
}

// Corre cada hora: más de 90 minutos sin corrida es raro.
const status = computed(() => {
  const last = data.value?.runs[0]?.at
  if (!last) return { ok: true, text: 'Todavía no hay corridas guardadas: aparecen desde la próxima hora.' }
  const mins = Math.round((Date.now() - new Date(last).getTime()) / MIN)
  const ago = mins < 60 ? `hace ${mins} min` : `hace ${Math.round(mins / 60)} h`
  return mins > 90 ? { ok: false, text: `No corre desde ${when(last)}` } : { ok: true, text: `Corrió ${ago} · cada hora` }
})

const weekAgo = Date.now() - 7 * 1440 * MIN
const waitlistNew = computed(() => (data.value?.waitlist ?? []).filter(w => w.createdAt && new Date(w.createdAt).getTime() >= weekAgo).length)

function downloadCsv() {
  const quote = (v: string) => `"${v.replaceAll('"', '""')}"`
  const lines = ['correo,origen,fecha', ...(data.value?.waitlist ?? []).map(w => [w.email, w.source, w.createdAt ?? ''].map(quote).join(','))]
  const url = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' }))
  const a = Object.assign(document.createElement('a'), { href: url, download: `sorbo-lista-de-espera-${dayKey.format(new Date())}.csv` })
  a.click()
  URL.revokeObjectURL(url)
}

// Los de este despliegue: NUXT_PUBLIC_FLAGS se fija al publicar en Vercel.
const flags = String(useRuntimeConfig().public.flags || '').split(',').map(s => s.trim()).filter(Boolean)

const links = [
  { name: 'Sentry', what: 'Errores de la app', href: 'https://sentry.io/' },
  { name: 'Vercel', what: 'Deploys y variables', href: 'https://vercel.com/dashboard' },
  { name: 'Firebase', what: 'Funciones, base de datos y cuentas', href: 'https://console.firebase.google.com/project/coffee-app-85052/overview' },
]
</script>

<template>
  <div class="page">
    <header class="head">
      <div class="titles">
        <h1 class="v3-display-xl">Todo <span class="v3-accent-word">en orden</span></h1>
        <p class="subtitle">Lo que corre solo: recordatorios, lista de espera e interruptores.</p>
      </div>
    </header>

    <p v-if="error" class="v3-alert v3-alert--error">
      No se pudo revisar: {{ error }}
      <button type="button" class="v3-link retry" @click="load">Reintentar</button>
    </p>
    <p v-else-if="!data" class="loading v3-meta" role="status"><span class="v3-spinner" aria-hidden="true" />Revisando…</p>

    <template v-else>
      <div class="row">
        <section aria-labelledby="as-rec" class="card wide">
          <div class="card-head">
            <h2 id="as-rec" class="card-title">Recordatorio diario</h2>
            <span class="state" :class="{ 'state--bad': !status.ok }"><span class="led" aria-hidden="true" />{{ status.text }}</span>
          </div>
          <div v-if="data.runs.length" class="table-box">
            <table class="table runs">
              <thead>
                <tr>
                  <th scope="col">Corrida</th>
                  <th scope="col" class="num">Les tocaba</th>
                  <th scope="col" class="num">Enviados</th>
                  <th scope="col" class="num">Fallidos</th>
                  <th scope="col" class="num">Dispositivos quitados</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="r in data.runs" :key="r.at ?? ''">
                  <td class="name">{{ when(r.at) }}</td>
                  <td class="num">{{ r.candidates }}</td>
                  <td class="num">{{ r.sent }}</td>
                  <td class="num" :class="r.failed ? 'bad' : 'soft'">{{ r.failed }}</td>
                  <td class="num soft">{{ r.pruned }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p class="v3-meta foot">Un fallido suele ser un dispositivo que ya no existe; Sorbo lo quita solo.</p>
        </section>

        <section aria-labelledby="as-espera" class="card narrow dark">
          <h2 id="as-espera" class="card-title">Lista de espera</h2>
          <span class="big">{{ data.waitlist.length }}<span class="dot" aria-hidden="true">.</span></span>
          <span class="dark-meta">+{{ waitlistNew }} en 7 días</span>
          <button type="button" class="csv" :disabled="!data.waitlist.length" @click="downloadCsv">Descargar correos (CSV)</button>
        </section>
      </div>

      <div class="row">
        <section aria-labelledby="as-flags" class="card wide">
          <div class="card-head">
            <h2 id="as-flags" class="card-title">Interruptores en producción</h2>
            <span class="v3-meta">{{ flags.length }} encendidos</span>
          </div>
          <ul class="flags">
            <li v-for="f in flags" :key="f">{{ f }}</li>
          </ul>
          <p class="v3-meta foot">Solo se ven. Se cambian en Vercel (NUXT_PUBLIC_FLAGS) y piden un deploy nuevo. Los que no están aquí siguen apagados.</p>
        </section>

        <section aria-labelledby="as-links" class="card narrow">
          <h2 id="as-links" class="card-title">Para ver más</h2>
          <a v-for="l in links" :key="l.name" :href="l.href" target="_blank" rel="noopener" class="ext">
            <span class="ext-text">
              <span class="ext-name">{{ l.name }}</span>
              <span class="v3-meta">{{ l.what }}</span>
            </span>
            <Icon name="lucide:arrow-up-right" size="18" />
          </a>
        </section>
      </div>
    </template>
  </div>
</template>

<style scoped>
.page { gap: 28px; }
.state { display: inline-flex; align-items: center; gap: 8px; font: 500 14px/20px var(--font-sans); }
.led { width: 8px; height: 8px; border-radius: 9999px; background: var(--primary); }
.state--bad { color: var(--danger); }
.state--bad .led { background: var(--danger); }
.runs .num { text-align: right; }
.bad { color: var(--danger); font-weight: 600; }
.foot { margin: 0; }
.big { font: 400 64px/64px var(--font-display); }
.csv { margin-top: auto; align-self: flex-start; height: 44px; padding: 0 16px; border: 0; border-radius: 14px; background: var(--on-brand-surface); color: var(--brand-surface); font: 600 14px/20px var(--font-sans); cursor: pointer; }
.csv:disabled { opacity: 0.5; cursor: not-allowed; }
.flags { margin: 0; padding: 0; list-style: none; display: flex; flex-wrap: wrap; gap: 8px; }
.flags li { display: inline-flex; align-items: center; height: 32px; padding: 0 12px; border-radius: 9999px; background: var(--primary); color: var(--on-primary); font: 500 14px/20px var(--font-mono); }
.ext { display: flex; align-items: center; justify-content: space-between; gap: 12px; min-height: 52px; padding: 0 16px; border-radius: 12px; background: var(--bg); color: var(--ink); text-decoration: none; }
.ext:hover { background: var(--surface-strong); }
.ext-text { display: flex; flex-direction: column; gap: 2px; }
.ext-name { font: 600 15px/20px var(--font-sans); }
</style>
