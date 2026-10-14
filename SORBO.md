# Sorbo — índice maestro

> Un diario para cada sorbo de café. **Una taza, una nota.**
> Este archivo es la única puerta de entrada a todo lo de Sorbo: dice dónde vive cada cosa.
> Si algo de Sorbo no está enlazado aquí, no es fuente oficial.

## Dónde vive cada cosa

| Qué | Dónde | Notas |
|---|---|---|
| **Código de la app** | Este repo: `kurodaSensei/coffee-app` (local: `~/Projects/Javascript/sorbo`, también accesible como `~/Projects/Sorbo/app`) | Nuxt 3 · Firebase · Vercel. Producción: https://sorbo.app |
| **Marca y sistema de diseño** | Claude Design · **Sorbo Design System v2** — https://claude.ai/artifact/QNUja9Q3Q9vetFHHJjXvgf | Fuente única de tokens, componentes, voz y la sección **Marca y redes** (logo, Instagram, movimiento) |
| **Pantallas** | Claude Design · canvas **Sorbo · Rediseño app** — https://claude.ai/artifact/4ckcaXUTas6PuzHcvtAkMX | Diseño de las pantallas de la v2 |
| **Logos y avatar** | `~/Projects/Sorbo/marketing/brand/` | Ícono "S.", logotipo "Sorbo." (crema y jungle), avatar de Instagram (olive y jungle) |
| **Videos y animaciones** | `~/Projects/Sorbo/marketing/reels/` (Remotion) | Revelado del logo, reel de presentación, intro y cierre. Ver su `README.md` |
| **Material de video** | `~/Projects/Sorbo/marketing/footage/` | Grabaciones y exports (no van a git) |
| **Tokens para Figma** | `design/` en este repo | Puente código → Figma (Tokens Studio) |
| **Roadmap del producto** | `ROADMAP.md` en este repo | |
| **Bitácora y decisiones** | Obsidian · `SECBRAIN/01-Proyectos/Sorbo/_Sorbo.md` | Diario del proyecto, no fuente de verdad |
| **Conversaciones** | Project **Sorbo** en claude.ai | Todos los chats nuevos de Sorbo van ahí |
| **Instagram** | **@sorbo.app** | Cuenta propia de Sorbo, separada de @kurodacafe |

## Identidad (resumen; el detalle está en el Design System)

- Colores: jungle `#141712`, olive `#556B3A`, sage `#96B36A`, honey `#E5B84B`, bg `#F4F2EB`.
- Tipografía: DM Serif Display (títulos, logotipo), Geist (interfaz), JetBrains Mono (cifras de preparación).
- Logo: ícono "S." crema con punto miel sobre cuadrado olivo; logotipo "Sorbo." con el punto miel.
- Voz: tuteo, frases cortas, vocabulario de la persona (nota, puntaje, sabores, marca, preparar). Sin emoji.
- Sorbo es una marca propia. KurodaCafe es otra marca (hobby de café de Alfredo) y no comparte identidad; "por KurodaCafe" solo como crédito.

## Decisiones de marca (2026-10-12)

- El **Design System v2** es la única fuente de marca para app y redes (no hubo revamp).
- Se retira la identidad de las piezas de mayo (Fraunces + Archivo, paper/olive/terra).
- Primeras piezas de Instagram: revelado del logo y reel de presentación.

## Retirado / histórico

- Identidad de lanzamiento de mayo (Fraunces + Archivo): histórica.
- Proyecto de Claude Design compartido por enlace (`claude.ai/design/p/39e258ea…`): exportar lo útil al Design System v2 o al canvas y archivarlo.
- `design/tokens.json` refleja los tokens de v1 del código; el Design System v2 es la referencia de marca.

## Pendiente

- [ ] Grabar la app real y usarla en el reel (`marketing/reels`, prop `appDemo`).
- [ ] Revisar y archivar el proyecto de Claude Design compartido por enlace.
