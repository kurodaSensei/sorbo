# ScorePicker

Selector de puntaje de cinco opciones con número y palabra, pensado para quien no sabe catar.

Opciones: 1 Meh · 2 Bien · 3 Rico · 4 Muy rico · 5 Wow. Cada una mide 64 px de alto en una cuadrícula de 5 columnas con `space-1` a `space-2` de separación. Reposo: `surface`, número en `score`, palabra en `caption` `ink-soft`. Elegida: `action-bg`, número en `action-fg`, palabra en `on-action`. Grupo con `fieldset` y `legend` «¿Qué tal estuvo?»; cada opción con `aria-pressed`.

Almacenamiento: guarda el doble del valor (2–10) en `ratingOverall` para mantener compatibles las catas de v1. Las catas antiguas se muestran redondeando `ratingOverall / 2`.
