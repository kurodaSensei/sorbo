// Auto-imports de Nuxt que usan stores/componentes (no hay runtime Nuxt aquí).
import * as vue from 'vue'

Object.assign(globalThis, {
  ref: vue.ref, computed: vue.computed, watch: vue.watch, onMounted: vue.onMounted,
  reactive: vue.reactive,
})
