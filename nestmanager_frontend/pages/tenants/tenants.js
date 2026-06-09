/**
 * tenants.js — NestManager Tenants Page
 *
 * Responsibilities (UI only):
 *  - Auth guard: redirect to login if no token
 *  - Fetch all tenants          GET    /api/tenants
 *  - Fetch vacant rooms         GET    /api/rooms?status=VACANT  (for room dropdown)
 *  - Add new tenant             POST   /api/tenants
 *  - Edit existing tenant       PUT    /api/tenants/{id}
 *  - Check-out tenant           PATCH  /api/tenants/{id}/checkout
 *  - Delete tenant              DELETE /api/tenants/{id}
 *  - Render tenants table with avatar initials + color
 *  - Filter by status (All / Active / Checked Out)
 *  - Filter by room number (dropdown)
 *  - Live search (name, phone, room)
 *  - Populate summary strip
 *  - Show Add/Edit modal with multi-section form and validation
 *  - Show Tenant Detail modal (read-only view)
 *  - Show Check-out confirmation modal
 *  - Show Delete confirmation modal
 *  - Toast notifications
 *  - Mobile sidebar toggle
 */

'use strict';

/* ------------------------------------------------------------------ */
/*  Config                                                              */
/* ------------------------------------------------------------------ */

const API_BASE       = 'http://localhost:8080';
const TENANTS_URL    = `${API_BASE}/api/tenants`;
const VACANT_ROOMS_URL = `${API_BASE}/api/rooms?status=VACANT`;
const LOGIN_PAGE     = '../login/login.html';

/* ------------------------------------------------------------------ */
/*  Auth                                                                */
/* ------------------------------------------------------------------ */

function getToken() {
  return sessionStorage.getItem('nestmanager_token')
      || localStorage.getItem('nestmanager_token')
      || null;
}

function authHeaders() {
  return {
    'Content-Type' : 'application/json',
    'Authorization': `Bearer ${getToken()}`,
  };
}

function clearSession() {
  ['nestmanager_token', 'nestmanager_role', 'nestmanager_username'].forEach(k => {
    sessionStorage.removeItem(k);
    localStorage.removeItem(k);
  });
}

/* ------------------------------------------------------------------ */
/*  DOM References                                                      */
/* ------------------------------------------------------------------ */

// Sidebar / topbar
const sidebar        = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebar-overlay');
const menuToggle     = document.getElementById('menu-toggle');
const logoutBtn      = document.getElementById('logout-btn');
const refreshBtn     = document.getElementById('refresh-btn');
const topbarDate     = document.getElementById('topbar-date');
const userAvatar     = document.getElementById('user-avatar');
const userName       = document.getElementById('user-name');
const userRole       = document.getElementById('user-role');

// Summary
const sumTotal      = document.getElementById('sum-total');
const sumActive     = document.getElementById('sum-active');
const sumNew        = document.getElementById('sum-new');
const sumDue        = document.getElementById('sum-due');
const sumCheckedOut = document.getElementById('sum-checkedout');
const pageSub       = document.getElementById('page-sub');

// Toolbar
const filterBtns   = document.querySelectorAll('.filter-btn');
const searchInput  = document.getElementById('search-input');
const roomFilter   = document.getElementById('room-filter');

// Table
const tenantsTbody = document.getElementById('tenants-tbody');
const emptyState   = document.getElementById('empty-state');

// Add/Edit modal
const tenantModal    = document.getElementById('tenant-modal');
const modalTitle     = document.getElementById('modal-title');
const tenantForm     = document.getElementById('tenant-form');
const tenantIdInput  = document.getElementById('tenant-id');
const fName          = document.getElementById('f-name');
const fPhone         = document.getElementById('f-phone');
const fEmail         = document.getElementById('f-email');
const fGender        = document.getElementById('f-gender');
const fAddress       = document.getElementById('f-address');
const fIdType        = document.getElementById('f-id-type');
const fIdNumber      = document.getElementById('f-id-number');
const fRoom          = document.getElementById('f-room');
const fCheckin       = document.getElementById('f-checkin');
const fCheckout      = document.getElementById('f-checkout');
const fRent          = document.getElementById('f-rent');
const fDeposit       = document.getElementById('f-deposit');
const fStatus        = document.getElementById('f-status');
const fEmergency     = document.getElementById('f-emergency-contact');
const submitText     = document.getElementById('submit-text');
const submitSpinner  = document.getElementById('submit-spinner');
const modalSubmitBtn = document.getElementById('modal-submit');

// Detail modal
const detailModal  = document.getElementById('detail-modal');
const detailBody   = document.getElementById('detail-body');

