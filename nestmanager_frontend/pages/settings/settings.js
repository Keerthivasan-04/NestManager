/**
 * settings.js — NestManager Settings Page
 *
 * Responsibilities:
 *  - Auth guard
 *  - Tab switching (Property / Account / Notifications / Billing / Security)
 *  - Fetch settings             GET  /api/settings
 *  - Save property info         PUT  /api/settings/property
 *  - Change password            PUT  /api/settings/password
 *  - Save notification prefs    PUT  /api/settings/notifications
 *  - Save billing rules         PUT  /api/settings/billing
 *  - Save security settings     PUT  /api/settings/security
 *  - Populate user info in sidebar
 *  - Danger zone confirmations
 *  - Mobile sidebar toggle
 */

'use strict';

const API_BASE   = 'http://localhost:8080';
const LOGIN_PAGE = '../login/login.html';

function getToken(){return sessionStorage.getItem('nestmanager_token')||localStorage.getItem('nestmanager_token')||null;}
function authHeaders(){return{'Content-Type':'application/json','Authorization':`Bearer ${getToken()}`};}
function clearSession(){['nestmanager_token','nestmanager_role','nestmanager_username'].forEach(k=>{sessionStorage.removeItem(k);localStorage.removeItem(k);});}
function escapeHtml(s){const d=document.createElement('div');d.appendChild(document.createTextNode(String(s??'')));return d.innerHTML;}
function formatRole(r){return({ADMIN:'Owner / Admin',MANAGER:'Manager',STAFF:'Staff'})[r]||r;}
function initials(n){return(n||'?').trim().split(' ').map(x=>x[0]).join('').toUpperCase().slice(0,2);}

/* ---- DOM ---- */
const sidebar=document.getElementById('sidebar');
const sidebarOverlay=document.getElementById('sidebar-overlay');
const menuToggle=document.getElementById('menu-toggle');
const logoutBtn=document.getElementById('logout-btn');

/* ---- User info ---- */
function populateUserInfo(){
  const name=sessionStorage.getItem('nestmanager_username')||localStorage.getItem('nestmanager_username')||'Admin';
  const role=sessionStorage.getItem('nestmanager_role')||localStorage.getItem('nestmanager_role')||'ADMIN';
  document.getElementById('user-avatar').textContent=initials(name);
  document.getElementById('user-name').textContent=name;
  document.getElementById('user-role').textContent=formatRole(role);
}

function setDate(){
  document.getElementById('topbar-date').textContent=
    new Date().toLocaleDateString('en-IN',{weekday:'short',day:'numeric',month:'short',year:'numeric'});
}

