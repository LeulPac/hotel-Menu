/* menu.js – Guest Dining Menu & Gallery Rendering (Luxury Theme) */

const state = {
  items: [],
  activeCat: 'Starters',
  searchQuery: '',
  isExpanded: false
};

const ITEMS_PER_VIEW = 6; // 3 rows on 2-col tablet / 6 rows on 1-col mobile / 2-3 on desktop

async function loadMenu(silent = false) {
  const grid = document.getElementById('menu-grid');
  if (!silent && grid) {
    grid.innerHTML = Array(6).fill('<div class="skeleton" style="height:260px"></div>').join('');
  }
  
  try {
    const newItems = await api.get('/api/menu');
    // Only re-render if data changed to prevent DOM flickers
    if (JSON.stringify(state.items) !== JSON.stringify(newItems) || !silent) {
      state.items = newItems;
      Cart.setMenuCache(state.items);
      renderMenu();
      if (!silent) buildCategoryTabs();
    }
  } catch (err) {
    if (!silent && grid) {
      grid.innerHTML = `<div class="empty-state">Unable to load culinary selections. Please try refreshing.</div>`;
      console.error(err);
    }
  }
}

function buildCategoryTabs() {
  const cats = [...new Set(state.items.map(i => i.category))];
  const wrap = document.getElementById('category-tabs');
  if (!wrap) return;
  
  if (!cats.includes(state.activeCat) && cats.length) state.activeCat = cats[0];
  
  wrap.innerHTML = cats.map(c => `
    <button class="cat-tab ${c === state.activeCat ? 'active' : ''}" data-cat="${c}">
      ${utils.esc(c)}
    </button>
  `).join('');

  wrap.querySelectorAll('.cat-tab').forEach(b => {
    b.addEventListener('click', (e) => {
      state.activeCat = e.target.closest('button').dataset.cat;
      state.isExpanded = false; // reset expansion on category switch
      wrap.querySelectorAll('.cat-tab').forEach(t => t.classList.remove('active'));
      e.target.closest('button').classList.add('active');
      renderMenu();
    });
  });
}

function toggleExpandMenu() {
  state.isExpanded = !state.isExpanded;
  renderMenu();
  
  // Smoothly scroll down if expanded
  if (state.isExpanded) {
    const moreBtn = document.querySelector('.btn-view-more');
    if (moreBtn) moreBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

function renderMenu() {
  const grid = document.getElementById('menu-grid');
  if (!grid) return;
  
  let filtered = state.items;
  if (state.searchQuery) {
    const q = state.searchQuery.toLowerCase();
    const qSingular = q.endsWith('s') ? q.slice(0, -1) : q;

    filtered = state.items.filter(i => {
      const name = (i.name || '').toLowerCase();
      const cat = (i.category || '').toLowerCase();
      const catSingular = cat.endsWith('s') ? cat.slice(0, -1) : cat;
      const desc = (i.description || '').toLowerCase();

      return name.includes(q) || 
             cat.includes(q) || 
             catSingular.includes(qSingular) ||
             cat.includes(qSingular) ||
             desc.includes(q);
    });
  } else {
    filtered = state.items.filter(i => i.category === state.activeCat);
  }

  if (!filtered.length) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;">No culinary selections found matching your search.</div>`;
    return;
  }

  // Determine items to display based on expansion state
  const totalCount = filtered.length;
  const shouldPaginate = !state.searchQuery && totalCount > ITEMS_PER_VIEW;
  const displayItems = (shouldPaginate && !state.isExpanded) ? filtered.slice(0, ITEMS_PER_VIEW) : filtered;

  const cardsHtml = displayItems.map(item => {
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
      imgHtml = `
        <div class="menu-card-media">
          <div class="menu-card-img-placeholder">
            <span class="placeholder-crest">GH</span>
          </div>
        </div>
      `;
    } else if (images.length === 1) {
      imgHtml = `
        <div class="menu-card-media">
          <img src="${images[0]}" class="menu-card-img" alt="${utils.esc(item.name)}" loading="lazy">
        </div>
      `;
    } else {
      // Multiple images gallery
      const slides = images.map(src => `
        <img src="${src}" class="menu-card-img" alt="${utils.esc(item.name)}" loading="lazy">
      `).join('');

      imgHtml = `
        <div class="menu-card-media">
          <div class="menu-card-gallery" id="gallery-${item.id}">
            ${slides}
          </div>
          <button class="gallery-nav-btn prev" onclick="const g = document.getElementById('gallery-${item.id}'); g.scrollBy({left: -g.clientWidth, behavior: 'smooth'})" title="Previous">‹</button>
          <button class="gallery-nav-btn next" onclick="const g = document.getElementById('gallery-${item.id}'); g.scrollBy({left: g.clientWidth, behavior: 'smooth'})" title="Next">›</button>
        </div>
      `;
    }

    const ctaHtml = !item.available 
      ? `<span class="unavail-label">Unavailable</span>`
      : qty > 0 
        ? `
          <div class="qty-ctrl">
            <button class="qty-btn" onclick="Cart.remove(${item.id})" title="Reduce">−</button>
            <span class="qty-num">${qty}</span>
            <button class="qty-btn" onclick="Cart.add(${item.id})" title="Add">+</button>
          </div>
        `
        : `<button class="add-btn" onclick="Cart.add(${item.id})">+ Add</button>`;

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

  // Append View More / Show Less Button if category has > 6 items
  let moreButtonHtml = '';
  if (shouldPaginate) {
    const remaining = totalCount - ITEMS_PER_VIEW;
    if (!state.isExpanded) {
      moreButtonHtml = `
        <div class="view-more-container" style="grid-column: 1 / -1; display:flex; justify-content:center; padding: var(--sp-4) 0 var(--sp-2);">
          <button class="btn btn-ghost btn-view-more" onclick="toggleExpandMenu()" style="width:100%; max-width:320px; font-weight:700; border-color:var(--clr-border-dark);">
            View More Selections (+${remaining} more) ▾
          </button>
        </div>
      `;
    } else {
      moreButtonHtml = `
        <div class="view-more-container" style="grid-column: 1 / -1; display:flex; justify-content:center; padding: var(--sp-4) 0 var(--sp-2);">
          <button class="btn btn-ghost btn-view-more" onclick="toggleExpandMenu()" style="width:100%; max-width:320px; font-weight:700; border-color:var(--clr-border-dark);">
            Show Less ▴
          </button>
        </div>
      `;
    }
  }

  grid.innerHTML = cardsHtml + moreButtonHtml;
}

// Initialization
document.addEventListener('DOMContentLoaded', () => {
  loadMenu();
  
  // Auto-sync every 3 seconds silently
  setInterval(() => loadMenu(true), 3000);

  document.addEventListener('cartChanged', renderMenu);

  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.addEventListener('input', utils.debounce((e) => {
      state.searchQuery = e.target.value.trim();
      state.isExpanded = false;
      const hd = document.getElementById('section-heading-text');
      const tabs = document.getElementById('category-tabs');
      if (state.searchQuery) {
        if (tabs) tabs.classList.add('hidden');
        if (hd) hd.textContent = `Search Results for "${state.searchQuery}"`;
      } else {
        if (tabs) tabs.classList.remove('hidden');
        if (hd) hd.textContent = 'Culinary Selections';
      }
      renderMenu();
    }, 200));
  }
});
