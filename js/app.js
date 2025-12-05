/**
 * ReportsDAY - Painel de Monitoramento
 * 55SYSTEM
 * 
 * Front-end para monitorar o sistema ETL em tempo real
 */

// =============================================
// Configurações
// =============================================

// Detecta se está em produção ou desenvolvimento
const isProduction = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';

// URL do backend
const BACKEND_URL = isProduction 
  ? 'https://five5system-backend.onrender.com'
  : 'http://localhost:3000';

const CONFIG = {
  backendUrl: BACKEND_URL,
  wsUrl: BACKEND_URL.replace('https://', 'wss://').replace('http://', 'ws://') + '/ws',
  refreshInterval: 5000,
};

// =============================================
// Estado da Aplicação
// =============================================
const state = {
  ws: null,
  wsConnected: false,
  nextRunTime: null,
  countdownInterval: null,
  d0NextUpdate: null, // Próxima atualização do D0
  d0Data: null, // Dados atuais do D0
};

// =============================================
// Elementos DOM
// =============================================
const elements = {
  // Header
  clock: document.getElementById('clock'),
  wsStatus: document.getElementById('wsStatus'),
  
  // Status Cards
  whatsappStatus: document.getElementById('whatsappStatus'),
  qrContainer: document.getElementById('qrContainer'),
  qrCode: document.getElementById('qrCode'),
  redisStatus: document.getElementById('redisStatus'),
  cacheStatus: document.getElementById('cacheStatus'),
  cacheTTL: document.getElementById('cacheTTL'),
  apiStatus: document.getElementById('apiStatus'),
  
  // Schedule
  nextRunTime: document.getElementById('nextRunTime'),
  countdownHours: document.getElementById('countdownHours'),
  countdownMinutes: document.getElementById('countdownMinutes'),
  countdownSeconds: document.getElementById('countdownSeconds'),
  
  // History & Console
  historyList: document.getElementById('historyList'),
  console: document.getElementById('console'),
  
  // Buttons
  btnReconnectWpp: document.getElementById('btnReconnectWpp'),
  btnTrigger: document.getElementById('btnTrigger'),
  btnClearLogs: document.getElementById('btnClearLogs'),
  
  // Relatório D0
  d0LastUpdate: document.getElementById('d0LastUpdate'),
  d0TotalCalls: document.getElementById('d0TotalCalls'),
  d0Answered: document.getElementById('d0Answered'),
  d0AnsweredCount: document.getElementById('d0AnsweredCount'),
  d0Abandoned: document.getElementById('d0Abandoned'),
  d0AbandonedCount: document.getElementById('d0AbandonedCount'),
  d0RetainedURA: document.getElementById('d0RetainedURA'),
  d0RetainedCount: document.getElementById('d0RetainedCount'),
  d0PeakHour: document.getElementById('d0PeakHour'),
  d0PeakCount: document.getElementById('d0PeakCount'),
  d0AvgWait: document.getElementById('d0AvgWait'),
  d0BarAnswered: document.getElementById('d0BarAnswered'),
  d0BarAbandoned: document.getElementById('d0BarAbandoned'),
  d0BarURA: document.getElementById('d0BarURA'),
  d0NextUpdate: document.getElementById('d0NextUpdate'),
  
  // Análise Histórica
  analiseResumo: document.getElementById('analiseResumo'),
  analiseEmoji: document.getElementById('analiseEmoji'),
  analiseNivel: document.getElementById('analiseNivel'),
  analiseDescricao: document.getElementById('analiseDescricao'),
  analiseAtendBadge: document.getElementById('analiseAtendBadge'),
  analiseAtendHoje: document.getElementById('analiseAtendHoje'),
  analiseAtendMedia: document.getElementById('analiseAtendMedia'),
  analiseAtendBar: document.getElementById('analiseAtendBar'),
  analiseAbandBadge: document.getElementById('analiseAbandBadge'),
  analiseAbandHoje: document.getElementById('analiseAbandHoje'),
  analiseAbandMedia: document.getElementById('analiseAbandMedia'),
  analiseAbandBar: document.getElementById('analiseAbandBar'),
  analiseUraBadge: document.getElementById('analiseUraBadge'),
  analiseUraHoje: document.getElementById('analiseUraHoje'),
  analiseUraMedia: document.getElementById('analiseUraMedia'),
  analiseUraBar: document.getElementById('analiseUraBar'),
  analiseTotalBadge: document.getElementById('analiseTotalBadge'),
  analiseTotalHoje: document.getElementById('analiseTotalHoje'),
  analiseTotalMedia: document.getElementById('analiseTotalMedia'),
  analiseTotalBar: document.getElementById('analiseTotalBar'),
  analiseLastUpdate: document.getElementById('analiseLastUpdate'),
  btnRefreshAnalise: document.getElementById('btnRefreshAnalise'),
};

