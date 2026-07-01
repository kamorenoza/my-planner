# Changelog del agente

Registro de cambios realizados por el agente de mantenimiento de My Planner.
Las entradas más recientes van al principio.

## 2026-07-01 — Escritorio: la app ocupa todo el ancho disponible
- **Qué:** en escritorio (≥1024px) se quitó el tope `--max-width: 1200px` (ahora
  `100%`), así `#root` deja de centrarse con espacio vacío a los lados y el
  contenido ocupa toda la pantalla disponible. El menú lateral fijo sigue al
  borde derecho y el contenido se separa de él con `--app-pad-right`.
- **Por qué:** con el tope de 1200px la vista se veía "recortada"/estrecha en
  pantallas grandes y quedaba desconectada del menú lateral (pegado al borde
  del viewport).
- **Archivos:** src/assets/styles/variables.css.
- **Notas:** solo se cambió la variable de tema; el layout móvil/tablet no se
  ve afectado (ya usaban `--max-width: 100%`).

## 2026-07-01 — Rediseño del menú inferior en móvil (barra + hamburguesa)
- **Qué:** en móvil la barra inferior pasa a tener 5 zonas fijas:
  `Dashboard · SEM {nº semana} · HOY (fab central) · {MES} · ☰ hamburguesa`.
  El fab HOY navega directo al día de hoy, SEM a la semana actual y MES al mes
  actual (ya no es un speed-dial). El botón hamburguesa abre un bottom-sheet
  (`.mobile-sheet`) con el resto de vistas listadas con icono + nombre:
  Comidas, Medicamentos, Metas y Configuración. En escritorio se mantiene el
  menú lateral vertical intacto. Se separó el render por `isMobile` (antes era
  un único `.side-menu` reordenado por CSS) y se extrajeron los iconos SVG a
  constantes reutilizables.
- **Por qué:** la barra anterior mezclaba el speed-dial de HOY con los ítems de
  navegación y generaba conflicto/solapamiento en móvil.
- **Archivos:** src/components/SideMenu.jsx, src/components/SideMenu.css.
- **Notas:** el nuevo namespace `.mobile-nav`/`.mobile-sheet` evita chocar con
  las clases legadas `.bottom-nav` de layout.css. Se eliminó el estado
  `jumpOpen` y el FAB/backdrop del speed-dial (ya no se usan). Solo se emplean
  variables CSS del tema. Lint sin errores nuevos.

## 2026-07-01 — Migración: rellenar emojiCode de recordatorios antiguos (fix iPad)
- **Qué:** nueva migración `backfillReminderEmojiCodes` en `migrations.js` que
  recorre las claves `reminders-YYYY-MM-DD` de localStorage y, para cada
  recordatorio sin `emojiCode`, lo rellena a partir del shortcode guardado en
  `emoji` usando `REMINDER_EMOJIS` (+ `HOLIDAY_EMOJI`) como fuente de verdad.
  Se guarda con su propio flag (`migrations-reminder-emojicode-v1`) y
  `runMigrations` se reestructuró para ejecutar el bloque v1 y esta migración de
  forma independiente (cada una con su flag).
- **Por qué:** recordatorios creados antes de que existiera `emojiCode` caían al
  glifo nativo, que no se renderiza en iPad; ahora se convierten a imagen vía
  `EmojiImg` sin que el usuario tenga que reeditarlos.
- **Archivos:** src/utils/migrations.js.
- **Notas:** solo añade el campo `emojiCode` (nunca borra datos); si el `emoji`
  no coincide con ningún shortcode conocido, el recordatorio se deja intacto.

## 2026-07-01 — Modal de recetas con un solo scroll y reordenar TODO en touch (iPad)
- **Qué:** (1) el selector "Elegir receta" de la vista diaria ya no tiene doble
  scroll: el modal (`.modal--picker`) pasa a columna flexible con
  `overflow: hidden` y solo scrollea la lista interna de recetas
  (`.meal-picker__list` con `flex:1`/`min-height:0`). (2) El reordenar de las
  tareas TODO ahora funciona con touch en iPad: se añadieron gestos táctiles
  (`onTouchStart`/`onTouchMove`/`onTouchEnd`) que localizan la fila bajo el dedo
  con `document.elementFromPoint` (via `data-todo-id`) y reordenan al soltar,
  además de `touch-action: none` en `.todo__item--reorder` para que el gesto no
  haga scroll.
- **Por qué:** en iPad el modal mostraba dos barras de scroll y el drag & drop
  HTML5 no responde al touch (limitación de Safari iOS).
- **Archivos:** src/views/DayView.jsx, src/views/DayView.css.
- **Notas:** el drag con ratón (HTML5 DnD) se mantiene intacto; los gestos touch
  son adicionales. Lint sin errores nuevos (los `react/prop-types` son
  preexistentes).

## 2026-07-01 — Emojis :dart: :pill: :knife_fork_plate: renderizados como imagen (fix iPad)
- **Qué:** se reemplazaron los emojis nativos que no se renderizaban en iPad
  por el componente `EmojiImg` con su código Apple: :dart: (`1f3af`) en las metas
  (fecha objetivo de la card y estado vacío), :pill: (`1f48a`) en el estado vacío
  de Medicamentos y :knife_fork_plate: (`1f37d-fe0f`) en la card de medicamento "tomar con
  comida". Se añadió el CSS de tamaño (`width`/`height`) para los nuevos `img`
  en `.goal-card__date-icon`, `.metas__empty-icon`,
  `.medication-home__empty-icon` y `.medication-card__food-icon`.
- **Por qué:** en iPad esos emojis salían como texto/caja en vez del glifo; el
  resto de la app ya usa `EmojiImg` (PNG de Apple) para render consistente.
- **Archivos:** src/views/Metas.jsx, src/views/Metas.css,
  src/views/MedicationHome.jsx, src/views/MedicationHome.css,
  src/components/MedicationCards.jsx, src/components/MedicationCards.css.
- **Notas:** lint sin errores nuevos (los `react/prop-types` y los del
  `widget/*.js` son preexistentes).

## 2026-07-01 — Nuevo widget de Scriptable "Medicamentos para hoy"
- **Qué:** nuevo `widget/medications-widget.js` (mismo estilo que
  `today-widget.js`, versión iPhone) que muestra el título "MEDICAMENTOS PARA
  HOY" y las dosis PENDIENTES del día como `(tag del plan) 8:00am Nombre`,
  máximo 6, y un badge morado "+N" (igual que el otro widget) con las restantes.
  Para alimentarlo, la Cloud Function `todayPlanner` ahora también devuelve
  `medications`: recorre los planes activos del día y los medicamentos no
  pausados, calcula sus dosis con `medDoseMinutes` y excluye las ya marcadas
  como tomadas en `med-history`, ordenadas por hora. Se añadieron
  `PLAN_COLOR_HEX` (espejo de `PLAN_COLORS`) e `isPlanActiveOn` en la función.
- **Por qué:** el usuario pidió un widget aparte que liste solo los
  medicamentos pendientes de hoy con el tag del plan, hora y nombre.
- **Archivos:** widget/medications-widget.js (nuevo), functions/index.js.
- **Notas:** requiere desplegar las funciones (`firebase deploy --only
  functions`) para que el endpoint devuelva `medications`. UID/KEY del widget
  usan los mismos valores que `today-widget.js`.

## 2026-07-01 — Las tarjetas llenan el alto disponible sin romper el scroll
- **Qué:** `.day-view__top-row` pasa a `flex: 1 0 auto` (grow para ocupar el
  espacio libre, shrink 0). Con poco contenido, Todo/Recordatorios se estiran
  para llenar el alto disponible de la columna lateral; con mucho contenido no
  se encogen y la columna hace scroll general de las cuatro tarjetas.
- **Por qué:** el usuario pidió que el alto mínimo de las tarjetas ocupe el alto
  disponible sin afectar el scroll general implementado antes.
- **Archivos:** src/views/DayView.css.

## 2026-07-01 — Scroll general de la columna lateral (las 4 tarjetas)
- **Qué:** se quitó el scroll interno de `.todo__list` / `.reminders__list` y el
  `flex: 1 1 0` de `.day-view__top-row`. Ahora Todo/Recordatorios toman su altura
  natural (la card de TODOs crece según la cantidad de ítems) y la columna
  lateral (`.day-view__col--side`) vuelve a `overflow-y: auto`, haciendo scroll
  general de las cuatro tarjetas (Todo, Recordatorios, Comidas, Medicamentos).
  El horario permanece fijo en su propia columna.
- **Por qué:** el usuario pidió que el scroll sea general para las 4 tarjetas y
  que la tarjeta de TODOs ajuste su tamaño al contenido, sin afectar el horario.
- **Archivos:** src/views/DayView.css.

## 2026-07-01 — Placeholder de recordatorios igual al de medicamentos
- **Qué:** `.reminders__empty` adopta el mismo estilo que `.day-meds__empty`
  (`font-size: var(--font-size-xs)`, `color: var(--color-text-muted)`, sin
  centrado ni padding vertical).
