<script setup lang="ts">
// Aviso flotante para instalar la PWA. Misma lógica que UiPwaInstallBanner (usePwaInstall).
const { canShowBanner, install, dismiss } = usePwaInstall()
</script>

<template>
  <ClientOnly>
    <Transition name="v3-toast" appear>
    <div v-if="canShowBanner" role="status" aria-label="Instalar Sorbo" class="v3 toast">
      <UiLogo variant="mark" size="sm" class="mark" />
      <span class="text">
        <span class="title">Instala Sorbo</span>
        <span class="sub">Ábrelo como una app.</span>
      </span>
      <button type="button" class="install" @click="install">Instalar</button>
      <button type="button" class="close" aria-label="Cerrar" @click="dismiss">
        <Icon name="lucide:x" size="20" />
      </button>
    </div>
    </Transition>
  </ClientOnly>
</template>

<style scoped>
.toast {
  position: fixed;
  z-index: 35;
  left: 12px;
  right: 12px;
  bottom: calc(80px + env(safe-area-inset-bottom));
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 6px 10px 12px;
  border-radius: 16px;
  background: var(--brand-surface);
  color: var(--on-brand-surface);
  box-shadow: 0 8px 24px rgba(20, 23, 18, 0.28);
}
.mark { flex: none; }
.text { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.title { font: 600 15px/20px var(--font-sans); }
.sub { font: 400 13px/18px var(--font-sans); opacity: 0.75; }
.install {
  flex: none;
  height: 40px;
  padding: 0 14px;
  border: 0;
  border-radius: 12px;
  background: var(--accent);
  color: var(--on-accent);
  font: 600 13px/16px var(--font-sans);
  cursor: pointer;
}
.close {
  flex: none;
  width: 44px;
  height: 44px;
  border: 0;
  border-radius: 12px;
  background: transparent;
  color: var(--on-brand-surface);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
@media (min-width: 1024px) {
  .toast { left: auto; right: 24px; bottom: 24px; width: 380px; }
}
</style>
