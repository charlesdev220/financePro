# Skill: Web Design Guidelines

Revisa templates Angular y HTML para cumplimiento de accesibilidad, UX y design system del proyecto.  
Recibís: **$ARGUMENTS** (archivo o patrón a revisar, ej: `frontend/src/app/features/auth/login.component.ts`).

## Design System PropTech

### Paleta de colores (Tailwind)
- **Primario:** `blue-600` (acciones principales, CTAs)
- **Neutros:** `slate-900`, `slate-800`, `slate-500`, `slate-100`
- **Fondo:** `slate-50`, `white`
- **Error:** `red-500`, `red-50`
- **Éxito:** `green-500`, `green-50`

### Tipografía
- Títulos: `font-black tracking-tighter uppercase`
- Body: `font-medium text-slate-700`
- Labels: `font-semibold text-slate-700 text-sm`
- Subtexto: `text-slate-500 text-sm`

### Componentes recurrentes
```html
<!-- Botón primario -->
<button class="bg-blue-600 text-white px-5 py-2 rounded-full text-sm font-bold
               hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50
               shadow-lg shadow-blue-200">
  Acción
</button>

<!-- Botón secundario -->
<button class="bg-slate-900 text-white px-5 py-2 rounded-full text-sm font-bold
               hover:bg-slate-800 transition-all active:scale-95">
  Secundario
</button>

<!-- Input -->
<input class="w-full px-4 py-3 rounded-xl border border-slate-200
              focus:outline-none focus:ring-2 focus:ring-blue-500
              text-sm transition-all">

<!-- Card -->
<div class="bg-white rounded-2xl shadow-xl p-6">...</div>
```

## Checklist de Revisión

### Accesibilidad
- [ ] Botones con solo icono tienen `aria-label`
- [ ] Inputs tienen `<label>` asociado o `aria-label`
- [ ] Imágenes tienen `alt` (o `alt=""` si son decorativas)
- [ ] Iconos decorativos tienen `aria-hidden="true"`
- [ ] `<button>` para acciones, `<a>` para navegación (no `<div (click)>`)
- [ ] Headings jerárquicos `h1`→`h2`→`h3` sin saltos
- [ ] Elementos interactivos accesibles por teclado

### Focus States
- [ ] Todos los elementos interactivos tienen focus visible: `focus-visible:ring-2 focus-visible:ring-blue-500`
- [ ] Nunca `outline-none` sin reemplazo de focus

### Responsive
- [ ] Mobile-first: breakpoints `md:`, `lg:` para expansión
- [ ] Navbar colapsado en mobile (`hidden md:flex`)
- [ ] Inputs `w-full` en mobile

### Estados de UI
- [ ] Estado de carga (skeleton o spinner)
- [ ] Estado de error (mensaje y color `red-500`)
- [ ] Estado vacío (mensaje descriptivo)
- [ ] Botón deshabilitado durante submit (`disabled:opacity-50`)

### Performance Visual
- [ ] Imágenes con `ngSrc` + `width` + `height`
- [ ] Animaciones con `transition-all` y `duration-200` (no más largas)
- [ ] `active:scale-95` en botones para feedback táctil

## Formato de Reporte

```
file.ts:42 — [ACCESIBILIDAD] Botón de cerrar sin aria-label
file.ts:78 — [FOCUS] Input sin focus-visible ring
file.ts:103 — [ESTADO] Falta estado de carga en submit
file.ts:115 — [DISEÑO] Color hardcodeado (#333) — usar slate-700
```