// Checkout modal
const checkoutModal      = document.getElementById('checkout-modal');
const checkoutTenantName = document.getElementById('checkout-tenant-name');
const checkoutDateInput  = document.getElementById('checkout-date');
const checkoutConfirm    = document.getElementById('checkout-confirm');
const checkoutText       = document.getElementById('checkout-text');
const checkoutSpinner    = document.getElementById('checkout-spinner');

// Delete modal
const deleteModal       = document.getElementById('delete-modal');
const deleteTenantName  = document.getElementById('delete-tenant-name');
const deleteConfirm     = document.getElementById('delete-confirm');
const deleteText        = document.getElementById('delete-text');
const deleteSpinner     = document.getElementById('delete-spinner');

/* ------------------------------------------------------------------ */
/*  State                                                               */
/* ------------------------------------------------------------------ */

let allTenants      = [];
let filteredTenants = [];
let activeFilter    = 'ALL';
let searchQuery     = '';
let activeRoom      = 'ALL';
let editingId       = null;
let checkoutingId   = null;
let deletingId      = null;

/* ------------------------------------------------------------------ */
/*  Avatar color pool                                                   */
/* ------------------------------------------------------------------ */

const AVATAR_COLORS = [
  '#3b82f6','#10b981','#8b5cf6','#f59e0b',
  '#ef4444','#06b6d4','#ec4899','#f97316',
];

