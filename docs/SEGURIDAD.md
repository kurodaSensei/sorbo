# Sorbo — Audit de seguridad y plan de hardening (SOC 2 · ISO 27001)

Fecha: 2026-11-04 · Alcance: este repo (Nuxt + Firebase + Vercel), `functions/`, reglas de Firestore y Storage,
CI de GitHub y la respuesta real de https://sorbo.app. No se revisó la consola de Firebase, GCP, Vercel ni Google
Analytics: lo que depende de ellas está marcado **«verificar»**.

## Antes de empezar: qué significa «cumplir»

- **SOC 2** (AICPA) no es una lista de código: es un informe de un auditor CPA sobre si los controles de la
  *organización* funcionan. Type I = en un día; Type II = durante 3 a 12 meses de evidencia.
- **ISO/IEC 27001:2022** certifica un *sistema de gestión* (SGSI): alcance, análisis de riesgo, Declaración de
  Aplicabilidad (SoA), los 93 controles del Anexo A que apliquen, auditoría interna y revisión de la dirección.
- Las dos exigen políticas, evidencia y revisiones periódicas, no solo código seguro. El código cubre más o menos un
  tercio. El resto es documentación y rutina.
- Sorbo es hoy un proyecto de una persona con un fondo de $10/mes. Una auditoría formal cuesta decenas de miles de
  dólares al año. **Recomendación:** alinear los controles ya (fases 0 a 2, casi sin costo) y certificar solo cuando
  un cliente o socio lo pida (fase 3).

## Resumen

| | Cantidad |
|---|---|
| Críticos | 1 (C1 bajó a bajo: Storage no está activado) |
| Altos | 6 |
| Medios | 9 |
| Bien hecho | 8 |

El crítico que queda (C2) se arregla en un día y no toca la UI.

## Hallazgos

### Críticos

**C1. Storage abierto entre cuentas** — `storage.rules` · *Corregido en #55; en la práctica, riesgo bajo*
Las reglas dejaban que cualquier persona con sesión leyera y **sobrescribiera** cualquier archivo ajeno
(`match /{allPaths=**}` sin dueño). Al desplegar (2026-11-04) se vio que **Firebase Storage nunca se activó** en
`coffee-app-85052`: no hay bucket, así que esto nunca se pudo explotar. La app tampoco sube nada (`uploadPhoto` no tiene
llamadas).
→ Hecho: `storage.rules` niega todo y `firebase.json` las incluye. No hay que activar Storage. Si vuelven las fotos:
ruta `users/{uid}/...` con `request.auth.uid == uid`, solo `create`, y desplegar las reglas antes de subir nada.
SOC 2 CC6.1 · ISO A.8.3, A.8.9

**C2. Los headers de seguridad no llegan a producción** — `nuxt.config.ts`, `vercel.json`
`routeRules['/**'].headers` no se aplica con `nitro.preset: 'static'`. La respuesta real de sorbo.app solo trae
`strict-transport-security` (lo pone Vercel). Faltan `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`,
`Permissions-Policy` y no hay **CSP**. Quedan abiertos el clickjacking y cualquier XSS sin red de seguridad.
→ Mover los headers a `vercel.json` (`headers`) y agregar CSP primero como `Content-Security-Policy-Report-Only`
(orígenes: Firebase, googleapis, gstatic, googletagmanager, Sentry ingest), luego en modo bloqueo. HSTS con
`includeSubDomains; preload`.
SOC 2 CC6.6, CC6.8 · ISO A.8.9, A.8.26

### Altos

**A1. Directorio de correos legible por cualquiera** — `firestore.rules` `/users/{userId}`
`allow read: if request.auth != null` permite *listar* toda la colección. Cualquiera que cree una cuenta puede bajar el
correo, nombre y foto de todas las personas. Choca con la política de privacidad y con el criterio de confidencialidad.
→ Separar: `users/{uid}` público solo con `displayName`, `photoURL`, `bio`; el correo a un documento privado. La búsqueda
de amigos por correo pasa a una función (`onCall`) que devuelve solo coincidencia exacta, con límite de intentos.
Mientras tanto, `allow get` en vez de `read` (bloquea `list`).
SOC 2 C1.1, P6 · ISO A.5.34, A.8.3

