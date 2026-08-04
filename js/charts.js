/**
 * Gerenciamento de gráficos (Chart.js)
 */

const Charts = (() => {
  const instances = {};
  const C = CONFIG.CHART_COLORS;

  const defaultOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: { font: { family: 'Inter', size: 11 }, color: '#475569', usePointStyle: true, padding: 16 }
      },
      tooltip: {
        backgroundColor: '#0a2540',
        titleFont: { family: 'Inter', size: 12 },
        bodyFont: { family: 'Inter', size: 11 },
        padding: 10,
        cornerRadius: 8
      }
    }
  };

  function destroy(id) {
    if (instances[id]) {
      instances[id].destroy();
      delete instances[id];
    }
  }

  function getCtx(id) {
    const canvas = document.getElementById(id);
    if (!canvas) return null;
    destroy(id);
    return canvas.getContext('2d');
  }

  function evolucao(canvasId, series) {
    const ctx = getCtx(canvasId);
    if (!ctx) return;

    instances[canvasId] = new Chart(ctx, {
      type: 'line',
      data: {
        labels: series.map(s => s.label),
        datasets: [
          {
            label: 'Abertas',
            data: series.map(s => s.abertas),
            borderColor: C.blue,
            backgroundColor: 'rgba(26, 95, 158, 0.08)',
            fill: true,
            tension: 0.35,
            pointRadius: 3,
            pointHoverRadius: 5
          },
          {
            label: 'Concluídas',
            data: series.map(s => s.concluidas),
            borderColor: C.green,
            backgroundColor: 'rgba(5, 150, 105, 0.08)',
            fill: true,
            tension: 0.35,
            pointRadius: 3,
            pointHoverRadius: 5
          },
          {
            label: 'Backlog',
            data: series.map(s => s.backlog),
            borderColor: C.orange,
            backgroundColor: 'transparent',
            borderDash: [5, 4],
            tension: 0.35,
            pointRadius: 2,
            pointHoverRadius: 4
          }
        ]
      },
      options: {
        ...defaultOptions,
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 10 }, color: '#94a3b8', maxRotation: 0 } },
          y: { beginAtZero: true, grid: { color: '#f1f5f9' }, ticks: { font: { size: 10 }, color: '#94a3b8', precision: 0 } }
        }
      }
    });
  }

  function backlog(canvasId, series) {
    const ctx = getCtx(canvasId);
    if (!ctx) return;

    instances[canvasId] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: series.map(s => s.label),
        datasets: [{
          label: 'Backlog',
          data: series.map(s => s.backlog),
          backgroundColor: 'rgba(234, 88, 12, 0.7)',
          borderRadius: 4,
          barPercentage: 0.7
        }]
      },
      options: {
        ...defaultOptions,
        plugins: { ...defaultOptions.plugins, legend: { display: false } },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 10 }, color: '#94a3b8' } },
          y: { beginAtZero: true, grid: { color: '#f1f5f9' }, ticks: { font: { size: 10 }, color: '#94a3b8', precision: 0 } }
        }
      }
    });
  }

  function statusDonut(canvasId, kpis) {
    const ctx = getCtx(canvasId);
    if (!ctx) return;

    instances[canvasId] = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Abertas', 'Em Andamento', 'Concluídas'],
        datasets: [{
          data: [kpis.abertas, kpis.andamento, kpis.concluidas],
          backgroundColor: [C.blue, C.cyan, C.green],
          borderWidth: 0,
          hoverOffset: 6
        }]
      },
      options: {
        ...defaultOptions,
        cutout: '62%',
        plugins: {
          ...defaultOptions.plugins,
          legend: { position: 'bottom', labels: { font: { family: 'Inter', size: 11 }, color: '#475569', usePointStyle: true, padding: 14 } }
        }
      }
    });
  }

  function horizontalBar(canvasId, groups, color = C.blue, limit = 8) {
    const ctx = getCtx(canvasId);
    if (!ctx) return;
    const data = groups.slice(0, limit);

    instances[canvasId] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: data.map(g => g.nome.length > 18 ? g.nome.slice(0, 16) + '…' : g.nome),
        datasets: [{
          label: 'Quantidade',
          data: data.map(g => g.qtd),
          backgroundColor: color,
          borderRadius: 4,
          barPercentage: 0.65
        }]
      },
      options: {
        ...defaultOptions,
        indexAxis: 'y',
        plugins: {
          ...defaultOptions.plugins,
          legend: { display: false },
          tooltip: {
            ...defaultOptions.plugins.tooltip,
            callbacks: {
              afterLabel: (ctx) => {
                const g = data[ctx.dataIndex];
                return g ? `${Utils.formatPercent(g.pct)} do total` : '';
              }
            }
          }
        },
        scales: {
          x: { beginAtZero: true, grid: { color: '#f1f5f9' }, ticks: { font: { size: 10 }, color: '#94a3b8', precision: 0 } },
          y: { grid: { display: false }, ticks: { font: { size: 11 }, color: '#334155' } }
        }
      }
    });
  }

  function pie(canvasId, groups, limit = 7) {
    const ctx = getCtx(canvasId);
    if (!ctx) return;
    const data = groups.slice(0, limit);
    // Agrupa o resto em "Outros"
    if (groups.length > limit) {
      const resto = groups.slice(limit).reduce((s, g) => s + g.qtd, 0);
      data.push({ nome: 'Outros', qtd: resto, pct: resto / (groups.reduce((s, g) => s + g.qtd, 0) || 1) });
    }

    instances[canvasId] = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: data.map(g => g.nome),
        datasets: [{
          data: data.map(g => g.qtd),
          backgroundColor: C.palette.slice(0, data.length),
          borderWidth: 0,
          hoverOffset: 6
        }]
      },
      options: {
        ...defaultOptions,
        cutout: '55%',
        plugins: {
          ...defaultOptions.plugins,
          legend: { position: 'bottom', labels: { font: { family: 'Inter', size: 10 }, color: '#475569', usePointStyle: true, padding: 10 } }
        }
      }
    });
  }

  function prazosDonut(canvasId, prazos) {
    const ctx = getCtx(canvasId);
    if (!ctx) return;

    instances[canvasId] = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['No Prazo', 'Antecipado', 'Atrasado'],
        datasets: [{
          data: [prazos.noPrazo, prazos.antecipado, prazos.atrasado],
          backgroundColor: [C.green, C.indigo, C.red],
          borderWidth: 0,
          hoverOffset: 6
        }]
      },
      options: {
        ...defaultOptions,
        cutout: '60%',
        plugins: {
          ...defaultOptions.plugins,
          legend: { position: 'bottom', labels: { font: { family: 'Inter', size: 11 }, color: '#475569', usePointStyle: true, padding: 14 } }
        }
      }
    });
  }

  function atrasoBarras(canvasId, buckets) {
    const ctx = getCtx(canvasId);
    if (!ctx) return;
    const labels = Object.keys(buckets);
    const values = Object.values(buckets);

    instances[canvasId] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Qtd. Atrasadas',
          data: values,
          backgroundColor: [C.orange, '#f97316', C.red, '#991b1b'],
          borderRadius: 6,
          barPercentage: 0.6
        }]
      },
      options: {
        ...defaultOptions,
        plugins: { ...defaultOptions.plugins, legend: { display: false } },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 11 }, color: '#475569' } },
          y: { beginAtZero: true, grid: { color: '#f1f5f9' }, ticks: { font: { size: 10 }, color: '#94a3b8', precision: 0 } }
        }
      }
    });
  }

  return {
    evolucao,
    backlog,
    statusDonut,
    horizontalBar,
    pie,
    prazosDonut,
    atrasoBarras,
    destroy
  };
})();