- **Por qué:** unificar la apariencia del texto de estado vacío entre
  Recordatorios y Medicamentos.
- **Archivos:** src/views/DayView.css.

## 2026-07-01 — Medicamentos siempre visible y tarjetas que llenan el alto
- **Qué:** `DayMedications` ya no retorna `null` cuando no hay medicamentos: la
  tarjeta se muestra siempre con el mensaje "Sin medicamentos para hoy"
  (nuevo `.day-meds__empty`). En la columna lateral de escritorio/iPad, `Todo` y
  `Recordatorios` (`.day-view__top-row`) llenan el alto disponible con
  `flex: 1 1 0` y sus listas (`.todo__list` / `.reminders__list`) hacen scroll
  interno; la columna lateral pasa a `overflow: hidden` y la fila de
  Comidas/Medicamentos queda fija y siempre visible. De paso se corrigieron los
  colores corruptos `3D3D4D_1` en `.reminder-card__text` y `.reminders__input`.
- **Por qué:** el usuario pedía que la tarjeta de Medicamentos se vea siempre
  (incluso sin datos) y que Todo/Recordatorios se ajusten al alto de la
  pantalla sin empujar Medicamentos fuera de vista.
- **Archivos:** src/views/DayView.jsx, src/views/DayView.css.

## 2026-07-01 — Fix: Medicamentos visibles y vista de día a pantalla completa
- **Qué:** se quitó `max-width: var(--max-width)` y `margin: 0 auto` de
  `.day-view` para que en escritorio ocupe todo el ancho de la pantalla, y se
  cambió `.day-view__top-row` y `.day-view__meals-row` a `flex: 0 0 auto`
  (antes `flex: 1 0 auto` / `margin-top: auto`) para que las cuatro tarjetas se
  apilen desde arriba y la columna lateral haga scroll, evitando que
  Medicamentos quedara empujado fuera de vista.
- **Por qué:** tras los ajustes previos, la fila de comidas/medicamentos se
  empujaba fuera del área visible (Medicamentos "desaparecía") y el contenido de
  escritorio quedaba centrado con un ancho máximo en vez de ajustarse a la
  pantalla.
- **Archivos:** src/views/DayView.css.

## 2026-07-01 — Botón reordenar TODO con estilos del botón agregar
- **Qué:** `.todo__reorder-btn` adopta el mismo estilo que `.todo__add-btn`
  (color primario, fondo `--color-primary-light`, padding `xs sm`, hover
  `--accent-soft`); el estado activo usa `--accent-soft`.
- **Por qué:** unificar la apariencia de ambos botones de la sección TODO.
- **Archivos:** `src/views/DayView.css`.

## 2026-07-01 — Flechas de día con el mismo fondo gris de los números
- **Qué:** las flechas `‹`/`›` dentro de `.day-view__days` pasan de fondo
  transparente a `var(--color-surface)`, igual que las pills de número.
- **Por qué:** unificar el fondo de flechas y números.
- **Archivos:** `src/views/DayView.css`.

## 2026-07-01 — Flechas de día en línea con los números
- **Qué:** las flechas se movieron DENTRO del contenedor `.day-view__days`, así
  fluyen en el mismo wrap que los números: `‹ 1 2 3 …` y `… 31 ›`. Se eliminó
  `.day-view__days-row` y se añadió un tamaño reducido (28px, fondo transparente)
  para `.day-view__nav-btn` dentro de las pills.
- **Por qué:** el usuario quiere `‹` junto al 1 y `›` junto al último día, en el
  mismo flujo de los números.
- **Archivos:** `src/views/DayView.jsx`, `src/views/DayView.css`.

## 2026-07-01 — Flechas de día pegadas a los números
- **Qué:** las flechas de navegación del día ya no quedan separadas: la fila
  (`.day-view__days-row`) usa `justify-content: flex-end` y `.day-view__days`
  pasa a `flex: 0 1 auto`, de modo que `‹` queda junto al primer día y `›` junto
  al último.
- **Por qué:** el usuario quiere las flechas al lado de los números.
- **Archivos:** `src/views/DayView.css`.

## 2026-07-01 — Flechas de día alrededor de los números (iPad/escritorio)
- **Qué:** en la vista del día (escritorio/iPad) las flechas de navegación pasan
  a flanquear los números: flecha anterior · 1 2 3 … · flecha siguiente. Se
  envolvió todo en `.day-view__days-row` y se movió cada flecha a los extremos.
- **Por qué:** ubicación pedida (flecha al principio y al final de los números).
- **Archivos:** `src/views/DayView.jsx`, `src/views/DayView.css`.
- **Notas:** de paso se corrigió el color corrupto `3D3D4D_1` en
  `.day-view__title` (→ `var(--color-text-primary)`). `.day-view__nav--desktop`
  queda sin uso.

## 2026-07-01 — Reordenar TODOs con drag & drop y cierre del modo
- **Qué:** el modo reordenar de TODO ahora usa drag & drop (HTML5 draggable):
  cada tarea muestra un handle de arrastre (`.todo__drag-handle`), se puede
  soltar sobre otra para reubicarla, con feedback visual (`--dragging`,
  `--over`). El botón de reordenar cambia a una "X" cuando está activo para
  cerrar el modo, y al hacer clic fuera de la card de TODO también se cierra.
- **Por qué:** interacción más natural para reordenar y salida clara del modo.
- **Archivos:** `src/views/DayView.jsx`, `src/views/DayView.css`.
- **Notas:** se reemplazaron los botones subir/bajar por drag & drop; cierre por
  clic fuera vía `useRef` + listener `mousedown`/`touchstart`.

## 2026-07-01 — Botón de reordenar TODOs
- **Qué:** en la sección TODO se añadió un botón solo-icono (flechas arriba/
  abajo) antes de "+ Agregar" que activa el modo reordenar. En ese modo cada
  tarea muestra controles de subir/bajar (`.todo__move`) en lugar del checkbox
  y sin edición ni eliminar. Los hábitos no se reordenan.
- **Por qué:** permitir cambiar el orden de las tareas del día.
- **Archivos:** `src/views/DayView.jsx`, `src/views/DayView.css`.
- **Notas:** el botón se deshabilita con menos de 2 tareas; el reorden persiste
  vía `setItems` (usePersistedState).

## 2026-07-01 — Flecha del plan alineada con la del título y con color del plan
- **Qué:** la flecha del plan (`.day-meds__plan-go`) se alinea a la derecha en
  la misma posición que la del título (`margin-right` negativo que compensa el
  padding del pill) y toma el color del plan (`style={{ color: color.color }}`).
- **Por qué:** que ambas flechas queden en la misma posición y la del plan use
  su color identificativo.
- **Archivos:** `src/views/DayView.jsx`, `src/views/DayView.css`.
- **Notas:** el hover pasa a `opacity` porque el color va inline por plan.

## 2026-07-01 — Header del plan de medicamentos no clicable, con flecha al plan
- **Qué:** en la card de Medicamentos de la vista del día, el header con el
  nombre del plan (`.day-meds__plan-name`) deja de ser clicable. Ahora el
  nombre ocupa el espacio (`.day-meds__plan-label` con elipsis) y al final hay
  una flecha (`.day-meds__plan-go`, mismo chevron que el título) que navega al
  plan (`/medications/:id`).
- **Por qué:** evitar que toda la fila sea clicable y dejar la navegación al
  plan en un control explícito, igual que el título de la sección.
- **Archivos:** `src/views/DayView.jsx`, `src/views/DayView.css`.
- **Notas:** se eliminaron `role/tabIndex/onClick/onKeyDown` del contenedor.

## 2026-07-01 — Line-height 0.7rem en labels de comida
- **Qué:** se añadió `line-height: 0.7rem` a `.meal-card__label`
  (Desayuno/Almuerzo/Cena).
- **Por qué:** ajustar el interlineado de los labels al tamaño de fuente.
- **Archivos:** `src/views/DayView.css`.
- **Notas:** valor explícito sin variable equivalente.

## 2026-07-01 — Labels de comida a 0.7rem y TODO expansible con scroll lateral
- **Qué:** los labels "Desayuno/Almuerzo/Cena" (`.meal-card__label`, base y
  override de tablet) pasan a `0.7rem`. La fila de TODO/Recordatorios
  (`.day-view__top-row`) usa `flex: 1 0 auto`: mantiene el alto actual cuando
  hay pocos ítems y crece con la cantidad de TODOs; la columna lateral
  (`.day-view__col--side`, ya con `overflow-y: auto`) hace scroll mientras el
  horario permanece fijo en su propia columna.
- **Por qué:** unificar tamaño de labels y permitir ver muchos TODOs sin que se
  corten, dejando el horario siempre visible.
