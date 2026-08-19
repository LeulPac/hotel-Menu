/* cart.js – Guest Room Service & Dining Cart (Luxury Hospitality Theme) */

window.Cart = {
  items: {}, // { itemId: qty }
  menuItems: [], // cache of loaded menu
  orderType: 'room', // 'room' | 'table' | 'delivery'

  init() {
    try {
      const stored = localStorage.getItem('qr_cart');
      if (stored) this.items = JSON.parse(stored);
    } catch(e) {}
    this.updateUI();
  },

  setMenuCache(items) {
    this.menuItems = items;
    this.updateUI();
  },

  add(id) {
    this.items[id] = (this.items[id] || 0) + 1;
    this.save();
    utils.toast('Selection added to your order', 'info', 1500);
    this.updateUI();
    document.dispatchEvent(new CustomEvent('cartChanged'));
  },

  remove(id) {
    if (this.items[id]) {
      this.items[id]--;
      if (this.items[id] <= 0) delete this.items[id];
      this.save();
      this.updateUI();
      document.dispatchEvent(new CustomEvent('cartChanged'));
    }
  },

  deleteItem(id) {
    if (this.items[id]) {
      delete this.items[id];
      this.save();
      this.updateUI();
      document.dispatchEvent(new CustomEvent('cartChanged'));
    }
  },

  getQty(id) {
    return this.items[id] || 0;
  },

  save() {
    localStorage.setItem('qr_cart', JSON.stringify(this.items));
  },

  clear() {
    this.items = {};
    this.save();
    this.updateUI();
    document.dispatchEvent(new CustomEvent('cartChanged'));
  },

  getTotals() {
    let count = 0;
    let total = 0;
    const lines = [];

    for (const [idStr, qty] of Object.entries(this.items)) {
      const id = parseInt(idStr);
      const mi = this.menuItems.find(m => m.id === id);
      if (mi) {
        count += qty;
        total += mi.price * qty;
        lines.push({ ...mi, qty });
      }
    }
    return { count, total, lines };
  },

  updateUI() {
    const { count, total, lines } = this.getTotals();
    
    // Sticky bottom bar
    const bar = document.getElementById('cart-bar');
    if (bar) {
      if (count > 0) {
        bar.classList.add('visible');
        document.getElementById('cart-count').textContent = count;
        document.getElementById('cart-total').textContent = utils.currency(total);
      } else {
        bar.classList.remove('visible');
        this.closeModal();
      }
    }

    // Modal list
    const modalItems = document.getElementById('cart-items');
    if (modalItems) {
      if (lines.length === 0) {
        modalItems.innerHTML = '<div class="empty-state">Your order list is currently empty.</div>';
      } else {
        modalItems.innerHTML = lines.map(l => `
          <div class="cart-item">
            <div style="flex:1;">
              <div class="cart-item-name">${utils.esc(l.name)}</div>
              <div style="font-size:0.78rem; color:var(--clr-text-muted);">${utils.currency(l.price)} each</div>
            </div>
            <div style="display:flex; align-items:center; gap:var(--sp-3);">
              <div class="qty-ctrl">
                <button class="qty-btn" onclick="Cart.remove(${l.id})">−</button>
                <span class="qty-num">${l.qty}</span>
                <button class="qty-btn" onclick="Cart.add(${l.id})">+</button>
              </div>
              <div class="cart-item-price">${utils.currency(l.price * l.qty)}</div>
              <button class="cart-item-remove-btn" onclick="Cart.deleteItem(${l.id})" style="background:none; border:none; color:var(--clr-text-muted); cursor:pointer; font-size:1.1rem; padding:2px 4px; display:flex; align-items:center;" title="Remove selection">✕</button>
            </div>
          </div>
        `).join('');
      }
    }
    
    const modalTotal = document.getElementById('cart-modal-total');
    if (modalTotal) modalTotal.textContent = utils.currency(total);
  },

  openModal() {
    const { count } = this.getTotals();
    if (count === 0) return;
    document.getElementById('cart-modal').classList.add('open');
    document.getElementById('overlay').classList.add('active');
    this.validateTable();
  },

  closeModal() {
    const m = document.getElementById('cart-modal');
    const o = document.getElementById('overlay');
    if (m) m.classList.remove('open');
    if (o) o.classList.remove('active');
  },

  setOrderType(type) {
    this.orderType = type;
    const tabRoom = document.getElementById('tab-room');
    const tabTable = document.getElementById('tab-table');
    const tabDelivery = document.getElementById('tab-delivery');
    
    const formRoom = document.getElementById('form-room');
    const formTable = document.getElementById('form-table');
    const formDelivery = document.getElementById('form-delivery');

    // Reset tabs classes
    if (tabRoom) tabRoom.className = type === 'room' ? 'btn btn-primary' : 'btn btn-ghost';
    if (tabTable) tabTable.className = type === 'table' ? 'btn btn-primary' : 'btn btn-ghost';
    if (tabDelivery) tabDelivery.className = type === 'delivery' ? 'btn btn-primary' : 'btn btn-ghost';

    // Show/hide forms
    if (formRoom) formRoom.style.display = type === 'room' ? 'block' : 'none';
    if (formTable) formTable.style.display = type === 'table' ? 'block' : 'none';
    if (formDelivery) formDelivery.style.display = type === 'delivery' ? 'flex' : 'none';
    
    this.validateTable();
  },

  validateTable() {
    const btn = document.getElementById('place-order-btn');
    if (!btn) return false;

    if (this.orderType === 'room') {
      const input = document.getElementById('room-input');
      const err = document.getElementById('room-error');
      if (!input) return false;
      
      const val = input.value.trim();
      if (!val || isNaN(val) || parseInt(val) < 1) {
        btn.disabled = true;
        if (val !== '') {
          input.classList.add('error');
          if (err) err.classList.add('show');
        } else {
          input.classList.remove('error');
          if (err) err.classList.remove('show');
        }
        return false;
      }
      
      input.classList.remove('error');
      if (err) err.classList.remove('show');
      btn.disabled = false;
      return true;

    } else if (this.orderType === 'table') {
      const input = document.getElementById('table-input');
      const err = document.getElementById('table-error');
      if (!input) return false;
      
      const val = input.value.trim();
      if (!val || isNaN(val) || parseInt(val) < 1) {
        btn.disabled = true;
        if (val !== '') {
          input.classList.add('error');
          if (err) err.classList.add('show');
        } else {
          input.classList.remove('error');
          if (err) err.classList.remove('show');
        }
        return false;
      }
      
      input.classList.remove('error');
      if (err) err.classList.remove('show');
      btn.disabled = false;
      return true;

    } else {
      const name = document.getElementById('delivery-name');
      const phone = document.getElementById('delivery-phone');
      const loc = document.getElementById('delivery-location');
      const err = document.getElementById('delivery-error');
      
      const isComplete = name && phone && loc && name.value.trim() && phone.value.trim() && loc.value.trim();
      
      if (!isComplete) {
        btn.disabled = true;
        if (name && (name.value.trim() || phone.value.trim() || loc.value.trim())) {
          if (err) err.classList.add('show');
        } else {
          if (err) err.classList.remove('show');
        }
        return false;
      }
      
      if (err) err.classList.remove('show');
      btn.disabled = false;
      return true;
    }
  },

  async submitOrder() {
    if (!this.validateTable()) return;

    const payload = {};
    if (this.orderType === 'room') {
      payload.table_number = document.getElementById('room-input').value.trim();
      payload.customer_name = 'Room Service';
    } else if (this.orderType === 'table') {
      payload.table_number = document.getElementById('table-input').value.trim();
      payload.customer_name = 'Restaurant Dining';
    } else {
      payload.customer_name = document.getElementById('delivery-name').value.trim();
      payload.customer_phone = document.getElementById('delivery-phone').value.trim();
      payload.customer_location = document.getElementById('delivery-location').value.trim();
    }

    const { lines } = this.getTotals();
    payload.items = lines.map(l => ({ itemId: l.id, qty: l.qty }));
    
    const btn = document.getElementById('place-order-btn');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Transmitting order...';

    try {
      await api.post('/api/orders', payload);
      
      this.closeModal();
      this.clear();
      if (document.getElementById('room-input')) document.getElementById('room-input').value = '';
      if (document.getElementById('table-input')) document.getElementById('table-input').value = '';
      if (document.getElementById('delivery-name')) document.getElementById('delivery-name').value = '';
      if (document.getElementById('delivery-phone')) document.getElementById('delivery-phone').value = '';
      if (document.getElementById('delivery-location')) document.getElementById('delivery-location').value = '';
      
      // Show confirmation
      document.getElementById('menu-wrapper').classList.add('hidden');
      document.getElementById('success-wrapper').classList.remove('hidden');
      
    } catch (err) {
      console.error(err);
      utils.toast(err.message || 'Failed to submit order', 'error');
      btn.disabled = false;
      btn.textContent = 'Send Order to Kitchen';
    }
  }
};

window.addEventListener('DOMContentLoaded', () => Cart.init());
