# ReportsDAY - Painel de Monitoramento

Painel web para monitoramento do sistema 55SYSTEM ETL.

## 🚀 Deploy na Vercel

### 1. Criar repositório no GitHub
- Crie um novo repositório
- Faça push desta pasta

### 2. Conectar na Vercel
- Acesse [vercel.com](https://vercel.com)
- Importe o repositório do GitHub
- Configure o **Root Directory** para: `FRONT-END PAINEL`
- Deploy!

### 3. Configurar Backend
Após o deploy, edite o arquivo `js/app.js` e altere a URL do backend:

```javascript
const BACKEND_URL = isProduction 
  ? 'https://seu-backend.onrender.com'  // <-- URL do seu backend
  : 'http://localhost:3000';
```

## 📁 Estrutura

```
FRONT-END PAINEL/
├── index.html      # Página principal
├── css/
│   └── style.css   # Estilos
├── js/
│   └── app.js      # Lógica do frontend
├── vercel.json     # Config Vercel
└── README.md       # Este arquivo
```

## 🔧 Funcionalidades

- ✅ Status do WhatsApp em tempo real
- ✅ Status do Redis
- ✅ Próximo disparo agendado
- ✅ Relatório D0 (KPIs do dia)
- ✅ Análise Histórica (15 dias)
- ✅ Histórico de execuções
- ✅ Console de logs em tempo real
- ✅ Disparo manual de relatório

## 🎨 Tema

Minimal Tech - Dark theme elegante e futurista.

---
**55SYSTEM** © 2024

