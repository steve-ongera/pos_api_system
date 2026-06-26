import { api } from '../api.js';
import { fmt, el, confirm_modal } from '../utils.js';
import { toast } from '../toast.js';

let categories = [];

export async function renderProducts() {
  const content = document.getElementById('page-content');
  content.innerHTML = `
    <div class="loading-state">
      <span class="spinner spinner-dark" style="width:28px;height:28px;border-width:3px"></span>
      Loading products…
    </div>
  `;

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
    <!-- Page Header -->
    <div class="page-header">
      <div class="page-header-left">
        <div class="page-header-title">Products</div>
        <div class="page-header-sub">Manage your product inventory</div>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <button class="btn btn-outline btn-sm" id="manage-cats-btn">
          <i class="bi bi-tags"></i> Categories
        </button>
        <button class="btn btn-primary btn-sm" id="add-prod-btn">
          <i class="bi bi-plus-lg"></i> Add Product
        </button>
      </div>
    </div>

    <!-- Filter Bar -->
    <div class="filter-bar">
      <div class="input-group" style="flex:1;min-width:200px;">
        <i class="bi bi-search input-icon"></i>
        <input id="prod-search" class="form-control" placeholder="Search name or SKU…" value="${search}" />
      </div>
      <select id="cat-filter" class="form-control" style="width:160px;flex-shrink:0;">
        <option value="">All categories</option>
        ${categories.map(c => `<option value="${c.id}" ${catId == c.id ? 'selected' : ''}>${c.name}</option>`).join('')}
      </select>
      <button class="btn btn-ghost btn-sm" id="clear-filters" title="Clear filters">
        <i class="bi bi-x-circle"></i> Clear
      </button>
    </div>

    <!-- Products Table -->
    <div class="card" style="margin-top:16px;">
      <div class="card-header">
        <span class="card-title"><i class="bi bi-box-seam"></i> Product List</span>
        <span class="badge badge-blue" id="product-count">Loading…</span>
      </div>
      <div class="card-body" style="padding:0;">
        <div class="table-wrapper" id="products-table-wrap">
          <div class="loading-state" style="padding:32px;">
            <span class="spinner spinner-dark" style="width:24px;height:24px;border-width:2px;"></span>
            Loading products…
          </div>
        </div>
      </div>
    </div>
  `;

  // ── Event listeners ──────────────────────────────────────────
  const searchInput = document.getElementById('prod-search');
  const catFilter = document.getElementById('cat-filter');
  const clearFilters = document.getElementById('clear-filters');

  searchInput.oninput = (e) => {
    clearTimeout(window._prodSearchTimer);
    window._prodSearchTimer = setTimeout(() => 
      loadTable(e.target.value, catFilter.value), 300
    );
  };

  catFilter.onchange = (e) => loadTable(searchInput.value, e.target.value);

  clearFilters.onclick = () => {
    searchInput.value = '';
    catFilter.value = '';
    loadTable('', '');
  };

  document.getElementById('add-prod-btn').onclick = () => 
    openProductModal(null, () => loadTable(searchInput.value, catFilter.value));

  document.getElementById('manage-cats-btn').onclick = () => 
    openCategoryModal(() => renderProducts());

  await loadTable(search, catId);
}

async function loadTable(search = '', catId = '') {
  const wrap = document.getElementById('products-table-wrap');
  const countEl = document.getElementById('product-count');
  if (!wrap) return;

  wrap.innerHTML = `
    <div class="loading-state" style="padding:32px;">
      <span class="spinner spinner-dark" style="width:22px;height:22px;border-width:2px;"></span>
      Loading products…
    </div>
  `;

  try {
    const params = { page_size: 100 };
    if (search) params.search = search;
    if (catId) params.category_id = catId;
    const res = await api.getProducts(params);
    const prods = res.data || res;

    if (countEl) countEl.textContent = `${prods.length} items`;

    if (!prods.length) {
      wrap.innerHTML = `
        <div class="empty-state" style="padding:40px 0;">
          <div class="empty-state-icon"><i class="bi bi-box"></i></div>
          <div class="empty-state-title">No products found</div>
          <div class="empty-state-sub">
            ${search || catId ? 'Try adjusting your filters' : 'Click "Add Product" to get started'}
          </div>
        </div>
      `;
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
            <th class="text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          ${prods.map(p => `
            <tr>
              <td><strong>${p.name}</strong></td>
              <td class="mono" style="color:var(--text-3);font-size:12px;">${p.sku}</td>
              <td>${p.category?.name || '<span style="color:var(--text-3);">—</span>'}</td>
              <td class="text-right mono" style="font-weight:600;color:var(--accent);">
                ${fmt.money(p.price)}
              </td>
              <td class="text-right mono" style="color:var(--text-3);font-size:12px;">
                ${fmt.money(p.cost_price)}
              </td>
              <td class="text-right">
                <span class="badge ${p.stock <= p.low_stock_threshold ? 'badge-danger' : p.stock <= p.low_stock_threshold * 2 ? 'badge-warn' : 'badge-success'}">
                  ${p.stock}
                </span>
              </td>
              <td class="text-right">
                <div class="flex-center" style="gap:4px;justify-content:flex-end;">
                  <button class="btn btn-ghost btn-sm edit-btn" data-id="${p.id}" title="Edit">
                    <i class="bi bi-pencil"></i>
                  </button>
                  <button class="btn btn-ghost btn-sm del-btn" data-id="${p.id}" data-name="${p.name}" title="Delete">
                    <i class="bi bi-trash" style="color:var(--danger);"></i>
                  </button>
                </div>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;

    // ── Edit buttons ────────────────────────────────────────────
    wrap.querySelectorAll('.edit-btn').forEach(btn => {
      btn.onclick = () => {
        const p = prods.find(x => x.id == btn.dataset.id);
        openProductModal(p, () => loadTable(search, catId));
      };
    });

    // ── Delete buttons ──────────────────────────────────────────
    wrap.querySelectorAll('.del-btn').forEach(btn => {
      btn.onclick = async () => {
        const ok = await confirm_modal(
          'Delete Product',
          `Are you sure you want to delete "<strong>${btn.dataset.name}</strong>"?<br><br>This action cannot be undone.`
        );
        if (!ok) return;
        
        try {
          await api.deleteProduct(btn.dataset.id);
          toast('Product deleted successfully', 'success');
          loadTable(search, catId);
        } catch(e) {
          toast(e?.message || 'Delete failed', 'danger');
        }
      };
    });

  } catch(e) {
    wrap.innerHTML = `
      <div class="empty-state" style="padding:40px 0;">
        <div class="empty-state-icon"><i class="bi bi-wifi-off"></i></div>
        <div class="empty-state-title">Connection Error</div>
        <div class="empty-state-sub">Failed to load products. Please try again.</div>
      </div>
    `;
  }
}