- **Archivos:** `src/views/DayView.css`.
- **Notas:** de paso se corrigieron colores corruptos en `.todo__text` y
  `.todo__input` (`3D3D4D_1` → `var(--color-text-primary)`).

## 2026-07-01 — Títulos de secciones del día a 0.8rem
- **Qué:** los títulos "Comidas del día", "TODO", "Recordatorios" y
  "Medicamentos" usan el mismo tamaño `0.8rem` (incluye el override de tablet
  para `.meals__title`).
- **Por qué:** unificar visualmente los encabezados de las secciones del día.
- **Archivos:** `src/views/DayView.css`.
- **Notas:** `0.8rem` es un valor explícito pedido; no existe variable de fuente
  con ese valor.

## 2026-07-01 — Mini-cards del día con colores de Comidas y alto fijo
- **Qué:** las mini-cards de las comidas del día recuperan el fondo tintado por
  tipo de comida (`accent.bg`) como en Comidas, y ahora tienen alto fijo
  (`68px` la card, el botón "+" y el mínimo del contenedor) con la foto
  flexible; así no cambian de tamaño al seleccionar una receta.
- **Por qué:** al seleccionar, la card crecía; se pidió alto fijo y los mismos
  colores del recetario.
- **Archivos:** `src/views/DayView.jsx`, `src/views/DayView.css`.
- **Notas:** el borde `1px` por tipo de comida se mantiene.

## 2026-07-01 — Mini-cards del día: solo se añade el borde
- **Qué:** las mini-cards de las comidas del día vuelven a su tamaño y fondo
  original (`--color-surface`, `--radius-sm`, foto 16/9); se conserva únicamente
  el borde `1px` del color del tipo de comida.
- **Por qué:** el ajuste anterior las hacía demasiado grandes; se quería el
  aspecto previo más el borde.
- **Archivos:** `src/views/DayView.jsx`, `src/views/DayView.css`.
- **Notas:** mantienen el alto disponible por el `stretch` del contenedor.

## 2026-06-30 — Cards de comida del día igual que en Comidas
- **Qué:** el borde de las cards de receta volvió a `1px`. Las mini-cards de las
  comidas del día (`.meal-mini`) ahora se ven como en la vista Comidas: fondo
  tintado por tipo de comida (`accent.bg`) y borde `1px` del color del tipo
  (`color-mix` al 35% con blanco), con radios y proporción de foto iguales.
- **Por qué:** consistencia visual entre la vista del día y el recetario.
- **Archivos:** `src/views/Comidas.jsx`, `src/views/DayView.jsx`,
  `src/views/DayView.css`.
- **Notas:** de paso se corrigió un color corrupto en `.meal-mini__title`
  (`3D3D4D_1` → `var(--color-text-primary)`).

## 2026-06-30 — Borde en el acordeón y cuerpo blanco
- **Qué:** se restauró el borde del contenedor del acordeón de Comidas
  (`--color-border`) y el cuerpo del contenido pasó a fondo blanco
  (`--color-bg`).
- **Por qué:** ajuste visual pedido para separar el contenido con marco y fondo
  claro.
- **Archivos:** `src/views/Comidas.css`.
- **Notas:** sin colores nuevos; variables existentes de ambos temas.

## 2026-06-30 — Header del acordeón más oscuro y sin borde inferior
- **Qué:** el header del acordeón de Comidas usa un gris un tris más oscuro
  (`--color-surface-hover`) y se quitó su borde inferior al abrir.
- **Por qué:** ajuste visual pedido para diferenciar header y cuerpo sin línea.
- **Archivos:** `src/views/Comidas.css`.
- **Notas:** sin colores nuevos; variables existentes de ambos temas.

## 2026-06-30 — Acordeón sin borde y con fondo gris claro
- **Qué:** se quitó el borde del contenedor del acordeón de Comidas y su fondo
  pasó a gris claro (`--color-surface`).
- **Por qué:** aspecto más limpio, apoyándose solo en el fondo para delimitar.
- **Archivos:** `src/views/Comidas.css`.
- **Notas:** sin colores nuevos; variables existentes de ambos temas.

## 2026-06-30 — Borde de 2px por tipo de comida en las cards
- **Qué:** cada card de receta lleva un `border: 2px solid` del color de su tipo
  de comida (`accent.color`), aplicado por estilo inline en `RecipeCard`.
- **Por qué:** distinguir visualmente las recetas por tipo de comida.
- **Archivos:** `src/views/Comidas.jsx`.
- **Notas:** el color proviene de `TAG_COLORS[tag].color` (variables de tema).
  Ajustado después a `2px` y color un poco más claro con `color-mix` (80%).

## 2026-06-30 — Cabecera del acordeón en gris claro
- **Qué:** la cabecera del acordeón de Comidas ahora tiene fondo gris claro
  (`--color-surface`); el contador pasó a fondo blanco (`--color-bg`) para
  seguir contrastando.
- **Por qué:** distinguir mejor la cabecera del cuerpo blanco del acordeón.
- **Archivos:** `src/views/Comidas.css`.
- **Notas:** sin colores nuevos; variables existentes de ambos temas.

## 2026-06-30 — Divisor en acordeón, cards más oscuras y pill de filtro en gris
- **Qué:**
  - El acordeón abierto muestra un borde inferior bajo el título
    (`.comidas__section--open .comidas__section-header`).
  - Las cards de recetas usan `--color-surface-hover` (un poco más oscuras que
    `--color-surface`).
  - La pill de filtro seleccionada mantiene el texto en gris
    (`--color-text-secondary`); solo cambian el borde y el fondo.
- **Por qué:** ajustes visuales pedidos para separar título/contenido, dar más
  contraste a las cards y suavizar la pill activa.
- **Archivos:** `src/views/Comidas.css`.
- **Notas:** la regla del texto gris está acotada a `.comidas__filters` para no
  afectar otras `.cat-pill` de la app.

## 2026-06-30 — Acordeones blancos con borde y naranja de Desayuno más opaco
- **Qué:**
  - Desayuno usa un naranja más apagado: nueva variable `--meal-orange`
    (definida en ambos temas) en lugar de `--color-accent-orange`.
  - Se quitó el borde de las cards de recetas (siguen sobre `--color-surface`,
    distinguibles del fondo blanco del acordeón).
  - Los acordeones tienen fondo blanco (`--color-bg`) y un borde
    (`1px solid var(--color-border)`); se eliminó el fondo tintado de la
    cabecera. El contador de la cabecera pasó a `--color-surface` para seguir
    visible sobre blanco.
- **Por qué:** suavizar el naranja demasiado vibrante y dar a los acordeones un
  aspecto más limpio (blanco + borde) en vez de las cards con borde.
- **Archivos:** `src/views/Comidas.jsx`, `src/views/Comidas.css`,
  `src/components/RecipeModal.jsx`, `src/assets/styles/variables.css`,
  `src/assets/styles/themes.css`.
- **Notas:** `--meal-orange` se añadió a `:root` (default) y a
  `[data-theme="masculino"]` para respetar ambos temas.

## 2026-06-30 — Ajustes visuales de pills y cards en Comidas
- **Qué:**
  - La pill "Todas" seleccionada usaba `--color-primary-soft` como fondo (muy
    oscuro); ahora usa `--color-primary-light`, coherente con las demás pills.
  - Las cards de recetas llevan `border: 1px solid var(--color-border)` para
    distinguirse del fondo y son un poco más grandes (columnas
    `minmax(140px, 1fr)`, más gap, título en `--font-size-sm` y padding mayor).
  - La pill de Desayuno se mantiene con el naranja del proyecto
    (`--color-accent-orange`).
- **Por qué:** mejorar la legibilidad de la pill activa y la separación visual de
  las tarjetas de recetas.
- **Archivos:** `src/views/Comidas.jsx`, `src/views/Comidas.css`.
- **Notas:** sin colores nuevos; solo variables existentes de ambos temas.

## 2026-06-30 — Navegación en card de Medicamentos y rediseño de Comidas
- **Qué:**
  - En la vista del día, la card de Medicamentos ahora tiene una flecha `>` en la
    cabecera que lleva a `/medications`, y al hacer clic sobre el nombre de un
    plan se navega a su detalle (`/medications/:id`). Se añadió `useNavigate` en
    `DayMedications` y estilos `.day-meds__header/__go` + `.day-meds__plan-name`
    clicable.
  - En Comidas se añadió una barra de búsqueda (por nombre de receta) y pills de
    filtro por tipo de comida (Todas/Desayuno/Almuerzo/Cena/Postre) reutilizando
    `.search-bar` y `.cat-pill`.
  - Cada tipo de comida es ahora un acordeón cerrado por defecto; al buscar o
    filtrar se abren todos automáticamente. Se quitó la flecha de "ver más": al
    abrir un acordeón se muestran siempre todas las recetas de ese tipo.
  - Se corrigieron los colores de las pills/acentos de Desayuno, Almuerzo y Cena
    en `TAG_COLORS`: tenían valores corruptos (`C87F1E_1`, etc.) que no eran CSS
    válido y se veían sin color. Ahora usan variables del tema
    (naranja/verde/azul) igual que Postre (rosa).
