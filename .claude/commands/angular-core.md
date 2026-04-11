# Skill: Angular Core

Patrones obligatorios de Angular 17+ para este proyecto.

## Componentes Standalone — OBLIGATORIO

```typescript
@Component({
  selector: 'app-property-card',
  standalone: true,                         // siempre true
  imports: [NgOptimizedImage, RouterLink],  // solo lo que se usa
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `...`
})
export class PropertyCardComponent { }
```

## Signals para Estado — OBLIGATORIO

```typescript
export class PropertyListComponent {
  // Estado local con signals
  private propertyService = inject(PropertyService);

  properties = signal<PropertyDTO[]>([]);
  isLoading = signal(false);
  errorMessage = signal<string | null>(null);

  // Derivado con computed
  totalCount = computed(() => this.properties().length);

  // Convertir Observable a Signal
  featuredProperties = toSignal(
    this.propertyService.getFeatured(),
    { initialValue: [] }
  );

  // Side effects
  private logEffect = effect(() => {
    console.log('Properties changed:', this.properties().length);
  });
}
```

## Inputs y Outputs — API Moderna

```typescript
export class PropertyCardComponent {
  // ✅ CORRECTO — function-based
  readonly property = input.required<PropertyDTO>();
  readonly isSelected = input(false);
  readonly propertySelected = output<PropertyDTO>();
  readonly favoriteToggled = model(false);  // two-way binding

  // ❌ PROHIBIDO — decorator-based
  // @Input() property: PropertyDTO;
  // @Output() selected = new EventEmitter();
}
```

## Inyección de Dependencias — `inject()` function

```typescript
export class PropertyListComponent {
  // ✅ CORRECTO
  private propertyService = inject(PropertyService);
  private router = inject(Router);
  private fb = inject(FormBuilder);

  // ❌ PROHIBIDO
  // constructor(private propertyService: PropertyService) {}
}
```

## Control Flow — Directivas Modernas

```html
<!-- ✅ CORRECTO -->
@if (isLoading()) {
  <app-spinner />
} @else if (properties().length === 0) {
  <p>No hay inmuebles.</p>
} @else {
  @for (property of properties(); track property.id) {
    <app-property-card [property]="property" />
  }
}

<!-- ❌ PROHIBIDO -->
<!-- *ngIf, *ngFor, ng-container con *ngIf -->
```

## RxJS — Solo Cuando Sea Necesario

```typescript
// ✅ USO CORRECTO: HttpClient + operadores de tiempo
searchProperties(query: string) {
  this.searchQuery.set(query);
}

private searchResults = toSignal(
  toObservable(this.searchQuery).pipe(
    debounceTime(300),
    distinctUntilChanged(),
    switchMap(q => this.propertyService.search(q))
  ),
  { initialValue: [] }
);

// ❌ INCORRECTO: BehaviorSubject para estado local simple
// private _properties = new BehaviorSubject<PropertyDTO[]>([]);
```

## HttpClient — Llamadas API

```typescript
// En el servicio
search(params: SearchParams): Observable<PagePropertyDTO> {
  return this.http.get<PagePropertyDTO>('/api/v1/properties', { params });
}

// En el componente — convertir a signal
results = toSignal(
  this.propertyService.search(this.filters()),
  { initialValue: { content: [], totalElements: 0 } }
);
```

## Separación de Plantillas — REGLA INAMOVIBLE

**Los archivos `.ts` nunca contienen HTML.** Esta es la regla más importante del proyecto MyFinance.

```typescript
// ✅ CORRECTO — fichero separado
@Component({
  selector: 'app-ui-component',
  standalone: true,
  templateUrl: './ui-component.component.html',
  styleUrls: ['./ui-component.component.scss']
})
export class UiComponent { }

// ❌ PROHIBIDO — inline template
@Component({
  selector: 'app-ui-component',
  standalone: true,
  template: `<div>...</div>` // JAMÁS USAR ESTO
})
export class UiComponent { }
```

## Reglas
- Prohibido `NgModule`. Prohibido `*ngIf`/`*ngFor`.
- **Prohibido cualquier rastro de HTML en archivos `.ts`.**
- `ChangeDetectionStrategy.OnPush` en todos los componentes nuevos.
- Registrar providers singleton SOLO en `app.config.ts`, nunca en componentes.