function openProductModal(product, onSave) {
  const isEdit = !!product;
  const modal = el(`
    <div class="modal-overlay" id="product-modal">
      <div class="modal" style="max-width:520px;">
        <div class="modal-header">
          <span class="modal-title">
            <i class="bi ${isEdit ? 'bi-pencil-square' : 'bi-plus-circle'}"></i> 
            ${isEdit ? 'Edit Product' : 'Add Product'}
          </span>
          <button class="modal-close" id="p-close"><i class="bi bi-x-lg"></i></button>
        </div>
        <div class="modal-body">
          <!-- Name - Full width -->
          <div class="form-group">
            <label class="form-label">Product Name <span style="color:var(--danger);">*</span></label>
            <input id="p-name" class="form-control" value="${product?.name || ''}" placeholder="e.g. Bottled Water 500ml" autofocus />
          </div>

          <!-- Two column grid for SKU + Category -->
          <div class="grid-2">
            <div class="form-group">
              <label class="form-label">SKU <span style="color:var(--danger);">*</span></label>
              <input id="p-sku" class="form-control" value="${product?.sku || ''}" placeholder="BW-500" />
            </div>
            <div class="form-group">
              <label class="form-label">Category</label>
              <select id="p-cat" class="form-control">
                <option value="">No category</option>
                ${categories.map(c => `
                  <option value="${c.id}" ${product?.category?.id == c.id ? 'selected' : ''}>
                    ${c.name}
                  </option>
                `).join('')}
              </select>
            </div>
          </div>

          <!-- Two column grid for Price + Cost -->
          <div class="grid-2">
            <div class="form-group">
              <label class="form-label">Selling Price (KSh) <span style="color:var(--danger);">*</span></label>
              <div class="input-group">
                <span class="input-icon" style="font-size:12px;font-weight:600;">KSh</span>
                <input id="p-price" class="form-control" type="number" step="0.01" 
                  value="${product?.price || ''}" placeholder="0.00" style="padding-left:44px;" />
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Cost Price (KSh)</label>
              <div class="input-group">
                <span class="input-icon" style="font-size:12px;font-weight:600;">KSh</span>
                <input id="p-cost" class="form-control" type="number" step="0.01" 
                  value="${product?.cost_price || ''}" placeholder="0.00" style="padding-left:44px;" />
              </div>
            </div>
          </div>

          <!-- Two column grid for Stock + Threshold -->
          <div class="grid-2">
            <div class="form-group">
              <label class="form-label">Stock Quantity</label>
              <input id="p-stock" class="form-control" type="number" 
                value="${product?.stock ?? 0}" min="0" />
            </div>
            <div class="form-group">
              <label class="form-label">Low Stock Alert</label>
              <input id="p-threshold" class="form-control" type="number" 
                value="${product?.low_stock_threshold ?? 10}" min="0" />
            </div>
          </div>

          <div id="p-err" class="field-error" style="display:none;">
            <i class="bi bi-exclamation-circle"></i>
            <span id="p-err-text"></span>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" id="p-cancel">Cancel</button>
          <button class="btn btn-primary" id="p-save" style="min-width:130px;">
            <i class="bi bi-check-lg"></i> ${isEdit ? 'Save Changes' : 'Add Product'}
          </button>
        </div>
      </div>
    </div>
  `);

  document.body.appendChild(modal);

  // ── Close handlers ───────────────────────────────────────────
  const close = () => modal.remove();
  modal.querySelector('#p-close').onclick = close;
  modal.querySelector('#p-cancel').onclick = close;
  modal.onclick = (e) => { if (e.target === modal) close(); };

  // ── Save product ─────────────────────────────────────────────
  modal.querySelector('#p-save').onclick = async () => {
    const errEl = modal.querySelector('#p-err');
    const errText = modal.querySelector('#p-err-text');
    errEl.style.display = 'none';

    const name = modal.querySelector('#p-name').value.trim();
    const sku = modal.querySelector('#p-sku').value.trim();
    const price = modal.querySelector('#p-price').value;
    const cost = modal.querySelector('#p-cost').value;
    const stock = modal.querySelector('#p-stock').value;
    const thresh = modal.querySelector('#p-threshold').value;
    const cat_id = modal.querySelector('#p-cat').value;

    // ── Validation ──────────────────────────────────────────────
    if (!name || !sku || !price) {
      errText.textContent = 'Name, SKU, and Price are required.';
      errEl.style.display = 'flex';
      return;
    }

    if (parseFloat(price) < 0) {
      errText.textContent = 'Price cannot be negative.';
      errEl.style.display = 'flex';
      return;
    }

    const body = {
      name,
      sku,
      price: parseFloat(price),
      cost_price: cost ? parseFloat(cost) : 0,
      stock: parseInt(stock) || 0,
      low_stock_threshold: parseInt(thresh) || 10,
    };
    if (cat_id) body.category_id = parseInt(cat_id);

    // ── Submit ──────────────────────────────────────────────────
    const btn = modal.querySelector('#p-save');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Saving…';

    try {
      if (isEdit) {
        await api.updateProduct(product.id, body);
        toast('Product updated successfully', 'success');
      } else {
        await api.createProduct(body);
        toast('Product added successfully', 'success');
      }
      close();
      onSave();
    } catch(e) {
      errText.textContent = e?.message || e?.details || 'Failed to save product.';
      errEl.style.display = 'flex';
      btn.disabled = false;
      btn.innerHTML = `<i class="bi bi-check-lg"></i> ${isEdit ? 'Save Changes' : 'Add Product'}`;
    }
  };

  // ── Enter key support ────────────────────────────────────────
  modal.querySelector('#p-name').onkeydown = (e) => {
    if (e.key === 'Enter') modal.querySelector('#p-sku').focus();
  };
  modal.querySelector('#p-sku').onkeydown = (e) => {
    if (e.key === 'Enter') modal.querySelector('#p-price').focus();
  };
  modal.querySelector('#p-price').onkeydown = (e) => {
    if (e.key === 'Enter') modal.querySelector('#p-save').click();
  };

  // ── Auto-focus ───────────────────────────────────────────────
  setTimeout(() => modal.querySelector('#p-name')?.focus(), 100);
}

