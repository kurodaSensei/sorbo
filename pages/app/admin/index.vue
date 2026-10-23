<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Pulse } from '~/functions/src/pulse'

definePageMeta({ layout: 'admin' })

const { data, error, load } = useAdminCall<Pulse>('adminPulse')
const range = ref<'week' | 'month'>('week')

const num = new Intl.NumberFormat('es-CO')
const pct = (part: number, total: number) => (total ? Math.round(part / total * 100) : 0)
const tz = 'America/Bogota'
const monthOnly = new Intl.DateTimeFormat('es-CO', { month: 'short', timeZone: tz })
const monthYear = new Intl.DateTimeFormat('es-CO', { month: 'short', year: '2-digit', timeZone: tz })
const monthNum = new Intl.DateTimeFormat('es-CO', { month: 'numeric', timeZone: tz })

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
  const months = data.value?.monthly ?? []
  const max = Math.max(1, ...months.map(m => m.notes))
  return months.map((m, i) => {
    const start = new Date(m.start)
    // El año solo al empezar y en enero.
    const label = (i === 0 || monthNum.format(start) === '1' ? monthYear : monthOnly).format(start).replace('.', '')
    return { ...m, label, h: `${Math.round(m.notes / max * 100)}%`, last: i === months.length - 1 }
  })
})
const barsLabel = computed(() => `Notas por mes: ${bars.value.map(b => `${b.label}, ${b.notes}`).join('; ')}`)

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

const sharing = computed(() => {
  const s = data.value?.sharing
  if (!s) return []
  return [['Con la comunidad', s.community], ['Con amigos', s.friends]]
    .map(([label, n]) => ({ label: label as string, count: num.format(n as number), pct: pct(n as number, s.base) }))
})

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
            <h2 id="ap-notas" class="card-title">Notas por mes</h2>
            <span class="v3-meta">Desde la primera nota · hasta 12 meses</span>
          </div>
          <div role="img" :aria-label="barsLabel" class="bars">
            <div v-for="b in bars" :key="b.start" class="bar-col">
              <span v-if="b.notes" class="bar-num" :class="{ 'bar-num--last': b.last }">{{ b.notes }}</span>
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
          <div v-if="sharing.length" class="sharing">
            <div class="card-head card-head--stack">
              <h3 class="v3-label m-0">Comparten algo</h3>
              <span class="v3-meta">De quienes anotaron al menos una vez</span>
            </div>
            <div v-for="f in sharing" :key="f.label">
              <div class="funnel-line">
                <span class="funnel-label">{{ f.label }}</span>
                <span class="funnel-num">{{ f.pct }} %<span class="funnel-count"> · {{ f.count }}</span></span>
              </div>
              <div class="track"><div class="fill fill--tint" :style="{ width: `${f.pct}%` }" /></div>
            </div>
          </div>
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

.kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; }
.kpi { gap: 8px; padding: 20px 22px; }
.kpi-value { font: 400 48px/48px var(--font-display); letter-spacing: -0.01em; }

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
.sharing { display: flex; flex-direction: column; gap: 14px; padding-top: 18px; border-top: 1px solid var(--line); }
.fill--tint { background: var(--tint); }
.honey { width: 6px; height: 6px; border-radius: 9999px; background: var(--accent); }

.step { display: inline-block; width: 12px; height: 12px; border-radius: 9999px; box-shadow: inset 0 0 0 1.5px var(--primary); }
.step--on { background: var(--primary); }

.totals { margin: 0; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 20px 16px; }
.totals div { display: flex; flex-direction: column; gap: 2px; }
.totals dt { font: 500 13px/16px var(--font-sans); opacity: 0.8; }
.totals dd { margin: 0; font: 400 36px/40px var(--font-display); }
.dark-meta { margin: 0; font: 400 13px/18px var(--font-sans); opacity: 0.8; }
</style>
