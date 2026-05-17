/* menu.js – Load menu items, render grid, handle categories */

const state = {
  items: [],
  activeCat: 'Starters',
  searchQuery: ''
};

async function loadMenu(silent = false) {
  const grid = document.getElementById('menu-grid');
  if (!silent) {
    grid.innerHTML = Array(6).fill('<div class="skeleton" style="height:280px"></div>').join('');
  }
  
  try {
    const newItems = await api.get('/api/menu');
    // Only re-render if data actually changed to prevent annoying flickers
    if (JSON.stringify(state.items) !== JSON.stringify(newItems) || !silent) {
      state.items = newItems;
      Cart.setMenuCache(state.items);
      renderMenu();
      if (!silent) buildCategoryTabs();
    }
  } catch (err) {
    if (!silent) {
      grid.innerHTML = `<div class="empty-state">Failed to load menu.</div>`;
      console.error(err);
    }
  }
}

function buildCategoryTabs() {
  const cats = [...new Set(state.items.map(i => i.category))];
  const wrap = document.getElementById('category-tabs');
  
  if (!cats.includes(state.activeCat) && cats.length) state.activeCat = cats[0];
  
  wrap.innerHTML = cats.map(c => `
    <button class="cat-tab ${c === state.activeCat ? 'active' : ''}" data-cat="${c}">
      ${utils.catEmoji(c)} ${utils.esc(c)}
    </button>
  `).join('');

  wrap.querySelectorAll('.cat-tab').forEach(b => {
    b.addEventListener('click', (e) => {
      state.activeCat = e.target.closest('button').dataset.cat;
      wrap.querySelectorAll('.cat-tab').forEach(t => t.classList.remove('active'));
      e.target.closest('button').classList.add('active');
      renderMenu();
    });
  });
}

function renderMenu() {
  const grid = document.getElementById('menu-grid');
  
  let filtered = state.items;
  if (state.searchQuery) {
    const q = state.searchQuery.toLowerCase();
    filtered = state.items.filter(i => 
      i.name.toLowerCase().includes(q) || 
      (i.description && i.description.toLowerCase().includes(q))
    );
  } else {
    filtered = state.items.filter(i => i.category === state.activeCat);
  }

  if (!filtered.length) {
    grid.innerHTML = `<div class="empty-state"><div class="empty-state-icon">🍽️</div><div>No items found</div></div>`;
    return;
  }

  grid.innerHTML = filtered.map(item => {
    const qty = Cart.getQty(item.id);
    
    let images = [];
    if (item.image_path) {
      try {
        images = JSON.parse(item.image_path);
        if (!Array.isArray(images)) images = [item.image_path];
      } catch(e) {
        images = [item.image_path];
      }
    }

    let imgHtml = '';
    if (images.length === 0) {
      imgHtml = `<div class="menu-card-img-placeholder">${utils.catEmoji(item.category)}</div>`;
    } else if (images.length === 1) {
      imgHtml = `<img src="${images[0]}" class="menu-card-img" alt="${utils.esc(item.name)}" loading="lazy">`;
    } else {
      // Multiple images - create a scrollable gallery
      const slides = images.map(src => `
        <img src="${src}" class="menu-card-img" alt="${utils.esc(item.name)}" loading="lazy">
      `).join('');

      imgHtml = `
        <div class="carousel-container" style="position:relative; width:100%; height:175px; overflow:hidden;">
          <div class="menu-card-gallery" id="gallery-${item.id}">
            ${slides}
          </div>
          <!-- Left Arrow -->
          <button class="gallery-nav-btn" onclick="const g = document.getElementById('gallery-${item.id}'); g.scrollBy({left: -g.clientWidth, behavior: 'smooth'})" style="position:absolute; left:8px; top:50%; transform:translateY(-50%); background:rgba(0,0,0,0.45); color:#fff; border:none; border-radius:50%; width:28px; height:28px; display:flex; align-items:center; justify-content:center; cursor:pointer; font-size:14px; z-index:10; font-weight:bold; backdrop-filter:blur(2px);">&lt;</button>
          <!-- Right Arrow -->
          <button class="gallery-nav-btn" onclick="const g = document.getElementById('gallery-${item.id}'); g.scrollBy({left: g.clientWidth, behavior: 'smooth'})" style="position:absolute; right:8px; top:50%; transform:translateY(-50%); background:rgba(0,0,0,0.45); color:#fff; border:none; border-radius:50%; width:28px; height:28px; display:flex; align-items:center; justify-content:center; cursor:pointer; font-size:14px; z-index:10; font-weight:bold; backdrop-filter:blur(2px);">&gt;</button>
        </div>
      `;
    }

    const ctaHtml = !item.available 
      ? `<span class="unavail-label">Unavailable</span>`
      : qty > 0 
        ? `
          <div class="qty-ctrl">
            <button class="qty-btn" onclick="Cart.remove(${item.id})">−</button>
            <span class="qty-num">${qty}</span>
            <button class="qty-btn" onclick="Cart.add(${item.id})">+</button>
          </div>
        `
        : `<button class="add-btn" onclick="Cart.add(${item.id})">+</button>`;

    return `
      <div class="menu-card ${!item.available ? 'unavailable' : ''}">
        ${imgHtml}
        <div class="menu-card-body">
          <div class="menu-card-cat">${utils.esc(item.category)}</div>
          <div class="menu-card-name">${utils.esc(item.name)}</div>
          <div class="menu-card-desc">${utils.esc(item.description || '')}</div>
        </div>
        <div class="menu-card-footer">
          <div class="menu-card-price">${utils.currency(item.price)}</div>
          ${ctaHtml}
        </div>
      </div>
    `;
  }).join('');
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
  loadMenu();
  
  // Auto-refresh the menu every 2 seconds silently
  setInterval(() => loadMenu(true), 2000);

  document.addEventListener('cartChanged', renderMenu);

  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.addEventListener('input', utils.debounce((e) => {
      state.searchQuery = e.target.value.trim();
      const hd = document.getElementById('section-heading-text');
      if (state.searchQuery) {
        document.getElementById('category-tabs').classList.add('hidden');
        if(hd) hd.textContent = 'Search Results';
      } else {
        document.getElementById('category-tabs').classList.remove('hidden');
        if(hd) hd.textContent = 'Menu';
      }
      renderMenu();
    }, 300));
  }
  
  const ti = document.getElementById('table-input');
  if (ti) ti.addEventListener('input', () => Cart.validateTable());
});
