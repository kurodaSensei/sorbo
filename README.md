<p align="center">
  <img src="public/sorbo.svg" alt="Sorbo" width="96" height="96">
</p>

<h1 align="center">Sorbo.</h1>

<p align="center">
  Un diario para cada sorbo de café. <strong>Una taza, una nota.</strong><br>
  <a href="https://sorbo.app">sorbo.app</a> · <a href="https://instagram.com/sorbo.app">@sorbo.app</a>
</p>

---

Sorbo es un diario de café para anotar cada taza en unos 20 segundos y compartirla con tu gente. La unidad de la app es la **nota**: el café es un dato de la nota, no un paso previo.

## Qué hace

- **Anota una taza en una sola hoja:** café (lo escribes o lo eliges de recientes), puntaje de 1 a 5 con palabras (Meh · Bien · Rico · Muy rico · Wow), sabores y una nota. Método, receta y dosis van plegados en «Más detalles».
- **Diario:** tus notas agrupadas por día.
- **Amigos:** las notas que tus amigos comparten contigo (Siguiendo) y las públicas (Descubrir). Puedes brindar por una taza o guardarla en «Quiero probar».
- **Preparar:** tus recetas, las compartidas contigo y un temporizador que sigue los pasos de la receta y termina en «Anotar esta taza».
- **Mis cafés:** búsqueda y filtros (Recientes, Favoritos, Quiero probar). Cada café se ve y se edita en una sola pantalla.
- **Funciona sin conexión:** las notas se guardan en el dispositivo y se sincronizan al volver la red.
- **Se instala como app** (PWA) en el celular.

## Marca

Sorbo es una marca propia; KurodaCafe solo aparece como crédito («por KurodaCafe»).

- **Fuente única de marca y UI:** [Sorbo Design System v2](https://claude.ai/artifact/QNUja9Q3Q9vetFHHJjXvgf). Los tokens del código viven en `assets/css/main.css` y en `design/v2/` (tokens, guía, componentes y prototipo).
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
| Estilos | Tailwind CSS + tokens del Design System v2 |
| Datos | Firebase Firestore (con caché persistente para uso sin conexión) |
| Auth | Firebase Authentication (correo y Google) |
| PWA | `@vite-pwa/nuxt` |
| Errores | Sentry |
| Hosting | Vercel |
| Tests | Vitest, emulador de Firestore, Playwright |

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

| Comando | Qué prueba |
|---------|-----------|
| `npm test` | Unitarias (Vitest): utilidades, stores, nota rápida, recetas, catálogos |
| `npm run test:rules` | Reglas de Firestore contra el emulador (necesita Java y `firebase-tools`) |
| `npm run test:e2e` | E2E y visuales con Playwright, en móvil y escritorio |

Los E2E usan una cuenta de pruebas: crea `.env.e2e` (no se versiona) con `E2E_EMAIL` y `E2E_PASSWORD`. La primera vez, genera las capturas de referencia con `npm run test:e2e:update`. Los datos que crean llevan el prefijo `QA-E2E` y se borran al terminar.

En GitHub, la Action `Tests` corre las unitarias y las reglas en cada PR.

## Despliegue

`main` se despliega solo en Vercel (sorbo.app). Si cambias `firestore.rules`, despliégalas aparte:

```bash
firebase deploy --only firestore:rules
```

## Estructura

```
sorbo/
├── assets/css/        # Estilos base y tokens v2
├── components/
│   ├── app/           # TabBar e íconos
│   ├── note/          # Nota rápida, tarjetas, selector de puntaje
│   ├── coffee/        # Ficha de café
│   ├── recipe/        # Formulario de receta
│   ├── settings/      # Listas personalizables
│   ├── roaster/       # Hoja de marca
│   ├── ui/            # Componentes base
│   └── vertido/       # El Vertido (preparación guiada)
├── composables/       # useFirebase, useAuth, useCheers…
├── design/v2/         # Design System v2 exportable
├── e2e/               # Playwright
├── pages/             # Rutas (la app vive en /app)
├── plugins/           # Firebase
├── stores/            # Pinia
├── tests/             # Unitarias y reglas
├── types/             # Tipos de TypeScript
├── utils/             # Puntaje, fechas, navegación…
└── firestore.rules    # Reglas de seguridad
```

## Colecciones de Firestore

| Colección | Qué guarda |
|-----------|-----------|
| `tastings` | Notas: café, puntaje (2–10), sabores, método, receta, visibilidad, brindis |
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
