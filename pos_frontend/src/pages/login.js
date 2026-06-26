import { api } from '../api.js';
import { toast } from '../toast.js';

export function renderLogin(onSuccess) {
  document.getElementById('app').innerHTML = `
    <div class="auth-screen">
      <div class="auth-card">
        <div class="auth-logo"><i class="bi bi-shop"></i> SimplePOS</div>
        <div class="form-group">
          <label class="form-label">Username</label>
          <input id="username" class="form-control" placeholder="Enter username" autofocus />
        </div>
        <div class="form-group">
          <label class="form-label">Password</label>
          <input id="password" type="password" class="form-control" placeholder="Enter password" />
        </div>
        <button id="login-btn" class="btn btn-primary btn-block btn-lg" style="margin-top:8px">
          <i class="bi bi-box-arrow-in-right"></i> Sign In
        </button>
        <p id="login-err" style="color:var(--danger);margin-top:12px;font-size:13px;text-align:center;display:none"></p>
      </div>
    </div>`;

  const btn = document.getElementById('login-btn');
  const err = document.getElementById('login-err');

  async function doLogin() {
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    if (!username || !password) { err.textContent = 'Please enter username and password.'; err.style.display='block'; return; }
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Signing in…';
    err.style.display = 'none';
    try {
      const data = await api.login({ username, password });
      api.setTokens(data.access, data.refresh);
      api.setUser(data.user);
      toast(`Welcome, ${data.user.full_name || data.user.username}!`, 'success');
      onSuccess(data.user);
    } catch(e) {
      err.textContent = e?.message || 'Invalid credentials.';
      err.style.display = 'block';
      btn.disabled = false;
      btn.innerHTML = '<i class="bi bi-box-arrow-in-right"></i> Sign In';
    }
  }

  btn.onclick = doLogin;
  document.getElementById('password').onkeydown = (e) => { if (e.key === 'Enter') doLogin(); };
}
