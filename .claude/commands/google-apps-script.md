# Skill: Google Apps Script

Estándares para el desarrollo de la lógica de servidor en MyFinance.

## Estructura de Proyecto

Los scripts viven en el directorio `apps-script/` y se versionan como `.gs`.

```
apps-script/
├── Code.gs                # Router (doGet/doPost)
├── TransactionsHandler.gs # Lógica de transacciones
├── BudgetHandler.gs       # Lógica de presupuestos
├── ConceptsHandler.gs     # Autocompletado
└── utils.gs               # Funciones compartidas (Logger, Auth)
```

## Router Principal (`Code.gs`)

```javascript
function doPost(e) {
  const request = JSON.parse(e.postData.contents);
  const action = request.action;
  
  switch(action) {
    case 'ADD_TRANSACTION':
      return TransactionsHandler.add(request.payload);
    case 'SYNC_BUDGETS':
      return BudgetHandler.sync();
    default:
      return ContentService.createTextOutput(JSON.stringify({ error: 'Action not found' }))
        .setMimeType(ContentService.MimeType.JSON);
  }
}
```

## Patrón de Handler

```javascript
const TransactionsHandler = {
  add: function(data) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('TRANSACTIONS');
    
    // 1. Calcular amount_base usando CURRENCIES
    const baseAmount = calculateBase(data.amount, data.currency);
    
    // 2. Insertar fila
    sheet.appendRow([
      data.tx_id,
      data.user_id,
      // ... más columnas
      baseAmount
    ]);
    
    // 3. Trigger de actualización de presupuesto
    BudgetHandler.update(data.category_id, data.date);
    
    return ContentService.createTextOutput(JSON.stringify({ success: true }))
      .setMimeType(ContentService.MimeType.JSON);
  }
};
```

## Reglas de Desarrollo
- **Manejo de errores**: Cada handler debe estar envuelto en un `try-catch` y devolver un JSON con el mensaje de error si algo falla.
- **Tipado dinámico**: Aunque es JavaScript, se debe documentar el esquema esperado de entrada vía JSDoc.
- **Sin dependencias**: Apps Script es un entorno restringido. No intentar usar librerías de npm incompatibles.
- **Sincronización**: Usar siempre `clasp push` para desplegar. Nunca editar en el dashboard de Google Apps Script directamente.

## Pruebas
- Implementar funciones `testAddTransaction()` dentro de un archivo `Tests.gs` (no sincronizar a producción si es posible) para validar la lógica antes de conectar con el frontend.
