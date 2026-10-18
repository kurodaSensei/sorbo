# Sorbo — instrucciones para Claude Code

Antes de cualquier tarea, lee `SORBO.md`: es el índice de dónde vive cada cosa de Sorbo.

- **Marca y UI**: la fuente es el **Sorbo Design System v3** en Claude Design
  (https://claude.ai/artifact/Tbe2V6AUQYkkeN3c8LAhUV), con las pantallas en el canvas «Sorbo v3 · Pantallas»
  (https://claude.ai/artifact/F2vthm43ogNcHuboW2QLmj). No inventes colores, tipografías ni componentes
  fuera de él. Si algo falta, propónlo como cambio al sistema en vez de improvisarlo en el código.
- **En el código**: los tokens v3 viven en `assets/css/v3.css` bajo `.v3` y los componentes en `components/v3/`.
  Usa roles (`--primary`, `--surface`, `--ink`…), nunca los hex de marca. No mezcles clases v1 (moss, olive, paper…) en vistas v3.
- **Cambios de UI**: detrás de un interruptor (`useFlag('nombre')`) con v1 como respaldo, en su propia rama y PR.
  Antes de reemplazar una pantalla, diseña en el canvas con su nota de paridad y espera la aprobación.
  Nada de cambios grandes de UI directo a `main`.
- **Puntaje de catas**: 1 a 5 con palabra (`utils/score.ts`), guardado como 2–10 en `ratingOverall`.
- **No uses** el Design System v2 para la app (solo sigue vigente su sección «Marca y redes» para Instagram).
- **No uses** la identidad de las piezas de mayo (Fraunces, Archivo, paper/terra) ni la de KurodaCafe
  (kuro/crema/Ai, Jost, Shippori Mincho). Son otras marcas o están retiradas.
- **Voz**: tuteo, frases cortas, vocabulario de la persona (nota, puntaje, sabores, marca, preparar). Sin emoji en la interfaz.
- **Videos y animaciones** no viven en este repo: están en `~/Projects/Sorbo/marketing/reels`.
- Español (es) en textos de producto.
