<script setup lang="ts">
// Marco de Login y Registro v3: panel de marca a la izquierda desde 1024 px,
// formulario a la derecha. En móvil, solo el formulario con el ícono arriba.
</script>

<template>
  <div class="v3 shell">
    <section class="panel" aria-label="Sorbo">
      <span aria-hidden="true" class="blob" />
      <span class="wordmark">Sorbo<span class="dot">.</span></span>
      <div class="panel-body">
        <slot name="panel" />
      </div>
      <span class="credit">Sorbo, por KurodaCafe</span>
    </section>

    <main class="main">
      <div class="column">
        <UiLogo variant="mark" size="md" class="mark" />
        <slot />
        <span class="credit-mobile v3-meta">Sorbo, por KurodaCafe</span>
      </div>
    </main>
  </div>
</template>

<style scoped>
.shell { min-height: 100svh; display: flex; }
.panel { display: none; }
.main {
  flex: 1 1 auto;
  min-width: 0;
  box-sizing: border-box;
  padding: 48px 24px 32px;
  display: flex;
  justify-content: center;
}
.column { width: 100%; max-width: 400px; display: flex; flex-direction: column; gap: 32px; }
.credit-mobile { margin-top: auto; text-align: center; font-size: 12px; line-height: 16px; }

@media (min-width: 1024px) {
  .panel {
    position: relative;
    overflow: hidden;
    flex: 1 1 50%;
    box-sizing: border-box;
    padding: 48px 56px;
    display: flex;
    flex-direction: column;
    gap: 48px;
    background: var(--brand-surface);
    color: var(--on-brand-surface);
  }
  .blob {
    position: absolute;
    right: -80px;
    bottom: -80px;
    width: 320px;
    height: 320px;
    border-radius: 9999px;
    background: var(--tint);
    opacity: 0.18;
  }
  .wordmark { font: 400 32px/1 var(--font-display); }
  .dot { color: var(--accent); }
  .panel-body { position: relative; margin-top: auto; display: flex; flex-direction: column; gap: 40px; }
  .credit { position: relative; font: 400 13px/18px var(--font-sans); opacity: 0.7; }
  .main { flex: 1 1 50%; align-items: center; padding: 48px 32px; }
  .mark, .credit-mobile { display: none; }
}
</style>
