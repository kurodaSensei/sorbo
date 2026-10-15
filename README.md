<p align="center">
  <img src="public/sorbo.svg" alt="Sorbo" width="96" height="96">
</p>

<h1 align="center">Sorbo.</h1>

<p align="center">
  Un diario para cada sorbo de café. <strong>Una taza, una nota.</strong><br>
  <a href="https://sorbo.app">sorbo.app</a> · <a href="https://instagram.com/sorbo.app">@sorbo.app</a>
</p>

---

Sorbo es un diario de café de especialidad: registra cafés, catas y recetas, comparte con tu gente y descubre lo que toma la comunidad.

## Qué hace

- **Cafés:** origen, proceso, variedad, tueste y marca, con un asistente paso a paso.
- **Catas:** puntuación general y atributos (aroma, acidez, dulzura, cuerpo, retrogusto), notas y favoritos.
- **Recetas:** método, dosis, agua y pasos con tiempos, y temporizador en el detalle.
- **El Vertido:** preparación guiada paso a paso.
- **Explora:** cafés, catas y recetas que la comunidad comparte; guárdalos en tu wishlist o duplícalos.
- **Amigos:** comparte cafés, catas y recetas con quien elijas (privado, amigos o comunidad).
- **Wishlist** y **catálogos** personalizables (marcas, variedades, métodos, procesos, notas de sabor).
- **Se instala como app** (PWA) en el celular.

> Hubo un rediseño v2 («una taza, una nota») en octubre de 2026 que se retiró para rehacerlo por partes. Todo quedó guardado en la rama `backup/v2-2026-10-14` y el tag `v2-snapshot`.

## Marca

Sorbo es una marca propia; KurodaCafe solo aparece como crédito («por KurodaCafe»).

- **Fuente única de marca y UI:** [Sorbo Design System v2](https://claude.ai/artifact/QNUja9Q3Q9vetFHHJjXvgf). El código actual (v1) usa sus propios tokens en `assets/css/main.css` y `tailwind.config.ts`; `design/v2/` guarda el sistema exportado (tokens, guía, componentes y prototipo) como referencia para el rediseño.
- **Colores:** jungle `#141712`, olive `#556B3A`, sage `#96B36A`, honey `#E5B84B`, fondo `#F4F2EB`.
- **Tipografía:** DM Serif Display (títulos y logotipo), Geist (interfaz), JetBrains Mono (cifras de preparación).
- **Logo:** el ícono «S.» crema con punto miel sobre un cuadrado olivo; el logotipo «Sorbo.» con el punto miel.
- **Voz:** tuteo, frases cortas y el vocabulario de la persona: nota, puntaje, sabores, marca, preparar. Sin emoji en la interfaz.

`SORBO.md` es el índice de dónde vive cada cosa del proyecto (diseño, marketing, bitácora).

## Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | Nuxt 3, Vue 3, TypeScript |
| Estado | Pinia |
| Estilos | Tailwind CSS |
| Datos | Firebase Firestore (con caché persistente para uso sin conexión) |
| Auth | Firebase Authentication (correo y Google) |
| PWA | `@vite-pwa/nuxt` |
| Errores | Sentry |
| Hosting | Vercel |
| Tests | Vitest + emulador de Firestore (reglas) |

Todo funciona dentro de la capa gratuita de Firebase y Vercel.

## Empezar en local

Necesitas [Node.js](https://nodejs.org/) 22 o superior y un proyecto de [Firebase](https://console.firebase.google.com/) con Firestore y Authentication (correo y Google) activos.

```bash
git clone https://github.com/kurodaSensei/sorbo.git
cd sorbo
npm install
cp .env.example .env
```

Llena `.env` con las credenciales de tu app web de Firebase (Project Settings → General → Your apps):

```env
NUXT_PUBLIC_FIREBASE_API_KEY=
NUXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NUXT_PUBLIC_FIREBASE_PROJECT_ID=
NUXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NUXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NUXT_PUBLIC_FIREBASE_APP_ID=
```

Despliega las reglas e índices de Firestore del repo y arranca:

```bash
firebase deploy --only firestore
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) y crea tu cuenta.

## Tests

```bash
npm run test:rules
```

Prueba las reglas de Firestore contra el emulador (necesita Java y `firebase-tools`). En GitHub, la Action `Tests` las corre en cada PR.

## Despliegue

`main` se despliega solo en Vercel (sorbo.app). Si cambias `firestore.rules`, despliégalas aparte:

```bash
firebase deploy --only firestore:rules
```

## Estructura

```
sorbo/
├── assets/css/        # Estilos base
├── components/        # coffee, tasting, recipe, roaster, explore, vertido, ui…
├── composables/       # useFirebase, useAuth, useFriends…
├── design/v2/         # Design System v2 exportable (referencia de marca)
├── pages/             # Rutas (la app vive en /app)
├── plugins/           # Firebase
├── stores/            # Pinia
├── tests/rules/       # Pruebas de reglas de Firestore
├── types/             # Tipos de TypeScript
├── utils/             # Constantes y formatters
└── firestore.rules    # Reglas de seguridad
```

## Colecciones de Firestore

| Colección | Qué guarda |
|-----------|-----------|
| `tastings` | Catas: café, puntuación (0–10) y atributos, notas, método, visibilidad |
| `coffees` | Cafés: marca, origen, proceso, variedad, tueste |
| `recipes` | Recetas con sus pasos |
| `roasters` | Marcas |
| `wishlist` | Quiero probar |
| `friendships` | Amistades y solicitudes |
| `users`, `userPreferences` | Perfil y listas personalizadas |

Cada documento lleva `userId`. Notas, cafés y recetas pueden ser privados, para amigos o públicos; las reglas viven en `firestore.rules` y se prueban en `tests/rules/`.

## Licencia

[Polyform Noncommercial 1.0.0](LICENSE). Puedes usar, copiar, estudiar y modificar el código para fines no comerciales (proyectos personales, educación, investigación). Para uso comercial necesitas autorización del autor.

---

<p align="center">Sorbo. · por KurodaCafe</p>

> *Sí, este proyecto se construyó con IA ([Claude Code](https://claude.ai/code)). El humano puso el café, el criterio y las ideas. La IA puso las manos (que no tiene) en el teclado (que tampoco tiene). Ningún barista fue reemplazado en el proceso.*
