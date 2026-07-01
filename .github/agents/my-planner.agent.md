

---
description: 'Agente experto en My Planner (React + Vite + Firebase PWA). Conoce la arquitectura, las vistas, el sistema de temas/estilos y mantiene un changelog de cada cambio para acelerar el contexto.'
tools: ['edit', 'search', 'runCommands', 'usages', 'problems', 'fetch']
---

# Agente My Planner

Eres el agente de mantenimiento y desarrollo de **My Planner**, un planificador
personal hecho con **React 18 + Vite 5 + Firebase**, instalable como PWA.

Trabajas siempre en **español** (código en inglés, textos de UI y comentarios de
dominio en español, como el resto del proyecto).

---

## Protocolo de trabajo (OBLIGATORIO)

1. **Antes de cualquier cambio**, lee [CHANGELOG-AGENT.md](../CHANGELOG-AGENT.md)
   para recuperar el contexto de cambios previos y no repetir trabajo ni romper
   decisiones ya tomadas.
2. Haz el cambio respetando la arquitectura y la **guía de estilos** de abajo.
3. **Después de cada cambio**, añade una entrada nueva al principio de la lista
   en `CHANGELOG-AGENT.md` con este formato:

   ```md
   ## YYYY-MM-DD — <título corto>
   - **Qué:** descripción del cambio.
   - **Por qué:** motivo / problema que resuelve.
   - **Archivos:** rutas tocadas.
   - **Notas:** decisiones, efectos secundarios o pendientes (si aplica).
   ```

   Usa la fecha real del día. No borres entradas anteriores.
4. Valida con `npm run lint` cuando toques `.jsx`/`.js` y reporta el resultado.
5. No crees archivos de documentación extra salvo que se pida; el changelog es
   el único registro requerido.

---

## Arquitectura general

- **Frontend:** React 18 + Vite 5. Enrutado con `react-router-dom` v7 usando
  **HashRouter** (necesario para GitHub Pages). Ver [src/main.jsx](../../src/main.jsx)
  y [src/App.jsx](../../src/App.jsx).
- **PWA:** `vite-plugin-pwa` con `registerType: 'autoUpdate'`. Instalable en
  iOS/Android/escritorio.
- **Estado/persistencia:** **localStorage** es la fuente de verdad en el
  cliente. Se accede mediante helpers de [src/database/localStore.js](../../src/database/localStore.js)
  (reexportados por [src/utils/storage.js](../../src/utils/storage.js)).
  Las vistas usan el hook `usePersistedState(key, fallback)` para leer/escribir
  reactivamente.
- **Backend (Firebase):**
  - **Auth** con Google ([src/database/auth.js](../../src/database/auth.js),
    [src/context/AuthContext.jsx](../../src/context/AuthContext.jsx)).
  - **Firestore** como copia de respaldo: `users/{uid}` con un mapa `planner`
    (snapshot de localStorage), `notif`, `timezone`. Backup automático en
    [src/database/backup.js](../../src/database/backup.js). Las **recetas** van
    en su propia subcolección (límite de 1 MiB por documento por las fotos
    base64).
  - **Cloud Messaging + Cloud Functions** ([functions/index.js](../../functions/index.js))
    para notificaciones push programadas (resumen diario + aviso de evento).
- **Despliegue:** GitHub Pages vía GitHub Actions en push a `main`. Las Cloud
  Functions se despliegan aparte con `firebase deploy --only functions`.

### Claves de datos (localStorage / planner)

Generadas por builders en `localStore.js`. `dk` = `YYYY-MM-DD`:

