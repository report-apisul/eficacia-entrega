/**
 * Utilitários gerais
 */

const Utils = {
  /**
   * Parse de data flexível (ISO, BR, serial Excel)
   */
  parseDate(value) {
    if (!value && value !== 0) return null;
    if (value instanceof Date) return isNaN(value.getTime()) ? null : value;

    // Serial Excel (número de dias desde 1899-12-30)
    if (typeof value === 'number' && value > 20000 && value < 60000) {
      const d = new Date((value - 25569) * 86400 * 1000);
      return isNaN(d.getTime()) ? null : d;
    }

    const str = String(value).trim();
    if (!str) return null;

    // dd/mm/yyyy [hh:mm[:ss]]
    const br = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
    if (br) {
      const [, d, m, y, h = 0, min = 0, s = 0] = br;
      const date = new Date(+y, +m - 1, +d, +h, +min, +s);
      return isNaN(date.getTime()) ? null : date;
    }

    // ISO / yyyy-mm-dd
    const iso = new Date(str);
    return isNaN(iso.getTime()) ? null : iso;
  },

  formatDate(date, withTime = false) {
    if (!date) return '—';
    const d = date instanceof Date ? date : this.parseDate(date);
    if (!d) return '—';
    const pad = n => String(n).padStart(2, '0');
    const base = `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
    if (!withTime) return base;
    return `${base} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  },

  formatDuration(ms) {
    if (ms == null || isNaN(ms) || ms < 0) return '—';
    const totalMin = Math.round(ms / 60000);
    if (totalMin < 60) return `${totalMin} min`;
    const hours = Math.floor(totalMin / 60);
    const mins = totalMin % 60;
    if (hours < 24) return mins ? `${hours}h ${mins}min` : `${hours}h`;
    const days = Math.floor(hours / 24);
    const remH = hours % 24;
    return remH ? `${days}d ${remH}h` : `${days}d`;
  },

  formatPercent(value, decimals = 1) {
    if (value == null || isNaN(value)) return '—';
    return `${(value * 100).toFixed(decimals)}%`;
  },

  /** Diferença em milissegundos */
  diffMs(start, end) {
    const a = start instanceof Date ? start : this.parseDate(start);
    const b = end instanceof Date ? end : this.parseDate(end);
    if (!a || !b) return null;
    return b.getTime() - a.getTime();
  },

  /** Adiciona dias a uma data */
  addDays(date, days) {
    const d = new Date(date.getTime());
    d.setDate(d.getDate() + days);
    return d;
  },

  /** Início do dia local */
  startOfDay(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
  },

  /** Chave de data YYYY-MM-DD */
  dateKey(date) {
    const d = date instanceof Date ? date : this.parseDate(date);
    if (!d) return null;
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  },

  /** Label curto DD/MM */
  dateLabel(key) {
    if (!key) return '';
    const [y, m, d] = key.split('-');
    return `${d}/${m}`;
  },

  debounce(fn, wait = 300) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), wait);
    };
  },

  toast(message, type = 'info', duration = 3500) {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.innerHTML = `<i class="bi bi-${type === 'success' ? 'check-circle' : type === 'error' ? 'x-circle' : 'info-circle'}"></i><span>${message}</span>`;
    container.appendChild(el);
    setTimeout(() => {
      el.style.opacity = '0';
      el.style.transform = 'translateX(100%)';
      el.style.transition = '0.3s';
      setTimeout(() => el.remove(), 300);
    }, duration);
  },

  showLoading(show = true) {
    const el = document.getElementById('loadingOverlay');
    if (!el) return;
    if (show) el.classList.remove('hidden');
    else el.classList.add('hidden');
  },

  /** Escape HTML */
  escapeHtml(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  },

  /** Gera ID único simples */
  uid() {
    return Math.random().toString(36).slice(2, 10);
  }
};
