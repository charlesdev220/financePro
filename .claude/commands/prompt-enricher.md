# Prompt Enricher

Enriquece el prompt del usuario con contexto automático de features y state services afectados,
leyendo `PROJECT_FUNCTIONAL_DOC.md` como fuente de verdad.

## Comportamiento

1. Leer `PROJECT_FUNCTIONAL_DOC.md` en la raíz del proyecto.
   - Si el archivo **no existe**: responder con:
     > `PROJECT_FUNCTIONAL_DOC.md` no existe. Ejecutá la tarea 14.1 del SDD
     > `workspace-and-product-roadmap` para generarlo antes de continuar.
   - Si existe: continuar con el paso 2.

2. Identificar qué features menciona el prompt del usuario (Dashboard, Movimientos, Carteras,
   Presupuestos, Configuración, Workspaces, Categorías).

3. Para cada feature identificada, extraer del doc:
   - State services que consume
   - State services sobre los que escribe
   - Señales derivadas relevantes (`computed()`)
   - Dependencias cross-feature (flujos que involucran más de un feature)

4. Devolver al usuario:
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
   **Reglas de capa a consultar:** {lista de archivos en .claude/rules/}
   ```

## Notas

- No implementar código. Solo enriquecer el contexto.
- Si el prompt no menciona ningún feature conocido, indicar que no se detectó contexto
  específico y sugerir reformular con nombres de features o state services.
- Usar el doc como fuente de verdad; no inventar información que no esté en él.
