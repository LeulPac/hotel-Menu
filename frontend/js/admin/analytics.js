/* admin/analytics.js – Revenue & Analytics rendering using Chart.js */

window.analyticsAdmin = {
  period: 'daily',
  chartInstance: null,

  async load() {
    this.bindTabs();
    await this.fetchData();

    // Auto-refresh the analytics every 10 seconds if the tab is active
    if (!this.autoRefreshInterval) {
      this.autoRefreshInterval = setInterval(() => {
        const tab = document.getElementById('tab-analytics');
        if (tab && !tab.classList.contains('hidden')) {
          this.fetchData(true);
        }
      }, 10000);
    }
  },

  bindTabs() {
    const tabs = document.querySelectorAll('#analytics-tabs .period-tab');
    if(tabs.length === 0) return; // avoid rebinding

    tabs.forEach(t => {
      t.addEventListener('click', async (e) => {
        tabs.forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        this.period = e.target.dataset.period;
        await this.fetchData();
      });
    });
  },

  async fetchData(silent = false) {
    try {
      const data = await api.get(`/api/analytics/${this.period}`);
      this.renderStats(data);
      this.renderChart(data.revenueChart);
      this.renderCategoryChart(data.revenueByCategory);
      this.renderTopItems(data.topItems);
      this.renderTableRev(data.revenueByTable);
      this.renderRecentOrders(data.recentOrders);
    } catch (e) {
      if (!silent) utils.toast('Failed to load analytics', 'error');
    }
  },

  renderStats(data) {
    document.getElementById('stat-rev').textContent = utils.currency(data.totalRevenue);
    document.getElementById('stat-orders').textContent = data.totalOrders;
    document.getElementById('stat-avg').textContent = utils.currency(data.avgOrderValue);
  },

  getCategoryColor(cat) {
    const colors = {
      'Starters': '#3b82f6',
      'Main Course': '#10b981',
      'Grills': '#f59e0b',
      'Desserts': '#ec4899',
      'Drinks': '#8b5cf6',
      'Uncategorized': '#6b7280'
    };
    return colors[cat] || colors['Uncategorized'];
  },

  renderChart(chartData) {
    const ctx = document.getElementById('revChart');
    if (!ctx) return;

    if (this.chartInstance) {
      this.chartInstance.destroy();
    }

    const labels = chartData.map(d => d.label);
    const values = chartData.map(d => d.value);

    const primary = getComputedStyle(document.documentElement).getPropertyValue('--clr-primary').trim() || '#4f46e5';

    this.chartInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Revenue',
          data: values,
          backgroundColor: primary,
          borderRadius: 4,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: function(context) {
                return utils.currency(context.raw);
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: function(value) { return '$' + value; }
            }
          }
        }
      }
    });
  },

  renderCategoryChart(catData) {
    const ctx = document.getElementById('catChart');
    if (!ctx || !catData) return;

    if (this.catChartInstance) {
      this.catChartInstance.destroy();
    }

    const labels = catData.map(d => d.label);
    const values = catData.map(d => d.value);
    const colors = labels.map(l => this.getCategoryColor(l));

    this.catChartInstance = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data: values,
          backgroundColor: colors,
          borderWidth: 0,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '65%',
        plugins: {
          legend: { position: 'right' },
          tooltip: {
            callbacks: {
              label: function(context) {
                return ` ${context.label}: ${utils.currency(context.raw)}`;
              }
            }
          }
        }
      }
    });
  },

  renderTopItems(items) {
    const list = document.getElementById('top-items');
    if (!list) return;

    if (!items || items.length === 0) {
      list.innerHTML = `<div class="text-muted" style="padding:var(--sp-4) 0">No items sold yet.</div>`;
      return;
    }

    const maxRev = Math.max(...items.map(i => i.revenue));

    list.innerHTML = items.map((i, idx) => {
      const pct = (i.revenue / maxRev) * 100;
      const rankClass = idx === 0 ? 'gold' : '';
      const catColor = this.getCategoryColor(i.category);
      return `
        <div class="top-item-row">
          <div class="top-item-rank ${rankClass}">${idx + 1}</div>
          <div class="top-item-name">
            <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:${catColor}; margin-right:4px;" title="${i.category}"></span>
            ${utils.esc(i.name)} <span class="text-muted" style="font-size:0.8rem">(${i.qty}x)</span>
          </div>
          <div class="top-item-bar"><div class="top-item-fill" style="width:0%; background:${catColor}" data-target="${pct}%"></div></div>
          <div class="top-item-val">${utils.currency(i.revenue)}</div>
        </div>
      `;
    }).join('');

    setTimeout(() => {
      list.querySelectorAll('.top-item-fill').forEach(f => {
        f.style.width = f.dataset.target;
      });
    }, 50);
  },

  renderTableRev(tables) {
    const tbody = document.getElementById('table-rev-tbody');
    if (!tbody || !tables) return;

    if (tables.length === 0) {
      tbody.innerHTML = `<tr><td colspan="2" class="text-muted">No table data.</td></tr>`;
      return;
    }

    tbody.innerHTML = tables.slice(0, 10).map(t => `
      <tr>
        <td><strong>${utils.esc(t.table)}</strong></td>
        <td style="text-align:right">${utils.currency(t.revenue)}</td>
      </tr>
    `).join('');
  },

  renderRecentOrders(orders) {
    const tbody = document.getElementById('recent-orders-tbody');
    if (!tbody || !orders) return;

    // Attach orders to global for printing access
    window._recentOrdersForPrinting = orders;

    if (orders.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="text-muted text-center" style="padding:var(--sp-4)">No recent orders found.</td></tr>`;
      return;
    }

    tbody.innerHTML = orders.map(o => {
      const dt = new Date(o.created_at).toLocaleString();
      return `
        <tr>
          <td><strong>#${o.id}</strong></td>
          <td class="text-muted">${dt}</td>
          <td><span class="badge" style="background:var(--clr-surface-2)">Table ${o.table_number}</span></td>
          <td><strong>${utils.currency(o.total)}</strong></td>
          <td style="text-align:right">
            <button class="btn btn-sm btn-ghost" style="color:var(--clr-primary)" onclick="utils.printBill(${o.id})">🖨️ Print Bill</button>
          </td>
        </tr>
      `;
    }).join('');
  },

  exportPDF() {
    const token = localStorage.getItem('adminToken');
    const url = `/api/analytics/${this.period}/pdf`;
    
    utils.toast('Generating PDF...', 'info');
    
    fetch(url, { headers: { 'Authorization': `Bearer ${token}` } })
      .then(res => res.blob())
      .then(blob => {
        const a = document.createElement('a');
        a.href = window.URL.createObjectURL(blob);
        a.download = `revenue-report-${this.period}-${new Date().toISOString().split('T')[0]}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        utils.toast('Download complete', 'success');
      })
      .catch(e => {
        utils.toast('Failed to export PDF', 'error');
      });
  }
};