// =============================================
// Utilitários
// =============================================

/**
 * Formata hora atual no padrão HH:MM:SS
 */
function formatTime(date = new Date()) {
  return date.toLocaleTimeString('pt-BR', { hour12: false });
}

/**
 * Formata data/hora para exibição
 */
function formatDateTime(isoString) {
  const date = new Date(isoString);
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Atualiza o relógio do header
 */
function updateClock() {
  elements.clock.textContent = formatTime();
}

/**
 * Adiciona log no console
 */
function addLog(message, type = 'info') {
  const line = document.createElement('div');
  line.className = `console__line console__line--${type}`;
  line.innerHTML = `
    <span class="console__time">${formatTime()}</span>
    <span class="console__msg">${escapeHtml(message)}</span>
  `;
  
  elements.console.appendChild(line);
  elements.console.scrollTop = elements.console.scrollHeight;
  
  // Limita a 200 linhas
  while (elements.console.children.length > 200) {
    elements.console.removeChild(elements.console.firstChild);
  }
}

/**
 * Escapa HTML para prevenir XSS
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Atualiza indicador de status
 */
function updateStatusIndicator(element, status, text) {
  const dot = element.querySelector('.status-dot');
  const textEl = element.querySelector('.status-text');
  
  // Remove classes anteriores
  dot.className = 'status-dot';
  
  // Adiciona nova classe
  dot.classList.add(`status-dot--${status}`);
  textEl.textContent = text;
}

// =============================================
// WebSocket
// =============================================

/**
 * Conecta ao WebSocket do backend
 */
function connectWebSocket() {
  addLog('Conectando ao servidor...', 'info');
  updateWsStatus('connecting');
  
  try {
    state.ws = new WebSocket(CONFIG.wsUrl);
    
    state.ws.onopen = () => {
      state.wsConnected = true;
      updateWsStatus('online');
      addLog('Conectado ao servidor!', 'success');
      
      // Solicita status inicial
      sendWsMessage({ type: 'get_status' });
    };
    
    state.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        handleWsMessage(data);
      } catch (err) {
        console.error('Erro ao parsear mensagem WS:', err);
      }
    };
    
    state.ws.onclose = () => {
      state.wsConnected = false;
      updateWsStatus('offline');
      addLog('Desconectado do servidor', 'warning');
      
      // Tenta reconectar após 5 segundos
      setTimeout(connectWebSocket, 5000);
    };
    
    state.ws.onerror = (error) => {
      console.error('Erro WebSocket:', error);
      addLog('Erro na conexão WebSocket', 'error');
    };
    
  } catch (err) {
    addLog(`Falha ao conectar: ${err.message}`, 'error');
    setTimeout(connectWebSocket, 5000);
  }
}

/**
 * Envia mensagem via WebSocket
 */
function sendWsMessage(data) {
  if (state.ws && state.wsConnected) {
    state.ws.send(JSON.stringify(data));
  }
}

/**
 * Processa mensagens recebidas do WebSocket
 */
function handleWsMessage(data) {
  switch (data.type) {
    case 'status':
      updateAllStatus(data.payload);
      break;
      
    case 'log':
      addLog(data.payload.message, data.payload.level || 'info');
      break;
      
    case 'whatsapp_status':
      updateWhatsAppStatus(data.payload);
      break;
      
    case 'qr_code':
      showQRCode(data.payload.qr);
      break;
      
    case 'execution_complete':
      addLog(`Relatório enviado com sucesso!`, 'success');
      fetchHistory();
      break;
      
    case 'execution_error':
      addLog(`Erro na execução: ${data.payload.error}`, 'error');
      fetchHistory();
      break;
      
    case 'd0_update':
      // Atualização em tempo real do D0
      updateD0Display(data.payload);
      break;
      
    case 'new_call':
      // Nova ligação recebida - atualiza D0
      addLog(`Nova ligação: ${data.payload.status}`, 'event');
      if (state.d0Data) {
        // Incrementa contador local até próxima atualização
        state.d0Data.totalCalls++;
        updateD0Display(state.d0Data);
      }
      break;
      
    default:
      console.log('Mensagem WS desconhecida:', data);
  }
}

