import { api } from '../api.js';
import { fmt, el, confirm_modal } from '../utils.js';
import { toast } from '../toast.js';

export async function renderOrders(user) {
  const content = document.getElementById('page-content');
  content.innerHTML = `
    <div class="card">
      <div class="card-header">
        <div class="flex-center" style="gap:10px;flex-wrap:wrap">
          <input type="date" id="date-from" class="form-control" style="width:150px" value="${today()}" />
          <span style="color:var(--text-2)">to</span>
          <input type="date" id="date-to" class="form-control" style="width:150px" value="${today()}" />
          <select id="status-filter" class="form-control" style="width:130px">
            <option value="">All status</option>
            <option value="completed">Completed</option>
            <option value="voided">Voided</option>
          </select>
          <button class="btn btn-primary btn-sm" id="apply-filter">
            <i class="bi bi-funnel"></i> Filter
          </button>
        </div>
      </div>
      <div id="orders-table-wrap" class="table-wrapper">
        <div style="text-align:center;padding:40px"><span class="spinner" style="width:24px;height:24px;border-width:3px;border-color:rgba(0,0,0,.1);border-top-color:var(--accent)"></span></div>
      </div>
    </div>`;

  async function load() {
    const wrap = document.getElementById('orders-table-wrap');
    wrap.innerHTML = `<div style="text-align:center;padding:32px"><span class="spinner" style="width:24px;height:24px;border-width:3px;border-color:rgba(0,0,0,.1);border-top-color:var(--accent)"></span></div>`;
    try {
      const params = {
        date_from: document.getElementById('date-from').value,
        date_to:   document.getElementById('date-to').value,
        page_size: 50,
      };
      const status = document.getElementById('status-filter').value;
      if (status) params.status = status;

      const res = await api.getOrders(params);
      const orders = res.data || res;

      if (!orders.length) {
        wrap.innerHTML = `<div class="empty-state"><i class="bi bi-receipt"></i><p>No orders found</p></div>`;
        return;
      }

      wrap.innerHTML = `
        <table>
          <thead>
            <tr>
              <th>Order #</th>
              <th>Time</th>
              <th>Cashier</th>
              <th>Items</th>
              <th>Payment</th>
              <th class="text-right">Total</th>
              <th>Status</th>
              ${user.role === 'admin' ? '<th></th>' : ''}
            </tr>
          </thead>
          <tbody>
            ${orders.map(o => `
              <tr data-id="${o.id}" style="cursor:pointer">
                <td class="mono" style="font-size:12px;color:var(--text-2)">${o.order_number}</td>
                <td>${fmt.time(o.created_at)}</td>
                <td>${o.cashier?.full_name || o.cashier?.username || '—'}</td>
                <td>${o.items?.length ?? '—'}</td>
                <td>
                  <span class="badge ${pmBadge(o.payment_method)}">
                    <i class="bi ${pmIcon(o.payment_method)}"></i> ${o.payment_method?.toUpperCase()}
                  </span>
                </td>
                <td class="text-right mono fw-bold">${fmt.money(o.total)}</td>
                <td>
                  <span class="badge ${o.status === 'completed' ? 'badge-success' : 'badge-danger'}">
                    ${o.status}
                  </span>
                </td>
                ${user.role === 'admin' ? `
                  <td>
                    ${o.status === 'completed' ? `<button class="btn btn-ghost btn-sm void-btn" data-id="${o.id}" title="Void order"><i class="bi bi-x-circle text-danger"></i></button>` : ''}
                  </td>` : ''}
              </tr>`).join('')}
          </tbody>
        </table>`;

      // Row click → detail
      wrap.querySelectorAll('tbody tr').forEach(row => {
        row.onclick = (e) => {
          if (e.target.closest('.void-btn')) return;
          showOrderDetail(row.dataset.id);
        };
      });

      // Void buttons
      wrap.querySelectorAll('.void-btn').forEach(btn => {
        btn.onclick = async (e) => {
          e.stopPropagation();
          const confirmed = await confirm_modal('Void this order? Stock will be restored.');
          if (!confirmed) return;
          const reason = prompt('Reason for void:') || '';
          try {
            await api.voidOrder(btn.dataset.id, reason);
            toast('Order voided', 'success');
            load();
          } catch(err) {
            toast(err?.message || 'Could not void order', 'danger');
          }
        };
      });

    } catch(e) {
      wrap.innerHTML = `<div class="empty-state"><i class="bi bi-wifi-off"></i><p>Failed to load orders</p></div>`;
    }
  }

  document.getElementById('apply-filter').onclick = load;
  load();
}

