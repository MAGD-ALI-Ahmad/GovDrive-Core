/**
 * GovDrive-Core  ·  Admin & Employee Dashboard
 * ─────────────────────────────────────────────
 * Fix applied: Universal status control — every Application row
 * and every Payment row now always shows a "⚙ Change Status"
 * button that opens a dropdown modal, regardless of current state.
 *
 * Application statuses: New | Approved | Cancelled | Completed
 * Payment    statuses:  Pending | Verified | Rejected
 *
 * Depends on: api.js (window.api)
 */

/* ══════════════════════════════════════════════════════════
   SHARED UTILITIES
   ══════════════════════════════════════════════════════════ */

let adminUser = null;

function toast(type, title, message = '', duration = 4500) {
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

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function statusBadge(status) {
  const map = {
    New:           'badge-new',
    Pending:       'badge-pending',
    Confirmed:     'badge-confirmed',
    Approved:      'badge-approved',
    Completed:     'badge-completed',
    Cancelled:     'badge-cancelled',
    Rejected:      'badge-rejected',
    Verified:      'badge-verified',
    Active:        'badge-active',
    Expired:       'badge-cancelled',
    Suspended:     'badge-cancelled',
    'Under Review':'badge-pending',
  };
  const cls = map[status] || 'badge-pending';
  return `<span class="badge ${cls}">${status || '—'}</span>`;
}

function showSection(id) {
  document.querySelectorAll('.admin-section').forEach(s => s.classList.add('hidden'));
  const target = document.getElementById(id);
  if (target) { target.classList.remove('hidden'); }
  document.querySelectorAll('.sidebar-item').forEach(item => {
    item.classList.toggle('active', item.dataset.section === id);
  });
}

function openModal(id)  { document.getElementById(id)?.classList.add('open'); }
function closeModal(id) { document.getElementById(id)?.classList.remove('open'); }

/* ══════════════════════════════════════════════════════════
   AUTH GUARD
   ══════════════════════════════════════════════════════════ */
async function requireAdminAuth() {
  try {
    const data = await window.api.auth.profile();
    adminUser = data?.user || data?.data;
    if (!adminUser) throw new Error('No profile');
    if (adminUser.role === 'customer') {
      window.location.replace('./dashboard.html');
      return false;
    }
    return true;
  } catch {
    window.location.replace('./login.html');
    return false;
  }
}

/* ══════════════════════════════════════════════════════════
   DASHBOARD STATS
   ══════════════════════════════════════════════════════════ */
let statsRefreshInterval = null;

async function loadStats() {
  try {
    const data  = await window.api.admin.stats();
    const stats = data?.stats || {};

    animateCounter('stat-total-users',    stats.totalUsers || 0);
    animateCounter('stat-apps-pending',   stats.applications?.pending || 0);
    animateCounter('stat-apps-approved',  stats.applications?.approved || 0);
    animateCounter('stat-apps-completed', stats.applications?.completed || 0);
    animateCounter('stat-pay-pending',    stats.payments?.pending || 0);
    animateCounter('stat-revenue',        stats.payments?.totalRevenue || 0, true);
    animateCounter('stat-appts-pending',  stats.appointments?.pendingRequests || 0);

    const el = document.getElementById('stats-last-updated');
    if (el) el.textContent = new Date().toLocaleTimeString();
  } catch (err) {
    toast('error', 'Stats load failed', err.message);
  }
}

function animateCounter(id, target, isCurrency = false) {
  const el = document.getElementById(id);
  if (!el) return;
  const duration  = 900;
  const startTime = performance.now();
  const update = (now) => {
    const progress = Math.min((now - startTime) / duration, 1);
    const eased    = 1 - Math.pow(1 - progress, 3);
    const current  = Math.round(target * eased);
    el.textContent = isCurrency ? `$${current.toLocaleString()}` : current.toLocaleString();
    if (progress < 1) requestAnimationFrame(update);
  };
  requestAnimationFrame(update);
}

/* ══════════════════════════════════════════════════════════
   ── FIX #2 ──  UNIVERSAL STATUS CHANGE MODAL
   ══════════════════════════════════════════════════════════
   One shared modal handles both Application and Payment status
   updates. openStatusModal() populates it dynamically based on
   which entity is being edited.
   ══════════════════════════════════════════════════════════ */

const APP_STATUSES = [
  { value: 'New',       label: '🆕 New',          cls: 'badge-new'       },
  { value: 'Approved',  label: '✅ Approved',      cls: 'badge-approved'  },
  { value: 'Cancelled', label: '✕  Cancelled',     cls: 'badge-cancelled' },
  { value: 'Completed', label: '🏁 Completed',     cls: 'badge-completed' },
];

const PAY_STATUSES = [
  { value: 'Pending',  label: '⏳ Pending',   cls: 'badge-pending'  },
  { value: 'Verified', label: '✅ Verified',  cls: 'badge-verified' },
  { value: 'Rejected', label: '✕  Rejected',  cls: 'badge-cancelled'},
];

/**
 * Opens the shared status-change modal.
 * @param {'application'|'payment'} entityType
 * @param {string} entityId   – MongoDB ObjectId
 * @param {string} currentStatus
 * @param {string} label      – display name of entity shown in modal
 */
function openStatusModal(entityType, entityId, currentStatus, label) {
  const statuses = entityType === 'application' ? APP_STATUSES : PAY_STATUSES;

  // Populate modal header
  document.getElementById('status-modal-title').textContent =
    `⚙ Change ${entityType === 'application' ? 'Application' : 'Payment'} Status`;
  document.getElementById('status-modal-entity-label').textContent = label || entityId;
  document.getElementById('status-modal-current').innerHTML =
    `Current: ${statusBadge(currentStatus)}`;

  // Build status option cards
  const grid = document.getElementById('status-modal-options');
  grid.innerHTML = statuses.map(s => `
    <button
      type="button"
      class="status-option-btn ${s.value === currentStatus ? 'status-option-current' : ''}"
      data-value="${s.value}"
      onclick="selectStatusOption(this)"
      aria-pressed="${s.value === currentStatus}"
    >
      <span class="badge ${s.cls}" style="pointer-events:none">${s.label}</span>
      ${s.value === currentStatus ? '<span class="status-check">✓</span>' : ''}
    </button>`).join('');

  // Set hidden fields
  document.getElementById('status-modal-type').value     = entityType;
  document.getElementById('status-modal-id').value       = entityId;
  document.getElementById('status-modal-selected').value = currentStatus;

  openModal('modal-status-change');
}

/** Highlights a selected option button inside the modal */
function selectStatusOption(btn) {
  document.querySelectorAll('#status-modal-options .status-option-btn')
    .forEach(b => {
      b.classList.remove('status-option-active');
      b.setAttribute('aria-pressed', 'false');
    });
  btn.classList.add('status-option-active');
  btn.setAttribute('aria-pressed', 'true');
  document.getElementById('status-modal-selected').value = btn.dataset.value;
}

/** Confirms and applies the chosen status change */
async function applyStatusChange() {
  const entityType     = document.getElementById('status-modal-type').value;
  const entityId       = document.getElementById('status-modal-id').value;
  const selectedStatus = document.getElementById('status-modal-selected').value;
  const confirmBtn     = document.getElementById('status-modal-confirm-btn');

  if (!selectedStatus) {
    toast('warning', 'No status selected', 'Click one of the status options first.');
    return;
  }

  confirmBtn.classList.add('btn-loading');
  confirmBtn.disabled = true;

  try {
    if (entityType === 'application') {
      await window.api.applications.updateStatus(entityId, { applicationStatus: selectedStatus });
      toast('success', 'Application Updated', `Status set to "${selectedStatus}".`);
      closeModal('modal-status-change');
      loadAllApplications();
      loadStats();
    } else {
      await window.api.payments.verify(entityId, { paymentStatus: selectedStatus });
      toast('success', 'Payment Updated', `Status set to "${selectedStatus}".`);
      closeModal('modal-status-change');
      loadAllPayments();
      loadStats();
    }
  } catch (err) {
    toast('error', 'Update Failed', err.message);
  } finally {
    confirmBtn.classList.remove('btn-loading');
    confirmBtn.disabled = false;
  }
}

/* ══════════════════════════════════════════════════════════
   APPLICATIONS MANAGEMENT
   ══════════════════════════════════════════════════════════ */
async function loadAllApplications(filter = '') {
  const tbody  = document.getElementById('all-apps-tbody');
  const loader = document.getElementById('all-apps-loader');
  const empty  = document.getElementById('all-apps-empty');
  if (!tbody) return;

  loader?.classList.remove('hidden');
  empty?.classList.add('hidden');
  tbody.innerHTML = '';

  try {
    const data = await window.api.applications.getAll();
    let apps   = data?.applications || data?.data || [];

    if (filter) apps = apps.filter(a =>
      a.applicationStatus?.toLowerCase() === filter.toLowerCase()
    );

    loader?.classList.add('hidden');
    if (!apps.length) { empty?.classList.remove('hidden'); return; }

    tbody.innerHTML = apps.map(app => {
      const name   = app.applicantUserId?.fullName || '—';
      const natNum = app.applicantUserId?.nationalNumber || '';
      const label  = `${name}${natNum ? ` · ${natNum.slice(-4)}` : ''}`;
      const appType = app.applicationType?.replace(/_/g, ' ') || '—';

      // Quick-action inline buttons for the most common transitions
      let quickBtns = '';
      if (app.applicationStatus === 'New') {
        quickBtns = `
          <button class="btn btn-success btn-sm" onclick="quickAppStatus('${app._id}','Approved')">✓ Approve</button>
          <button class="btn btn-danger btn-sm"  onclick="quickAppStatus('${app._id}','Cancelled')">✕ Cancel</button>`;
      } else if (app.applicationStatus === 'Approved') {
        quickBtns = `
          <button class="btn btn-primary btn-sm" onclick="quickAppStatus('${app._id}','Completed')">🏁 Complete</button>
          <button class="btn btn-danger btn-sm"  onclick="quickAppStatus('${app._id}','Cancelled')">✕ Cancel</button>`;
      }

      return `
        <tr>
          <td class="font-mono text-xs">${app._id?.slice(-6).toUpperCase()}</td>
          <td>
            <div style="font-weight:600;font-size:0.85rem">${name}</div>
            <div class="text-xs text-muted">${natNum}</div>
          </td>
          <td style="font-size:0.8rem">${appType}</td>
          <td>${statusBadge(app.applicationStatus)}</td>
          <td>$${app.paidFees ?? '—'}</td>
          <td style="font-size:0.8rem">${formatDate(app.createdAt)}</td>
          <td>
            <div class="flex gap-2" style="flex-wrap:wrap">
              ${quickBtns}
              <button
                class="btn btn-ghost btn-sm"
                title="Change to any status"
                onclick="openStatusModal('application','${app._id}','${app.applicationStatus}','${label.replace(/'/g, "\\'")}')"
              >⚙ Status</button>
            </div>
          </td>
        </tr>`;
    }).join('');
  } catch (err) {
    loader?.classList.add('hidden');
    toast('error', 'Failed to load applications', err.message);
  }
}

/** Quick inline approve/cancel without opening the modal */
async function quickAppStatus(id, status) {
  if (!confirm(`Set application status to "${status}"?`)) return;
  try {
    await window.api.applications.updateStatus(id, { applicationStatus: status });
    toast('success', `Application ${status}`);
    loadAllApplications();
    loadStats();
  } catch (err) {
    toast('error', 'Update failed', err.message);
  }
}

/* ══════════════════════════════════════════════════════════
   PAYMENTS MANAGEMENT
   ══════════════════════════════════════════════════════════ */
async function loadAllPayments(filterStatus = '') {
  const tbody  = document.getElementById('all-payments-tbody');
  const loader = document.getElementById('all-payments-loader');
  const empty  = document.getElementById('all-payments-empty');
  if (!tbody) return;

  loader?.classList.remove('hidden');
  empty?.classList.add('hidden');
  tbody.innerHTML = '';

  try {
    const data   = await window.api.payments.allForEmployee();
    let payments = data?.payments || data?.data || [];

    if (filterStatus) payments = payments.filter(p =>
      p.paymentStatus?.toLowerCase() === filterStatus.toLowerCase()
    );

    loader?.classList.add('hidden');
    if (!payments.length) { empty?.classList.remove('hidden'); return; }

    tbody.innerHTML = payments.map(p => {
      const userName  = p.userId?.fullName  || '—';
      const userEmail = p.userId?.email     || '';
      const label     = `${userName} · $${p.amount}`;
      const appId     = (typeof p.applicationId === 'string'
        ? p.applicationId
        : p.applicationId?._id || ''
      ).slice(-6).toUpperCase() || '—';

      // Quick inline buttons for Pending payments
      let quickBtns = '';
      if (p.paymentStatus === 'Pending') {
        quickBtns = `
          <button class="btn btn-success btn-sm" onclick="quickPayStatus('${p._id}','Verified')">✓ Verify</button>
          <button class="btn btn-danger btn-sm"  onclick="quickPayStatus('${p._id}','Rejected')">✕ Reject</button>`;
      }

      return `
        <tr>
          <td class="font-mono text-xs">${p._id?.slice(-6).toUpperCase()}</td>
          <td>
            <div style="font-weight:600;font-size:0.85rem">${userName}</div>
            <div class="text-xs text-muted">${userEmail}</div>
          </td>
          <td class="font-mono text-xs">${appId}</td>
          <td style="font-weight:700;color:var(--cyan-400)">$${p.amount}</td>
          <td>${p.paymentMethod || '—'}</td>
          <td>${statusBadge(p.paymentStatus)}</td>
          <td>${formatDate(p.createdAt)}</td>
          <td>
            <div class="flex gap-2" style="flex-wrap:wrap">
              ${p.receiptPath
                ? `<a href="${p.receiptPath}" target="_blank" rel="noopener" class="btn btn-ghost btn-sm">📎</a>`
                : ''}
              ${quickBtns}
              <button
                class="btn btn-ghost btn-sm"
                title="Change to any status"
                onclick="openStatusModal('payment','${p._id}','${p.paymentStatus}','${label.replace(/'/g, "\\'")}')"
              >⚙ Status</button>
            </div>
          </td>
        </tr>`;
    }).join('');
  } catch (err) {
    loader?.classList.add('hidden');
    toast('error', 'Failed to load payments', err.message);
  }
}

async function quickPayStatus(id, status) {
  if (!confirm(`Mark payment as "${status}"?`)) return;
  try {
    await window.api.payments.verify(id, { paymentStatus: status });
    toast('success', `Payment ${status}`);
    loadAllPayments();
    loadStats();
  } catch (err) {
    toast('error', 'Verification failed', err.message);
  }
}

/* ══════════════════════════════════════════════════════════
   TEST APPOINTMENTS MANAGEMENT
   ══════════════════════════════════════════════════════════ */
async function loadAllAppointments(filterStatus = '') {
  const tbody  = document.getElementById('all-appts-tbody');
  const loader = document.getElementById('all-appts-loader');
  const empty  = document.getElementById('all-appts-empty');
  if (!tbody) return;

  loader?.classList.remove('hidden');
  empty?.classList.add('hidden');
  tbody.innerHTML = '';

  try {
    const data = await window.api.appointments.allForEmployee();
    let appts  = data?.appointments || data?.data || [];

    if (filterStatus) appts = appts.filter(a =>
      a.appointmentStatus?.toLowerCase() === filterStatus.toLowerCase()
    );

    loader?.classList.add('hidden');
    if (!appts.length) { empty?.classList.remove('hidden'); return; }

    tbody.innerHTML = appts.map(a => `
      <tr>
        <td class="font-mono text-xs">${a._id?.slice(-6).toUpperCase()}</td>
        <td>
          <div style="font-weight:600;font-size:0.85rem">${a.applicantUserId?.fullName || '—'}</div>
        </td>
        <td>${a.testType || '—'}</td>
        <td>${formatDate(a.appointmentDate)}</td>
        <td>${statusBadge(a.appointmentStatus)}</td>
        <td>
          ${a.testResult
            ? `<span class="badge ${a.testResult === 'Pass' ? 'badge-verified' : 'badge-cancelled'}">${a.testResult}</span>`
            : '<span class="text-muted text-xs">—</span>'}
        </td>
        <td>
          <div class="flex gap-2" style="flex-wrap:wrap">
            ${a.appointmentStatus === 'Pending' ? `
              <button class="btn btn-success btn-sm" onclick="reviewAppointment('${a._id}','Confirmed')">✓ Confirm</button>
              <button class="btn btn-danger btn-sm"  onclick="reviewAppointment('${a._id}','Cancelled')">✕ Cancel</button>` : ''}
            ${a.appointmentStatus === 'Confirmed' && !a.testResult ? `
              <button class="btn btn-primary btn-sm" onclick="openResultModal('${a._id}')">📝 Log Result</button>` : ''}
            ${a.appointmentStatus === 'Cancelled' ? `
              <button class="btn btn-ghost btn-sm" onclick="reviewAppointment('${a._id}','Confirmed')">↺ Reinstate</button>` : ''}
          </div>
        </td>
      </tr>`).join('');
  } catch (err) {
    loader?.classList.add('hidden');
    toast('error', 'Failed to load appointments', err.message);
  }
}

async function reviewAppointment(id, status) {
  if (!confirm(`Set appointment to "${status}"?`)) return;
  try {
    await window.api.appointments.review(id, { appointmentStatus: status });
    toast('success', `Appointment ${status}`);
    loadAllAppointments();
    loadStats();
  } catch (err) {
    toast('error', 'Review failed', err.message);
  }
}

function openResultModal(id) {
  document.getElementById('result-appt-id').value = id;
  // Reset selection UI
  document.getElementById('result-value').value = '';
  ['result-pass-card', 'result-fail-card'].forEach(cardId => {
    const card = document.getElementById(cardId);
    if (card) {
      card.style.borderColor = 'var(--glass-border)';
      card.style.background  = cardId.includes('pass') ? 'rgba(16,185,129,0.05)' : 'rgba(239,68,68,0.05)';
      card.style.boxShadow   = 'none';
    }
  });
  openModal('modal-test-result');
}

async function submitTestResult(e) {
  e.preventDefault();
  const btn    = document.getElementById('submit-result-btn');
  const id     = document.getElementById('result-appt-id')?.value;
  const result = document.getElementById('result-value')?.value;
  const notes  = document.getElementById('result-notes')?.value.trim();

  if (!result) { toast('warning', 'Select a result', 'Click Pass or Fail before submitting.'); return; }

  btn.classList.add('btn-loading');
  btn.disabled = true;
  try {
    await window.api.appointments.result(id, { testResult: result, notes });
    toast('success', `Result logged: ${result}`);
    closeModal('modal-test-result');
    loadAllAppointments();
    document.getElementById('test-result-form')?.reset();
  } catch (err) {
    toast('error', 'Failed to log result', err.message);
  } finally {
    btn.classList.remove('btn-loading');
    btn.disabled = false;
  }
}

/* ══════════════════════════════════════════════════════════
   LICENSES MANAGEMENT
   ══════════════════════════════════════════════════════════ */
async function loadAllLicenses() {
  const tbody  = document.getElementById('all-licenses-tbody');
  const loader = document.getElementById('all-licenses-loader');
  const empty  = document.getElementById('all-licenses-empty');
  if (!tbody) return;

  loader?.classList.remove('hidden');
  empty?.classList.add('hidden');
  tbody.innerHTML = '';

  try {
    const data     = await window.api.licenses.getAll();
    const licenses = data?.licenses || data?.data || [];

    loader?.classList.add('hidden');
    if (!licenses.length) { empty?.classList.remove('hidden'); return; }

    tbody.innerHTML = licenses.map(lic => `
      <tr>
        <td class="font-mono text-xs">${lic._id?.slice(-8).toUpperCase()}</td>
        <td>
          <div style="font-weight:600;font-size:0.85rem">${lic.userId?.fullName || '—'}</div>
          <div class="text-xs text-muted">${lic.userId?.nationalNumber || ''}</div>
        </td>
        <td>${lic.licenseClass?.className || '—'}</td>
        <td>${formatDate(lic.issueDate)}</td>
        <td style="color:var(--cyan-400)">${formatDate(lic.expiryDate)}</td>
        <td>${statusBadge(lic.licenseStatus || 'Active')}</td>
        <td>
          <div class="flex gap-2">
            ${lic.licenseStatus !== 'Suspended'
              ? `<button class="btn btn-danger btn-sm"  onclick="updateLicenseStatus('${lic._id}','Suspended')">⊘ Suspend</button>`
              : `<button class="btn btn-success btn-sm" onclick="updateLicenseStatus('${lic._id}','Active')">↺ Restore</button>`}
            ${lic.licenseStatus === 'Active'
              ? `<button class="btn btn-ghost btn-sm" onclick="updateLicenseStatus('${lic._id}','Expired')">⏰ Expire</button>`
              : ''}
          </div>
        </td>
      </tr>`).join('');
  } catch (err) {
    loader?.classList.add('hidden');
    toast('error', 'Failed to load licenses', err.message);
  }
}

async function updateLicenseStatus(id, status) {
  if (!confirm(`Set license to "${status}"?`)) return;
  try {
    await window.api.licenses.updateStatus(id, { licenseStatus: status });
    toast('success', `License ${status}`);
    loadAllLicenses();
  } catch (err) {
    toast('error', 'Failed to update license', err.message);
  }
}

/* ══════════════════════════════════════════════════════════
   LOGOUT
   ══════════════════════════════════════════════════════════ */
async function logout() {
  try { await window.api.auth.logout(); } catch { /* ignore */ }
  window.location.replace('./login.html');
}

/* ══════════════════════════════════════════════════════════
   MAIN INIT
   ══════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', async () => {
  if (!window.location.pathname.includes('admin')) return;

  const ok = await requireAdminAuth();
  if (!ok) return;

  // Hide page loader
  document.getElementById('page-loader')?.classList.add('hidden');

  // Admin identity
  const nameEl = document.getElementById('admin-name');
  const roleEl = document.getElementById('admin-role');
  if (nameEl) nameEl.textContent = adminUser.fullName?.split(' ')[0] || 'Admin';
  if (roleEl) roleEl.textContent = adminUser.role
    ? adminUser.role.charAt(0).toUpperCase() + adminUser.role.slice(1)
    : '—';

  // ── Sidebar navigation ──────────────────────────────── //
  document.querySelectorAll('.sidebar-item').forEach(item => {
    item.addEventListener('click', () => {
      const sec = item.dataset.section;
      if (!sec) return;
      showSection(sec);
      if (sec === 'section-stats')        loadStats();
      if (sec === 'section-applications') loadAllApplications();
      if (sec === 'section-payments')     loadAllPayments();
      if (sec === 'section-appointments') loadAllAppointments();
      if (sec === 'section-licenses')     loadAllLicenses();
    });
  });

  // Mobile sidebar toggle
  document.getElementById('sidebar-toggle')?.addEventListener('click', () => {
    document.getElementById('sidebar')?.classList.toggle('open');
  });

  // Sidebar logout mirrors top-bar logout
  document.getElementById('sidebar-logout')?.addEventListener('click', logout);

  // ── Default view ────────────────────────────────────── //
  showSection('section-stats');
  loadStats();

  // Auto-refresh stats every 30 s
  statsRefreshInterval = setInterval(loadStats, 30_000);
  window.addEventListener('beforeunload', () => clearInterval(statsRefreshInterval));

  // ── Refresh button ───────────────────────────────────── //
  document.getElementById('refresh-stats-btn')?.addEventListener('click', () => {
    loadStats();
    toast('info', 'Stats refreshed');
  });

  // ── Filter controls ──────────────────────────────────── //
  document.getElementById('filter-apps')?.addEventListener('change',
    e => loadAllApplications(e.target.value));
  document.getElementById('filter-payments')?.addEventListener('change',
    e => loadAllPayments(e.target.value));
  document.getElementById('filter-appts')?.addEventListener('change',
    e => loadAllAppointments(e.target.value));

  // ── Universal modal close (overlay click + [data-close-modal]) ── //
  document.querySelectorAll('[data-close-modal]').forEach(btn => {
    btn.addEventListener('click', () => closeModal(btn.dataset.closeModal));
  });
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => {
      if (e.target === overlay) overlay.classList.remove('open');
    });
  });

  // ── Status-change modal confirm ──────────────────────── //
  document.getElementById('status-modal-confirm-btn')
    ?.addEventListener('click', applyStatusChange);

  // ── Test result form ─────────────────────────────────── //
  document.getElementById('test-result-form')
    ?.addEventListener('submit', submitTestResult);

  // ── Logout ───────────────────────────────────────────── //
  document.getElementById('logout-btn')?.addEventListener('click', logout);
});
