# My Planner

Planificador personal hecho con **React + Vite**. Organiza tu día (horario, tareas, recordatorios y comidas), tu semana (hábitos), el mes y el año, con festivos de Colombia, sincronización en la nube y notificaciones push.

- **Frontend:** React 18 + Vite 5, React Router (HashRouter para GitHub Pages).
- **PWA:** instalable en iOS/Android/escritorio, con auto-actualización.
- **Backend:** Firebase (Auth con Google, Firestore para sincronización, Cloud Messaging + Cloud Functions para notificaciones).
- **Despliegue:** GitHub Pages mediante GitHub Actions.

---

## Índice

- [Requisitos](#requisitos)
- [Desarrollo local](#desarrollo-local)
- [Variables de entorno](#variables-de-entorno)
- [Firebase](#firebase)
- [Despliegue en GitHub Pages](#despliegue-en-github-pages)
- [Notificaciones push](#notificaciones-push)
- [Widget "Hoy" (iPhone / iPad)](#widget-hoy-iphone--ipad)
- [Estructura del proyecto](#estructura-del-proyecto)

---

## Requisitos

- **Node.js 20** (mismo runtime que usan las Cloud Functions y el workflow de CI).
- Una cuenta de **Firebase** con un proyecto creado (este repo usa `planner-52564`).
- **Firebase CLI** para desplegar funciones: `npm install -g firebase-tools`.

## Desarrollo local

```powershell
npm install
npm run dev
```

Vite levanta la app en `http://localhost:5173`. Para probar desde el móvil en la misma red:

```powershell
npm run dev -- --host
```

Otros scripts:

| Comando           | Descripción                              |
| ----------------- | ---------------------------------------- |
| `npm run dev`     | Servidor de desarrollo con HMR.          |
| `npm run build`   | Build de producción en `dist/`.          |
| `npm run preview` | Sirve el build de producción localmente. |
| `npm run lint`    | Linter (ESLint).                         |

## Variables de entorno

La app lee la configuración de Firebase desde variables `VITE_*`. En **local**, créalas en un archivo `.env` en la raíz (no se sube al repo):

```ini
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=planner-52564.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=planner-52564
VITE_FIREBASE_STORAGE_BUCKET=planner-52564.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_FIREBASE_MEASUREMENT_ID=...
# Clave pública Web Push (Firebase Console → Cloud Messaging → Web Push certificates)
VITE_FIREBASE_VAPID_KEY=...
```

Estos valores los encuentras en **Firebase Console → Configuración del proyecto → Tus apps (Web)**. La `VITE_FIREBASE_VAPID_KEY` está en **Cloud Messaging → Web Push certificates**.

> En **producción** (GitHub Pages) estas variables NO vienen de un `.env`, sino de los **Secrets** del repositorio (ver más abajo).

## Firebase

El proyecto usa tres servicios:

- **Authentication** — inicio de sesión con Google.
- **Firestore** — cada usuario tiene un documento `users/{uid}` con:
  - `planner`: mapa `{ "events-YYYY-MM-DD": "<json>", "todos-...": "<json>", ... }` (copia de respaldo de los datos que viven en `localStorage`).
  - `notif`: estado de notificaciones (`enabled`, `dailyHour`, `eventLeadMinutes`, `tokens`, `sent`).
  - `timezone`: zona horaria del dispositivo.
- **Cloud Messaging + Cloud Functions** — notificaciones push programadas.

El service worker de FCM está en [public/firebase-messaging-sw.js](public/firebase-messaging-sw.js) y recibe la config por query params para poder inicializarse sin variables de entorno.

## Despliegue en GitHub Pages

El despliegue del **frontend** es automático mediante GitHub Actions: cada `push` a `main` construye y publica en GitHub Pages. El workflow está en [.github/workflows/deploy.yml](.github/workflows/deploy.yml).

### 1. Configurar GitHub Pages

En el repositorio: **Settings → Pages → Build and deployment → Source: GitHub Actions**.

### 2. Configurar los Secrets

En **Settings → Secrets and variables → Actions → New repository secret**, crea uno por cada variable (mismos nombres que en `.env`):

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_FIREBASE_MEASUREMENT_ID`
- `VITE_FIREBASE_VAPID_KEY`

### 3. Desplegar

```powershell
git add .
git commit -m "mi cambio"
git push
```

GitHub Actions construye y publica automáticamente. La app queda en:

```
https://<usuario>.github.io/my-planer/
```

> **`base` del proyecto:** en [vite.config.js](vite.config.js) la constante `REPO` debe coincidir con el nombre del repositorio para que las rutas funcionen en GitHub Pages. Si renombras el repo, actualiza ese valor.

> **No requiere reinstalar la PWA:** la app usa `registerType: 'autoUpdate'`, así que tras un push los usuarios reciben la nueva versión automáticamente (puede requerir cerrar y abrir la app una vez).

## Notificaciones push

Las notificaciones las envía una **Cloud Function programada** ([functions/index.js](functions/index.js)) que corre cada 10 minutos y manda:

- **Resumen diario** a la hora configurada (por defecto 8:00): eventos, recordatorios y tareas pendientes del día.
- **Aviso de evento**: en la primera corrida en que falten ≤ 60 min para un evento (configurable con `eventLeadMinutes`).

Cada aviso se marca como enviado (`notif.sent`) para no repetirse. Los mensajes son **data-only** para evitar notificaciones duplicadas en iOS.

### Activarlas (usuario)

En la app: **Ajustes → Notificaciones → Activar**. Esto pide permiso, registra el token FCM del dispositivo y lo guarda en Firestore.

> En **iOS** las notificaciones web solo funcionan si la app está **añadida a la pantalla de inicio** (instalada como PWA), por limitación de Safari.

### Desplegar las funciones (desarrollador)

Las Cloud Functions **no** se despliegan con GitHub Pages; se despliegan aparte con la Firebase CLI:

```powershell
# una sola vez: iniciar sesión y seleccionar el proyecto
firebase login
firebase use planner-52564

# desplegar solo las funciones
firebase deploy --only functions
```

Requiere el plan **Blaze** (las funciones programadas lo exigen). Para el uso personal de esta app, el consumo se mantiene dentro de la capa gratuita.

Config relevante: [firebase.json](firebase.json) (runtime Node 20), `.firebaserc` (proyecto por defecto) y [functions/package.json](functions/package.json).

## Widget "Hoy" (iPhone / iPad)

iOS/iPadOS no permite que una PWA cree widgets nativos. La solución es la app gratuita **[Scriptable](https://scriptable.app/)** + una Cloud Function HTTP (`todayPlanner`) que devuelve el plan del día en JSON.

El script está versionado en [widget/today-widget.js](widget/today-widget.js) y muestra, sobre fondo blanco y en dos columnas:

- **Columna 1:** día de la semana, fecha y recordatorios (festivos primero).
- **Columna 2:** tareas (máx. 3) y eventos (`hora - nombre`, con el color del tag).

### 1. Crear el secreto compartido y desplegar

El endpoint se protege con un secreto `WIDGET_KEY` (uid + clave). Créalo y despliega:

```powershell
firebase functions:secrets:set WIDGET_KEY
# escribe una clave alfanumérica simple (NO se ve mientras la escribes) y pulsa Enter
firebase deploy --only functions
```

Tras el deploy verás la URL de la función, por ejemplo:

```
https://us-central1-planner-52564.cloudfunctions.net/todayPlanner
```

### 2. Probar el endpoint

En el navegador (reemplaza `TU_UID` por tu User UID de **Firebase Console → Authentication → Users**, y `TU_WIDGET_KEY` por la clave del secreto):

```
https://us-central1-planner-52564.cloudfunctions.net/todayPlanner?uid=TU_UID&key=TU_WIDGET_KEY
```

Debe devolver un JSON con `events`, `reminders` y `todos`. Si devuelve `{"error":"unauthorized"}`, la clave no coincide: vuelve a fijar el secreto y redespliega.

### 3. Configurar Scriptable

1. Instala **Scriptable** (gratis, App Store).
2. Crea un script nuevo y pega el contenido de [widget/today-widget.js](widget/today-widget.js).
3. Cambia las constantes `UID` y `KEY` (la `URL` ya viene puesta).
4. Pulsa ▶︎ para previsualizar.
5. En la pantalla de inicio: mantén pulsado → **+** → **Scriptable** → tamaño mediano → **Agregar widget**. Luego **Editar widget** y elige el script.

> iOS refresca los widgets cada cierto tiempo (no es instantáneo). Una lectura por refresco se mantiene dentro de la capa gratuita de Firestore.

## Estructura del proyecto

```
my-planer/
├─ .github/workflows/deploy.yml   # CI: build + deploy a GitHub Pages
├─ public/
│  └─ firebase-messaging-sw.js    # Service worker de FCM (notificaciones)
├─ functions/                     # Cloud Functions (notificaciones + endpoint widget)
│  └─ index.js
├─ widget/
│  └─ today-widget.js             # Script de Scriptable para el widget
├─ src/
│  ├─ views/                      # Dashboard, Year, Month, Week, Day, Comidas, Metas…
│  ├─ components/                 # Modales, menús, paneles, iconos…
│  ├─ context/                    # AuthContext (sesión + sincronización)
│  ├─ database/                   # firebase.js, localStore, messaging (FCM)
│  ├─ utils/                      # calendar, events, recurrence, holidaysCO, dayMarks…
│  └─ assets/styles/              # Variables y temas CSS
├─ firebase.json                  # Config de Cloud Functions
├─ vite.config.js                 # Vite + PWA (base = nombre del repo)
└─ package.json
```
