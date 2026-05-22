/* admin/live.js – Live orders websocket & UI rendering */

window.liveAdmin = {
  orders: [],
  filter: 'all',
  socket: null,

  async init() {
    this.setupSocket();
    await this.fetchLiveOrders();
    this.bindFilters();
  },

  setupSocket() {
    if (typeof io === 'undefined') {
      console.warn('Socket.io not loaded. Falling back to polling.');
      setInterval(() => this.fetchLiveOrders(true), 5000);
      return;
    }

    this.socket = io();
    
    this.socket.on('connect', () => {
      console.log('Socket connected');
      this.socket.emit('joinAdmin');
    });

    this.socket.on('newOrder', (order) => {
      this.orders.unshift(order);
      this.render();
      this.notifyNewOrder();
    });

    this.socket.on('orderUpdated', (updated) => {
      const idx = this.orders.findIndex(o => o.id === updated.id);
      if (idx !== -1) {
        if (updated.status === 'Delivered') {
          this.orders.splice(idx, 1); // remove from live view
        } else {
          this.orders[idx] = updated;
        }
        this.render();
      }
    });
  },

  notifyNewOrder() {
    utils.toast('New Order Received!', 'info');
    
    // Play sound if possible
    const audio = document.getElementById('audio-alert');
    if (audio) {
      audio.play().catch(e => console.log('Audio autoplay blocked'));
    }

    // Show dot
    const dot = document.getElementById('notif-dot');
    if (dot) dot.classList.add('show');
  },

  async fetchLiveOrders(silent = false) {
    try {
      this.orders = await api.get('/api/orders/live');
      this.render();
    } catch (e) {
      if (!silent) console.error('Failed to fetch orders:', e);
    }
  },

  async updateStatus(id, newStatus) {
    try {
      const updated = await api.patch(`/api/orders/${id}/status`, { status: newStatus });
      
      const idx = this.orders.findIndex(o => o.id === id);
      if (idx !== -1) {
        if (newStatus === 'Delivered') {
          this.orders.splice(idx, 1);
        } else {
          this.orders[idx] = updated;
        }
        this.render();
      }
    } catch (e) {
      utils.toast('Failed to update status', 'error');
    }
  },

  bindFilters() {
    const tabs = document.querySelectorAll('#tab-live .filter-tab');
    tabs.forEach(t => {
      t.addEventListener('click', (e) => {
        tabs.forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        this.filter = e.target.dataset.filter;
        this.render();
      });
    });

    // Clear notif dot on click
    document.querySelector('.nav-item[data-tab="live"]').addEventListener('click', () => {
      const dot = document.getElementById('notif-dot');
      if (dot) dot.classList.remove('show');
    });
  },

  render() {
    const grid = document.getElementById('orders-grid');
    if (!grid) return;

    let filtered = this.orders;
    if (this.filter !== 'all') {
      filtered = this.orders.filter(o => o.status === this.filter);
    }

    if (filtered.length === 0) {
      grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;">No orders to display.</div>`;
      return;
    }

    grid.innerHTML = filtered.map(o => {
      const itemsHtml = o.items.map(i => `
        <div class="order-item-row">
          <span>${i.qty}x ${utils.esc(i.name)}</span>
          <span>${utils.currency(i.price * i.qty)}</span>
        </div>
      `).join('');

      let actionHtml = '';
      if (o.status === 'New') {
        actionHtml = `<button class="status-btn status-btn-prep" onclick="liveAdmin.updateStatus(${o.id}, 'Preparing')">Start Preparing</button>`;
      } else if (o.status === 'Preparing') {
        actionHtml = `<button class="status-btn status-btn-ready" onclick="liveAdmin.updateStatus(${o.id}, 'Ready')">Mark Ready</button>`;
      } else if (o.status === 'Ready') {
        actionHtml = `<button class="status-btn status-btn-done" onclick="liveAdmin.updateStatus(${o.id}, 'Delivered')">Deliver</button>`;
      }

      const tableStr = o.table_number ? `T${o.table_number}` : 'Delivery';
      
      let customerHtml = '';
      if (!o.table_number && o.customer_name) {
        customerHtml = `
          <div class="order-customer-details" style="font-size: 13px; color: var(--clr-text-secondary); margin-bottom: 8px; border-bottom: 1px dashed var(--clr-border); padding-bottom: 8px;">
            <strong>👤 ${utils.esc(o.customer_name)}</strong><br>
            📞 <a href="tel:${utils.esc(o.customer_phone)}" style="color:var(--clr-primary); text-decoration:none;">${utils.esc(o.customer_phone)}</a><br>
            📍 ${utils.esc(o.customer_location)}
          </div>
        `;
      }

      return `
        <div class="order-card status-${o.status.toLowerCase()} ${o.status === 'New' && (Date.now() - new Date(o.created_at).getTime() < 30000) ? 'is-new' : ''}">
          <div class="order-card-head">
            <div style="display:flex; align-items:baseline; gap:var(--sp-2)">
              <span class="order-table-num">${tableStr}</span>
              <span class="badge badge-${o.status.toLowerCase()}">${o.status}</span>
            </div>
            <div class="order-time">${utils.timeAgo(o.created_at)}</div>
          </div>
          <div class="order-items-list">
            ${customerHtml}
            ${itemsHtml}
          </div>
          <div class="order-card-foot">
            <div class="order-total">${utils.currency(o.total)}</div>
            <div class="order-actions">
              <button class="btn btn-sm btn-ghost" style="padding:4px 8px; font-size:14px; margin-right:4px; color:var(--clr-primary);" onclick="utils.printBill(${o.id})" title="Print Bill">🖨️</button>
              ${actionHtml}
            </div>
          </div>
        </div>
      `;
    }).join('');
  }
};

window.addEventListener('DOMContentLoaded', () => liveAdmin.init());
