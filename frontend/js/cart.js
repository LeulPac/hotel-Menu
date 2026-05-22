/* cart.js – Client-side cart logic & table submission */

window.Cart = {
  items: {}, // { itemId: qty }
  menuItems: [], // cache of loaded menu
  orderType: 'hotel', // 'hotel' or 'delivery'

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
            <button class="cart-item-remove-btn" onclick="Cart.deleteItem(${l.id})" style="background:none; border:none; color:var(--clr-new); cursor:pointer; font-size:1.4rem; padding:0 var(--sp-1); margin-left:var(--sp-2); display:flex; align-items:center; justify-content:center; font-weight:bold; line-height:1;" title="Remove item">×</button>
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

  setOrderType(type) {
    this.orderType = type;
    const tabHotel = document.getElementById('tab-hotel');
    const tabDelivery = document.getElementById('tab-delivery');
    const formHotel = document.getElementById('form-hotel');
    const formDelivery = document.getElementById('form-delivery');

    if (type === 'hotel') {
      tabHotel.className = 'btn btn-primary';
      tabDelivery.className = 'btn btn-ghost';
      formHotel.style.display = 'block';
      formDelivery.style.display = 'none';
    } else {
      tabHotel.className = 'btn btn-ghost';
      tabDelivery.className = 'btn btn-primary';
      formHotel.style.display = 'none';
      formDelivery.style.display = 'flex';
    }
    
    this.validateTable();
  },

  validateTable() {
    const btn = document.getElementById('place-order-btn');
    if (!btn) return false;

    if (this.orderType === 'hotel') {
      const input = document.getElementById('table-input');
      const err = document.getElementById('table-error');
      if (!input) return false;
      
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

    } else {
      const name = document.getElementById('delivery-name');
      const phone = document.getElementById('delivery-phone');
      const loc = document.getElementById('delivery-location');
      const err = document.getElementById('delivery-error');
      
      const isComplete = name.value.trim() && phone.value.trim() && loc.value.trim();
      
      if (!isComplete) {
        btn.disabled = true;
        if (name.value.trim() || phone.value.trim() || loc.value.trim()) {
          err.classList.add('show');
        } else {
          err.classList.remove('show');
        }
        return false;
      }
      
      err.classList.remove('show');
      btn.disabled = false;
      return true;
    }
  },

  async submitOrder() {
    if (!this.validateTable()) return;

    const payload = {};
    if (this.orderType === 'hotel') {
      payload.table_number = document.getElementById('table-input').value.trim();
    } else {
      payload.customer_name = document.getElementById('delivery-name').value.trim();
      payload.customer_phone = document.getElementById('delivery-phone').value.trim();
      payload.customer_location = document.getElementById('delivery-location').value.trim();
    }

    const { lines } = this.getTotals();
    payload.items = lines.map(l => ({ itemId: l.id, qty: l.qty }));
    
    const btn = document.getElementById('place-order-btn');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner" style="width:20px;height:20px;margin:0;border-width:2px;"></span> Placing...';

    try {
      const res = await api.post('/api/orders', payload);
      
      this.closeModal();
      this.clear();
      document.getElementById('table-input').value = '';
      document.getElementById('delivery-name').value = '';
      document.getElementById('delivery-phone').value = '';
      document.getElementById('delivery-location').value = '';
      
      // Show success screen
      document.getElementById('menu-wrapper').classList.add('hidden');
      document.getElementById('success-wrapper').classList.remove('hidden');
      
    } catch (err) {
      console.error(err);
      utils.toast(err.message || 'Failed to place order', 'error');
      btn.disabled = false;
      btn.textContent = 'Confirm & Place Order';
    }
  }
};

window.addEventListener('DOMContentLoaded', () => Cart.init());