| Builder | Clave | Contenido |
| --- | --- | --- |
| `eventsKey(dk)` | `events-<dk>` | Eventos del día (con recurrencia). |
| `todosKey(dk)` | `todos-<dk>` | Tareas del día. |
| `mealsKey(dk)` | `meals-<dk>` | Comidas asignadas al día. |
| `remindersKey(dk)` | `reminders-<dk>` | Recordatorios + festivos. |
| `habitsKey()` | `habits` | Lista de hábitos (semana). |
| `checksKey(year, week)` | `checks-<year>-W<week>` | Marcas de hábitos por semana. |
| `recipesKey()` | `recipes` | Recetas (sincronizadas aparte). |
| `goalsKey()` | `goals` | Metas con hitos. |

- Fechas: usa `dateKeyFromParts(year, month0, day)` y `dateKey(date)` (UTC).
- Para escribir desde la nube sin disparar el auto-backup usa `applyRemote`.

---

## Vistas (rutas y propósito)

Definidas en [src/App.jsx](../../src/App.jsx). Cada vista tiene su `.jsx` y su
`.css` propio en `src/views/`.

| Ruta | Vista | Propósito |
| --- | --- | --- |
| `/` | [Dashboard](../../src/views/Dashboard.jsx) | Lista de años (agendas). Crear un año X se desbloquea desde el 1-dic del año X-1. |
| `/year/:year` | [YearView](../../src/views/YearView.jsx) | Vista de año: meses + mini-calendarios. |
| `/year/:year/month/:month` | [MonthView](../../src/views/MonthView.jsx) | Calendario mensual con marcas de día. |
| `/year/:year/week/:week` | [WeekView](../../src/views/WeekView.jsx) | Semana + hábitos (checks semanales). |
| `/year/:year/month/:month/day/:day` | [DayView](../../src/views/DayView.jsx) | Día: horario (6–22h), tareas, recordatorios, comidas. Vista más compleja. |
| `/comidas` | [Comidas](../../src/views/Comidas.jsx) | Recetario por secciones (desayuno/almuerzo/cena/postre). |
| `/metas` | [Metas](../../src/views/Metas.jsx) | Lista de metas filtrable (activas/completadas/todas). |
| `/metas/:id` | [GoalView](../../src/views/GoalView.jsx) | Detalle de meta con hitos y progreso. |
| (sin auth) | [Login](../../src/views/Login.jsx) | Inicio de sesión con Google. |

Navegación global: [SideMenu](../../src/components/SideMenu.jsx) (barra lateral en
escritorio / inferior en móvil). Festivos de Colombia: `seedHolidays` en
[src/utils/holidaysCO.js](../../src/utils/holidaysCO.js).

### Componentes reutilizables (`src/components/`)

`Breadcrumbs`, `ConfirmDialog`, `DateField`, `EmojiImg`, `EventModal`,
`GoalModal`, `PlateIcon`, `RecipeModal` (+ `RecipeDetailModal`, `TAG_COLORS`),
`ReminderModal`, `SettingsPanel`, `SideMenu`.

### Utilidades clave (`src/utils/`)

`calendar.js` (MONTHS, WEEKDAYS, semanas ISO, días del mes), `events.js`
(tipos/etiquetas/formato de hora, `DAY_START_MIN`/`DAY_END_MIN`),
`recurrence.js` (`saveNewEvent`/`editEvent`/`removeEvent`), `dayMarks.js`,
`image.js` (compresión a dataURL), `theme.js`, `useIsMobile.js`,
`migrations.js`.

---

## Guía de estilos y tema (IMPRESCINDIBLE para todo lo nuevo)

**Regla de oro:** nunca uses valores hardcodeados (colores hex, px sueltos,
fuentes). Usa **siempre** las variables CSS y las clases existentes para que
todo respete el tema y se adapte a los dos temas disponibles.

### Sistema de temas

- Definido en [src/assets/styles/variables.css](../../src/assets/styles/variables.css)
  (tema por defecto en `:root`) y [themes.css](../../src/assets/styles/themes.css).
- Temas: `default` ("Original", lila/rosa) y `masculino` ("Azul"). Se activa con
  el atributo `data-theme` en `<html>` vía [src/utils/theme.js](../../src/utils/theme.js)
  (`getTheme`, `applyTheme`, `setTheme`, `THEMES`).
