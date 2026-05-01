# Playwright Inspector — MyFinance

Inspector visual y funcional de la app MyFinance con Playwright.
Navega la aplicación real en el navegador, detecta bugs visuales y funcionales,
y genera un reporte markdown estructurado al finalizar cada inspección.

Recibís: **$ARGUMENTS** (feature o flujo a inspeccionar, ej: "flujo de nueva transacción").

---

## Cuándo usarlo

| Señal | Acción |
|-------|--------|
| "comprobá la app" | Inspección general de la sesión activa |
| "revisá si hay bugs visuales" | Inspección visual de las páginas afectadas |
| "hacé un inspection run" | Inspección completa del flujo principal |
| "testeá el flujo de X" | Inspección del flujo específico indicado |
| "abrí el navegador y revisá" | Inspección libre con reporte |
| **Al finalizar cada integración de SDD** | Entrega obligatoria de `feature-report.md` |

---

## Pre-requisitos

- App corriendo en `http://localhost:4200`
- Usuario autenticado con cuenta Google de prueba (hacer login si es necesario)
- MCP Playwright disponible

---

## Protocolo de inspección

### 1. Cargar herramientas

```
ToolSearch: "select:mcp__playwright__browser_snapshot,mcp__playwright__browser_click,
             mcp__playwright__browser_navigate,mcp__playwright__browser_take_screenshot,
             mcp__playwright__browser_fill_form,mcp__playwright__browser_console_messages"
```

### 2. Estado inicial

```
browser_navigate → http://localhost:4200
browser_snapshot → verificar carga, leer errores de consola
browser_console_messages → capturar warnings/errors existentes
```

### 3. Regla de oro: snapshot antes de interactuar

```
snapshot → leer ref → click/fill → snapshot → verificar cambio
```

Los `ref` cambian con cada re-render — usar siempre refs del snapshot más reciente.

### 4. Ciclo estándar por feature

```
1. browser_navigate → ruta de la feature
2. browser_snapshot → estado inicial (vacío, cargando, con datos)
3. browser_take_screenshot → evidencia estado inicial
4. Interacción (fill_form, click, select_option)
5. browser_snapshot → verificar cambio de estado
6. browser_take_screenshot → evidencia post-acción
7. browser_console_messages → verificar 0 errores nuevos
```

---

## Flujos críticos a inspeccionar en MyFinance

### Login con Google
```
browser_navigate → /login
browser_snapshot → verificar botón "Continuar con Google"
browser_take_screenshot → login-initial.png
```

### Nueva transacción (flujo principal)
```
browser_navigate → /tabs/dashboard
browser_snapshot → verificar FAB dual (rojo izq / verde der)
browser_click → FAB verde (ingreso) o rojo (gasto)
browser_snapshot → verificar modal con breakpoint 0.75
browser_fill_form → monto, descripción, fecha, categoría, cartera
browser_click → botón "Registrar"
browser_snapshot → verificar toast de confirmación + lista actualizada
```

### Dashboard — balance y chart
```
browser_navigate → /tabs/dashboard
browser_snapshot → verificar balance pill (no NaN, no "--")
browser_take_screenshot → dashboard-balance.png
browser_snapshot → verificar chart de presupuesto (no NaN%, no barras vacías)
```

### Cambio de workspace
```
browser_snapshot → header con workspace selector
browser_click → workspace selector
browser_snapshot → verificar lista de workspaces
browser_click → workspace distinto
browser_snapshot → verificar que los datos cambiaron reactivamente
```

### Estado vacío (primer uso)
```
browser_navigate → /tabs/wallets (sin carteras)
browser_snapshot → verificar empty state con CTA (no pantalla en blanco)
```

---

## Diagnóstico de problemas comunes

| Síntoma | Causa probable | Verificar |
|---------|---------------|-----------|
| Balance muestra `—` o `NaN` | `parseNum()` devuelve NaN en `rowToTransaction` | Consola: errores de parse |
| Chart con `NaN%` | `spent_amount` stale desde Sheets | `BudgetsStateService.recalculate()` |
| FAB tapado por tab bar | `margin-bottom` incorrecto | `calc(56px + 16px)` |
| Modal no se abre | `ModalController.create()` falla | Consola: error de componente |
| Select vacío sin deshabilitar | Datos no cargados aún | Verificar `loading()` signal |
| Página en blanco | Effect no despachado | `ngOnInit` dispatch missing |
| Toast no aparece | `ToastController` no registrado en imports | Imports del componente |
| Colores incorrectos | Tailwind no reconoce token custom | `tailwind.config.js` tokens |

---

## Entregable obligatorio: `feature-report.md`

**Al finalizar cada integración de SDD**, generar un informe en:
`.sdd/changes/{change-name}/feature-report.md`

### Formato del `feature-report.md`

```markdown
# Feature Report: {Nombre de la Feature}

**Fecha:** {YYYY-MM-DD}
**SDD:** {change-name}
**Inspeccionado por:** playwright-inspector
**App URL:** http://localhost:4200

---

## Descripción funcional

{Qué hace esta feature en 2-3 oraciones. Sin jerga técnica — desde la perspectiva del usuario.}

## Cómo usar la feature

### Paso a paso

1. {Navegar a...}
2. {Hacer clic en...}
3. {Completar el campo...}
4. {Confirmar con...}

### Valores por defecto

| Campo | Valor por defecto |
|-------|------------------|
| Fecha | Hoy |
| Moneda | Moneda base del usuario |
| {otro} | {valor} |

## Estados de la interfaz

| Estado | Descripción | Comportamiento esperado |
|--------|-------------|------------------------|
| Vacío | Sin datos aún | Empty state con CTA visible |
| Cargando | Request en curso | Spinner / skeleton visible |
| Con datos | Lista / formulario populado | Datos reales, sin IDs técnicos |
| Error | Fallo de red o permisos | Toast danger + botón "Reintentar" |

## Evidencias visuales

- `screenshots/{feature}-empty.png` — estado vacío
- `screenshots/{feature}-loading.png` — estado de carga
- `screenshots/{feature}-populated.png` — con datos reales
- `screenshots/{feature}-action.png` — post-acción (modal, toast, etc.)

## Novedades y cambios respecto a la versión anterior

{Qué cambió visualmente o funcionalmente. Si es una feature nueva, describir qué añade.}

## Bugs detectados

| # | Severidad | Descripción | Archivo probable |
|---|-----------|-------------|-----------------|
| 1 | 🔴 Crítico / 🟡 Advertencia / 🔵 Mejora | {descripción} | {ruta/archivo} |

*Si no se detectaron bugs: "No se detectaron bugs en esta inspección."*

## Resultado de consola

- Errores JS: {N}
- Warnings: {N}
- Errores de red (4xx/5xx): {N}

## Conclusión

{Una oración sobre el estado de la feature: ✅ Aprobada / ⚠️ Aprobada con observaciones / ❌ Bloqueada}
```

---

## Reglas del reporte

- **Lenguaje natural, sin IDs técnicos.** Escribir para el usuario, no para el desarrollador.
- **Evidencias obligatorias.** Al menos 2 screenshots por feature inspeccionada.
- **Bugs con severidad.** 🔴 = bloquea uso, 🟡 = desvío del DS/UX, 🔵 = mejora opcional.
- **Consola limpia = 0 errores JS.** Si hay errores, son bugs críticos.
- **El reporte se entrega aunque no haya bugs** — es documentación de estado, no solo bug tracker.
