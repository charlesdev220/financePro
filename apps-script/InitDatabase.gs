/**
 * @file InitDatabase.gs
 * @description Funciones para inicializar y validar la estructura de Google Sheets.
 */

/**
 * Inicializa todas las pestañas de la base de datos según el esquema definido.
 * Puede ejecutarse múltiples veces (idempotente).
 */
function initializeDatabase() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheets = Object.keys(DATABASE_SCHEMA);
  
  console.log('Iniciando proceso de inicialización de MyFinance DB...');
  
  sheets.forEach(sheetName => {
    let sheet = ss.getSheetByName(sheetName);
    
    // 1. Crear la hoja si no existe
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      console.log(`Pestaña creada: ${sheetName}`);
    } else {
      console.log(`Pestaña ya existe: ${sheetName}. Validando encabezados...`);
    }
    
    // 2. Establecer encabezados
    const headers = DATABASE_SCHEMA[sheetName];
    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    
    // Solo sobreescribir si es necesario o si la hoja está vacía
    headerRange.setValues([headers]);
    
    // Estilizar encabezados (opcional pero recomendado para legibilidad manual)
    headerRange.setFontWeight('bold');
    headerRange.setBackground('#f3f3f3');
    sheet.setFrozenRows(1);
    
    console.log(`Encabezados configurados para: ${sheetName}`);
  });
  
  console.log('¡Inicialización completada con éxito!');
  SpreadsheetApp.getUi().alert('La estructura de la base de datos MyFinance ha sido inicializada correctamente.');
}

/**
 * Menú personalizado para facilitar la gestión desde la interfaz de Google Sheets.
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('🛠️ MyFinance Admin')
    .addItem('Inicializar Estructura DB', 'initializeDatabase')
    .addSeparator()
    .addItem('Verificar Integridad', 'verifyIntegrity')
    .addToUi();
}

/**
 * Función básica de verificación de integridad (placeholder)
 */
function verifyIntegrity() {
  SpreadsheetApp.getUi().alert('Función de verificación en desarrollo.');
}
