<script setup lang="ts">
// «Lo nuevo» en Inicio: una sola vez por anuncio. Lo cerrado se guarda en la cuenta,
// así no vuelve a salir en otro dispositivo.
import { doc, setDoc } from 'firebase/firestore'
import { NEWS, showNews } from '~/utils/news'

const { $db } = useNuxtApp()
const { currentUser, userId } = useAuth()
const settings = useSettingsStore()

const closed = ref(false)
const visible = computed(() => {
  if (closed.value || !settings.prefs) return false
  const created = currentUser.value?.metadata.creationTime
  return showNews(created ? new Date(created) : null, settings.prefs.notifications?.newsSeen)
})

function close() {
  closed.value = true
  if (!userId.value) return
  if (settings.prefs) settings.prefs.notifications = { ...settings.prefs.notifications, newsSeen: NEWS.id }
  // Si falla, solo vuelve a salir la próxima vez.
  setDoc(doc($db, 'userPreferences', userId.value), { notifications: { newsSeen: NEWS.id } }, { merge: true }).catch(() => {})
}
</script>

<template>
  <section v-if="visible" aria-labelledby="news-t" class="news v3-enter">
    <button type="button" class="news-x" aria-label="Cerrar novedades" @click="close">
      <Icon name="lucide:x" size="20" />
    </button>
    <div class="news-head">
      <span class="v3-eyebrow news-eyebrow">— {{ NEWS.eyebrow }}</span>
      <h2 id="news-t" class="news-t">Tu diario ahora se <em>comparte</em><span class="dot" aria-hidden="true">.</span></h2>
      <button type="button" class="news-ok news-ok--wide" @click="close">Entendido</button>
    </div>
    <div class="news-items">
      <NuxtLink v-for="item in NEWS.items" :key="item.to" :to="item.to" class="news-item" @click="close">
        <span class="news-icon" aria-hidden="true"><Icon :name="item.icon" size="22" /></span>
        <span class="news-text">
          <span class="news-title">{{ item.title }}</span>
          <span class="news-p">{{ item.text }}</span>
        </span>
        <Icon name="lucide:chevron-right" size="18" class="news-chevron" />
      </NuxtLink>
    </div>
    <button type="button" class="news-ok news-ok--narrow" @click="close">Entendido</button>
  </section>
</template>

<style scoped>
/* Móvil: lista. Escritorio (≥1024 px): título a la izquierda y las novedades como mini tarjetas. */
.news { position: relative; container: news / inline-size; display: flex; flex-direction: column; gap: 16px; padding: 20px 18px 18px; border-radius: 18px; background: var(--brand-surface); color: var(--on-brand-surface); }
.news-x { position: absolute; top: 10px; right: 10px; width: 44px; height: 44px; border: 0; border-radius: 12px; background: transparent; color: var(--on-brand-surface); display: flex; align-items: center; justify-content: center; cursor: pointer; }
.news-head { display: flex; flex-direction: column; gap: 6px; padding-right: 40px; }
.news-eyebrow { opacity: 0.75; }
.news-t { margin: 0; font: 400 28px/30px var(--font-display); letter-spacing: -0.01em; }
.news-t em { font-style: italic; }
.dot { color: var(--accent); }
.news-ok { height: 44px; border: 0; border-radius: 12px; background: var(--on-brand-surface); color: var(--brand-surface); font: 600 15px/20px var(--font-sans); cursor: pointer; }
.news-ok--wide { display: none; }
.news-items { display: flex; flex-direction: column; gap: 4px; }
.news-item { display: flex; align-items: center; gap: 14px; min-height: 64px; padding: 8px 4px; border-radius: 12px; color: var(--on-brand-surface); text-decoration: none; }
.news-icon { flex: none; width: 44px; height: 44px; border-radius: 12px; background: var(--accent); color: var(--on-accent); display: flex; align-items: center; justify-content: center; }
.news-text { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.news-title { font: 600 15px/20px var(--font-sans); }
.news-p { font: 400 13px/18px var(--font-sans); opacity: 0.75; }
.news-chevron { flex: none; opacity: 0.6; }

@media (min-width: 1024px) {
  .news { flex-direction: row; flex-wrap: wrap; gap: 24px 32px; padding: 28px 32px; }
  .news-head { flex: 1 1 240px; gap: 10px; }
  .news-t { font: 400 38px/36px var(--font-display); }
  .news-ok--wide { display: block; align-self: flex-start; margin-top: 8px; padding: 0 18px; }
  .news-ok--narrow { display: none; }
  .news-items { flex: 2 1 420px; display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; }
  .news-item { flex-direction: column; align-items: flex-start; gap: 10px; padding: 16px; border-radius: 14px; background: color-mix(in srgb, var(--on-brand-surface) 8%, transparent); }
  .news-icon { width: 40px; height: 40px; }
  .news-chevron { display: none; }
}
/* Título y novedades lado a lado (240 + 32 + 420 px de contenido): el título ya no está bajo la X, las novedades sí. */
@media (min-width: 1024px) {
  @container news (min-width: 692px) {
    .news-head { padding-right: 0; }
    .news-items { padding-right: 32px; }
  }
}
</style>
