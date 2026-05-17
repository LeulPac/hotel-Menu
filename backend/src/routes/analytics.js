const express        = require('express');
const PDFDocument    = require('pdfkit');
const db             = require('../config/db');
const { requireAuth} = require('../middleware/auth');

const router = express.Router();

// ─── Helpers ─────────────────────────────────────────────────────────────────

function dateRange(period) {
  const now   = new Date();
  let   start = new Date();
  switch (period) {
    case 'daily':   start.setHours(0,0,0,0); break;
    case 'weekly':  start.setDate(now.getDate() - 6); start.setHours(0,0,0,0); break;
    case 'monthly': start.setDate(1);         start.setHours(0,0,0,0); break;
    case 'yearly':  start.setMonth(0,1);       start.setHours(0,0,0,0); break;
    default:        start.setHours(0,0,0,0);
  }
  return { start, end: now };
}

function groupLabel(period, dateStr) {
  const d = new Date(dateStr);
  switch (period) {
    case 'daily':   return `${d.getHours()}:00`;
    case 'weekly':  return ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getDay()];
    case 'monthly': return `${d.getDate()}`;
    case 'yearly':  return ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()];
    default:        return dateStr;
  }
}

// ─── GET /api/analytics/:period ──────────────────────────────────────────────
router.get('/:period', requireAuth, async (req, res) => {
  const period = req.params.period; // daily|weekly|monthly|yearly
  const { start, end } = dateRange(period);

  try {
    const [orders] = await db.execute(
      `SELECT id, table_number, items, total, created_at
       FROM orders
       WHERE created_at BETWEEN ? AND ?
       ORDER BY created_at ASC`,
      [start, end]
    );

    const parseJson = (val) => {
      if (typeof val === 'string') {
        try { return JSON.parse(val); } catch(e) { return []; }
      }
      return val || [];
    };

    // Parse JSON items
    const parsed = orders.map(o => ({ ...o, items: parseJson(o.items) }));

    // ── Fetch Menu Categories for precise mapping
    const [menuRows] = await db.execute('SELECT name, category FROM menu_items');
    const catMap = {};
    menuRows.forEach(row => catMap[row.name] = row.category);

    // ── Aggregate totals
    const totalRevenue    = parsed.reduce((s, o) => s + parseFloat(o.total), 0);
    const totalOrders     = parsed.length;
    const avgOrderValue   = totalOrders ? totalRevenue / totalOrders : 0;

    // ── Revenue over time (bar chart data)
    const revenueMap = {};
    parsed.forEach(o => {
      const label = groupLabel(period, o.created_at);
      revenueMap[label] = (revenueMap[label] || 0) + parseFloat(o.total);
    });
    const revenueChart = Object.entries(revenueMap).map(([label, value]) => ({ label, value: parseFloat(value.toFixed(2)) }));

    // ── Revenue by Category & Top-selling items
    const itemMap = {};
    const categoryRevMap = {};
    
    parsed.forEach(o => {
      o.items.forEach(item => {
        const cat = catMap[item.name] || 'Uncategorized';
        
        // Category grouping
        const itemTotal = item.price * item.qty;
        categoryRevMap[cat] = (categoryRevMap[cat] || 0) + itemTotal;

        // Top items grouping
        if (!itemMap[item.name]) itemMap[item.name] = { name: item.name, category: cat, qty: 0, revenue: 0 };
        itemMap[item.name].qty     += item.qty;
        itemMap[item.name].revenue += itemTotal;
      });
    });

    const topItems = Object.values(itemMap)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10)
      .map(i => ({ ...i, revenue: parseFloat(i.revenue.toFixed(2)) }));

    const revenueByCategory = Object.entries(categoryRevMap)
      .map(([label, value]) => ({ label, value: parseFloat(value.toFixed(2)) }));

    // ── Revenue by table
    const tableMap = {};
    parsed.forEach(o => {
      const t = `Table ${o.table_number}`;
      tableMap[t] = (tableMap[t] || 0) + parseFloat(o.total);
    });
    const revenueByTable = Object.entries(tableMap)
      .map(([table, revenue]) => ({ table, revenue: parseFloat(revenue.toFixed(2)) }))
      .sort((a, b) => b.revenue - a.revenue);

    // ── Recent Orders (for bill printing) - Independent of Date Filter
    const [recentRows] = await db.execute(
      `SELECT id, table_number, items, total, created_at
       FROM orders
       ORDER BY created_at DESC
       LIMIT 50`
    );
    const recentOrders = recentRows.map(o => ({ 
      ...o, 
      items: parseJson(o.items) 
    }));

    res.json({
      period,
      totalRevenue:  parseFloat(totalRevenue.toFixed(2)),
      totalOrders,
      avgOrderValue: parseFloat(avgOrderValue.toFixed(2)),
      revenueChart,
      revenueByCategory,
      topItems,
      revenueByTable,
      recentOrders
    });
  } catch (err) {
    console.error('Analytics error:', err);
    res.status(500).json({ error: 'Failed to load analytics.' });
  }
});

