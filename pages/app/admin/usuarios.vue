<script setup lang="ts">
import { computed, ref } from 'vue'
import type { PersonRow } from '~/functions/src/people'

definePageMeta({ layout: 'admin' })

const { data, error, load } = useAdminCall<PersonRow[]>('adminUsers')
const query = ref('')
const filter = ref<'all' | 'active' | 'noNote' | 'reminder'>('all')
const selectedId = ref<string | null>(null)

const DAY = 86_400_000
const tests: Record<typeof filter.value, (p: PersonRow) => boolean> = {
  all: () => true,
  active: p => !!p.lastAt && Date.now() - new Date(p.lastAt).getTime() <= 7 * DAY,
  noNote: p => p.notes === 0,
  reminder: p => !!p.reminder,
}
const filters = computed(() => (Object.keys(tests) as (keyof typeof tests)[]).map(key => ({
  key,
  label: { all: 'Todas', active: 'Activas en 7 días', noNote: 'Sin primera nota', reminder: 'Con recordatorio' }[key],
  count: (data.value ?? []).filter(tests[key]).length,
})))

const rows = computed(() => {
  const q = query.value.trim().toLowerCase()
  return (data.value ?? []).filter(tests[filter.value]).filter(p => !q || p.search.includes(q))
})
const selected = computed(() => rows.value.find(p => p.uid === selectedId.value) ?? rows.value[0] ?? null)

const tz = 'America/Bogota'
const date = new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short', year: 'numeric', timeZone: tz })
const since = (iso: string) => date.format(new Date(iso)).replace('.', '')
const ago = (iso: string | null) => {
  if (!iso) return 'Nunca'
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / DAY)
  return days <= 0 ? 'Hoy' : days === 1 ? 'Ayer' : `Hace ${days} días`
}
const reminder = (w: PersonRow['reminder']) => (w === 'morning' ? 'Mañana' : w === 'afternoon' ? 'Tarde' : '—')
const reminderLong = (w: PersonRow['reminder']) => (w === 'morning' ? 'Todos los días a las 8:00' : w === 'afternoon' ? 'Todos los días a las 14:00' : 'Apagado')
const activation = (p: PersonRow) => (p.notes >= 3 ? 'Llegó a 3 notas' : p.notes > 0 ? 'Tiene su primera nota' : p.coffees > 0 ? 'Tiene su primer café' : 'Solo se registró')

const copied = ref(false)
async function copyId(uid: string) {
  await navigator.clipboard.writeText(uid)
  copied.value = true
  setTimeout(() => (copied.value = false), 1500)
}
</script>

