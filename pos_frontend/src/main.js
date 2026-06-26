import './main.css';
import { api } from './api.js';
import { renderLayout } from './layout.js';
import { renderLogin } from './pages/login.js';
import { renderPOS } from './pages/pos.js';
import { renderDashboard } from './pages/dashboard.js';
import { renderOrders } from './pages/orders.js';
import { renderProducts } from './pages/products.js';
import { renderUsers } from './pages/users.js';

let currentUser = null;
let currentPage = 'pos';

async function navigate(page) {
  if (page === 'login') {
    currentUser = null;
    renderLogin(onLoginSuccess);
    return;
  }

  if (!currentUser) {
    renderLogin(onLoginSuccess);
    return;
  }

  // Role guard
  const adminOnly = ['dashboard', 'products', 'users'];
  if (adminOnly.includes(page) && currentUser.role !== 'admin') {
    page = 'pos';
  }

  currentPage = page;
  renderLayout(page, currentUser, navigate);

  const content = document.getElementById('page-content');
  switch (page) {
    case 'pos':       await renderPOS(); break;
    case 'dashboard': await renderDashboard(); break;
    case 'orders':    await renderOrders(currentUser); break;
    case 'products':  await renderProducts(); break;
    case 'users':     await renderUsers(currentUser); break;
  }
}

function onLoginSuccess(user) {
  currentUser = user;
  const landingPage = user.role === 'admin' ? 'dashboard' : 'pos';
  navigate(landingPage);
}

// Handle session expiry
window.addEventListener('auth:logout', () => {
  currentUser = null;
  renderLogin(onLoginSuccess);
});

// Boot
const savedUser = api.getUser();
const token = localStorage.getItem('access_token');
if (savedUser && token) {
  currentUser = savedUser;
  navigate(savedUser.role === 'admin' ? 'dashboard' : 'pos');
} else {
  renderLogin(onLoginSuccess);
}