function avatarColor(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function initials(name) {
  return name.trim().split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

function escapeHtml(str) {
  const d = document.createElement('div');
  d.appendChild(document.createTextNode(String(str ?? '')));
  return d.innerHTML;
}

function formatCurrency(val) {
  return '₹' + Number(val || 0).toLocaleString('en-IN');
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatRole(role) {
  const map = { ADMIN: 'Owner / Admin', MANAGER: 'Manager', STAFF: 'Staff' };
  return map[role] || role;
}

function idTypeLabel(type) {
  const map = {
    AADHAAR        : 'Aadhaar Card',
    PAN            : 'PAN Card',
    PASSPORT       : 'Passport',
    VOTER_ID       : 'Voter ID',
    DRIVING_LICENSE: 'Driving License',
  };
  return map[type] || type;
}

/* ------------------------------------------------------------------ */
/*  User Info & Date                                                    */
/* ------------------------------------------------------------------ */

function populateUserInfo() {
  const name    = sessionStorage.getItem('nestmanager_username') || localStorage.getItem('nestmanager_username') || 'Admin';
  const role    = sessionStorage.getItem('nestmanager_role')     || localStorage.getItem('nestmanager_role')     || 'ADMIN';
  const inits   = initials(name);
  userAvatar.textContent = inits;
  userName.textContent   = name;
  userRole.textContent   = formatRole(role);
}

function setDate() {
  topbarDate.textContent = new Date().toLocaleDateString('en-IN', { weekday:'short', day:'numeric', month:'short', year:'numeric' });
}

/* ------------------------------------------------------------------ */
/*  Summary Strip                                                       */
/* ------------------------------------------------------------------ */

/**
 * Calculates and renders the summary strip from the full tenant list.
 * "New this month" = tenants whose checkInDate falls in the current calendar month.
 * "Rent due" = active tenants whose payment status is PENDING or OVERDUE.
 *   — This count is optionally returned by the backend in the tenant object
 *     as a `rentStatus` field.  If not present we show '—'.
 *
 * @param {Array} tenants
 */
function updateSummary(tenants) {
  const now        = new Date();
  const thisMonth  = now.getMonth();
  const thisYear   = now.getFullYear();

  const total      = tenants.length;
  const active     = tenants.filter(t => t.status === 'ACTIVE').length;
  const checkedOut = tenants.filter(t => t.status === 'CHECKED_OUT').length;
  const newThisMonth = tenants.filter(t => {
    const d = new Date(t.checkInDate);
    return !isNaN(d) && d.getMonth() === thisMonth && d.getFullYear() === thisYear;
  }).length;
  const rentDue = tenants.filter(t =>
    t.status === 'ACTIVE' && (t.rentStatus === 'PENDING' || t.rentStatus === 'OVERDUE')
  ).length;

  sumTotal.textContent      = total;
  sumActive.textContent     = active;
  sumNew.textContent        = newThisMonth;
  sumDue.textContent        = rentDue || '—';
  sumCheckedOut.textContent = checkedOut;
  pageSub.textContent       = `${total} tenants · ${active} active · ${checkedOut} checked out`;
}

/* ------------------------------------------------------------------ */
/*  Filter & Search                                                     */
/* ------------------------------------------------------------------ */

function applyFilters() {
  filteredTenants = allTenants.filter(t => {
    const matchStatus = activeFilter === 'ALL' || t.status === activeFilter;
    const matchRoom   = activeRoom   === 'ALL' || t.roomNumber === activeRoom;
    const matchSearch = !searchQuery || [
      t.name, t.phone, t.roomNumber, t.email,
    ].some(val => (val || '').toLowerCase().includes(searchQuery));
    return matchStatus && matchRoom && matchSearch;
  });
  renderTable();
}

/* ------------------------------------------------------------------ */
/*  Render Table                                                        */
/* ------------------------------------------------------------------ */

/**
 * Renders a single table row for a tenant.
 *
 * Expected Tenant object from GET /api/tenants:
 * {
 *   id               : number,
 *   name             : string,
 *   phone            : string,
 *   email            : string,
 *   gender           : "MALE"|"FEMALE"|"OTHER"|null,
 *   address          : string,
 *   idProofType      : "AADHAAR"|"PAN"|"PASSPORT"|"VOTER_ID"|"DRIVING_LICENSE",
 *   idProofNumber    : string,
 *   roomId           : number,
 *   roomNumber       : string,
 *   checkInDate      : string,   ISO date e.g. "2024-01-10"
 *   expectedCheckOut : string|null,
 *   actualCheckOut   : string|null,
 *   rentPerMonth     : number,
 *   securityDeposit  : number,
 *   emergencyContact : string,
 *   status           : "ACTIVE"|"CHECKED_OUT",
 *   rentStatus       : "PAID"|"PENDING"|"OVERDUE"|null,
 * }
 *
 * @param {Object} t  tenant
 * @returns {string}  HTML string
 */
function rowHTML(t) {
  const color      = avatarColor(t.name);
  const inits      = initials(t.name);
  const statusCls  = t.status === 'ACTIVE' ? 'status-badge--active' : 'status-badge--checked-out';
  const statusLbl  = t.status === 'ACTIVE' ? 'Active' : 'Checked Out';

  return `
    <tr data-id="${t.id}" onclick="openDetailModal(${t.id})">
      <td>
        <div class="td-inner">
          <div class="tenant-cell">
            <div class="tenant-avatar" style="background:${color}">${escapeHtml(inits)}</div>
            <div>
              <div class="tenant-name">${escapeHtml(t.name)}</div>
              <div class="tenant-email">${escapeHtml(t.email || '—')}</div>
            </div>
          </div>
        </div>
      </td>
      <td>
        <div class="td-inner">
          ${t.roomNumber ? `<span class="room-badge">Room ${escapeHtml(t.roomNumber)}</span>` : '<span style="color:var(--text3)">—</span>'}
        </div>
      </td>
      <td><div class="td-inner" style="color:var(--text2)">${escapeHtml(t.phone)}</div></td>
      <td><div class="td-inner" style="color:var(--text2)">${formatDate(t.checkInDate)}</div></td>
      <td><div class="td-inner" style="color:var(--text2);font-weight:500">${formatCurrency(t.rentPerMonth)}</div></td>
      <td><div class="td-inner" style="color:var(--text3)">${escapeHtml(idTypeLabel(t.idProofType))}</div></td>
      <td><div class="td-inner"><span class="status-badge ${statusCls}">${statusLbl}</span></div></td>
      <td>
        <div class="td-inner" onclick="event.stopPropagation()">
          <div class="table-actions">
            <button class="btn btn-secondary btn-sm" onclick="openEditModal(${t.id})">Edit</button>
            ${t.status === 'ACTIVE'
              ? `<button class="btn btn-warning btn-sm" onclick="openCheckoutModal(${t.id}, '${escapeHtml(t.name)}')">Check-out</button>`
              : ''}
            <button class="btn btn-danger btn-sm" onclick="openDeleteModal(${t.id}, '${escapeHtml(t.name)}')">Delete</button>
          </div>
        </div>
      </td>
    </tr>`;
}

function renderTable() {
  if (filteredTenants.length === 0) {
    tenantsTbody.innerHTML = '';
    emptyState.classList.remove('hidden');
    return;
  }
  emptyState.classList.add('hidden');
  tenantsTbody.innerHTML = filteredTenants.map(rowHTML).join('');
}

/* ------------------------------------------------------------------ */
/*  Populate Room Filter Dropdown                                       */
/* ------------------------------------------------------------------ */

function populateRoomFilter(tenants) {
  const rooms = [...new Set(tenants.map(t => t.roomNumber).filter(Boolean))].sort();
  roomFilter.innerHTML = '<option value="ALL">All Rooms</option>';
  rooms.forEach(r => {
    roomFilter.innerHTML += `<option value="${escapeHtml(r)}">Room ${escapeHtml(r)}</option>`;
  });
}

/* ------------------------------------------------------------------ */
/*  Populate Room Dropdown in Modal (vacant rooms only)                 */
/* ------------------------------------------------------------------ */

/**
 * Fetches vacant rooms from GET /api/rooms?status=VACANT and populates
 * the room assignment select in the add/edit modal.
 *
 * In edit mode, also adds the tenant's current room so it's selectable.
 *
 * @param {string|null} currentRoom  current room number (edit mode)
 */
async function loadVacantRooms(currentRoom = null) {
  try {
    const res = await fetch(VACANT_ROOMS_URL, { headers: authHeaders() });
    if (!res.ok) throw new Error();
    const rooms = await res.json();

    fRoom.innerHTML = '<option value="">-- Select Room --</option>';

    // In edit mode, include current room even if it's occupied
    if (currentRoom) {
      fRoom.innerHTML += `<option value="${escapeHtml(currentRoom)}">Room ${escapeHtml(currentRoom)} (Current)</option>`;
    }

    rooms.forEach(r => {
      if (r.roomNumber !== currentRoom) {
        fRoom.innerHTML += `<option value="${escapeHtml(r.roomNumber)}">Room ${escapeHtml(r.roomNumber)} — ${escapeHtml(r.type)} (₹${Number(r.pricePerMonth).toLocaleString('en-IN')}/mo)</option>`;
      }
    });
  } catch {
    fRoom.innerHTML = '<option value="">Could not load rooms</option>';
  }
}

/* ------------------------------------------------------------------ */
/*  API — Fetch Tenants                                                 */
/*                                                                      */
/*  GET /api/tenants                                                    */
/*  Response: Tenant[]  (see Tenant shape documented in rowHTML above)  */
/* ------------------------------------------------------------------ */

async function fetchTenants() {
  setRefreshing(true);
  try {
    const res = await fetch(TENANTS_URL, { headers: authHeaders() });
    if (res.status === 401) { clearSession(); window.location.href = LOGIN_PAGE; return; }
    if (!res.ok) throw new Error('Failed to fetch tenants');
    allTenants = await res.json();
    updateSummary(allTenants);
    populateRoomFilter(allTenants);
    applyFilters();
  } catch (err) {
    console.error('[Tenants] Fetch error:', err);
    showToast('Could not load tenants. Check server connection.', 'error');
  } finally {
    setRefreshing(false);
  }
}

/* ------------------------------------------------------------------ */
/*  API — Add Tenant                                                    */
/*                                                                      */
/*  POST /api/tenants                                                   */
/*  Request body:                                                       */
/*  {                                                                   */
/*    name, phone, email, gender, address,                              */
/*    idProofType, idProofNumber,                                       */
/*    roomNumber, checkInDate, expectedCheckOut,                        */
/*    rentPerMonth, securityDeposit, emergencyContact, status           */
/*  }                                                                   */
/*  Response: Tenant (created, with id)                                 */
/* ------------------------------------------------------------------ */

async function addTenant(payload) {
  const res = await fetch(TENANTS_URL, {
    method : 'POST',
    headers: authHeaders(),
    body   : JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to add tenant');
  }
  return res.json();
}

/* ------------------------------------------------------------------ */
/*  API — Edit Tenant                                                   */
/*                                                                      */
/*  PUT /api/tenants/{id}                                               */
/*  Request body: same shape as POST                                    */
/*  Response: Tenant (updated)                                          */
/* ------------------------------------------------------------------ */

async function updateTenant(id, payload) {
  const res = await fetch(`${TENANTS_URL}/${id}`, {
    method : 'PUT',
    headers: authHeaders(),
    body   : JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to update tenant');
  }
  return res.json();
}

/* ------------------------------------------------------------------ */
/*  API — Check-out Tenant                                              */
/*                                                                      */
/*  PATCH /api/tenants/{id}/checkout                                    */
/*  Request body: { checkOutDate: "YYYY-MM-DD" }                       */
/*  Response: Tenant (updated, status = CHECKED_OUT)                   */
/*  Side effect: backend marks the room as VACANT                      */
/* ------------------------------------------------------------------ */

async function checkoutTenant(id, checkOutDate) {
  const res = await fetch(`${TENANTS_URL}/${id}/checkout`, {
    method : 'PATCH',
    headers: authHeaders(),
    body   : JSON.stringify({ checkOutDate }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to check out tenant');
  }
  return res.json();
}

/* ------------------------------------------------------------------ */
/*  API — Delete Tenant                                                 */
/*                                                                      */
/*  DELETE /api/tenants/{id}                                            */
/*  Response: 204 No Content                                            */
/* ------------------------------------------------------------------ */

async function deleteTenantReq(id) {
  const res = await fetch(`${TENANTS_URL}/${id}`, {
    method : 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to delete tenant');
  }
}

/* ------------------------------------------------------------------ */
/*  Form Validation                                                     */
/* ------------------------------------------------------------------ */

const FIELD_ERRORS = {
  'f-name'     : 'err-name',
  'f-phone'    : 'err-phone',
  'f-email'    : 'err-email',
  'f-id-number': 'err-id-number',
  'f-room'     : 'err-room',
  'f-checkin'  : 'err-checkin',
  'f-rent'     : 'err-rent',
};

function clearErrors() {
  Object.keys(FIELD_ERRORS).forEach(id => {
    document.getElementById(id)?.classList.remove('is-error');
    const errEl = document.getElementById(FIELD_ERRORS[id]);
    if (errEl) errEl.textContent = '';
  });
}

function showFieldError(inputId, msg) {
  document.getElementById(inputId)?.classList.add('is-error');
  const errId = FIELD_ERRORS[inputId];
  if (errId) document.getElementById(errId).textContent = msg;
}

function validateTenantForm() {
  clearErrors();
  let valid = true;

  if (!fName.value.trim()) { showFieldError('f-name', 'Full name is required.'); valid = false; }

  const phone = fPhone.value.trim();
  if (!phone) { showFieldError('f-phone', 'Phone number is required.'); valid = false; }
  else if (!/^[+\d\s\-]{7,15}$/.test(phone)) { showFieldError('f-phone', 'Enter a valid phone number.'); valid = false; }

  if (fEmail.value.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fEmail.value.trim())) {
    showFieldError('f-email', 'Enter a valid email address.');
    valid = false;
  }

  if (!fIdNumber.value.trim()) { showFieldError('f-id-number', 'ID number is required.'); valid = false; }

  if (!fRoom.value) { showFieldError('f-room', 'Please assign a room.'); valid = false; }

  if (!fCheckin.value) { showFieldError('f-checkin', 'Check-in date is required.'); valid = false; }

  const rent = parseFloat(fRent.value);
  if (!fRent.value || isNaN(rent) || rent < 0) { showFieldError('f-rent', 'Enter a valid rent amount.'); valid = false; }

  return valid;
}

// Clear field errors on input
Object.keys(FIELD_ERRORS).forEach(id => {
  document.getElementById(id)?.addEventListener('input', () => {
    document.getElementById(id)?.classList.remove('is-error');
  });
});

/* ------------------------------------------------------------------ */
/*  Add / Edit Modal                                                    */
/* ------------------------------------------------------------------ */

function openAddModal() {
  editingId = null;
  modalTitle.textContent = 'Add New Tenant';
  submitText.textContent = 'Add Tenant';
  tenantForm.reset();
  fCheckin.value = new Date().toISOString().split('T')[0];
  clearErrors();
  loadVacantRooms();
  openModal(tenantModal);
}

function openEditModal(id) {
  const t = allTenants.find(x => x.id === id);
  if (!t) return;
  editingId = id;
  modalTitle.textContent = `Edit — ${t.name}`;
  submitText.textContent = 'Save Changes';

  tenantIdInput.value = t.id;
  fName.value         = t.name || '';
  fPhone.value        = t.phone || '';
  fEmail.value        = t.email || '';
  fGender.value       = t.gender || '';
  fAddress.value      = t.address || '';
  fIdType.value       = t.idProofType || 'AADHAAR';
  fIdNumber.value     = t.idProofNumber || '';
  fCheckin.value      = t.checkInDate || '';
  fCheckout.value     = t.expectedCheckOut || '';
  fRent.value         = t.rentPerMonth || '';
  fDeposit.value      = t.securityDeposit || '';
  fStatus.value       = t.status || 'ACTIVE';
  fEmergency.value    = t.emergencyContact || '';

  clearErrors();
  loadVacantRooms(t.roomNumber).then(() => { fRoom.value = t.roomNumber || ''; });
  openModal(tenantModal);
}

tenantForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!validateTenantForm()) return;

  const payload = {
    name            : fName.value.trim(),
    phone           : fPhone.value.trim(),
    email           : fEmail.value.trim() || null,
    gender          : fGender.value || null,
    address         : fAddress.value.trim() || null,
    idProofType     : fIdType.value,
    idProofNumber   : fIdNumber.value.trim(),
    roomNumber      : fRoom.value,
    checkInDate     : fCheckin.value,
    expectedCheckOut: fCheckout.value || null,
    rentPerMonth    : parseFloat(fRent.value),
    securityDeposit : parseFloat(fDeposit.value) || 0,
    emergencyContact: fEmergency.value.trim() || null,
    status          : fStatus.value,
  };

  setSubmitLoading(true);
  try {
    if (editingId) {
      await updateTenant(editingId, payload);
      showToast(`${payload.name} updated successfully.`, 'success');
    } else {
      await addTenant(payload);
      showToast(`${payload.name} added successfully.`, 'success');
    }
    closeModal(tenantModal);
    await fetchTenants();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    setSubmitLoading(false);
  }
});

/* ------------------------------------------------------------------ */
/*  Detail Modal                                                        */
/* ------------------------------------------------------------------ */

function openDetailModal(id) {
  const t = allTenants.find(x => x.id === id);
  if (!t) return;

  const color = avatarColor(t.name);
  const inits = initials(t.name);

  detailBody.innerHTML = `
    <div class="detail-header-row">
      <div class="detail-avatar" style="background:${color}">${escapeHtml(inits)}</div>
      <div>
        <div class="detail-name">${escapeHtml(t.name)}</div>
        <div class="detail-meta">${escapeHtml(t.phone)} ${t.email ? '· ' + escapeHtml(t.email) : ''}</div>
      </div>
      <span class="status-badge ${t.status === 'ACTIVE' ? 'status-badge--active' : 'status-badge--checked-out'}" style="margin-left:auto;">
        ${t.status === 'ACTIVE' ? 'Active' : 'Checked Out'}
      </span>
    </div>
    <div class="detail-grid">
      <div class="detail-item">
        <div class="detail-item-label">Assigned Room</div>
        <div class="detail-item-value">${t.roomNumber ? 'Room ' + escapeHtml(t.roomNumber) : '—'}</div>
      </div>
      <div class="detail-item">
        <div class="detail-item-label">Monthly Rent</div>
        <div class="detail-item-value">${formatCurrency(t.rentPerMonth)}</div>
      </div>
      <div class="detail-item">
        <div class="detail-item-label">Check-in Date</div>
        <div class="detail-item-value">${formatDate(t.checkInDate)}</div>
      </div>
      <div class="detail-item">
        <div class="detail-item-label">Check-out Date</div>
        <div class="detail-item-value">${formatDate(t.actualCheckOut || t.expectedCheckOut)}</div>
      </div>
      <div class="detail-item">
        <div class="detail-item-label">ID Proof</div>
        <div class="detail-item-value">${escapeHtml(idTypeLabel(t.idProofType))} · ${escapeHtml(t.idProofNumber)}</div>
      </div>
      <div class="detail-item">
        <div class="detail-item-label">Security Deposit</div>
        <div class="detail-item-value">${formatCurrency(t.securityDeposit)}</div>
      </div>
      <div class="detail-item">
        <div class="detail-item-label">Gender</div>
        <div class="detail-item-value">${escapeHtml(t.gender || '—')}</div>
      </div>
      <div class="detail-item">
        <div class="detail-item-label">Emergency Contact</div>
        <div class="detail-item-value">${escapeHtml(t.emergencyContact || '—')}</div>
      </div>
      ${t.address ? `
      <div class="detail-item" style="grid-column:1/-1">
        <div class="detail-item-label">Address</div>
        <div class="detail-item-value">${escapeHtml(t.address)}</div>
      </div>` : ''}
    </div>
    <div class="detail-actions">
      <button class="btn btn-secondary btn-sm" onclick="closeModal(document.getElementById('detail-modal')); openEditModal(${t.id});">Edit Details</button>
      ${t.status === 'ACTIVE' ? `<button class="btn btn-warning btn-sm" onclick="closeModal(document.getElementById('detail-modal')); openCheckoutModal(${t.id}, '${escapeHtml(t.name)}');">Check-out</button>` : ''}
    </div>`;

  openModal(detailModal);
}

/* ------------------------------------------------------------------ */
/*  Checkout Modal                                                      */
/* ------------------------------------------------------------------ */

function openCheckoutModal(id, name) {
  checkoutingId = id;
  checkoutTenantName.textContent = name;
  checkoutDateInput.value = new Date().toISOString().split('T')[0];
  openModal(checkoutModal);
}

checkoutConfirm.addEventListener('click', async () => {
  if (!checkoutingId) return;
  setCheckoutLoading(true);
  try {
    await checkoutTenant(checkoutingId, checkoutDateInput.value);
    showToast('Tenant checked out successfully.', 'success');
    closeModal(checkoutModal);
    await fetchTenants();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    setCheckoutLoading(false);
    checkoutingId = null;
  }
});

/* ------------------------------------------------------------------ */
/*  Delete Modal                                                        */
/* ------------------------------------------------------------------ */

function openDeleteModal(id, name) {
  deletingId = id;
  deleteTenantName.textContent = name;
  openModal(deleteModal);
}

deleteConfirm.addEventListener('click', async () => {
  if (!deletingId) return;
  setDeleteLoading(true);
  try {
    await deleteTenantReq(deletingId);
    showToast('Tenant deleted successfully.', 'success');
    closeModal(deleteModal);
    await fetchTenants();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    setDeleteLoading(false);
    deletingId = null;
  }
});

/* ------------------------------------------------------------------ */
/*  Modal helpers                                                       */
/* ------------------------------------------------------------------ */

function openModal(overlay) { overlay.classList.add('open'); document.body.style.overflow = 'hidden'; }
function closeModal(overlay) { overlay.classList.remove('open'); document.body.style.overflow = ''; }

tenantModal.addEventListener('click',   e => { if (e.target === tenantModal)   closeModal(tenantModal); });
detailModal.addEventListener('click',   e => { if (e.target === detailModal)   closeModal(detailModal); });
checkoutModal.addEventListener('click', e => { if (e.target === checkoutModal) closeModal(checkoutModal); });
deleteModal.addEventListener('click',   e => { if (e.target === deleteModal)   closeModal(deleteModal); });

document.getElementById('modal-close').addEventListener('click',          () => closeModal(tenantModal));
document.getElementById('modal-cancel').addEventListener('click',         () => closeModal(tenantModal));
document.getElementById('detail-modal-close').addEventListener('click',   () => closeModal(detailModal));
document.getElementById('checkout-modal-close').addEventListener('click', () => closeModal(checkoutModal));
document.getElementById('checkout-cancel').addEventListener('click',      () => closeModal(checkoutModal));
document.getElementById('delete-modal-close').addEventListener('click',   () => closeModal(deleteModal));
document.getElementById('delete-cancel').addEventListener('click',        () => closeModal(deleteModal));

function setSubmitLoading(on) {
  modalSubmitBtn.disabled = on;
  submitSpinner.classList.toggle('hidden', !on);
  submitText.textContent = on ? (editingId ? 'Saving...' : 'Adding...') : (editingId ? 'Save Changes' : 'Add Tenant');
}

function setCheckoutLoading(on) {
  checkoutConfirm.disabled = on;
  checkoutSpinner.classList.toggle('hidden', !on);
  checkoutText.textContent = on ? 'Processing...' : 'Confirm Check-out';
}

function setDeleteLoading(on) {
  deleteConfirm.disabled = on;
  deleteSpinner.classList.toggle('hidden', !on);
  deleteText.textContent = on ? 'Deleting...' : 'Delete Tenant';
}

/* ------------------------------------------------------------------ */
/*  Toolbar events                                                      */
/* ------------------------------------------------------------------ */

filterBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    filterBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activeFilter = btn.dataset.filter;
    applyFilters();
  });
});

