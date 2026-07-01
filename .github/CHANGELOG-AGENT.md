# Changelog del agente — My Planner

Registro de todos los cambios hechos por el agente **My Planner**. La entrada
más reciente va **arriba**. El agente debe **leer este archivo antes de cada
cambio** y **añadir una entrada después de cada cambio**.

Formato de cada entrada:

```md
## YYYY-MM-DD — <título corto>
- **Qué:** descripción del cambio.
- **Por qué:** motivo / problema que resuelve.
- **Archivos:** rutas tocadas.
- **Notas:** decisiones, efectos secundarios o pendientes (si aplica).
```

---

## 2026-06-30 — Creación del agente y del changelog
- **Qué:** se añadió el agente personalizado `.github/agents/my-planner.agent.md` con el contexto del proyecto (arquitectura general, vistas, datos) y la guía de estilos/tema, y se creó este changelog.
- **Por qué:** dar al agente contexto persistente del proyecto y un registro de cambios para acelerar el trabajo y mantener consistencia de estilos.
- **Archivos:** `.github/agents/my-planner.agent.md`, `.github/CHANGELOG-AGENT.md`.
- **Notas:** el agente debe leer este archivo al iniciar y registrar aquí cada cambio futuro.