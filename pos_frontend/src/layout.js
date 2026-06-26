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
  const initials = (user.full_name || user.username)
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  // ── Sidebar ────────────────────────────────────────────────
  const sidebar = `
    <aside class="sidebar" id="sidebar">
      <div class="sidebar-brand">
        <div class="brand-icon">
          <i class="bi bi-shop"></i>
        </div>
        <div>
          <span class="brand-name">SimplePOS</span>
          <span class="brand-version">v2.0</span>
        </div>
      </div>

      <div class="sidebar-section">Main Menu</div>
      <nav class="sidebar-nav">
        ${navItems.map(n => `
          <button class="nav-item ${n.id === activePage ? 'active' : ''}" data-page="${n.id}">
            <i class="bi ${n.icon}"></i> ${n.label}
          </button>
        `).join('')}
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
    </aside>

    <!-- Mobile Sidebar Overlay -->
    <div class="sidebar-overlay" id="sidebar-overlay"></div>

    <!-- Mobile Toggle Button -->
    <button class="sidebar-toggle" id="sidebar-toggle" aria-label="Toggle sidebar">
      <i class="bi bi-list"></i>
    </button>
  `;

  // ── Page Titles ────────────────────────────────────────────
  const pageTitles = {
    pos: 'New Sale',
    dashboard: 'Dashboard',
    orders: 'Orders',
    products: 'Products',
    users: 'Staff'
  };

  // ── Main Content ───────────────────────────────────────────
  const main = `
    <div class="main">
      <header class="topbar">
        <div class="topbar-left">
          <span class="topbar-title">${pageTitles[activePage] || ''}</span>
        </div>
        <div class="topbar-right">
          <span class="topbar-date">${fmt_now()}</span>
        </div>
      </header>
      <div class="page-content" id="page-content"></div>
    </div>
  `;

  // ── Render ──────────────────────────────────────────────────
  document.getElementById('app').innerHTML = sidebar + main;

  // ── Navigation ─────────────────────────────────────────────
  document.querySelectorAll('.nav-item[data-page]').forEach(btn => {
    btn.onclick = () => {
      onNavigate(btn.dataset.page);
      closeMobileSidebar();
    };
  });

  // ── Logout ──────────────────────────────────────────────────
  document.getElementById('logout-btn').onclick = async () => {
    try {
      await api.logout();
    } catch(e) {}
    api.clearTokens();
    toast('Signed out successfully', 'info');
    onNavigate('login');
  };

  // ── Mobile Sidebar Toggle ──────────────────────────────────
  const sidebarEl = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  const toggleBtn = document.getElementById('sidebar-toggle');

  function toggleMobileSidebar() {
    sidebarEl.classList.toggle('open');
    overlay.classList.toggle('show');
    toggleBtn.querySelector('i').className = sidebarEl.classList.contains('open') 
      ? 'bi bi-x-lg' 
      : 'bi bi-list';
  }

  function closeMobileSidebar() {
    sidebarEl.classList.remove('open');
    overlay.classList.remove('show');
    if (toggleBtn) {
      toggleBtn.querySelector('i').className = 'bi bi-list';
    }
  }

  toggleBtn?.addEventListener('click', toggleMobileSidebar);
  overlay?.addEventListener('click', closeMobileSidebar);

  // Close sidebar on escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeMobileSidebar();
  });

  // ── Watch for window resize ─────────────────────────────────
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (window.innerWidth > 900) {
        closeMobileSidebar();
      }
    }, 250);
  });
}

// ── Helper: Format date/time ──────────────────────────────────
function fmt_now() {
  return new Date().toLocaleString('en-KE', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  });
}