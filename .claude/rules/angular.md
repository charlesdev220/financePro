# Reglas Angular 20 — MyFinance

## Componentes — estructura obligatoria

Todo componente es standalone con `OnPush`. Sin `NgModule`.

```typescript
@Component({
  selector: 'app-{nombre}',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonContent, IonHeader, AsyncPipe, ...],  // solo lo que usa el template
  templateUrl: './{nombre}.page.html',               // siempre archivo externo
})
export class {Nombre}Page {}
```

- `templateUrl` obligatorio — prohibido `template: \`...\`` inline.
- `styleUrls` o `styles: []` vacío si no hay estilos propios (Tailwind en HTML).
- `changeDetection: ChangeDetectionStrategy.OnPush` en todos los componentes.
- Nunca `NgModule` en componentes nuevos.
- Se simplifica el codigo utilizando Vistas Anidadas (Router con Children y `<router-outlet>`)

## Separación de plantillas — REGLA DE ORO

- **Los archivos `.ts` NUNCA contienen HTML.**
- Cada componente tiene su `.html` individual — sin excepciones.
- Cualquier PR que use `template:` inline será rechazado.
- los observable deben ser pasados a tosignal antes de ser usados en el template.
- en las rutas hacer uso del :slug para un mejor SEO 
- **no utilizar `@ngrx/store`** en su lugar utilizar los Signals

## Smart vs Dumb

| Tipo | Carpeta | Responsabilidad |
|------|---------|----------------|
| Page (smart) | `features/{feature}/{nombre}/` | Inyecta store/servicios, gestiona estado |
| Component (dumb) | `shared/components/` | Solo `input()` / `output()`, sin lógica de negocio |

## Input / Output — API moderna (Angular 17+)

```typescript
// ✅ signal-based — obligatorio en código nuevo
//COMENTARIO OBLIGATORIO: quien lo utiliza y para que
nombre     = input.required<string>();
categoria  = input<string>('all');           // con default
//COMENTARIO OBLIGATORIO: quien lo utiliza y para que
seleccionado = output<Transaction>();

// ❌ obsoleto — no usar en código nuevo
@Input() nombre: string;
@Output() seleccionado = new EventEmitter<Transaction>();
```

## Inyección de dependencias

```typescript
// ✅
private store  = inject(Store);
private router = inject(Router);

// ❌
constructor(private store: Store) {}
```

# USO de CONSTANTES

```typescript
export const TRANSACTION_TYPES = {
  INCOME: 'INCOME' as const,
  EXPENSE: 'EXPENSE' as const,
};
```
```typescript
// ✅
signal<TransactionType>(TRANSACTION_TYPES.EXPENSE);

// ❌
signal<'income' | 'expense'>('expense'); 
```
```html
@let expense = 'expense';
@let income = 'income';
// ✅
{{ expense }}    | {{ income }}
// ❌
'expense'      | 'income' 
```
## Estado — Signals + NgRx

```typescript
// Estado local (UI) — signal directo
loading = signal<boolean>(false);

// Colecciones (transacciones, categorías, carteras) — NgRx via toSignal()
// Comentario OBLIGATORIO: qué selector usa y qué representa en este componente
/** Lista completa de transacciones del usuario actual desde el store NgRx. */
readonly allTransactions = toSignal(
  this.store.select(selectAllTransactions),
  { initialValue: [] }
);

// Derivados — computed() con comentario OBLIGATORIO
/** Transacciones filtradas por cartera, categoría y periodo activos. */
readonly transactions = computed(() =>
  this.allTransactions().filter(t => t.walletId === this.filterWallet())
);
```

### Reglas de comentarios — toSignal() y computed()

- **`toSignal()`**: siempre una línea JSDoc encima explicando qué selector conecta y qué representa en el componente. Si se cambia el selector, actualizar el comentario.
- **`computed()`**: siempre una línea JSDoc encima explicando qué deriva y por qué. Si se modifica la lógica, actualizar el comentario.
- Estos son los únicos casos donde se escribe comentario en un `.ts` — la regla general "cero comentarios" no aplica aquí.

