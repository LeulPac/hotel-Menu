/* utils.js – Shared helper utilities (Luxury Hospitality Theme) */

window.utils = {
  /** Format a number as currency */
  currency(amount) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  },

  /** Show a temporary toast message */
  toast(message, type = 'info', duration = 3000) {
    let t = document.getElementById('global-toast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'global-toast';
      t.className = 'toast';
      document.body.appendChild(t);
    }
    t.textContent = message;
    t.className   = `toast ${type}`;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => t.classList.add('show'));
    });
    clearTimeout(t._timer);
    t._timer = setTimeout(() => t.classList.remove('show'), duration);
  },

  /** Relative time string e.g. "3 min ago" */
  timeAgo(dateStr) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1)  return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24)  return `${hrs}h ago`;
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  },

  /** Debounce helper */
  debounce(fn, ms = 300) {
    let timer;
    return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), ms); };
  },

  /** Refined Category Initial Monogram */
  catEmoji(cat) {
    const map = { 'Starters':'ST', 'Main Course':'MC', 'Grills':'GR', 'Desserts':'DS', 'Drinks':'DR' };
    return map[cat] || 'GH';
  },

  /** Escape HTML */
  esc(str) {
    return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  },

  /** Format date */
  fmtDate(d) {
    return new Date(d).toLocaleString('en-US', { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' });
  },

  /** Theme switcher (Dark / Bright Mode) */
  initTheme() {
    const saved = localStorage.getItem('hotel_theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    this.setTheme(saved);
  },

  setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('hotel_theme', theme);
    const btns = document.querySelectorAll('.theme-toggle-btn');
    btns.forEach(b => {
      b.innerHTML = theme === 'dark' ? '☀️' : '🌙';
      b.setAttribute('title', theme === 'dark' ? 'Switch to Bright Mode' : 'Switch to Dark Mode');
      b.setAttribute('aria-label', theme === 'dark' ? 'Switch to Bright Mode' : 'Switch to Dark Mode');
    });
    document.dispatchEvent(new CustomEvent('themeChanged', { detail: { theme } }));
  },

  toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    this.setTheme(current);
    this.toast(current === 'dark' ? 'Obsidian Dark Mode enabled' : 'Ivory Bright Mode enabled', 'info', 1800);
  },

  /** Print receipt / bill for hotel order */
  printBill(orderId) {
    let order = null;
    if (window._recentOrdersForPrinting) order = window._recentOrdersForPrinting.find(o => o.id === orderId);
    if (!order && window.liveAdmin && window.liveAdmin.orders) order = window.liveAdmin.orders.find(o => o.id === orderId);
    
    if (!order) {
      this.toast('Order details not found for printing', 'error');
      return;
    }

    const itemsHtml = order.items.map(i => `
      <tr>
        <td style="padding: 6px 0; font-size: 13px;">${this.esc(i.name)}</td>
        <td style="text-align:center; padding: 6px 0; font-size: 13px;">${i.qty}</td>
        <td style="text-align:right; padding: 6px 0; font-size: 13px;">${this.currency(i.price * i.qty)}</td>
      </tr>
    `).join('');

    let diningLocation = `Delivery: ${this.esc(order.customer_name || 'Guest')}`;
    if (order.table_number) {
      if (order.customer_name === 'Room Service') {
        diningLocation = `Room Service: Suite #${order.table_number}`;
      } else if (order.customer_name === 'Restaurant Dining') {
        diningLocation = `Restaurant: Table #${order.table_number}`;
      } else {
        diningLocation = `Location: #${order.table_number}`;
      }
    }

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Guest Receipt - #${order.id}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600;700&family=Plus+Jakarta+Sans:wght@400;600;700&display=swap');
            body { font-family: 'Plus Jakarta Sans', sans-serif; padding: 24px; max-width: 320px; margin: auto; color: #111; background: #fff; line-height: 1.4; }
            .header { text-align: center; border-bottom: 1px solid #ddd; padding-bottom: 12px; margin-bottom: 12px; }
            .hotel-name { font-family: 'Cormorant Garamond', serif; font-size: 20px; font-weight: 700; letter-spacing: 1px; margin: 0; }
            .sub { font-size: 10px; text-transform: uppercase; letter-spacing: 2px; color: #777; margin: 4px 0 0; }
            .info { font-size: 11px; margin: 10px 0; color: #444; }
            table { width: 100%; border-collapse: collapse; margin: 14px 0; font-size: 12px; }
            th { border-bottom: 1px solid #111; padding-bottom: 6px; text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; }
            .total-row { border-top: 1px solid #111; font-weight: bold; font-size: 14px; }
            .total-row td { padding-top: 10px; }
            .footer { text-align: center; font-size: 11px; margin-top: 24px; border-top: 1px dashed #ccc; padding-top: 12px; color: #666; }
          </style>
        </head>
        <body onload="window.print(); setTimeout(() => window.close(), 500);">
          <div class="header">
            <h1 class="hotel-name">THE GRAND HOTEL</h1>
            <p class="sub">In-Room Dining &amp; Culinary</p>
          </div>
          <div class="info">
            <div><strong>Order #${order.id}</strong></div>
            <div>${diningLocation}</div>
            <div>${this.fmtDate(order.created_at)}</div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th style="text-align:center;">Qty</th>
                <th style="text-align:right;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
              <tr class="total-row">
                <td colspan="2">TOTAL</td>
                <td style="text-align:right;">${this.currency(order.total)}</td>
              </tr>
            </tbody>
          </table>
          <div class="footer">Thank you for dining with us.</div>
        </body>
      </html>
    `;

    const printWin = window.open('', '_blank');
    if (printWin) {
      printWin.document.write(html);
      printWin.document.close();
    } else {
      this.toast('Popup blocked! Please allow popups to print.', 'error');
    }
  }
};

// Initialize theme immediately on DOM ready
if (typeof document !== 'undefined') {
  const saved = localStorage.getItem('hotel_theme');
  if (saved) document.documentElement.setAttribute('data-theme', saved);
  document.addEventListener('DOMContentLoaded', () => utils.initTheme());
}
