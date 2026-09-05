/**
 * GovDrive-Core  ·  Registration Wizard  (v4 — CSP compliant)
 * ─────────────────────────────────────────────────────────────
 * WHAT CHANGED FROM v3
 * ─────────────────────
 * Helmet 8 sets  Content-Security-Policy: script-src-attr 'none'
 * as a *separate* directive that governs inline event-handler
 * attributes (onclick, onsubmit, etc.).  That directive is NOT
 * overridden by 'unsafe-inline' in script-src — they are
 * independent CSP directives.
 *
 * v3 kept window.goStep exposed on the global scope so that
 * onclick="goStep(2)" attributes in the HTML could call it.
 * Every one of those onclick= calls was blocked by the CSP.
 *
 * v4 fix:
 *   • window.goStep removed entirely — no global pollution.
 *   • All button wiring moved inside DOMContentLoaded using
 *     element.addEventListener('click', ...) — fully CSP-safe.
 *   • Button IDs added in register.html:
 *       #next-btn-1   → step 1 "Continue" button
 *       #prev-btn-2   → step 2 "Back" button
 *       #next-btn-2   → step 2 "Continue" button
 *       #prev-btn-3   → step 3 "Back" button
 *       #register-btn → step 3 submit button (type="submit")
 *
 * Depends on: api.js  (window.api must be loaded before this file)
 */