function openCategoryModal(onClose) {
  const modal = el(`
    <div class="modal-overlay" id="category-modal">
      <div class="modal" style="max-width:400px;">
        <div class="modal-header">
          <span class="modal-title"><i class="bi bi-tags"></i> Manage Categories</span>
          <button class="modal-close" id="cat-close"><i class="bi bi-x-lg"></i></button>
        </div>
        <div class="modal-body">
          <div style="display:flex;gap:8px;margin-bottom:16px;">
            <input id="new-cat-name" class="form-control" placeholder="New category name" autofocus />
            <button class="btn btn-primary" id="add-cat-btn" style="white-space:nowrap;">
              <i class="bi bi-plus-lg"></i> Add
            </button>
          </div>
          <div class="divider"></div>
          <div id="cats-list">
            <div class="loading-state" style="padding:16px;">
              <span class="spinner spinner-dark" style="width:18px;height:18px;border-width:2px;"></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `);

  document.body.appendChild(modal);

  // ── Close handlers ───────────────────────────────────────────
  const close = () => { 
    modal.remove(); 
    if (onClose) onClose(); 
  };
  modal.querySelector('#cat-close').onclick = close;
  modal.onclick = (e) => { if (e.target === modal) close(); };

  // ── Load categories ──────────────────────────────────────────
  async function loadCats() {
    const list = modal.querySelector('#cats-list');
    try {
      const res = await fetch('http://localhost:8000/api/v1/categories/', {
        headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` }
      });
      const data = (await res.json()).data || [];
      categories = data;

      if (!data.length) {
        list.innerHTML = `
          <div class="empty-state" style="padding:20px 0;">
            <div class="empty-state-icon" style="width:40px;height:40px;font-size:18px;">
              <i class="bi bi-tags"></i>
            </div>
            <div class="empty-state-sub" style="font-size:13px;">No categories yet</div>
          </div>
        `;
        return;
      }

      list.innerHTML = data.map(c => `
        <div class="flex-between" style="padding:10px 0;border-bottom:1px solid var(--border);">
          <span style="font-weight:500;">${c.name}</span>
          <button class="btn btn-ghost btn-sm del-cat" data-id="${c.id}" title="Delete category">
            <i class="bi bi-trash" style="color:var(--danger);"></i>
          </button>
        </div>
      `).join('');

      // ── Delete category ──────────────────────────────────────
      list.querySelectorAll('.del-cat').forEach(btn => {
        btn.onclick = async () => {
          const ok = await confirm_modal(
            'Delete Category',
            `Are you sure you want to delete this category?<br><br>Products in this category will remain but become uncategorized.`
          );
          if (!ok) return;
          
          try {
            await api.deleteCategory(btn.dataset.id);
            toast('Category deleted', 'success');
            loadCats();
          } catch(e) {
            toast(e?.message || 'Delete failed', 'danger');
          }
        };
      });
    } catch(e) {
      list.innerHTML = `
        <div class="empty-state" style="padding:20px 0;">
          <div class="empty-state-icon" style="width:40px;height:40px;font-size:18px;">
            <i class="bi bi-wifi-off"></i>
          </div>
          <div class="empty-state-sub" style="font-size:13px;">Failed to load categories</div>
        </div>
      `;
    }
  }

  // ── Add category ─────────────────────────────────────────────
  modal.querySelector('#add-cat-btn').onclick = async () => {
    const input = modal.querySelector('#new-cat-name');
    const name = input.value.trim();
    if (!name) {
      toast('Please enter a category name', 'danger');
      return;
    }

    const btn = modal.querySelector('#add-cat-btn');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner" style="width:16px;height:16px;border-width:2px;"></span>';

    try {
      await api.createCategory({ name });
      input.value = '';
      toast('Category added', 'success');
      await loadCats();
      btn.disabled = false;
      btn.innerHTML = '<i class="bi bi-plus-lg"></i> Add';
      input.focus();
    } catch(e) {
      toast(e?.message || 'Failed to create category', 'danger');
      btn.disabled = false;
      btn.innerHTML = '<i class="bi bi-plus-lg"></i> Add';
    }
  };

  // ── Enter key support ────────────────────────────────────────
  modal.querySelector('#new-cat-name').onkeydown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      modal.querySelector('#add-cat-btn').click();
    }
  };

  // ── Load initial data ────────────────────────────────────────
  loadCats();

  // ── Focus input ──────────────────────────────────────────────
  setTimeout(() => modal.querySelector('#new-cat-name')?.focus(), 100);
}