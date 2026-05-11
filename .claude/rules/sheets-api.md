# Reglas Sheets API + Seguridad — MyFinance

## Arquitectura de datos — una pestaña por entidad

| Pestaña | Prefijo ID | Descripción |
|---------|-----------|-------------|
| `USERS` | `usr_` | Perfil del usuario (PII cifrado) |
| `WALLETS` | `wal_` | Carteras / cuentas |
| `CATEGORIES` | `cat_` | Categorías de transacción |
| `TRANSACTIONS` | `tx_` | Movimientos financieros |
| `BUDGETS` | `bgt_` | Presupuestos por categoría |
| `CURRENCIES` | `cur_` | Tasas de cambio cacheadas |
| `CONCEPTS` | `con_` | Conceptos únicos por usuario |
| `USER_SETTINGS` | — | Preferencias del usuario |

- **Fila 1 siempre headers**. Los datos comienzan en la fila 2.
- IDs generados con `crypto.randomUUID()` en el cliente, prefijados según la tabla.
- `user_id` (el `sub` de Google) como FK en todas las tablas — nunca cifrado.

## SheetsApiService — puerta única de entrada

```typescript
// src/app/core/services/sheets-api.service.ts
@Injectable({ providedIn: 'root' })
export class SheetsApiService {
  private http   = inject(HttpClient);
  private auth   = inject(AuthService);
  private etags  = new Map<string, string>();   // ETag por rango

  private get headers(): HttpHeaders {
    return new HttpHeaders({
      Authorization: `Bearer ${this.auth.accessToken}`,
    });
  }

  getRange<T>(spreadsheetId: string, range: string): Observable<T[]> {
    const etag = this.etags.get(range);
    const headers = etag
      ? this.headers.set('If-None-Match', etag)
      : this.headers;

    return this.http.get<SheetsResponse>(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`,
      { headers, observe: 'response' },
    ).pipe(
      tap(res => {
        if (res.headers.get('ETag')) {
          this.etags.set(range, res.headers.get('ETag')!);
        }
      }),
      map(res => this.parseRows<T>(res.body!)),
    );
  }

  appendRow(spreadsheetId: string, range: string, values: unknown[][]): Observable<void> {
    return this.http.post<void>(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}:append?valueInputOption=RAW`,
      { values },
      { headers: this.headers },
    );
  }
}
```

**Reglas de uso:**
- `SheetsApiService` es el **único** servicio que llama a `googleapis.com`.
- `SPREADSHEET_ID` solo en `environment.ts` — nunca hardcodeado.

## Caché — ETag

```
GET /values/{range}                 → Sheets responde 200 + ETag header
GET /values/{range} + If-None-Match → Sheets responde 304 (sin body)

En 200: actualizar store NgRx + guardar ETag en Map
En 304: usar store NgRx tal cual, sin re-parsear
```

## Cifrado PII — crypto.service.ts

```typescript
// src/app/core/services/crypto.service.ts
@Injectable({ providedIn: 'root' })
export class CryptoService {
  async encrypt(plaintext: string, sub: string): Promise<string> { ... }
  async decrypt(ciphertext: string, sub: string): Promise<string> { ... }
}
```

**Reglas inamovibles:**
- `email` y `display_name` se cifran con **AES-GCM** antes de escribirse en Sheets.
- La clave se deriva del `sub` de Google mediante **PBKDF2** (100.000 iteraciones, SHA-256).
- `crypto.service.ts` es el **único** servicio autorizado para cifrar/descifrar. Ningún otro servicio toca PII en texto plano.
- El `access_token` **nunca se persiste** — solo in-memory en `AuthService`.
- `CLIENT_ID`, `SPREADSHEET_ID` y `CURRENCY_API_KEY` solo en `environment.ts`.

## Lógica de negocio calculada en Angular

| Campo | Calculado por | Cuándo |
|-------|--------------|--------|
| `amount_base` | `transaction.service.ts` | Al insertar, usando tasa de `currency-api.service.ts` |
| `status` del presupuesto | `budget.service.ts` | Al guardar cada transacción |
| Upsert de conceptos | `concepts.service.ts` | Al confirmar cada transacción |
| Transacciones recurrentes | `transaction.service.ts` | Al arranque de la app |

## Mapeo de filas — parseRows

```typescript
// Sheets devuelve arrays de strings, no objetos
// Mapear posición de columna → campo del modelo

// Ejemplo TRANSACTIONS
private parseTransaction(row: string[]): Transaction {
  return {
    id:          row[0],
    user_id:     row[1],
    wallet_id:   row[2],
    amount:      Number(row[3]),
    amount_base: Number(row[4]),
    currency:    row[5],
    type:        row[6] as TransactionType,
    category_id: row[7],
    date:        row[8],
    description: row[9],
  };
}
```

## Seguridad — reglas absolutas

- PII (`email`, `display_name`) **nunca** a APIs externas de IA.
- `access_token` de Google: solo in-memory. Nunca en `localStorage`.
- Prohibido `innerHTML` sin `DomSanitizer`.
- Scopes OAuth2 mínimos: `openid email https://www.googleapis.com/auth/spreadsheets`.
