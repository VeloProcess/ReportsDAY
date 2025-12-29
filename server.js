/**
 * Servidor HTTP simples para servir o frontend na porta 8080
 * 55SYSTEM - ReportsDAY Frontend
 */

import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = 8080;

// Serve arquivos estáticos da pasta atual
app.use(express.static(__dirname));

// Rota para index.html
app.get('/', (req, res) => {
  res.sendFile(join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log('\n');
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║              ReportsDAY - Frontend                        ║');
  console.log(`║           ✅ SERVIDOR RODANDO NA PORTA ${PORT}              ║`);
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log('\n');
  console.log(`🌐 Acesse: http://localhost:${PORT}`);
  console.log('\n');
});

