/**
 * GovDrive-Core  ·  Citizen Dashboard Module
 * Handles dashboard.html  — profile, applications,
 * payments, test appointments, licenses.
 * Depends on: api.js (window.api)
 */

/* ══════════════════════════════════════════════════════════
   SHARED UTILITIES
   ══════════════════════════════════════════════════════════ */

let currentUser = null;

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
    New:       'badge-new',
    Pending:   'badge-pending',
    Confirmed: 'badge-confirmed',
    Approved:  'badge-approved',
    Completed: 'badge-completed',
    Cancelled: 'badge-cancelled',
    Rejected:  'badge-rejected',
    Verified:  'badge-verified',
    Active:    'badge-active',
    Expired:   'badge-cancelled',
    Suspended: 'badge-cancelled',
  };
  const cls = map[status] || 'badge-pending';
  return `<span class="badge ${cls}">${status || '—'}</span>`;
}

function showSection(id) {
  document.querySelectorAll('.dash-section').forEach(s => s.classList.add('hidden'));
  const target = document.getElementById(id);
  if (target) target.classList.remove('hidden');

  document.querySelectorAll('.sidebar-item').forEach(item => {
    item.classList.toggle('active', item.dataset.section === id);
  });
}

function openModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add('open');
}
function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('open');
}

/* ══════════════════════════════════════════════════════════
   AUTH GUARD
   ══════════════════════════════════════════════════════════ */
async function requireAuth() {
  try {
    const data = await window.api.auth.profile();
    currentUser = data?.user || data?.data;
    if (!currentUser) throw new Error('No profile');

    // Employees/admins go to admin panel
    if (currentUser.role === 'admin' || currentUser.role === 'employee') {
      window.location.replace('./admin.html');
      return false;
    }
    return true;
  } catch {
    window.location.replace('./login.html');
    return false;
  }
}

/* ══════════════════════════════════════════════════════════
   PROFILE SECTION
   ══════════════════════════════════════════════════════════ */
