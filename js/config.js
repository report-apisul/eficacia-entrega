/**
 * Configuração do BI Eficácia na Entrega – Apisul
 * ---------------------------------------------------------
 * Fonte: Google Apps Script que lê a planilha "Eficácia na Entrega (respostas)"
 */

const CONFIG = {
  // === Fonte de dados ===
  // 'apps-script' | 'sample' | 'csv' | 'sheets-api'
  DATA_SOURCE: 'apps-script',

  // URL do Web App do Google Apps Script (publicado como "Qualquer pessoa")
  APPS_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbyD0071pyIgbbg0rYCk6hlR6Y8WluFLVVVlT48Cfd3l9B9iCgFu4jGDXGxOyjwLMkZS6A/exec',

  // Fallback CSV (se preferir publicar a planilha)
  CSV_URL: '',

  // Google Sheets API (alternativa)
  SHEETS_API_KEY: '',
  SHEETS_ID: '',
  SHEETS_RANGE: 'Respostas ao formulário 1!A:Z',

  // Intervalo de atualização automática (ms). 0 = desativado
  AUTO_REFRESH_MS: 0, // Atualização automática desativada

  // Regras de negócio
  DIAS_PRAZO_PADRAO: 5,          // Data Prevista = Abertura + N dias (enquanto não analisado)
  CAPACIDADE_MEDIA_DIA: 5,       // Referência operacional
  ANTECIPADO_HORAS: 24,          // Antecipado se concluído > 24h antes da prevista

  // Tabela
  PAGE_SIZE: 25,

  /**
   * Mapeamento de colunas da planilha real → campos internos
   * Cabeçalhos exatamente como retornados pela API do Apps Script
   */
  COLUMN_MAP: {
    numero:              'Codigo da Análise',
    dataAbertura:        'Carimbo de data/hora',
    dataViagem:          'Data que a viagem ocorreu?',
    solicitante:         'Nome do solicitante',
    transportador:       'Qual transportadora?',
    responsavel:         'Responsável Mondelez pela Solicitação?',
    shipment:            'Número da Shipment?',
    smp:                 'Número da SMP?',
    placa:               'Qual a placa?',
    notaFiscal:          'Insira a Nota Fiscal Original:',
    quantidade:          'Qual a quantidade de falta reclamada?',
    valor:               'Qual o valor reclamado? ',   // atenção: espaço no final do cabeçalho real
    tipo:                'Nivel de urgência',           // usamos urgência como "tipo"
    filaAbertura:        'Fila Fixa',
    dataPrevista:        'Previsão de Entrega',
    dataConclusao:       'Data da Conclusão',
    ruptura:             'Ruptura?',
    problemasMoni:       'Problemas no Monitoramento?',
    alertaBau:           'Alerta de Baú?',
    alertas:             'Alertas?',
    observacoes:         'OBSERVAÇÃO'
  },

  // Cores do tema (Chart.js + identidade Apisul)
  CHART_COLORS: {
    navy:   '#0a2540',
    blue:   '#1a5f9e',
    blueMid:'#2b7bc1',
    cyan:   '#0d9488',
    green:  '#059669',
    red:    '#dc2626',
    orange: '#ea580c',
    indigo: '#4f46e5',
    teal:   '#14b8a6',
    gray:   '#94a3b8',
    palette: [
      '#0a2540', '#1a5f9e', '#2b7bc1', '#4a9fe0',
      '#0d9488', '#14b8a6', '#059669', '#4f46e5',
      '#ea580c', '#64748b'
    ]
  }
};

Object.freeze(CONFIG);
