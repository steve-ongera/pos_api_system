import { api } from '../api.js';
import { fmt, el, confirm_modal } from '../utils.js';
import { toast } from '../toast.js';

export async function renderUsers(currentUser) {
  const content = document.getElementById('page-content');
  content.innerHTML = `
    <div style="display:flex;justify-content:flex-end;margin-bottom:18px">
      <button class="btn btn-primary btn-sm" id="add-user-btn"><i class="bi bi-person-plus"></i> Add Staff</button>
    </div>
    <div class="card">
      <div class="table-wrapper" id="users-table"></div>
    </div>`;

  document.getElementById('add-user-btn').onclick = () => openUserModal(null, currentUser, loadUsers);
  loadUsers(currentUser);
}

async function loadUsers(currentUser) {
  const wrap = document.getElementById('users-table');
  if (!wrap) return;
  wrap.innerHTML = `<div style="text-align:center;padding:40px"><span class="spinner" style="width:24px;height:24px;border-width:3px;border-color:rgba(0,0,0,.1);border-top-color:var(--accent)"></span></div>`;

  try {
    const users = await api.getUsers();
    if (!users.length) {
      wrap.innerHTML = `<div class="empty-state"><i class="bi bi-people"></i><p>No staff found</p></div>`;
      return;
    }
    wrap.innerHTML = `
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Username</th>
            <th>Role</th>
            <th>Status</th>
            <th>Joined</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${users.map(u => `
            <tr>
              <td>
                <div class="flex-center" style="gap:10px">
                  <div class="user-avatar" style="width:30px;height:30px;font-size:12px">
                    ${(u.full_name || u.username).split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2)}
                  </div>
                  <span class="fw-bold">${u.full_name || '—'}</span>
                </div>
              </td>
              <td class="mono text-muted">${u.username}</td>
              <td>
                <span class="badge ${u.role === 'admin' ? 'badge-blue' : 'badge-warn'}">
                  <i class="bi ${u.role === 'admin' ? 'bi-shield-check' : 'bi-person'}"></i> ${u.role}
                </span>
              </td>
              <td>
                <span class="badge ${u.is_active ? 'badge-success' : 'badge-danger'}">
                  ${u.is_active ? 'Active' : 'Inactive'}
                </span>
              </td>
              <td class="text-muted">${fmt.date(u.date_joined)}</td>
              <td>
                <div class="flex-center" style="gap:4px;justify-content:flex-end">
                  <button class="btn btn-ghost btn-sm edit-btn" data-id="${u.id}"><i class="bi bi-pencil"></i></button>
                  ${currentUser.id !== u.id ? `
                    <button class="btn btn-ghost btn-sm toggle-btn" data-id="${u.id}" data-active="${u.is_active}" title="${u.is_active ? 'Deactivate' : 'Activate'}">
                      <i class="bi ${u.is_active ? 'bi-person-slash text-danger' : 'bi-person-check text-success'}"></i>
                    </button>` : ''}
                </div>
              </td>
            </tr>`).join('')}
        </tbody>
      </table>`;

    wrap.querySelectorAll('.edit-btn').forEach(btn => {
      btn.onclick = () => {
        const u = users.find(x => x.id == btn.dataset.id);
        openUserModal(u, currentUser, () => loadUsers(currentUser));
      };
    });

    wrap.querySelectorAll('.toggle-btn').forEach(btn => {
      btn.onclick = async () => {
        const active = btn.dataset.active === 'true';
        const ok = await confirm_modal(`${active ? 'Deactivate' : 'Activate'} this staff member?`);
        if (!ok) return;
        try {
          await api.updateUser(btn.dataset.id, { is_active: !active });
          toast(`User ${active ? 'deactivated' : 'activated'}`, 'success');
          loadUsers(currentUser);
        } catch(e) { toast(e?.message || 'Failed', 'danger'); }
      };
    });

  } catch(e) {
    wrap.innerHTML = `<div class="empty-state"><i class="bi bi-wifi-off"></i><p>Failed to load staff</p></div>`;
  }
}

function openUserModal(user, currentUser, onSave) {
  const isEdit = !!user;
  const modal = el(`
    <div class="modal-overlay">
      <div class="modal" style="max-width:420px">
        <div class="modal-header">
          <span class="modal-title">${isEdit ? 'Edit Staff' : 'Add Staff'}</span>
          <button class="modal-close">&times;</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">Full Name</label>
            <input id="u-fullname" class="form-control" value="${user?.full_name || ''}" placeholder="Jane Doe" />
          </div>
          <div class="form-group">
            <label class="form-label">Username *</label>
            <input id="u-username" class="form-control" value="${user?.username || ''}" placeholder="janedoe" ${isEdit ? 'readonly' : ''} />
          </div>
          <div class="form-group">
            <label class="form-label">Role</label>
            <select id="u-role" class="form-control" ${currentUser.id === user?.id ? 'disabled' : ''}>
              <option value="cashier" ${user?.role === 'cashier' ? 'selected' : ''}>Cashier</option>
              <option value="admin"   ${user?.role === 'admin'   ? 'selected' : ''}>Admin</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">${isEdit ? 'New Password' : 'Password *'} ${isEdit ? '<span style="color:var(--text-3)">(leave blank to keep)</span>' : ''}</label>
            <input id="u-password" class="form-control" type="password" placeholder="${isEdit ? 'Leave blank to keep current' : 'Set a strong password'}" />
          </div>
          <div id="u-err" style="color:var(--danger);font-size:13px;margin-top:4px;display:none"></div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" id="u-cancel">Cancel</button>
          <button class="btn btn-primary" id="u-save"><i class="bi bi-check-lg"></i> ${isEdit ? 'Save' : 'Add Staff'}</button>
        </div>
      </div>
    </div>`);

  document.body.appendChild(modal);
  const close = () => modal.remove();
  modal.querySelector('.modal-close').onclick = close;
  modal.querySelector('#u-cancel').onclick = close;
  modal.onclick = (e) => { if (e.target === modal) close(); };

  modal.querySelector('#u-save').onclick = async () => {
    const errEl = modal.querySelector('#u-err');
    errEl.style.display = 'none';
    const full_name = modal.querySelector('#u-fullname').value.trim();
    const username  = modal.querySelector('#u-username').value.trim();
    const role      = modal.querySelector('#u-role').value;
    const password  = modal.querySelector('#u-password').value;

    if (!isEdit && (!username || !password)) {
      errEl.textContent = 'Username and password are required.';
      errEl.style.display = 'block';
      return;
    }

    const body = { full_name, role };
    if (!isEdit) { body.username = username; body.password = password; }
    else if (password) body.password = password;

    const btn = modal.querySelector('#u-save');
    btn.disabled = true; btn.innerHTML = '<span class="spinner"></span>';
    try {
      if (isEdit) await api.updateUser(user.id, body);
      else await api.createUser(body);
      toast(isEdit ? 'Staff updated' : 'Staff added', 'success');
      close();
      onSave();
    } catch(e) {
      errEl.textContent = e?.message || JSON.stringify(e?.details || 'Failed');
      errEl.style.display = 'block';
      btn.disabled = false;
      btn.innerHTML = `<i class="bi bi-check-lg"></i> ${isEdit ? 'Save' : 'Add Staff'}`;
    }
  };
}
