<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import type { Pulse } from '~/functions/src/pulse'

definePageMeta({ layout: 'admin', middleware: 'admin' })

const { $firebase } = useNuxtApp()
const data = ref<Pulse | null>(null)
const error = ref('')
const range = ref<'week' | 'month'>('week')

async function load() {
  error.value = ''
  try {
    const { getFunctions, httpsCallable } = await import('firebase/functions')
    const call = httpsCallable<void, Pulse>(getFunctions($firebase, 'us-central1'), 'adminPulse')
    data.value = (await call()).data
  }
  catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  }
}
onMounted(load)

const num = new Intl.NumberFormat('es-CO')
const pct = (part: number, total: number) => (total ? Math.round(part / total * 100) : 0)
const tz = 'America/Bogota'
const dayMonth = new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short', timeZone: tz })
const dayOnly = new Intl.DateTimeFormat('es-CO', { day: 'numeric', timeZone: tz })
const monthOf = new Intl.DateTimeFormat('es-CO', { month: 'numeric', timeZone: tz })

const kpis = computed(() => {
  const d = data.value
  if (!d) return []
  const w = d[range.value]
  const days = range.value === 'week' ? 7 : 30
  return [
    { label: 'Personas registradas', value: num.format(d.registered), sub: `+${num.format(w.newUsers)} en ${days} días` },
    { label: 'Activas', value: num.format(w.active), sub: `Anotaron algo en ${days} días · ${pct(w.active, d.registered)} %` },
    { label: 'Notas', value: num.format(w.notes), sub: w.active ? `${(w.notes / w.active).toLocaleString('es-CO', { maximumFractionDigits: 1 })} por persona activa` : 'Nadie anotó todavía' },
    { label: 'Activación', value: `${pct(d.funnel.threeNotes, d.registered)} %`, sub: 'Llegan a 3 notas' },
  ]
})

const bars = computed(() => {
  const weeks = data.value?.weekly ?? []
  const max = Math.max(1, ...weeks.map(w => w.notes))
  return weeks.map((w, i) => {
    const start = new Date(w.start)
    const newMonth = i === 0 || monthOf.format(start) !== monthOf.format(new Date(weeks[i - 1].start))
    return { ...w, label: (newMonth ? dayMonth : dayOnly).format(start).replace('.', ''), h: `${Math.round(w.notes / max * 100)}%`, last: i === weeks.length - 1 }
  })
})
const barsLabel = computed(() => `Notas por semana, de la más vieja a la actual: ${bars.value.map(b => b.notes).join(', ')}`)

const funnel = computed(() => {
  const f = data.value?.funnel
  if (!f) return []
  return [
    ['Se registran', f.registered],
    ['Agregan su primer café', f.firstCoffee],
    ['Anotan su primera nota', f.firstNote],
    ['Llegan a 3 notas', f.threeNotes],
  ].map(([label, n]) => ({ label: label as string, count: num.format(n as number), pct: pct(n as number, f.registered) }))
})

const ago = (iso: string) => {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
  return days <= 0 ? 'Hoy' : days === 1 ? 'Ayer' : `Hace ${days} días`
}

const totals = computed(() => {
  const t = data.value?.totals
  if (!t) return []
  return [['Cafés', t.coffees], ['Notas', t.notes], ['Recetas', t.recipes], ['Amistades', t.friendships]]
    .map(([label, n]) => ({ label, value: num.format(n as number) }))
})
</script>

