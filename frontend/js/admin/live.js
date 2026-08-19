/* admin/live.js – Live Orders Operational Dashboard (Luxury Hospitality Theme) */

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
      console.warn('Socket.io not available. Using polling.');
      setInterval(() => this.fetchLiveOrders(true), 4000);
      return;
    }

    this.socket = io();
    
    this.socket.on('connect', () => {
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
          this.orders.splice(idx, 1);
        } else {
          this.orders[idx] = updated;
        }
        this.render();
      }
    });
  },

  notifyNewOrder() {
    utils.toast('New Guest Order Received', 'info');
    
    const audio = document.getElementById('audio-alert');
    if (audio) {
      audio.play().catch(() => {});
    }

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
      utils.toast(`Order #${id} status: ${newStatus}`, 'info', 1800);
    } catch (e) {
      utils.toast('Failed to update status', 'error');
    }
  },

  bindFilters() {
    const tabs = document.querySelectorAll('#tab-live .filter-tab');
    tabs.forEach(t => {
      t.addEventListener('click', (e) => {
        tabs.forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        this.filter = e.currentTarget.dataset.filter;
        this.render();
      });
    });

    const notifTrigger = document.querySelector('.nav-item[data-tab="live"]');
    if (notifTrigger) {
      notifTrigger.addEventListener('click', () => {
        const dot = document.getElementById('notif-dot');
        if (dot) dot.classList.remove('show');
      });
    }
  },

  render() {
    const grid = document.getElementById('orders-grid');
    if (!grid) return;

    let filtered = this.orders;
    if (this.filter !== 'all') {
      filtered = this.orders.filter(o => o.status === this.filter);
    }

    if (filtered.length === 0) {
      grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;">No active orders under this filter.</div>`;
      return;
    }

    grid.innerHTML = filtered.map(o => {
      const itemsHtml = o.items.map(i => `
        <div class="order-item-row">
          <span><strong>${i.qty}×</strong> ${utils.esc(i.name)}</span>
          <span style="font-weight:600;">${utils.currency(i.price * i.qty)}</span>
        </div>
      `).join('');

      let actionHtml = '';
      if (o.status === 'New') {
        actionHtml = `<button class="status-btn status-btn-prep" onclick="liveAdmin.updateStatus(${o.id}, 'Preparing')">Start Preparing</button>`;
      } else if (o.status === 'Preparing') {
        actionHtml = `<button class="status-btn status-btn-ready" onclick="liveAdmin.updateStatus(${o.id}, 'Ready')">Mark Ready</button>`;
      } else if (o.status === 'Ready') {
        actionHtml = `<button class="status-btn status-btn-done" onclick="liveAdmin.updateStatus(${o.id}, 'Delivered')">Complete &amp; Deliver</button>`;
      }

      // Identify Room Service vs Table Dining vs Takeaway
      let locationBadgeHtml = '';
      if (o.table_number) {
        if (o.customer_name === 'Room Service') {
          locationBadgeHtml = `<span class="order-location-badge room">🏨 Room Suite #${o.table_number}</span>`;
        } else if (o.customer_name === 'Restaurant Dining') {
          locationBadgeHtml = `<span class="order-location-badge table">🍽️ Table #${o.table_number}</span>`;
        } else {
          locationBadgeHtml = `<span class="order-location-badge table">🍽️ Table #${o.table_number}</span>`;
        }
      } else {
        locationBadgeHtml = `<span class="order-location-badge delivery">🚗 Delivery</span>`;
      }
      
      let customerHtml = '';
      if (!o.table_number && o.customer_name) {
        customerHtml = `
          <div style="font-size: 12px; color: var(--clr-text-secondary); margin-bottom: 8px; border-bottom: 1px solid var(--clr-border-subtle); padding-bottom: 6px;">
            <div><strong>Guest:</strong> ${utils.esc(o.customer_name)}</div>
            <div><strong>Contact:</strong> <a href="tel:${utils.esc(o.customer_phone)}" style="color:var(--clr-accent); text-decoration:none;">${utils.esc(o.customer_phone)}</a></div>
            <div><strong>Location:</strong> ${utils.esc(o.customer_location)}</div>
          </div>
        `;
      }

      return `
        <div class="order-card status-${o.status.toLowerCase()}">
          <div class="order-card-head">
            <div>
              <div class="order-table-num">${locationBadgeHtml}</div>
              <div class="order-id-sub" style="margin-top:4px;">Order #${o.id}</div>
            </div>
            <div style="text-align:right;">
              <span class="badge badge-${o.status.toLowerCase()}">${o.status}</span>
              <div class="order-time" style="margin-top:2px;">${utils.timeAgo(o.created_at)}</div>
            </div>
          </div>
          <div class="order-items-list">
            ${customerHtml}
            ${itemsHtml}
          </div>
          <div class="order-card-foot">
            <div>
              <span style="font-size:10px; text-transform:uppercase; letter-spacing:0.05em; color:var(--clr-text-muted); display:block;">Total Amount</span>
              <span class="order-total">${utils.currency(o.total)}</span>
            </div>
            <div class="order-actions">
              <button class="btn btn-sm btn-ghost" style="padding:4px 8px; font-size:11px;" onclick="utils.printBill(${o.id})" title="Print Receipt">Receipt</button>
              ${actionHtml}
            </div>
          </div>
        </div>
      `;
    }).join('');
  }
};

window.addEventListener('DOMContentLoaded', () => liveAdmin.init());