function renderProfile(user) {
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val || '—'; };
  set('profile-name',       user.fullName);
  set('profile-national',   user.nationalNumber);
  set('profile-email',      user.email);
  set('profile-phone',      user.phone);
  set('profile-address',    user.address);
  set('profile-nationality',user.nationality);
  set('profile-dob',        formatDate(user.birthDate));
  set('profile-role',       user.role);
  set('navbar-username',    user.fullName?.split(' ')[0]);

  const avatar = document.getElementById('profile-avatar');
  if (avatar) {
    if (user.photoPath) {
      avatar.innerHTML = `<img src="${user.photoPath}" alt="avatar" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;
    } else {
      avatar.textContent = user.fullName?.[0]?.toUpperCase() || '?';
    }
  }
}

/* ══════════════════════════════════════════════════════════
   APPLICATIONS SECTION
   ══════════════════════════════════════════════════════════ */
async function loadApplications() {
  const tbody  = document.getElementById('applications-tbody');
  const loader = document.getElementById('applications-loader');
  const empty  = document.getElementById('applications-empty');
  if (!tbody) return;

  loader?.classList.remove('hidden');
  try {
    const data = await window.api.applications.getAll();
    const apps = data?.applications || data?.data || [];

    loader?.classList.add('hidden');
    if (!apps.length) { empty?.classList.remove('hidden'); return; }
    empty?.classList.add('hidden');

    tbody.innerHTML = apps.map(app => `
      <tr>
        <td class="font-mono text-xs">${app._id?.slice(-6).toUpperCase()}</td>
        <td>${app.applicationType?.replace(/_/g,' ') || '—'}</td>
        <td>${statusBadge(app.applicationStatus)}</td>
        <td>$${app.paidFees ?? '—'}</td>
        <td>${formatDate(app.createdAt)}</td>
        <td>
          <button class="btn btn-ghost btn-sm" onclick="viewApplicationDetails('${app._id}')">
            🔍 Details
          </button>
          ${app.applicationStatus === 'New' ? `
          <button class="btn btn-danger btn-sm" onclick="cancelApplication('${app._id}')">
            ✕ Cancel
          </button>` : ''}
        </td>
      </tr>`).join('');
  } catch (err) {
    loader?.classList.add('hidden');
    toast('error', 'Failed to load applications', err.message);
  }
}

async function viewApplicationDetails(id) {
  try {
    const data    = await window.api.applications.getDetails(id);
    const details = data?.application || data?.data || {};
    const appts   = details?.appointments || [];

    const body = document.getElementById('app-details-body');
    if (!body) return;

    body.innerHTML = `
      <div class="form-group">
        <span class="form-label">Application ID</span>
        <span class="font-mono text-sm">${details._id || id}</span>
      </div>
      <div class="form-group">
        <span class="form-label">Type</span>
        <span>${details.applicationType?.replace(/_/g,' ') || '—'}</span>
      </div>
      <div class="form-group">
        <span class="form-label">Status</span>
        ${statusBadge(details.applicationStatus)}
      </div>
      <div class="form-group">
        <span class="form-label">Fees Paid</span>
        <span>$${details.paidFees ?? '—'}</span>
      </div>
      <div class="form-group">
        <span class="form-label">Created</span>
        <span>${formatDate(details.createdAt)}</span>
      </div>
      ${appts.length ? `
      <div class="border-top mt-4">
        <p class="form-label mb-4">Test Journey</p>
        <div class="timeline">
          ${appts.map(a => `
            <div class="timeline-item">
              <div class="timeline-dot ${a.testResult === 'Pass' ? 'passed' : a.testResult === 'Fail' ? 'failed' : 'pending'}"></div>
              <div class="timeline-content">
                <div class="timeline-title">${a.testType || 'Test'} — ${statusBadge(a.appointmentStatus)}</div>
                <div class="timeline-meta">${formatDate(a.appointmentDate)} · Result: ${a.testResult || 'Pending'}</div>
              </div>
            </div>`).join('')}
        </div>
      </div>` : ''}`;

    openModal('modal-app-details');
  } catch (err) {
    toast('error', 'Could not load details', err.message);
  }
}

async function cancelApplication(id) {
  if (!confirm('Cancel this application? This cannot be undone.')) return;
  try {
    await window.api.applications.cancel(id);
    toast('success', 'Application Cancelled');
    loadApplications();
  } catch (err) {
    toast('error', 'Cancel Failed', err.message);
  }
}

/* ── New Application form ─────────────────────────────── */
async function loadLicenseClasses() {
  const sel = document.getElementById('app-licenseClass');
  if (!sel) return;
  try {
    const data    = await window.api.licenseClasses.getAll();
    const classes = data?.licenseClasses || data?.data || [];
    sel.innerHTML = `<option value="">— Select Class —</option>` +
      classes.map(c => `<option value="${c._id}">${c.className || c.name} (${c.description || ''})</option>`).join('');
  } catch {
    sel.innerHTML = '<option value="">Could not load classes</option>';
  }
}

async function submitNewApplication(e) {
  e.preventDefault();
  const btn  = document.getElementById('submit-app-btn');
  const type = document.getElementById('app-type')?.value;
  const fees = parseFloat(document.getElementById('app-fees')?.value);
  const lcId = document.getElementById('app-licenseClass')?.value;

  if (!type) { toast('warning', 'Select application type'); return; }
  if (!fees || fees <= 0) { toast('warning', 'Enter valid fees'); return; }

  const body = { applicationType: type, paidFees: fees };
  if (lcId) body.licenseClassId = lcId;

  btn.classList.add('btn-loading'); btn.disabled = true;
  try {
    let handler = window.api.applications.create;
    if (type === 'RENEW_LICENSE')        handler = window.api.applications.createRenewal;
    if (type.startsWith('REPLACEMENT'))  handler = window.api.applications.createReplacement;

    await handler(body);
    toast('success', 'Application Submitted!');
    closeModal('modal-new-app');
    loadApplications();
    document.getElementById('new-app-form')?.reset();
  } catch (err) {
    toast('error', 'Submission Failed', err.message);
  } finally {
    btn.classList.remove('btn-loading'); btn.disabled = false;
  }
}

/* ══════════════════════════════════════════════════════════
   PAYMENTS SECTION
   ══════════════════════════════════════════════════════════ */
async function loadPayments() {
  const tbody  = document.getElementById('payments-tbody');
  const loader = document.getElementById('payments-loader');
  const empty  = document.getElementById('payments-empty');
  if (!tbody) return;

  loader?.classList.remove('hidden');
  try {
    const data     = await window.api.payments.mine();
    const payments = data?.payments || data?.data || [];

    loader?.classList.add('hidden');
    if (!payments.length) { empty?.classList.remove('hidden'); return; }
    empty?.classList.add('hidden');

    tbody.innerHTML = payments.map(p => `
      <tr>
        <td class="font-mono text-xs">${p._id?.slice(-6).toUpperCase()}</td>
        <td class="font-mono text-xs">${p.applicationId?._id?.slice(-6).toUpperCase() || p.applicationId?.slice(-6).toUpperCase() || '—'}</td>
        <td>$${p.amount}</td>
        <td>${p.paymentMethod || '—'}</td>
        <td>${statusBadge(p.paymentStatus)}</td>
        <td>${formatDate(p.createdAt)}</td>
        <td>${p.receiptPath ? `<a href="${p.receiptPath}" target="_blank" class="btn btn-ghost btn-sm">📎 Receipt</a>` : '—'}</td>
      </tr>`).join('');
  } catch (err) {
    loader?.classList.add('hidden');
    toast('error', 'Failed to load payments', err.message);
  }
}

async function submitPayment(e) {
  e.preventDefault();
  const btn   = document.getElementById('submit-payment-btn');
  const appId = document.getElementById('pay-applicationId')?.value.trim();
  const amount= parseFloat(document.getElementById('pay-amount')?.value);
  const method= document.getElementById('pay-method')?.value;
  const file  = document.getElementById('pay-receipt')?.files[0];

  if (!appId)  { toast('warning', 'Enter Application ID'); return; }
  if (!amount) { toast('warning', 'Enter amount'); return; }

  let receiptPath;
  if (file) {
    try {
      const fd = new FormData(); fd.append('file', file);
      const up = await window.api.uploads.local(fd);
      receiptPath = up?.filePath || up?.url || up?.data?.path;
    } catch {
      toast('warning', 'Receipt upload failed — submitting without it');
    }
  }

  btn.classList.add('btn-loading'); btn.disabled = true;
  try {
    const body = { applicationId: appId, amount, paymentMethod: method };
    if (receiptPath) body.receiptPath = receiptPath;
    await window.api.payments.create(body);
    toast('success', 'Payment Submitted!', 'Waiting for employee verification.');
    closeModal('modal-new-payment');
    loadPayments();
    document.getElementById('new-payment-form')?.reset();
  } catch (err) {
    toast('error', 'Payment Failed', err.message);
  } finally {
    btn.classList.remove('btn-loading'); btn.disabled = false;
  }
}

/* ══════════════════════════════════════════════════════════
   TEST APPOINTMENTS SECTION
   ══════════════════════════════════════════════════════════ */
async function loadMyAppointments() {
  const wrap   = document.getElementById('appointments-wrap');
  const loader = document.getElementById('appointments-loader-2');
  const empty  = document.getElementById('appointments-empty-2');
  if (!wrap) return;

  loader?.classList.remove('hidden');
  try {
    // Fetch all user applications first, then their appointments
    const appsData = await window.api.applications.getAll();
    const apps     = appsData?.applications || appsData?.data || [];

    const allAppts = [];
    await Promise.all(apps.slice(0,10).map(async app => {
      try {
        const d = await window.api.appointments.byApplication(app._id);
        const appts = d?.appointments || d?.data || [];
        appts.forEach(a => allAppts.push({ ...a, _appType: app.applicationType }));
      } catch { /* no appts for this app */ }
    }));

    loader?.classList.add('hidden');
    if (!allAppts.length) { empty?.classList.remove('hidden'); return; }
    empty?.classList.add('hidden');

    wrap.innerHTML = allAppts.map(a => `
      <div class="glass p-4 animate-fadeIn" style="margin-bottom:0.75rem">
        <div class="flex items-center justify-between">
          <div>
            <span class="font-mono text-xs text-muted">${a._id?.slice(-6).toUpperCase()}</span>
            <h4 style="font-size:0.95rem;font-weight:600;margin-top:4px">${a.testType || 'Test'}</h4>
            <p class="text-sm text-secondary">${formatDate(a.appointmentDate)}</p>
            ${a._appType ? `<p class="text-xs text-muted">${a._appType.replace(/_/g,' ')}</p>` : ''}
          </div>
          <div class="flex-col items-center gap-2" style="text-align:right">
            ${statusBadge(a.appointmentStatus)}
            <span style="margin-top:6px;display:block" class="text-xs ${a.testResult === 'Pass' ? 'text-success' : a.testResult === 'Fail' ? 'text-danger' : 'text-muted'}">
              ${a.testResult ? `Result: ${a.testResult}` : 'Awaiting result'}
            </span>
          </div>
        </div>
        ${a.appointmentStatus === 'Pending' ? `
        <div class="flex gap-2 mt-4 border-top">
          <button class="btn btn-danger btn-sm" onclick="cancelAppointment('${a._id}')">✕ Cancel</button>
          <button class="btn btn-ghost btn-sm" onclick="openReschedule('${a._id}')">📅 Reschedule</button>
        </div>` : ''}
      </div>`).join('');
  } catch (err) {
    loader?.classList.add('hidden');
    toast('error', 'Failed to load appointments', err.message);
  }
}

async function cancelAppointment(id) {
  if (!confirm('Cancel this appointment?')) return;
  try {
    await window.api.appointments.cancel(id);
    toast('success', 'Appointment Cancelled');
    loadMyAppointments();
  } catch (err) {
    toast('error', 'Failed to cancel', err.message);
  }
}

function openReschedule(id) {
  document.getElementById('reschedule-id').value = id;
  openModal('modal-reschedule');
}

async function submitReschedule(e) {
  e.preventDefault();
  const id   = document.getElementById('reschedule-id')?.value;
  const date = document.getElementById('reschedule-date')?.value;
  if (!date) { toast('warning', 'Select a new date'); return; }
  try {
    await window.api.appointments.reschedule(id, { appointmentDate: date });
    toast('success', 'Rescheduled!');
    closeModal('modal-reschedule');
    loadMyAppointments();
  } catch (err) {
    toast('error', 'Reschedule failed', err.message);
  }
}

async function submitNewAppointment(e) {
  e.preventDefault();
  const btn   = document.getElementById('submit-appt-btn');
  const appId = document.getElementById('appt-applicationId')?.value.trim();
  const type  = document.getElementById('appt-type')?.value;
  const date  = document.getElementById('appt-date')?.value;

  if (!appId) { toast('warning', 'Enter Application ID'); return; }
  if (!type)  { toast('warning', 'Select test type');    return; }
  if (!date)  { toast('warning', 'Pick a date');         return; }

  btn.classList.add('btn-loading'); btn.disabled = true;
  try {
    await window.api.appointments.request({ applicationId: appId, testType: type, appointmentDate: date });
    toast('success', 'Appointment Requested!', 'An employee will confirm it shortly.');
    closeModal('modal-new-appt');
    loadMyAppointments();
    document.getElementById('new-appt-form')?.reset();
  } catch (err) {
    toast('error', 'Request Failed', err.message);
  } finally {
    btn.classList.remove('btn-loading'); btn.disabled = false;
  }
}

/* ══════════════════════════════════════════════════════════
   LICENSES SECTION
   ══════════════════════════════════════════════════════════ */
async function loadMyLicenses() {
  const wrap   = document.getElementById('licenses-wrap');
  const loader = document.getElementById('licenses-loader');
  const empty  = document.getElementById('licenses-empty');
  if (!wrap) return;

  loader?.classList.remove('hidden');
  try {
    const data     = await window.api.licenses.mine();
    const licenses = data?.licenses || data?.data || [];

    loader?.classList.add('hidden');
    if (!licenses.length) { empty?.classList.remove('hidden'); return; }
    empty?.classList.add('hidden');

    wrap.innerHTML = licenses.map(lic => `
      <div class="glass p-6 animate-fadeIn">
        <div class="flex items-center justify-between" style="margin-bottom:1rem">
          <div>
            <h3 style="font-size:1.1rem;font-weight:700">${lic.licenseClass?.className || lic.licenseClassId || 'License'}</h3>
            <p class="font-mono text-xs text-muted" style="margin-top:4px">ID: ${lic._id?.slice(-8).toUpperCase()}</p>
          </div>
          ${statusBadge(lic.licenseStatus || 'Active')}
        </div>
        <div class="grid-2" style="gap:0.75rem;font-size:0.85rem">
          <div>
            <p class="text-muted text-xs">Issued</p>
            <p style="font-weight:600">${formatDate(lic.issueDate)}</p>
          </div>
          <div>
            <p class="text-muted text-xs">Expires</p>
            <p style="font-weight:600;color:var(--cyan-400)">${formatDate(lic.expiryDate)}</p>
          </div>
        </div>
      </div>`).join('');
  } catch (err) {
    loader?.classList.add('hidden');
    toast('error', 'Failed to load licenses', err.message);
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
  if (window.location.pathname.includes('dashboard')) {
    const ok = await requireAuth();
    if (!ok) return;

    // Hide loader
    const loader = document.getElementById('page-loader');
    if (loader) { loader.classList.add('hidden'); }

    // Render profile
    renderProfile(currentUser);

    // Sidebar navigation
    document.querySelectorAll('.sidebar-item').forEach(item => {
      item.addEventListener('click', () => {
        const sec = item.dataset.section;
        if (!sec) return;
        showSection(sec);
        if (sec === 'section-applications') loadApplications();
        if (sec === 'section-payments')     loadPayments();
        if (sec === 'section-appointments') loadMyAppointments();
        if (sec === 'section-licenses')     loadMyLicenses();
      });
    });

    // Mobile sidebar toggle
    document.getElementById('sidebar-toggle')?.addEventListener('click', () => {
      document.getElementById('sidebar')?.classList.toggle('open');
    });

    // Default section
    showSection('section-profile');

    // Modal close buttons
    document.querySelectorAll('[data-close-modal]').forEach(btn => {
      btn.addEventListener('click', () => closeModal(btn.dataset.closeModal));
    });
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.classList.remove('open');
      });
    });

    // New application modal open
    document.getElementById('btn-new-app')?.addEventListener('click', () => {
      loadLicenseClasses();
      openModal('modal-new-app');
    });
    document.getElementById('new-app-form')?.addEventListener('submit', submitNewApplication);

    // New payment modal
    document.getElementById('btn-new-payment')?.addEventListener('click', () => openModal('modal-new-payment'));
    document.getElementById('new-payment-form')?.addEventListener('submit', submitPayment);

    // New appointment modal
    document.getElementById('btn-new-appt')?.addEventListener('click', () => openModal('modal-new-appt'));
    document.getElementById('new-appt-form')?.addEventListener('submit', submitNewAppointment);

    // Reschedule form
    document.getElementById('reschedule-form')?.addEventListener('submit', submitReschedule);

    // Logout
    document.getElementById('logout-btn')?.addEventListener('click', logout);
  }
});
