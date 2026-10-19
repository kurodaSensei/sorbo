# Sorbo — Roadmap

> Documento vivo. Última actualización: 19 oct 2026.
> Producto en producción: [sorbo.app](https://sorbo.app)

---

## Estatus del proyecto

| | |
|---|---|
| **Etapa** | Producción · **v3 en pruebas** (19 al 26 oct 2026) |
| **Branch principal** | `main` (deploy continuo a Vercel) |
| **Branch archivada** | `el-vertido` (rediseño completo, ver [`design/el-vertido-STATUS.md`](design/el-vertido-STATUS.md)) |
| **Stack** | Nuxt 3 · Vue 3 · TypeScript · Firebase Blaze (Firestore, Auth, Cloud Functions, FCM) · Vercel |
| **Costo de infra** | ~$0/mes, con presupuesto de $10/mes y alertas en Blaze |
| **Equipo** | Solo developer (KurodaCafe) |
| **Métodos soportados** | 12 métodos de extracción |
| **Idioma** | Español (es-ES) |

---

## v3 (octubre 2026)

v3 está en producción desde el 18 de octubre, pantalla por pantalla detrás de interruptores (`NUXT_PUBLIC_FLAGS`) con la v1 de respaldo. Diseño en el canvas «Sorbo v3 · Pantallas», tokens en `assets/css/v3.css`, componentes en `components/v3/`.

**Encendido en producción**: acceso, inicio, navegacion, cuenta, catalogos, cafes, recetas, catas, social, compartir, recordatorios, avisos. **El Vertido sigue en v1.**

- [x] Todas las pantallas en v3 menos El Vertido (#16 a #28)
- [x] Puntaje de catas 1–5 con palabras y nota rápida en una pantalla
- [x] Ajustes móviles tras probar en producción (#30, #33, #37)
- [x] **Compartir como imagen**: café, cata o receta en historia 9:16 o publicación 4:5, con texto para WhatsApp que lleva a sorbo.app (#31, #40)
- [x] **Recordatorio diario** con aviso de prueba: Cloud Functions `dailyReminder` y `sendTestReminder` (#32, #34 a #36)
- [x] **Avisos de amigos** dentro de la app: solicitudes y lo que comparten tus amigos, con punto de no leído (#38)
- [x] **Varias variedades** por café (blends) (#39)

Plan de la semana de pruebas: bitácora en Obsidian, «Sorbo v3 — Plan de pruebas».

---

## Lo que está

### Core del producto

- [x] Catálogo personal: cafés, catas, recetas, wishlist
- [x] CRUD completo con wizards de creación de 3 pasos
- [x] **Marcas** (renombrado de "tostadores") — opcional, con flag `roasts` para distinguir tostadores vs resellers/tiendas
- [x] **Modelo de visibilidad de 3 niveles** por item (privado · amigos · comunidad)
- [x] Sistema de scoring SCA (0-100) para cafés + sistema editorial (0-10) para catas
- [x] Recetas con timeline de steps + temporizador integrado
- [x] Catálogo de variedades, métodos, procesos

### Comunidad

- [x] Página `/app/explore` con feed comunitario
- [x] Filtros por tipo (catas / cafés / recetas)
- [x] Guardar a wishlist desde feed
- [x] Duplicar a mi colección (cafés y recetas)
- [x] Sistema de amigos (UIDs explícitos en `sharedWith`)
- [x] Perfiles públicos con catas community

### Auth + Onboarding

- [x] Email + password (Firebase Auth)
- [x] Google Sign-In
- [x] Onboarding checklist post-registro
- [x] Welcome sheet primera vez
- [x] Cancelación de cuenta desde la app + borrado completo de datos
- [x] Política de Privacidad + Términos de Uso

### PWA

- [x] Installable en iOS, Android, macOS, Windows
- [x] Manifest custom con icons + theme color
- [x] Service worker con Workbox (cache de fonts + assets)
- [x] Banner de install (Android nativo + iOS con instrucciones)
- [x] Status bar negra translucent en iOS

### Observabilidad

- [x] Sentry (errores en producción)
- [x] Google Analytics 4 con 10 eventos custom estratégicos
- [x] Sin tracking de terceros pesado

### Landing / SEO

- [x] **Landing convertida en home oficial** con registro inline (no más waitlist)
- [x] SSR habilitado para páginas públicas + SPA para `/app/**` y auth
- [x] JSON-LD `@graph` con SoftwareApplication + WebSite + Organization
- [x] Sitemap autogenerado (`@nuxtjs/sitemap`)
- [x] `llms.txt` para AI engines
- [x] `robots.txt` con reglas explícitas para GPTBot/ClaudeBot/PerplexityBot
- [x] Sección FAQ optimizada para extracción AI
- [x] Página `/about` con AboutPage + Person schema
- [x] OG image actualizada ("EN VIVO · GRATIS", sin "BETA PRIVADA")
- [x] Mobile hamburger nav con panel completo
- [x] Splash screen reducido (1500ms → 300ms para no penalizar LCP)
- [x] Meta tags + OG + Twitter Cards completos

### Sistema de diseño

- [x] Tokens: paper / surface / moss / jungle / honey / olive / terracotta
- [x] Tipografías: DM Serif Display + Geist + JetBrains Mono
- [x] Átomos UI documentados: Input, Button, BottomSheet, HeroCard, Eyebrow, Avatar, Chip, etc.
- [x] Tokens sincronizados entre Tailwind config + CSS vars + figma-variables.json
- [x] Mobile-first responsive en todas las pantallas

### Polish UX

- [x] Skeleton screens en listas
- [x] Haptic feedback en mobile
- [x] Long-press en cards → action menu
- [x] Swipe entre tabs del TabBar mobile
- [x] Transiciones page + layout coordinadas
- [x] Wizards con slide-up animation distintivo

### Documentos

- [x] Diseño del Vertido completo: [`design/el-vertido.md`](design/el-vertido.md)
- [x] Caso de estudio para portafolio: [`docs/CASE-STUDY.md`](docs/CASE-STUDY.md)
- [x] Estado de la rama Vertido: [`design/el-vertido-STATUS.md`](design/el-vertido-STATUS.md)

---

## Ronda de UX / a11y (junio 2026)

Acabamos de cerrar una **ronda completa de UX / a11y** para atacar el
feedback recurrente "es complicada". Estado por tier del
[`UX-IMPROVEMENT.md`](docs/UX-IMPROVEMENT.md):

- **Tier 1 activación** ✅ dashboard · welcome · checklist · TabBar/layout
- **Tier 2 core loop** ✅ los 3 wizards (coffee · tasting · recipe) + los 3 detalle pages
- **Tier 3 listas** ✅ 4 pantallas con `UiListSearch`
- **Tier 4 secundarias** ✅ wishlist · roasters · friends (búsqueda condicional)
- **Tier 5 catálogos** — mantenidos, pattern activo/inactivo funciona

**A11y score**: 18/20 Excellent (post `/impeccable audit`). Focus-visible
global, touch targets ≥44px en toda la app, gradientes tokenizados.

**Bugs recientes cerrados**:
- ShareSheet + Confirm ya no compitiendo por z-50 (Confirm ahora `layer="overlay"` = z-60)
- Notas custom del wizard ahora se persisten al catálogo (`settings.addFlavorNote`)
- Input "+ propia" ahora recibe focus al abrir (ref + nextTick, no HTML autofocus)
- `useCatalog` hidrata `settings.prefs` automáticamente en cliente

**Nuevos átomos** salidos de la ronda:
- `UiListSearch` (usado en 4 pantallas)
- `QuickCard.hint` prop
- `HeroCard.subtitle` visible en mobile
- `UiBottomSheet.layer` prop ('base'/'overlay')
- `BREW_METHOD_DESCRIPTION` en `utils/constants`

### Ronda anterior (SEO)

Cerrado el 22 jun. `ssr:true` con routeRules, JSON-LD `@graph`, sitemap,
llms.txt, robots.txt con AI bots, FAQ, /about con Person schema, OG
image corregida, hamburger mobile.

---

## Lo que sigue

### Después de la semana de pruebas (desde el 26 oct 2026)

1. [ ] Corregir lo que salga de las pruebas, por severidad, en PR pequeños
2. [ ] Etiquetar `v3.0.0` cuando esté estable
3. [ ] Retirar el código v1 de cada pantalla tras 1–2 semanas estables, y quitar sus interruptores (incluye la campana v1 y los asistentes v1)
4. [ ] **El Vertido en v3** (diseño en el canvas primero) y lo pendiente de su rama (ver abajo)
5. [ ] **Página pública** de café, cata o receta para enlazar desde WhatsApp, solo para lo compartido con la comunidad (diseño primero)
6. [ ] Blends con **varios orígenes**
7. [ ] **Tema oscuro** (definido en el DS v3; falta en `v3.css`)
8. [ ] Pasar «Marca y redes» del DS v2 al v3
9. [ ] Recordatorio: soltar el dispositivo al cerrar sesión (`deleteToken` + quitarlo de `reminders.tokens`)
10. [ ] Escala: «compartido conmigo» con `where(sharedAt)` e índice; paginar listas antes de ~300 notas
11. [ ] Conector MCP: `registrar_nota` y `mis_cafes`

### Pendientes de junio — quick wins

- [x] **Detalle pages (tier 2)** — `tastings/[id]` y `recipes/[id]` con sección "Siguiente" (repetir cata / cata con receta / ver café). Coffee detail ya tenía "Cata este café".
- [x] **Landing con imagen real** — `<img>` con OG image + alt descriptivo en la sección Voices. Ataca el hallazgo del audit SEO sobre CSS mockups.
- [x] **Testimoniales** — sección Voices con 3 quotes placeholder. Editar directo en `pages/index.vue` cuando lleguen reales.
- [x] **Re-check SEO en producción** — SoftwareApplication + WebSite + Organization JSON-LD, disambiguatingDescription, FAQ, OG, twitter card, headings (2×h1, 6×h2) confirmados post-deploy.
- [ ] **Bio definitiva en `/about`** — placeholder actual describe a "Alfredo Romero · Bogotá · cafetero & dev". Editar directo cuando el creador ajuste su bio.
- [ ] **GBP / Google Search Console** — verificar dominio y enviar sitemap (requiere acción manual del owner).
- [ ] **Screenshots reales del app** (dashboard, explora, detalle) — pendiente captura desde entorno real del owner con datos representativos.

### Próximas 2-4 semanas — Vertido (descongelar la rama)

La rama `el-vertido` quedó archivada al ~70% del scope. Para retomarla, el orden de prioridades:

1. **Persistir `RitualOutcome`** — hoy todo es en memoria; debe escribir a Firestore (`ritualOutcomes/{uid}/...`) para alimentar el algoritmo
2. **Author Intent en wizard de receta** — campo `designedFor` + sub-colección privada `inspirations`
3. **Cronómetro lee `steps` reales** de la receta (hoy tiempos hardcodeados)
4. **Modo "nota rápida"** del stage CIERRE (sheet minimal en vez del wizard completo)
5. **Affinity Score** — reemplazar stubs (`suggested: 'v60'`, top match plano) con el algoritmo del [`design/el-vertido.md`](design/el-vertido.md) §4.6
6. **Recetas de la comunidad** como cuarta categoría en StageRecipe
7. **Tratamiento full-bleed desktop** del Vertido (hoy es columna 640px max)

### Próximas 1-2 meses — Sorbo Pour (versión Lite pública)

- [ ] Subdominio `pour.sorbo.app`
- [ ] Layout `lite.vue` sin Firebase (todo cliente, sin auth)
- [ ] Manifest PWA dedicado (`brew-manifest.json`)
- [ ] Funnel a la app completa al final del ritual

---

## Posibles mejoras (backlog blue-sky)

### Producto

- [ ] **Búsqueda global** estilo cmd+K (especialmente útil cuando una colección crece a 100+ cafés)
- [ ] **Stats / insights** mensuales y anuales (cafés del mes, score promedio, método más usado, etc.)
- [ ] **Backup / export** de datos del usuario (JSON descargable)
- [ ] **Notificaciones push** opcionales — recordatorios suaves ("hace 7 días que no registras una cata")
- [ ] **Recipe public sharing** con OG card por receta individual
- [ ] **Modo claro / oscuro** explícito (hoy es claro forzado)
- [ ] **Multi-idioma** (i18n) — empezar por inglés
- [ ] **Pinned coffees** + smart suggestions (hora del día, último café cateado)
- [ ] **Importador** desde otras apps (Coffee Notes, Brewfather, etc.)

### Inteligencia

- [ ] **Affinity Score collaborative** — capa colaborativa real entre usuarios
- [ ] **Recomendación de cafés** según historial
- [ ] **Detección de "favoritos"** automática (cafés con score >9 + repetidos)

### Distribución

- [ ] **TWA (Trusted Web Activity)** para listar en Google Play Store
- [ ] **iOS App Store** vía PWA wrapper (Capacitor / similar)
- [ ] **Página /press** o `/kit` con assets de marca para reseñas
- [ ] **Newsletter** opcional (separado del registro)

### Comunidad

- [ ] **Compartir desde la app a sistemas externos** (IG Stories, Twitter, WhatsApp)
- [ ] **Comentarios** en items community (con moderación básica)
- [ ] **Tostadores verificados** — claim de marcas por sus dueños
- [ ] **Eventos** (catas grupales, cuppings públicos)

### Técnico

- [ ] **Test suite** — hoy hay cero tests automatizados
- [ ] **CI básico** — typecheck + build en PRs
- [ ] **Performance budget** automatizado (Lighthouse CI)
- [ ] **Accesibilidad WCAG 2.2 AA audit** completo
- [ ] **Monitoreo de costos** Firebase (alertas si se acerca al límite del Spark)

---

## Estatus técnico

### Métricas del repo

- ~90 componentes Vue (~30 átomos `Ui*`, ~60 específicos)
- 27 páginas
- ~25k líneas entre Vue + TypeScript + CSS

### Decisiones arquitectónicas vigentes

- **Cloud Functions solo para lo que no puede vivir en el cliente** — hoy, el recordatorio diario (`dailyReminder`) y su aviso de prueba (`sendTestReminder`). Lo demás sigue siendo cliente o queries, con denormalización.
- **No backend custom** — Firestore Security Rules son el único enforcer.
- **Mobile-first** — desktop es responsive del mobile centrado, excepto Home y Cafés Lista que tienen layout dedicado.
- **PWA, no nativa** — install via browser, sin tiendas de apps.

### Branches activas

- `main` — production
- `el-vertido` — archivada con doc de estado

### Pendientes técnicos identificados

- ✅ Tests: Vitest (`npm test`), reglas de Firestore con emulador (`npm run test:rules`) y E2E con Playwright
- ✅ CI en GitHub Actions antes de cada merge (tests y reglas)
- ⚠️ Sentry cuota gratuita podría llenarse si se escala
- ⚠️ Firestore en Blaze: vigilar lecturas (Avisos lee lo compartido contigo al abrir la app, con caché de 5 minutos)

---

## Notas operativas

### Cómo deployar

`git push origin main` → Vercel detecta el push y deployea automático. Sin pasos manuales.

### Cómo regenerar el OG image

```bash
./scripts/render-og-image.sh
```

Requiere Google Chrome instalado. Lee `public/og-image.svg`, lo renderiza en Chrome headless con Google Fonts cargadas, y produce `public/og-image.png` a 1200×630.

### Cómo retomar `el-vertido`

```bash
git checkout el-vertido
npm run dev
# Visita /app/vertido o /dev/vertido-atoms (sandbox de átomos visuales)
```

Ver `design/el-vertido-STATUS.md` para el detalle de qué falta.

---

— Mantenido por [@kurodacafe](https://instagram.com/kurodacafe) · `info@sorbo.app`