- **Por qué:** dar accesos directos desde el día a Medicamentos, mejorar el
  hallazgo de recetas con búsqueda/filtros y acordeones, y restaurar el color
  perdido de las pills tras la edición previa.
- **Archivos:** `src/views/DayView.jsx`, `src/views/DayView.css`,
  `src/views/Comidas.jsx`, `src/views/Comidas.css`,
  `src/components/RecipeModal.jsx`.
- **Notas:** los colores de meal-type ya existían como variables en ambos temas
  (`--color-accent-orange/green`, `--accent-blue`, `--cat-pink`), no hizo falta
  añadir nuevas. Se eliminó el hook `useGridColumns` y la lógica de "ver más"
  (ya no se recorta la cuadrícula). Lint: solo persisten errores previos
  aceptados de `react/prop-types`.

## 2026-06-30 — La barra de scroll interno queda a la izquierda del menú
- **Qué:** el modificador `.page--scroll` ahora reserva el hueco del menú
  lateral con `margin-right: var(--app-pad-right)` (fuera del área scrolleable) y
  usa `padding-right: var(--page-padding)` normal. Antes el `padding-right` que
  despejaba el menú estaba dentro del contenedor scrolleable, así que la barra se
  dibujaba en el borde derecho, debajo del menú. En Comidas se ajustó
  `.comidas-page` (padding-right normal) para que el hueco lo aporte
  `page--scroll`.
- **Por qué:** aunque el scroll ya era interno, la barra seguía apareciendo en la
  misma posición (a la derecha, bajo el menú). Ahora queda claramente a la
  izquierda del menú lateral.
- **Archivos:** `src/assets/styles/layout.css`, `src/views/Comidas.css`.
- **Notas:** solo aplica en `min-width: 768px`; en móvil no hay margin-right
  (menú inferior). `--app-pad-right` = 3rem despeja el menú.

## 2026-06-30 — Scroll interno también en detalle/nuevo plan, meta y comidas
- **Qué:**
  - Se aplicó el modificador `.page--scroll` a las vistas de Nuevo/Editar plan
    (`CreateTreatmentPlan`), Detalle del plan (`TreatmentPlanDetails`) y Detalle
    de meta (`GoalView`), para que tengan scroll interno en tablet/escritorio en
    lugar del scroll global de `#root`.
  - La vista de Comidas se convirtió a página de scroll normal (`page--scroll`):
    se quitó el diseño de altura fija con secciones que se recortaban
    (`height: 100dvh; overflow: hidden`, `flex: 1`, `overflow: hidden` en
    `.comidas__sections`, `.comidas__section` y `.recipe-grid`). Ahora las
    secciones fluyen y la página entera hace scroll interno igual que el resto.
- **Por qué:** el usuario veía el scroll global (a la derecha del menú lateral)
  en esas vistas y pidió el mismo scroll interno en todas.
- **Archivos:** `src/views/CreateTreatmentPlan.jsx`,
  `src/views/TreatmentPlanDetails.jsx`, `src/views/GoalView.jsx`,
  `src/views/Comidas.jsx`, `src/views/Comidas.css`.
- **Notas:** el scroll interno solo aplica en `min-width: 768px`; en móvil se
  conserva el scroll y la barra inferior fija. Las reglas antiguas
  `.comidas-page--scroll` y los fallbacks por altura quedan como no-ops
  inofensivos.

## 2026-06-30 — Scroll interno en vistas, buscador y breadcrumbs de medicamentos
- **Qué:**
  - Nuevo modificador `.page--scroll` (solo en tablet/escritorio, `min-width:
    768px`) que hace que la página tenga scroll interno (`height: 100dvh; overflow-y:
    auto`) en lugar de usar el scroll global del contenedor `#root`. Aplicado a
    las vistas de Medicamentos y Metas. Así la barra de scroll queda dentro del
    contenido, a la izquierda del menú lateral.
  - El buscador de la vista de Medicamentos ahora muestra solo "Buscar".
  - Los breadcrumbs de "Nuevo/Editar plan" y del detalle del plan dicen
    "Medicamentos" (antes "Medicación").
- **Por qué:** el scroll global aparecía a la derecha del menú lateral en
  iPad/escritorio; se pidió scroll interno y ajustes de textos.
- **Archivos:** `src/assets/styles/layout.css`, `src/views/MedicationHome.jsx`,
  `src/views/Metas.jsx`, `src/views/TreatmentPlanDetails.jsx`,
  `src/views/CreateTreatmentPlan.jsx`.
- **Notas:** el cambio de scroll solo aplica en el breakpoint de escritorio; en
  móvil se conserva el scroll global y la barra inferior fija. La vista de
  Comidas ya usaba scroll interno propio (`.comidas-page` a `100dvh`), así que
  no requirió cambios.

## 2026-06-30 — Fechas sin fin, tope de fin del plan y ajustes de "Medicamentos"
- **Qué:**
  - El plan y cada medicamento pueden tener fecha de fin vacía ("Sin fin" =
    no se termina). Se añadió el chip "Sin fin" en la duración rápida y el campo
    de fecha de fin ya no es obligatorio.
  - La fecha de fin de un medicamento no puede superar la fecha de fin del plan;
    los chips de duración rápida se recortan al fin del plan (`clampEnd`) y hay
    validación con mensaje de error.
  - En la vista de medicamentos: el título ahora es "Medicamentos", el progreso
    de la card usa el mismo cálculo por dosis que el detalle
    (`planDoseProgress`) y todas las fechas usan el formato "02 Jun 2026".
- **Por qué:** Petición del usuario.
- **Archivos:** `src/utils/medications.js`, `src/views/MedicationHome.jsx`,
  `src/components/MedicationCards.jsx`, `src/components/MedicationModals.jsx`,
  `src/views/CreateTreatmentPlan.jsx`, `src/views/TreatmentPlanDetails.jsx`.
- **Notas:** `formatDateLabel` ahora capitaliza el mes y rellena el día con cero.
  `MedicationModal` acepta `planEnd`; `TreatmentPlanCard` acepta `history`. Las
  fechas vacías se muestran como "Sin fin" en cards y detalle.

## 2026-06-30 — Dosis siguiente por medicamento y fecha de inicio válida
- **Qué:** La sugerencia de la siguiente dosis ahora parte de la fecha de inicio
  del medicamento (si no hay ninguna dosis registrada) o de la última dosis
  marcada para calcular la siguiente franja pendiente. Además, al agregar o
  editar un medicamento, su fecha de inicio no puede ser anterior a la fecha de
  inicio del plan (se aplica `min`, validación y mensaje de error).
- **Por qué:** Petición del usuario para que el cálculo de dosis y las fechas
  respeten el rango de cada medicamento y del plan.
- **Archivos:** `src/views/TreatmentPlanDetails.jsx`,
  `src/components/MedicationModals.jsx`.
- **Notas:** `nextDose` se reescribió para usar `med.startDate`/`med.endDate` y
  la última dosis registrada. `MedicationModal` acepta `planStart` y lo recibe
  desde `TreatmentPlanDetails` (`plan.startDate`).

## 2026-06-30 — Registrar dosis: fecha y hora acotadas al medicamento
- **Qué:** Al registrar una dosis, la fecha solo permite elegir dentro del rango
  del medicamento (de su fecha de inicio a su fecha de fin) y la hora pasa a ser
  un dropdown con las horas de dosis calculadas (ej.: cada 4 h desde las 8:00 →
  8:00am, 12:00pm, 4:00pm…). Si una dosis del histórico tiene una hora fuera de
  esas opciones, se añade para no perderla.
- **Por qué:** Evitar registrar dosis en fechas/horas que no corresponden.
- **Archivos:** `src/components/MedicationModals.jsx`,
  `src/components/DateField.jsx`.
- **Notas:** `DateField` ahora acepta `max`. La hora usa `computeDoseTimes(med)`
  con etiqueta 12 h vía `formatHour12`. `min`/`max` toman `med.startDate` /
  `med.endDate`.

## 2026-06-30 — Ajustes a dosis: pill rojo, sin label y conteo inclusivo
- **Qué:** (1) Se quitó el texto "Tratamiento completado" de la tarjeta. (2) La
  pill "Terminado" ahora es roja. (3) El total de dosis cuenta el rango de
  fechas de forma inclusiva: del 29 al 30 son 2 días, así que cada 24 h = 2
  dosis (antes contaba 1).
- **Por qué:** Petición del usuario.
- **Archivos:** `src/components/MedicationCards.jsx`,
  `src/components/MedicationCards.css`, `src/utils/medications.js`.
- **Notas:** `medTotalDoses` usa `daysBetween(start, end) + 1`.
  `.medication-card__status--completed` pasó a `--color-accent-red` /
  `--color-accent-red-light`. Cuando el medicamento está terminado ya no se
  muestra "Próximo".

