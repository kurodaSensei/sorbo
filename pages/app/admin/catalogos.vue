<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Group } from '~/functions/src/catalogs'

definePageMeta({ layout: 'admin' })

type Catalogs = Record<'brands' | 'varieties' | 'processes' | 'methods', Group[]>
const { data, error, load } = useAdminCall<Catalogs>('adminCatalogs')

const tabs = [
  { key: 'brands', label: 'Marcas', uses: 'Cafés' },
  { key: 'varieties', label: 'Variedades', uses: 'Cafés' },
  { key: 'processes', label: 'Procesos', uses: 'Cafés' },
  { key: 'methods', label: 'Métodos', uses: 'Notas y recetas' },
] as const
const tab = ref<(typeof tabs)[number]>(tabs[0])
const onlyMany = ref(false)

const all = computed(() => data.value?.[tab.value.key] ?? [])
const rows = computed(() => (onlyMany.value ? all.value.filter(g => g.forms.length > 1) : all.value))
const manyCount = computed(() => all.value.filter(g => g.forms.length > 1).length)
</script>

<template>
  <div class="page">
    <header class="head">
      <div class="titles">
        <h1 class="v3-display-xl">Cómo se <span class="v3-accent-word">escribe</span></h1>
        <p class="subtitle">Las marcas, variedades, procesos y métodos de todas las personas, agrupados.</p>
      </div>
    </header>

    <p v-if="error" class="v3-alert v3-alert--error">
      No se pudieron traer los catálogos: {{ error }}
      <button type="button" class="v3-link retry" @click="load">Reintentar</button>
    </p>
    <p v-else-if="!data" class="loading v3-meta" role="status"><span class="v3-spinner" aria-hidden="true" />Contando…</p>

    <template v-else>
      <div class="tools">
        <div role="group" aria-label="Catálogo" class="seg">
          <button v-for="t in tabs" :key="t.key" type="button" :aria-pressed="tab.key === t.key" @click="tab = t">{{ t.label }}</button>
        </div>
        <button type="button" class="v3-chip" :class="{ 'v3-chip--on': onlyMany }" :aria-pressed="onlyMany" @click="onlyMany = !onlyMany">
          <span class="honey" aria-hidden="true" />Solo las que se escriben de varias formas
        </button>
      </div>

      <div class="row">
        <section :aria-label="tab.label" class="card wide list">
          <div class="table-box">
            <table class="table">
              <thead>
                <tr>
                  <th scope="col">Nombre</th>
                  <th scope="col">Formas en que se escribe</th>
                  <th scope="col" class="num">Personas</th>
                  <th scope="col" class="num">{{ tab.uses }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="g in rows" :key="g.name">
                  <td>
                    <span class="group-name">
                      {{ g.name }}
                      <span v-if="g.forms.length > 1" class="honey" role="img" aria-label="Se escribe de varias formas" />
                    </span>
                  </td>
                  <td>
                    <div class="forms">
                      <span v-for="f in g.forms" :key="f.text" class="form">{{ f.text }} <span class="soft">· {{ f.people }}</span></span>
                    </div>
                  </td>
                  <td class="num">{{ g.people }}</td>
                  <td class="num">{{ g.uses }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p v-if="!rows.length" class="empty">{{ onlyMany ? 'Todos se escriben de una sola forma.' : 'Nadie ha anotado nada aquí todavía.' }}</p>
        </section>

        <aside aria-labelledby="ac-que" class="card narrow side">
          <h2 id="ac-que" class="card-title">Solo para mirar</h2>
          <p class="text">Cada persona es dueña de su catálogo. Aquí no se une ni se corrige nada: ves cómo se escribe cada nombre para decidir si vale la pena un catálogo compartido.</p>
          <p class="text">Los nombres se agrupan sin tildes, mayúsculas ni espacios de más.</p>
          <dl class="facts">
            <div><dt>Nombres distintos</dt><dd>{{ all.length }}</dd></div>
            <div><dt>Con varias formas</dt><dd>{{ manyCount }}</dd></div>
          </dl>
        </aside>
      </div>
    </template>
  </div>
</template>

<style scoped>
.page { gap: 28px; }
.tools { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; }
.seg { flex-wrap: wrap; }
.list { padding: 8px 20px 12px; }
.list .table { min-width: 600px; }
.list .table td { vertical-align: top; padding-top: 14px; padding-bottom: 14px; }
.list .num { text-align: right; }
.group-name { display: inline-flex; align-items: center; gap: 8px; font: 400 18px/24px var(--font-display); }
.forms { display: flex; flex-wrap: wrap; gap: 6px; }
.form { display: inline-flex; align-items: center; gap: 4px; min-height: 28px; padding: 0 10px; border-radius: 9999px; background: var(--bg); font: 400 13px/16px var(--font-sans); }
.honey { flex: none; width: 6px; height: 6px; border-radius: 9999px; background: var(--accent); }
.empty { margin: 0; padding: 24px 0; font: italic 400 17px/24px var(--font-display); color: var(--ink-soft); }
.side { background: var(--surface-strong); gap: 14px; align-self: flex-start; }
.text { margin: 0; font: 400 15px/22px var(--font-sans); color: var(--ink-soft); }
.facts { margin: 0; padding-top: 14px; border-top: 1px solid var(--line); display: flex; flex-direction: column; gap: 10px; font: 400 14px/20px var(--font-sans); }
.facts div { display: flex; justify-content: space-between; gap: 12px; }
.facts dt { color: var(--ink-soft); }
.facts dd { margin: 0; font-weight: 600; }
</style>