<template>
  <div class="page">
    <header class="head">
      <div class="titles">
        <h1 class="v3-display-xl">El <span class="v3-accent-word">pulso</span></h1>
        <p class="subtitle">Cómo se usa Sorbo. Solo conteos: nunca ves lo que alguien escribió.</p>
      </div>
      <div role="group" aria-label="Periodo" class="seg">
        <button type="button" :aria-pressed="range === 'week'" @click="range = 'week'">Esta semana</button>
        <button type="button" :aria-pressed="range === 'month'" @click="range = 'month'">Últimos 30 días</button>
      </div>
    </header>

    <p v-if="error" class="v3-alert v3-alert--error">
      No se pudieron traer las cifras: {{ error }}
      <button type="button" class="v3-link retry" @click="load">Reintentar</button>
    </p>
    <p v-else-if="!data" class="loading v3-meta" role="status"><span class="v3-spinner" aria-hidden="true" />Contando…</p>

    <template v-else>
      <section aria-label="Cifras" class="kpis">
        <div v-for="k in kpis" :key="k.label" class="card kpi">
          <span class="v3-label">{{ k.label }}</span>
          <span class="kpi-value">{{ k.value }}</span>
          <span class="v3-meta">{{ k.sub }}</span>
        </div>
      </section>

      <div class="row">
        <section aria-labelledby="ap-notas" class="card wide">
          <div class="card-head">
            <h2 id="ap-notas" class="card-title">Notas por semana</h2>
            <span class="v3-meta">Últimas 12 semanas</span>
          </div>
          <div role="img" :aria-label="barsLabel" class="bars">
            <div v-for="b in bars" :key="b.start" class="bar-col">
              <span class="bar-num" :class="{ 'bar-num--last': b.last }">{{ b.notes }}</span>
              <div class="bar" :class="{ 'bar--last': b.last }" :style="{ height: b.h }" />
            </div>
          </div>
          <div aria-hidden="true" class="bar-labels">
            <span v-for="b in bars" :key="b.start">{{ b.label }}</span>
          </div>
        </section>

        <section aria-labelledby="ap-embudo" class="card narrow">
          <div class="card-head card-head--stack">
            <h2 id="ap-embudo" class="card-title">Hasta dónde llegan</h2>
            <span class="v3-meta">De cada 100 que se registran</span>
          </div>
          <ol class="funnel">
            <li v-for="f in funnel" :key="f.label">
              <div class="funnel-line">
                <span class="funnel-label">{{ f.label }}</span>
                <span class="funnel-num">{{ f.pct }} %<span class="funnel-count"> · {{ f.count }}</span></span>
              </div>
              <div class="track"><div class="fill" :style="{ width: `${f.pct}%` }" /></div>
            </li>
          </ol>
          <p class="v3-meta hint"><span class="honey" aria-hidden="true" />Activación: llegar a 3 notas.</p>
        </section>
      </div>

      <div class="row">
        <section aria-labelledby="ap-recientes" class="card wide">
          <h2 id="ap-recientes" class="card-title">Llegaron hace poco</h2>
          <div class="table-box">
            <table class="table">
              <thead>
                <tr>
                  <th scope="col">Persona</th>
                  <th scope="col">Alta</th>
                  <th scope="col">Primer café</th>
                  <th scope="col">Primera nota</th>
                  <th scope="col">3 notas</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="u in data.recent" :key="u.createdAt + u.name">
                  <td class="name">{{ u.name }}</td>
                  <td class="soft">{{ ago(u.createdAt) }}</td>
                  <td v-for="(done, i) in [u.coffee, u.note, u.three]" :key="i">
                    <span class="step" :class="{ 'step--on': done }" role="img" :aria-label="done ? 'Sí' : 'Todavía no'" />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section aria-labelledby="ap-total" class="card narrow dark">
          <h2 id="ap-total" class="card-title">En total</h2>
          <dl class="totals">
            <div v-for="t in totals" :key="t.label">
              <dt>{{ t.label }}</dt>
              <dd>{{ t.value }}</dd>
            </div>
          </dl>
          <p class="dark-meta">Lista de espera: {{ num.format(data.totals.waitlist) }} correos<span class="dot" aria-hidden="true">.</span></p>
        </section>
      </div>
    </template>
  </div>
</template>