## 2026-06-30 — Medicamento se termina al completar todas sus dosis
- **Qué:** Se calcula el total de dosis previstas de cada medicamento según su
  rango de fechas y frecuencia (ej.: 7 días cada 24 h = 7 dosis). Cuando se han
  marcado como tomadas todas esas dosis, el medicamento pasa a "Terminado" y se
  oculta el botón "Marcar dosis". La tarjeta muestra "X de N dosis" y, al
  terminar, "Tratamiento completado".
- **Por qué:** El medicamento debe finalizar al cumplir su número de tomas, no
  solo por fecha.
- **Archivos:** `src/utils/medications.js`, `src/components/MedicationCards.jsx`.
- **Notas:** Nueva función `medTotalDoses(med)` (perDay × días activos, dividido
  entre 7 si la frecuencia es semanal). `medStatus` ahora recibe `history` y
  devuelve "completed" si dosis tomadas ≥ total. Caller actualizado a
  `medStatus(med, plan, history)`.

## 2026-06-30 — Medicamento con fecha inicio/fin propia y pill "Terminado"
- **Qué:** El modal de medicación ahora permite elegir fecha de inicio, fecha de
  fin y duración rápida (7/10/14/21/30 días o personalizada), igual que el plan.
  Si la fecha de fin del medicamento ya pasó, su pill muestra "Terminado" en vez
  de "Activo".
- **Por qué:** Cada medicamento puede tener una duración distinta a la del plan.
- **Archivos:** `src/components/MedicationModals.jsx`,
  `src/components/MedicationCards.css`, `src/utils/medications.js`.
- **Notas:** `medStatus` ahora marca "completed" si `med.endDate` < hoy.
  `MED_STATUS.completed.label` pasó de "Completado" a "Terminado". Nuevos
  estilos `.med-durations`/`.med-duration` (reflejo de los del plan) y
  `.med-preview--error`. Se guardan `startDate`/`endDate` en cada medicamento.

## 2026-06-30 — "Última toma": hora sin formatear
- **Qué:** `formatDateTimeLabel` ahora recorta la hora a `HH:MM`. Antes, si el
  `completedTime` venía con segundos/zona (ISO completo), mostraba algo como
  `14:30:00.000Z` en "Última toma".
- **Por qué:** La hora de la última toma se veía sin formato.
- **Archivos:** `src/utils/medications.js`.
- **Notas:** `time.slice(0, 5)` cubre tanto `"HH:MM"` como ISO completos.

## 2026-06-30 — Marcar dosis por fecha y hora + scroll innecesario en escritorio
- **Qué:** (1) Ahora una dosis se considera futura comparando fecha **y** hora
  contra el momento actual (antes solo la fecha). Si fecha+hora son futuras se
  deshabilita "Tomada" y "Guardar". Cambiar la hora también recalcula el estado.
  (2) Se eliminó el scroll innecesario en escritorio: el `padding-bottom` que
  reservaba espacio para la barra inferior solo se aplica en móvil; en
  escritorio el menú es lateral y no necesita ese hueco.
- **Por qué:** El usuario podía marcar dosis cuya hora aún no llegaba, y en
  escritorio aparecía scroll aunque el contenido cupiera en pantalla.
- **Archivos:** `src/components/MedicationModals.jsx`,
  `src/assets/styles/layout.css`.
- **Notas:** `nowStr` = fecha+hora local actual; `isFutureDT(date, time)`;
  nuevos `setTime`/`setDate` recalculan estado. El reservado de `--nav-height`
  ahora va dentro de `@media (max-width: 767px)`.

## 2026-06-30 — Dosis futura: botón Guardar deshabilitado
- **Qué:** Si la fecha de la dosis es futura, además de no poder marcarla como
  tomada, ahora el botón "Guardar" queda deshabilitado: no se puede registrar
  nada para una dosis futura. El aviso cambia a "Aún no puedes registrar una
  dosis futura."
- **Por qué:** No debe permitirse agregar/registrar dosis con fecha futura.
- **Archivos:** `src/components/MedicationModals.jsx`.
- **Notas:** Se reutiliza el estilo existente `.modal__btn:disabled`.

## 2026-06-30 — Dosis futura no se puede marcar como tomada
- **Qué:** En el modal de dosis, si la fecha es posterior a hoy se deshabilita
  el botón "Tomada" (solo se permite "No tomada") y se muestra un aviso. Al
  cambiar la fecha a una futura, el estado pasa automáticamente a "No tomada".
  Solo se pueden marcar como tomadas las dosis de hoy o anteriores.
- **Por qué:** No tiene sentido marcar como tomada una dosis que aún no ocurre.
- **Archivos:** `src/components/MedicationModals.jsx`,
  `src/views/TreatmentPlanDetails.css`.
- **Notas:** `isFuture = form.date > todayISO()`. `save()` fuerza estado
  "Skipped" si la fecha es futura. Nuevos estilos `.dose-status__btn:disabled`
  y `.dose-status__hint`.

## 2026-06-30 — Marcar dosis: sugiere dosis vencidas y evita duplicados
- **Qué:**
  - "Marcar dosis" ahora sugiere la primera dosis **pendiente**, incluidas las
    ya vencidas desde el inicio del plan. Si el plan empezó hace días, se pueden
    marcar las dosis pasadas una a una (cada vez sugiere la siguiente sin
    marcar).
  - No se duplican dosis: si ya existe una toma a esa misma fecha y hora, al
    guardar se actualiza esa franja en vez de crear otra.
- **Por qué:** Antes, si la hora actual superaba la de la próxima dosis, saltaba
  a mañana y no dejaba marcar lo vencido; y podían quedar tomas duplicadas.
- **Archivos:** `src/views/TreatmentPlanDetails.jsx`.
- **Notas:** `nextDose(med, plan, history)` recorre las franjas desde
  `startDate` hasta hoy (o `endDate` si terminó), salta las ya registradas y
  devuelve la primera vencida sin marcar; si no hay vencidas, la próxima futura.
  `recordDose` deduplica por `scheduledTime` cuando la entrada es nueva.

## 2026-06-30 — Marcar dosis: sugiere fecha y hora de la próxima dosis
- **Qué:** Al pulsar "Marcar dosis" el modal se abre con la fecha y la hora de
  la próxima dosis del medicamento (hoy si aún queda alguna, si no mañana a la
  primera hora) en vez de la hora actual.
- **Por qué:** La sugerencia debe corresponder a la próxima dosis.
- **Archivos:** `src/views/TreatmentPlanDetails.jsx`,
  `src/components/MedicationModals.jsx`.
- **Notas:** Nuevo helper `nextDose(med)` en la vista (usa `computeDoseTimes`,
  `todayISO`, `addDaysISO`). `DoseEntryModal` ahora acepta `defaultDate` además
  de `defaultTime`.

## 2026-06-30 — Dosis: completedTime = fecha de la dosis y progreso por dosis
- **Qué:**
  - Al marcar una dosis como Tomada, su `completedTime` ahora es la fecha/hora
    de la propia dosis (no la del momento en que se marca). Así "Última toma"
    refleja la dosis marcada.
  - La barra de progreso de la card del plan pasa a basarse en dosis: dosis
    tomadas / dosis esperadas en todo el plan (`planDoseProgress`). Ahora la
    barra avanza al marcar dosis.
- **Por qué:** "Última toma" mostraba la hora actual y la barra (basada en
  tiempo transcurrido) no se movía al marcar dosis.
- **Archivos:** `src/components/MedicationModals.jsx`,
  `src/utils/medications.js`, `src/views/TreatmentPlanDetails.jsx`.
- **Notas:** Nuevo helper `planDoseProgress(plan, meds, history)`: esperadas =
  Σ (dosis/día × días del plan), con semanales contadas como días/7; tomadas =
  entradas con status "Taken". `planProgress` (por tiempo) sigue usándose en
  MedicationHome (orden) y en las cards de medicamento. Se eliminó el helper
  `nowISO` no usado de MedicationModals.

## 2026-06-30 — Card del plan: progreso reordenado y barra visible
- **Qué:**
  - El bloque de progreso ahora muestra "{n}% completado" arriba, la barra
    debajo y, en una tercera línea, las fechas y los días restantes.
  - La barra de progreso marca el avance aunque el porcentaje sea pequeño
    (se añade `minWidth` al relleno cuando el valor es > 0) y se sanea el valor.
- **Por qué:** El porcentaje estaba en la misma fila que las fechas y la barra
  no se veía marcada con el completado.
- **Archivos:** `src/views/TreatmentPlanDetails.jsx`,
  `src/views/TreatmentPlanDetails.css`, `src/components/MedicationCards.jsx`.
- **Notas:** Nueva clase `.plan-details__progress-label`. `ProgressBar` ahora
  recorta el valor a 0–100 y aplica `minWidth: 6px` si hay avance.