(function () {
  'use strict';

  /* ══════════════════════════════════════════════════════
     TOAST  (zero external dependencies)
     ══════════════════════════════════════════════════════ */
  function toast(type, title, message, duration) {
    message  = message  === undefined ? '' : message;
    duration = duration === undefined ? 4500 : duration;

    var container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      document.body.appendChild(container);
    }

    var icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
    var el = document.createElement('div');
    el.className = 'toast toast-' + type;
    el.innerHTML =
      '<span class="toast-icon">' + (icons[type] || 'ℹ️') + '</span>' +
      '<div class="toast-body">' +
        '<div class="toast-title">' + title + '</div>' +
        (message ? '<div class="toast-message">' + message + '</div>' : '') +
      '</div>';
    container.appendChild(el);

    setTimeout(function () {
      el.classList.add('removing');
      el.addEventListener('animationend', function () { el.remove(); }, { once: true });
    }, duration);
  }

  /* ══════════════════════════════════════════════════════
     FIELD HELPERS
     ══════════════════════════════════════════════════════ */
  function setError(id, msg) {
    var input = document.getElementById(id);
    var errEl = document.getElementById(id + '-error');
    if (input) input.classList.add('error');
    if (errEl) {
      errEl.textContent = msg;
      errEl.classList.remove('hidden');
    }
  }

  function clearError(id) {
    var input = document.getElementById(id);
    var errEl = document.getElementById(id + '-error');
    if (input) input.classList.remove('error');
    if (errEl) {
      errEl.textContent = '';
      errEl.classList.add('hidden');
    }
  }

  function fieldVal(id) {
    var el = document.getElementById(id);
    return el ? el.value.trim() : '';
  }

  /* ══════════════════════════════════════════════════════
     STEP INDICATORS
     ══════════════════════════════════════════════════════ */
  function updateIndicators(current) {
    for (var i = 1; i <= 3; i++) {
      var ind  = document.getElementById('step-indicator-' + i);
      var conn = document.getElementById('step-conn-' + i);
      if (!ind) continue;

      ind.classList.remove('active', 'completed');

      if (i < current) {
        ind.classList.add('completed');
        if (conn) conn.classList.add('done');
      }
      if (i === current) {
        ind.classList.add('active');
        if (conn) conn.classList.remove('done');
      }
    }
  }

  /* ══════════════════════════════════════════════════════
     STEP VISIBILITY + TRANSITION
     ══════════════════════════════════════════════════════ */
  var currentStep = 1;

  function showStep(n) {
    console.log('[register.js] showStep(' + n + ')  ← from step', currentStep);

    for (var i = 1; i <= 3; i++) {
      var panel = document.getElementById('reg-step-' + i);
      if (!panel) {
        console.warn('[register.js] DOM element #reg-step-' + i + ' not found');
        continue;
      }

      if (i === n) {
        /* Un-hide first, then trigger transition on next two frames
           so the browser lays out the element before animating it. */
        panel.classList.remove('hidden');
        panel.style.transition = 'none';
        panel.style.opacity    = '0';
        panel.style.transform  = 'translateY(8px)';

        (function (p) {
          requestAnimationFrame(function () {
            requestAnimationFrame(function () {
              p.style.transition = 'opacity 0.28s ease, transform 0.28s ease';
              p.style.opacity    = '1';
              p.style.transform  = 'translateY(0)';
            });
          });
        }(panel));

      } else {
        panel.classList.add('hidden');
        panel.style.transition = '';
        panel.style.opacity    = '';
        panel.style.transform  = '';
      }
    }

    updateIndicators(n);
    currentStep = n;
    console.log('[register.js] currentStep →', currentStep);
  }

  /* ══════════════════════════════════════════════════════
     VALIDATORS  (pure functions, no side-effects on DOM)
     ══════════════════════════════════════════════════════ */
  function validateStep1() {
    console.log('[register.js] validateStep1()');
    var ok = true;

    var checks = {
      fullName:       'Full name is required',
      nationalNumber: 'National ID number is required',
      birthDate:      'Date of birth is required',
    };

    Object.keys(checks).forEach(function (id) {
      clearError(id);
      var v = fieldVal(id);
      if (!v) {
        setError(id, checks[id]);
        ok = false;
      } else if (id === 'fullName' && v.length < 3) {
        setError(id, 'Full name must be at least 3 characters');
        ok = false;
      }
    });

    console.log('[register.js] validateStep1 →', ok);
    return ok;
  }

  function validateStep2() {
    console.log('[register.js] validateStep2()');
    var ok = true;

    clearError('email');
    clearError('phone');
    clearError('address');

    var email   = fieldVal('email');
    var phone   = fieldVal('phone');
    var address = fieldVal('address');

    if (!email) {
      setError('email', 'Email address is required');
      ok = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('email', 'Please enter a valid email address');
      ok = false;
    }

    if (!phone) {
      setError('phone', 'Phone number is required');
      ok = false;
    }

    if (!address || address.length < 5) {
      setError('address', 'Please enter a valid address (min 5 characters)');
      ok = false;
    }

    console.log('[register.js] validateStep2 →', ok);
    return ok;
  }

  function validateStep3() {
    console.log('[register.js] validateStep3()');
    var ok = true;

    clearError('password');
    clearError('confirmPassword');

    var passEl   = document.getElementById('password');
    var confEl   = document.getElementById('confirmPassword');
    var password = passEl ? passEl.value : '';
    var confirm  = confEl ? confEl.value : '';

    if (!password) {
      setError('password', 'Password is required');
      ok = false;
    } else if (password.length < 8) {
      setError('password', 'Must be at least 8 characters');
      ok = false;
    } else if (!/[A-Z]/.test(password)) {
      setError('password', 'Must include at least one uppercase letter (A–Z)');
      ok = false;
    } else if (!/[a-z]/.test(password)) {
      setError('password', 'Must include at least one lowercase letter (a–z)');
      ok = false;
    } else if (!/\d/.test(password)) {
      setError('password', 'Must include at least one number (0–9)');
      ok = false;
    } else if (!/[^A-Za-z0-9]/.test(password)) {
      setError('password', 'Must include at least one symbol  e.g. !@#$%^&*');
      ok = false;
    }

    if (ok && password !== confirm) {
      setError('confirmPassword', 'Passwords do not match');
      ok = false;
    }

    var termsEl = document.getElementById('terms');
    if (termsEl && !termsEl.checked) {
      toast('warning', 'Terms Required', 'Please accept the Terms of Service to continue.');
      ok = false;
    }

    console.log('[register.js] validateStep3 →', ok);
    return ok;
  }

  /* ══════════════════════════════════════════════════════
     NAVIGATION WIRING
     ─────────────────────────────────────────────────────
     CSP FIX: all click handlers wired here via
     addEventListener, never via onclick= attributes.
     ══════════════════════════════════════════════════════ */
  function initNavigation() {
    /* Helper — bind a button by ID, guard if element missing */
    function on(id, handler) {
      var el = document.getElementById(id);
      if (!el) {
        console.warn('[register.js] initNavigation: #' + id + ' not found in DOM');
        return;
      }
      el.addEventListener('click', handler);
      console.log('[register.js] click listener attached to #' + id);
    }

    /* Step 1 → Step 2 */
    on('next-btn-1', function () {
      console.log('[register.js] #next-btn-1 clicked');
      if (validateStep1()) showStep(2);
    });

    /* Step 2 → Step 1 (back, no validation) */
    on('prev-btn-2', function () {
      console.log('[register.js] #prev-btn-2 clicked');
      showStep(1);
    });

    /* Step 2 → Step 3 */
    on('next-btn-2', function () {
      console.log('[register.js] #next-btn-2 clicked');
      if (validateStep2()) showStep(3);
    });

    /* Step 3 → Step 2 (back, no validation) */
    on('prev-btn-3', function () {
      console.log('[register.js] #prev-btn-3 clicked');
      showStep(2);
    });
  }

  /* ══════════════════════════════════════════════════════
     PASSWORD STRENGTH METER
     ══════════════════════════════════════════════════════ */
  function initStrengthMeter() {
    var passEl = document.getElementById('password');
    var bar    = document.getElementById('password-strength');
    var label  = document.getElementById('strength-label');
    if (!passEl || !bar) return;

    passEl.addEventListener('input', function () {
      var v     = passEl.value;
      var score = 0;
      if (v.length >= 8)           score++;
      if (/[A-Z]/.test(v))         score++;
      if (/[a-z]/.test(v))         score++;
      if (/\d/.test(v))            score++;
      if (/[^A-Za-z0-9]/.test(v)) score++;

      var pct    = (score / 5 * 100) + '%';
      var colors = ['#ef4444', '#f59e0b', '#f59e0b', '#10b981', '#10b981'];
      var labels = ['Very Weak', 'Weak', 'Fair', 'Strong', 'Very Strong'];
      bar.style.width      = pct;
      bar.style.background = score > 0 ? colors[score - 1] : 'var(--navy-700)';
      if (label) label.textContent = score > 0 ? labels[score - 1] : '';
    });
  }

  /* ══════════════════════════════════════════════════════
     PASSWORD VISIBILITY TOGGLE
     ══════════════════════════════════════════════════════ */
  function initPasswordToggle() {
    var btn  = document.getElementById('toggle-password');
    var pass = document.getElementById('password');
    if (!btn || !pass) return;

    btn.addEventListener('click', function () {
      var isText      = pass.type === 'text';
      pass.type       = isText ? 'password' : 'text';
      btn.textContent = isText ? '👁️' : '🙈';
    });
  }

  /* ══════════════════════════════════════════════════════
     LIVE CLEAR-ON-INPUT
     ══════════════════════════════════════════════════════ */
  function initLiveClear() {
    var fields = document.querySelectorAll(
      '#register-form .form-input, #register-form .form-select'
    );
    fields.forEach(function (el) {
      el.addEventListener('input',  function () { clearError(el.id); });
      el.addEventListener('change', function () { clearError(el.id); });
    });
  }

  /* ══════════════════════════════════════════════════════
     FORM SUBMIT HANDLER
     ══════════════════════════════════════════════════════ */
  function initFormSubmit() {
    var form = document.getElementById('register-form');
    var btn  = document.getElementById('register-btn');

    if (!form) {
      console.error('[register.js] #register-form not found — submit handler not attached');
      return;
    }
    if (!btn) {
      console.error('[register.js] #register-btn not found — submit handler not attached');
      return;
    }

    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      e.stopPropagation();

      console.log('[register.js] form submit event fired | currentStep =', currentStep);

      /* Only process on step 3 */
      if (currentStep !== 3) {
        console.warn('[register.js] submit ignored — not on step 3 (step is', currentStep, ')');
        return;
      }

      if (!validateStep3()) {
        console.log('[register.js] submit blocked — step 3 validation failed');
        return;
      }

      /* Verify api.js loaded and signup is available */
      if (!window.api || typeof window.api.auth.signup !== 'function') {
        console.error('[register.js] window.api.auth.signup not available');
        toast('error', 'System Error', 'API client failed to load. Please refresh the page.');
        return;
      }

      /* Collect all field values from all 3 steps — they remain in the DOM even
         when their step panel is hidden, so all values are always accessible. */
      var passEl = document.getElementById('password');
      var body = {
        fullName:       fieldVal('fullName'),
        nationalNumber: fieldVal('nationalNumber'),
        email:          fieldVal('email'),
        password:       passEl ? passEl.value : '',
        birthDate:      fieldVal('birthDate'),
        phone:          fieldVal('phone'),
        address:        fieldVal('address'),
        nationality:    fieldVal('nationality') || 'Syrian',
      };

      console.log('[register.js] payload keys:', Object.keys(body));

      /* Loading state */
      var originalLabel     = btn.textContent;
      btn.disabled          = true;
      btn.classList.add('btn-loading');
      btn.textContent       = 'Creating account…';

      try {
        var result = await window.api.auth.signup(body);
        console.log('[register.js] signup API success:', result);

        toast('success', 'Account Created!', 'Redirecting to sign in…');
        setTimeout(function () {
          window.location.href = './login.html';
        }, 1400);

      } catch (err) {
        console.error('[register.js] signup API error:', err);

        /* Surface server validation errors on the correct fields */
        var serverErrors = (err && err.data && Array.isArray(err.data.errors))
          ? err.data.errors
          : [];

        if (serverErrors.length > 0) {
          serverErrors.forEach(function (e) {
            var field = e.path || e.param;
            if (field) setError(field, e.msg || e.message || 'Invalid value');
          });

          /* Navigate to the step containing the first server error */
          var step1Fields = ['fullName', 'nationalNumber', 'birthDate', 'nationality'];
          var step2Fields = ['email', 'phone', 'address'];
          var firstField  = serverErrors[0] && (serverErrors[0].path || serverErrors[0].param);

          if (firstField && step1Fields.indexOf(firstField) !== -1) {
            showStep(1);
          } else if (firstField && step2Fields.indexOf(firstField) !== -1) {
            showStep(2);
          }
        }

        var msg = (err && err.message) ? err.message : 'An unexpected error occurred.';
        toast('error', 'Registration Failed', msg);

      } finally {
        /* Restore button in all cases */
        btn.disabled = false;
        btn.classList.remove('btn-loading');
        btn.textContent = originalLabel || 'Create Account';
        console.log('[register.js] submit handler finished');
      }
    });

    console.log('[register.js] submit listener attached to #register-form');
  }

  /* ══════════════════════════════════════════════════════
     REDIRECT IF ALREADY LOGGED IN
     ══════════════════════════════════════════════════════ */
  async function redirectIfLoggedIn() {
    try {
      if (!window.api || typeof window.api.auth.profile !== 'function') return;
      var data = await window.api.auth.profile();
      var role = (data && data.user && data.user.role)
        ? data.user.role
        : (data && data.data && data.data.role ? data.data.role : null);
      if (role) {
        console.log('[register.js] already authenticated as', role, '— redirecting');
        window.location.replace(
          (role === 'admin' || role === 'employee') ? './admin.html' : './dashboard.html'
        );
      }
    } catch (_) {
      /* 401 / network error means not logged in — stay on page */
      console.log('[register.js] not authenticated — staying on register page');
    }
  }

  /* ══════════════════════════════════════════════════════
     MAIN INIT
     ─────────────────────────────────────────────────────
     All DOM wiring happens here after the DOM is ready.
     No globals exposed. No inline handlers needed.
     ══════════════════════════════════════════════════════ */
  document.addEventListener('DOMContentLoaded', async function () {
    console.log('[register.js] DOMContentLoaded — starting init');

    /* Bail out if this script is loaded on any page other than register.html */
    if (!document.getElementById('register-form')) {
      console.log('[register.js] #register-form absent — not on register page, skipping');
      return;
    }

    /* 1. Auth redirect — awaited so it can't race with the init below */
    await redirectIfLoggedIn();

    /* 2. Show step 1 */
    showStep(1);

    /* 3. Wire all navigation buttons (CSP-safe addEventListener) */
    initNavigation();

    /* 4. Wire ancillary UX */
    initStrengthMeter();
    initPasswordToggle();
    initLiveClear();

    /* 5. Wire form submit */
    initFormSubmit();

    console.log('[register.js] init complete — all listeners attached, wizard on step 1');
  });

})();
