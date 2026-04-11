# Playwright E2E Testing

Ejecuta pruebas end-to-end de la aplicación usando el MCP de Playwright.  
Recibís: **$ARGUMENTS** (funcionalidad o flujo a testear, ej: "login y publicación de propiedad").

## Pre-requisitos

- Frontend corriendo en `http://localhost:4200` (Angular dev server con proxy)
- Backend corriendo en `http://localhost:8080` (Spring Boot)
- MCP Playwright disponible (verificar con ToolSearch si no está en contexto)

## Herramientas disponibles

| Herramienta | Para qué usarla |
|---|---|
| `browser_snapshot` | Obtener árbol de accesibilidad con `ref` para interacciones |
| `browser_take_screenshot` | Verificación visual (mapas, imágenes, estilos) |
| `browser_navigate` | Navegar a una URL |
| `browser_click` | Clickear elemento por `ref` |
| `browser_fill_form` | Completar campos de un formulario |
| `browser_type` | Escribir texto en un campo |
| `browser_wait_for` | Esperar operaciones asíncronas |
| `browser_select_option` | Seleccionar opción en `<select>` |
| `browser_press_key` | Presionar tecla (Enter, Tab, Escape) |

## Regla de oro: snapshot antes de clickear

**SIEMPRE** tomar `browser_snapshot` antes de cualquier interacción para obtener los `ref` actuales.  
Los `ref` cambian con cada re-render — usar solo refs del snapshot más reciente.

```
snapshot → leer ref → click/fill → snapshot → verificar cambio
```

## Qué hacer

### 1. Cargar herramientas si no están disponibles

```
ToolSearch: "select:mcp__playwright__browser_snapshot,mcp__playwright__browser_click,
             mcp__playwright__browser_navigate,mcp__playwright__browser_take_screenshot"
```

### 2. Establecer estado inicial

Navegar a la URL de inicio y tomar snapshot para ver el estado actual:

```
browser_navigate → http://localhost:4200
browser_snapshot → verificar que carga, leer errores de consola
```

### 3. Flujo de autenticación (si se necesita)

El usuario de prueba del proyecto es: `playwright.unique.99@proptech.com` / `Test1234!`  
(No usar `admin@proptech.com` — no existe en el seeder actual)

```
browser_navigate → /login
browser_snapshot → obtener refs del formulario
browser_fill_form → email + password
browser_click → botón Login
browser_snapshot → verificar redirect y navbar "Cerrar sesión"
```

### 4. Testear funcionalidad concreta

Ciclo estándar para cualquier acción:

1. `browser_navigate` → URL del feature
2. `browser_snapshot` → obtener estado inicial + refs
3. Acción (`browser_click`, `browser_fill_form`, etc.)
4. `browser_snapshot` → verificar cambio de estado (texto, atributo `[active]`, clase CSS)
5. `browser_take_screenshot` → evidencia visual (especialmente para mapas/imágenes)

### 5. Verificar cambios de estado en Angular

Los Signals de Angular se reflejan instantáneamente en el snapshot.  
Buscar cambios en:
- Texto del botón (ej: "♡ Añadir a favoritos" → "❤️ Guardado en favoritos")
- Atributo `[active]` en el elemento
- Presencia/ausencia de elementos (`@if` en el template)
- Clases CSS aplicadas

### 6. Verificación visual con screenshot

Para elementos no accesibles por árbol de accesibilidad (mapas Leaflet, imágenes renderizadas):

```
browser_take_screenshot → filename: "test-{feature}.png"
```

Analizar visualmente: marcadores en el mapa, imágenes cargadas, estilos aplicados.

## Patrones frecuentes en PropTech

### Test de imágenes en listado

```
browser_navigate → /search
browser_snapshot → buscar elementos img con alt != ""
browser_take_screenshot → verificar imágenes visibles (no placeholder 🏠)
```

### Test de favoritos

```
# 1. Agregar favorito
browser_navigate → /property/{id}
browser_snapshot → ref del botón "Añadir a favoritos"
browser_click → botón favorito
browser_snapshot → verificar texto cambió + atributo [active]

# 2. Verificar lista
browser_navigate → /favorites
browser_snapshot → verificar card de la propiedad presente

# 3. Verificar marcador en mapa
browser_navigate → /search
browser_take_screenshot → buscar círculo rojo vs pins azules
```

### Test de publicación de propiedad

```
browser_navigate → /publish
browser_snapshot → obtener refs del formulario
browser_fill_form → título, descripción, precio, tipo
browser_click → mapa para fijar ubicación (usar coordenadas de Madrid: 40.4168, -3.7038)
browser_click → botón Publicar
browser_snapshot → verificar mensaje de éxito o redirect
```

### Test del buscador con municipio

```
browser_navigate → /search
browser_snapshot → ref del input de municipio
browser_type → nombre del municipio (ej: "Salamanca, Madrid")
browser_click → botón "Ir"
browser_wait_for → 1000ms (geocoding Nominatim es externo)
browser_take_screenshot → verificar mapa centrado + propiedades actualizadas
```

## Lectura de errores de consola

El snapshot siempre muestra `Console: X errors, Y warnings`.  
- **0 errors** → estado esperado
- **Errores 4xx** → problema de auth o URL incorrecta (revisar proxy, JWT token)
- **Errores de Leaflet** → assets no encontrados (`marker-icon.png`) — verificar `angular.json` assets glob

## Diagnóstico de problemas comunes

| Síntoma | Causa probable | Fix |
|---|---|---|
| Imagen muestra alt text en lugar de foto | Proxy no configurado o URL relativa mal formada | Verificar `proxy.conf.json` y `apiUrl` en `environment.ts` |
| Marcador Leaflet no aparece | Assets de íconos no copiados | `L.Icon.Default.mergeOptions` + glob en `angular.json` |
| 401 en requests autenticados | Token no adjuntado | Verificar `AuthInterceptor` registrado en `provideHttpClient` |
| 403 en endpoint | `@PreAuthorize` o `SecurityConfig` bloqueando | Revisar configuración de seguridad del endpoint |
| Página redirige a /login | Guard activo o `authService.isLoggedIn()` false | Hacer login primero |
| `ref` no encontrado al clickear | Snapshot desactualizado | Tomar nuevo `browser_snapshot` y usar nuevo ref |

## Formato de reporte

Al terminar, reportar:

```
✅ [Feature]: descripción de lo verificado
❌ [Feature]: descripción del problema encontrado + evidencia (screenshot filename)
⚠️ [Feature]: funciona pero con issue menor: descripción
```
