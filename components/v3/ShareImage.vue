<script setup lang="ts">
// Imagen para compartir a tamaño real (1080 px de ancho). La hoja la muestra a escala y la pasa a PNG.
// Colores fijos de «Marca y redes»: no siguen el tema de la app.
import type { ShareContent, ShareFormat, ShareKind } from '~/utils/share'

const props = defineProps<{ kind: ShareKind, format: ShareFormat, fondo: 'oscuro' | 'claro', content: ShareContent }>()

// El nombre no se parte a media palabra: si la palabra más larga no cabe en 880 px, baja el tamaño.
// ponytail: ancho medio de DM Serif ≈ 0.56 em; medir con canvas si algún nombre aún se sale.
const BASE = { historia: { cafe: 200, cata: 190, receta: 170 }, publicacion: { cafe: 160, cata: 150, receta: 140 } }
const nameSize = computed(() => {
  const longest = Math.max(...props.content.name.split(/\s+/).map(w => w.length), 1)
  return `${Math.min(BASE[props.format][props.kind], Math.floor(880 / (longest * 0.56)))}px`
})
</script>

<template>
  <div :class="['img', `img--${format}`, `img--${kind}`, `f-${fondo}`]">
    <span class="blob" aria-hidden="true" />
    <div class="body">
      <div class="id">
        <span v-if="content.eyebrow" class="eb">{{ content.eyebrow }}</span>
        <span class="name" :style="{ fontSize: nameSize }">{{ content.name }}</span>
        <span v-if="content.by" class="by">de {{ content.by }}</span>
      </div>

      <div v-if="content.score" class="score">
        <span class="badge">{{ content.score }}</span>
        <span class="score-text"><span class="word">{{ content.word }}</span><span class="of">{{ content.score }} de 5</span></span>
      </div>
      <p v-if="content.quote" class="quote">«{{ content.quote }}»</p>

      <div v-if="content.chips.length" class="chips">
        <span v-for="c in content.chips" :key="c" class="chip">{{ c }}</span>
      </div>

      <div v-if="content.rows.length" class="rows">
        <div v-for="[k, v] in content.rows" :key="k" class="row"><span class="lab">{{ k }}</span><span class="val">{{ v }}</span></div>
      </div>
      <div v-if="content.tiles.length" class="tiles">
        <div v-for="[k, v] in content.tiles" :key="k" class="tile"><span class="lab">{{ k }}</span><span class="tile-v">{{ v }}</span></div>
      </div>
      <div v-if="content.steps.length" class="steps">
        <div v-for="[t, s] in content.steps" :key="t + s" class="step"><span class="step-t">{{ t }}</span><span class="step-s">{{ s }}</span></div>
      </div>
      <span v-if="content.meta" class="meta">{{ content.meta }}</span>
    </div>

    <div class="foot">
      <!-- Logotipo «Sorbo.» de marketing/brand, con el punto del color de cada fondo. -->
      <svg class="wordmark" role="img" aria-label="Sorbo" viewBox="30 0 2808 719"><g transform="translate(0 701) scale(1 -1)" fill="currentColor"><path transform="translate(0.0 0)" d="M237 -18Q182 -18 125.0 -4.5Q68 9 30 31L35 167H45L76 102Q90 74 106.0 52.5Q122 31 150 19Q170 9 188.5 5.5Q207 2 230 2Q291 2 326.5 35.0Q362 68 362 120Q362 169 338.0 196.5Q314 224 261 250L220 268Q134 306 85.5 355.5Q37 405 37 487Q37 546 67.5 589.0Q98 632 152.5 655.0Q207 678 280 678Q333 678 380.5 664.0Q428 650 463 626L457 506H447L406 581Q389 616 372.0 630.5Q355 645 333 651Q320 655 309.0 656.5Q298 658 281 658Q230 658 195.0 628.5Q160 599 160 549Q160 498 187.0 467.5Q214 437 266 413L312 393Q408 351 450.0 303.5Q492 256 492 181Q492 93 425.5 37.5Q359 -18 237 -18Z"/><path transform="translate(506.0 0)" d="M273 -15Q197 -15 141.0 16.5Q85 48 54.5 106.0Q24 164 24 242Q24 320 56.5 377.0Q89 434 145.5 465.0Q202 496 273 496Q344 496 400.0 465.5Q456 435 488.5 378.0Q521 321 521 242Q521 163 490.5 105.5Q460 48 404.5 16.5Q349 -15 273 -15ZM273 5Q308 5 329.0 25.0Q350 45 359.5 96.0Q369 147 369 240Q369 334 359.5 385.0Q350 436 329.0 456.0Q308 476 273 476Q238 476 216.5 456.0Q195 436 185.5 385.0Q176 334 176 240Q176 147 185.5 96.0Q195 45 216.5 25.0Q238 5 273 5Z"/><path transform="translate(1036.0 0)" d="M20 0V10L35 14Q55 20 62.5 32.0Q70 44 70 63V376Q70 398 62.5 408.5Q55 419 35 423L20 427V437L192 495L202 485L211 399V391Q225 419 247.5 442.5Q270 466 297.5 481.0Q325 496 352 496Q390 496 410.0 475.0Q430 454 430 422Q430 388 410.5 369.5Q391 351 364 351Q322 351 290 393L288 395Q278 409 265.0 410.5Q252 412 241 398Q231 389 224.5 376.5Q218 364 212 348V69Q212 29 247 19L279 10V0Z"/><path transform="translate(1462.0 0)" d="M191 -13 22 0V10L32 12Q71 21 71 62V597Q71 618 64.5 629.0Q58 640 38 644L24 648V658L202 701L214 692L210 551V450Q243 473 282.0 484.5Q321 496 361 496Q418 496 462.0 469.5Q506 443 531.5 387.5Q557 332 557 245Q557 158 528.5 100.5Q500 43 452.5 14.0Q405 -15 348 -15Q311 -15 273.5 -5.0Q236 5 207 23ZM298 19Q330 19 354.0 39.0Q378 59 392.0 107.5Q406 156 406 241Q406 326 393.0 372.0Q380 418 356.5 436.0Q333 454 300 454Q253 454 213 428V44Q232 32 252.0 25.5Q272 19 298 19Z"/><path transform="translate(2028.0 0)" d="M273 -15Q197 -15 141.0 16.5Q85 48 54.5 106.0Q24 164 24 242Q24 320 56.5 377.0Q89 434 145.5 465.0Q202 496 273 496Q344 496 400.0 465.5Q456 435 488.5 378.0Q521 321 521 242Q521 163 490.5 105.5Q460 48 404.5 16.5Q349 -15 273 -15ZM273 5Q308 5 329.0 25.0Q350 45 359.5 96.0Q369 147 369 240Q369 334 359.5 385.0Q350 436 329.0 456.0Q308 476 273 476Q238 476 216.5 456.0Q195 436 185.5 385.0Q176 334 176 240Q176 147 185.5 96.0Q195 45 216.5 25.0Q238 5 273 5Z"/><circle cx="2717.3" cy="120.2" r="120.2" style="fill: var(--i-dot)"/></g></svg>
      <span class="foot-text">{{ content.foot }}</span>
    </div>
  </div>
