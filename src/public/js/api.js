/**
 * GovDrive-Core  ·  Centralized API Client
 * All requests include credentials:'include' so the browser
 * sends the HttpOnly JWT cookies automatically.
 */

const BASE = '/api/v1';

/**
 * Core fetch wrapper.
 * @param {string} path   – e.g. '/auth/login'
 * @param {object} opts   – fetch options (method, body, etc.)
 * @returns {Promise<any>} parsed JSON response
 */
async function request(path, opts = {}) {
  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };

  // Don't set Content-Type for FormData (browser sets it with boundary)
  if (opts.body instanceof FormData) delete headers['Content-Type'];

  const res = await fetch(`${BASE}${path}`, {
    credentials: 'include',
    ...opts,
    headers,
  });

  let data;
  try {
    data = await res.json();
  } catch {
    data = {};
  }

  if (!res.ok) {
    const err = new Error(data?.message || `HTTP ${res.status}`);
    err.status = res.status;
    err.data   = data;
    throw err;
  }

  return data;
}

/* ── Convenience helpers ─────────────────────────────────── */
const api = {
  get:    (path, opts = {})       => request(path, { method: 'GET',    ...opts }),
  post:   (path, body, opts = {}) => request(path, { method: 'POST',   body: body instanceof FormData ? body : JSON.stringify(body), ...opts }),
  put:    (path, body, opts = {}) => request(path, { method: 'PUT',    body: JSON.stringify(body), ...opts }),
  patch:  (path, body, opts = {}) => request(path, { method: 'PATCH',  body: JSON.stringify(body), ...opts }),
  delete: (path, opts = {})       => request(path, { method: 'DELETE', ...opts }),

  /* ── Auth ──────────────────────────────────────────────── */
  auth: {
    signup:       (body) => api.post('/auth/signup',  body),
    login:        (body) => api.post('/auth/login',   body),
    logout:       ()     => api.post('/auth/logout',  {}),
    profile:      ()     => api.get ('/auth/profile'),
    refreshToken: ()     => api.put ('/auth/refresh_Token', {}),
  },

  /* ── Applications ──────────────────────────────────────── */
  applications: {
    create:      (body) => api.post('/Applications',              body),
    getAll:      ()     => api.get ('/Applications'),
    getById:     (id)   => api.get (`/Applications/${id}`),
    getDetails:  (id)   => api.get (`/Applications/${id}/details`),
    updateStatus:(id, body) => api.put(`/Applications/${id}/status`, body),
    cancel:      (id)   => api.patch(`/Applications/${id}/cancel`, {}),
    createRenewal:     (body) => api.post('/Applications/renew',       body),
    createReplacement: (body) => api.post('/Applications/replacement', body),
  },

  /* ── Payments ──────────────────────────────────────────── */
  payments: {
    create:       (body) => api.post('/payments',                    body),
    mine:         ()     => api.get ('/payments/my-payments'),
    allForEmployee:()    => api.get ('/payments/employee/all'),
    verify:       (id, body) => api.patch(`/payments/employee/${id}/verify`, body),
  },

  /* ── Test Appointments ─────────────────────────────────── */
  appointments: {
    request:        (body)       => api.post('/TestAppointments/request',               body),
    review:         (id, body)   => api.patch(`/TestAppointments/${id}/review`,         body),
    result:         (id, body)   => api.patch(`/TestAppointments/${id}/result`,         body),
    byApplication:  (appId)      => api.get  (`/TestAppointments/application/${appId}`),
    allForEmployee: ()           => api.get  ('/TestAppointments/employee/all'),
    cancel:         (id)         => api.patch(`/TestAppointments/${id}/cancel`,         {}),
    reschedule:     (id, body)   => api.patch(`/TestAppointments/${id}/reschedule`,     body),
  },

  /* ── Licenses ──────────────────────────────────────────── */
  licenses: {
    mine:         ()       => api.get('/licenses/my-licenses'),
    getAll:       ()       => api.get('/licenses'),
    getById:      (id)     => api.get(`/licenses/${id}`),
    updateStatus: (id, body) => api.patch(`/licenses/${id}/status`, body),
  },

  /* ── License Classes ───────────────────────────────────── */
  licenseClasses: {
    getAll: () => api.get('/LicenseClasses'),
  },

  /* ── Admin ─────────────────────────────────────────────── */
  admin: {
    stats: () => api.get('/admin/dashboard/stats'),
  },

  /* ── Uploads ───────────────────────────────────────────── */
  uploads: {
    local: (formData) => api.post('/uploads/local', formData),
  },

  /* ── Health ────────────────────────────────────────────── */
  health: () => api.get('/health'),
};

// Expose globally
window.api = api;
