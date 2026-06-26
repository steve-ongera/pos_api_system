import { api } from '../api.js';
import { fmt } from '../utils.js';

export async function renderDashboard() {
  const content = document.getElementById('page-content');
  content.innerHTML = `
    <div class="loading-state">
      <span class="spinner spinner-dark" style="width:28px;height:28px;border-width:3px"></span>
      Loading dashboard…
    </div>
  `;

  const today = new Date().toISOString().split('T')[0];

  try {
    const [summary, lowStock] = await Promise.all([
      api.getSummary({ date: today }),
      api.getLowStock(),
    ]);

    const totalRevenue = Number(summary.total_revenue || 0);
    const netRevenue = Number(summary.net_revenue || totalRevenue);

    content.innerHTML = `
      <!-- Page Header -->
      <div class="page-header">
        <div class="page-header-left">
          <div class="page-header-title">Dashboard</div>
          <div class="page-header-sub">Overview of today's performance</div>
        </div>
        <div>
          <span class="badge badge-blue">
            <i class="bi bi-calendar3"></i> ${fmt.date(today)}
          </span>
        </div>
      </div>

      <!-- Stat tiles -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-card-top">
            <div>
              <div class="stat-label">Today's Orders</div>
              <div class="stat-value">${summary.total_orders || 0}</div>
            </div>
            <div class="stat-icon blue"><i class="bi bi-bag-check"></i></div>
          </div>
          <div class="stat-sub">
            <i class="bi bi-arrow-${summary.total_orders > 0 ? 'up' : 'down'}-short"></i>
            ${summary.total_orders > 0 ? 'Active' : 'No orders yet'}
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-card-top">
            <div>
              <div class="stat-label">Today's Revenue</div>
              <div class="stat-value" style="font-size:20px;">${fmt.money(netRevenue)}</div>
            </div>
            <div class="stat-icon green"><i class="bi bi-cash-stack"></i></div>
          </div>
          <div class="stat-sub">
            ${totalRevenue > 0 ? `${fmt.money(totalRevenue)} gross` : 'No revenue yet'}
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-card-top">
            <div>
              <div class="stat-label">Voided Orders</div>
              <div class="stat-value">${summary.voided_orders || 0}</div>
            </div>
            <div class="stat-icon warn"><i class="bi bi-receipt-cutoff"></i></div>
          </div>
          <div class="stat-sub">
            ${summary.voided_orders > 0 ? 'Review voided transactions' : 'No voids today'}
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-card-top">
            <div>
              <div class="stat-label">Low Stock Items</div>
              <div class="stat-value">${lowStock.length}</div>
            </div>
            <div class="stat-icon red"><i class="bi bi-exclamation-triangle"></i></div>
          </div>
          <div class="stat-sub">
            ${lowStock.length > 0 ? 'Items need restocking' : 'All items well stocked'}
          </div>
        </div>
      </div>

      <!-- Charts Row -->
      <div class="grid-2">
        <!-- Payment breakdown -->
        <div class="card">
          <div class="card-header">
            <span class="card-title"><i class="bi bi-pie-chart"></i> Payment Breakdown</span>
            <span class="badge badge-gray">Today</span>
          </div>
          <div class="card-body">
            ${['cash','mpesa','card'].map(pm => {
              const val = Number(summary.payment_breakdown?.[pm] || 0);
              const total = totalRevenue || 1;
              const pct = total > 0 ? Math.round(val / total * 100) : 0;
              const icons = { cash:'bi-cash', mpesa:'bi-phone', card:'bi-credit-card-2-front' };
              const colors = { cash:'var(--success)', mpesa:'var(--accent)', card:'var(--warn)' };
              
              return `
                <div style="margin-bottom:16px;">
                  <div class="flex-between" style="margin-bottom:6px;">
                    <span class="flex-center" style="gap:8px;font-weight:600;font-size:13px;">
                      <i class="bi ${icons[pm]}" style="color:${colors[pm]};"></i> 
                      ${pm.toUpperCase()}
                    </span>
                    <span class="mono" style="font-size:14px;font-weight:600;">${fmt.money(val)}</span>
                  </div>
                  <div class="progress-bar-wrap">
                    <div class="progress-bar ${pct > 50 ? 'green' : pct > 25 ? '' : 'orange'}" 
                         style="width:${pct}%;"></div>
                  </div>
                  <div style="font-size:11px;color:var(--text-3);margin-top:4px;">
                    ${pct}% of revenue
                  </div>
                </div>
              `;
            }).join('')}
            ${totalRevenue === 0 ? `
              <div class="empty-state" style="padding:20px 0;">
                <div class="empty-state-icon" style="width:40px;height:40px;font-size:18px;">
                  <i class="bi bi-bar-chart"></i>
                </div>
                <div class="empty-state-sub">No payment data yet</div>
              </div>
            ` : ''}
          </div>
        </div>

        <!-- Top products -->
        <div class="card">
          <div class="card-header">
            <span class="card-title"><i class="bi bi-trophy"></i> Top Products Today</span>
            <span class="badge badge-gray">${summary.top_products?.length || 0} items</span>
          </div>
          <div class="card-body" style="padding:0;">
            ${summary.top_products?.length ? `
              <div class="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th style="width:30px;">#</th>
                      <th>Product</th>
                      <th class="text-right">Qty</th>
                      <th class="text-right">Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${summary.top_products.slice(0, 5).map((p, i) => `
                      <tr>
                        <td style="color:var(--text-3);font-size:12px;font-weight:600;">${i+1}</td>
                        <td style="font-weight:500;">${p.product_name}</td>
                        <td class="text-right mono" style="font-weight:600;">${p.quantity_sold}</td>
                        <td class="text-right mono" style="color:var(--accent);font-weight:600;">${fmt.money(p.revenue)}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            ` : `
              <div class="empty-state" style="padding:32px 0;">
                <div class="empty-state-icon"><i class="bi bi-bar-chart"></i></div>
                <div class="empty-state-title">No sales yet</div>
                <div class="empty-state-sub">Start making sales to see top products</div>
              </div>
            `}
          </div>
        </div>
      </div>

      <!-- Low stock alert -->
      ${lowStock.length ? `
        <div class="card" style="margin-top:20px;">
          <div class="card-header">
            <span class="card-title">
              <i class="bi bi-exclamation-triangle" style="color:var(--danger);"></i> 
              Low Stock Alert
            </span>
            <span class="badge badge-danger">
              <i class="bi bi-exclamation-circle"></i> ${lowStock.length} items
            </span>
          </div>
          <div class="card-body" style="padding:0;">
            <div class="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>SKU</th>
                    <th>Stock</th>
                    <th>Threshold</th>
                    <th class="text-right">Status</th>
                  </tr>
                </thead>
                <tbody>
                  ${lowStock.map(p => `
                    <tr>
                      <td style="font-weight:500;">${p.name}</td>
                      <td class="mono" style="color:var(--text-3);font-size:12px;">${p.sku}</td>
                      <td>
                        <span class="badge badge-danger" style="font-family:var(--mono);">
                          ${p.stock}
                        </span>
                      </td>
                      <td class="mono" style="color:var(--text-3);font-size:12px;">${p.low_stock_threshold}</td>
                      <td class="text-right">
                        <span class="badge badge-danger" style="font-size:10px;">
                          ${p.stock <= 0 ? 'Out of stock' : 'Low stock'}
                        </span>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ` : `
        <div class="card" style="margin-top:20px;border-color:var(--success-border);">
          <div class="card-header" style="background:var(--success-dim);">
            <span class="card-title" style="color:var(--success);">
              <i class="bi bi-check-circle-fill"></i> 
              Stock Status
            </span>
            <span class="badge badge-success">All items well stocked</span>
          </div>
          <div class="card-body" style="text-align:center;padding:32px;color:var(--text-2);">
            <i class="bi bi-box-seam" style="font-size:32px;color:var(--success);display:block;margin-bottom:8px;"></i>
            <div style="font-weight:500;color:var(--text);">No low stock items</div>
            <div style="font-size:13px;">All products are above their threshold levels</div>
          </div>
        </div>
      `}
    `;

  } catch(e) {
    console.error('Dashboard error:', e);
    content.innerHTML = `
      <div class="empty-state" style="padding:56px 0;">
        <div class="empty-state-icon"><i class="bi bi-wifi-off"></i></div>
        <div class="empty-state-title">Connection Error</div>
        <div class="empty-state-sub">Could not load dashboard data. Please try again.</div>
        <button class="btn btn-outline" style="margin-top:16px;" onclick="renderDashboard()">
          <i class="bi bi-arrow-clockwise"></i> Retry
        </button>
      </div>
    `;
  }
}