# MyFinance

Aplicación móvil de finanzas personales construida con Ionic + Angular, respaldada por Google Sheets como base de datos. La aplicación utiliza un modelo híbrido: una **Service Account** para el acceso técnico a la API y un **Login Local** (Email/Password) para la identificación y aislamiento de datos de cada usuario.

## Stack

| Capa | Tecnología | Versión |
|---|---|---|
| Frontend móvil | Ionic + Angular | v8 / v20 standalone |
| Estado global | NgRx | v21 |
| Base de datos | Google Sheets API v4 | REST + Service Account JWT |
| Nativo | Capacitor | v8 |

## Arquitectura

```
Usuario (Login/Registro local)
  │
  ▼
Service Account (JWT Signing via jsrsasign/Web Crypto API)
  │
  ▼
Angular — SheetsApiService (único punto de acceso)
  │         ├── crypto.service.ts  → cifra/descifra PII con AES-GCM (Web Crypto API)
  │         └── Bearer token automático en cada request
  │
  ▼
Google Sheets API v4 (Filtrada por email de usuario)
  │
  ▼
Google Spreadsheet (ID en environment.ts — no expuesto en UI)
```

No hay servidor Express. No hay Google Apps Script. 
Toda la lógica de negocio reside en servicios Angular. El login es automático usando una cuenta de servicio.

## Estructura

```
FinancePro/
└── src/app/
    ├── core/
    │   ├── guards/            # auth.guard.ts
    │   ├── interceptors/      # auth.interceptor.ts, error.interceptor.ts
    │   └── services/
    │       ├── auth.service.ts         # Service Account JWT (Auto-login)
    │       ├── sheets-api.service.ts   # ÚNICA puerta a Sheets API v4
    │       ├── crypto.service.ts       # Cifrado AES-GCM de PII (email, display_name)
    │       └── currency-api.service.ts # Tasas de cambio en tiempo real
    ├── features/              # pages lazy-loaded por dominio
    ├── models/                # interfaces TypeScript puras
    ├── shared/                # componentes, pipes y directivas reutilizables
    └── store/                 # NgRx slices (transactions, wallets, budgets)
```

## Setup

### Requisitos

- Node.js 20+
- npm 10+

### 1. Configurar environment

```typescript
// src/environments/environment.ts
export const environment = {
  production: false,
  googleServiceAccountEmail: 'tu-cuenta@proyecto.iam.gserviceaccount.com',
  googlePrivateKey: '-----BEGIN PRIVATE KEY-----\n...',
  spreadsheetId: 'TU_SPREADSHEET_ID',
  currencyApiKey: 'TU_CURRENCY_API_KEY',
};
```

### 2. Google Cloud Console

1. Crear proyecto en [Google Cloud Console](https://console.cloud.google.com)
2. Habilitar **Google Sheets API v4**
3. Crear una **Service Account** (Cuenta de Servicio)
4. Generar una **Clave JSON** para la cuenta de servicio
5. Copiar el `client_email` y la `private_key` al `environment.ts`

### 3. Google Sheets

1. Crear un Spreadsheet con las 8 hojas: `USERS`, `WALLETS`, `CATEGORIES`, `TRANSACTIONS`, `BUDGETS`, `CURRENCIES`, `CONCEPTS`, `USER_SETTINGS`
2. **Compartir la hoja con el email de la Service Account** con permisos de "Editor"
3. Copiar el ID del Spreadsheet al `environment.ts`

### 4. Arrancar la app

```bash
npm install
npm start
```

## Seguridad y PII

Los campos sensibles del usuario (`email`, `display_name`) se cifran con **AES-GCM** antes de escribirse en Sheets y se descifran al leer. La clave se deriva de un identificador persistente del dispositivo o cuenta mediante PBKDF2 (Web Crypto API). El token de acceso se obtiene automáticamente y nunca se persiste — solo in-memory.

## Tests

```bash
npm test

cd frontend && npm test -- --no-watch --browsers=ChromeHeadless


npx ng test --watch=false --browsers=ChromeHeadless 2>&1 | tail -30
# → http://localhost:8100
npm test

npx jest --coverage --testPathPattern="core/services|core/state|features.*services"

npx jest --coverage

```

## CI/CD

GitHub Actions en `.github/workflows/ci.yml`: lint → test → build en Node 20.