searchInput.addEventListener('input', () => {
  searchQuery = searchInput.value.trim().toLowerCase();
  applyFilters();
});

roomFilter.addEventListener('change', () => {
  activeRoom = roomFilter.value;
  applyFilters();
});

document.getElementById('add-tenant-btn').addEventListener('click', openAddModal);
document.getElementById('empty-add-btn').addEventListener('click', openAddModal);

/* ------------------------------------------------------------------ */
/*  Refresh / Sidebar / Logout                                          */
/* ------------------------------------------------------------------ */

refreshBtn.addEventListener('click', fetchTenants);

function setRefreshing(on) {
  refreshBtn.classList.toggle('spinning', on);
  refreshBtn.disabled = on;
}

menuToggle.addEventListener('click', () => {
  sidebar.classList.toggle('open');
  sidebarOverlay.classList.toggle('visible', sidebar.classList.contains('open'));
});

sidebarOverlay.addEventListener('click', () => {
  sidebar.classList.remove('open');
  sidebarOverlay.classList.remove('visible');
});

logoutBtn.addEventListener('click', async () => {
  try { await fetch(`${API_BASE}/api/auth/logout`, { method: 'POST', headers: authHeaders() }); } catch (_) {}
  clearSession();
  window.location.href = LOGIN_PAGE;
});

