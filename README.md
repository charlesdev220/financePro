# MyFinance

Aplicación móvil de finanzas personales construida con Ionic + Angular, respaldada por Google Sheets como base de datos. El usuario se autentica con su cuenta Google y accede a sus datos sin conocer la fuente subyacente.

## Stack

| Capa | Tecnología | Versión |
|---|---|---|
| Frontend móvil | Ionic + Angular | v8 / v20 standalone |
| Estado global | NgRx | v21 |
| Base de datos | Google Sheets API v4 | REST + OAuth2 usuario |
| Nativo | Capacitor | v8 |

## Arquitectura

```
Usuario
  │
  ▼
Google OAuth2 (openid + email + spreadsheets)
  │
  ▼
Angular — SheetsApiService (único punto de acceso)
  │         ├── crypto.service.ts  → cifra/descifra PII con AES-GCM (Web Crypto API)
  │         └── Bearer token del usuario en cada request
  │
  ▼
Google Sheets API v4
  │
  ▼
Google Spreadsheet (ID en environment.ts — no expuesto en UI)
```

No hay servidor Express. No hay Service Account. No hay Google Apps Script.
Toda la lógica de negocio reside en servicios Angular.

## Estructura

```
FinancePro/
└── src/app/
    ├── core/
    │   ├── guards/            # auth.guard.ts
    │   ├── interceptors/      # auth.interceptor.ts, error.interceptor.ts
    │   └── services/
    │       ├── auth.service.ts         # Google OAuth2 (GIS)
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
  googleClientId: 'TU_CLIENT_ID.apps.googleusercontent.com',
  spreadsheetId: 'TU_SPREADSHEET_ID',
  currencyApiKey: 'TU_CURRENCY_API_KEY',
};
```

### 2. Google Cloud Console

1. Crear proyecto en [Google Cloud Console](https://console.cloud.google.com)
2. Habilitar **Google Sheets API v4**
3. Crear credencial OAuth2 → tipo "Aplicación web"
4. Añadir `http://localhost:8100` a orígenes autorizados y URIs de redirección
5. Copiar el `CLIENT_ID` al `environment.ts`

### 3. Google Sheets

1. Crear un Spreadsheet con las 8 hojas: `USERS`, `WALLETS`, `CATEGORIES`, `TRANSACTIONS`, `BUDGETS`, `CURRENCIES`, `CONCEPTS`, `USER_SETTINGS`
2. Compartir como **"Cualquier persona con cuenta Google puede editar"**
3. Copiar el ID del Spreadsheet al `environment.ts`

### 4. Arrancar la app

```bash
npm install
npm start

npx ng test --watch=false --browsers=ChromeHeadless 2>&1 | tail -30
# → http://localhost:8100
```

## Seguridad y PII

Los campos sensibles del usuario (`email`, `display_name`) se cifran con **AES-GCM** antes de escribirse en Sheets y se descifran al leer. La clave se deriva del `sub` de Google del usuario mediante PBKDF2 (Web Crypto API). El access_token nunca se persiste — solo in-memory.

## Tests

```bash
npm test
```

## CI/CD

GitHub Actions en `.github/workflows/ci.yml`: lint → test → build en Node 20.
