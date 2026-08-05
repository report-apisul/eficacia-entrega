/**
 * Serviço de dados – somente fonte real (Apps Script)
 * Sem dados fictícios. Timeout e erros de conexão claros.
 */
const DataService = (() => {
  let rawData = [];
  let lastFetch = null;
  let lastError = null;

  function getField(row, key) {
    const header = CONFIG.COLUMN_MAP[key];
    if (!header) return null;
    if (row[header] !== undefined && row[header] !== null && row[header] !== '') return row[header];
    const found = Object.keys(row).find(k => k.trim().toLowerCase() === header.trim().toLowerCase());
    return found != null ? row[found] : null;
  }

  function parseFila(v) {
    if (v == null || v === '') return null;
    const n = Number(String(v).replace(',', '.'));
    return isNaN(n) ? null : n;
  }

  function parseNumber(v) {
    if (v == null || v === '') return null;
    let s = String(v).trim().replace(/[^\d.,-]/g, '');
    if (!s) return null;
    if (s.includes(',') && s.includes('.')) {
      s = s.replace(/\./g, '').replace(',', '.');
    } else if (s.includes(',')) {
      s = s.replace(',', '.');
    } else if (s.includes('.')) {
      const parts = s.split('.');
      if (parts.length > 1 && parts[parts.length - 1].length === 3) {
        s = parts.join('');
      }
    }
    const n = Number(s);
    return isNaN(n) ? null : n;
  }

  function normalizeRow(row) {
    const dataAbertura = Utils.parseDate(getField(row, 'dataAbertura'));
    const dataConclusao = Utils.parseDate(getField(row, 'dataConclusao'));
    const dataPrevista = Utils.parseDate(getField(row, 'dataPrevista'));
    const codigo = String(getField(row, 'numero') || '').trim();
    const fila = parseFila(getField(row, 'filaAbertura'));

    // Status derivado
    let status = 'Aberto';
    if (dataConclusao) status = 'Concluído';
    else if (codigo || dataPrevista || fila != null) status = 'Em Andamento';

    // 1ª análise: data prevista como proxy histórico
    const dataPrimeiraAnalise = dataPrevista || null;

    return {
      numero: codigo || null,
      dataAbertura,
      dataViagem: Utils.parseDate(getField(row, 'dataViagem')),
      solicitante: String(getField(row, 'solicitante') || '').trim() || '—',
      transportador: String(getField(row, 'transportador') || '').trim().replace(/\s+$/, '') || '—',
      tipo: String(getField(row, 'tipo') || '').trim() || '—',
      status,
      responsavel: String(getField(row, 'responsavel') || '').trim(),
      dataPrimeiraAnalise,
      dataPrevista,
      dataConclusao,
      filaAbertura: fila,
      observacoes: String(getField(row, 'observacoes') || '').trim(),
      shipment: String(getField(row, 'shipment') || '').trim(),
      smp: String(getField(row, 'smp') || '').trim(),
      placa: String(getField(row, 'placa') || '').trim(),
      notaFiscal: String(getField(row, 'notaFiscal') || '').trim(),
      quantidade: parseNumber(getField(row, 'quantidade')),
      valor: parseNumber(getField(row, 'valor')),
      ruptura: String(getField(row, 'ruptura') || '').trim().toUpperCase(),
      problemasMoni: String(getField(row, 'problemasMoni') || '').trim().toUpperCase(),
      alertaBau: String(getField(row, 'alertaBau') || '').trim().toUpperCase(),
      alertas: String(getField(row, 'alertas') || '').trim().toUpperCase()
    };
  }

  async function fetchWithTimeout(url, ms) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), ms);
    try {
      const res = await fetch(url, { cache: 'no-store', signal: controller.signal, redirect: 'follow' });
      clearTimeout(timer);
      return res;
    } catch (e) {
      clearTimeout(timer);
      throw e;
    }
  }

  async function fetchAppsScript() {
    if (!CONFIG.APPS_SCRIPT_URL) throw new Error('URL da API não configurada.');

    let res;
    let lastConnectionError = null;

    // Retry para falhas momentâneas do Apps Script
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        res = await fetchWithTimeout(CONFIG.APPS_SCRIPT_URL, CONFIG.FETCH_TIMEOUT_MS);
        if (res.ok) break;
        lastConnectionError = new Error(`Erro na API (${res.status}).`);
      } catch (e) {
        lastConnectionError = e;
      }

      if (attempt < 3) {
        await new Promise(resolve => setTimeout(resolve, attempt * 1500));
      }
    }

    if (!res || !res.ok) {
      if (lastConnectionError?.name === 'AbortError') {
        throw new Error('Tempo esgotado ao conectar com a planilha. Verifique sua conexão e tente novamente.');
      }
      throw new Error('Não foi possível conectar com a API após algumas tentativas. Tente novamente.');
    }
    if (!res.ok) {
      throw new Error(`Erro na API (${res.status}). Tente novamente em instantes.`);
    }
    let json;
    try {
      json = await res.json();
    } catch {
      throw new Error('Resposta inválida da API. A planilha pode estar temporariamente indisponível.');
    }
    if (!json.sucesso && !Array.isArray(json.dados)) {
      throw new Error(json.erro || 'A API retornou uma resposta inválida.');
    }
    const rows = json.dados || [];
    let mapped = rows.map(normalizeRow);

    // Mantém todos os registros válidos retornados pela API.
    // Nenhum registro é removido por ausência de código ou data para preservar a contagem real da fonte.
    return mapped;
  }

  async function load() {
    Utils.showLoading(true, 'Conectando à planilha...');
    lastError = null;
    try {
      const data = await fetchAppsScript();
      if (!Array.isArray(data) || data.length === 0) {
        throw new Error('Nenhuma solicitação com código de análise encontrada na planilha.');
      }
      rawData = data;
      lastFetch = new Date();
      return getAll();
    } catch (err) {
      console.error('[DataService]', err);
      rawData = [];
      lastFetch = null;
      lastError = err.message || 'Erro desconhecido';
      throw err;
    } finally {
      Utils.showLoading(false);
    }
  }

  function getAll() {
    return rawData.map(r => ({ ...r }));
  }

  function getLastFetch() {
    return lastFetch;
  }

  function getLastError() {
    return lastError;
  }

  return { load, getAll, getLastFetch, getLastError };
})();
