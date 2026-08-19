/* admin/analytics.js – Revenue & Analytics Rendering (Theme Adaptive) */

window.analyticsAdmin = {
  period: 'daily',
  chartInstance: null,
  catChartInstance: null,
  cachedData: null,

  async load() {
    this.bindTabs();
    await this.fetchData();

    if (!this.autoRefreshInterval) {
      this.autoRefreshInterval = setInterval(() => {
        const tab = document.getElementById('tab-analytics');
        if (tab && !tab.classList.contains('hidden')) {
          this.fetchData(true);
        }
      }, 15000);
    }

    // Re-render charts when theme changes
    if (!this._themeListenerBound) {
      this._themeListenerBound = true;
      document.addEventListener('themeChanged', () => {
        if (this.cachedData) {
          this.renderChart(this.cachedData.revenueChart);
          this.renderCategoryChart(this.cachedData.revenueByCategory);
        }
      });
    }
  },

  bindTabs() {
    const tabs = document.querySelectorAll('#analytics-tabs .period-tab');
    if (tabs.length === 0) return;

    tabs.forEach(t => {
      t.addEventListener('click', async (e) => {
        tabs.forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        this.period = e.currentTarget.dataset.period;
        await this.fetchData();
      });
    });
  },

  async fetchData(silent = false) {
    try {
      const data = await api.get(`/api/analytics/${this.period}`);
      this.cachedData = data;
      this.renderStats(data);
      this.renderChart(data.revenueChart);
      this.renderCategoryChart(data.revenueByCategory);
      this.renderTopItems(data.topItems);
      this.renderTableRev(data.revenueByTable);
      this.renderRecentOrders(data.recentOrders);
    } catch (e) {
      if (!silent) utils.toast('Failed to load analytics data', 'error');
    }
  },

  renderStats(data) {
    document.getElementById('stat-rev').textContent = utils.currency(data.totalRevenue);
    document.getElementById('stat-orders').textContent = data.totalOrders;
    document.getElementById('stat-avg').textContent = utils.currency(data.avgOrderValue);
  },

  getCategoryColor(cat) {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const colors = isDark ? {
      'Starters': '#C5A05A',
      'Main Course': '#F3F1EA',
      'Grills': '#A9823D',
      'Desserts': '#E4C788',
      'Drinks': '#92918C',
      'Uncategorized': '#676662'
    } : {
      'Starters': '#9A702E',
      'Main Course': '#17191C',
      'Grills': '#B88B43',
      'Desserts': '#CBB28D',
      'Drinks': '#555A5F',
      'Uncategorized': '#777C80'
    };
    return colors[cat] || colors['Uncategorized'];
  },

  renderChart(chartData) {
    const ctx = document.getElementById('revChart');
    if (!ctx || !chartData) return;

    if (this.chartInstance) {
      this.chartInstance.destroy();
    }

    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const barColor = isDark ? '#C5A05A' : '#17191C';
    const barHover = isDark ? '#D6B873' : '#9A702E';
    const gridColor = isDark ? '#303945' : '#EAE7E0';
    const tickColor = isDark ? '#92918C' : '#777C80';
    const tooltipBg = isDark ? '#222A34' : '#17191C';
    const tooltipText = isDark ? '#F3F1EA' : '#FFFFFF';

    const labels = chartData.map(d => d.label);
    const values = chartData.map(d => d.value);

    this.chartInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Revenue ($)',
          data: values,
          backgroundColor: barColor,
          hoverBackgroundColor: barHover,
          borderRadius: 2,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: tooltipBg,
            titleColor: tooltipText,
            bodyColor: tooltipText,
            titleFont: { family: "'Plus Jakarta Sans', sans-serif", size: 12 },
            bodyFont: { family: "'Plus Jakarta Sans', sans-serif", size: 13, weight: 'bold' },
            padding: 10,
            cornerRadius: 4,
            callbacks: {
              label: function(context) {
                return ` Revenue: ${utils.currency(context.raw)}`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { font: { family: "'Plus Jakarta Sans', sans-serif", size: 11 }, color: tickColor }
          },
          y: {
            beginAtZero: true,
            grid: { color: gridColor },
            ticks: {
              font: { family: "'Plus Jakarta Sans', sans-serif", size: 11 },
              color: tickColor,
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

    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const borderColor = isDark ? '#1B222B' : '#FFFFFF';
    const textColor = isDark ? '#C0BDB5' : '#555A5F';
    const tooltipBg = isDark ? '#222A34' : '#17191C';
    const tooltipText = isDark ? '#F3F1EA' : '#FFFFFF';

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
          borderWidth: 2,
          borderColor: borderColor
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '70%',
        plugins: {
          legend: {
            position: 'right',
            labels: {
              font: { family: "'Plus Jakarta Sans', sans-serif", size: 11, weight: '600' },
              boxWidth: 10,
              usePointStyle: true,
              color: textColor
            }
          },
          tooltip: {
            backgroundColor: tooltipBg,
            titleColor: tooltipText,
            bodyColor: tooltipText,
            padding: 10,
            cornerRadius: 4,
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
      list.innerHTML = `<div class="empty-state" style="padding:var(--sp-4) 0">No orders recorded in this period.</div>`;
      return;
    }

    list.innerHTML = items.map((i, idx) => {
      return `
        <div class="top-item-row">
          <div class="top-item-rank">#${idx + 1}</div>
          <div class="top-item-info">
            <div class="top-item-name">${utils.esc(i.name)} <span style="font-size:0.75rem; color:var(--clr-text-muted);">(${i.qty} ordered)</span></div>
            <div class="top-item-cat">${utils.esc(i.category)}</div>
          </div>
          <div class="top-item-revenue">${utils.currency(i.revenue)}</div>
        </div>
      `;
    }).join('');
  },

  renderTableRev(tables) {
    const tbody = document.getElementById('table-rev-tbody');
    if (!tbody || !tables) return;

    if (tables.length === 0) {
      tbody.innerHTML = `<tr><td colspan="2" class="text-muted" style="padding:12px;">No dining data for this period.</td></tr>`;
      return;
    }

    tbody.innerHTML = tables.slice(0, 10).map(t => `
      <tr>
        <td><strong>${utils.esc(t.table)}</strong></td>
        <td style="text-align:right; font-family:var(--font-sans); font-weight:700; color:var(--clr-text);">${utils.currency(t.revenue)}</td>
      </tr>
    `).join('');
  },

  renderRecentOrders(orders) {
    const tbody = document.getElementById('recent-orders-tbody');
    if (!tbody || !orders) return;

    window._recentOrdersForPrinting = orders;

    if (orders.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="text-muted text-center" style="padding:var(--sp-6)">No orders available for billing.</td></tr>`;
      return;
    }

    tbody.innerHTML = orders.map(o => {
      const dt = new Date(o.created_at).toLocaleString('en-US', { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' });
      let tableStr = `Delivery (${utils.esc(o.customer_name || 'Guest')})`;
      if (o.table_number) {
        if (o.customer_name === 'Room Service') {
          tableStr = `Suite #${o.table_number} (Room Service)`;
        } else if (o.customer_name === 'Restaurant Dining') {
          tableStr = `Table #${o.table_number} (Restaurant)`;
        } else {
          tableStr = `Room / Table #${o.table_number}`;
        }
      }
      return `
        <tr>
          <td><strong>#${o.id}</strong></td>
          <td style="color:var(--clr-text-muted); font-size:0.8rem;">${dt}</td>
          <td><span style="font-weight:600;">${tableStr}</span></td>
          <td><strong style="font-family:var(--font-sans); font-size:0.95rem; color:var(--clr-text); font-variant-numeric:tabular-nums;">${utils.currency(o.total)}</strong></td>
          <td style="text-align:right">
            <button class="btn btn-sm btn-ghost" style="padding:3px 10px; font-size:0.75rem;" onclick="utils.printBill(${o.id})">Print Bill</button>
          </td>
        </tr>
      `;
    }).join('');
  },

  exportPDF() {
    const token = localStorage.getItem('adminToken');
    const url = `/api/analytics/${this.period}/pdf`;
    
    utils.toast('Generating culinary report PDF...', 'info');
    
    fetch(url, { headers: { 'Authorization': `Bearer ${token}` } })
      .then(res => res.blob())
      .then(blob => {
        const a = document.createElement('a');
        a.href = window.URL.createObjectURL(blob);
        a.download = `GrandHotel-RevenueReport-${this.period}-${new Date().toISOString().split('T')[0]}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        utils.toast('Report downloaded successfully', 'info');
      })
      .catch(() => {
        utils.toast('Failed to export PDF report', 'error');
      });
  }
};
