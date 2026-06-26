import { api } from './api.js';
import { toast } from './toast.js';

const NAV = [
  { id: 'pos',       label: 'New Sale',   icon: 'bi-bag-plus',       roles: ['admin','cashier'] },
  { id: 'dashboard', label: 'Dashboard',  icon: 'bi-grid',            roles: ['admin'] },
  { id: 'orders',    label: 'Orders',     icon: 'bi-receipt',         roles: ['admin','cashier'] },
  { id: 'products',  label: 'Products',   icon: 'bi-box-seam',        roles: ['admin'] },
  { id: 'users',     label: 'Staff',      icon: 'bi-people',          roles: ['admin'] },
];

export function renderLayout(activePage, user, onNavigate) {
  const navItems = NAV.filter(n => n.roles.includes(user.role));
  const initials = (user.full_name || user.username).split(' ').map(w => w[0]).join('').toUpperCase().slice(0,2);

  const sidebar = `
    <aside class="sidebar">
      <div class="sidebar-brand">
        <i class="bi bi-shop"></i> SimplePOS
      </div>
      <nav class="sidebar-nav">
        ${navItems.map(n => `
          <button class="nav-item ${n.id === activePage ? 'active' : ''}" data-page="${n.id}">
            <i class="bi ${n.icon}"></i> ${n.label}
          </button>`).join('')}
      </nav>
      <div class="sidebar-footer">
        <div class="sidebar-user">
          <div class="user-avatar">${initials}</div>
          <div class="user-info">
            <div class="user-name">${user.full_name || user.username}</div>
            <div class="user-role">${user.role}</div>
          </div>
        </div>
        <button class="btn-logout" id="logout-btn">
          <i class="bi bi-box-arrow-right"></i> Sign out
        </button>
      </div>
    </aside>`;

  const pageTitles = { pos: 'New Sale', dashboard: 'Dashboard', orders: 'Orders', products: 'Products', users: 'Staff' };

  const main = `
    <div class="main">
      <div class="topbar">
        <span class="topbar-title">${pageTitles[activePage] || ''}</span>
        <span class="text-muted" style="font-size:12px;font-family:var(--mono)">${fmt_now()}</span>
      </div>
      <div class="page-content" id="page-content"></div>
    </div>`;

  document.getElementById('app').innerHTML = sidebar + main;

  document.querySelectorAll('.nav-item[data-page]').forEach(btn => {
    btn.onclick = () => onNavigate(btn.dataset.page);
  });

  document.getElementById('logout-btn').onclick = async () => {
    try { await api.logout(); } catch(e) {}
    api.clearTokens();
    toast('Signed out', 'info');
    onNavigate('login');
  };
}

function fmt_now() {
  return new Date().toLocaleString('en-KE', { weekday:'short', day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' });
}
