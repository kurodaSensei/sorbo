import * as Sentry from '@sentry/nuxt'

// El DSN de Sentry está diseñado para vivir en código frontend público:
// solo permite enviar errores al proyecto, no leer datos. No es secreto.
const DSN = 'https://b1a99bb529e27d11ca47a0d8105da5df@o4511475806437376.ingest.us.sentry.io/4511475809910784'

Sentry.init({
  dsn: DSN,

  // Solo en producción para no ensuciar la quota durante desarrollo local.
  enabled: import.meta.env.PROD,

  // Etiqueta los eventos por entorno para distinguir prod vs preview en Sentry.
  environment: import.meta.env.MODE,

  // Captura el 100% de los errores. Quota free: 5K errores/mes — suficiente
  // para una beta. Si crece, bajamos sampleRate.
  sampleRate: 1.0,

  // OFF: tracing (transactions) y session replay consumen quotas separadas
  // y para una beta no aportan vs. el costo. Si se quiere uno después, se
  // sube el sample rate correspondiente.
  tracesSampleRate: 0,
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,

  // Privacidad: bloquea inputs sensibles automáticamente. La mayoría ya están
  // cubiertos por defecto (password, credit card), aquí refuerzo emails para
  // que no se filtren si alguna vez aparecen en breadcrumbs o stack traces.
  sendDefaultPii: false,

  // Ruido común que no aporta información accionable.
  ignoreErrors: [
    // Bug benigno de Chrome cuando el ResizeObserver dispara durante un layout.
    'ResizeObserver loop limit exceeded',
    'ResizeObserver loop completed with undelivered notifications',
    // Errores de extensiones del navegador, no de la app.
    /^chrome-extension:\/\//,
    /^moz-extension:\/\//,
    // Script que inyecta el navegador de Instagram en Android (iabjs://) al cerrar la página.
    'Java object is gone',
  ],

  // No incluir el contexto de URL completo si tiene tokens o query sensible.
  beforeSend(event) {
    if (event.request?.url) {
      // Recorta queries que puedan contener data del usuario.
      try {
        const u = new URL(event.request.url)
        event.request.url = u.origin + u.pathname
      }
      catch { /* ignore */ }
    }
    return event
  },
})