**A2. Dependencias con fallas conocidas** — `package.json`, `functions/package.json`
`npm audit --omit=dev`: app **57** (8 críticas, 19 altas: `protobufjs` vía firebase, `seroval` y `nuxt`, `vue`, `tar`,
`simple-git`…); functions **7** (1 alta). Dependabot está apagado.
→ Actualizar `nuxt`, `vue`, `firebase`, `firebase-admin`; encender Dependabot (alertas + PRs semanales); `npm audit
--audit-level=high` en CI.
SOC 2 CC7.1 · ISO A.8.8

**A3. Sin control de cambios en `main`** — GitHub
`main` no tiene protección: se puede hacer push directo, sin PR ni CI en verde. El repo es público. Es justo lo que
rompió producción el 14 de octubre.
→ Regla de protección: PR obligatorio, checks obligatorios, sin force-push, historia lineal. Al ser una sola persona,
la «revisión» queda como control compensatorio: checklist en la plantilla de PR + `/code-review` antes del merge.
SOC 2 CC8.1 · ISO A.8.32, A.8.25

**A4. Respaldos sin comprobar** — Firestore (**verificar**)
No hay evidencia de PITR (recuperación a un punto en el tiempo) ni de backups programados de Firestore, ni de una prueba
de restauración. Un borrado masivo por un bug o una cuenta comprometida no tendría vuelta.
→ Activar PITR (7 días) y un backup programado diario con retención de 14 días; probar una restauración a un proyecto
aparte cada trimestre y anotarla. Definir RPO 24 h y RTO 8 h.
SOC 2 A1.2, A1.3 · ISO A.8.13, A.5.30

**A5. Borrar la cuenta deja datos** — `composables/useAuth.ts` `deleteAccount`
Corre en el navegador y no es atómico: si falla a la mitad, queda a medias. No borra `ritualOutcomes` (las reglas
prohíben borrar), `reminderTests`, la entrada de `waitlist` ni archivos de Storage. El derecho de supresión no se cumple
completo.
→ Pasar a una función: `onCall('deleteAccount')` o trigger de borrado de Auth con Admin SDK, que limpie todas las
colecciones con `userId` y deje un registro (sin datos personales) de que se hizo.
SOC 2 P4.3 · ISO A.5.34, A.8.10

**A6. Panel admin con PII completa y acceso solo por correo** — `functions/src/index.ts`, `people.ts`
`adminUsers` enmascara el correo en `email` pero manda el correo y nombre completos en `search`, así que el navegador
recibe todo. El acceso admin depende de una lista de correos en `.env`, sin MFA ni registro de quién consultó qué.
→ Buscar en el servidor (o mandar solo `name` en `search`); admin por *custom claim* (`admin: true`) además del correo;
MFA obligatorio en la cuenta admin (Google con 2FA o MFA de Identity Platform); `logger.info('admin', { fn, uid })` en
cada llamada.
SOC 2 CC6.2, CC6.3, CC7.2 · ISO A.8.2, A.8.5, A.8.15

### Medios

**M1. Sin App Check.** Firestore y las funciones aceptan llamadas de cualquier script con la API key pública.
`waitlist` acepta escrituras anónimas sin límite. → App Check con reCAPTCHA Enterprise en modo monitoreo y luego
obligatorio. ISO A.8.20

**M2. Las reglas no validan forma ni tamaño.** `create` en cafés, notas y recetas acepta cualquier campo y tamaño
(hasta 1 MiB por doc), cualquier `visibility` y cualquier `sharedWith`. → `keys().hasOnly([...])`, tipos, tamaños y
`visibility in ['private','friends','community']`, con tests en `tests/rules`. ISO A.8.28

**M3. Google Analytics sin consentimiento y con la ruta completa.** `plugins/analytics.client.ts` manda `to.fullPath`
(incluye ids y `?redirect=`). No hay aviso de cookies. → Mandar `to.path` sin ids (o el nombre de la ruta), Consent
Mode v2 con aviso, y nombrar GA en `/privacy`. SOC 2 P2, P3 · ISO A.5.34