```typescript
// ✅ correcto
/** Carteras activas del usuario para poblar el selector de filtro. */
readonly wallets = toSignal(this.store.select(selectAllWallets), { initialValue: [] });

/** Balance neto: suma de ingresos menos egresos en moneda base. */
readonly balance = computed(() =>
  this.transactions().reduce((sum, t) =>
    t.type === TRANSACTION_TYPES.INCOME ? sum + t.amount_base : sum - t.amount_base, 0)
);

// ❌ sin comentario
readonly wallets = toSignal(this.store.select(selectAllWallets), { initialValue: [] });
```

- `NgRx` para colecciones grandes: transacciones, categorías, carteras, presupuestos.
- `BehaviorSubject` en servicios solo para config/preferencias de usuario.
- `toSignal()` para consumir selectores NgRx en plantillas — sin `async pipe`.

## Lazy loading — obligatorio

```typescript
// app.routes.ts — loadComponent siempre
{
  path: 'transactions',
  loadComponent: () =>
    import('./features/transactions/transaction-list/transaction-list.page')
      .then(m => m.TransactionListPage),
},
```

## Parámetros de URL como Inputs

`withComponentInputBinding()` debe estar en `provideRouter()` — sin él, los route params no llegan como `input()`.

```typescript
// app.config.ts
provideRouter(routes, withComponentInputBinding())

// En el componente de la ruta — no hace falta ActivatedRoute
//COMENTARIO OBLIGATORIO: quien lo utiliza y para que
transactionId = input<string>();       // :transactionId del path
filter        = input<string>('all'); // ?filter=... query param
```

## Llamadas a servicios externos 

```typescript
  private http = inject(HttpClient);

  constructor() { }

  getProducts(category_id?: string) {
    const url = new URL(`https://api.escuelajs.co/api/v1/products`);
    if (category_id) {
      url.searchParams.set('categoryId', category_id);
    }
    return this.http.get<Product[]>(url.toString());
  }

// ❌ obsoleto — no usar en código nuevo
  private async _executeSignIn(): Promise<string | null> {
    try {
      const jwt = this.generateJWT();
      const response: any = await firstValueFrom(
        this.bareHttp.post(
          'https://oauth2.googleapis.com/token',
          new HttpParams()
            .set('grant_type', 'urn:ietf:params:oauth:grant-type:jwt-bearer')
            .set('assertion', jwt),
          { headers: new HttpHeaders({ 'Content-Type': 'application/x-www-form-urlencoded' }) },
        ),
      );

      this.accessToken = response.access_token;
      this.tokenExpiry = Date.now() + response.expires_in * 1000 - 60_000;
      return this.accessToken;
    } catch (error) {
      console.error('[AuthService] Error obteniendo access_token de SA:', error);
      throw error;
    }
  }
```


## Lifecycle hooks — orden correcto

1. `ngOnInit` — dispatch de acciones NgRx, setup inicial.
2. `ngOnChanges` — reaccionar a cambios de `input()` (route params que cambian en el mismo componente), y eventos como (click) u otros.
3. `ngAfterViewInit` — acceso a `@ViewChild`, inicializar Chart.js.
4. `ngOnDestroy` — cleanup de subscripciones manuales (si las hay).

## Restricciones

- No `NgModule` en componentes nuevos.
- No `async pipe` — usar `toSignal()`.
- No `*ngIf` / `*ngFor` — usar `@if` / `@for`.
- No constructor injection — usar `inject()`.
- No `@Input()` / `@Output()` legacy — usar `input()` / `output()` en código nuevo.
- No `ChangeDetectionStrategy.Default` — siempre `OnPush`.
- No guards ni resolvers de routing — la lógica de acceso va en `AuthService` + redirect en `ngOnInit`.
- No interceptores HTTP — las cabeceras de auth las construye `SheetsApiService` directamente.
- No llamadas directas a Sheets API desde componentes — solo vía Effects → `SheetsApiService`.