<template>
  <div class="page">
    <header class="head">
      <div class="titles">
        <h1 class="v3-display-xl">Las <span class="v3-accent-word">personas</span></h1>
        <p class="subtitle">Quién usa Sorbo y cuánto. Para ayudar, no para leer.</p>
      </div>
    </header>

    <p v-if="error" class="v3-alert v3-alert--error">
      No se pudo traer la lista: {{ error }}
      <button type="button" class="v3-link retry" @click="load">Reintentar</button>
    </p>
    <p v-else-if="!data" class="loading v3-meta" role="status"><span class="v3-spinner" aria-hidden="true" />Contando…</p>

    <template v-else>
      <div class="tools">
        <div class="search">
          <label for="au-buscar" class="v3-label">Buscar por nombre o correo</label>
          <input id="au-buscar" v-model="query" type="search" class="v3-input" placeholder="Laura, andres@…">
        </div>
        <div role="group" aria-label="Filtrar" class="chips">
          <button
            v-for="f in filters"
            :key="f.key"
            type="button"
            class="v3-chip"
            :class="{ 'v3-chip--on': filter === f.key }"
            :aria-pressed="filter === f.key"
            @click="filter = f.key"
          >
            {{ f.label }} · {{ f.count }}
          </button>
        </div>
      </div>

      <div class="row">
        <section aria-label="Lista de personas" class="card wide list">
          <div class="table-box">
            <table class="table">
              <thead>
                <tr>
                  <th scope="col">Persona</th>
                  <th scope="col">Alta</th>
                  <th scope="col" class="num">Cafés</th>
                  <th scope="col" class="num">Notas</th>
                  <th scope="col" class="num">Recetas</th>
                  <th scope="col">Última vez</th>
                  <th scope="col">Recordatorio</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="p in rows" :key="p.uid" :class="{ on: selected?.uid === p.uid }">
                  <td>
                    <button type="button" class="who" :aria-pressed="selected?.uid === p.uid" @click="selectedId = p.uid">
                      <span class="who-name">{{ p.name }}</span>
                      <span class="v3-meta">{{ p.email }}</span>
                    </button>
                  </td>
                  <td class="soft">{{ since(p.since) }}</td>
                  <td class="num">{{ p.coffees }}</td>
                  <td class="num">{{ p.notes }}</td>
                  <td class="num">{{ p.recipes }}</td>
                  <td class="soft">{{ ago(p.lastAt) }}</td>
                  <td class="soft">{{ reminder(p.reminder) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p v-if="!rows.length" class="empty">Nadie coincide con esa búsqueda.</p>
        </section>

        <aside v-if="selected" aria-labelledby="au-ficha" class="card narrow ficha">
          <div class="ficha-head">
            <h2 id="au-ficha" class="ficha-name">{{ selected.name }}</h2>
            <span class="v3-meta">{{ selected.email }} · desde {{ since(selected.since) }}</span>
          </div>
          <dl class="stats">
            <div v-for="s in [['Cafés', selected.coffees], ['Notas', selected.notes], ['Recetas', selected.recipes], ['Amigos', selected.friends]]" :key="s[0]">
              <dt class="v3-label">{{ s[0] }}</dt>
              <dd>{{ s[1] }}</dd>
            </div>
          </dl>
          <dl class="facts">
            <div><dt>Última vez</dt><dd>{{ ago(selected.lastAt) }}</dd></div>
            <div><dt>Recordatorio</dt><dd>{{ reminderLong(selected.reminder) }}</dd></div>
            <div><dt>Activación</dt><dd>{{ activation(selected) }}</dd></div>
          </dl>
          <button type="button" class="v3-chip copy" @click="copyId(selected.uid)">
            {{ copied ? 'Copiado' : 'Copiar ID de la cuenta' }}
          </button>
          <p class="v3-meta note"><span class="honey" aria-hidden="true" />No ves el texto de sus notas, cafés ni recetas. Solo cuántos hay y cuándo.</p>
        </aside>
      </div>
    </template>
  </div>
</template>

<style scoped>
.page { gap: 28px; }
.tools { display: flex; flex-wrap: wrap; align-items: flex-end; gap: 12px; }
.search { flex: 1 1 320px; min-width: 0; display: flex; flex-direction: column; gap: 6px; }
.search .v3-input { font: 400 16px/24px var(--font-sans); }
.chips { display: flex; flex-wrap: wrap; gap: 8px; }
/* La tabla necesita ~760 px: si no caben tabla y ficha, la ficha baja. */
.row .list { flex: 3 1 760px; padding: 8px 20px 12px; }
.row .ficha { flex: 1 1 300px; max-width: 520px; }
.list td.soft { white-space: nowrap; }
.list .table { min-width: 640px; }
.list .num { text-align: right; }
.list .table td { padding-top: 6px; padding-bottom: 6px; }
tr.on { background: var(--surface-strong); }
.who { display: flex; flex-direction: column; align-items: flex-start; gap: 2px; min-height: 44px; justify-content: center; padding: 4px 8px; margin-left: -8px; border: 0; border-radius: 10px; background: transparent; color: var(--ink); text-align: left; cursor: pointer; }
.who-name { font: 600 14px/20px var(--font-sans); }
.empty { margin: 0; padding: 24px 0; font: italic 400 17px/24px var(--font-display); color: var(--ink-soft); }
.ficha { background: var(--surface-strong); gap: 18px; align-self: flex-start; }
.ficha-head { display: flex; flex-direction: column; gap: 4px; }
.ficha-name { margin: 0; font: 400 28px/32px var(--font-display); }
.stats { margin: 0; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.stats div { display: flex; flex-direction: column; gap: 2px; padding: 12px 14px; border-radius: 12px; background: var(--bg); }
.stats dd { margin: 0; font: 400 32px/36px var(--font-display); }
.facts { margin: 0; display: flex; flex-direction: column; gap: 10px; font: 400 14px/20px var(--font-sans); }
.facts div { display: flex; justify-content: space-between; gap: 12px; }
.facts dt { color: var(--ink-soft); }
.facts dd { margin: 0; font-weight: 500; text-align: right; }
.copy { align-self: flex-start; height: 44px; font-weight: 600; }
.note { margin: 0; display: flex; align-items: flex-start; gap: 8px; }
.honey { flex: none; margin-top: 6px; width: 6px; height: 6px; border-radius: 9999px; background: var(--accent); }
</style>
