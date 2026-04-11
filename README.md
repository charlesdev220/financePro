# MyFinance

Aplicación móvil de finanzas personales construida con Ionic + Angular, respaldada por Google Sheets como base de datos.

## Stack

| Capa | Tecnología | Versión |
|---|---|---|
| Frontend móvil | Ionic + Angular | v8 / v20 standalone |
| Estado global | NgRx | v21 |
| API Server | Node.js + Express | v4 |
| Base de datos | Google Sheets API v4 | Service Account JWT |
| Nativo | Capacitor | v8 |

## Arquitectura

```
Ionic Frontend (port 8100)
        │
        │ HTTP → SheetsApiService
        ▼
  Express API (port 3001)   ← server/index.js
        │
        │ googleapis + JWT service account
        ▼
  Google Sheets API v4
```

La private key del service account vive únicamente en `server/.env` — nunca en el bundle Angular.

## Estructura

```
FinancePro/
├── frontend/          # Ionic + Angular app
│   └── src/app/
│       ├── core/      # guards, interceptors, services
│       ├── features/  # pages por feature (lazy loaded)
│       ├── models/    # interfaces de dominio
│       ├── shared/    # componentes reutilizables
│       └── store/     # NgRx slices (transactions, wallets, budgets)
├── server/            # Express API — proxy seguro a Google Sheets
│   ├── index.js       # rutas REST
│   ├── sheets.service.js  # googleapis + service account
│   └── .env           # credenciales (gitignored)
└── tools/
    └── data-import/   # scripts de importación Monefy + BBVA CSV
```

## Setup

### Requisitos

- Node.js 20+
- npm 10+

### 1. API Server

```bash
cd server
npm install
cp .env.example .env   # completar con credenciales del service account
node index.js
# → http://localhost:3001
```

Variables requeridas en `server/.env`:

```
GOOGLE_SERVICE_ACCOUNT_EMAIL=...
GOOGLE_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n..."
GOOGLE_SHEETS_ID=1euG0ltec2DIX-dRTaB2Y9Lvs0Jk1FHgSDyKoeCKWRXs
PORT=3001
```

### 2. Frontend

```bash
cd frontend
npm install --legacy-peer-deps
npm start
# → http://localhost:8100
```

### 3. Inicializar hojas (primera vez)

```bash
curl -X POST http://localhost:3001/api/sheets/init
```

Crea las 8 tabs con sus encabezados de forma idempotente: `USERS`, `WALLETS`, `CATEGORIES`, `TRANSACTIONS`, `BUDGETS`, `CURRENCIES`, `CONCEPTS`, `USER_SETTINGS`.

## API Server — Endpoints

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/health` | Estado del servidor |
| `GET` | `/api/sheets/values?range=SHEET!A:Z` | Leer un rango |
| `POST` | `/api/sheets/append` | Añadir filas al final |
| `PUT` | `/api/sheets/values` | Sobreescribir un rango |
| `DELETE` | `/api/sheets/values?range=SHEET!A2:Z2` | Limpiar un rango |
| `POST` | `/api/sheets/init` | Inicializar estructura de la base de datos |

## Tests

```bash
cd frontend
npm test
```

11 spec files cubren guards, interceptors, services, reducers y selectors con fixtures de datos reales (Monefy + BBVA).

## CI/CD

GitHub Actions en `.github/workflows/ci.yml`: lint → test → build en Node 20.