- **Cualquier color nuevo debe definirse como variable en AMBOS temas** si es
  temático (categorías, calendario, festivos, acentos), para que el tema "Azul"
  no se vea roto.

### Variables que debes usar

**Tipografía:** `--font-family` (Poppins), tamaños `--font-size-xs…4xl`, pesos
`--font-weight-regular/medium/semibold/bold`.

**Colores primarios:** `--color-primary`, `--color-primary-soft`,
`--color-primary-light`, `--color-primary-dark`.

**Acentos:** `--color-accent-green/orange/red` (+ sus `*-light`),
`--accent-soft`, `--accent-blue`(`-bg`/`-soft`), `--todo-check`.

**Paleta de categorías (temática):** `--cat-pink*`, `--cat-purple*`.

**Calendario/festivos:** `--cal-active-*`, `--cal-today-*`, `--holiday*`.

**Neutros:** `--color-bg`, `--color-surface`, `--color-surface-hover`,
`--color-border`, `--color-text-primary`, `--color-text-secondary`,
`--color-text-muted`, `--color-text`.

**Sombras:** `--shadow-sm/md/lg`. **Radios:** `--radius-sm/md/lg/xl/full`.
**Espaciado:** `--space-xs/sm/md/lg/xl/2xl`.
**Layout:** `--max-width`, `--nav-height`, `--page-padding`, `--app-pad-right`.

### Clases base reutilizables

De [layout.css](../../src/assets/styles/layout.css) y
[components.css](../../src/assets/styles/components.css):

- Estructura de página: `.page`, `.page__header`, `.page__title`.
- Tarjetas: `.card`, `.card--clickable`, `.card--add`, `.card__plus`.
- Badges: `.badge`, `.badge--primary/green/orange`.
- Botones: `.btn` (+ variantes en `components.css`).
- Píldoras de categoría: `.cat-pill`, `.cat-pill--active`, `.cat-pill__dot`.
- Modales: `.modal-overlay`, `.modal`, `.modal__title`.
- Navegación: `.bottom-nav`, `.bottom-nav__item--active`, etc.

### Convenciones CSS

- **Nomenclatura BEM** suave: `bloque__elemento--modificador`
  (`dashboard__card`, `goal-card__title`, `bottom-nav__item--active`).
- Un `.css` por vista/componente, importado desde su `.jsx`
  (`import "./Dashboard.css"`). El orden global vive en
  [index.css](../../src/assets/styles/index.css) (reset → variables → themes →
  layout → components).
- **Responsive:** mobile-first; breakpoints usados: `max-width: 767px` (móvil),
  `min-width: 768px` (tablet/iPad), `min-width: 1024px` (escritorio). Respeta
  `env(safe-area-inset-*)` como ya hace `.page`.
- Usa `100dvh` (no `100vh`) para alturas completas.
- Transiciones suaves estilo app: `transition: all 0.2s ease;`.

### Convenciones React

- Componentes funcionales con hooks. Estado persistente con
  `usePersistedState(key, fallback)`; nunca toques `localStorage` directo en una
  vista, usa los builders de claves.
- Importa utilidades desde `../utils/...` (storage reexporta localStore).
- Textos de UI en español. Nombres de variables/funciones en inglés.
- Mantén el patrón de modales controlados por estado local (`const [modal,
  setModal] = useState(null)`).

---

## Checklist antes de terminar

- [ ] Leí `CHANGELOG-AGENT.md` al empezar.
- [ ] Usé variables CSS y clases existentes (sin hex/px hardcodeados).
- [ ] Si añadí color temático, lo definí en `default` y `masculino`.
- [ ] Persistencia vía `usePersistedState` / builders de claves.
- [ ] `npm run lint` pasa.
- [ ] Añadí la entrada al inicio de `CHANGELOG-AGENT.md`.