import { api } from '../api.js';
import { toast } from '../toast.js';

export function renderLogin(onSuccess) {
  document.getElementById('app').innerHTML = `
    <div class="auth-screen" style="display:flex;align-items:center;justify-content:center;min-height:100vh;background:linear-gradient(135deg, #0F172A 0%, #1E293B 100%);padding:20px;">
      <!-- Background decorative elements -->
      <div style="position:fixed;top:-200px;right:-200px;width:500px;height:500px;background:radial-gradient(circle,rgba(79,70,229,0.15) 0%,transparent 70%);pointer-events:none;"></div>
      <div style="position:fixed;bottom:-200px;left:-200px;width:500px;height:500px;background:radial-gradient(circle,rgba(124,58,237,0.1) 0%,transparent 70%);pointer-events:none;"></div>

      <!-- Main Card -->
      <div class="card" style="max-width:420px;width:100%;padding:0;border:none;box-shadow:0 25px 50px -12px rgba(0,0,0,0.5);border-radius:var(--radius-lg);overflow:hidden;position:relative;z-index:1;">
        <!-- Card Header with Brand -->
        <div style="padding:32px 32px 0;text-align:center;">
          <div style="display:flex;align-items:center;justify-content:center;gap:12px;margin-bottom:8px;">
            <div style="width:48px;height:48px;background:var(--accent);border-radius:var(--radius);display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(79,70,229,0.3);">
              <img src="pos_logo.png" alt="SimplePOS" style="width:28px;height:28px;object-fit:contain;filter:brightness(0) invert(1);" />
            </div>
            <span style="font-size:24px;font-weight:800;color:var(--text);letter-spacing:-0.5px;">SimplePOS</span>
          </div>
          <p style="color:var(--text-2);font-size:14px;margin-top:4px;">Point of Sale System</p>
        </div>

        <!-- Form -->
        <div style="padding:32px;">
          <div style="margin-bottom:28px;text-align:center;">
            <h2 style="font-size:20px;font-weight:700;color:var(--text);margin-bottom:6px;">Welcome Back</h2>
            <p style="color:var(--text-2);font-size:14px;">Sign in to manage your store</p>
          </div>

          <div id="login-err" class="auth-error" style="display:none;margin-bottom:20px;">
            <i class="bi bi-exclamation-circle"></i>
            <span id="login-err-text">Invalid credentials</span>
          </div>

          <form id="login-form" autocomplete="off">
            <div class="form-group">
              <label class="form-label" for="username">
                <i class="bi bi-person" style="font-size:13px;"></i> Username
              </label>
              <div class="input-group">
                <i class="bi bi-person input-icon"></i>
                <input 
                  id="username" 
                  class="form-control" 
                  placeholder="Enter your username" 
                  autofocus
                />
              </div>
            </div>

            <div class="form-group">
              <label class="form-label" for="password">
                <i class="bi bi-lock" style="font-size:13px;"></i> Password
              </label>
              <div class="input-group input-group-right">
                <i class="bi bi-lock input-icon"></i>
                <input 
                  id="password" 
                  type="password" 
                  class="form-control" 
                  placeholder="Enter your password"
                />
                <button 
                  type="button" 
                  id="toggle-password" 
                  class="input-icon-right" 
                  style="background:none;border:none;cursor:pointer;padding:0;color:var(--text-3);font-size:16px;"
                >
                  <i class="bi bi-eye"></i>
                </button>
              </div>
            </div>

            <button 
              id="login-btn" 
              type="submit" 
              class="btn btn-primary btn-block btn-lg" 
              style="margin-top:8px;height:48px;font-size:15px;"
            >
              <i class="bi bi-box-arrow-in-right"></i> Sign In
            </button>
          </form>

          <!-- Divider -->
          <div style="display:flex;align-items:center;gap:16px;margin:24px 0 20px;">
            <div style="flex:1;height:1px;background:var(--border);"></div>
            <span style="font-size:12px;color:var(--text-3);font-weight:500;text-transform:uppercase;letter-spacing:0.5px;">Demo</span>
            <div style="flex:1;height:1px;background:var(--border);"></div>
          </div>

          <div style="display:flex;justify-content:center;gap:8px;font-size:13px;color:var(--text-2);">
            <span>Try with:</span>
            <code style="background:var(--bg);padding:2px 10px;border-radius:4px;border:1px solid var(--border);font-family:var(--mono);font-size:12px;color:var(--text);">admin</code>
            <span style="color:var(--text-3);">/</span>
            <code style="background:var(--bg);padding:2px 10px;border-radius:4px;border:1px solid var(--border);font-family:var(--mono);font-size:12px;color:var(--text);">admin123</code>
          </div>
        </div>
      </div>
    </div>`;

  // ── DOM refs ────────────────────────────────────────────────
  const form = document.getElementById('login-form');
  const username = document.getElementById('username');
  const password = document.getElementById('password');
  const btn = document.getElementById('login-btn');
  const errBox = document.getElementById('login-err');
  const errText = document.getElementById('login-err-text');
  const togglePwd = document.getElementById('toggle-password');

  // ── Toggle password visibility ─────────────────────────────
  togglePwd?.addEventListener('click', () => {
    const isPassword = password.type === 'password';
    password.type = isPassword ? 'text' : 'password';
    togglePwd.querySelector('i').className = isPassword ? 'bi bi-eye-slash' : 'bi bi-eye';
  });

  // ── Auto-focus username ────────────────────────────────────
  setTimeout(() => username?.focus(), 100);

  // ── Login logic ─────────────────────────────────────────────
  async function doLogin(e) {
    e?.preventDefault();

    const user = username.value.trim();
    const pass = password.value;

    if (!user || !pass) {
      errText.textContent = 'Please enter both username and password.';
      errBox.style.display = 'flex';
      errBox.style.animation = 'shake 0.4s ease';
      setTimeout(() => { errBox.style.animation = ''; }, 500);
      return;
    }

    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Signing in…';
    errBox.style.display = 'none';

    try {
      const data = await api.login({ username: user, password: pass });
      api.setTokens(data.access, data.refresh);
      api.setUser(data.user);
      
      toast(`Welcome, ${data.user.full_name || data.user.username}!`, 'success');
      onSuccess(data.user);
    } catch (error) {
      errText.textContent = error?.message || 'Invalid username or password.';
      errBox.style.display = 'flex';
      errBox.style.animation = 'shake 0.4s ease';
      setTimeout(() => { errBox.style.animation = ''; }, 500);
      
      btn.disabled = false;
      btn.innerHTML = '<i class="bi bi-box-arrow-in-right"></i> Sign In';
    }
  }

  // ── Event listeners ────────────────────────────────────────
  form?.addEventListener('submit', doLogin);
  
  password?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      doLogin(e);
    }
  });

  username?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      password?.focus();
    }
  });
}