## 2026-06-30 — Modal de dosis: "Eliminar dosis" como label bajo las fechas
- **Qué:** El botón de eliminar dosis sale del bloque de acciones y pasa a ser
  un label en rojo (`.dose-delete-link`) justo debajo de la fila de fecha/hora.
- **Por qué:** Petición de mover el eliminar bajo las fechas.
- **Archivos:** `src/components/MedicationModals.jsx`,
  `src/views/TreatmentPlanDetails.css`.
- **Notas:** Se reemplazó la clase `.dose-status__delete` por
  `.dose-delete-link` (texto en `--color-accent-red`, sin fondo).

## 2026-06-30 — Histórico: pill Tomado/No tomado más ajustada
- **Qué:** La pill de estado en el histórico pasa de muy ovalada
  (`--radius-full`) a esquinas suaves (`--radius-sm`) y padding horizontal más
  compacto (`--space-xs`).
- **Por qué:** Se veía demasiado ovalada/grande.
- **Archivos:** `src/views/TreatmentPlanDetails.css`.

## 2026-06-30 — Detalle del plan: histórico, marcar dosis y ajustes
- **Qué:**
  - La card de cabecera ahora queda más separada del breadcrumb.
  - El icono y el nombre del plan se alinean verticalmente al centro.
  - Duplicar medicamento abre un modal de confirmación (`ConfirmDialog`).
  - Nueva sección **Histórico** bajo "Próximas dosis": tomas agrupadas por
    fecha (descendente), cada una con hora, medicamento y una pill
    "Tomado"/"No tomado".
  - "Próximas dosis" ahora se ordenan por la dosis que toca primero.
  - El modal de marcar dosis se rehízo (`DoseEntryModal`): permite elegir
    estado (Tomada/No tomada), fecha y hora (por defecto la de la toma), y
    registrar tantas dosis como se quiera.
  - Desde el histórico se puede tocar una toma para editar su fecha/hora/estado
    o eliminarla.
- **Por qué:** Mejorar la gestión y trazabilidad de las tomas y pulir la vista.
- **Archivos:** `src/views/TreatmentPlanDetails.jsx`,
  `src/views/TreatmentPlanDetails.css`, `src/components/MedicationModals.jsx`.
- **Notas:** El histórico agrupa por la parte fecha de `scheduledTime` (ISO
  `YYYY-MM-DDTHH:MM`); tomas legacy sin fecha caen en "Sin fecha". Pills y
  toggles usan variables temáticas (`--color-accent-green/red` + `*-light`).
  `historyByDate` se calcula sin `useMemo` por estar tras el early-return del
  plan (regla de hooks). Se reemplazó `MarkDoseModal` por `DoseEntryModal` en
  la vista (el componente antiguo se conserva pero ya no se usa aquí).

## 2026-06-30 — Nuevo plan: flecha de back centrada al título y breadcrumb
- **Qué:** Se reestructuró el header en un `.create-plan__topbar` (flecha +
  columna `.create-plan__heading` con título y breadcrumb), de modo que la
  flecha de back queda centrada verticalmente respecto al bloque título +
  breadcrumb.
- **Por qué:** Antes la flecha solo se centraba con el título.
- **Archivos:** `src/views/CreateTreatmentPlan.jsx`, `src/views/CreateTreatmentPlan.css`.
- **Notas:** Se eliminaron las clases `.create-plan__header` (ya no usada) y los
  márgenes manuales del breadcrumb; ahora el breadcrumb va dentro de la columna.

## 2026-06-30 — Nuevo plan: borde morado en pill de duración activa
- **Qué:** La pill de "Duración rápida" seleccionada ahora tiene borde
  `--color-primary` (morado) en vez de mimetizarse con el fondo.
- **Por qué:** Ajuste solicitado para resaltar la selección.
- **Archivos:** `src/views/CreateTreatmentPlan.css`.

## 2026-06-30 — Nuevo plan: borde sutil en pills de duración
- **Qué:** Las pills de "Duración rápida" ahora tienen un borde sutil
  (`1px solid var(--color-border)`) cuando no están seleccionadas, como los
  iconos. En estado activo el borde toma `--color-primary-light` para integrarse
  con el fondo.
- **Por qué:** Ajuste solicitado para dar definición a las pills sin seleccionar.
- **Archivos:** `src/views/CreateTreatmentPlan.css`.

## 2026-06-30 — Nuevo plan: breadcrumb aún más cerca del título
- **Qué:** Se añadió `margin-top` negativo (`-var(--space-xs)`) al breadcrumb
  para pegarlo más al título.
- **Por qué:** Ajuste solicitado para acercarlo aún más.
- **Archivos:** `src/views/CreateTreatmentPlan.css`.

## 2026-06-30 — Nuevo plan: breadcrumb más cerca del título
- **Qué:** Se redujo el espacio entre el título y el breadcrumb
  (`margin-bottom: 0` en `.create-plan__header`).
- **Por qué:** Ajuste solicitado para acercar el breadcrumb al título.
- **Archivos:** `src/views/CreateTreatmentPlan.css`.
- **Notas:** El breadcrumb conserva su `margin-top: 2px` propio del componente.

## 2026-06-30 — Nuevo plan: breadcrumb alineado bajo el título
- **Qué:** El breadcrumb se indentó para quedar alineado debajo del título y no
  debajo de la flecha de back.
- **Por qué:** Ajuste solicitado de alineación.
- **Archivos:** `src/views/CreateTreatmentPlan.css`.
- **Notas:** `margin-left: calc(40px + var(--space-sm))` (ancho de la flecha +
  gap del header).

## 2026-06-30 — Nuevo plan: breadcrumb debajo del título
- **Qué:** En la vista de crear/editar plan de tratamiento el breadcrumb ahora
  va debajo del título (antes estaba arriba del header).
- **Por qué:** Se pidió mover el breadcrumb bajo el título.
- **Archivos:** `src/views/CreateTreatmentPlan.jsx`, `src/views/CreateTreatmentPlan.css`.
- **Notas:** Se ajustó el espaciado: `.create-plan__header` con `margin-bottom`
  reducido (`--space-xs`) y `.create-plan .breadcrumbs` con `margin-bottom`
  `--space-lg` para separar del primer bloque.

## 2026-06-30 — Nuevo plan: flecha de back, título y pills de duración
- **Qué:** En la vista de crear/editar plan de tratamiento se ajustó el tamaño
  del título (`--font-size-xl`), se añadió una flecha de back en el header
  (mismo estilo que `year-view__back`/`day-view__back`) y las pills de
  "Duración rápida" ahora usan el estilo de pills del proyecto (sin borde/óvalo).
- **Por qué:** El título era más grande que en otras vistas, faltaba la flecha
  de volver consistente y las pills no coincidían con las del resto de la app.
- **Archivos:** `src/views/CreateTreatmentPlan.jsx`, `src/views/CreateTreatmentPlan.css`.
- **Notas:** La flecha navega a `/medications`; se conservan los Breadcrumbs.
  Clases nuevas `.create-plan__header`, `.create-plan__back`, `.create-plan__title`.
  Las pills pasan de `radius-full` con borde a `radius-md` transparente con
  estado activo en `--color-primary-light` (como `.metas__filter`).

## 2026-06-30 — Botón "Nuevo plan" igual al de "Agregar meta"
- **Qué:** El botón "+ Nuevo plan" del header de Gestión de medicación ahora
  coincide visualmente con el botón "+ Agregar meta" de Metas.
- **Por qué:** El compartido `.med-action--text` usaba menos padding vertical y
  se veía distinto.
- **Archivos:** `src/views/MedicationHome.jsx`, `src/views/MedicationHome.css`.
- **Notas:** Nueva clase `.medication-home__add-btn` (réplica de
  `.metas__add-btn`, padding `var(--space-sm) var(--space-md)`); no se tocó el
  compartido `.med-action--text` para no afectar otras vistas/cards.

## 2026-06-30 — Gestión de medicación: pills, grid, duplicar y márgenes
- **Qué:** En la vista de Gestión de medicación: (1) las pills de filtro
  (Todas/Activos/…) dejan de verse ovaladas y usan el mismo estilo que el resto
  de la app (radio `--radius-md`, sin borde); (2) las cards de planes ocupan al
  menos 1/3 del ancho (máx. 3 por fila); (3) al duplicar un plan se muestra un
  modal de confirmación; (4) título, botón y márgenes igualados a vistas como
  Metas/Comidas.
- **Por qué:** Consistencia visual con el resto de la app y evitar duplicados
  accidentales.
- **Archivos:** `src/views/MedicationHome.jsx`, `src/views/MedicationHome.css`.
- **Notas:** `.medication-home__filter` ahora replica `.metas__filter`
  (hover `--color-surface-hover`, activo `--color-primary` + `--color-primary-light`).
  Grid `minmax(max(240px, (100% - 2*gap)/3), 1fr)`. Nuevo estado `duplicating`
  + `ConfirmDialog` (confirmLabel "Duplicar"). `.medication-home` con
  `padding-top: --space-lg` / `padding-bottom: --space-2xl` (+ extra en móvil) y
  título a `--font-size-xl`, igual que `.metas-page`/`.metas__title`.