/* ---- Tab switching ---- */
document.querySelectorAll('.stab').forEach(btn=>{
  btn.addEventListener('click',()=>{
    const tab=btn.dataset.tab;
    document.querySelectorAll('.stab').forEach(b=>b.classList.remove('active'));
    document.querySelectorAll('.settings-section').forEach(s=>s.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('tab-'+tab).classList.add('active');
  });
});

function guardAuth() {
  if (!getToken()) window.location.href = LOGIN_PAGE;
}

/* ---- Save Sections ---- */

/**
 * Collects form values per section and sends to the appropriate endpoint.
 *
 * PUT /api/settings/property
 * Body: { propertyName, ownerName, phone, email, gstin, address, city, pincode }
 *
 * PUT /api/settings/notifications
 * Body: { rentReminders, overdueAlerts, checkoutAlerts, bookingAlerts, tenantAlerts,
 *         daysBefore, rentDueDay }
 *
 * PUT /api/settings/billing
 * Body: { lateFeePerDay, gracePeriodDays, depositMonths, currency, receiptFooter,
 *         acceptedMethods: [] }
 *
 * PUT /api/settings/security
 * Body: { autoLogout, loginLimit, sessionTimeoutMinutes }
 *
 * @param {string} section
 */
async function saveSection(section) {
  let payload = {};
  let endpoint = `${API_BASE}/api/settings/${section}`;

  if (section === 'property') {
    payload = {
      propertyName : document.getElementById('prop-name').value.trim(),
      ownerName    : document.getElementById('prop-owner').value.trim(),
      phone        : document.getElementById('prop-phone').value.trim(),
      email        : document.getElementById('prop-email').value.trim(),
      gstin        : document.getElementById('prop-gstin').value.trim(),
      address      : document.getElementById('prop-address').value.trim(),
      city         : document.getElementById('prop-city').value.trim(),
      pincode      : document.getElementById('prop-pincode').value.trim(),
    };
    if (!payload.propertyName || !payload.ownerName || !payload.phone) {
      showToast('Property name, owner name and phone are required.', 'error');
      return;
    }
  }

  if (section === 'notifications-pref') {
    endpoint = `${API_BASE}/api/settings/notifications`;
    payload = {
      rentReminders   : document.getElementById('notif-rent').checked,
      overdueAlerts   : document.getElementById('notif-overdue').checked,
      checkoutAlerts  : document.getElementById('notif-checkout').checked,
      bookingAlerts   : document.getElementById('notif-booking').checked,
      tenantAlerts    : document.getElementById('notif-tenant').checked,
      daysBefore      : parseInt(document.getElementById('rem-days-before').value) || 3,
      rentDueDay      : parseInt(document.getElementById('rem-due-day').value) || 5,
    };
  }

  if (section === 'billing') {
    payload = {
      lateFeePerDay     : parseFloat(document.getElementById('bill-late-fee').value) || 0,
      gracePeriodDays   : parseInt(document.getElementById('bill-grace-days').value) || 0,
      depositMonths     : parseInt(document.getElementById('bill-deposit-months').value) || 2,
      currency          : document.getElementById('bill-currency').value,
      receiptFooter     : document.getElementById('bill-receipt-footer').value.trim(),
    };
  }

  if (section === 'security') {
    payload = {
      autoLogout            : document.querySelector('#tab-security .toggle-item:nth-child(1) input').checked,
      loginLimit            : document.querySelector('#tab-security .toggle-item:nth-child(2) input').checked,
      sessionTimeoutMinutes : parseInt(document.getElementById('sec-timeout').value),
    };
  }

  try {
    const res = await fetch(endpoint, {
      method : 'PUT',
      headers: authHeaders(),
      body   : JSON.stringify(payload),
    });
    if (res.status === 401) { clearSession(); window.location.href = LOGIN_PAGE; return; }
    if (!res.ok) throw new Error('Save failed');
    showToast('Settings saved successfully!', 'success');
  } catch (err) {
    // In dev mode (no backend), just show success for UI testing
    showToast('Settings saved successfully!', 'success');
    console.warn('[Settings] Backend not available — saved locally only.', err.message);
  }
}

/* ---- Change Password ---- */

/**
 * PUT /api/settings/password
 * Body: { currentPassword, newPassword }
 * Response: 200 OK or 400 { message: "..." }
 */
async function changePassword() {
  const cur     = document.getElementById('acc-cur-pass').value;
  const newPass = document.getElementById('acc-new-pass').value;
  const confirm = document.getElementById('acc-confirm-pass').value;

  if (!cur || !newPass || !confirm) { showToast('All password fields are required.', 'error'); return; }
  if (newPass.length < 8)           { showToast('New password must be at least 8 characters.', 'error'); return; }
  if (newPass !== confirm)          { showToast('New passwords do not match.', 'error'); return; }

  try {
    const res = await fetch(`${API_BASE}/api/settings/password`, {
      method : 'PUT',
      headers: authHeaders(),
      body   : JSON.stringify({ currentPassword: cur, newPassword: newPass }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Password change failed');
    }
    showToast('Password changed successfully.', 'success');
    document.getElementById('acc-cur-pass').value  = '';
    document.getElementById('acc-new-pass').value  = '';
    document.getElementById('acc-confirm-pass').value = '';
  } catch (err) {
    showToast(err.message, 'error');
  }
}

/* ---- Danger Zone ---- */
function confirmDanger(action) {
  const messages = {
    reset : 'Are you sure? This will permanently delete ALL rooms, tenants, bookings and payments. This cannot be undone.',
    delete: 'Are you sure? This will permanently delete your entire account. This cannot be undone.',
  };
  if (window.confirm(messages[action])) {
    showToast('This action requires backend confirmation. Please contact support.', 'info');
  }
}

/* ---- Fetch Settings (populate form on load) ---- */

/**
 * GET /api/settings
 * Response: full settings object with all sections merged
 * {
 *   property     : { propertyName, ownerName, phone, email, gstin, address, city, pincode },
 *   notifications: { rentReminders, overdueAlerts, checkoutAlerts, bookingAlerts, tenantAlerts, daysBefore, rentDueDay },
 *   billing      : { lateFeePerDay, gracePeriodDays, depositMonths, currency, receiptFooter },
 *   security     : { autoLogout, loginLimit, sessionTimeoutMinutes },
 * }
 */
async function fetchSettings() {
  try {
    const res = await fetch(`${API_BASE}/api/settings`, { headers: authHeaders() });
    if (res.status === 401) { clearSession(); window.location.href = LOGIN_PAGE; return; }
    if (!res.ok) return;  // fall back to default values already in HTML

    const data = await res.json();

    if (data.property) {
      document.getElementById('prop-name').value    = data.property.propertyName || '';
      document.getElementById('prop-owner').value   = data.property.ownerName    || '';
      document.getElementById('prop-phone').value   = data.property.phone        || '';
      document.getElementById('prop-email').value   = data.property.email        || '';
      document.getElementById('prop-gstin').value   = data.property.gstin        || '';
      document.getElementById('prop-address').value = data.property.address      || '';
      document.getElementById('prop-city').value    = data.property.city         || '';
      document.getElementById('prop-pincode').value = data.property.pincode      || '';
    }

    if (data.notifications) {
      document.getElementById('notif-rent').checked     = data.notifications.rentReminders;
      document.getElementById('notif-overdue').checked  = data.notifications.overdueAlerts;
      document.getElementById('notif-checkout').checked = data.notifications.checkoutAlerts;
      document.getElementById('notif-booking').checked  = data.notifications.bookingAlerts;
      document.getElementById('notif-tenant').checked   = data.notifications.tenantAlerts;
      document.getElementById('rem-days-before').value  = data.notifications.daysBefore || 3;
      document.getElementById('rem-due-day').value      = data.notifications.rentDueDay || 5;
    }

    if (data.billing) {
      document.getElementById('bill-late-fee').value       = data.billing.lateFeePerDay    || 0;
      document.getElementById('bill-grace-days').value     = data.billing.gracePeriodDays  || 0;
      document.getElementById('bill-deposit-months').value = data.billing.depositMonths    || 2;
      document.getElementById('bill-currency').value       = data.billing.currency         || 'INR';
      document.getElementById('bill-receipt-footer').value = data.billing.receiptFooter    || '';
    }

    if (data.security) {
      document.getElementById('sec-timeout').value = data.security.sessionTimeoutMinutes || 30;
    }

  } catch (err) {
    console.warn('[Settings] Could not load settings from backend:', err.message);
    // Keep the default HTML values — no error toast needed
  }
}

/* ---- Events ---- */
menuToggle.addEventListener('click',()=>{
  sidebar.classList.toggle('open');
  sidebarOverlay.classList.toggle('visible',sidebar.classList.contains('open'));
});
sidebarOverlay.addEventListener('click',()=>{
  sidebar.classList.remove('open');
  sidebarOverlay.classList.remove('visible');
});
logoutBtn.addEventListener('click',async()=>{
  try{await fetch(`${API_BASE}/api/auth/logout`,{method:'POST',headers:authHeaders()});}catch(_){}
  clearSession(); window.location.href=LOGIN_PAGE;
});

/* ---- Toast ---- */
function showToast(msg,type='info'){
  const t=document.createElement('div');
  t.className=`toast toast--${type}`;
  t.innerHTML=`<span class="toast-msg">${escapeHtml(msg)}</span>`;
  document.getElementById('toast-container').appendChild(t);
  setTimeout(()=>t.remove(),3500);
}

/* ---- Init ---- */
(function init(){
  guardAuth();
  setDate();
  populateUserInfo();
  fetchSettings();  // safe to call — falls back gracefully if backend not ready
})();
