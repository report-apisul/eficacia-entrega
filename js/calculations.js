/**
 * Regras de negócio e cálculos – alinhado à ATA de 27/07/2026
 */
const Calculations = (() => {
  const now = () => new Date();

  function enrich(items) {
    const sorted = [...items].sort((a, b) => {
      const da = a.dataAbertura ? a.dataAbertura.getTime() : 0;
      const db = b.dataAbertura ? b.dataAbertura.getTime() : 0;
      return da - db;
    });

    const abertos = sorted.filter(s => s.status === 'Aberto' || s.status === 'Em Andamento');
    const totalPendentes = abertos.length;
    const posicaoMap = new Map();
    abertos.forEach((s, idx) => posicaoMap.set(s.numero, idx + 1));

    return sorted.map(s => {
      const enriched = { ...s };

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

      // Dias de prazo planejado (abertura → prevista)
      if (s.dataAbertura && enriched.dataPrevistaEfetiva) {
        const ms = Utils.diffMs(Utils.startOfDay(s.dataAbertura), Utils.startOfDay(enriched.dataPrevistaEfetiva));
        enriched.diasPrazoPlanejado = ms != null ? Math.round(ms / 86400000) : null;
      } else {
        enriched.diasPrazoPlanejado = null;
      }

      enriched.tempoPrimeiraAnaliseMs = (s.dataAbertura && s.dataPrimeiraAnalise)
        ? Utils.diffMs(s.dataAbertura, s.dataPrimeiraAnalise) : null;

      enriched.tempoTotalMs = (s.dataAbertura && s.dataConclusao)
        ? Utils.diffMs(s.dataAbertura, s.dataConclusao) : null;

      if (s.status === 'Aberto' || s.status === 'Em Andamento') {
        enriched.posicaoFila = posicaoMap.get(s.numero) || null;
        enriched.qtdAfrente = enriched.posicaoFila != null ? enriched.posicaoFila - 1 : null;
        enriched.totalPendentes = totalPendentes;
      } else {
        enriched.posicaoFila = null;
        enriched.qtdAfrente = null;
        enriched.totalPendentes = totalPendentes;
      }

      enriched.situacaoPrazo = calcSituacaoPrazo(enriched);
      enriched.vencida = isVencida(enriched);
      enriched.temRuptura = enriched.ruptura === 'SIM';

      return enriched;
    });
  }

  function calcSituacaoPrazo(s) {
    if (s.status === 'Concluído' && s.dataConclusao && s.dataPrevistaEfetiva) {
      const diff = Utils.diffMs(s.dataPrevistaEfetiva, s.dataConclusao);
      if (diff == null) return 'Pendente';
      if (diff < -(CONFIG.ANTECIPADO_HORAS * 3600000)) return 'Antecipado';
      if (diff <= 0) return 'No Prazo';
      return 'Atrasado';
    }
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

  function applyFilters(items, filters = {}) {
    let result = items;

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
    if (filters.ruptura === 'SIM' || filters.ruptura === 'NÃO') {
      result = result.filter(s => s.ruptura === filters.ruptura);
    }
    if (filters.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(s =>
        [s.numero, s.solicitante, s.transportador, s.tipo, s.status, s.responsavel, s.observacoes, s.shipment]
          .some(v => v && String(v).toLowerCase().includes(q))
      );
    }
    return result;
  }

  function computeKPIs(items) {
    const total = items.length;
    const abertas = items.filter(s => s.status === 'Aberto').length;
    const andamento = items.filter(s => s.status === 'Em Andamento').length;
    const concluidas = items.filter(s => s.status === 'Concluído').length;
    const vencidas = items.filter(s => s.vencida).length;
    const rupturas = items.filter(s => s.temRuptura).length;

    const tempos = items.filter(s => s.tempoTotalMs != null && s.tempoTotalMs >= 0).map(s => s.tempoTotalMs);
    const tempoMedioMs = tempos.length ? tempos.reduce((a, b) => a + b, 0) / tempos.length : null;

    const concluidasComPrazo = items.filter(s =>
      s.status === 'Concluído' && ['No Prazo', 'Antecipado', 'Atrasado'].includes(s.situacaoPrazo)
    );
    const noPrazo = concluidasComPrazo.filter(s => s.situacaoPrazo === 'No Prazo' || s.situacaoPrazo === 'Antecipado').length;
    const foraPrazo = concluidasComPrazo.filter(s => s.situacaoPrazo === 'Atrasado').length;
    const pctNoPrazo = concluidasComPrazo.length ? noPrazo / concluidasComPrazo.length : null;
    const pctForaPrazo = concluidasComPrazo.length ? foraPrazo / concluidasComPrazo.length : null;

    // Fila Fixa (histórica)
    const filas = items.map(s => s.filaAbertura).filter(v => v != null);
    const filaMedia = filas.length ? filas.reduce((a, b) => a + b, 0) / filas.length : null;
    const filaMin = filas.length ? Math.min(...filas) : null;
    const filaMax = filas.length ? Math.max(...filas) : null;

    // Prazo planejado (dias)
    const prazos = items.map(s => s.diasPrazoPlanejado).filter(v => v != null && v >= 0);
    const prazoMedio = prazos.length ? prazos.reduce((a, b) => a + b, 0) / prazos.length : null;
    const prazoMin = prazos.length ? Math.min(...prazos) : null;
    const prazoMax = prazos.length ? Math.max(...prazos) : null;

    return {
      total, abertas, andamento, concluidas, vencidas, rupturas,
      tempoMedioMs, noPrazo, foraPrazo, pctNoPrazo, pctForaPrazo,
      totalComPrazo: concluidasComPrazo.length,
      filaMedia, filaMin, filaMax, filaRegistros: filas.length,
      prazoMedio, prazoMin, prazoMax
    };
  }

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

    let backlog = items.filter(s => {
      if (!s.dataAbertura || s.dataAbertura >= cutoff) return false;
      if (s.status === 'Concluído' && s.dataConclusao && s.dataConclusao < cutoff) return false;
      return true;
    }).length;

    return keys.map(k => {
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
  }

  function groupBy(items, field) {
    const map = {};
    items.forEach(s => {
      const key = (s[field] || 'Não informado').toString().trim() || 'Não informado';
      map[key] = (map[key] || 0) + 1;
    });
    const total = items.length || 1;
    return Object.entries(map)
      .map(([nome, qtd]) => ({ nome, qtd, pct: qtd / total }))
      .sort((a, b) => b.qtd - a.qtd);
  }

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

    // Distribuição de atraso: considera concluídos fora do prazo e solicitações abertas/vencidas
    const atrasosDias = items
      .filter(s => {
        const concluidoAtrasado = s.status === 'Concluído' &&
          s.situacaoPrazo === 'Atrasado' &&
          s.dataConclusao &&
          s.dataPrevistaEfetiva;

        const abertoVencido = (s.status === 'Aberto' || s.status === 'Em Andamento') &&
          s.dataPrevistaEfetiva &&
          now() > s.dataPrevistaEfetiva;

        return concluidoAtrasado || abertoVencido;
      })
      .map(s => {
        const dataFinal = s.dataConclusao || now();
        return Math.max(1, Math.ceil(Utils.diffMs(s.dataPrevistaEfetiva, dataFinal) / 86400000));
      });

    const buckets = { '1 dia': 0, '2-3 dias': 0, '4-7 dias': 0, '> 7 dias': 0 };
    atrasosDias.forEach(d => {
      if (d <= 1) buckets['1 dia']++;
      else if (d <= 3) buckets['2-3 dias']++;
      else if (d <= 7) buckets['4-7 dias']++;
      else buckets['> 7 dias']++;
    });

    return {
      noPrazo, atrasado, antecipado,
      pctNoPrazo: noPrazo / total,
      pctAtrasado: atrasado / total,
      pctAntecipado: antecipado / total,
      vencemHoje, buckets,
      totalConcluidasComPrazo: concluidas.length
    };
  }

  function computeFila(items) {
    return items
      .filter(s => s.status === 'Aberto' || s.status === 'Em Andamento')
      .sort((a, b) => {
        const da = a.dataAbertura ? a.dataAbertura.getTime() : 0;
        const db = b.dataAbertura ? b.dataAbertura.getTime() : 0;
        return da - db;
      });
  }

  function uniqueValues(items, field) {
    return [...new Set(items.map(s => s[field]).filter(Boolean).map(v => String(v).trim()))].sort();
  }

  return {
    enrich, applyFilters, computeKPIs, computeEvolucao,
    groupBy, computeTempos, computePrazos, computeFila, uniqueValues
  };
})();