/**
 * Atualiza status da conexão WS no header
 */
function updateWsStatus(status) {
  const dot = elements.wsStatus.querySelector('.status-dot');
  const text = elements.wsStatus.querySelector('span:last-child');
  
  dot.className = 'status-dot';
  
  switch (status) {
    case 'online':
      dot.classList.add('status-dot--online');
      text.textContent = 'Conectado';
      break;
    case 'offline':
      dot.classList.add('status-dot--offline');
      text.textContent = 'Desconectado';
      break;
    case 'connecting':
      dot.classList.add('status-dot--connecting');
      text.textContent = 'Conectando...';
      break;
  }
}

// =============================================
// API REST
// =============================================

/**
 * Busca status geral do sistema
 */
async function fetchStatus() {
  try {
    const response = await fetch(`${CONFIG.backendUrl}/api/status`);
    if (response.ok) {
      const data = await response.json();
      updateAllStatus(data);
    }
  } catch (err) {
    console.error('Erro ao buscar status:', err);
  }
}

/**
 * Busca histórico de execuções
 */
async function fetchHistory() {
  try {
    const response = await fetch(`${CONFIG.backendUrl}/api/history`);
    if (response.ok) {
      const data = await response.json();
      renderHistory(data.history || []);
    }
  } catch (err) {
    console.error('Erro ao buscar histórico:', err);
  }
}

/**
 * Dispara relatório manualmente
 */
async function triggerReport() {
  elements.btnTrigger.disabled = true;
  addLog('Disparando relatório manualmente...', 'event');
  
  try {
    const response = await fetch(`${CONFIG.backendUrl}/api/trigger`, {
      method: 'POST',
    });
    
    if (response.ok) {
      addLog('Comando de disparo enviado!', 'success');
    } else {
      const error = await response.json();
      addLog(`Erro: ${error.message}`, 'error');
    }
  } catch (err) {
    addLog(`Falha ao disparar: ${err.message}`, 'error');
  } finally {
    setTimeout(() => {
      elements.btnTrigger.disabled = false;
    }, 3000);
  }
}

// =============================================
// Renderização
// =============================================

/**
 * Atualiza todos os indicadores de status
 */
