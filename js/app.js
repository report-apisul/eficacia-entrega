/**
 * BI Solicitações – Aplicação principal
 */
const App = (() => {
  let allData = [];
  let filteredData = [];

  const sectionTitles = {
    dashboard: 'Dashboard',
    evolucao: 'Evolução Diária',
    analises: 'Análises',
    prazos: 'Cumprimento de Prazos',
    tabela: 'Detalhamento',
    fila: 'Fila de Atendimento'
  };

  async function init() {
    bindUI();
    await refresh();
  }

  function bindUI() {
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        navigateTo(item.dataset.section);
      });
    });

    document.getElementById('sidebarToggle')?.addEventListener('click', () => {
      document.getElementById('sidebar')?.classList.toggle('collapsed');
    });
    document.getElementById('mobileMenu')?.addEventListener('click', () => {
      document.getElementById('sidebar')?.classList.toggle('open');
    });

    document.getElementById('btnAplicarFiltros')?.addEventListener('click', applyFiltersAndRender);
    document.getElementById('btnLimparFiltros')?.addEventListener('click', clearFilters);
    document.getElementById('btnRefresh')?.addEventListener('click', () => refresh(true));

    const searchInput = document.getElementById('tableSearch');
    if (searchInput) {
      searchInput.addEventListener('input', Utils.debounce(() => applyFiltersAndRender(), 280));
    }

    // Filtros reagem ao change
    ['filtroPeriodo', 'filtroTransportador', 'filtroSolicitante', 'filtroResponsavel', 'filtroStatus', 'filtroTipo', 'filtroRuptura']
      .forEach(id => {
        document.getElementById(id)?.addEventListener('change', applyFiltersAndRender);
      });

    document.getElementById('btnExportCSV')?.addEventListener('click', () => TableModule.exportCSV());
    document.getElementById('btnExportExcel')?.addEventListener('click', () => TableModule.exportExcel());

    TableModule.bindHeaderSort();

    // KPI cards clicáveis para filtrar por status
    document.querySelectorAll('[data-filter-status]').forEach(el => {
      el.addEventListener('click', () => {
        const status = el.dataset.filterStatus;
        const sel = document.getElementById('filtroStatus');
        if (sel) {
          sel.value = status === sel.value ? '' : status;
          applyFiltersAndRender();
          Utils.toast(status ? `Filtro: ${status}` : 'Filtro de status removido', 'info');
        }
      });
    });
  }

  function navigateTo(section) {
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.querySelector(`.nav-item[data-section="${section}"]`)?.classList.add('active');
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.getElementById(`section-${section}`)?.classList.add('active');
    document.getElementById('pageTitle').textContent = sectionTitles[section] || 'Dashboard';
    document.getElementById('sidebar')?.classList.remove('open');
  }

  async function refresh(manual = false) {
    try {
      const raw = await DataService.load();
      allData = Calculations.enrich(raw);
      populateFilterOptions();
      applyFiltersAndRender();
      updateLastFetch();
      hideErrorBanner();
      if (manual) Utils.toast('Dados atualizados com sucesso', 'success');
    } catch (err) {
      console.error(err);
      allData = [];
      filteredData = [];
      showErrorBanner(err.message || 'Não foi possível carregar os dados.');
      Utils.toast('Problema de conexão com a planilha.', 'error', 6000);
    }
  }

  function showErrorBanner(msg) {
    const banner = document.getElementById('errorBanner');
    if (!banner) return;
    banner.querySelector('.error-msg').textContent = msg;
    banner.classList.remove('hidden');
  }

  function hideErrorBanner() {
    document.getElementById('errorBanner')?.classList.add('hidden');
  }

  function getFilters() {
    return {
      periodo: document.getElementById('filtroPeriodo')?.value || '30',
      transportador: document.getElementById('filtroTransportador')?.value || '',
      solicitante: document.getElementById('filtroSolicitante')?.value || '',
      responsavel: document.getElementById('filtroResponsavel')?.value || '',
      status: document.getElementById('filtroStatus')?.value || '',
      tipo: document.getElementById('filtroTipo')?.value || '',
      ruptura: document.getElementById('filtroRuptura')?.value || '',
      search: document.getElementById('tableSearch')?.value || ''
    };
  }

  function applyFiltersAndRender() {
    filteredData = Calculations.applyFilters(allData, getFilters());
    renderAll();
  }

  function clearFilters() {
    ['filtroPeriodo', 'filtroTransportador', 'filtroSolicitante', 'filtroResponsavel', 'filtroStatus', 'filtroTipo', 'filtroRuptura']
      .forEach(id => {
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
      el.innerHTML = `<i class="bi bi-clock-history"></i><span>Atualizado às ${Utils.formatDate(t, true).split(' ')[1]}</span>`;
    }
  }

  function renderAll() {
    renderKPIs();
    renderDashboardCharts();
    renderEvolucao();
    renderAnalises();
    renderPrazos();
    renderTabela();
    renderFila();
  }

  function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value != null ? value : '—';
  }

  function renderKPIs() {
    const k = Calculations.computeKPIs(filteredData);
    setText('kpiTotal', k.total);
    setText('kpiAbertas', k.abertas);
    setText('kpiAndamento', k.andamento);
    setText('kpiConcluidas', k.concluidas);
    setText('kpiVencidas', k.vencidas);
    setText('kpiRupturas', k.rupturas);
    setText('kpiTempoMedio', Utils.formatDuration(k.tempoMedioMs));
    setText('kpiNoPrazo', k.pctNoPrazo != null ? Utils.formatPercent(k.pctNoPrazo) : '—');
    setText('kpiForaPrazo', k.pctForaPrazo != null ? Utils.formatPercent(k.pctForaPrazo) : '—');

    // Fila histórica
    setText('kpiFilaMedia', k.filaMedia != null ? k.filaMedia.toFixed(1) : '—');
    setText('kpiFilaMin', k.filaMin != null ? k.filaMin : '—');
    setText('kpiFilaMax', k.filaMax != null ? k.filaMax : '—');

    // Prazo planejado
    setText('kpiPrazoMedio', k.prazoMedio != null ? `${k.prazoMedio.toFixed(1)} d` : '—');
    setText('kpiPrazoMin', k.prazoMin != null ? `${k.prazoMin} d` : '—');
    setText('kpiPrazoMax', k.prazoMax != null ? `${k.prazoMax} d` : '—');
  }

  function renderDashboardCharts() {
    const periodo = Number(getFilters().periodo) || 30;
    const days = getFilters().periodo === 'all' ? 90 : periodo;
    const series = Calculations.computeEvolucao(filteredData, days);
    const kpis = Calculations.computeKPIs(filteredData);
    Charts.evolucao('chartEvolucao', series);
    Charts.statusDonut('chartStatus', kpis);
    Charts.horizontalBar('chartSolicitantes', Calculations.groupBy(filteredData, 'solicitante'), CONFIG.CHART_COLORS.blue, 6);
    Charts.horizontalBar('chartTransportadores', Calculations.groupBy(filteredData, 'transportador'), CONFIG.CHART_COLORS.cyan, 6);
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
          <div class="metric-item"><span class="metric-label">Abertas no período</span><strong class="metric-value">${totalAb}</strong></div>
          <div class="metric-item"><span class="metric-label">Concluídas no período</span><strong class="metric-value">${totalCo}</strong></div>
          <div class="metric-item"><span class="metric-label">Backlog atual</span><strong class="metric-value">${backlogFinal}</strong></div>
          <div class="metric-item"><span class="metric-label">Saldo (Ab. − Conc.)</span><strong class="metric-value">${totalAb - totalCo}</strong></div>
        </div>`;
    }
  }

  function renderAnalises() {
    const porUsuario = Calculations.groupBy(filteredData, 'solicitante');
    const porTransp = Calculations.groupBy(filteredData, 'transportador');
    const porTipo = Calculations.groupBy(filteredData, 'tipo');
    const tempos = Calculations.computeTempos(filteredData);
    const kpis = Calculations.computeKPIs(filteredData);

    Charts.horizontalBar('chartUsuariosFull', porUsuario, CONFIG.CHART_COLORS.navy, 10);
    Charts.horizontalBar('chartTransportadoresFull', porTransp, CONFIG.CHART_COLORS.blueMid, 10);
    Charts.pie('chartTipos', porTipo);
    Charts.rupturaBar('chartRuptura', kpis.rupturas, filteredData.length - kpis.rupturas);

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
    const filtersSemPeriodo = { ...getFilters(), periodo: 'all', search: '' };
    const forFila = Calculations.applyFilters(allData, filtersSemPeriodo);
    TableModule.renderFila(Calculations.computeFila(forFila));
  }

  return { init, refresh };
})();

document.addEventListener('DOMContentLoaded', () => App.init());
