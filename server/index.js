/**
 * index.js — MyFinance API Server
 * Express wrapper around sheets.service.js (googleapis + service account).
 * Corre en puerto 3001. El frontend Ionic lo llama desde localhost:8100.
 */
require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const sheets  = require('./sheets.service');

const app  = express();
const PORT = process.env.PORT ?? 3001;

// ── Middleware ──────────────────────────────────────────────────────────────
app.use(cors({ origin: ['http://localhost:8100', 'http://localhost:4200'] }));
app.use(express.json());

// ── Health check ────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', spreadsheetId: process.env.GOOGLE_SHEETS_ID });
});

// ── Lectura ─────────────────────────────────────────────────────────────────
// GET /api/sheets/values?range=TRANSACTIONS!A:O
app.get('/api/sheets/values', async (req, res) => {
  const { range } = req.query;
  if (!range) return res.status(400).json({ error: 'Falta el parámetro ?range=' });

  try {
    const data = await sheets.getRange(range);
    res.json(data);
  } catch (err) {
    console.error('[GET /api/sheets/values]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Escritura: append ────────────────────────────────────────────────────────
// POST /api/sheets/append
// Body: { range: 'TRANSACTIONS!A:O', values: [[...]] }
app.post('/api/sheets/append', async (req, res) => {
  const { range, values } = req.body;
  if (!range || !values) return res.status(400).json({ error: 'Faltan range o values' });

  try {
    const data = await sheets.appendRow(range, values);
    res.json(data);
  } catch (err) {
    console.error('[POST /api/sheets/append]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Escritura: update ────────────────────────────────────────────────────────
// PUT /api/sheets/values
// Body: { range: 'TRANSACTIONS!A2:O2', values: [[...]] }
app.put('/api/sheets/values', async (req, res) => {
  const { range, values } = req.body;
  if (!range || !values) return res.status(400).json({ error: 'Faltan range o values' });

  try {
    const data = await sheets.updateRow(range, values);
    res.json(data);
  } catch (err) {
    console.error('[PUT /api/sheets/values]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Borrado lógico: clear ────────────────────────────────────────────────────
// DELETE /api/sheets/values?range=TRANSACTIONS!A2:O2
app.delete('/api/sheets/values', async (req, res) => {
  const { range } = req.query;
  if (!range) return res.status(400).json({ error: 'Falta el parámetro ?range=' });

  try {
    const data = await sheets.clearRange(range);
    res.json(data);
  } catch (err) {
    console.error('[DELETE /api/sheets/values]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Inicializar DB ────────────────────────────────────────────────────────────
// POST /api/sheets/init
app.post('/api/sheets/init', async (_req, res) => {
  try {
    const initialized = await sheets.initDatabase();
    res.json({ success: true, sheets: initialized });
  } catch (err) {
    console.error('[POST /api/sheets/init]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`✅ MyFinance API escuchando en http://localhost:${PORT}`);
  console.log(`   Spreadsheet: ${process.env.GOOGLE_SHEETS_ID}`);
});
