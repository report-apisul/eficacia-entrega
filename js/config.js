/**
 * BI Eficácia na Entrega – Apisul
 * Configuração central
 */
const CONFIG = {
  DATA_SOURCE: 'apps-script',
  APPS_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbwPGDGu52VOGdF5qdl1WUVxiEYsuD6Zqisz8zvbbLxZ/dev',
  FETCH_TIMEOUT_MS: 20000,
  AUTO_REFRESH_MS: 0, // desativado por solicitação
  DIAS_PRAZO_PADRAO: 5,
  CAPACIDADE_MEDIA_DIA: 5,
  ANTECIPADO_HORAS: 24,
  PAGE_SIZE: 20,
  // Somente solicitações com pré-análise (Código da Análise) – conforme ATA
  REQUIRE_CODIGO: false,

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
    valor:               'Qual o valor reclamado? ',
    tipo:                'Nivel de urgência',
    filaAbertura:        'Fila Fixa',
    dataPrevista:        'Previsão de Entrega',
    dataConclusao:       'Data da Conclusão',
    ruptura:             'Ruptura?',
    problemasMoni:       'Problemas no Monitoramento?',
    alertaBau:           'Alerta de Baú?',
    alertas:             'Alertas?',
    observacoes:         'OBSERVAÇÃO'
  },

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
      '#ea580c', '#64748b', '#8b5cf6', '#ec4899'
    ]
  }
};

Object.freeze(CONFIG);
