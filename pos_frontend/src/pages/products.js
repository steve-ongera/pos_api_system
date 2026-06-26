import { api } from '../api.js';
import { fmt, el, confirm_modal } from '../utils.js';
import { toast } from '../toast.js';

let categories = [];

export async function renderProducts() {
  const content = document.getElementById('page-content');
  content.innerHTML = `<div style="text-align:center;padding:48px"><span class="spinner" style="width:28px;height:28px;border-width:3px;border-color:rgba(0,0,0,.1);border-top-color:var(--accent)"></span></div>`;

  try {
    const catRes = await fetch('http://localhost:8000/api/v1/categories/', {
      headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` }
    });
    categories = (await catRes.json()).data || [];
  } catch(e) { categories = []; }

  await loadPage(content);
}

async function loadPage(content, search = '', catId = '') {
  content.innerHTML = `
    <div style="display:flex;gap:12px;margin-bottom:18px;flex-wrap:wrap;align-items:center">
      <div class="search-wrap" style="flex:1;min-width:200px">
        <i class="bi bi-search"></i>
        <input id="prod-search" class="form-control" placeholder="Search name or SKU…" value="${search}" />
      </div>
      <select id="cat-filter" class="form-control" style="width:160px">
        <option value="">All categories</option>
        ${categories.map(c => `<option value="${c.id}" ${catId == c.id ? 'selected' : ''}>${c.name}</option>`).join('')}
      </select>
      <button class="btn btn-outline btn-sm" id="manage-cats-btn"><i class="bi bi-tags"></i> Categories</button>
      <button class="btn btn-primary btn-sm" id="add-prod-btn"><i class="bi bi-plus-lg"></i> Add Product</button>
    </div>
    <div class="card">
      <div class="table-wrapper" id="products-table-wrap">
        <div style="text-align:center;padding:40px"><span class="spinner" style="width:24px;height:24px;border-width:3px;border-color:rgba(0,0,0,.1);border-top-color:var(--accent)"></span></div>
      </div>
    </div>`;

  document.getElementById('prod-search').oninput = (e) => {
    clearTimeout(window._prodSearchTimer);
    window._prodSearchTimer = setTimeout(() => loadTable(e.target.value, document.getElementById('cat-filter').value), 300);
  };
  document.getElementById('cat-filter').onchange = (e) => loadTable(document.getElementById('prod-search').value, e.target.value);
  document.getElementById('add-prod-btn').onclick = () => openProductModal(null, () => loadTable());
  document.getElementById('manage-cats-btn').onclick = () => openCategoryModal(() => renderProducts());

  await loadTable(search, catId);
}

async function loadTable(search = '', catId = '') {
  const wrap = document.getElementById('products-table-wrap');
  if (!wrap) return;
  wrap.innerHTML = `<div style="text-align:center;padding:32px"><span class="spinner" style="width:22px;height:22px;border-width:3px;border-color:rgba(0,0,0,.1);border-top-color:var(--accent)"></span></div>`;
  try {
    const params = { page_size: 100 };
    if (search) params.search = search;
    if (catId) params.category_id = catId;
    const res = await api.getProducts(params);
    const prods = res.data || res;

    if (!prods.length) {
      wrap.innerHTML = `<div class="empty-state"><i class="bi bi-box"></i><p>No products found</p></div>`;
      return;
    }

    wrap.innerHTML = `
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>SKU</th>
            <th>Category</th>
            <th class="text-right">Price</th>
            <th class="text-right">Cost</th>
            <th class="text-right">Stock</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${prods.map(p => `
            <tr>
              <td><b>${p.name}</b></td>
              <td class="mono text-muted">${p.sku}</td>
              <td>${p.category?.name || '—'}</td>
              <td class="text-right mono">${fmt.money(p.price)}</td>
              <td class="text-right mono text-muted">${fmt.money(p.cost_price)}</td>
              <td class="text-right">
                <span class="badge ${p.stock <= p.low_stock_threshold ? 'badge-danger' : p.stock <= p.low_stock_threshold * 2 ? 'badge-warn' : 'badge-success'}">
                  ${p.stock}
                </span>
              </td>
              <td>
                <div class="flex-center" style="gap:4px;justify-content:flex-end">
                  <button class="btn btn-ghost btn-sm edit-btn" data-id="${p.id}" title="Edit"><i class="bi bi-pencil"></i></button>
                  <button class="btn btn-ghost btn-sm del-btn" data-id="${p.id}" data-name="${p.name}" title="Delete"><i class="bi bi-trash text-danger"></i></button>
                </div>
              </td>
            </tr>`).join('')}
        </tbody>
      </table>`;

    wrap.querySelectorAll('.edit-btn').forEach(btn => {
      btn.onclick = () => {
        const p = prods.find(x => x.id == btn.dataset.id);
        openProductModal(p, () => loadTable(search, catId));
      };
    });

    wrap.querySelectorAll('.del-btn').forEach(btn => {
      btn.onclick = async () => {
        const ok = await confirm_modal(`Delete "<b>${btn.dataset.name}</b>"? This cannot be undone.`);
        if (!ok) return;
        try {
          await api.deleteProduct(btn.dataset.id);
          toast('Product deleted', 'success');
          loadTable(search, catId);
        } catch(e) { toast(e?.message || 'Delete failed', 'danger'); }
      };
    });

  } catch(e) {
    wrap.innerHTML = `<div class="empty-state"><i class="bi bi-wifi-off"></i><p>Failed to load products</p></div>`;
  }
}

function openProductModal(product, onSave) {
  const isEdit = !!product;
  const modal = el(`
    <div class="modal-overlay">
      <div class="modal" style="max-width:480px">
        <div class="modal-header">
          <span class="modal-title">${isEdit ? 'Edit Product' : 'Add Product'}</span>
          <button class="modal-close">&times;</button>
        </div>
        <div class="modal-body">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
            <div class="form-group" style="grid-column:1/-1">
              <label class="form-label">Product Name *</label>
              <input id="p-name" class="form-control" value="${product?.name || ''}" placeholder="e.g. Bottled Water 500ml" />
            </div>
            <div class="form-group">
              <label class="form-label">SKU *</label>
              <input id="p-sku" class="form-control" value="${product?.sku || ''}" placeholder="BW-500" />
            </div>
            <div class="form-group">
              <label class="form-label">Category</label>
              <select id="p-cat" class="form-control">
                <option value="">No category</option>
                ${categories.map(c => `<option value="${c.id}" ${product?.category?.id == c.id ? 'selected' : ''}>${c.name}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Selling Price (KSh) *</label>
              <input id="p-price" class="form-control" type="number" step="0.01" value="${product?.price || ''}" placeholder="0.00" />
            </div>
            <div class="form-group">
              <label class="form-label">Cost Price (KSh)</label>
              <input id="p-cost" class="form-control" type="number" step="0.01" value="${product?.cost_price || ''}" placeholder="0.00" />
            </div>
            <div class="form-group">
              <label class="form-label">Stock Quantity</label>
              <input id="p-stock" class="form-control" type="number" value="${product?.stock ?? 0}" min="0" />
            </div>
            <div class="form-group">
              <label class="form-label">Low Stock Alert</label>
              <input id="p-threshold" class="form-control" type="number" value="${product?.low_stock_threshold ?? 10}" min="0" />
            </div>
          </div>
          <div id="p-err" style="color:var(--danger);font-size:13px;margin-top:4px;display:none"></div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" id="p-cancel">Cancel</button>
          <button class="btn btn-primary" id="p-save"><i class="bi bi-check-lg"></i> ${isEdit ? 'Save Changes' : 'Add Product'}</button>
        </div>
      </div>
    </div>`);

  document.body.appendChild(modal);
  const close = () => modal.remove();
  modal.querySelector('.modal-close').onclick = close;
  modal.querySelector('#p-cancel').onclick = close;
  modal.onclick = (e) => { if (e.target === modal) close(); };

  modal.querySelector('#p-save').onclick = async () => {
    const errEl = modal.querySelector('#p-err');
    errEl.style.display = 'none';
    const name     = modal.querySelector('#p-name').value.trim();
    const sku      = modal.querySelector('#p-sku').value.trim();
    const price    = modal.querySelector('#p-price').value;
    const cost     = modal.querySelector('#p-cost').value;
    const stock    = modal.querySelector('#p-stock').value;
    const thresh   = modal.querySelector('#p-threshold').value;
    const cat_id   = modal.querySelector('#p-cat').value;

    if (!name || !sku || !price) {
      errEl.textContent = 'Name, SKU and Price are required.';
      errEl.style.display = 'block';
      return;
    }

    const body = { name, sku, price, cost_price: cost || '0', stock: parseInt(stock) || 0, low_stock_threshold: parseInt(thresh) || 10 };
    if (cat_id) body.category_id = parseInt(cat_id);

    const btn = modal.querySelector('#p-save');
    btn.disabled = true; btn.innerHTML = '<span class="spinner"></span>';
    try {
      if (isEdit) await api.updateProduct(product.id, body);
      else await api.createProduct(body);
      toast(isEdit ? 'Product updated' : 'Product added', 'success');
      close();
      onSave();
    } catch(e) {
      errEl.textContent = e?.message || JSON.stringify(e?.details || 'Failed');
      errEl.style.display = 'block';
      btn.disabled = false;
      btn.innerHTML = `<i class="bi bi-check-lg"></i> ${isEdit ? 'Save Changes' : 'Add Product'}`;
    }
  };
}

function openCategoryModal(onClose) {
  const modal = el(`
    <div class="modal-overlay">
      <div class="modal" style="max-width:360px">
        <div class="modal-header">
          <span class="modal-title"><i class="bi bi-tags"></i> Manage Categories</span>
          <button class="modal-close">&times;</button>
        </div>
        <div class="modal-body">
          <div style="display:flex;gap:8px;margin-bottom:16px">
            <input id="new-cat-name" class="form-control" placeholder="New category name" />
            <button class="btn btn-primary btn-sm" id="add-cat-btn" style="white-space:nowrap"><i class="bi bi-plus-lg"></i> Add</button>
          </div>
          <div id="cats-list"></div>
        </div>
      </div>
    </div>`);

  document.body.appendChild(modal);

  const close = () => { modal.remove(); onClose(); };
  modal.querySelector('.modal-close').onclick = close;
  modal.onclick = (e) => { if (e.target === modal) close(); };

  async function loadCats() {
    const list = modal.querySelector('#cats-list');
    const res = await fetch('http://localhost:8000/api/v1/categories/', {
      headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` }
    });
    const data = (await res.json()).data || [];
    categories = data;
    list.innerHTML = data.length ? data.map(c => `
      <div class="flex-between" style="padding:8px 0;border-bottom:1px solid var(--border)">
        <span>${c.name}</span>
        <button class="btn btn-ghost btn-sm del-cat" data-id="${c.id}"><i class="bi bi-trash text-danger"></i></button>
      </div>`).join('') : `<p class="text-muted" style="font-size:13px">No categories yet.</p>`;

    list.querySelectorAll('.del-cat').forEach(btn => {
      btn.onclick = async () => {
        if (!await confirm_modal('Delete this category?')) return;
        try {
          await api.deleteCategory(btn.dataset.id);
          toast('Category deleted', 'success');
          loadCats();
        } catch(e) { toast(e?.message || 'Failed', 'danger'); }
      };
    });
  }

  modal.querySelector('#add-cat-btn').onclick = async () => {
    const name = modal.querySelector('#new-cat-name').value.trim();
    if (!name) return;
    try {
      await api.createCategory({ name });
      modal.querySelector('#new-cat-name').value = '';
      toast('Category added', 'success');
      loadCats();
    } catch(e) { toast(e?.message || 'Failed', 'danger'); }
  };

  modal.querySelector('#new-cat-name').onkeydown = (e) => { if (e.key === 'Enter') modal.querySelector('#add-cat-btn').click(); };

  loadCats();
}
