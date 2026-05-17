/* admin/menuAdmin.js – Menu CRUD management */

window.menuAdmin = {
  items: [],

  async load() {
    try {
      this.items = await api.get('/api/menu');
      this.render();
    } catch (e) {
      utils.toast('Failed to load menu items', 'error');
    }
  },

  render() {
    const tbody = document.getElementById('menu-tbody');
    if (!tbody) return;

    if (this.items.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted" style="padding:var(--sp-6)">No menu items found.</td></tr>`;
      return;
    }

    // Group items by category
    const grouped = {};
    this.items.forEach(i => {
      const cat = i.category || 'Uncategorized';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(i);
    });

    let html = '';
    for (const cat of Object.keys(grouped).sort()) {
      const catId = cat.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
      html += `
        <tr onclick="menuAdmin.toggleCategory('${catId}', this)" style="cursor: pointer; user-select: none;">
          <td colspan="6" style="background: var(--clr-surface-2); font-weight: bold; text-transform: uppercase; letter-spacing: 1px; font-size: 0.85rem; padding: var(--sp-2) var(--sp-4);">
            <span class="cat-icon" style="display:inline-block; width:20px; transition: transform 0.2s;">▼</span> ${utils.esc(cat)}
          </td>
        </tr>`;
      
      html += grouped[cat].map(i => {
        let images = [];
        if (i.image_path) {
          try {
            images = JSON.parse(i.image_path);
            if (!Array.isArray(images)) images = [i.image_path];
          } catch(e) {
            images = [i.image_path];
          }
        }
        const firstImg = images.length > 0 ? images[0] : null;
        const imgHtml = firstImg 
          ? `<img src="${firstImg}" class="menu-item-thumb">`
          : `<div class="menu-item-thumb-placeholder">${utils.catEmoji(i.category)}</div>`;

        return `
          <tr class="cat-row-${catId}">
            <td>${imgHtml}</td>
            <td><strong>${utils.esc(i.name)}</strong></td>
            <td><span class="badge" style="background:var(--clr-surface-2)">${utils.esc(i.category)}</span></td>
            <td>${utils.currency(i.price)}</td>
            <td>
              <label class="toggle-switch">
                <input type="checkbox" ${i.available ? 'checked' : ''} onchange="menuAdmin.toggleAvail(${i.id})">
                <div class="toggle-track"></div><div class="toggle-thumb"></div>
              </label>
            </td>
            <td>
              <button class="btn btn-sm btn-ghost" style="padding:4px 8px" onclick="menuAdmin.editItem(${i.id})">Edit</button>
              <button class="btn btn-sm btn-danger" style="padding:4px 8px; margin-left:var(--sp-2)" onclick="menuAdmin.deleteItem(${i.id})">Del</button>
            </td>
          </tr>
        `;
      }).join('');
    }

    tbody.innerHTML = html;
  },

  toggleCategory(catId, headerRow) {
    const rows = document.querySelectorAll(`.cat-row-${catId}`);
    const icon = headerRow.querySelector('.cat-icon');
    let isHidden = false;
    
    rows.forEach(r => {
      if (r.style.display === 'none') {
        r.style.display = '';
        isHidden = false;
      } else {
        r.style.display = 'none';
        isHidden = true;
      }
    });

    if (icon) {
      icon.style.transform = isHidden ? 'rotate(-90deg)' : 'rotate(0deg)';
    }
  },

  async toggleAvail(id) {
    try {
      const updated = await api.patch(`/api/menu/${id}/toggle`);
      const idx = this.items.findIndex(i => i.id === id);
      if (idx !== -1) {
        this.items[idx] = updated;
        utils.toast(`${updated.name} is now ${updated.available ? 'available' : 'unavailable'}`, 'info', 2000);
      }
    } catch (e) {
      utils.toast('Failed to update status', 'error');
      this.load(); // revert
    }
  },

  async deleteItem(id) {
    if (!confirm('Are you sure you want to delete this item?')) return;
    try {
      await api.delete(`/api/menu/${id}`);
      this.items = this.items.filter(i => i.id !== id);
      this.render();
      utils.toast('Item deleted');
    } catch (e) {
      utils.toast('Failed to delete', 'error');
    }
  },

  // Modal handlers
  openModal() {
    document.getElementById('menu-form').reset();
    document.getElementById('item-id').value = '';
    document.getElementById('modal-title').textContent = 'Add Menu Item';
    
    document.getElementById('item-img-preview').innerHTML = '';
    
    document.getElementById('menu-modal').classList.add('open');
    document.getElementById('menu-modal-backdrop').classList.add('open');
  },

  closeModal() {
    document.getElementById('menu-modal').classList.remove('open');
    document.getElementById('menu-modal-backdrop').classList.remove('open');
  },

  editItem(id) {
    const item = this.items.find(i => i.id === id);
    if (!item) return;

    document.getElementById('item-id').value = item.id;
    document.getElementById('item-name').value = item.name;
    document.getElementById('item-cat').value = item.category;
    document.getElementById('item-price').value = item.price;
    document.getElementById('item-desc').value = item.description || '';
    document.getElementById('item-avail').checked = !!item.available;
    
    const previewContainer = document.getElementById('item-img-preview');
    previewContainer.innerHTML = '';
    
    if (item.image_path) {
      let images = [];
      try {
        images = JSON.parse(item.image_path);
        if (!Array.isArray(images)) images = [item.image_path];
      } catch(e) {
        images = [item.image_path];
      }
      images.forEach(src => {
        const img = document.createElement('img');
        img.src = src;
        img.className = 'img-preview show';
        img.style.width = '60px';
        img.style.height = '60px';
        img.style.objectFit = 'cover';
        img.style.borderRadius = '4px';
        previewContainer.appendChild(img);
      });
    }

    document.getElementById('modal-title').textContent = 'Edit Menu Item';
    document.getElementById('menu-modal').classList.add('open');
    document.getElementById('menu-modal-backdrop').classList.add('open');
  },

  previewImage(e) {
    const files = e.target.files;
    const previewContainer = document.getElementById('item-img-preview');
    previewContainer.innerHTML = '';
    
    if (files) {
      Array.from(files).forEach(file => {
        const img = document.createElement('img');
        img.src = URL.createObjectURL(file);
        img.className = 'img-preview show';
        img.style.width = '60px';
        img.style.height = '60px';
        img.style.objectFit = 'cover';
        img.style.borderRadius = '4px';
        previewContainer.appendChild(img);
      });
    }
  },

  async saveItem() {
    const btn = document.getElementById('item-save-btn');
    btn.disabled = true;
    btn.textContent = 'Saving...';

    try {
      const id = document.getElementById('item-id').value;
      const form = new FormData();
      form.append('name', document.getElementById('item-name').value);
      form.append('category', document.getElementById('item-cat').value);
      form.append('price', document.getElementById('item-price').value);
      form.append('description', document.getElementById('item-desc').value);
      form.append('available', document.getElementById('item-avail').checked);
      
      const fileInput = document.getElementById('item-img');
      if (fileInput.files.length > 0) {
        Array.from(fileInput.files).forEach(f => {
          form.append('images', f);
        });
      }

      let res;
      if (id) {
        res = await api.putForm(`/api/menu/${id}`, form);
        const idx = this.items.findIndex(i => i.id === parseInt(id));
        if (idx !== -1) this.items[idx] = res;
      } else {
        res = await api.postForm('/api/menu', form);
        this.items.push(res);
      }

      this.render();
      this.closeModal();
      utils.toast(id ? 'Item updated' : 'Item added', 'success');

    } catch (e) {
      utils.toast(e.message || 'Failed to save', 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Save Item';
    }
  }
};