// ─── GET /api/analytics/:period/pdf ──────────────────────────────────────────
router.get('/:period/pdf', requireAuth, async (req, res) => {
  const period = req.params.period;
  const { start, end } = dateRange(period);

  const parseJson = (val) => {
    if (typeof val === 'string') {
      try { return JSON.parse(val); } catch(e) { return []; }
    }
    return val || [];
  };

  try {
    const [orders] = await db.execute(
      `SELECT id, table_number, items, total, created_at
       FROM orders WHERE created_at BETWEEN ? AND ? ORDER BY created_at ASC`,
      [start, end]
    );
    const parsed      = orders.map(o => ({ ...o, items: parseJson(o.items) }));
    const totalRevenue = parsed.reduce((s, o) => s + parseFloat(o.total), 0);
    const totalOrders  = parsed.length;
    const avg          = totalOrders ? totalRevenue / totalOrders : 0;

    // Top items
    const itemMap = {};
    parsed.forEach(o => o.items.forEach(item => {
      if (!itemMap[item.name]) itemMap[item.name] = { name: item.name, qty: 0, revenue: 0 };
      itemMap[item.name].qty     += item.qty;
      itemMap[item.name].revenue += item.price * item.qty;
    }));
    const topItems = Object.values(itemMap).sort((a,b) => b.revenue - a.revenue).slice(0, 10);

    // Build PDF
    const doc = new PDFDocument({ margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="report-${period}-${Date.now()}.pdf"`);
    doc.pipe(res);

    // Header
    doc.fontSize(22).fillColor('#1a1a2e').text('Hotel Restaurant – Revenue Report', { align: 'center' });
    doc.fontSize(12).fillColor('#555').text(`Period: ${period.toUpperCase()}   |   ${start.toDateString()} – ${end.toDateString()}`, { align: 'center' });
    doc.moveDown();

    // Summary
    doc.fontSize(16).fillColor('#1a1a2e').text('Summary', { underline: true });
    doc.fontSize(12).fillColor('#333');
    doc.text(`Total Revenue:    $${totalRevenue.toFixed(2)}`);
    doc.text(`Total Orders:     ${totalOrders}`);
    doc.text(`Avg Order Value:  $${avg.toFixed(2)}`);
    doc.moveDown();

    // Top Items
    doc.fontSize(16).fillColor('#1a1a2e').text('Top Selling Items', { underline: true });
    doc.fontSize(11).fillColor('#333');
    topItems.forEach((item, i) => {
      doc.text(`${i + 1}. ${item.name}  –  Qty: ${item.qty}  –  Revenue: $${item.revenue.toFixed(2)}`);
    });
    doc.moveDown();

    // Orders table
    doc.fontSize(16).fillColor('#1a1a2e').text('Order Details', { underline: true });
    doc.fontSize(10).fillColor('#333');
    parsed.slice(0, 100).forEach(o => {
      const dt = new Date(o.created_at).toLocaleString();
      doc.text(`#${o.id}  Table ${o.table_number}  $${parseFloat(o.total).toFixed(2)}  ${dt}`);
    });
    if (parsed.length > 100) doc.text(`... and ${parsed.length - 100} more orders.`);

    doc.end();
  } catch (err) {
    console.error('PDF error:', err);
    res.status(500).json({ error: 'Failed to generate PDF.' });
  }
});

module.exports = router;