function updateAllStatus(data) {
  // WhatsApp
  if (data.whatsapp) {
    updateWhatsAppStatus(data.whatsapp);
  }
  
  // Redis
  if (data.redis) {
    const status = data.redis.connected ? 'online' : 'offline';
    const text = data.redis.connected ? 'Conectado' : 'Desconectado';
    updateStatusIndicator(elements.redisStatus, status, text);
    
    elements.cacheStatus.textContent = data.redis.hasCache ? 'Com dados' : 'Vazio';
    elements.cacheTTL.textContent = data.redis.ttl ? `${Math.round(data.redis.ttl / 60)}min` : '--';
  }
  
  // API 55
  if (data.api55) {
    const status = data.api55.configured ? 'online' : 'warning';
    const text = data.api55.configured ? 'Configurada' : 'Não configurada';
    updateStatusIndicator(elements.apiStatus, status, text);
  }
  
  // Próximo disparo
  if (data.nextRun) {
    state.nextRunTime = new Date(data.nextRun);
    elements.nextRunTime.textContent = state.nextRunTime.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}

/**
 * Atualiza status do WhatsApp
 */
function updateWhatsAppStatus(data) {
  let status = 'offline';
  let text = 'Desconectado';
  
  switch (data.status) {
    case 'connected':
      status = 'online';
      text = 'Conectado';
      elements.qrContainer.style.display = 'none';
      hideWhatsAppError();
      break;
    case 'connecting':
      status = 'connecting';
      text = 'Conectando...';
      hideWhatsAppError();
      break;
    case 'qr':
      status = 'warning';
      text = 'Aguardando QR Code';
      hideWhatsAppError();
      break;
    case 'disconnected':
    case 'error':
    default:
      status = 'offline';
      text = 'Desconectado';
      showWhatsAppError();
  }
  
  updateStatusIndicator(elements.whatsappStatus, status, text);
}

/**
 * Exibe mensagem de erro do WhatsApp
 */
function showWhatsAppError() {
  let errorEl = document.getElementById('whatsappError');
  if (!errorEl) {
    errorEl = document.createElement('div');
    errorEl.id = 'whatsappError';
    errorEl.className = 'wpp-error-message';
    errorEl.innerHTML = `
      <span class="wpp-error-icon">⚠️</span>
      <span class="wpp-error-text">WhatsApp desconectado ou com falha, verifique com o responsável</span>
    `;
    const cardBody = document.querySelector('#whatsappCard .card__body');
    if (cardBody) {
      cardBody.appendChild(errorEl);
    }
  }
  errorEl.style.display = 'flex';
}

/**
 * Esconde mensagem de erro do WhatsApp
 */
function hideWhatsAppError() {
  const errorEl = document.getElementById('whatsappError');
  if (errorEl) {
    errorEl.style.display = 'none';
  }
}

/**
 * Exibe QR Code para autenticação
 */
function showQRCode(qrData) {
  elements.qrContainer.style.display = 'block';
  elements.qrCode.innerHTML = `<img src="${qrData}" alt="QR Code" style="max-width: 100%;">`;
  addLog('QR Code recebido - escaneie com seu WhatsApp', 'event');
}

/**
 * Renderiza histórico de execuções
 */
function renderHistory(history) {
  if (!history.length) {
    elements.historyList.innerHTML = `
      <div class="history-empty">
        <span>Nenhuma execução registrada</span>
      </div>
    `;
    return;
  }
  
  elements.historyList.innerHTML = history.map(item => `
    <div class="history-item history-item--${item.success ? 'success' : 'error'}">
      <span class="history-item__icon">${item.success ? '✅' : '❌'}</span>
      <div class="history-item__info">
        <div class="history-item__time">${formatDateTime(item.timestamp)}</div>
        <div class="history-item__status">${item.success ? 'Enviado com sucesso' : item.error || 'Falha'}</div>
      </div>
    </div>
  `).join('');
}

/**
 * Atualiza countdown
 */
function updateCountdown() {
  if (!state.nextRunTime) {
    elements.countdownHours.textContent = '00';
    elements.countdownMinutes.textContent = '00';
    elements.countdownSeconds.textContent = '00';
    return;
  }
  
  const now = new Date();
  let diff = state.nextRunTime - now;
  
  if (diff < 0) {
    // Próximo disparo passou, buscar novo horário
    fetchStatus();
    diff = 0;
  }
  
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  
  elements.countdownHours.textContent = String(hours).padStart(2, '0');
  elements.countdownMinutes.textContent = String(minutes).padStart(2, '0');
  elements.countdownSeconds.textContent = String(seconds).padStart(2, '0');
}

// =============================================
// Relatório D0 - KPIs do Dia
// =============================================

/**
 * Busca dados do relatório D0 (KPIs do dia)
 */
async function fetchD0Report() {
  try {
    addLog('Atualizando Relatório D0...', 'info');
    
    const response = await fetch(`${CONFIG.backendUrl}/api/report/d0`);
    if (response.ok) {
      const data = await response.json();
      state.d0Data = data;
      updateD0Display(data);
      addLog('Relatório D0 atualizado!', 'success');
    } else {
      addLog('Erro ao buscar dados D0', 'warning');
    }
  } catch (err) {
    console.error('Erro ao buscar D0:', err);
    // Não loga erro se servidor não estiver rodando ainda
  }
}

/**
 * Atualiza a exibição do card D0 com os dados
 */
function updateD0Display(data) {
  if (!data) return;
  
  // Última atualização
  elements.d0LastUpdate.textContent = formatTime();
  
  // Total de ligações
  elements.d0TotalCalls.textContent = data.totalCalls || 0;
  
  // % Atendidas
  const answeredPct = data.totalCalls > 0 
    ? Math.round((data.answered / data.totalCalls) * 100) 
    : 0;
  elements.d0Answered.textContent = `${answeredPct}%`;
  elements.d0AnsweredCount.textContent = `(${data.answered || 0})`;
  
  // % Abandonadas
  const abandonedPct = data.totalCalls > 0 
    ? Math.round((data.abandoned / data.totalCalls) * 100) 
    : 0;
  elements.d0Abandoned.textContent = `${abandonedPct}%`;
  elements.d0AbandonedCount.textContent = `(${data.abandoned || 0})`;
  
  // % Retidas na URA
  const retainedPct = data.totalCalls > 0 
    ? Math.round((data.retainedURA / data.totalCalls) * 100) 
    : 0;
  elements.d0RetainedURA.textContent = `${retainedPct}%`;
  elements.d0RetainedCount.textContent = `(${data.retainedURA || 0})`;
  
  // Horário de pico
  if (data.peakHour) {
    elements.d0PeakHour.textContent = data.peakHour.hour || '--:--';
    elements.d0PeakCount.textContent = `(${data.peakHour.count || 0} lig.)`;
  }
  
  // Tempo médio de espera
  const avgWait = data.avgWaitTime || 0;
  if (avgWait >= 60) {
    const mins = Math.floor(avgWait / 60);
    const secs = avgWait % 60;
    elements.d0AvgWait.textContent = `${mins}m ${secs}s`;
  } else {
    elements.d0AvgWait.textContent = `${avgWait}s`;
  }
  
  // Barra de distribuição
  elements.d0BarAnswered.style.width = `${answeredPct}%`;
  elements.d0BarAbandoned.style.width = `${abandonedPct}%`;
  elements.d0BarURA.style.width = `${retainedPct}%`;
  
  // Calcula próxima atualização (próxima hora cheia)
  calculateNextD0Update();
}

/**
 * Calcula quando será a próxima atualização do D0
 */
function calculateNextD0Update() {
  const now = new Date();
  const nextHour = new Date(now);
  nextHour.setHours(now.getHours() + 1, 0, 0, 0); // Próxima hora cheia
  state.d0NextUpdate = nextHour;
}

/**
 * Atualiza o countdown da próxima atualização D0
 */
let d0Updating = false; // Flag para evitar múltiplas chamadas

function updateD0Countdown() {
  if (!state.d0NextUpdate) {
    elements.d0NextUpdate.textContent = '--:--';
    return;
  }
  
  const now = new Date();
  let diff = state.d0NextUpdate - now;
  
  if (diff <= 0 && !d0Updating) {
    // Hora de atualizar! (apenas uma vez)
    d0Updating = true;
    calculateNextD0Update(); // Recalcula ANTES de buscar
    fetchD0Report().finally(() => {
      d0Updating = false;
    });
    diff = state.d0NextUpdate - now; // Recalcula diff
  }
  
  const minutes = Math.floor(Math.max(0, diff) / (1000 * 60));
  const seconds = Math.floor((Math.max(0, diff) % (1000 * 60)) / 1000);
  
  elements.d0NextUpdate.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

// =============================================
// Análise Histórica - Comparativo 15 Dias
// =============================================

/**
 * Busca análise comparativa do dia atual vs últimos 15 dias
 */
async function fetchAnalise() {
  try {
    addLog('Buscando análise histórica (15 dias)...', 'info');
    
    // Desabilita botão durante carregamento
    if (elements.btnRefreshAnalise) {
      elements.btnRefreshAnalise.disabled = true;
    }
    
    const response = await fetch(`${CONFIG.backendUrl}/api/report/analise`);
    if (response.ok) {
      const data = await response.json();
      updateAnaliseDisplay(data);
      addLog('Análise histórica atualizada!', 'success');
    } else {
      addLog('Erro ao buscar análise histórica', 'warning');
      showAnaliseError('Erro ao carregar dados');
    }
  } catch (err) {
    console.error('Erro ao buscar análise:', err);
    showAnaliseError('Servidor indisponível');
  } finally {
    if (elements.btnRefreshAnalise) {
      elements.btnRefreshAnalise.disabled = false;
    }
  }
}

/**
 * Exibe erro na análise
 */
function showAnaliseError(message) {
  elements.analiseEmoji.textContent = '⚠️';
  elements.analiseNivel.textContent = 'Indisponível';
  elements.analiseDescricao.textContent = message;
}

/**
 * Atualiza a exibição da análise
 */
function updateAnaliseDisplay(data) {
  if (!data || !data.analise) {
    showAnaliseError('Sem dados históricos');
    return;
  }
  
  const { hoje, historico, analise, resumo } = data;
  
  // Resumo principal
  const totalAnalise = analise.total;
  elements.analiseEmoji.textContent = totalAnalise.emoji || '📊';
  elements.analiseNivel.textContent = totalAnalise.nivel || '--';
  elements.analiseDescricao.textContent = totalAnalise.descricao || resumo || '';
  
  // Aplica classe de cor ao resumo
  elements.analiseResumo.className = 'analise-resumo';
  if (totalAnalise.percentual < 70) {
    elements.analiseResumo.classList.add('analise-resumo--abaixo');
  } else if (totalAnalise.percentual < 100) {
    elements.analiseResumo.classList.add('analise-resumo--medio');
  } else if (totalAnalise.percentual < 130) {
    elements.analiseResumo.classList.add('analise-resumo--alto');
  } else {
    elements.analiseResumo.classList.add('analise-resumo--altissimo');
  }
  
  // Atualiza cards individuais
  updateAnaliseCard('Atend', hoje.answered, historico.medias.atendidas, analise.atendidas);
  updateAnaliseCard('Aband', hoje.abandoned, historico.medias.abandonadas, analise.abandonadas);
  updateAnaliseCard('Ura', hoje.retainedURA, historico.medias.retidasURA, analise.retidasURA);
  updateAnaliseCard('Total', hoje.totalCalls, historico.medias.total, analise.total);
  
  // Última atualização
  elements.analiseLastUpdate.textContent = formatTime();
}

/**
 * Atualiza um card individual de análise
 */
function updateAnaliseCard(prefix, hojeVal, mediaVal, analise) {
  const badgeEl = elements[`analise${prefix}Badge`];
  const hojeEl = elements[`analise${prefix}Hoje`];
  const mediaEl = elements[`analise${prefix}Media`];
  const barEl = elements[`analise${prefix}Bar`];
  
  if (hojeEl) hojeEl.textContent = hojeVal || 0;
  if (mediaEl) mediaEl.textContent = mediaVal || 0;
  
  // Badge com percentual
  if (badgeEl && analise) {
    badgeEl.textContent = `${analise.percentual || 0}%`;
    
    // Aplica classe de cor
    badgeEl.className = 'analise-card__badge';
    if (analise.percentual < 70) {
      badgeEl.classList.add('analise-card__badge--abaixo');
    } else if (analise.percentual < 100) {
      badgeEl.classList.add('analise-card__badge--medio');
    } else if (analise.percentual < 130) {
      badgeEl.classList.add('analise-card__badge--alto');
    } else {
      badgeEl.classList.add('analise-card__badge--altissimo');
    }
  }
  
  // Barra de progresso (limitada a 150% para visualização)
  if (barEl && analise) {
    const barWidth = Math.min(150, analise.percentual || 0) / 1.5; // Normaliza para 0-100%
    barEl.style.width = `${barWidth}%`;
  }
}

// =============================================
// Event Listeners
// =============================================

elements.btnTrigger.addEventListener('click', triggerReport);

// Botão de atualizar análise
if (elements.btnRefreshAnalise) {
  elements.btnRefreshAnalise.addEventListener('click', fetchAnalise);
}

elements.btnReconnectWpp.addEventListener('click', () => {
  addLog('Solicitando reconexão do WhatsApp...', 'event');
  sendWsMessage({ type: 'reconnect_whatsapp' });
});

elements.btnClearLogs.addEventListener('click', () => {
  elements.console.innerHTML = '';
  addLog('Console limpo', 'info');
});

// =============================================
// Inicialização
// =============================================

function init() {
  addLog('Iniciando ReportsDAY...', 'info');
  
  // Atualiza relógio a cada segundo
  updateClock();
  setInterval(updateClock, 1000);
  
  // Atualiza countdown a cada segundo
  setInterval(updateCountdown, 1000);
  
  // Atualiza countdown D0 a cada segundo
  calculateNextD0Update();
  setInterval(updateD0Countdown, 1000);
  
  // Conecta WebSocket
  connectWebSocket();
  
  // Busca dados iniciais via REST (apenas uma vez)
  setTimeout(() => {
    fetchStatus();
    fetchHistory();
    fetchD0Report(); // Busca D0 inicial (uma vez)
    fetchAnalise(); // Busca análise histórica (15 dias)
  }, 1000);
  
  // Refresh periódico (apenas status e history, NÃO o D0)
  setInterval(() => {
    if (!state.wsConnected) {
      fetchStatus();
    }
    fetchHistory();
  }, 10000); // A cada 10 segundos
  
  addLog('Painel carregado com sucesso!', 'success');
}

// Inicia quando DOM estiver pronto
document.addEventListener('DOMContentLoaded', init);

