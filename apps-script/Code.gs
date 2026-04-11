/**
 * @file Code.gs
 * @description Punto de entrada principal para peticiones HTTP (Web App).
 * Arquitectura: Frontend → Apps Script → SpreadsheetApp → Google Sheets.
 * El service account (cuando se necesite para Gemini) vive en Script Properties,
 * nunca en el código ni en el frontend.
 */

const SPREADSHEET_ID = '1r27a0iUJGm89xFh-7eggEz3mefCCkDePtI_BcxB-BH8';

/**
 * GET — health check y lecturas simples por query param.
 * Uso: ?action=ping | ?action=read&sheet=TRANSACTIONS
 */
function doGet(e) {
  const action = e && e.parameter && e.parameter.action;

  if (action === 'read') {
    const sheetName = e.parameter.sheet;
    return handleRead({ sheet: sheetName });
  }

  return response({ status: 'online', message: 'MyFinance Apps Script API v1', timestamp: new Date().toISOString() });
}

/**
 * POST — escrituras con lógica de negocio y lecturas complejas.
 * Body: { action: string, ...payload }
 */
function doPost(e) {
  try {
    const req = JSON.parse(e.postData.contents);

    switch (req.action) {

      // ── Lecturas ─────────────────────────────────────────────────────────
      case 'READ':
        return handleRead(req);

      // ── Escrituras ───────────────────────────────────────────────────────
      case 'IMPORT':
        return handleImport(req);

      // ── Utilidades ───────────────────────────────────────────────────────
      case 'TEST_CONN':
        return response({ success: true, message: 'Conexión exitosa', spreadsheetId: SPREADSHEET_ID });

      case 'INIT_DB':
        initializeDatabase();
        return response({ success: true, message: 'Base de datos inicializada' });

      default:
        return response({ success: false, error: `Acción no reconocida: ${req.action}` }, 400);
    }

  } catch (err) {
    console.error('[doPost] Error:', err);
    return response({ success: false, error: err.toString() }, 500);
  }
}

/**
 * Lectura de una hoja completa.
 * @param {Object} req - { sheet: string, fromRow?: number }
 */
function handleRead(req) {
  const sheetName = req.sheet;
  const allowedSheets = Object.keys(DATABASE_SCHEMA);

  if (!sheetName || !allowedSheets.includes(sheetName)) {
    return response({ success: false, error: `Sheet no permitida: ${sheetName}` }, 400);
  }

  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(sheetName);

    if (!sheet) {
      return response({ success: false, error: `Sheet no encontrada: ${sheetName}` }, 404);
    }

    const lastRow = sheet.getLastRow();
    if (lastRow < 2) {
      // Solo encabezados — devolver vacío
      return response({ success: true, sheet: sheetName, headers: DATABASE_SCHEMA[sheetName], rows: [] });
    }

    const headers = DATABASE_SCHEMA[sheetName];
    const dataRange = sheet.getRange(2, 1, lastRow - 1, headers.length);
    const rows = dataRange.getValues();

    return response({ success: true, sheet: sheetName, headers, rows });

  } catch (err) {
    console.error(`[handleRead] Error leyendo ${sheetName}:`, err);
    return response({ success: false, error: err.toString() }, 500);
  }
}

/**
 * Helper: formatea respuesta JSON.
 */
function response(data, code = 200) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
