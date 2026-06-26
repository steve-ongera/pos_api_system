import { api } from '../api.js';
import { fmt } from '../utils.js';

export async function renderDashboard() {
  const content = document.getElementById('page-content');
  content.innerHTML = `<div style="text-align:center;padding:48px"><span class="spinner" style="width:28px;height:28px;border-width:3px;border-color:rgba(0,0,0,.1);border-top-color:var(--accent)"></span></div>`;

  const today = new Date().toISOString().split('T')[0];

  try {
    const [summary, lowStock] = await Promise.all([
      api.getSummary({ date: today }),
      api.getLowStock(),
    ]);

    content.innerHTML = `
      <!-- Stat tiles -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon blue"><i class="bi bi-bag-check"></i></div>
          <div class="stat-label">Today's Orders</div>
          <div class="stat-value">${summary.total_orders}</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon green"><i class="bi bi-cash-stack"></i></div>
          <div class="stat-label">Today's Revenue</div>
          <div class="stat-value" style="font-size:17px">${fmt.money(summary.net_revenue || summary.total_revenue)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon warn"><i class="bi bi-receipt-cutoff"></i></div>
          <div class="stat-label">Voided Orders</div>
          <div class="stat-value">${summary.voided_orders}</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon red"><i class="bi bi-exclamation-triangle"></i></div>
          <div class="stat-label">Low Stock Items</div>
          <div class="stat-value">${lowStock.length}</div>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
        <!-- Payment breakdown -->
        <div class="card">
          <div class="card-header"><span class="card-title">Payment Breakdown</span></div>
          <div class="card-body">
            ${['cash','mpesa','card'].map(pm => {
              const val = Number(summary.payment_breakdown?.[pm] || 0);
              const total = Number(summary.total_revenue || 1);
              const pct = total > 0 ? Math.round(val / total * 100) : 0;
              const icons = { cash:'bi-cash', mpesa:'bi-phone', card:'bi-credit-card-2-front' };
              return `
                <div style="margin-bottom:16px">
                  <div class="flex-between mb-4">
                    <span class="flex-center gap-10" style="gap:8px;font-weight:600">
                      <i class="bi ${icons[pm]}"></i> ${pm.toUpperCase()}
                    </span>
                    <span class="mono">${fmt.money(val)}</span>
                  </div>
                  <div style="background:var(--border);border-radius:99px;height:6px">
                    <div style="background:var(--accent);height:6px;border-radius:99px;width:${pct}%;transition:width .5s"></div>
                  </div>
                  <div style="font-size:11px;color:var(--text-2);margin-top:3px">${pct}% of revenue</div>
                </div>`;
            }).join('')}
          </div>
        </div>

        <!-- Top products -->
        <div class="card">
          <div class="card-header"><span class="card-title">Top Products Today</span></div>
          <div class="card-body" style="padding:0">
            ${summary.top_products?.length ? `
              <table>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th class="text-right">Qty</th>
                    <th class="text-right">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  ${summary.top_products.map((p, i) => `
                    <tr>
                      <td>
                        <span style="color:var(--text-3);font-size:12px;margin-right:6px">#${i+1}</span>
                        ${p.product_name}
                      </td>
                      <td class="text-right mono">${p.quantity_sold}</td>
                      <td class="text-right mono">${fmt.money(p.revenue)}</td>
                    </tr>`).join('')}
                </tbody>
              </table>` : `<div class="empty-state"><i class="bi bi-bar-chart"></i><p>No sales yet today</p></div>`}
          </div>
        </div>
      </div>

      <!-- Low stock -->
      ${lowStock.length ? `
        <div class="card" style="margin-top:20px">
          <div class="card-header">
            <span class="card-title"><i class="bi bi-exclamation-triangle text-danger"></i> Low Stock Alert</span>
            <span class="badge badge-danger">${lowStock.length} items</span>
          </div>
          <div class="card-body" style="padding:0">
            <table>
              <thead><tr><th>Product</th><th>SKU</th><th>Stock</th><th>Threshold</th></tr></thead>
              <tbody>
                ${lowStock.map(p => `
                  <tr>
                    <td>${p.name}</td>
                    <td class="mono text-muted">${p.sku}</td>
                    <td><span class="badge badge-danger">${p.stock}</span></td>
                    <td class="mono text-muted">${p.low_stock_threshold}</td>
                  </tr>`).join('')}
              </tbody>
            </table>
          </div>
        </div>` : ''}`;
  } catch(e) {
    content.innerHTML = `<div class="empty-state"><i class="bi bi-wifi-off"></i><p>Could not load dashboard data.</p></div>`;
  }
}