/* ------------------------------------------------------------------ */
/*  Toast                                                               */
/* ------------------------------------------------------------------ */

function showToast(msg, type = 'info') {
  const icons = { success: '✓', error: '✕', info: 'i' };
  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.innerHTML = `<span class="toast-icon">${icons[type]}</span><span class="toast-msg">${escapeHtml(msg)}</span>`;
  document.getElementById('toast-container').appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}

/* ------------------------------------------------------------------ */
/*  Init                                                                */
/* ------------------------------------------------------------------ */

(function init() {
  guardAuth();
  setDate();
  populateUserInfo();
  fetchTenants();   // comment out until backend is ready

  // Temporary dummy data for UI testing
  // allTenants = [
  //   { id:1,  name:'Arjun Sharma',   phone:'+91 98765 43210', email:'arjun@email.com',   gender:'MALE',   address:'12, Anna Nagar, Chennai - 600040',          idProofType:'AADHAAR',         idProofNumber:'1234 5678 9012', roomNumber:'101', checkInDate:'2024-01-10', expectedCheckOut:null,         actualCheckOut:null,         rentPerMonth:5500,  securityDeposit:11000, emergencyContact:'Suresh Sharma - 98765 00001', status:'ACTIVE',      rentStatus:'PAID' },
  //   { id:2,  name:'Priya Nair',     phone:'+91 87654 32109', email:'priya@email.com',   gender:'FEMALE', address:'45, T Nagar, Chennai - 600017',              idProofType:'PAN',             idProofNumber:'ABCDE1234F',    roomNumber:'102', checkInDate:'2024-01-15', expectedCheckOut:'2025-01-15', actualCheckOut:null,         rentPerMonth:3500,  securityDeposit:7000,  emergencyContact:'Meena Nair - 87654 00002',   status:'ACTIVE',      rentStatus:'PENDING' },
  //   { id:3,  name:'Mohammed Ali',   phone:'+91 76543 21098', email:'mali@email.com',    gender:'MALE',   address:'78, Kilpauk, Chennai - 600010',              idProofType:'PASSPORT',        idProofNumber:'P1234567',      roomNumber:'102', checkInDate:'2024-02-01', expectedCheckOut:null,         actualCheckOut:null,         rentPerMonth:3500,  securityDeposit:7000,  emergencyContact:'Ahmed Ali - 76543 00003',    status:'ACTIVE',      rentStatus:'OVERDUE' },
  //   { id:4,  name:'Sneha Patel',    phone:'+91 65432 10987', email:'sneha@email.com',   gender:'FEMALE', address:'23, Adyar, Chennai - 600020',                idProofType:'AADHAAR',         idProofNumber:'9876 5432 1098', roomNumber:'103', checkInDate:'2024-02-10', expectedCheckOut:null,         actualCheckOut:null,         rentPerMonth:4000,  securityDeposit:8000,  emergencyContact:'Ravi Patel - 65432 00004',   status:'ACTIVE',      rentStatus:'PAID' },
  //   { id:5,  name:'Vikram Singh',   phone:'+91 54321 09876', email:'vikram@email.com',  gender:'MALE',   address:'56, Velachery, Chennai - 600042',            idProofType:'VOTER_ID',        idProofNumber:'TN/11/001/123456', roomNumber:'201', checkInDate:'2024-01-05', expectedCheckOut:null,       actualCheckOut:null,         rentPerMonth:7500,  securityDeposit:15000, emergencyContact:'Kavita Singh - 54321 00005', status:'ACTIVE',      rentStatus:'PAID' },
  //   { id:6,  name:'Kavitha Rajan',  phone:'+91 43210 98765', email:'kavi@email.com',    gender:'FEMALE', address:'89, Mylapore, Chennai - 600004',             idProofType:'AADHAAR',         idProofNumber:'1111 2222 3333', roomNumber:'103', checkInDate:'2023-12-01', expectedCheckOut:null,         actualCheckOut:null,         rentPerMonth:4000,  securityDeposit:8000,  emergencyContact:'Rajan K - 43210 00006',      status:'ACTIVE',      rentStatus:'OVERDUE' },
  //   { id:7,  name:'Ravi Kumar',     phone:'+91 32109 87654', email:'ravi@email.com',    gender:'MALE',   address:'34, Tambaram, Chennai - 600045',             idProofType:'PAN',             idProofNumber:'FGHIJ5678K',    roomNumber:'202', checkInDate:'2024-03-01', expectedCheckOut:null,         actualCheckOut:null,         rentPerMonth:12000, securityDeposit:24000, emergencyContact:'Suma Kumar - 32109 00007',   status:'ACTIVE',      rentStatus:'PAID' },
  //   { id:8,  name:'Ananya Das',     phone:'+91 21098 76543', email:'ananya@email.com',  gender:'FEMALE', address:'67, Porur, Chennai - 600116',                idProofType:'DRIVING_LICENSE', idProofNumber:'TN0120230012345', roomNumber:'204', checkInDate:'2024-01-20', expectedCheckOut:'2024-06-20', actualCheckOut:null,        rentPerMonth:6000,  securityDeposit:12000, emergencyContact:'Das S - 21098 00008',        status:'ACTIVE',      rentStatus:'PENDING' },
  //   { id:9,  name:'Suresh Babu',    phone:'+91 11987 65432', email:'suresh@email.com',  gender:'MALE',   address:'90, Guindy, Chennai - 600032',               idProofType:'AADHAAR',         idProofNumber:'4444 5555 6666', roomNumber:'302', checkInDate:'2023-10-01', expectedCheckOut:'2024-03-31', actualCheckOut:'2024-03-31', rentPerMonth:5800,  securityDeposit:11600, emergencyContact:'Babu R - 11987 00009',       status:'CHECKED_OUT', rentStatus:null },
  //   { id:10, name:'Lakshmi Devi',   phone:'+91 10876 54321', email:'lakshmi@email.com', gender:'FEMALE', address:'11, Chromepet, Chennai - 600044',            idProofType:'VOTER_ID',        idProofNumber:'TN/22/002/654321', roomNumber:null,  checkInDate:'2023-08-15', expectedCheckOut:'2024-02-15', actualCheckOut:'2024-02-10', rentPerMonth:5500,  securityDeposit:11000, emergencyContact:'Devi P - 10876 00010',       status:'CHECKED_OUT', rentStatus:null },
  // ];

  updateSummary(allTenants);
  populateRoomFilter(allTenants);
  applyFilters();
})();