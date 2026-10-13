# NoteCard (tarjeta de café)

La entrada del Diario y de Mis cafés. Recupera el estilo editorial de las tarjetas de v1 en menos alto, sin fotos.

Anatomía, de arriba abajo:
- Círculo decorativo arriba a la derecha: `blob-size` (104 px), desplazado -34 px para quedar recortado, color del café (`blob-*` o color del proceso) al `blob-opacity` (70 %). Nunca lleva texto encima.
- Encabezado `card-eyebrow` en `ink-soft`: «— V60 · 8:14» en el Diario; «— NATURAL · HUILA» (proceso · origen) en Mis cafés. Si no hay datos, se omite.
- Nombre en `card-name`.
- Marca en `card-by`: «de [Marca]».
- Una línea `caption` `ink-soft`: hasta 2 sabores separados por coma, o el inicio de la nota entre comillas; en Mis cafés añade «· 4 notas».
- Puntaje abajo a la derecha, alineado por la base con la última línea: palabra en `card-score-word` minúscula + número en `card-score` («muy rico 4»). Sin salto de línea. En Mis cafés, el promedio.

Contenedor: `surface`, `radius-lg`, padding 14 px 16 px, rejilla de dos columnas (texto | puntaje), toda la tarjeta es un botón que abre el detalle. Al presionar, escala 0,99.

Variante Quiero probar: sin número; la línea gris dice «lo anotó Laura» o «lo viste en Descubrir» y a la derecha va un botón pequeño `primary` «Anotar».

Accesibilidad: la palabra del puntaje queda fuera del círculo, así mantiene ≥4,5:1 sobre `surface`.

Almacenamiento del puntaje: ver ScorePicker (se guarda 2–10).
