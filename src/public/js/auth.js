/**
 * GovDrive-Core  ·  Auth Module
 * Handles login.html and register.html logic.
 * Depends on: api.js  (window.api)
 */

/* ── Toast helper (inline, no extra dep) ─────────────────── */
function toast(type, title, message, duration = 4000) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }
  const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.innerHTML = `
    <span class="toast-icon">${icons[type] || 'ℹ️'}</span>
    <div class="toast-body">
      <div class="toast-title">${title}</div>
      ${message ? `<div class="toast-message">${message}</div>` : ''}
    </div>`;
  container.appendChild(el);
  setTimeout(() => {
    el.classList.add('removing');
    el.addEventListener('animationend', () => el.remove(), { once: true });
  }, duration);
}

/* ── Shared: redirect if already authenticated ───────────── */
async function redirectIfLoggedIn() {
  try {
    const data = await window.api.auth.profile();
    const role = data?.user?.role || data?.data?.role;
    if (role === 'admin' || role === 'employee') {
      window.location.replace('./admin.html');
    } else {
      window.location.replace('./dashboard.html');
    }
  } catch {
    // Not logged in — stay on current page
  }
}

/* ── Field-level validation helpers ─────────────────────── */
function setFieldError(fieldId, msg) {
  const el = document.getElementById(fieldId);
  if (!el) return;
  el.classList.add('error');
  const errEl = document.getElementById(`${fieldId}-error`);
  if (errEl) { errEl.textContent = msg; errEl.classList.remove('hidden'); }
}
function clearFieldError(fieldId) {
  const el = document.getElementById(fieldId);
  if (!el) return;
  el.classList.remove('error');
  const errEl = document.getElementById(`${fieldId}-error`);
  if (errEl) { errEl.textContent = ''; errEl.classList.add('hidden'); }
}
function clearAllErrors(form) {
  form.querySelectorAll('.form-input.error, .form-select.error').forEach(el => el.classList.remove('error'));
  form.querySelectorAll('.form-error').forEach(el => { el.textContent = ''; el.classList.add('hidden'); });
}

/* ── Apply backend validation errors to fields ───────────── */
function applyServerErrors(errData) {
  const errors = errData?.errors || [];
  errors.forEach(e => {
    const field = e.path || e.param;
    if (field) setFieldError(field, e.msg || e.message);
  });
}

/* ══════════════════════════════════════════════════════════
   LOGIN PAGE
   ══════════════════════════════════════════════════════════ */
function initLoginPage() {
  redirectIfLoggedIn();

  const form    = document.getElementById('login-form');
  const btn     = document.getElementById('login-btn');
  const emailEl = document.getElementById('email');
  const passEl  = document.getElementById('password');

  if (!form) return;

  // Live clear errors on input
  [emailEl, passEl].forEach(el => {
    if (el) el.addEventListener('input', () => clearFieldError(el.id));
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearAllErrors(form);

    const email    = emailEl?.value.trim();
    const password = passEl?.value;

    let valid = true;
    if (!email)    { setFieldError('email', 'Email is required');       valid = false; }
    if (!password) { setFieldError('password', 'Password is required'); valid = false; }
    if (!valid) return;

    btn.classList.add('btn-loading');
    btn.disabled = true;

    try {
      const data = await window.api.auth.login({ email, password });
      const role = data?.user?.role || data?.data?.role;
      toast('success', 'Welcome back!', `Logged in as ${data?.user?.fullName || email}`);

      setTimeout(() => {
        if (role === 'admin' || role === 'employee') {
          window.location.href = './admin.html';
        } else {
          window.location.href = './dashboard.html';
        }
      }, 800);
    } catch (err) {
      if (err.status === 422 || err.status === 400) {
        applyServerErrors(err.data);
      }
      toast('error', 'Login Failed', err.message || 'Invalid credentials');
    } finally {
      btn.classList.remove('btn-loading');
      btn.disabled = false;
    }
  });

  // Password visibility toggle
  const toggleBtn = document.getElementById('toggle-password');
  if (toggleBtn && passEl) {
    toggleBtn.addEventListener('click', () => {
      const isText = passEl.type === 'text';
      passEl.type = isText ? 'password' : 'text';
      toggleBtn.textContent = isText ? '👁️' : '🙈';
    });
  }
}

/* ══════════════════════════════════════════════════════════
   REGISTER PAGE
   ══════════════════════════════════════════════════════════ */
function initRegisterPage() {
  redirectIfLoggedIn();

  const form = document.getElementById('register-form');
  const btn  = document.getElementById('register-btn');
  if (!form) return;

  // Live clear on input
  form.querySelectorAll('.form-input, .form-select').forEach(el => {
    el.addEventListener('input', () => clearFieldError(el.id));
    el.addEventListener('change', () => clearFieldError(el.id));
  });

  // Password strength indicator
  const passEl = document.getElementById('password');
  const strengthBar = document.getElementById('password-strength');
  if (passEl && strengthBar) {
    passEl.addEventListener('input', () => {
      const v = passEl.value;
      let score = 0;
      if (v.length >= 8)      score++;
      if (/[A-Z]/.test(v))    score++;
      if (/[a-z]/.test(v))    score++;
      if (/\d/.test(v))       score++;
      if (/[^A-Za-z0-9]/.test(v)) score++;
      const colors = ['#ef4444','#f59e0b','#f59e0b','#10b981','#10b981'];
      const labels = ['Very Weak','Weak','Fair','Strong','Very Strong'];
      strengthBar.style.width = `${(score / 5) * 100}%`;
      strengthBar.style.background = colors[score - 1] || '#475569';
      const labelEl = document.getElementById('strength-label');
      if (labelEl) labelEl.textContent = labels[score - 1] || '';
    });
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearAllErrors(form);

    const body = {
      fullName:      document.getElementById('fullName')?.value.trim(),
      nationalNumber:document.getElementById('nationalNumber')?.value.trim(),
      email:         document.getElementById('email')?.value.trim(),
      password:      document.getElementById('password')?.value,
      birthDate:     document.getElementById('birthDate')?.value,
      phone:         document.getElementById('phone')?.value.trim(),
      address:       document.getElementById('address')?.value.trim(),
      nationality:   document.getElementById('nationality')?.value.trim() || 'Syrian',
    };

    // Client-side required check
    const required = ['fullName','nationalNumber','email','password','birthDate','phone','address'];
    let valid = true;
    required.forEach(k => {
      if (!body[k]) { setFieldError(k, 'This field is required'); valid = false; }
    });

    // Password confirm
    const confirmPass = document.getElementById('confirmPassword')?.value;
    if (confirmPass !== undefined && confirmPass !== body.password) {
      setFieldError('confirmPassword', 'Passwords do not match');
      valid = false;
    }
    if (!valid) return;

    btn.classList.add('btn-loading');
    btn.disabled = true;

    try {
      await window.api.auth.signup(body);
      toast('success', 'Account Created!', 'Redirecting to login...');
      setTimeout(() => window.location.href = './login.html', 1200);
    } catch (err) {
      if (err.status === 422 || err.status === 400) {
        applyServerErrors(err.data);
      }
      toast('error', 'Registration Failed', err.message || 'Please check your details');
    } finally {
      btn.classList.remove('btn-loading');
      btn.disabled = false;
    }
  });
}

/* ── Auto-init based on current page ────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  const path = window.location.pathname;
  if (path.includes('login')) initLoginPage();
  // register page is handled entirely by register.js — do NOT call initRegisterPage here
});
