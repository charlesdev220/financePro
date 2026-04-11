/**
 * sheets.service.js
 * Adapted from proyectoSalomon2/lib/google_sheets.ts
 * Server-side only — private key never leaves this process.
 */
const { google } = require('googleapis');
require('dotenv').config();

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

function getAuthClient() {
  const email      = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!email || !privateKey) {
    throw new Error('Faltan credenciales: GOOGLE_SERVICE_ACCOUNT_EMAIL o GOOGLE_PRIVATE_KEY');
  }

  return new google.auth.JWT({ email, key: privateKey, scopes: SCOPES });
}

function getSheetsClient() {
  return google.sheets({ version: 'v4', auth: getAuthClient() });
}

const SPREADSHEET_ID = () => {
  const id = process.env.GOOGLE_SHEETS_ID;
  if (!id) throw new Error('Falta GOOGLE_SHEETS_ID en .env');
  return id;
};

/**
 * Lee un rango de la hoja.
 * @param {string} range  Ej: 'TRANSACTIONS!A:O' o 'CATEGORIES!A2:I'
 */
async function getRange(range) {
  const sheets = getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID(),
    range,
  });
  return {
    range: res.data.range,
    values: res.data.values ?? [],
  };
}

/**
 * Añade filas al final de un rango.
 * @param {string}     range   Ej: 'TRANSACTIONS!A:O'
 * @param {unknown[][]} values  Array de arrays (filas)
 */
async function appendRow(range, values) {
  const sheets = getSheetsClient();
  const res = await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID(),
    range,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values },
  });
  return res.data;
}

/**
 * Sobreescribe un rango específico.
 * @param {string}     range   Ej: 'TRANSACTIONS!A2:O2'
 * @param {unknown[][]} values
 */
async function updateRow(range, values) {
  const sheets = getSheetsClient();
  const res = await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID(),
    range,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values },
  });
  return res.data;
}

/**
 * Limpia un rango (borrado lógico).
 * @param {string} range  Ej: 'TRANSACTIONS!A2:O2'
 */
async function clearRange(range) {
  const sheets = getSheetsClient();
  const res = await sheets.spreadsheets.values.clear({
    spreadsheetId: SPREADSHEET_ID(),
    range,
  });
  return res.data;
}

/**
 * Inicializa las 8 hojas con sus encabezados (idempotente).
 * Crea las tabs si no existen, luego escribe los encabezados.
 */
async function initDatabase() {
  const schema = {
    USERS:         ['user_id','email','display_name','default_currency','period_start_day','created_at'],
    WALLETS:       ['wallet_id','user_id','name','currency','balance','color','icon','is_default','created_at'],
    CATEGORIES:    ['category_id','user_id','name','icon','color','type','budget_amount','budget_period','is_active'],
    TRANSACTIONS:  ['tx_id','user_id','wallet_id','category_id','amount','currency','amount_base','concept','date','type','is_recurring','recurrence_rule','notes','created_at','updated_at'],
    BUDGETS:       ['budget_id','user_id','category_id','period','spent_amount','budget_amount','status','last_updated'],
    CURRENCIES:    ['currency_code','name','rate_to_base','last_updated','source'],
    CONCEPTS:      ['concept_id','user_id','category_id','text','usage_count','last_used'],
    USER_SETTINGS: ['setting_id','user_id','key','value'],
  };

  const client = getSheetsClient();
  const ssId   = SPREADSHEET_ID();

  // 1. Obtener tabs existentes
  const meta = await client.spreadsheets.get({ spreadsheetId: ssId });
  const existingSheets = new Set(meta.data.sheets.map(s => s.properties.title));

  // 2. Crear tabs que falten
  const toCreate = Object.keys(schema).filter(name => !existingSheets.has(name));
  if (toCreate.length > 0) {
    await client.spreadsheets.batchUpdate({
      spreadsheetId: ssId,
      requestBody: {
        requests: toCreate.map(title => ({ addSheet: { properties: { title } } })),
      },
    });
  }

  // 3. Escribir encabezados en todas las hojas
  const results = [];
  for (const [sheetName, headers] of Object.entries(schema)) {
    await client.spreadsheets.values.update({
      spreadsheetId: ssId,
      range: `${sheetName}!A1`,
      valueInputOption: 'RAW',
      requestBody: { values: [headers] },
    });
    results.push(sheetName);
  }

  return results;
}

module.exports = { getRange, appendRow, updateRow, clearRange, initDatabase };
