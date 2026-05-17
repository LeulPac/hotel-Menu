/* utils.js – Shared helper utilities */

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
    t.textContent  = message;
    t.className    = `toast ${type}`;
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
    if (mins < 1)  return 'just now';
    if (mins < 60) return `${mins} min ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24)  return `${hrs}h ago`;
    return new Date(dateStr).toLocaleDateString();
  },

  /** Debounce */
  debounce(fn, ms = 300) {
    let timer;
    return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), ms); };
  },

  /** Category emojis */
  catEmoji(cat) {
    const map = { 'Starters':'🥗', 'Main Course':'🍽️', 'Grills':'🥩', 'Desserts':'🍰', 'Drinks':'🥤' };
    return map[cat] || '🍴';
  },

  /** Escape HTML */
  esc(str) {
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  },

  /** Format date */
  fmtDate(d) {
    return new Date(d).toLocaleString('en-US', { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' });
  },

  /** Print a beautiful receipt for an order */
  printBill(orderId) {
    let order = null;
    // Check in Analytics recent orders
    if (window._recentOrdersForPrinting) order = window._recentOrdersForPrinting.find(o => o.id === orderId);
    // Check in Live orders
    if (!order && window.liveAdmin && window.liveAdmin.orders) order = window.liveAdmin.orders.find(o => o.id === orderId);
    
    if (!order) {
      this.toast('Order details not found for printing', 'error');
      return;
    }

    const itemsHtml = order.items.map(i => `
      <tr>
        <td style="padding: 5px 0;">${this.esc(i.name)}</td>
        <td style="text-align:center;">${i.qty}</td>
        <td style="text-align:right;">${this.currency(i.price * i.qty)}</td>
      </tr>
    `).join('');

    const html = `
      <html>
        <head>
          <title>Bill - Order #${order.id}</title>
          <style>
            body { font-family: 'Courier New', Courier, monospace; padding: 20px; max-width: 350px; margin: auto; color: #000; background: #fff; }
            h2 { text-align: center; margin-bottom: 5px; font-size: 22px; }
            p { text-align: center; margin-top: 0; font-size: 14px; color: #333; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px; }
            th { border-bottom: 1px dashed #000; padding-bottom: 5px; text-align: left; }
            .total-row { border-top: 1px dashed #000; font-weight: bold; font-size: 18px; }
            .total-row td { padding-top: 10px; }
            .footer { text-align: center; font-size: 14px; margin-top: 30px; border-top: 1px dashed #000; padding-top: 15px; }
          </style>
        </head>
        <body onload="window.print(); setTimeout(() => window.close(), 500);">
          <h2>HOTEL RESTAURANT</h2>
          <p>Table ${order.table_number}<br>${this.fmtDate(order.created_at)}</p>
          <p>Order #${order.id}</p>
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th style="text-align:center;">Qty</th>
                <th style="text-align:right;">Price</th>
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
          <div class="footer">Thank you for your visit!</div>
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