**M4. Sin exportar mis datos.** No hay forma de descargar lo propio (portabilidad). → Botón en Cuenta que arme un JSON
de las colecciones de la persona. SOC 2 P5 · ISO A.5.34

**M5. CI incompleta.** `tests.yml` solo corre reglas: no corre `npm test` (10 archivos de unit), ni `nuxt build`, ni
`functions` build, ni audit. Las actions no están fijadas por SHA. → Agregar esos jobs y fijar versiones por SHA.
ISO A.8.29

**M6. Funciones con la cuenta de servicio por defecto.** Según `SORBO.md` corren «con la identidad de Google del
proyecto»: la cuenta por defecto suele tener rol **Editor** del proyecto. → Cuenta de servicio propia con solo
`datastore.user`, `firebaseauth.viewer`, `firebasemessaging` y `logging.logWriter`. ISO A.8.2, A.5.15

**M7. Despliegue de funciones desde la laptop.** `firebase deploy --only functions` a mano no deja registro de qué
commit está en producción. → Desplegar desde GitHub Actions al mergear (OIDC con Workload Identity, sin llaves).
SOC 2 CC8.1 · ISO A.8.32

**M8. Logs sin retención definida ni alertas.** No hay alertas por errores de funciones, picos de lecturas o cambios
de reglas. Cloud Audit Logs de acceso a datos están apagados por defecto (**verificar**). → Alertas en Cloud Monitoring
(errores, invocaciones, cambios de IAM y reglas), Sentry con alerta por error nuevo, retención 90 días o más.
SOC 2 CC7.2, CC7.3 · ISO A.8.15, A.8.16

**M9. Cuentas de proveedores** (**verificar**). MFA y dueños en Google Cloud/Firebase, Vercel, GitHub, Sentry, GA,
dominio y DNS en Vercel. Un correo de recuperación compartido o una cuenta sin 2FA es la puerta más probable.
SOC 2 CC6.1 · ISO A.5.17, A.5.18

### Bien hecho (se conserva y se cita como evidencia)

- Firestore niega todo por defecto y cada colección revisa dueño; el dueño no puede transferir un doc.
- Regla de «brindar» acotada a la propia entrada de `cheers`; amistad solo la acepta quien la recibe.
- Tests de reglas con emulador en CI.
- Secretos fuera de git (`functions/.env`, `.env*` ignorados); secret scanning y push protection encendidos en GitHub.
- Sentry con `sendDefaultPii: false` y query recortada en `beforeSend`.
- Funciones con `maxInstances: 1`, timeouts y alertas de presupuesto: control de costo y de abuso.
- Validación de lo que llega de `userPreferences` en `dailyReminder` (tokens, zona horaria) y límite de 1 por minuto en
  `sendTestReminder`.
- Panel admin devuelve conteos, no contenido de notas.

## Plan

Cada punto de código va en su propia rama y PR, con CI en verde. Ninguno cambia la UI salvo M3 y M4, que siguen la
regla de interruptor y canvas.

### Fase 0 · Esta semana — cerrar lo crítico (código, sin costo)

| # | Qué | Hallazgo | Esfuerzo |
|---|---|---|---|
| 0.1 | Cerrar `storage.rules` (hecho; Storage no está activado) | C1 | — |
| 0.2 | Headers + CSP report-only en `vercel.json`; quitar los de `routeRules` | C2 | 2 h |
| 0.3 | `users`: `allow get` en vez de `read` (parche) | A1 | 30 min |
| 0.4 | `search` del panel sin correo | A6 | 30 min |
| 0.5 | Proteger `main` y encender Dependabot | A3, A2 | 15 min |
| 0.6 | Actualizar dependencias con fallas críticas/altas | A2 | 2–4 h |
| 0.7 | CI: unit tests, build, functions build, audit | M5 | 1 h |
| 0.8 | Activar PITR y backup diario de Firestore | A4 | 30 min |
| 0.9 | MFA en todas las cuentas de proveedores | M9 | 1 h |

