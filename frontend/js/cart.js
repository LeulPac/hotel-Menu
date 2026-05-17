/* cart.js – Client-side cart logic & table submission */

window.Cart = {
  items: {}, // { itemId: qty }
  menuItems: [], // cache of loaded menu

  init() {
    try {
      const stored = localStorage.getItem('qr_cart');
      if (stored) this.items = JSON.parse(stored);
    } catch(e) {}
    this.updateUI();
  },

  setMenuCache(items) {
    this.menuItems = items;
    this.updateUI(); // refresh prices
  },

  add(id) {
    this.items[id] = (this.items[id] || 0) + 1;
    this.save();
    utils.toast('Item added to cart', 'info', 1500);
    this.updateUI();
    
    // Dispatch event so menu.js can update card qty
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
    
    // Update sticky bar
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

    // Update modal
    const modalItems = document.getElementById('cart-items');
    if (modalItems) {
      if (lines.length === 0) {
        modalItems.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🛒</div><div>Your cart is empty</div></div>';
      } else {
        modalItems.innerHTML = lines.map(l => `
          <div class="cart-item">
            <div class="cart-item-name">${l.qty}x ${utils.esc(l.name)}</div>
            <div class="cart-item-price">${utils.currency(l.price * l.qty)}</div>
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
    
    // check table input
    this.validateTable();
  },

  closeModal() {
    document.getElementById('cart-modal').classList.remove('open');
    document.getElementById('overlay').classList.remove('active');
  },

  validateTable() {
    const input = document.getElementById('table-input');
    const btn   = document.getElementById('place-order-btn');
    const err   = document.getElementById('table-error');
    if(!input || !btn) return;

    const val = input.value.trim();
    if (!val || isNaN(val) || parseInt(val) < 1) {
      btn.disabled = true;
      if (val !== '') {
        input.classList.add('error');
        err.classList.add('show');
      } else {
        input.classList.remove('error');
        err.classList.remove('show');
      }
      return false;
    }
    
    input.classList.remove('error');
    err.classList.remove('show');
    btn.disabled = false;
    return true;
  },

  async submitOrder() {
    if (!this.validateTable()) return;

    const table_number = document.getElementById('table-input').value.trim();
    const { lines } = this.getTotals();
    
    const items = lines.map(l => ({ itemId: l.id, qty: l.qty }));
    
    const btn = document.getElementById('place-order-btn');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner" style="width:20px;height:20px;margin:0;border-width:2px;"></span> Placing...';

    try {
      const res = await api.post('/api/orders', { table_number, items });
      
      this.closeModal();
      this.clear();
      document.getElementById('table-input').value = '';
      
      // Show success screen
      document.getElementById('menu-wrapper').classList.add('hidden');
      document.getElementById('success-wrapper').classList.remove('hidden');
      
    } catch (err) {
      console.error(err);
      utils.toast(err.message || 'Failed to place order', 'error');
      btn.disabled = false;
      btn.textContent = 'Place Order';
    }
  }
};

window.addEventListener('DOMContentLoaded', () => Cart.init());
