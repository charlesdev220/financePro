# Skill: Google Sheets API v4

Patrones de integración con Google Sheets como almacén de datos.

## Modelo de Datos (Sheets to TypeScript)

Cada pestaña en Google Sheets se mapea a una interfaz en `src/app/models/`.

```typescript
// src/app/models/transaction.model.ts
export interface ITransaction {
  tx_id: string;
  user_id: string;
  wallet_id: string;
  category_id: string;
  amount: number;
  currency: string;
  amount_base: number; // Calculado por Apps Script
  concept: string;
  date: string; // YYYY-MM-DD
  type: 'income' | 'expense';
  is_recurring: boolean;
  notes?: string;
}
```

## Patrón SheetsApiService (Frontend)

Capa de abstracción que maneja la autenticación OAuth2 y las peticiones `HttpClient`.

```typescript
@Injectable({ providedIn: 'root' })
export class SheetsApiService {
  private http = inject(HttpClient);
  private spreadsheetId = environment.SPREADSHEET_ID;

  // Lectura de rango (A2:Z)
  getRows(sheetName: string): Observable<any[][]> {
    const range = `${sheetName}!A2:Z`;
    return this.http.get<any>(`https://sheets.googleapis.com/v4/spreadsheets/${this.spreadsheetId}/values/${range}`);
  }
}
```

## Reglas de Gestión de Datos
- **Lectura simple**: Usar `getRows()` directamente desde el componente (vía `toSignal`).
- **Escritura**: Las operaciones de escritura que requieran lógica relacional (como añadir una transacción y actualizar el presupuesto) deben realizarse a través de `AppsScriptService`.
- **Nombres de pestañas**: Deben ser en MAYÚSCULAS y en plural (`TRANSACTIONS`, `WALLETS`).
- **Caché**: Implementar caché reactiva con `BehaviorSubject` o `NgRx` para evitar exceder las cuotas de la API de Google.

## ID Generation
- Los IDs se generan en el cliente o servidor con el prefijo correspondiente.
- Ejemplo: `tx_${Date.now()}`.

## Errores y Cuotas
- Manejar errores `429` (Too Many Requests) con un interceptor de reintento exponencial.
- Si el error persiste, notificar al usuario sobre el límite de cuota de Google Cloud.
