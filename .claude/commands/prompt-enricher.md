# Prompt Enricher

Provee contexto quirúrgico a partir de `PROJECT_FUNCTIONAL_DOC.md` **antes** de cualquier
exploración o implementación. Su output reemplaza la exploración amplia — no la complementa.

## Comportamiento

1. Leer `PROJECT_FUNCTIONAL_DOC.md` en la raíz del proyecto.
   - Si el archivo **no existe**: responder con:
     > `PROJECT_FUNCTIONAL_DOC.md` no existe. Ejecutá la tarea 14.1 del SDD
   - Si existe: continuar con el paso 2.

2. Identificar qué features y state services menciona el prompt del usuario
   (Dashboard, Movimientos, Carteras, Presupuestos, Configuración, Workspaces, Categorías).

3. Para cada feature identificada, extraer del doc:
   - State services que consume y sobre los que escribe
   - Señales derivadas relevantes (`computed()`)
   - Dependencias cross-feature

4. Devolver al usuario el siguiente bloque y **nada más** — no explorar, no leer otros archivos:

   ```
   {prompt original del usuario}

   ## Contexto automático
   **Features detectados:** {lista}

   **State services afectados:**
   - {NombreState}: {qué lee / qué escribe}

   **Señales derivadas relevantes:**
   - {signal}: {qué computa}

   **Flujos cross-feature:**
   - {descripción del flujo}

   **Archivos a leer (y solo estos):**
   - `{ruta exacta}` — {por qué}

   **Archivos a modificar:**
   - `{ruta exacta}` — {qué cambia}

   **Reglas de capa a consultar:** {lista de archivos en .claude/rules/}
   ```

## Notas

- No implementar código. Solo enriquecer el contexto.
- No lanzar agentes Explore ni leer archivos extra — el doc es la única fuente.
- "Archivos a leer" debe ser una lista acotada (≤ 5). Si se necesitan más, indicar por qué.
- Si el prompt no menciona ningún feature conocido, indicar que no se detectó contexto
  específico y sugerir reformular con nombres de features o state services.
- Usar el doc como fuente de verdad; no inventar información que no esté en él.
