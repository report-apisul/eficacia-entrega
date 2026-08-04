/**
 * Serviço de dados – Google Apps Script / CSV / Sheets API / Sample
 * Desacoplado da interface para facilitar manutenção e troca de fonte.
 */

const DataService = (() => {
  let rawData = [];
  let lastFetch = null;

  /**
   * Dados de exemplo realistas para demonstração offline.
   */
  function generateSampleData() {
    const solicitantes = ['Jennyfer Gualiume', 'THIAGO', 'Luiza Passigatti', 'IVAN AUGUSTO GASPARAZZO', 'THALIA', 'Rafael Dias'];
    const transportadores = ['Cia Verde', 'MARONI', 'TECPET TRANSPORTES E SERVIÇOS LTDA', 'REITER'];
    const tipos = ['Alto', 'Moderado', 'Baixo'];
    const responsaveis = ['Sandra', 'ELITANIA', 'Luiza Passigatti', 'ANA PASSIGATI', 'RAFAEL'];

    const items = [];
    const now = new Date();
    let seq = 200;

    for (let i = 0; i < 80; i++) {
      const daysAgo = Math.floor(Math.random() * 45);
      const abertura = new Date(now);
      abertura.setDate(abertura.getDate() - daysAgo);
      abertura.setHours(8 + Math.floor(Math.random() * 10), Math.floor(Math.random() * 60), 0, 0);

      let status;
      if (daysAgo > 20) {
        status = Math.random() < 0.85 ? 'Concluído' : (Math.random() < 0.5 ? 'Em Andamento' : 'Aberto');
      } else if (daysAgo > 7) {
        status = Math.random() < 0.55 ? 'Concluído' : (Math.random() < 0.4 ? 'Em Andamento' : 'Aberto');
      } else {
        status = Math.random() < 0.25 ? 'Concluído' : (Math.random() < 0.35 ? 'Em Andamento' : 'Aberto');
      }

      let dataPrimeiraAnalise = null;
      let dataPrevista = null;
      let filaAbertura = null;
      const foiAnalisado = status !== 'Aberto' || Math.random() < 0.4;

      if (foiAnalisado) {
        const delayAnaliseH = 2 + Math.random() * 48;
        dataPrimeiraAnalise = new Date(abertura.getTime() + delayAnaliseH * 3600000);
        filaAbertura = Math.floor(Math.random() * 22);
        const diasPrazo = Math.max(1, Math.ceil(filaAbertura / CONFIG.CAPACIDADE_MEDIA_DIA) + Math.floor(Math.random() * 3) - 1);
        dataPrevista = Utils.addDays(Utils.startOfDay(dataPrimeiraAnalise), diasPrazo);
        dataPrevista.setHours(18, 0, 0, 0);
      }

      let dataConclusao = null;
      if (status === 'Concluído') {
        const base = dataPrimeiraAnalise || abertura;
        const diasAtend = 0.5 + Math.random() * 8;
        dataConclusao = new Date(base.getTime() + diasAtend * 86400000);
        if (dataConclusao < abertura) dataConclusao = new Date(abertura.getTime() + 4 * 3600000);
      }

      items.push({
        numero: `M${seq++}`,
        dataAbertura: abertura,
        solicitante: solicitantes[Math.floor(Math.random() * solicitantes.length)],
        transportador: transportadores[Math.floor(Math.random() * transportadores.length)],
        tipo: tipos[Math.floor(Math.random() * tipos.length)],
        status,
        responsavel: status === 'Aberto' && !foiAnalisado ? '' : responsaveis[Math.floor(Math.random() * responsaveis.length)],
        dataPrimeiraAnalise,
        dataPrevista,
        dataConclusao,
        filaAbertura,
        observacoes: Math.random() < 0.3 ? 'SEM RUPTURAS' : '',
        valor: (Math.random() * 2000).toFixed(2),
        quantidade: Math.floor(Math.random() * 50) + 1,
        ruptura: Math.random() < 0.2 ? 'SIM' : 'NÃO',
        placa: '',
        shipment: '',
        smp: ''
      });
    }

    items.sort((a, b) => a.dataAbertura - b.dataAbertura);
    return items;
  }

  /**
   * Normaliza uma linha bruta (objeto com cabeçalhos da planilha) para o modelo interno
   */
  function normalizeRow(row) {
    const map = CONFIG.COLUMN_MAP;
    const get = (key) => {
      const header = map[key];
      if (!header) return null;
      // Match exato
      if (row[header] !== undefined && row[header] !== null) return row[header];
      // Case-insensitive + trim
      const found = Object.keys(row).find(k => k.trim().toLowerCase() === header.trim().toLowerCase());
      return found != null ? row[found] : null;
    };

    const dataAbertura = Utils.parseDate(get('dataAbertura'));
    const dataConclusao = Utils.parseDate(get('dataConclusao'));
    const dataPrevista = Utils.parseDate(get('dataPrevista'));
    const codigo = String(get('numero') || '').trim();
    const fila = parseFila(get('filaAbertura'));

    // Deriva status (não existe coluna Status na planilha real)
    let status = 'Aberto';
    if (dataConclusao) {
      status = 'Concluído';
    } else if (codigo || dataPrevista || fila != null) {
      status = 'Em Andamento';
    }

    // Data da 1ª análise: usamos a data prevista como proxy histórico
    // (quando Fernando preenche a Previsão pela primeira vez)
    // Se no futuro existir coluna específica, basta mapear.
    const dataPrimeiraAnalise = dataPrevista || null;

    return {
      numero: codigo || `SOL-${Utils.uid()}`,
      dataAbertura,
      dataViagem: Utils.parseDate(get('dataViagem')),
      solicitante: String(get('solicitante') || '').trim() || '—',
      transportador: String(get('transportador') || '').trim() || '—',
      tipo: String(get('tipo') || '').trim() || '—',           // Nível de urgência
      status,
      responsavel: String(get('responsavel') || '').trim(),
      dataPrimeiraAnalise,
      dataPrevista,
      dataConclusao,
      filaAbertura: fila,
      observacoes: String(get('observacoes') || '').trim(),
      // Campos extras úteis para a operação
      shipment: String(get('shipment') || '').trim(),
      smp: String(get('smp') || '').trim(),
      placa: String(get('placa') || '').trim(),
      notaFiscal: String(get('notaFiscal') || '').trim(),
      quantidade: parseNumber(get('quantidade')),
      valor: parseNumber(get('valor')),
      ruptura: String(get('ruptura') || '').trim().toUpperCase(),
      problemasMoni: String(get('problemasMoni') || '').trim().toUpperCase(),
      alertaBau: String(get('alertaBau') || '').trim().toUpperCase(),
      alertas: String(get('alertas') || '').trim().toUpperCase()
    };
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
    // pt-BR: 1.234,56 ou 15.000 (milhar) ou 913.94 (decimal US)
    if (s.includes(',') && s.includes('.')) {
      s = s.replace(/\./g, '').replace(',', '.');
    } else if (s.includes(',')) {
      s = s.replace(',', '.');
    } else if (s.includes('.')) {
      const parts = s.split('.');
      // Se última parte tem exatamente 3 dígitos → trata como milhar (15.000)
      if (parts.length > 1 && parts[parts.length - 1].length === 3) {
        s = parts.join('');
      }
      // senão mantém como decimal (913.94)
    }
    const n = Number(s);
    return isNaN(n) ? null : n;
  }

  /**
   * Parse CSV simples (suporta aspas e vírgulas)
   */
  function parseCSV(text) {
    const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(l => l.trim());
    if (lines.length < 2) return [];

    const headers = splitCSVLine(lines[0]);
    const rows = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = splitCSVLine(lines[i]);
      if (cols.every(c => !c.trim())) continue;
      const obj = {};
      headers.forEach((h, idx) => { obj[h.trim()] = cols[idx] != null ? cols[idx].trim() : ''; });
      rows.push(obj);
    }
    return rows;
  }

  function splitCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
        else inQuotes = !inQuotes;
      } else if (ch === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
    result.push(current);
    return result;
  }

  async function fetchCSV(url) {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`Falha ao carregar CSV (${res.status})`);
    const text = await res.text();
    return parseCSV(text).map(normalizeRow).filter(r => r.dataAbertura);
  }

  async function fetchSheetsAPI() {
    const { SHEETS_API_KEY, SHEETS_ID, SHEETS_RANGE } = CONFIG;
    if (!SHEETS_API_KEY || !SHEETS_ID) {
      throw new Error('Configure SHEETS_API_KEY e SHEETS_ID em config.js');
    }
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEETS_ID}/values/${encodeURIComponent(SHEETS_RANGE)}?key=${SHEETS_API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Sheets API error (${res.status})`);
    const json = await res.json();
    const values = json.values || [];
    if (values.length < 2) return [];
    const headers = values[0];
    return values.slice(1).map(row => {
      const obj = {};
      headers.forEach((h, i) => { obj[h] = row[i] != null ? row[i] : ''; });
      return normalizeRow(obj);
    }).filter(r => r.dataAbertura);
  }

  /**
   * Busca dados do Google Apps Script (Web App)
   * Espera resposta: { sucesso: true, total: N, dados: [ {...}, ... ] }
   */
  async function fetchAppsScript() {
    if (!CONFIG.APPS_SCRIPT_URL) throw new Error('Defina CONFIG.APPS_SCRIPT_URL');
    const res = await fetch(CONFIG.APPS_SCRIPT_URL, { cache: 'no-store' });
    if (!res.ok) throw new Error(`Apps Script error (${res.status})`);
    const json = await res.json();
    if (!json.sucesso && !Array.isArray(json.dados)) {
      throw new Error(json.erro || 'Resposta inválida do Apps Script');
    }
    const rows = json.dados || [];
    return rows.map(normalizeRow).filter(r => r.dataAbertura);
  }

  /**
   * Carrega dados conforme CONFIG.DATA_SOURCE
   */
  async function load() {
    Utils.showLoading(true);
    try {
      let data;
      switch (CONFIG.DATA_SOURCE) {
        case 'apps-script':
          data = await fetchAppsScript();
          break;
        case 'csv':
          if (!CONFIG.CSV_URL) throw new Error('Defina CONFIG.CSV_URL');
          data = await fetchCSV(CONFIG.CSV_URL);
          break;
        case 'sheets-api':
          data = await fetchSheetsAPI();
          break;
        case 'sample':
        default:
          await new Promise(r => setTimeout(r, 350));
          data = generateSampleData();
          break;
      }
      rawData = data;
      lastFetch = new Date();
      return getAll();
    } catch (err) {
      console.error('[DataService]', err);
      Utils.toast(`Erro ao carregar dados: ${err.message}`, 'error', 5000);
      // Fallback para sample se falhar
      if (CONFIG.DATA_SOURCE !== 'sample') {
        rawData = generateSampleData();
        lastFetch = new Date();
        Utils.toast('Usando dados de demonstração (fallback)', 'info');
      }
      return getAll();
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

  return { load, getAll, getLastFetch };
})();
