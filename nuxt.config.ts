// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  modules: [
    '@nuxtjs/tailwindcss',
    '@pinia/nuxt',
    '@nuxt/icon',
    '@vueuse/nuxt',
    '@vite-pwa/nuxt',
    '@sentry/nuxt/module',
    '@nuxtjs/sitemap',
  ],

  site: {
    url: 'https://sorbo.app',
    name: 'Sorbo',
  },

  sitemap: {
    // Páginas públicas indexables. Excluimos /app/** (autenticadas, SPA)
    // y rutas de dev/preview. El módulo genera /sitemap.xml en build.
    exclude: ['/app/**', '/dev/**'],
    urls: [
      { loc: '/', changefreq: 'weekly', priority: 1.0 },
      { loc: '/about', changefreq: 'monthly', priority: 0.8 },
      { loc: '/login', changefreq: 'yearly', priority: 0.3 },
      { loc: '/register', changefreq: 'yearly', priority: 0.5 },
      { loc: '/terms', changefreq: 'yearly', priority: 0.2 },
      { loc: '/privacy', changefreq: 'yearly', priority: 0.2 },
    ],
  },

  tailwindcss: {
    cssPath: '~/assets/css/main.css',
  },

  pwa: {
    registerType: 'autoUpdate',
    manifest: {
      name: 'Sorbo',
      short_name: 'Sorbo',
      description: 'Un diario para cada sorbo',
      theme_color: '#141712',
      background_color: '#f4f2eb',
      display: 'standalone',
      orientation: 'portrait',
      lang: 'es',
      icons: [
        {
          src: '/icons/icon-192.png',
          sizes: '192x192',
          type: 'image/png',
        },
        {
          src: '/icons/icon-512.png',
          sizes: '512x512',
          type: 'image/png',
        },
        {
          src: '/icons/icon-512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'maskable',
        },
      ],
    },
    workbox: {
      // El service worker responde las navegaciones con el shell de la SPA
      // (200.html, que el módulo precachea como «200»), no con la landing: con
      // '/' cualquier enlace a /app/... abría la landing.
      navigateFallback: '/200',
      globPatterns: ['**/*.{js,css,html,png,svg,ico,woff2}'],
      runtimeCaching: [
        {
          urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
          handler: 'CacheFirst',
          options: {
            cacheName: 'google-fonts-cache',
            expiration: {
              maxEntries: 10,
              maxAgeSeconds: 60 * 60 * 24 * 365,
            },
            cacheableResponse: { statuses: [0, 200] },
          },
        },
        {
          urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
          handler: 'CacheFirst',
          options: {
            cacheName: 'gstatic-fonts-cache',
            expiration: {
              maxEntries: 10,
              maxAgeSeconds: 60 * 60 * 24 * 365,
            },
            cacheableResponse: { statuses: [0, 200] },
          },
        },
      ],
    },
    client: {
      installPrompt: true,
    },
    devOptions: {
      enabled: false,
    },
  },

  runtimeConfig: {
    public: {
      firebaseApiKey: '',
      firebaseAuthDomain: '',
      firebaseProjectId: '',
      firebaseStorageBucket: '',
      firebaseMessagingSenderId: '',
      firebaseAppId: '',
    },
  },

  app: {
    head: {
      // Fallback usado por páginas internas sin useHead propio. Cada
      // página pública con SEO crítico (/, /about) override este título.
      title: 'Sorbo — Diario de café de especialidad',
      meta: [
        { name: 'description', content: 'Un diario para cada sorbo' },
        // viewport-fit=cover → habilita safe-area-inset-* en iPhone con notch.
        // interactive-widget=resizes-content → cuando aparece el keyboard,
        // achica el viewport en lugar de superponer el teclado encima.
        // NO usamos maximum-scale ni user-scalable=no porque rompen WCAG
        // (usuarios con baja visión necesitan poder zoomear). El doble-tap
        // zoom de botones lo previene `touch-action: manipulation` en CSS.
        {
          name: 'viewport',
          content: 'width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content',
        },
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
      ],
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Geist:wght@400;500&family=JetBrains+Mono:wght@400;500;700&display=swap',
        },
        { rel: 'icon', type: 'image/svg+xml', href: '/sorbo.svg' },
        { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/icons/favicon-32.png' },
        { rel: 'apple-touch-icon', sizes: '180x180', href: '/icons/apple-touch-icon.png' },
      ],
      script: [
        // Google Analytics 4 (gtag.js).
        // send_page_view: false → los pageviews los dispara plugins/analytics.client
        // tras cada router.afterEach (evita doble-contar el primer load).
        {
          async: true,
          src: 'https://www.googletagmanager.com/gtag/js?id=G-0TCSTMMKGL',
        },
        {
          innerHTML: `window.dataLayer = window.dataLayer || [];function gtag(){dataLayer.push(arguments);}gtag('js', new Date());gtag('config', 'G-0TCSTMMKGL', { send_page_view: false });`,
        },
      ],
    },
    pageTransition: { name: 'page', mode: 'out-in' },
    layoutTransition: { name: 'layout', mode: 'out-in' },
  },

  // SSR encendido para que las páginas públicas (landing, /about, legal)
  // entreguen HTML completo en el primer byte. Crítico para crawlers de
  // Google/Bing y para AI engines (GPTBot, ClaudeBot, PerplexityBot) que
  // no ejecutan JavaScript. La app autenticada (/app/**) sigue como SPA
  // — declarada abajo en routeRules.
  ssr: true,

  // Worktrees de Claude Code: copias completas del repo con su node_modules.
  // Vigilarlas agota los descriptores de archivo del dev server (EMFILE).
  ignore: ['.claude/**'],
  vite: { server: { watch: { ignored: ['**/.claude/**'] } } },

  routeRules: {
    // Páginas públicas: prerender en build (HTML estático completo).
    '/': { prerender: true },
    '/about': { prerender: true },
    '/terms': { prerender: true },
    '/privacy': { prerender: true },

    // Auth pages: SPA. Usan Firebase Auth client — no se pueden
    // prerender sin tocar el SDK desde Node, lo cual rompería el build.
    '/login': { ssr: false },
    '/register': { ssr: false },

    // App autenticada: SPA. Toda la lógica vive del lado del cliente
    // (Firebase Auth + Firestore), no hay nada útil que prerender.
    '/app/**': { ssr: false },

    // Headers de seguridad para todas las rutas (mantiene la config
    // original — no rompe nada).
    '/**': {
      headers: {
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
      },
    },
  },

  nitro: {
    preset: 'static',
  },
})
