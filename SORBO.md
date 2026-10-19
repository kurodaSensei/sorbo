# Sorbo — índice maestro

> Un diario para cada sorbo de café. **Una taza, una nota.**
> Este archivo es la única puerta de entrada a todo lo de Sorbo: dice dónde vive cada cosa.
> Si algo de Sorbo no está enlazado aquí, no es fuente oficial.

## Dónde vive cada cosa

| Qué | Dónde | Notas |
|---|---|---|
| **Código de la app** | Este repo: `kurodaSensei/sorbo` (antes `coffee-app`; local: `~/Projects/Javascript/sorbo`, también accesible como `~/Projects/Sorbo/app`) | Nuxt 3 · Firebase · Vercel. Producción: https://sorbo.app |
| **Marca y sistema de diseño** | Claude Design · **Sorbo Design System v3** — https://claude.ai/artifact/Tbe2V6AUQYkkeN3c8LAhUV | Fuente única de tokens (colores por rol, tema claro y oscuro), tipografía, componentes y voz. Incluye «De v1 a v3» |
| **Reglas de redes** | Claude Design · Sorbo Design System v2 — https://claude.ai/artifact/QNUja9Q3Q9vetFHHJjXvgf, sección **Marca y redes** | Solo para Instagram y movimiento, hasta que se pasen al v3. Para la app, el v2 está retirado |
| **Pantallas** | Claude Design · canvas **Sorbo v3 · Pantallas** — https://claude.ai/artifact/F2vthm43ogNcHuboW2QLmj | Cada pantalla v3 en móvil y escritorio, con su nota de paridad con v1 |
| **Tokens en el código** | `assets/css/v3.css` | Los tokens del DS v3 bajo la clase `.v3`, más botones, chips, campos y hojas comunes |
| **Interruptores (feature flags)** | `composables/useFlag.ts` · variable `NUXT_PUBLIC_FLAGS` en Vercel | Cada pantalla v3 vive detrás de su interruptor, con v1 como respaldo. Prueba local: `?flags=catas` (y `?flags=-catas` para apagar). En producción: acceso, inicio, navegacion, cuenta, catalogos, cafes, recetas, catas, social, compartir, recordatorios, avisos |
| **Cloud Functions** | `functions/` en este repo · `firebase deploy --only functions` | `dailyReminder` (cada hora) y `sendTestReminder` (aviso de prueba). Corren con la identidad de Google del proyecto, sin service account |
| **Logos y avatar** | `~/Projects/Sorbo/marketing/brand/` | Ícono "S.", logotipo "Sorbo." (crema y jungle), avatar de Instagram (olive y jungle) |
| **Videos y animaciones** | `~/Projects/Sorbo/marketing/reels/` (Remotion) | Revelado del logo, reel de presentación, intro y cierre. Ver su `README.md` |
| **Material de video** | `~/Projects/Sorbo/marketing/footage/` | Grabaciones y exports (no van a git) |
| **Tokens para Figma** | `design/` en este repo | Puente código → Figma (Tokens Studio) |
| **Roadmap del producto** | `ROADMAP.md` en este repo | |
| **Bitácora y decisiones** | Obsidian · `SECBRAIN/01-Proyectos/Sorbo/_Sorbo.md` | Diario del proyecto, no fuente de verdad |
| **Conversaciones** | Project **Sorbo** en claude.ai | Todos los chats nuevos de Sorbo van ahí |
| **Instagram** | **@sorbo.app** | Cuenta propia de Sorbo, separada de @kurodacafe |

## Identidad (resumen; el detalle está en el Design System v3)

- Colores de marca: jungle `#141712`, olive `#556B3A`, sage `#96B36A`, honey `#E5B84B`, paper `#F4F2EB`. La interfaz no los usa directo: usa roles (`bg`, `surface`, `ink`, `primary`, `accent`, `tint`…), que cambian con el tema.
- Tipografía: DM Serif Display (títulos, logotipo), Geist (interfaz), JetBrains Mono (cifras de preparación).
- Logo: ícono "S." crema con punto miel sobre cuadrado olivo; logotipo "Sorbo." con el punto miel.
- Voz: tuteo, frases cortas, vocabulario de la persona (nota, puntaje, sabores, marca, preparar). Sin emoji.
- Puntaje de catas: de 1 a 5 con palabra (Meh, Bien, Rico, Muy rico, Wow). Se guarda como 2–10 en `ratingOverall`; las catas viejas (0–10) se muestran redondeadas.
- Sorbo es una marca propia. KurodaCafe es otra marca (hobby de café de Alfredo) y no comparte identidad; "por KurodaCafe" solo como crédito.

## Decisiones de marca (2026-10-12)

- El **Design System v2** es la única fuente de marca para app y redes (no hubo revamp).
- Se retira la identidad de las piezas de mayo (Fraunces + Archivo, paper/olive/terra).
- Primeras piezas de Instagram: revelado del logo y reel de presentación.

## Decisiones del rediseño v3 (2026-10-15 al 17)

- La v2 se retiró el 2026-10-14 tras un merge masivo que rompió producción. Producción volvió a la v1 del 21 de agosto.
- El **Design System v3** une v1 y v2 y reemplaza al v2 como fuente de la app.
- Se rediseña pantalla por pantalla con interruptores sobre v1: cada pantalla en su rama y PR, probada en local antes de mergear.
- Con v3 en Catas, el puntaje pasa a 1–5 con palabras y la cata se anota con la **nota rápida** (una pantalla) en lugar del asistente de 3 pasos.
- Se lanza v3 con Explora, Amigos, Wishlist y El Vertido todavía en v1; se rediseñan después.
- (2026-10-18) Explora, Amigos y Quiero probar pasan a v3 antes del lanzamiento; v3 sale a producción con solo El Vertido en v1.
- (2026-10-19) Recordatorio diario con Cloud Functions; avisos de amigos solo dentro de la app, sin push; compartir como imagen con texto que lleva a sorbo.app; un café puede tener varias variedades.

## Retirado / histórico

- Identidad de lanzamiento de mayo (Fraunces + Archivo): histórica.
- Proyecto de Claude Design compartido por enlace (`claude.ai/design/p/39e258ea…`): exportar lo útil al Design System v2 o al canvas y archivarlo.
- `design/tokens.json` refleja los tokens de v1 del código; la referencia es el Design System v3.
- **Design System v2** (QNUja9…) y canvas **Sorbo · Rediseño app** (4ckcaX…): retirados para la app; del v2 solo sigue vigente «Marca y redes».
- Código de la v2: rama `backup/v2-2026-10-14` (consulta, no se mergea).

## Pendiente

- [x] Encender en producción los interruptores de v3 (desde el 18 oct 2026; todo menos El Vertido).
- [x] Rediseñar en v3 Explora, Amigos y Wishlist («Quiero probar»).
- [ ] **Semana de pruebas de v3** (19 al 26 oct 2026): plan y registro de fallos en Obsidian, «Sorbo v3 — Plan de pruebas».
- [ ] Retirar el código v1 de cada pantalla cuando esté estable (1–2 semanas) y quitar sus interruptores.
- [ ] El Vertido en v3.
- [ ] Página pública de café, cata o receta para enlazar al compartir.
- [ ] Tema oscuro en la app (ya está definido en el DS v3; `v3.css` hoy solo trae el claro).
- [ ] Pasar «Marca y redes» del DS v2 al v3.
- Roadmap completo: `ROADMAP.md` → «Lo que sigue».

- [ ] Grabar la app real y usarla en el reel (`marketing/reels`, prop `appDemo`).
- [ ] Revisar y archivar el proyecto de Claude Design compartido por enlace.
