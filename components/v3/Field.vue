<script setup lang="ts">
// Campo de texto v3: relleno en surface, etiqueta encima, anillo de foco y de error.
// Con type="password" agrega el botón para mostrar u ocultar.
const props = withDefaults(defineProps<{
  label: string
  modelValue?: string
  type?: string
  autocomplete?: string
  inputmode?: 'email' | 'text' | 'numeric' | 'decimal' | 'tel' | 'url' | 'search'
  placeholder?: string
  error?: string
  help?: string
}>(), { type: 'text', modelValue: '' })

const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const id = useId()
const isPassword = computed(() => props.type === 'password')
const show = ref(false)
const inputType = computed(() => (isPassword.value && show.value ? 'text' : props.type))
const describedBy = computed(() => (props.error || props.help ? `${id}-msg` : undefined))
</script>

<template>
  <div class="field">
    <div class="head">
      <label :for="id" class="v3-label">{{ label }}</label>
      <slot name="aside" />
    </div>
    <div class="wrap">
      <input
        :id="id"
        :value="modelValue"
        :type="inputType"
        :autocomplete="autocomplete"
        :inputmode="inputmode"
        :placeholder="placeholder"
        :aria-invalid="!!error || undefined"
        :aria-describedby="describedBy"
        :class="['input', { password: isPassword, invalid: !!error }]"
        @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      >
      <button
        v-if="isPassword"
        type="button"
        class="eye"
        :aria-label="show ? 'Ocultar contraseña' : 'Mostrar contraseña'"
        :aria-pressed="show"
        @click="show = !show"
      >
        <Icon :name="show ? 'lucide:eye-off' : 'lucide:eye'" size="20" />
      </button>
    </div>
    <p v-if="error || help" :id="`${id}-msg`" :class="['v3-meta', 'msg', { err: !!error }]">
      {{ error || help }}
    </p>
  </div>
</template>

<style scoped>
.field { display: flex; flex-direction: column; gap: 8px; }
.head { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; }
.wrap { position: relative; }
.input {
  box-sizing: border-box;
  width: 100%;
  min-height: 48px;
  border: 0;
  border-radius: 12px;
  background: var(--surface);
  padding: 12px 16px;
  font: 400 18px/24px var(--font-display);
  color: var(--ink);
  outline: none;
}
.input::placeholder { color: var(--ink-soft); font-style: italic; }
.input:focus-visible { outline: none; box-shadow: inset 0 0 0 2px var(--primary); }
.input.invalid { box-shadow: inset 0 0 0 2px var(--danger); }
.input.password { padding-right: 52px; font-family: var(--font-mono); letter-spacing: 0.1em; }
.input.password::placeholder { font-family: var(--font-display); letter-spacing: normal; }
.eye {
  position: absolute;
  top: 2px;
  right: 2px;
  width: 44px;
  height: 44px;
  border: 0;
  border-radius: 10px;
  background: transparent;
  color: var(--ink-soft);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
.eye:hover { color: var(--ink); }
.msg { margin: 0; }
.msg.err { color: var(--danger); }
</style>