### Fase 1 · 2 a 4 semanas — privacidad y acceso

- Separar perfil público y correo; búsqueda de amigos por función (A1).
- `deleteAccount` en el servidor, completo y con registro (A5).
- Exportar mis datos (M4).
- Admin por custom claim + MFA + log de cada llamada (A6).
- App Check en monitoreo → obligatorio (M1).
- Validación de forma en reglas con tests (M2).
- GA: ruta sin ids, Consent Mode y aviso; actualizar `/privacy` y `/terms` (M3).
- Cuenta de servicio con mínimo privilegio (M6).
- CSP en modo bloqueo tras 2 semanas sin reportes inesperados (C2).

### Fase 2 · 1 a 3 meses — el sistema de gestión (documentos y rutina)

Vive en `docs/sgsi/`, en Markdown versionado (los PR son la evidencia de cambios).

- **Alcance del SGSI** y **SoA**: los 93 controles del Anexo A, cuáles aplican y por qué.
- **Registro de riesgos** (activo, amenaza, probabilidad, impacto, control, dueño) revisado cada trimestre.
- **Inventario de activos y datos**: colecciones, qué PII guarda cada una, retención.
- **Registro de proveedores**: Google Cloud/Firebase, Vercel, GitHub, Sentry, Google Analytics, con su SOC 2/ISO
  descargado cada año y el DPA firmado (SOC 2 CC9.2 · ISO A.5.19–A.5.23).
- **Políticas cortas** (una página cada una): seguridad de la información, acceso, cambios, respaldos, incidentes,
  desarrollo seguro, uso aceptable, retención y borrado.
- **Plan de respuesta a incidentes** con runbook: rotar claves, revocar sesiones, restaurar backup, aviso a personas
  afectadas (≤72 h si aplica GDPR/Ley 1581) — y un simulacro al año.
- **Continuidad**: RPO/RTO, prueba de restauración trimestral registrada.
- **Revisión de accesos** trimestral (quién es owner en cada consola) y **revisión de la dirección** semestral.
- **Despliegue de funciones desde CI** con OIDC (M7) y **alertas** (M8).
- Una sola persona = no hay separación de funciones. Se documenta como riesgo aceptado con controles compensatorios
  (CI obligatoria, revisión automatizada, logs inmutables, alertas a un segundo correo).

### Fase 3 · Cuando haga falta — certificar

1. Juntar 3 meses de evidencia de la fase 2 (tickets, PRs, revisiones, pruebas de restauración).
2. Evaluación de preparación (readiness) con una plataforma de cumplimiento (Vanta, Drata, Secureframe) o un consultor.
3. SOC 2 **Type I** (Seguridad + Confidencialidad + Privacidad) → **Type II** a los 6 meses; o ISO 27001 etapa 1 y 2.
   Gran parte de la evidencia sirve para las dos.

## Matriz rápida

| Área | SOC 2 (TSC) | ISO 27001:2022 Anexo A | Hallazgos |
|---|---|---|---|
| Acceso lógico | CC6.1–CC6.3 | 5.15–5.18, 8.2, 8.3, 8.5 | C1, A1, A6, M6, M9 |
| Seguridad de red y web | CC6.6–CC6.8 | 8.9, 8.20, 8.26 | C2, M1 |
| Vulnerabilidades | CC7.1 | 8.8 | A2 |
| Monitoreo y logs | CC7.2–CC7.3 | 8.15, 8.16 | A6, M8 |
| Incidentes | CC7.4–CC7.5 | 5.24–5.28 | Fase 2 |
| Cambios | CC8.1 | 8.25, 8.29, 8.32 | A3, M5, M7 |
| Proveedores | CC9.2 | 5.19–5.23 | Fase 2 |
| Disponibilidad y respaldo | A1.2–A1.3 | 5.30, 8.13 | A4 |
| Confidencialidad | C1.1–C1.2 | 8.10, 8.11 | A1, A5 |
| Privacidad | P1–P8 | 5.34 | A1, A5, M3, M4 |
| Desarrollo seguro | CC8.1 | 8.28 | M2 |
