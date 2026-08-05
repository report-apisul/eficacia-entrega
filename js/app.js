/**
 * BI Solicitações – Aplicação principal
 * Orquestra carregamento, filtros, renderização e navegação.
 */

const App = (() => {
  let allData = [];      // dados enriquecidos (sem filtro)
  let filteredData = []; // dados após filtros

  const sectionTitles = {
    dashboard: 'Dashboard',
    evolucao: 'Evolução Diária',
    analises: 'Análises',
    prazos: 'Cumprimento de Prazos',
    tabela: 'Detalhamento',
    fila: 'Fila de Atendimento'
  };

  // ---------- Inicialização ----------
  async function init() {
    bindUI();
    await refresh();
    if (CONFIG.AUTO_REFRESH_MS > 0) {
      setInterval(refresh, CONFIG.AUTO_REFRESH_MS);
    }
  }

  function bindUI() {
    // Navegação lateral
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const section = item.dataset.section;
        navigateTo(section);
      });
    });

    // Sidebar collapse
    document.getElementById('sidebarToggle')?.addEventListener('click', () => {
      document.getElementById('sidebar')?.classList.toggle('collapsed');
    });

    // Mobile menu
    document.getElementById('mobileMenu')?.addEventListener('click', () => {
      document.getElementById('sidebar')?.classList.toggle('open');
    });

    // Filtros
    document.getElementById('btnAplicarFiltros')?.addEventListener('click', applyFiltersAndRender);
    document.getElementById('btnLimparFiltros')?.addEventListener('click', clearFilters);
    document.getElementById('btnRefresh')?.addEventListener('click', () => refresh(true));

    // Busca tabela
    const searchInput = document.getElementById('tableSearch');
    if (searchInput) {
      searchInput.addEventListener('input', Utils.debounce(() => {
        applyFiltersAndRender();
      }, 280));
    }

    // Exportações
    document.getElementById('btnExportCSV')?.addEventListener('click', () => TableModule.exportCSV());
    document.getElementById('btnExportExcel')?.addEventListener('click', () => TableModule.exportExcel());

    // Sort headers
    TableModule.bindHeaderSort();
  }

  function navigateTo(section) {
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.querySelector(`.nav-item[data-section="${section}"]`)?.classList.add('active');

    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.getElementById(`section-${section}`)?.classList.add('active');

    document.getElementById('pageTitle').textContent = sectionTitles[section] || 'Dashboard';

    // Fecha sidebar mobile
    document.getElementById('sidebar')?.classList.remove('open');
  }

  // ---------- Dados ----------
  async function refresh(manual = false) {
    try {
      const raw = await DataService.load();
      allData = Calculations.enrich(raw);
      populateFilterOptions();
      applyFiltersAndRender();
      updateLastFetch();
      if (manual) Utils.toast('Dados atualizados', 'success');
    } catch (err) {
      console.error(err);
      allData = [];
      filteredData = [];
      renderErrorState();
      Utils.toast('Não foi possível carregar os dados. Clique em atualizar para tentar novamente.', 'error', 7000);
    }
  }


  function renderErrorState() {
    const containers = document.querySelectorAll('.kpi, .chart-container, .table-container');
    containers.forEach(el => {
      if (el) {
        el.innerHTML = '<div class="empty-state">
          <strong>Dados indisponíveis</strong><br>
          Não foi possível comunicar com a fonte de dados. Tente novamente.
        </div>';
      }
    });
  }

  function getFilters() {
    return {
      periodo: document.getElementById('filtroPeriodo')?.value || '30',
      transportador: document.getElementById('filtroTransportador')?.value || '',
      solicitante: document.getElementById('filtroSolicitante')?.value || '',
      responsavel: document.getElementById('filtroResponsavel')?.value || '',
      status: document.getElementById('filtroStatus')?.value || '',
      tipo: document.getElementById('filtroTipo')?.value || '',
      search: document.getElementById('tableSearch')?.value || ''
    };
  }

  function applyFiltersAndRender() {
    const filters = getFilters();
    filteredData = Calculations.applyFilters(allData, filters);
    renderAll();
  }

  function clearFilters() {
    const ids = ['filtroPeriodo', 'filtroTransportador', 'filtroSolicitante', 'filtroResponsavel', 'filtroStatus', 'filtroTipo'];
    ids.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = id === 'filtroPeriodo' ? '30' : '';
    });
    const search = document.getElementById('tableSearch');
    if (search) search.value = '';
    applyFiltersAndRender();
    Utils.toast('Filtros limpos', 'info');
  }

  function populateFilterOptions() {
    fillSelect('filtroTransportador', Calculations.uniqueValues(allData, 'transportador'));
    fillSelect('filtroSolicitante', Calculations.uniqueValues(allData, 'solicitante'));
    fillSelect('filtroResponsavel', Calculations.uniqueValues(allData, 'responsavel'));
    fillSelect('filtroTipo', Calculations.uniqueValues(allData, 'tipo'));
  }

  function fillSelect(id, values) {
    const sel = document.getElementById(id);
    if (!sel) return;
    const current = sel.value;
    // Mantém a opção "Todos"
    while (sel.options.length > 1) sel.remove(1);
    values.forEach(v => {
      const opt = document.createElement('option');
      opt.value = v;
      opt.textContent = v;
      sel.appendChild(opt);
    });
    if (values.includes(current)) sel.value = current;
  }

  function updateLastFetch() {
    const el = document.getElementById('lastUpdate');
    const t = DataService.getLastFetch();
    if (el && t) {
      el.innerHTML = `<i class="bi bi-arrow-repeat"></i><span>Atualizado às ${Utils.formatDate(t, true).split(' ')[1]}</span>`;
    }
  }

  // ---------- Renderização ----------
  function renderAll() {
    renderKPIs();
    renderDashboardCharts();
    renderEvolucao();
    renderAnalises();
    renderPrazos();
    renderTabela();
    renderFila();
  }

  function renderKPIs() {
    const k = Calculations.computeKPIs(filteredData);
    setText('kpiTotal', k.total);
    setText('kpiAbertas', k.abertas);
    setText('kpiAndamento', k.andamento);
    setText('kpiConcluidas', k.concluidas);
    setText('kpiVencidas', k.vencidas);
    setText('kpiTempoMedio', Utils.formatDuration(k.tempoMedioMs));
    setText('kpiNoPrazo', k.pctNoPrazo != null ? Utils.formatPercent(k.pctNoPrazo) : '—');
    setText('kpiForaPrazo', k.pctForaPrazo != null ? Utils.formatPercent(k.pctForaPrazo) : '—');
  }

  function renderDashboardCharts() {
    const periodo = Number(getFilters().periodo) || 30;
    const days = getFilters().periodo === 'all' ? 90 : periodo;
    const series = Calculations.computeEvolucao(filteredData, days);
    const kpis = Calculations.computeKPIs(filteredData);
    const porSolicitante = Calculations.groupBy(filteredData, 'solicitante');
    const porTransportador = Calculations.groupBy(filteredData, 'transportador');

    Charts.evolucao('chartEvolucao', series);
    Charts.statusDonut('chartStatus', kpis);
    Charts.horizontalBar('chartSolicitantes', porSolicitante, CONFIG.CHART_COLORS.blue, 6);
    Charts.horizontalBar('chartTransportadores', porTransportador, CONFIG.CHART_COLORS.cyan, 6);
  }

  function renderEvolucao() {
    const periodo = Number(getFilters().periodo) || 30;
    const days = getFilters().periodo === 'all' ? 90 : periodo;
    const series = Calculations.computeEvolucao(filteredData, days);
    Charts.evolucao('chartEvolucaoFull', series);
    Charts.backlog('chartBacklog', series);

    const totalAb = series.reduce((s, d) => s + d.abertas, 0);
    const totalCo = series.reduce((s, d) => s + d.concluidas, 0);
    const backlogFinal = series.length ? series[series.length - 1].backlog : 0;
    const resumo = document.getElementById('resumoEvolucao');
    if (resumo) {
      resumo.innerHTML = `
        <div class="metric-grid">
          <div class="metric-item">
            <span class="metric-label">Abertas no período</span>
            <strong class="metric-value">${totalAb}</strong>
          </div>
          <div class="metric-item">
            <span class="metric-label">Concluídas no período</span>
            <strong class="metric-value">${totalCo}</strong>
          </div>
          <div class="metric-item">
            <span class="metric-label">Backlog atual</span>
            <strong class="metric-value">${backlogFinal}</strong>
          </div>
          <div class="metric-item">
            <span class="metric-label">Saldo (Abertas − Concluídas)</span>
            <strong class="metric-value">${totalAb - totalCo}</strong>
          </div>
        </div>
      `;
    }
  }

  function renderAnalises() {
    const porUsuario = Calculations.groupBy(filteredData, 'solicitante');
    const porTransp = Calculations.groupBy(filteredData, 'transportador');
    const porTipo = Calculations.groupBy(filteredData, 'tipo');
    const tempos = Calculations.computeTempos(filteredData);

    Charts.horizontalBar('chartUsuariosFull', porUsuario, CONFIG.CHART_COLORS.navy, 10);
    Charts.horizontalBar('chartTransportadoresFull', porTransp, CONFIG.CHART_COLORS.blueMid, 10);
    Charts.pie('chartTipos', porTipo);

    setText('tempoMedio', Utils.formatDuration(tempos.tempoMedio));
    setText('tempoMax', Utils.formatDuration(tempos.tempoMax));
    setText('tempoMin', Utils.formatDuration(tempos.tempoMin));
    setText('tempoPrimeiraAnalise', Utils.formatDuration(tempos.tempoPrimeiraAnalise));
  }

  function renderPrazos() {
    const p = Calculations.computePrazos(filteredData);
    setText('prazoNoPrazo', p.noPrazo);
    setText('prazoNoPrazoPct', Utils.formatPercent(p.pctNoPrazo));
    setText('prazoAtrasado', p.atrasado);
    setText('prazoAtrasadoPct', Utils.formatPercent(p.pctAtrasado));
    setText('prazoAntecipado', p.antecipado);
    setText('prazoAntecipadoPct', Utils.formatPercent(p.pctAntecipado));
    setText('prazoVencemHoje', p.vencemHoje);

    Charts.prazosDonut('chartPrazos', p);
    Charts.atrasoBarras('chartAtraso', p.buckets);
  }

  function renderTabela() {
    TableModule.setData(filteredData);
  }

  function renderFila() {
    // Fila usa todos os dados (sem filtro de período) para refletir a fila real operacional
    // Mas respeita filtros dimensionais se o usuário quiser focar
    const filtersSemPeriodo = { ...getFilters(), periodo: 'all', search: '' };
    const forFila = Calculations.applyFilters(allData, filtersSemPeriodo);
    const fila = Calculations.computeFila(forFila);
    TableModule.renderFila(fila);
  }

  function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value != null ? value : '—';
  }

  // Public
  return { init, refresh };
})();

// Boot
document.addEventListener('DOMContentLoaded', () => App.init());