## 2026-06-30 — Nombre del plan de medicamentos con fondo de color claro
- **Qué:** El nombre de cada plan de medicamentos se muestra dentro de un
  recuadro que ocupa todo el ancho disponible, con el color del plan en su
  versión clara (`bg`) de fondo.
- **Por qué:** Identificar visualmente cada plan por su color.
- **Archivos:** `src/views/DayView.jsx`, `src/views/DayView.css`.
- **Notas:** Se usa `color.bg` de `colorById` (variantes `--*-bg`/`--*-light`,
  definidas en ambos temas). `.day-meds__plan-name` ahora con `padding`,
  `border-radius: var(--radius-sm)` y a ancho completo (es un bloque flex).

## 2026-06-30 — Medicamentos: más separación y hora tachada al completar
- **Qué:** Las filas de dosis de medicamentos tienen más separación vertical
  entre sí, y al marcar una dosis como tomada se tacha todo (incluida la hora,
  no solo el nombre).
- **Por qué:** Mejor legibilidad y feedback visual completo del estado tomado.
- **Archivos:** `src/views/DayView.jsx`, `src/views/DayView.css`.
- **Notas:** `.day-meds__list` gap `2px` → `var(--space-sm)`. Nuevo
  `.day-meds__time--done` (line-through + `--color-text-muted`) aplicado vía
  clase condicional `taken` en el `<span>` de la hora.

## 2026-06-30 — Labels de comida arriba de las cards y ajuste de ancho
- **Qué:** En iPad/escritorio, las etiquetas Desayuno/Almuerzo/Cena vuelven a
  mostrarse, ahora como encabezado ARRIBA de cada grupo de cards (en columna)
  en vez de a la izquierda u ocultas. Además se ajustó el ancho de las columnas
  Todo y Comidas de `1.6` a `1.5` (siguen iguales entre sí).
- **Por qué:** Mejor lectura de cada sección de comidas y proporción solicitada.
- **Archivos:** `src/views/DayView.css`.
- **Notas:** En el bloque `@media (min-width: 768px)`, `.day-view__meals-row
  .meal-card` pasa a `flex-direction: column` y el label a ancho automático.
  `flex: 1.5` en `.day-view__top-row > *:first-child` y `.day-view__meals-row
  .meals`. Móvil sin cambios.

## 2026-06-30 — Medicamentos tomados permanecen visibles
- **Qué:** Las dosis ya marcadas como tomadas dejan de ocultarse: ahora se
  muestran siempre con el check marcado y el nombre tachado/atenuado. La card
  de Medicamentos sigue apareciendo solo si hay medicamentos ese día, pero ya
  no desaparece al completar todas las dosis.
- **Por qué:** Permitir ver el estado del día completo (qué se tomó y qué falta)
  y poder desmarcar una dosis.
- **Archivos:** `src/views/DayView.jsx`, `src/views/DayView.css`.
- **Notas:** Render pasa de `visiblePlans` (filtraba tomadas) a `activePlans`;
  guard de visibilidad ahora `activePlans.length === 0`. Nuevos modificadores
  `.day-meds__check--on` (relleno `--todo-check`) y `.day-meds__name--done`
  (line-through + `--color-text-muted`). `toggleDose` ya permitía alternar.

## 2026-06-30 — Alineación de columnas y comidas al fondo (escritorio)
- **Qué:** En escritorio/iPad, Recordatorios pasa a tener el mismo ancho que
  Medicamentos y Tareas (Todo) el mismo ancho que Comidas; la fila de Todo +
  Recordatorios toma el resto del espacio vertical disponible y empuja la fila
  de Comidas + Medicamentos al fondo de la vista.
- **Por qué:** Que las columnas izquierda/derecha queden alineadas verticalmente
  y las comidas/medicamentos anclados abajo, igualando su disposición.
- **Archivos:** `src/views/DayView.css`.
- **Notas:** `.day-view__top-row` usa `flex: 1` y proporciones `1.6` / `1`
  (primer/último hijo) iguales a `.day-view__meals-row`; esta última recibe
  `margin-top: auto`. Solo aplica al layout de escritorio/iPad.

## 2026-06-30 — Todo y Recordatorios en una misma fila
- **Qué:** En escritorio/iPad, las cards de Tareas (Todo) y Recordatorios se
  muestran lado a lado en una misma fila (antes apiladas).
- **Por qué:** Mejor aprovechamiento del ancho de la columna derecha.
- **Archivos:** `src/views/DayView.jsx`, `src/views/DayView.css`.
- **Notas:** Nuevo wrapper `.day-view__top-row` (flex, ambos al 50%, mismo alto
  con `align-items: stretch`). Solo aplica al layout de escritorio/iPad; en móvil
  siguen apilados.

## 2026-06-30 — Schedule más estrecho en escritorio/iPad
- **Qué:** La columna del Horario se hizo un poco más pequeña: el grid pasó de
  `0.82fr 1fr` a `0.68fr 1fr` (más ancho para la columna derecha).
- **Por qué:** Ajuste de ancho pedido.
- **Archivos:** `src/views/DayView.css`.
- **Notas:** Solo CSS; `.day-view__columns` solo se renderiza en escritorio/iPad.

## 2026-06-30 — Comidas a 4 columnas cuando no hay medicamentos
- **Qué:** Cuando no hay card de medicamentos y Comidas queda sola a todo el
  ancho de la fila, las mini-cards de comida se reparten en 4 columnas (más
  pequeñas), aunque el máximo de cards por comida sigue siendo 3 (el 4º hueco
  queda libre).
- **Por qué:** Que las cards no se vean demasiado grandes cuando Comidas ocupa
  todo el ancho.
- **Archivos:** `src/views/DayView.css`.
- **Notas:** Se detecta vía `.day-view__meals-row .meals:only-child` (Comidas es
  el único hijo de la fila cuando `DayMedications` devuelve `null`). Solo aplica
  en escritorio/iPad; en móvil no hay `meals-row`. El alto de las cards lo define
  el `aspect-ratio 16/9` de la foto, así que escala con el ancho.

