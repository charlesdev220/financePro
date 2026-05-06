/**
 * set-env.js — Lee .env y genera src/environments/environment.ts
 * Ejecutar: node scripts/set-env.js
 * Invocado automáticamente por prestart y prebuild en package.json
 */
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '../.env');
const outPath = path.join(__dirname, '../src/environments/environment.ts');

if (!fs.existsSync(envPath)) {
  console.error('[set-env] ERROR: .env no encontrado. Copiá .env.example → .env y rellená los valores.');
  process.exit(1);
}

// Parser minimal de .env (soporta valores sin comillas y con comillas dobles)
const raw = fs.readFileSync(envPath, 'utf-8');
const env = {};

for (const line of raw.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eqIdx = trimmed.indexOf('=');
  if (eqIdx === -1) continue;
  const key = trimmed.slice(0, eqIdx).trim();
  let value = trimmed.slice(eqIdx + 1).trim();
  if ((value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1);
  }
  env[key] = value;
}

const required = ['GOOGLE_SERVICE_ACCOUNT_EMAIL', 'GOOGLE_PRIVATE_KEY', 'SPREADSHEET_ID', 'CURRENCY_API_KEY'];
const missing = required.filter(k => !env[k]);
if (missing.length) {
  console.error(`[set-env] ERROR: Faltan variables en .env: ${missing.join(', ')}`);
  process.exit(1);
}

const vars = {
  googleServiceAccountEmail: env['GOOGLE_SERVICE_ACCOUNT_EMAIL'],
  googlePrivateKey: env['GOOGLE_PRIVATE_KEY'],
  spreadsheetId: env['SPREADSHEET_ID'],
  currencyApiKey: env['CURRENCY_API_KEY'],
};

const devContent = `// AUTO-GENERATED — no editar manualmente. Fuente: .env
// Regenerar: npm run set-env
export const environment = ${JSON.stringify({ production: false, ...vars }, null, 2)};
`;

const prodContent = `// AUTO-GENERATED — no editar manualmente. Fuente: .env
// Regenerar: npm run set-env
export const environment = ${JSON.stringify({ production: true, ...vars }, null, 2)};
`;

const prodPath = path.join(__dirname, '../src/environments/environment.prod.ts');

fs.writeFileSync(outPath, devContent);
fs.writeFileSync(prodPath, prodContent);
console.log('[set-env] environment.ts y environment.prod.ts generados correctamente.');
