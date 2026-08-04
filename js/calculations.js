/**
 * Regras de negócio e cálculos do BI
 * ---------------------------------------------------------
 * - Data Prevista padrão = Abertura + 5 dias (enquanto não analisado)
 * - Primeira Análise: registro histórico (não recalcula)
 * - Fila na Abertura: valor estático gravado pelo Fernando
 * - Fila atual: calculada em tempo real para abertos/em andamento
 * - Situação do prazo: No Prazo | Atrasado | Antecipado | Pendente | Vencido
 */

const Calculations = (() => {
  const now = () => new Date();

  /**
   * Enriquece cada solicitação com campos calculados
   */
  function enrich(items) {
    // 1) Ordena por data de abertura (crescente) para definir fila
    const sorted = [...items].sort((a, b) => {
      const da = a.dataAbertura ? a.dataAbertura.getTime() : 0;
      const db = b.dataAbertura ? b.dataAbertura.getTime() : 0;
      return da - db;
    });

    // 2) Solicitações em aberto (Aberto + Em Andamento) para fila
    const abertos = sorted.filter(s => s.status === 'Aberto' || s.status === 'Em Andamento');
    const totalPendentes = abertos.length;

    // Mapa numero → posição (1-based)
    const posicaoMap = new Map();
    abertos.forEach((s, idx) => {
      posicaoMap.set(s.numero, idx + 1);
    });

    return sorted.map(s => {
      const enriched = { ...s };

      // Data prevista efetiva
      // Se Fernando já definiu → usa a dele; senão → Abertura + 5 dias
      if (s.dataPrevista) {
        enriched.dataPrevistaEfetiva = s.dataPrevista;
        enriched.prazoManual = true;
      } else if (s.dataAbertura) {
        enriched.dataPrevistaEfetiva = Utils.addDays(Utils.startOfDay(s.dataAbertura), CONFIG.DIAS_PRAZO_PADRAO);
        enriched.dataPrevistaEfetiva.setHours(18, 0, 0, 0);
        enriched.prazoManual = false;
      } else {
        enriched.dataPrevistaEfetiva = null;
        enriched.prazoManual = false;
      }

      // Tempo até 1ª análise
      enriched.tempoPrimeiraAnaliseMs = (s.dataAbertura && s.dataPrimeiraAnalise)
        ? Utils.diffMs(s.dataAbertura, s.dataPrimeiraAnalise)
        : null;

      // Tempo total de atendimento (abertura → conclusão)
      enriched.tempoTotalMs = (s.dataAbertura && s.dataConclusao)
        ? Utils.diffMs(s.dataAbertura, s.dataConclusao)
        : null;

      // Fila atual (somente abertos)
      if (s.status === 'Aberto' || s.status === 'Em Andamento') {
        enriched.posicaoFila = posicaoMap.get(s.numero) || null;
        enriched.qtdAfrente = enriched.posicaoFila != null ? enriched.posicaoFila - 1 : null;
        enriched.totalPendentes = totalPendentes;
      } else {
        enriched.posicaoFila = null;
        enriched.qtdAfrente = null;
        enriched.totalPendentes = totalPendentes;
      }

      // Situação do prazo
      enriched.situacaoPrazo = calcSituacaoPrazo(enriched);

      // Vencida? (aberta e data prevista efetiva já passou)
      enriched.vencida = isVencida(enriched);

      return enriched;
    });
  }

  function calcSituacaoPrazo(s) {
    if (s.status === 'Concluído' && s.dataConclusao && s.dataPrevistaEfetiva) {
      const diff = Utils.diffMs(s.dataPrevistaEfetiva, s.dataConclusao); // positivo = atrasado
      if (diff == null) return 'Pendente';
      // Antecipado: concluído mais de 24h antes
      if (diff < -(CONFIG.ANTECIPADO_HORAS * 3600000)) return 'Antecipado';
      if (diff <= 0) return 'No Prazo';
      return 'Atrasado';
    }
    // Ainda não concluído
    if ((s.status === 'Aberto' || s.status === 'Em Andamento') && s.dataPrevistaEfetiva) {
      if (now() > s.dataPrevistaEfetiva) return 'Vencido';
      return 'Pendente';
    }
    return 'Pendente';
  }

  function isVencida(s) {
    if (s.status === 'Concluído') return false;
    if (!s.dataPrevistaEfetiva) return false;
    return now() > s.dataPrevistaEfetiva;
  }

  /**
   * Aplica filtros de período e dimensões
   */
  function applyFilters(items, filters = {}) {
    let result = items;

    // Período (baseado na data de abertura)
    if (filters.periodo && filters.periodo !== 'all') {
      const days = Number(filters.periodo);
      const cutoff = Utils.addDays(Utils.startOfDay(now()), -days);
      result = result.filter(s => s.dataAbertura && s.dataAbertura >= cutoff);
    }

    if (filters.transportador) {
      result = result.filter(s => s.transportador === filters.transportador);
    }
    if (filters.solicitante) {
      result = result.filter(s => s.solicitante === filters.solicitante);
    }
    if (filters.responsavel) {
      result = result.filter(s => s.responsavel === filters.responsavel);
    }
    if (filters.status) {
      result = result.filter(s => s.status === filters.status);
    }
    if (filters.tipo) {
      result = result.filter(s => s.tipo === filters.tipo);
    }

    // Busca textual (tabela)
    if (filters.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(s =>
        [s.numero, s.solicitante, s.transportador, s.tipo, s.status, s.responsavel, s.observacoes]
          .some(v => v && String(v).toLowerCase().includes(q))
      );
    }

    return result;
  }

  /**
   * KPIs principais
   */
  function computeKPIs(items) {
    const total = items.length;
    const abertas = items.filter(s => s.status === 'Aberto').length;
    const andamento = items.filter(s => s.status === 'Em Andamento').length;
    const concluidas = items.filter(s => s.status === 'Concluído').length;
    const vencidas = items.filter(s => s.vencida).length;

    const tempos = items
      .filter(s => s.tempoTotalMs != null && s.tempoTotalMs >= 0)
      .map(s => s.tempoTotalMs);
    const tempoMedioMs = tempos.length ? tempos.reduce((a, b) => a + b, 0) / tempos.length : null;

    const concluidasComPrazo = items.filter(s =>
      s.status === 'Concluído' && (s.situacaoPrazo === 'No Prazo' || s.situacaoPrazo === 'Antecipado' || s.situacaoPrazo === 'Atrasado')
    );
    const noPrazo = concluidasComPrazo.filter(s => s.situacaoPrazo === 'No Prazo' || s.situacaoPrazo === 'Antecipado').length;
    const foraPrazo = concluidasComPrazo.filter(s => s.situacaoPrazo === 'Atrasado').length;
    const pctNoPrazo = concluidasComPrazo.length ? noPrazo / concluidasComPrazo.length : null;
    const pctForaPrazo = concluidasComPrazo.length ? foraPrazo / concluidasComPrazo.length : null;

    return {
      total,
      abertas,
      andamento,
      concluidas,
      vencidas,
      tempoMedioMs,
      noPrazo,
      foraPrazo,
      pctNoPrazo,
      pctForaPrazo,
      totalComPrazo: concluidasComPrazo.length
    };
  }

  /**
   * Evolução diária (abertas, concluídas, backlog acumulado)
   */
  function computeEvolucao(items, daysBack = 30) {
    const cutoff = Utils.addDays(Utils.startOfDay(now()), -daysBack);
    const keys = [];
    for (let i = daysBack; i >= 0; i--) {
      keys.push(Utils.dateKey(Utils.addDays(Utils.startOfDay(now()), -i)));
    }

    const abertasPorDia = {};
    const concluidasPorDia = {};
    keys.forEach(k => { abertasPorDia[k] = 0; concluidasPorDia[k] = 0; });

    items.forEach(s => {
      if (s.dataAbertura) {
        const k = Utils.dateKey(s.dataAbertura);
        if (abertasPorDia[k] != null) abertasPorDia[k]++;
      }
      if (s.dataConclusao) {
        const k = Utils.dateKey(s.dataConclusao);
        if (concluidasPorDia[k] != null) concluidasPorDia[k]++;
      }
    });

    // Backlog: saldo acumulado (abertas - concluídas) a partir do início do período
    // Considera também o que já existia antes do período
    let backlog = items.filter(s =>
      s.dataAbertura && s.dataAbertura < cutoff &&
      (s.status !== 'Concluído' || (s.dataConclusao && s.dataConclusao >= cutoff))
    ).length;

    // Ajuste: se concluído antes do período, não conta
    backlog = items.filter(s => {
      if (!s.dataAbertura || s.dataAbertura >= cutoff) return false;
      if (s.status === 'Concluído' && s.dataConclusao && s.dataConclusao < cutoff) return false;
      return true;
    }).length;

    const series = keys.map(k => {
      const ab = abertasPorDia[k] || 0;
      const co = concluidasPorDia[k] || 0;
      backlog = backlog + ab - co;
      return {
        key: k,
        label: Utils.dateLabel(k),
        abertas: ab,
        concluidas: co,
        backlog: Math.max(0, backlog)
      };
    });

    return series;
  }

  /**
   * Agrupa por dimensão (solicitante, transportador, tipo...)
   */
  function groupBy(items, field) {
    const map = {};
    items.forEach(s => {
      const key = s[field] || 'Não informado';
      map[key] = (map[key] || 0) + 1;
    });
    const total = items.length || 1;
    return Object.entries(map)
      .map(([nome, qtd]) => ({ nome, qtd, pct: qtd / total }))
      .sort((a, b) => b.qtd - a.qtd);
  }

  /**
   * Métricas de tempo
   */
  function computeTempos(items) {
    const totais = items.filter(s => s.tempoTotalMs != null && s.tempoTotalMs >= 0).map(s => s.tempoTotalMs);
    const primeiras = items.filter(s => s.tempoPrimeiraAnaliseMs != null && s.tempoPrimeiraAnaliseMs >= 0).map(s => s.tempoPrimeiraAnaliseMs);

    const avg = arr => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;
    const max = arr => arr.length ? Math.max(...arr) : null;
    const min = arr => arr.length ? Math.min(...arr) : null;

    return {
      tempoMedio: avg(totais),
      tempoMax: max(totais),
      tempoMin: min(totais),
      tempoPrimeiraAnalise: avg(primeiras)
    };
  }

  /**
   * Cumprimento de prazo detalhado
   */
  function computePrazos(items) {
    const concluidas = items.filter(s =>
      s.status === 'Concluído' && ['No Prazo', 'Atrasado', 'Antecipado'].includes(s.situacaoPrazo)
    );
    const noPrazo = concluidas.filter(s => s.situacaoPrazo === 'No Prazo').length;
    const atrasado = concluidas.filter(s => s.situacaoPrazo === 'Atrasado').length;
    const antecipado = concluidas.filter(s => s.situacaoPrazo === 'Antecipado').length;
    const total = concluidas.length || 1;

    const vencemHoje = items.filter(s => {
      if (s.status === 'Concluído') return false;
      if (!s.dataPrevistaEfetiva) return false;
      return Utils.dateKey(s.dataPrevistaEfetiva) === Utils.dateKey(now());
    }).length;

    // Distribuição de atraso (em dias)
    const atrasosDias = concluidas
      .filter(s => s.situacaoPrazo === 'Atrasado' && s.dataConclusao && s.dataPrevistaEfetiva)
      .map(s => Math.ceil(Utils.diffMs(s.dataPrevistaEfetiva, s.dataConclusao) / 86400000));

    const buckets = { '1 dia': 0, '2-3 dias': 0, '4-7 dias': 0, '> 7 dias': 0 };
    atrasosDias.forEach(d => {
      if (d <= 1) buckets['1 dia']++;
      else if (d <= 3) buckets['2-3 dias']++;
      else if (d <= 7) buckets['4-7 dias']++;
      else buckets['> 7 dias']++;
    });

    return {
      noPrazo,
      atrasado,
      antecipado,
      pctNoPrazo: noPrazo / total,
      pctAtrasado: atrasado / total,
      pctAntecipado: antecipado / total,
      vencemHoje,
      buckets,
      totalConcluidasComPrazo: concluidas.length
    };
  }

  /**
   * Fila atual (apenas abertos, ordenados)
   */
  function computeFila(items) {
    return items
      .filter(s => s.status === 'Aberto' || s.status === 'Em Andamento')
      .sort((a, b) => {
        const da = a.dataAbertura ? a.dataAbertura.getTime() : 0;
        const db = b.dataAbertura ? b.dataAbertura.getTime() : 0;
        return da - db;
      });
  }

  /**
   * Valores únicos para popular selects de filtro
   */
  function uniqueValues(items, field) {
    return [...new Set(items.map(s => s[field]).filter(Boolean))].sort();
  }

  return {
    enrich,
    applyFilters,
    computeKPIs,
    computeEvolucao,
    groupBy,
    computeTempos,
    computePrazos,
    computeFila,
    uniqueValues
  };
})();
