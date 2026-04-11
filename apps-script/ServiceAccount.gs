/**
 * @file ServiceAccount.gs
 * @description Utilidades para acceso autenticado vía Service Account.
 *
 * Las credenciales se guardan en Script Properties (cifradas, server-side).
 * NUNCA hardcodear aquí ni en environment.ts del frontend.
 *
 * Para configurar en Apps Script editor:
 *   Project Settings → Script Properties → Add:
 *     SERVICE_ACCOUNT_EMAIL = podcast-bot@gen-lang-client-0094150639.iam.gserviceaccount.com
 *     SERVICE_ACCOUNT_KEY   = -----BEGIN PRIVATE KEY-----\n...
 *     GEMINI_API_KEY        = AIzaSy...
 *
 * Uso actual: reservado para integración con Gemini API (Fase futura).
 * Apps Script accede a Sheets directamente vía SpreadsheetApp.openById() —
 * no necesita Service Account para eso.
 */

/**
 * Genera un access token OAuth2 usando el service account.
 * Útil para llamadas a APIs de Google desde Apps Script
 * que requieren identidad de service account (ej: Gemini, Cloud Storage).
 *
 * @returns {string} Bearer token válido por ~1 hora.
 */
function getServiceAccountToken() {
  const props = PropertiesService.getScriptProperties();
  const email = props.getProperty('SERVICE_ACCOUNT_EMAIL');
  const rawKey = props.getProperty('SERVICE_ACCOUNT_KEY');

  if (!email || !rawKey) {
    throw new Error('[ServiceAccount] Credenciales no configuradas en Script Properties.');
  }

  const scope = 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/cloud-platform';
  const now = Math.floor(Date.now() / 1000);

  const header = Utilities.base64EncodeWebSafe(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claim  = Utilities.base64EncodeWebSafe(JSON.stringify({
    iss: email,
    scope,
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  }));

  const privateKey = rawKey.replace(/\\n/g, '\n');
  const signature  = Utilities.base64EncodeWebSafe(
    Utilities.computeRsaSha256Signature(`${header}.${claim}`, privateKey)
  );

  const jwt = `${header}.${claim}.${signature}`;

  const tokenRes = UrlFetchApp.fetch('https://oauth2.googleapis.com/token', {
    method: 'post',
    contentType: 'application/x-www-form-urlencoded',
    payload: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
    muteHttpExceptions: true,
  });

  const tokenData = JSON.parse(tokenRes.getContentText());

  if (!tokenData.access_token) {
    throw new Error(`[ServiceAccount] Token error: ${JSON.stringify(tokenData)}`);
  }

  return tokenData.access_token;
}

/**
 * Obtiene la Gemini API Key desde Script Properties.
 * @returns {string}
 */
function getGeminiApiKey() {
  const key = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  if (!key) throw new Error('[ServiceAccount] GEMINI_API_KEY no configurada en Script Properties.');
  return key;
}
