/**
 * Tabela detalhada + fila – ordenação, paginação e exportação
 */
const TableModule = (() => {
  let allRows = [];
  let currentPage = 1;
  let sortField = 'dataAbertura';
  let sortDir = 'desc';
  const pageSize = CONFIG.PAGE_SIZE;

  function setData(rows) {
    allRows = rows;
    currentPage = 1;
    render();
  }

  function sort(field) {
    if (sortField === field) sortDir = sortDir === 'asc' ? 'desc' : 'asc';
    else { sortField = field; sortDir = 'asc'; }
    currentPage = 1;
    render();
  }

  function getSorted() {
    const sorted = [...allRows];
    sorted.sort((a, b) => {
      let va = a[sortField];
      let vb = b[sortField];
      if (va instanceof Date || vb instanceof Date) {
        va = va ? va.getTime() : 0;
        vb = vb ? vb.getTime() : 0;
      }
      if (typeof va === 'number' || typeof vb === 'number') {
        va = va ?? -Infinity;
        vb = vb ?? -Infinity;
      }
      if (typeof va === 'string') va = va.toLowerCase();
      if (typeof vb === 'string') vb = vb.toLowerCase();
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }

  function render() {
    const tbody = document.getElementById('tableBody');
    const info = document.getElementById('tableInfo');
    const pagination = document.getElementById('pagination');
    if (!tbody) return;

    const sorted = getSorted();
    const total = sorted.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    if (currentPage > totalPages) currentPage = totalPages;
    const start = (currentPage - 1) * pageSize;
    const pageRows = sorted.slice(start, start + pageSize);

    document.querySelectorAll('#dataTable th[data-sort]').forEach(th => {
      th.classList.remove('sorted-asc', 'sorted-desc');
      if (th.dataset.sort === sortField) {
        th.classList.add(sortDir === 'asc' ? 'sorted-asc' : 'sorted-desc');
      }
    });

    if (!pageRows.length) {
      tbody.innerHTML = `<tr><td colspan="18"><div class="empty-state"><i class="bi bi-inbox"></i><p>Nenhuma solicitação encontrada</p></div></td></tr>`;
    } else {
      tbody.innerHTML = pageRows.map(s => `
        <tr>
          <td><strong>${Utils.escapeHtml(s.numero)}</strong></td>
          <td>${Utils.formatDate(s.dataAbertura, true)}</td>
          <td title="${Utils.escapeHtml(s.solicitante)}">${Utils.escapeHtml(s.solicitante)}</td>
          <td title="${Utils.escapeHtml(s.transportador)}">${Utils.escapeHtml(s.transportador)}</td>
          <td>${Utils.escapeHtml(s.tipo)}</td>
          <td><span class="badge-status status-${cssStatus(s.status)}">${s.status}</span></td>
          <td>${Utils.escapeHtml(s.responsavel || '—')}</td>
          <td>${Utils.escapeHtml(s.shipment || '—')}</td>
          <td>${Utils.formatDate(s.dataPrimeiraAnalise, true)}</td>
          <td>${Utils.formatDate(s.dataPrevistaEfetiva)}${s.prazoManual ? '' : ' <small class="hint" title="Calculado (abertura + 5 dias)">*</small>'}</td>
          <td>${Utils.formatDate(s.dataConclusao, true)}</td>
          <td>${Utils.formatDuration(s.tempoPrimeiraAnaliseMs)}</td>
          <td>${Utils.formatDuration(s.tempoTotalMs)}</td>
          <td><span class="badge-prazo prazo-${cssPrazo(s.situacaoPrazo)}">${s.situacaoPrazo}</span></td>
          <td>${s.posicaoFila != null ? s.posicaoFila : '—'}</td>
          <td>${s.qtdAfrente != null ? s.qtdAfrente : '—'}</td>
          <td>${s.filaAbertura != null ? s.filaAbertura : '—'}</td>
          <td title="${Utils.escapeHtml(s.observacoes)}">${Utils.escapeHtml(s.observacoes || '—')}</td>
        </tr>
      `).join('');
    }

    if (info) {
      const from = total === 0 ? 0 : start + 1;
      const to = Math.min(start + pageSize, total);
      info.textContent = `Exibindo ${from}–${to} de ${total}`;
    }

    if (pagination) {
      let html = `<button ${currentPage <= 1 ? 'disabled' : ''} data-page="${currentPage - 1}" aria-label="Anterior"><i class="bi bi-chevron-left"></i></button>`;
      const maxButtons = 5;
      let startP = Math.max(1, currentPage - Math.floor(maxButtons / 2));
      let endP = Math.min(totalPages, startP + maxButtons - 1);
      if (endP - startP < maxButtons - 1) startP = Math.max(1, endP - maxButtons + 1);
      for (let p = startP; p <= endP; p++) {
        html += `<button class="${p === currentPage ? 'active' : ''}" data-page="${p}">${p}</button>`;
      }
      html += `<button ${currentPage >= totalPages ? 'disabled' : ''} data-page="${currentPage + 1}" aria-label="Próxima"><i class="bi bi-chevron-right"></i></button>`;
      pagination.innerHTML = html;
      pagination.querySelectorAll('button[data-page]').forEach(btn => {
        btn.addEventListener('click', () => {
          currentPage = Number(btn.dataset.page);
          render();
        });
      });
    }
  }

  function cssStatus(s) {
    if (s === 'Em Andamento') return 'andamento';
    if (s === 'Concluído') return 'concluido';
    return 'aberto';
  }
  function cssPrazo(s) {
    return String(s).replace(/\s/g, '-');
  }

  function bindHeaderSort() {
    document.querySelectorAll('#dataTable th[data-sort]').forEach(th => {
      th.addEventListener('click', () => sort(th.dataset.sort));
    });
  }

  function exportCSV() {
    const sorted = getSorted();
    if (!sorted.length) { Utils.toast('Nenhum dado para exportar', 'info'); return; }
    const headers = [
      'Número', 'Data Abertura', 'Solicitante', 'Transportador', 'Tipo', 'Status',
      'Responsável', 'Shipment', '1ª Análise', 'Data Prevista', 'Data Conclusão',
      'Tempo 1ª Análise', 'Tempo Total', 'Situação Prazo', 'Posição Fila',
      'Qtd à Frente', 'Fila na Abertura', 'Ruptura', 'Observações'
    ];
    const lines = [headers.join(';')];
    sorted.forEach(s => {
      lines.push([
        s.numero, Utils.formatDate(s.dataAbertura, true), s.solicitante, s.transportador,
        s.tipo, s.status, s.responsavel || '', s.shipment || '',
        Utils.formatDate(s.dataPrimeiraAnalise, true), Utils.formatDate(s.dataPrevistaEfetiva),
        Utils.formatDate(s.dataConclusao, true), Utils.formatDuration(s.tempoPrimeiraAnaliseMs),
        Utils.formatDuration(s.tempoTotalMs), s.situacaoPrazo,
        s.posicaoFila ?? '', s.qtdAfrente ?? '', s.filaAbertura ?? '',
        s.ruptura || '', (s.observacoes || '').replace(/;/g, ',')
      ].join(';'));
    });
    const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    downloadBlob(blob, `solicitacoes_${Utils.dateKey(new Date())}.csv`);
    Utils.toast('CSV exportado', 'success');
  }

  function exportExcel() {
    const sorted = getSorted();
    if (!sorted.length) { Utils.toast('Nenhum dado para exportar', 'info'); return; }
    if (typeof XLSX === 'undefined') {
      Utils.toast('Biblioteca Excel não carregada. Use CSV.', 'error');
      return;
    }
    const data = sorted.map(s => ({
      'Número': s.numero,
      'Data Abertura': Utils.formatDate(s.dataAbertura, true),
      'Solicitante': s.solicitante,
      'Transportador': s.transportador,
      'Tipo': s.tipo,
      'Status': s.status,
      'Responsável': s.responsavel || '',
      'Shipment': s.shipment || '',
      '1ª Análise': Utils.formatDate(s.dataPrimeiraAnalise, true),
      'Data Prevista': Utils.formatDate(s.dataPrevistaEfetiva),
      'Data Conclusão': Utils.formatDate(s.dataConclusao, true),
      'Tempo 1ª Análise': Utils.formatDuration(s.tempoPrimeiraAnaliseMs),
      'Tempo Total': Utils.formatDuration(s.tempoTotalMs),
      'Situação Prazo': s.situacaoPrazo,
      'Posição Fila': s.posicaoFila ?? '',
      'Qtd à Frente': s.qtdAfrente ?? '',
      'Fila na Abertura': s.filaAbertura ?? '',
      'Ruptura': s.ruptura || '',
      'Observações': s.observacoes || ''
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Solicitações');
    XLSX.writeFile(wb, `solicitacoes_${Utils.dateKey(new Date())}.xlsx`);
    Utils.toast('Excel exportado', 'success');
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function renderFila(filaItems) {
    const tbody = document.getElementById('filaBody');
    const badge = document.getElementById('filaBadge');
    if (!tbody) return;
    if (badge) badge.textContent = `${filaItems.length} pendentes`;

    const elTotal = document.getElementById('filaTotal');
    const elAguard = document.getElementById('filaAguardando');
    const elPrazo = document.getElementById('filaComPrazo');
    if (elTotal) elTotal.textContent = filaItems.length;
    if (elAguard) elAguard.textContent = filaItems.filter(s => !s.dataPrimeiraAnalise).length;
    if (elPrazo) elPrazo.textContent = filaItems.filter(s => s.dataPrevista).length;

    if (!filaItems.length) {
      tbody.innerHTML = `<tr><td colspan="11"><div class="empty-state"><i class="bi bi-check2-all"></i><p>Fila vazia — nenhuma solicitação pendente</p></div></td></tr>`;
      return;
    }

    tbody.innerHTML = filaItems.map((s, idx) => {
      const pos = idx + 1;
      const situacao = s.vencida
        ? '<span class="badge-prazo prazo-Vencido">Vencido</span>'
        : s.dataPrimeiraAnalise
          ? '<span class="badge-prazo prazo-No-Prazo">Em análise</span>'
          : '<span class="badge-prazo prazo-Pendente">Aguardando</span>';
      return `
        <tr class="${s.vencida ? 'row-alert' : ''}">
          <td><strong>#${pos}</strong></td>
          <td>${Utils.escapeHtml(s.numero)}</td>
          <td>${Utils.formatDate(s.dataAbertura, true)}</td>
          <td>${Utils.escapeHtml(s.solicitante)}</td>
          <td>${Utils.escapeHtml(s.transportador)}</td>
          <td>${Utils.escapeHtml(s.tipo)}</td>
          <td><span class="badge-status status-${cssStatus(s.status)}">${s.status}</span></td>
          <td>${pos - 1}</td>
          <td>${Utils.formatDate(s.dataPrevistaEfetiva)}${s.prazoManual ? '' : ' *'}</td>
          <td>${s.filaAbertura != null ? s.filaAbertura : '—'}</td>
          <td>${situacao}</td>
        </tr>
      `;
    }).join('');
  }

  return { setData, sort, bindHeaderSort, exportCSV, exportExcel, renderFila, render };
})();
