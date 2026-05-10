Lanzé un agente explorando el codebase. Te cuento cuando termine.

✻ Sautéed for 28s · 1 local agent still running

⏺ Agent "Explorar candidatos para rxResource en el proyecto" completed

⏺ Con la exploración completa, puedo hacer un análisis preciso.

  ---
  Dónde aplicar rxResource en FinancePro

  Qué resuelve rxResource

  // Patrón ACTUAL en los 6 state services:
  private _items    = signal<T[]>([]);
  private _loading  = signal<boolean>(false);
  private _error    = signal<string | null>(null);

  load(): void {
    this._loading.set(true);
    firstValueFrom(this.sheetsApi.getRange(...))
      .then(data => { this._items.set(data); this._loading.set(false); })
      .catch(err  => { this._error.set(err);  this._loading.set(false); });
  }
  
  // Con rxResource — las 3 señales + el reload colapsan en 1:
  readonly resource = rxResource({ 
    request: () => this.activeWorkspaceId(),   // re-fetcha automático al cambiar
    loader: ({ request: wsId }) =>
      this.sheetsApi.getRange(...).pipe(map(rows => this.parse(rows, wsId)))
  });
  // resource.value() / resource.isLoading() / resource.error() / resource.reload()

  ---
  Candidatos concretos

  1. Los 6 State Services — candidatos principales

  Todos siguen exactamente el mismo patrón de 3 señales + firstValueFrom. El beneficio de rxResource aquí es máximo porque:
  - El request natural ya existe: activeWorkspaceId()
  - Cuando cambia el workspace activo, hoy hay que llamar .load() manualmente; con rxResource es automático
  - El reload tras un appendRow se dispara con resource.reload() en lugar de reimplementar la lógica

  ┌────────────────────────┬──────────────────────────────────────┬───────────────────────────────────────┐
  │        Archivo         │           Request reactivo           │               Ganancia                │
  ├────────────────────────┼──────────────────────────────────────┼───────────────────────────────────────┤
  │ wallets.state.ts       │ activeWorkspaceId()                  │ Auto-reload al cambiar workspace      │
  ├────────────────────────┼──────────────────────────────────────┼───────────────────────────────────────┤
  │ categories.state.ts    │ activeWorkspaceId()                  │ Ídem                                  │
  ├────────────────────────┼──────────────────────────────────────┼───────────────────────────────────────┤
  │ budgets.state.ts       │ activeWorkspaceId() + activePeriod() │ Re-fetch cuando cambia período        │
  ├────────────────────────┼──────────────────────────────────────┼───────────────────────────────────────┤
  │ transactions.state.ts  │ activeWorkspaceId()                  │ Elimina el forkJoin manual + _loading │
  ├────────────────────────┼──────────────────────────────────────┼───────────────────────────────────────┤
  │ currency.state.ts      │ Lista de monedas activas             │ Re-fetch al agregar moneda            │
  ├────────────────────────┼──────────────────────────────────────┼───────────────────────────────────────┤
  │ user-settings.state.ts │ userId()                             │ Carga al loguear el usuario           │
  └────────────────────────┴──────────────────────────────────────┴───────────────────────────────────────┘
  
  2. TransactionFormComponent — toSignal(conceptsService.loadConcepts())
  
  El componente hoy hace:
  private readonly _concepts = toSignal(
    this.conceptsService.loadConcepts(),
    { initialValue: [] as IConcept[] }
  );

  Con rxResource gana estado de carga y error de forma gratis, útil para mostrar un spinner mientras carga los conceptos del autocompletado:
  readonly conceptsResource = rxResource({
    loader: () => this.conceptsService.loadConcepts()
  });
  
  3. currency-api.service.ts — tasas de cambio

  Si la tasa de cambio se fetchea en función de la moneda seleccionada, rxResource es el fit ideal:
  readonly rateResource = rxResource({
    request: () => this.selectedCurrency(),  // signal del form
    loader: ({ request: currency }) =>
      this.http.get<Rate>(`.../${currency}`)
  });

  ---
  Cuándo NO aplicar rxResource
  
  - appendRow / updateRow / deleteRow: son mutaciones, no lecturas. Para eso sigue siendo correcto el firstValueFrom() o un método imperativo.
  - AutocompleteInputComponent: ya resuelve el caso con toObservable + switchMap, que es más flexible para debounce de búsqueda de texto.

  ---
  Prioridad de adopción

  1. wallets.state.ts    — más simple, sirve como piloto
  2. categories.state.ts — ídem
  3. budgets.state.ts    — gana el re-fetch por período
  4. transactions.state.ts — el más complejo, hacerlo último

  Si querés, arrancamos con wallets.state.ts como piloto para ver el patrón en limpio antes de replicar a los demás.