## 2026-06-30 — Card de medicamentos solo si hay dosis ese día
- **Qué:** El recuadro "Medicamentos" solo se renderiza si hay dosis pendientes
  que administrar ese día; si no hay, no aparece (antes mostraba el mensaje "Sin
  medicamentos para este día").
- **Por qué:** Evitar mostrar una card vacía cuando no hay nada que tomar.
- **Archivos:** `src/views/DayView.jsx`, `src/views/DayView.css`.
- **Notas:** `DayMedications` hace `return null` cuando `visiblePlans.length === 0`.
  En escritorio/iPad, Comidas ocupa todo el ancho de la fila al desaparecer el
  recuadro. Se eliminó la clase CSS `.day-meds__empty`, ya no usada.

## 2026-06-30 — Recuadro de medicamentos: ancho, alto y tipografía uniformes
- **Qué:**
  1. La card de "Medicamentos" es más estrecha que la de "Comidas" en
     escritorio/iPad (`flex: 1` vs `flex: 1.6` de comidas).
  2. Ambas cards toman el mismo alto para verse uniformes
     (`align-items: stretch` en `.day-view__meals-row`).
  3. El padding del recuadro y el tamaño/margen del título vuelven a igualar a
     las demás cards (`padding: --space-md`, título `--font-size-sm` con
     `margin-bottom: --space-sm`, como `.meals__title`).
  4. El nombre del medicamento usa el mismo estilo que la hora (peso `medium` y
     color `--color-text-secondary`).
- **Por qué:** Que el recuadro de medicamentos se vea acorde y uniforme junto al
  de comidas.
- **Archivos:** `src/views/DayView.css`.
- **Notas:** Solo CSS. Las reglas de ancho viven bajo `.day-view__meals-row`, que
  únicamente se renderiza en escritorio/iPad; en móvil el recuadro sigue apilado a
  todo el ancho.

## 2026-06-30 — Ajustes en comidas (máx. 3) y recuadro de medicamentos
- **Qué:**
  1. Las "Comidas del día" ahora admiten máximo 3 cards por comida (antes 4); el
     grid de mini-cards pasó a 3 columnas.
  2. El recuadro "Medicamentos" es más compacto (menos padding, gaps y tamaños).
  3. El nombre del medicamento usa el mismo tamaño de letra que la hora
     (`--font-size-xs`).
  4. Al marcar una dosis como tomada, esta se oculta de la lista (solo quedan las
     pendientes); si un plan se queda sin dosis pendientes, se oculta, y si no
     queda ninguna se muestra "Sin medicamentos para este día".
- **Por qué:** Ajustes de densidad y comportamiento pedidos para la vista diaria.
- **Archivos:** `src/views/DayView.jsx`, `src/views/DayView.css`.
- **Notas:** En `DayMedications` se añadió `visiblePlans` (filtra dosis tomadas
  vía `isTaken`). El check ya no muestra estado "on" (al marcarse desaparece);
  se eliminaron las clases CSS `.day-meds__check--on` y `.day-meds__name--done`,
  ya no usadas. Límite de comidas: `canAddMore = selected.length < 3`.

## 2026-06-30 — Recuadro "Medicamentos" del día en la vista diaria
- **Qué:** Junto al recuadro de "Comidas del día" se añadió un recuadro
  "Medicamentos" que lista las dosis del día agrupadas por plan activo, con el
  formato `Plan xxx` y filas `( ) 8:00am medN`. Cada dosis tiene un check para
  marcarla como tomada/no tomada; el estado se guarda en el historial global de
  medicación (`med-history`), compartido con el módulo de Medicación.
- **Por qué:** Permitir ver y registrar la toma de medicamentos directamente
  desde el día sin entrar al módulo de Medicación.
- **Archivos:** `src/views/DayView.jsx`, `src/views/DayView.css`.
- **Notas:** Nuevo componente `DayMedications({ dayISO })` que reutiliza
  `planStatus`, `computeDoseTimes`, `colorById`, `newId`, `medPlansKey` y
  `medHistoryKey` de `utils/medications`. Solo se muestran planes activos en ese
  día (entre startDate/endDate) y medicaciones no pausadas. Horas en formato 12h
  (`formatDose12h`). En escritorio/iPad va al lado de Comidas
  (`.day-view__meals-row`, flex); en móvil se apila debajo. El check marca/desmarca
  una entrada `Taken` con `scheduledTime = "<dayISO>T<HH:MM>"`. Colores y espaciados
  con variables del tema.

## 2026-06-30 — Ajustes de la vista diaria en iPad/escritorio
- **Qué:**
  1. La columna del Horario es un poco más estrecha: el grid de la vista diaria
     pasó de `1fr 1fr` a `0.82fr 1fr` (más ancho para la columna derecha de
     recordatorios/tareas/comidas).
  2. En las "Comidas del día" se ocultan los labels Desayuno/Almuerzo/Cena
     (`.meal-card__label` → `display: none`), dejando que las cards ocupen todo
     el ancho.
- **Por qué:** Ajustes de layout pedidos para la vista en iPad/escritorio.
- **Archivos:** `src/views/DayView.css`.
- **Notas:** Ambos cambios aplican solo a iPad/escritorio: el grid
  `.day-view__columns` únicamente se renderiza cuando no es móvil, y el oculta-
  labels está dentro de `@media (min-width: 768px)`. En móvil todo queda igual.

## 2026-06-30 — Nuevo módulo de Gestión de medicación
- **Qué:** Módulo completo de medicación con planes de tratamiento y
  medicamentos:
  1. Nueva sección "Medicación" en el menú lateral/inferior (icono de píldora).
  2. Home (`/medications`): listado de planes en grid, búsqueda, filtros
     (Todas/Activos/Próximos/Completados), orden (nombre/inicio/fin/progreso),
     duplicar y eliminar plan (con elección de borrar solo el plan o también sus
     medicamentos), estado vacío.
  3. Crear/editar plan (`/medications/new`, `/medications/:id/edit`): página
     dedicada con info general (nombre*, descripción, color, icono, fecha de
     inicio*), duración rápida (7/10/14/21/30 días o personalizada) que calcula
     la fecha de fin, y validación (nombre y fechas, fin > inicio).
  4. Detalle del plan (`/medications/:id`): cabecera con progreso/estado/fechas/
     días restantes, lista de medicamentos, sección de próximas dosis, agregar/
     editar/duplicar/eliminar medicamento y marcar dosis (Tomada/Saltar/
     Posponer). Los planes completados quedan en solo lectura (pero duplicables).
  5. Medicamento con dosis, unidad, frecuencia (presets cada N horas, 2/3 veces,
     semanal o personalizada por intervalo u horas específicas), hora de inicio,
     "tomar con comida" y notas. Los horarios de dosis se calculan en
     `computeDoseTimes`.
  6. Notificaciones push de dosis integradas en la Cloud Function existente
     (`sendPlannerNotifications`): por cada plan activo y medicamento no pausado
     avisa cuando una dosis cae en la ventana de la corrida (1 aviso por dosis),
     reutilizando la misma infraestructura de tokens/envío.
- **Por qué:** Implementar la especificación funcional del módulo de medicación
  reutilizando la arquitectura existente (navegación, `usePersistedState`,
  sistema de temas, componentes/modales compartidos, backup a Firestore y Cloud
  Functions) sin crear patrones paralelos.
- **Archivos:**
  - `src/database/localStore.js` (claves `med-plans`/`med-history`, añadidas a
    `BIG_DOC_KEYS` para sincronizar a la nube y que las Functions las lean).
  - `src/utils/medications.js` (dominio: colores/iconos/unidades/frecuencias,
    estados, progreso, días restantes, cálculo de dosis, historial). NUEVO.
  - `src/components/MedicationCards.jsx` + `.css` (ProgressBar, TreatmentPlanCard,
    MedicationCard). NUEVOS.
  - `src/components/MedicationModals.jsx` (MedicationModal, MarkDoseModal,
    DeleteTreatmentPlanModal). NUEVO.
  - `src/views/MedicationHome.jsx` + `.css`. NUEVOS.
  - `src/views/CreateTreatmentPlan.jsx` + `.css`. NUEVOS.
  - `src/views/TreatmentPlanDetails.jsx` + `.css`. NUEVOS.
  - `src/App.jsx` (rutas `/medications`, `/medications/new`,
    `/medications/:id/edit`, `/medications/:id`).
  - `src/components/SideMenu.jsx` (item de navegación).
  - `functions/index.js` (cálculo de dosis y recordatorios de medicación).
- **Notas:** Todos los colores temáticos reutilizan variables ya definidas en
  ambos temas (default y masculino), por lo que el módulo se adapta solo. Los
  modales no usan `autoFocus` (lección previa: evita abrir el teclado en PWA).
  `npm run lint` solo reporta `react/prop-types` en los nuevos componentes, que
  es la línea base del proyecto (ningún componente existente declara prop-types);
  no se añadieron errores nuevos de otro tipo.

## 2026-06-30 — Ajustes de modales de comida y navegación por flechas
- **Qué:**
  1. El modal de agregar/editar comida ya no oculta el botón Guardar cuando hay
     muchos ingredientes: las acciones del modal quedan fijas (sticky) al fondo y
     se usa `90dvh` en lugar de `90vh`.
  2. El buscador del selector de comidas (MealPicker) en la vista de día ya no
     abre el teclado automáticamente al abrir el modal (se quitó `autoFocus`),
     mejorando la experiencia en PWA.
  3. Las mini-cards de comidas del planificador del día usan fondo gris claro
     (`--color-surface`), igual que en la vista de recetario.
  4. La vista semanal en iPad/escritorio tiene flechas ‹ › en la cabecera para
     moverse a la semana anterior/siguiente, además de las píldoras de semana.
  5. Las flechas de navegación (días/semanas/meses) ahora respetan los años
     disponibles: no permiten saltar a un año que aún no existe. Se añadió el
     helper `isYearAvailable` y un tope de última semana ISO (`getLastISOWeek`).
  6. La vista de día en iPad/escritorio tiene flechas ‹ › para moverse entre
     días, además de las píldoras de día.
- **Por qué:** corregir problemas de usabilidad reportados (botón Guardar
  cortado, teclado intrusivo en PWA, contraste de mini-cards, falta de
  navegación con flechas en desktop y saltos a años inexistentes en móvil).
- **Archivos:**
  - `src/utils/calendar.js` (helpers `MIN_YEAR`, `getMaxYear`,
    `isYearAvailable`, `getLastISOWeek`).
  - `src/assets/styles/components.css` (`.modal--form` dvh + acciones sticky).
  - `src/views/DayView.jsx` y `src/views/DayView.css` (quitar autoFocus,
    fondo gris de mini-cards, flechas de día desktop, guardas de año).
  - `src/views/MonthView.jsx` y `src/views/MonthView.css` (guardas de año en
    flechas, estado disabled).
  - `src/views/WeekView.jsx` y `src/views/WeekView.css` (flechas de semana en
    desktop, tope de última semana, estado disabled).
- **Notas:**
  - La regla sticky aplica a todos los modales con `.modal--form`
    (RecipeModal, EventModal, ReminderModal, MealPicker, modales de día/semana).
  - `npm run lint` solo reporta errores preexistentes del proyecto
    (`react/prop-types` en todas las vistas y un `DateField` sin usar en
    WeekView que ya existía); los cambios de esta entrada no introducen errores
    nuevos.
  - La disponibilidad de años se deriva de la fecha (un año X se desbloquea el
    1-dic del año X-1), coherente con la regla del Dashboard.