</template>

<style scoped>
.f-oscuro { --i-bg: #141712; --i-ink: #f4f2eb; --i-soft: #b3b6a6; --i-line: #eceadf2e; --i-chip: #eceadf1a; --i-blob: #556b3a; --i-blob-op: 0.5; --i-dot: #e5b84b; --i-key: #e5b84b; }
.f-claro { --i-bg: #f4f2eb; --i-ink: #2f3528; --i-soft: #5f6652; --i-line: #2f352826; --i-chip: #e4e3d2; --i-blob: #96b36a; --i-blob-op: 0.42; --i-dot: #556b3a; --i-key: #556b3a; }

/* Historia 9:16: 250 px arriba y 330 abajo libres para la interfaz de Instagram. */
.img--historia { --h: 1920px; --pad: 250px 96px 330px; --gap: 56px; --by: 68px; --chip: 40px; --lab: 36px; --val: 42px; --row: 28px; --sq: 260px; --num: 160px; --word: 116px; --of: 36px; --quote: 68px; --q-lines: 6; --mark: 76px; }
.img--publicacion { --h: 1350px; --pad: 88px 88px 80px; --gap: 44px; --by: 56px; --chip: 34px; --lab: 30px; --val: 36px; --row: 18px; --sq: 200px; --num: 124px; --word: 92px; --of: 30px; --quote: 52px; --q-lines: 3; --mark: 64px; }
.img--historia.img--cata { --by: 66px; }
.img--publicacion.img--cata { --by: 54px; }
.img--historia.img--receta { --by: 56px; }
.img--publicacion.img--receta { --by: 56px; }

.img { position: relative; overflow: hidden; width: 1080px; height: var(--h); box-sizing: border-box; padding: var(--pad); display: flex; flex-direction: column; background: var(--i-bg); color: var(--i-ink); font-family: var(--font-sans); }
.blob { position: absolute; border-radius: 50%; background: var(--i-blob); opacity: var(--i-blob-op); }
.img--historia .blob { width: 980px; height: 980px; right: -330px; top: -260px; }
.img--historia.img--cata .blob { width: 900px; height: 900px; right: -360px; top: -300px; }
.img--historia.img--receta .blob { width: 860px; height: 860px; right: -380px; top: -320px; }
.img--publicacion .blob { width: 820px; height: 820px; right: -300px; top: -360px; }
.img--publicacion.img--cata .blob { width: 760px; height: 760px; right: -330px; top: -380px; }
.img--publicacion.img--receta .blob { width: 720px; height: 720px; right: -340px; top: -380px; }

.body { position: relative; margin: auto 0; display: flex; flex-direction: column; gap: var(--gap); }
.body > * { flex: none; }
.id { display: flex; flex-direction: column; gap: 18px; }
.eb { font: 600 38px/1.2 var(--font-sans); color: var(--i-soft); }
.name { font-family: var(--font-display); font-weight: 400; line-height: 0.95; letter-spacing: -0.02em; overflow-wrap: break-word; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 3; overflow: hidden; padding-bottom: 0.08em; }
.by { font: italic 400 var(--by)/1.15 var(--font-display); color: var(--i-soft); }

.score { display: flex; align-items: center; gap: calc(var(--sq) / 5); }
.badge { flex: none; width: var(--sq); height: var(--sq); border-radius: calc(var(--sq) / 4); background: #96b36a; color: #141712; display: flex; align-items: center; justify-content: center; font: 400 var(--num)/1 var(--font-display); }
.score-text { display: flex; flex-direction: column; gap: 8px; }
.word { font: 400 var(--word)/1 var(--font-display); color: var(--i-key); white-space: nowrap; }
.of { font: 500 var(--of)/1.2 var(--font-sans); color: var(--i-soft); }
.quote { margin: 0; font: italic 400 var(--quote)/1.25 var(--font-display); display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: var(--q-lines); overflow: hidden; }

.chips { display: flex; flex-wrap: wrap; gap: calc(var(--chip) / 3); }
.chip { display: inline-flex; align-items: center; height: calc(var(--chip) * 2.2); padding: 0 38px; border-radius: 9999px; background: var(--i-chip); font: 500 var(--chip)/1 var(--font-sans); }

.rows { display: flex; flex-direction: column; }
.row { display: flex; justify-content: space-between; align-items: baseline; gap: 24px; padding: var(--row) 0; }
.row + .row { border-top: 2px solid var(--i-line); }
.lab { font: 400 var(--lab)/1.2 var(--font-sans); color: var(--i-soft); }
.val { font: 500 var(--val)/1.2 var(--font-mono); text-align: right; }

.tiles { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
.tile { display: flex; flex-direction: column; gap: 10px; padding: 30px; border-radius: 28px; background: var(--i-chip); min-width: 0; }
.tile .lab { font-size: 32px; }
.tile-v { font: 500 56px/1 var(--font-mono); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.img--publicacion .tile .lab { font-size: 30px; }
.img--publicacion .tile-v { font-size: 60px; }

.steps { display: flex; flex-direction: column; }
.step { display: flex; align-items: baseline; gap: 32px; padding: 22px 0; }
.step + .step { border-top: 2px solid var(--i-line); }
.step-t { flex: none; width: 110px; font: 500 36px/1 var(--font-mono); color: var(--i-key); }
.step-s { font: 400 40px/1.2 var(--font-sans); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.meta { font: 500 36px/1.2 var(--font-mono); color: var(--i-soft); }

.foot { position: relative; margin-top: 48px; display: flex; align-items: flex-end; justify-content: space-between; gap: 24px; }
.wordmark { height: var(--mark); width: auto; display: block; color: var(--i-ink); }
.foot-text { max-width: 9em; font: 600 32px/1.2 var(--font-sans); color: var(--i-soft); text-align: right; }
</style>