async function showOrderDetail(id) {
  const modal = el(`
    <div class="modal-overlay">
      <div class="modal" style="max-width:480px">
        <div class="modal-header">
          <span class="modal-title"><i class="bi bi-receipt"></i> Order Detail</span>
          <button class="modal-close">&times;</button>
        </div>
        <div class="modal-body" id="detail-body">
          <div style="text-align:center;padding:24px"><span class="spinner" style="width:22px;height:22px;border-width:3px;border-color:rgba(0,0,0,.1);border-top-color:var(--accent)"></span></div>
        </div>
      </div>
    </div>`);
  document.body.appendChild(modal);
  modal.querySelector('.modal-close').onclick = () => modal.remove();
  modal.onclick = (e) => { if (e.target === modal) modal.remove(); };

  try {
    const o = await api.getOrder(id);
    modal.querySelector('#detail-body').innerHTML = `
      <div style="text-align:center;margin-bottom:18px">
        <div class="mono" style="font-size:13px;color:var(--text-2)">${o.order_number}</div>
        <div style="font-size:12px;color:var(--text-3)">${fmt.datetime(o.created_at)}</div>
        <div style="margin-top:6px">
          <span class="badge ${o.status === 'completed' ? 'badge-success' : 'badge-danger'}">${o.status}</span>
        </div>
      </div>
      <div class="receipt-box">
        ${o.items.map(i => `
          <div class="receipt-line">
            <span>${i.product_name} ×${i.quantity}</span>
            <span class="mono">${fmt.money(i.subtotal)}</span>
          </div>`).join('')}
        <div class="receipt-line" style="border-top:1px solid var(--border);padding-top:8px;margin-top:6px">
          <span>Subtotal</span><span class="mono">${fmt.money(o.subtotal)}</span>
        </div>
        <div class="receipt-line"><span>Tax (16%)</span><span class="mono">${fmt.money(o.tax)}</span></div>
        <div class="receipt-line total"><span>Total</span><span class="mono">${fmt.money(o.total)}</span></div>
        <div class="receipt-line">
          <span>${o.payment_method?.toUpperCase()}</span>
          <span class="mono">${fmt.money(o.amount_tendered)}</span>
        </div>
        ${Number(o.change) > 0 ? `<div class="receipt-line"><span>Change</span><span class="mono">${fmt.money(o.change)}</span></div>` : ''}
      </div>
      <div style="margin-top:14px;font-size:13px;color:var(--text-2)">
        <b>Cashier:</b> ${o.cashier?.full_name || o.cashier?.username || '—'}
        ${o.customer_name ? `&nbsp;·&nbsp;<b>Customer:</b> ${o.customer_name}` : ''}
      </div>
      ${o.status === 'voided' ? `
        <div style="margin-top:12px;padding:10px 14px;background:var(--danger-dim);border-radius:var(--radius-sm);font-size:13px">
          <b style="color:var(--danger)">Voided</b> by ${o.voided_by?.full_name || '—'} · ${fmt.datetime(o.voided_at)}<br/>
          ${o.void_reason ? `Reason: ${o.void_reason}` : ''}
        </div>` : ''}`;
  } catch(e) {
    modal.querySelector('#detail-body').innerHTML = `<p class="text-danger">Could not load order.</p>`;
  }
}

function today() { return new Date().toISOString().split('T')[0]; }
function pmBadge(pm) { return pm === 'cash' ? 'badge-blue' : pm === 'mpesa' ? 'badge-success' : 'badge-warn'; }
function pmIcon(pm)  { return pm === 'cash' ? 'bi-cash' : pm === 'mpesa' ? 'bi-phone' : 'bi-credit-card-2-front'; }