<style scoped>
.page { max-width: 1120px; display: flex; flex-direction: column; gap: 32px; }
.head { display: flex; flex-wrap: wrap; align-items: flex-end; justify-content: space-between; gap: 20px; }
.titles { display: flex; flex-direction: column; gap: 10px; }
.titles h1 { margin: 0; }
.subtitle { margin: 0; font: italic 400 19px/26px var(--font-display); color: var(--ink-soft); }
.seg { display: flex; gap: 4px; padding: 4px; border-radius: 14px; background: var(--surface); }
.seg button { min-height: 40px; padding: 0 16px; border: 0; border-radius: 10px; background: transparent; color: var(--ink-soft); font: 600 14px/20px var(--font-sans); cursor: pointer; }
.seg button[aria-pressed='true'] { background: var(--bg); color: var(--ink); }
.loading { display: flex; align-items: center; gap: 10px; margin: 0; }
.retry { margin-left: 8px; border: 0; background: none; padding: 0; font: inherit; font-weight: 600; cursor: pointer; }

.kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; }
.card { display: flex; flex-direction: column; gap: 16px; box-sizing: border-box; min-width: 0; padding: 24px; border-radius: 18px; background: var(--surface); }
.kpi { gap: 8px; padding: 20px 22px; }
.kpi-value { font: 400 48px/48px var(--font-display); letter-spacing: -0.01em; }
.row { display: flex; flex-wrap: wrap; gap: 16px; align-items: stretch; }
.wide { flex: 3 1 520px; }
.narrow { flex: 2 1 360px; }
.card-head { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; }
.card-head--stack { flex-direction: column; align-items: flex-start; gap: 4px; }
.card-title { margin: 0; font: 400 24px/28px var(--font-display); }

.bars { display: flex; align-items: flex-end; gap: 8px; height: 200px; padding-top: 24px; border-bottom: 1px solid var(--line-strong); }
.bar-col { flex: 1 1 0; min-width: 0; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; gap: 6px; }
.bar { width: 100%; max-width: 40px; min-height: 2px; border-radius: 6px 6px 0 0; background: var(--tint); }
.bar--last { background: var(--primary); }
.bar-num { font: 500 12px/14px var(--font-sans); color: var(--ink-soft); }
.bar-num--last { color: var(--ink); }
.bar-labels { display: flex; gap: 8px; margin-top: -8px; }
.bar-labels span { flex: 1 1 0; min-width: 0; text-align: center; font: 400 12px/16px var(--font-sans); color: var(--ink-soft); white-space: nowrap; }

.funnel { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 14px; }
.funnel-line { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; margin-bottom: 6px; }
.funnel-label { font: 500 15px/20px var(--font-sans); }
.funnel-num { font: 600 15px/20px var(--font-sans); }
.funnel-count { font-weight: 400; color: var(--ink-soft); }
.track { height: 10px; border-radius: 9999px; background: var(--track); }
.fill { height: 100%; border-radius: 9999px; background: var(--primary); }
.hint { margin: 0; display: flex; align-items: center; gap: 8px; }
.honey { width: 6px; height: 6px; border-radius: 9999px; background: var(--accent); }

.table-box { overflow-x: auto; }
.table { width: 100%; min-width: 480px; border-collapse: collapse; font: 400 14px/20px var(--font-sans); }
.table th { padding: 8px; text-align: left; font: 600 13px/16px var(--font-sans); color: var(--ink-soft); }
.table td { padding: 12px 8px; border-top: 1px solid var(--line); }
.table :is(th, td):first-child { padding-left: 0; }
.name { font-weight: 500; }
.soft { color: var(--ink-soft); }
.step { display: inline-block; width: 12px; height: 12px; border-radius: 9999px; box-shadow: inset 0 0 0 1.5px var(--primary); }
.step--on { background: var(--primary); }

.dark { background: var(--brand-surface); color: var(--on-brand-surface); }
.totals { margin: 0; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 20px 16px; }
.totals div { display: flex; flex-direction: column; gap: 2px; }
.totals dt { font: 500 13px/16px var(--font-sans); opacity: 0.8; }
.totals dd { margin: 0; font: 400 36px/40px var(--font-display); }
.dark-meta { margin: 0; font: 400 13px/18px var(--font-sans); opacity: 0.8; }
.dot { color: var(--accent); }
</style>
