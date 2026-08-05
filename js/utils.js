/**
 * Utilitários gerais
 */
const Utils = {
  parseDate(value) {
    if (!value && value !== 0) return null;
    if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
    if (typeof value === 'number' && value > 20000 && value < 60000) {
      const d = new Date((value - 25569) * 86400 * 1000);
      return isNaN(d.getTime()) ? null : d;
    }
    const str = String(value).trim();
    if (!str) return null;
    const br = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
    if (br) {
      const [, d, m, y, h = 0, min = 0, s = 0] = br;
      const date = new Date(+y, +m - 1, +d, +h, +min, +s);
      return isNaN(date.getTime()) ? null : date;
    }
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

  formatNumber(n) {
    if (n == null || isNaN(n)) return '—';
    return Number(n).toLocaleString('pt-BR');
  },

  diffMs(start, end) {
    const a = start instanceof Date ? start : this.parseDate(start);
    const b = end instanceof Date ? end : this.parseDate(end);
    if (!a || !b) return null;
    return b.getTime() - a.getTime();
  },

  addDays(date, days) {
    const d = new Date(date.getTime());
    d.setDate(d.getDate() + days);
    return d;
  },

  startOfDay(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
  },

  dateKey(date) {
    const d = date instanceof Date ? date : this.parseDate(date);
    if (!d) return null;
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  },

  dateLabel(key) {
    if (!key) return '';
    const [, m, d] = key.split('-');
    return `${d}/${m}`;
  },

  debounce(fn, wait = 300) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), wait);
    };
  },

  toast(message, type = 'info', duration = 4000) {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    const icons = { success: 'check-circle-fill', error: 'exclamation-triangle-fill', info: 'info-circle-fill' };
    el.innerHTML = `<i class="bi bi-${icons[type] || icons.info}"></i><span>${message}</span>`;
    container.appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));
    setTimeout(() => {
      el.classList.remove('show');
      setTimeout(() => el.remove(), 300);
    }, duration);
  },

  showLoading(show = true, msg = 'Carregando dados...') {
    const el = document.getElementById('loadingOverlay');
    if (!el) return;
    const text = el.querySelector('.loading-text');
    if (text) text.textContent = msg;
    if (show) el.classList.remove('hidden');
    else el.classList.add('hidden');
  },

  escapeHtml(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  },

  uid() {
    return Math.random().toString(36).slice(2, 10);
  }
};
