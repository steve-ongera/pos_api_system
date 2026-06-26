import { api } from '../api.js';
import { toast } from '../toast.js';
import { fmt, el, confirm_modal } from '../utils.js';

let cart = [];
let products = [];
let categories = [];

export async function renderPOS() {
  const content = document.getElementById('page-content');
  content.innerHTML = `<div style="text-align:center;padding:40px"><span class="spinner" style="border-color:rgba(0,0,0,.15);border-top-color:var(--accent);width:28px;height:28px;border-width:3px"></span></div>`;

  try {
    [products, { data: categories }] = await Promise.all([
      api.getProducts({ page_size: 100 }),
      fetch('http://localhost:8000/api/v1/categories/', { headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` } }).then(r => r.json()),
    ]);
    if (products.data) products = products.data; // unwrap if paginated
  } catch(e) {
    content.innerHTML = `<div class="empty-state"><i class="bi bi-wifi-off"></i><p>Failed to load products. Is the backend running?</p></div>`;
    return;
  }

  cart = [];
  renderLayout(content);
}

function renderLayout(content) {
  content.innerHTML = `
    <div class="pos-layout">
      <!-- Left: product browser -->
      <div style="display:flex;flex-direction:column;overflow:hidden">
        <div class="product-search-bar">
          <div class="search-wrap" style="flex:1">
            <i class="bi bi-search"></i>
            <input id="prod-search" class="form-control" placeholder="Search products or SKU…" />
          </div>
          <select id="cat-filter" class="form-control" style="width:160px">
            <option value="">All categories</option>
            ${categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
          </select>
        </div>
        <div class="products-grid" id="products-grid"></div>
      </div>

      <!-- Right: cart -->
      <div class="cart-panel">
        <div class="cart-header">
          <span><i class="bi bi-cart3"></i> Cart</span>
          <button class="btn btn-ghost btn-sm" id="clear-cart-btn" title="Clear cart">
            <i class="bi bi-trash"></i>
          </button>
        </div>
        <div class="cart-items" id="cart-items">
          <div class="cart-empty"><i class="bi bi-bag"></i><span>Cart is empty</span></div>
        </div>
        <div class="cart-totals" id="cart-totals" style="display:none">
          <div class="total-row"><span>Subtotal</span><span class="mono" id="t-sub"></span></div>
          <div class="total-row"><span>Tax (16%)</span><span class="mono" id="t-tax"></span></div>
          <div class="total-row grand"><span>Total</span><span class="mono" id="t-total" style="color:var(--accent)"></span></div>
        </div>
        <div class="cart-actions">
          <button class="btn btn-success btn-lg btn-block" id="charge-btn" disabled>
            <i class="bi bi-credit-card"></i> Charge
          </button>
        </div>
      </div>
    </div>`;

  renderProducts();
  bindEvents(content);
}

function renderProducts() {
  const search = (document.getElementById('prod-search')?.value || '').toLowerCase();
  const catId  = document.getElementById('cat-filter')?.value || '';
  const grid   = document.getElementById('products-grid');
  if (!grid) return;

  const filtered = products.filter(p => {
    const matchSearch = !search || p.name.toLowerCase().includes(search) || p.sku.toLowerCase().includes(search);
    const matchCat    = !catId  || String(p.category?.id) === catId;
    return matchSearch && matchCat;
  });

  if (!filtered.length) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><i class="bi bi-box"></i><p>No products found</p></div>`;
    return;
  }

  grid.innerHTML = filtered.map(p => `
    <div class="product-tile ${p.stock <= 0 ? 'out-of-stock' : ''}" data-id="${p.id}">
      <div class="tile-name">${p.name}</div>
      <div class="tile-price">${fmt.money(p.price)}</div>
      <div class="tile-stock">${p.stock <= 0 ? 'Out of stock' : `${p.stock} left`}</div>
    </div>`).join('');

  grid.querySelectorAll('.product-tile').forEach(tile => {
    tile.onclick = () => addToCart(products.find(p => p.id == tile.dataset.id));
  });
}

function addToCart(product) {
  const existing = cart.find(i => i.product.id === product.id);
  const maxQty = product.stock;
  if (existing) {
    if (existing.qty >= maxQty) { toast(`Only ${maxQty} in stock`, 'danger'); return; }
    existing.qty++;
  } else {
    cart.push({ product, qty: 1 });
  }
  renderCart();
}

function renderCart() {
  const container = document.getElementById('cart-items');
  const totalsEl  = document.getElementById('cart-totals');
  const chargeBtn = document.getElementById('charge-btn');
  if (!container) return;

  if (!cart.length) {
    container.innerHTML = `<div class="cart-empty"><i class="bi bi-bag"></i><span>Cart is empty</span></div>`;
    totalsEl && (totalsEl.style.display = 'none');
    chargeBtn && (chargeBtn.disabled = true);
    return;
  }

  const TAX = 0.16;
  const subtotal = cart.reduce((s, i) => s + Number(i.product.price) * i.qty, 0);
  const tax      = subtotal * TAX;
  const total    = subtotal + tax;

  container.innerHTML = cart.map((item, idx) => `
    <div class="cart-item">
      <div class="cart-item-info">
        <div class="cart-item-name">${item.product.name}</div>
        <div class="cart-item-price">${fmt.money(item.product.price)} × ${item.qty}</div>
        <div class="cart-item-qty">
          <button class="qty-btn" data-action="dec" data-idx="${idx}">−</button>
          <span class="qty-num">${item.qty}</span>
          <button class="qty-btn" data-action="inc" data-idx="${idx}">+</button>
        </div>
      </div>
      <div class="cart-item-subtotal">${fmt.money(Number(item.product.price) * item.qty)}</div>
      <span class="cart-remove" data-idx="${idx}"><i class="bi bi-x-lg"></i></span>
    </div>`).join('');

  container.querySelectorAll('[data-action]').forEach(btn => {
    btn.onclick = () => {
      const idx = Number(btn.dataset.idx);
      if (btn.dataset.action === 'inc') {
        if (cart[idx].qty >= cart[idx].product.stock) { toast('Max stock reached', 'danger'); return; }
        cart[idx].qty++;
      } else {
        cart[idx].qty--;
        if (cart[idx].qty <= 0) cart.splice(idx, 1);
      }
      renderCart();
    };
  });

  container.querySelectorAll('.cart-remove').forEach(btn => {
    btn.onclick = () => { cart.splice(Number(btn.dataset.idx), 1); renderCart(); };
  });

  document.getElementById('t-sub').textContent   = fmt.money(subtotal);
  document.getElementById('t-tax').textContent   = fmt.money(tax);
  document.getElementById('t-total').textContent = fmt.money(total);
  totalsEl.style.display = 'block';
  chargeBtn.disabled = false;
}

function bindEvents(content) {
  document.getElementById('prod-search').oninput = renderProducts;
  document.getElementById('cat-filter').onchange  = renderProducts;
  document.getElementById('clear-cart-btn').onclick = () => { cart = []; renderCart(); };
  document.getElementById('charge-btn').onclick    = () => openPaymentModal();
}

function openPaymentModal() {
  const TAX = 0.16;
  const subtotal = cart.reduce((s, i) => s + Number(i.product.price) * i.qty, 0);
  const tax      = subtotal * TAX;
  const total    = subtotal + tax;
  let payMethod  = 'cash';

  const modal = el(`
    <div class="modal-overlay" id="pay-modal">
      <div class="modal">
        <div class="modal-header">
          <span class="modal-title"><i class="bi bi-credit-card"></i> Payment</span>
          <button class="modal-close" id="pay-close">&times;</button>
        </div>
        <div class="modal-body">
          <!-- Receipt summary -->
          <div class="receipt-box">
            ${cart.map(i => `
              <div class="receipt-line">
                <span>${i.product.name} ×${i.qty}</span>
                <span class="mono">${fmt.money(Number(i.product.price) * i.qty)}</span>
              </div>`).join('')}
            <div class="receipt-line total">
              <span>Total (incl. 16% tax)</span>
              <span class="mono">${fmt.money(total)}</span>
            </div>
          </div>

          <!-- Payment method -->
          <div class="form-label" style="margin-bottom:8px">Payment Method</div>
          <div class="pay-methods" id="pay-methods">
            <button class="pay-method selected" data-pm="cash"><i class="bi bi-cash"></i>Cash</button>
            <button class="pay-method" data-pm="mpesa"><i class="bi bi-phone"></i>M-Pesa</button>
            <button class="pay-method" data-pm="card"><i class="bi bi-credit-card-2-front"></i>Card</button>
          </div>

          <!-- Customer & amount -->
          <div class="form-group">
            <label class="form-label">Customer Name <span style="color:var(--text-3)">(optional)</span></label>
            <input id="cust-name" class="form-control" placeholder="Walk-in customer" />
          </div>
          <div class="form-group" id="tendered-wrap">
            <label class="form-label">Amount Tendered</label>
            <input id="tendered" class="form-control" type="number" value="${Math.ceil(total / 50) * 50}" min="${total}" step="50" />
          </div>
          <div class="change-display" id="change-row">
            <span><i class="bi bi-arrow-return-left"></i> Change</span>
            <span class="mono" id="change-val" style="font-size:18px">${fmt.money(Math.ceil(total / 50) * 50 - total)}</span>
          </div>
          <div id="pay-err" style="color:var(--danger);font-size:13px;margin-top:10px;display:none"></div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" id="pay-cancel">Cancel</button>
          <button class="btn btn-success" id="pay-confirm" style="min-width:130px">
            <i class="bi bi-check-lg"></i> Confirm Sale
          </button>
        </div>
      </div>
    </div>`);

  document.body.appendChild(modal);

  // payment method tabs
  modal.querySelectorAll('.pay-method').forEach(btn => {
    btn.onclick = () => {
      payMethod = btn.dataset.pm;
      modal.querySelectorAll('.pay-method').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      const wrap = modal.querySelector('#tendered-wrap');
      const changeRow = modal.querySelector('#change-row');
      if (payMethod === 'cash') { wrap.style.display = 'block'; changeRow.style.display = 'flex'; }
      else { wrap.style.display = 'none'; changeRow.style.display = 'none'; }
    };
  });

  // live change calc
  const tenderedInput = modal.querySelector('#tendered');
  tenderedInput.oninput = () => {
    const tendered = parseFloat(tenderedInput.value) || 0;
    const change = tendered - total;
    modal.querySelector('#change-val').textContent = fmt.money(Math.max(0, change));
    modal.querySelector('#change-val').style.color = change < 0 ? 'var(--danger)' : 'var(--success)';
  };

  const close = () => modal.remove();
  modal.querySelector('#pay-close').onclick = close;
  modal.querySelector('#pay-cancel').onclick = close;
  modal.onclick = (e) => { if (e.target === modal) close(); };

  modal.querySelector('#pay-confirm').onclick = async () => {
    const errEl = modal.querySelector('#pay-err');
    errEl.style.display = 'none';
    const tendered = payMethod === 'cash' ? parseFloat(tenderedInput.value) || 0 : total;
    if (payMethod === 'cash' && tendered < total) {
      errEl.textContent = 'Amount tendered is less than total.';
      errEl.style.display = 'block';
      return;
    }
    const btn = modal.querySelector('#pay-confirm');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Processing…';
    try {
      const order = await api.createOrder({
        items: cart.map(i => ({ product_id: i.product.id, quantity: i.qty })),
        payment_method: payMethod,
        amount_tendered: tendered.toFixed(2),
        customer_name: modal.querySelector('#cust-name').value,
      });
      close();
      cart = [];
      renderCart();
      // refresh stock on products
      const refreshed = await api.getProducts({ page_size: 100 });
      products = refreshed.data || refreshed;
      renderProducts();
      showReceipt(order);
      toast(`Sale complete — ${fmt.money(order.total)}`, 'success');
    } catch(e) {
      errEl.textContent = e?.message || 'Sale failed.';
      errEl.style.display = 'block';
      btn.disabled = false;
      btn.innerHTML = '<i class="bi bi-check-lg"></i> Confirm Sale';
    }
  };
}

function showReceipt(order) {
  const modal = el(`
    <div class="modal-overlay" id="receipt-modal">
      <div class="modal" style="max-width:380px">
        <div class="modal-header">
          <span class="modal-title"><i class="bi bi-receipt"></i> Receipt</span>
          <button class="modal-close" id="rec-close">&times;</button>
        </div>
        <div class="modal-body">
          <div style="text-align:center;margin-bottom:16px">
            <div style="font-size:11px;color:var(--text-2);font-family:var(--mono)">${order.order_number}</div>
            <div style="font-size:11px;color:var(--text-3)">${fmt.datetime(order.created_at)}</div>
            ${order.customer_name ? `<div style="font-weight:600;margin-top:4px">${order.customer_name}</div>` : ''}
          </div>
          <div class="receipt-box">
            ${order.items.map(i => `
              <div class="receipt-line">
                <span>${i.product_name} ×${i.quantity}</span>
                <span class="mono">${fmt.money(i.subtotal)}</span>
              </div>`).join('')}
            <div class="receipt-line" style="border-top:1px solid var(--border);padding-top:8px;margin-top:6px">
              <span>Subtotal</span><span class="mono">${fmt.money(order.subtotal)}</span>
            </div>
            <div class="receipt-line"><span>Tax (16%)</span><span class="mono">${fmt.money(order.tax)}</span></div>
            <div class="receipt-line total"><span>Total</span><span class="mono">${fmt.money(order.total)}</span></div>
            <div class="receipt-line">
              <span>${order.payment_method.toUpperCase()}</span>
              <span class="mono">${fmt.money(order.amount_tendered)}</span>
            </div>
            ${Number(order.change) > 0 ? `<div class="receipt-line"><span>Change</span><span class="mono">${fmt.money(order.change)}</span></div>` : ''}
          </div>
          <div style="text-align:center;font-size:12px;color:var(--text-3);margin-top:14px">
            <i class="bi bi-heart-fill" style="color:var(--danger)"></i> Thank you for your purchase!
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline btn-block" id="rec-close2"><i class="bi bi-x"></i> Close</button>
        </div>
      </div>
    </div>`);
  document.body.appendChild(modal);
  const close = () => modal.remove();
  modal.querySelector('#rec-close').onclick = close;
  modal.querySelector('#rec-close2').onclick = close;
}
