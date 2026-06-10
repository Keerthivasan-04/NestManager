/**
 * payments.js — NestManager Payments Page
 *
 * Responsibilities (UI only):
 *  - Auth guard: redirect to login if no token
 *  - Fetch all payments         GET    /api/payments
 *  - Fetch active tenants       GET    /api/tenants?status=ACTIVE  (tenant dropdown)
 *  - Record new payment         POST   /api/payments
 *  - Edit existing payment      PUT    /api/payments/{id}
 *  - Mark payment as paid       PATCH  /api/payments/{id}/mark-paid
 *  - Delete payment             DELETE /api/payments/{id}
 *  - Render payments table
 *  - Finance summary cards (collected / pending / overdue / total)
 *  - Filter by status (All / Paid / Pending / Overdue / Partial)
 *  - Filter by month
 *  - Filter by payment method
 *  - Live search (tenant name, receipt number)
 *  - Add/Edit payment modal with form + validation
 *  - Receipt modal with print support
 *  - Delete confirm modal
 *  - Toast notifications
 *  - Mobile sidebar toggle
 */

'use strict';

/* ------------------------------------------------------------------ */
/*  Config                                                              */
/* ------------------------------------------------------------------ */

const API_BASE           = 'http://localhost:8080';
const PAYMENTS_URL       = `${API_BASE}/api/payments`;
const ACTIVE_TENANTS_URL = `${API_BASE}/api/tenants?status=ACTIVE`;
const LOGIN_PAGE         = '../login/login.html';

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
  ['nestmanager_token','nestmanager_role','nestmanager_username'].forEach(k => {
    sessionStorage.removeItem(k); localStorage.removeItem(k);
  });
}

function guardAuth() {
  if (!getToken()) window.location.href = LOGIN_PAGE;
}

/* ------------------------------------------------------------------ */
/*  DOM References                                                      */
/* ------------------------------------------------------------------ */

const sidebar        = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebar-overlay');
const menuToggle     = document.getElementById('menu-toggle');
const logoutBtn      = document.getElementById('logout-btn');
const refreshBtn     = document.getElementById('refresh-btn');
const topbarDate     = document.getElementById('topbar-date');
const userAvatar     = document.getElementById('user-avatar');
const userName       = document.getElementById('user-name');
const userRole       = document.getElementById('user-role');
const pageSub        = document.getElementById('page-sub');

// Finance cards
const fcCollected       = document.getElementById('fc-collected');
const fcCollectedTrend  = document.getElementById('fc-collected-trend');
const fcPending         = document.getElementById('fc-pending');
const fcPendingCount    = document.getElementById('fc-pending-count');
const fcOverdue         = document.getElementById('fc-overdue');
const fcOverdueCount    = document.getElementById('fc-overdue-count');
const fcTotal           = document.getElementById('fc-total');
const fcCollectionRate  = document.getElementById('fc-collection-rate');

// Toolbar
const filterBtns   = document.querySelectorAll('.filter-btn');
const monthFilter  = document.getElementById('month-filter');
const methodFilter = document.getElementById('method-filter');
const searchInput  = document.getElementById('search-input');

// Table
const paymentsTbody = document.getElementById('payments-tbody');
const emptyState    = document.getElementById('empty-state');

// Add/Edit modal
const paymentModal   = document.getElementById('payment-modal');
const modalTitle     = document.getElementById('modal-title');
const paymentForm    = document.getElementById('payment-form');
const paymentIdInput = document.getElementById('payment-id');
const fTenant        = document.getElementById('f-tenant');
const fRoomDisplay   = document.getElementById('f-room-display');
const fAmount        = document.getElementById('f-amount');
const fMethod        = document.getElementById('f-method');
const fForMonth      = document.getElementById('f-for-month');
const fPaidDate      = document.getElementById('f-paid-date');
const fDueDate       = document.getElementById('f-due-date');
const fStatus        = document.getElementById('f-status');
const fTransactionId = document.getElementById('f-transaction-id');
const fNotes         = document.getElementById('f-notes');
const submitText     = document.getElementById('submit-text');
const submitSpinner  = document.getElementById('submit-spinner');
const modalSubmitBtn = document.getElementById('modal-submit');

// Receipt modal
const receiptModal = document.getElementById('receipt-modal');
const receiptBody  = document.getElementById('receipt-body');
const printBtn     = document.getElementById('print-btn');

// Delete modal
const deleteModal     = document.getElementById('delete-modal');
const deleteReceiptNo = document.getElementById('delete-receipt-no');
const deleteConfirm   = document.getElementById('delete-confirm');
const deleteText      = document.getElementById('delete-text');
const deleteSpinner   = document.getElementById('delete-spinner');

/* ------------------------------------------------------------------ */
/*  State                                                               */
/* ------------------------------------------------------------------ */

let allPayments      = [];
let filteredPayments = [];
let allTenants       = [];     // for dropdown
let activeFilter     = 'ALL';
let searchQuery      = '';
let activeMonth      = '';
let activeMethod     = 'ALL';
let editingId        = null;
let deletingId       = null;

/* ------------------------------------------------------------------ */
/*  Avatar colors                                                       */
/* ------------------------------------------------------------------ */

const AVATAR_COLORS = ['#3b82f6','#10b981','#8b5cf6','#f59e0b','#ef4444','#06b6d4','#ec4899','#f97316'];

function avatarColor(name) {
  let h = 0;
  for (let i = 0; i < (name||'').length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

function initials(name) {
  return (name || '?').trim().split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
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
  return d.toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' });
}

function formatMonthLabel(monthStr) {
  if (!monthStr) return '—';
  const [y, m] = monthStr.split('-');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[parseInt(m)-1]} ${y}`;
}

function formatRole(role) {
  const map = { ADMIN:'Owner / Admin', MANAGER:'Manager', STAFF:'Staff' };
  return map[role] || role;
}

function methodLabel(m) {
  const map = { UPI:'UPI', CASH:'Cash', BANK_TRANSFER:'Bank Transfer', CHEQUE:'Cheque' };
  return map[m] || m;
}

function methodBadgeCls(m) {
  const map = { UPI:'method-badge--upi', CASH:'method-badge--cash', BANK_TRANSFER:'method-badge--bank', CHEQUE:'method-badge--cheque' };
  return map[m] || 'method-badge--upi';
}

function statusBadgeCls(s) {
  const map = { PAID:'status-badge--paid', PENDING:'status-badge--pending', OVERDUE:'status-badge--overdue', PARTIAL:'status-badge--partial' };
  return map[s] || 'status-badge--pending';
}

/* ------------------------------------------------------------------ */
/*  User info & Date                                                    */
/* ------------------------------------------------------------------ */

function populateUserInfo() {
  const name  = sessionStorage.getItem('nestmanager_username') || localStorage.getItem('nestmanager_username') || 'Admin';
  const role  = sessionStorage.getItem('nestmanager_role')     || localStorage.getItem('nestmanager_role')     || 'ADMIN';
  const inits = initials(name);
  userAvatar.textContent = inits;
  userName.textContent   = name;
  userRole.textContent   = formatRole(role);
}

function setDate() {
  topbarDate.textContent = new Date().toLocaleDateString('en-IN', { weekday:'short', day:'numeric', month:'short', year:'numeric' });
}

/* ------------------------------------------------------------------ */
/*  Finance Cards                                                       */
/* ------------------------------------------------------------------ */

/**
 * Calculates and renders the 4 finance summary cards.
 *
 * "Collected this month" = sum of PAID payments for the current calendar month.
 * "Pending"  = sum of PENDING payments.
 * "Overdue"  = sum of OVERDUE payments.
 * "Total revenue" = sum of all PAID payments ever.
 * "Collection rate" = paid / (paid + pending + overdue) * 100.
 *
 * @param {Array} payments
 */
function updateFinanceCards(payments) {
  const now       = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;

  const collectedThisMonth = payments
    .filter(p => p.status === 'PAID' && p.forMonth === thisMonth)
    .reduce((s, p) => s + (p.amount || 0), 0);

  const pendingAmt  = payments.filter(p => p.status === 'PENDING').reduce((s,p) => s + p.amount, 0);
  const overdueAmt  = payments.filter(p => p.status === 'OVERDUE').reduce((s,p) => s + p.amount, 0);
  const totalPaid   = payments.filter(p => p.status === 'PAID').reduce((s,p) => s + p.amount, 0);

  const pendingCnt  = payments.filter(p => p.status === 'PENDING').length;
  const overdueCnt  = payments.filter(p => p.status === 'OVERDUE').length;

  const collectable = totalPaid + pendingAmt + overdueAmt;
  const rate        = collectable ? Math.round((totalPaid / collectable) * 100) : 0;

  fcCollected.textContent      = formatCurrency(collectedThisMonth);
  fcCollectedTrend.textContent = '+' + rate + '%';
  fcPending.textContent        = formatCurrency(pendingAmt);
  fcPendingCount.textContent   = pendingCnt + ' tenant' + (pendingCnt !== 1 ? 's' : '');
  fcOverdue.textContent        = formatCurrency(overdueAmt);
  fcOverdueCount.textContent   = overdueCnt + ' tenant' + (overdueCnt !== 1 ? 's' : '');
  fcTotal.textContent          = formatCurrency(totalPaid);
  fcCollectionRate.textContent = rate + '%';

  pageSub.textContent = `${payments.length} records · ${formatCurrency(collectedThisMonth)} collected this month`;
}

/* ------------------------------------------------------------------ */
/*  Filters                                                             */
/* ------------------------------------------------------------------ */

function applyFilters() {
  filteredPayments = allPayments.filter(p => {
    const matchStatus = activeFilter === 'ALL' || p.status === activeFilter;
    const matchMonth  = !activeMonth || p.forMonth === activeMonth;
    const matchMethod = activeMethod === 'ALL' || p.paymentMethod === activeMethod;
    const matchSearch = !searchQuery || [
      p.tenantName, p.receiptNumber,
    ].some(v => (v || '').toLowerCase().includes(searchQuery));
    return matchStatus && matchMonth && matchMethod && matchSearch;
  });
  renderTable();
}

/* ------------------------------------------------------------------ */
/*  Render Table                                                        */
/* ------------------------------------------------------------------ */

/**
 * Renders a single payment row.
 *
 * Expected Payment object from GET /api/payments:
 * {
 *   id             : number,
 *   receiptNumber  : string,       e.g. "REC-001"
 *   tenantId       : number,
 *   tenantName     : string,
 *   tenantPhone    : string,
 *   roomNumber     : string,
 *   forMonth       : string,       "YYYY-MM"
 *   amount         : number,
 *   paymentMethod  : "UPI"|"CASH"|"BANK_TRANSFER"|"CHEQUE",
 *   transactionId  : string|null,
 *   dueDate        : string|null,  ISO date
 *   paidDate       : string|null,  ISO date
 *   status         : "PAID"|"PENDING"|"OVERDUE"|"PARTIAL",
 *   notes          : string|null,
 * }
 *
 * @param {Object} p  payment
 * @returns {string}  HTML string
 */
function rowHTML(p) {
  const color    = avatarColor(p.tenantName);
  const inits    = initials(p.tenantName);
  const isPaid   = p.status === 'PAID';
  const canMarkPaid = p.status === 'PENDING' || p.status === 'OVERDUE' || p.status === 'PARTIAL';

  return `
    <tr data-id="${p.id}" onclick="openReceiptModal(${p.id})">
      <td><span class="receipt-cell">${escapeHtml(p.receiptNumber || '#' + p.id)}</span></td>
      <td>
        <div class="tenant-cell">
          <div class="tenant-avatar" style="background:${color}">${escapeHtml(inits)}</div>
          <div>
            <div class="tenant-name">${escapeHtml(p.tenantName)}</div>
            <div class="tenant-phone">${escapeHtml(p.tenantPhone || '')}</div>
          </div>
        </div>
      </td>
      <td><span class="room-badge">Room ${escapeHtml(p.roomNumber)}</span></td>
      <td style="color:var(--text2)">${formatMonthLabel(p.forMonth)}</td>
      <td style="color:var(--text);font-weight:500">${formatCurrency(p.amount)}</td>
      <td>
        ${isPaid
          ? `<span class="method-badge ${methodBadgeCls(p.paymentMethod)}">${methodLabel(p.paymentMethod)}</span>`
          : '<span style="color:var(--text3)">—</span>'}
      </td>
      <td style="color:var(--text2)">${formatDate(p.dueDate)}</td>
      <td style="color:var(--text2)">${formatDate(p.paidDate)}</td>
      <td><span class="status-badge ${statusBadgeCls(p.status)}">${p.status}</span></td>
      <td onclick="event.stopPropagation()">
        <div class="table-actions">
          ${canMarkPaid ? `<button class="btn btn-success btn-sm" onclick="markPaid(${p.id})">Mark Paid</button>` : ''}
          <button class="btn btn-secondary btn-sm" onclick="openEditModal(${p.id})">Edit</button>
          <button class="btn btn-danger btn-sm" onclick="openDeleteModal(${p.id}, '${escapeHtml(p.receiptNumber || '#'+p.id)}')">Delete</button>
        </div>
      </td>
    </tr>`;
}

function renderTable() {
  if (filteredPayments.length === 0) {
    paymentsTbody.innerHTML = '';
    emptyState.classList.remove('hidden');
    return;
  }
  emptyState.classList.add('hidden');
  paymentsTbody.innerHTML = filteredPayments.map(rowHTML).join('');
}

/* ------------------------------------------------------------------ */
/*  Populate Tenant Dropdown                                            */
/* ------------------------------------------------------------------ */

/**
 * Fetches active tenants and populates the tenant select in the modal.
 * GET /api/tenants?status=ACTIVE
 * Response: Tenant[] (id, name, phone, roomNumber, rentPerMonth)
 */
async function loadActiveTenants() {
  try {
    const res = await fetch(ACTIVE_TENANTS_URL, { headers: authHeaders() });
    if (!res.ok) throw new Error();
    allTenants = await res.json();
    populateTenantSelect();
  } catch {
    fTenant.innerHTML = '<option value="">Could not load tenants</option>';
  }
}

function populateTenantSelect(selectedId = null) {
  fTenant.innerHTML = '<option value="">-- Select Tenant --</option>';
  allTenants.forEach(t => {
    fTenant.innerHTML += `<option value="${t.id}" data-room="${escapeHtml(t.roomNumber)}" data-rent="${t.rentPerMonth}">
      ${escapeHtml(t.name)} — Room ${escapeHtml(t.roomNumber)}
    </option>`;
  });
  if (selectedId) fTenant.value = selectedId;
}

/* Auto-fill room and amount when tenant is selected */
fTenant.addEventListener('change', () => {
  const opt = fTenant.options[fTenant.selectedIndex];
  if (opt && opt.dataset.room) {
    fRoomDisplay.value = 'Room ' + opt.dataset.room;
    if (!fAmount.value) fAmount.value = opt.dataset.rent || '';
  } else {
    fRoomDisplay.value = '';
  }
});

/* ------------------------------------------------------------------ */
/*  API — Fetch Payments                                                */
/*                                                                      */
/*  GET /api/payments                                                   */
/*  Response: Payment[]  (see shape in rowHTML above)                  */
/* ------------------------------------------------------------------ */

async function fetchPayments() {
  setRefreshing(true);
  try {
    const res = await fetch(PAYMENTS_URL, { headers: authHeaders() });
    if (res.status === 401) { clearSession(); window.location.href = LOGIN_PAGE; return; }
    if (!res.ok) throw new Error('Failed to fetch payments');
    allPayments = await res.json();
    updateFinanceCards(allPayments);
    applyFilters();
  } catch (err) {
    console.error('[Payments] Fetch error:', err);
    showToast('Could not load payments. Check server connection.', 'error');
  } finally {
    setRefreshing(false);
  }
}

/* ------------------------------------------------------------------ */
/*  API — Record Payment                                                */
/*                                                                      */
/*  POST /api/payments                                                  */
/*  Request body:                                                       */
/*  {                                                                   */
/*    tenantId, roomNumber, amount, paymentMethod,                      */
/*    forMonth, paidDate, dueDate, status,                              */
/*    transactionId, notes                                              */
/*  }                                                                   */
/*  Response: Payment (created, with receiptNumber)                    */
/* ------------------------------------------------------------------ */

async function createPayment(payload) {
  const res = await fetch(PAYMENTS_URL, {
    method : 'POST',
    headers: authHeaders(),
    body   : JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to record payment');
  }
  return res.json();
}

/* ------------------------------------------------------------------ */
/*  API — Edit Payment                                                  */
/*                                                                      */
/*  PUT /api/payments/{id}                                              */
/*  Request body: same as POST                                          */
/*  Response: Payment (updated)                                         */
/* ------------------------------------------------------------------ */

async function updatePayment(id, payload) {
  const res = await fetch(`${PAYMENTS_URL}/${id}`, {
    method : 'PUT',
    headers: authHeaders(),
    body   : JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to update payment');
  }
  return res.json();
}

/* ------------------------------------------------------------------ */
/*  API — Mark Paid                                                     */
/*                                                                      */
/*  PATCH /api/payments/{id}/mark-paid                                 */
/*  Request body: { paidDate: "YYYY-MM-DD", paymentMethod: "UPI" }    */
/*  Response: Payment (updated, status = PAID)                         */
/* ------------------------------------------------------------------ */

async function markPaid(id) {
  try {
    const res = await fetch(`${PAYMENTS_URL}/${id}/mark-paid`, {
      method : 'PATCH',
      headers: authHeaders(),
      body   : JSON.stringify({
        paidDate     : new Date().toISOString().split('T')[0],
        paymentMethod: 'CASH',
      }),
    });
    if (!res.ok) throw new Error('Failed to mark as paid');
    showToast('Payment marked as paid.', 'success');
    await fetchPayments();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

/* ------------------------------------------------------------------ */
/*  API — Delete Payment                                                */
/*                                                                      */
/*  DELETE /api/payments/{id}                                           */
/*  Response: 204 No Content                                            */
/* ------------------------------------------------------------------ */

async function deletePaymentReq(id) {
  const res = await fetch(`${PAYMENTS_URL}/${id}`, {
    method : 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to delete payment');
  }
}

/* ------------------------------------------------------------------ */
/*  Form Validation                                                     */
/* ------------------------------------------------------------------ */

function clearErrors() {
  ['f-tenant','f-amount','f-for-month','f-paid-date'].forEach(id => {
    document.getElementById(id)?.classList.remove('is-error');
  });
  ['err-tenant','err-amount','err-for-month','err-paid-date'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = '';
  });
}

function showFieldError(inputId, errId, msg) {
  document.getElementById(inputId)?.classList.add('is-error');
  const el = document.getElementById(errId);
  if (el) el.textContent = msg;
}

function validateForm() {
  clearErrors();
  let valid = true;

  if (!fTenant.value) {
    showFieldError('f-tenant', 'err-tenant', 'Please select a tenant.');
    valid = false;
  }

  const amount = parseFloat(fAmount.value);
  if (!fAmount.value || isNaN(amount) || amount <= 0) {
    showFieldError('f-amount', 'err-amount', 'Enter a valid amount.');
    valid = false;
  }

  if (!fForMonth.value) {
    showFieldError('f-for-month', 'err-for-month', 'Please select the payment month.');
    valid = false;
  }

  if (fStatus.value === 'PAID' && !fPaidDate.value) {
    showFieldError('f-paid-date', 'err-paid-date', 'Paid date is required for paid status.');
    valid = false;
  }

  return valid;
}

['f-tenant','f-amount','f-for-month','f-paid-date'].forEach(id => {
  document.getElementById(id)?.addEventListener('change', () => {
    document.getElementById(id)?.classList.remove('is-error');
  });
});

/* ------------------------------------------------------------------ */
/*  Add Modal                                                           */
/* ------------------------------------------------------------------ */

function openAddModal() {
  editingId = null;
  modalTitle.textContent = 'Record Payment';
  submitText.textContent = 'Record Payment';
  paymentForm.reset();
  fPaidDate.value = new Date().toISOString().split('T')[0];
  fForMonth.value = new Date().toISOString().slice(0,7);
  fRoomDisplay.value = '';
  clearErrors();
  populateTenantSelect();
  openModal(paymentModal);
}

/* ------------------------------------------------------------------ */
/*  Edit Modal                                                          */
/* ------------------------------------------------------------------ */

function openEditModal(id) {
  const p = allPayments.find(x => x.id === id);
  if (!p) return;
  editingId = id;
  modalTitle.textContent = `Edit Payment — ${p.receiptNumber || '#' + p.id}`;
  submitText.textContent = 'Save Changes';

  paymentIdInput.value  = p.id;
  fAmount.value         = p.amount || '';
  fMethod.value         = p.paymentMethod || 'UPI';
  fForMonth.value       = p.forMonth || '';
  fPaidDate.value       = p.paidDate || '';
  fDueDate.value        = p.dueDate || '';
  fStatus.value         = p.status || 'PAID';
  fTransactionId.value  = p.transactionId || '';
  fNotes.value          = p.notes || '';
  fRoomDisplay.value    = p.roomNumber ? 'Room ' + p.roomNumber : '';

  clearErrors();
  populateTenantSelect(p.tenantId);
  openModal(paymentModal);
}

/* ------------------------------------------------------------------ */
/*  Form Submit                                                         */
/* ------------------------------------------------------------------ */

paymentForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!validateForm()) return;

  const selectedTenant = allTenants.find(t => t.id == fTenant.value);

  const payload = {
    tenantId     : parseInt(fTenant.value),
    roomNumber   : selectedTenant?.roomNumber || '',
    amount       : parseFloat(fAmount.value),
    paymentMethod: fMethod.value,
    forMonth     : fForMonth.value,
    paidDate     : fPaidDate.value || null,
    dueDate      : fDueDate.value || null,
    status       : fStatus.value,
    transactionId: fTransactionId.value.trim() || null,
    notes        : fNotes.value.trim() || null,
  };

  setSubmitLoading(true);
  try {
    if (editingId) {
      await updatePayment(editingId, payload);
      showToast('Payment updated successfully.', 'success');
    } else {
      await createPayment(payload);
      showToast('Payment recorded successfully.', 'success');
    }
    closeModal(paymentModal);
    await fetchPayments();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    setSubmitLoading(false);
  }
});

/* ------------------------------------------------------------------ */
/*  Receipt Modal                                                       */
/* ------------------------------------------------------------------ */

function openReceiptModal(id) {
  const p = allPayments.find(x => x.id === id);
  if (!p) return;

  receiptBody.innerHTML = `
    <div class="receipt-wrap" id="printable-receipt">
      <div class="receipt-brand">
        <div>
          <div class="receipt-brand-name">Nest<span>Manager</span></div>
          <div class="receipt-brand-tag">Property Management System</div>
        </div>
        <div class="receipt-no">
          Receipt
          <strong>${escapeHtml(p.receiptNumber || '#' + p.id)}</strong>
        </div>
      </div>

      <div>
        <div class="receipt-row">
          <span class="receipt-row-label">Tenant</span>
          <span class="receipt-row-value">${escapeHtml(p.tenantName)}</span>
        </div>
        <div class="receipt-row">
          <span class="receipt-row-label">Phone</span>
          <span class="receipt-row-value">${escapeHtml(p.tenantPhone || '—')}</span>
        </div>
        <div class="receipt-row">
          <span class="receipt-row-label">Room</span>
          <span class="receipt-row-value">Room ${escapeHtml(p.roomNumber)}</span>
        </div>
        <div class="receipt-row">
          <span class="receipt-row-label">For Month</span>
          <span class="receipt-row-value">${formatMonthLabel(p.forMonth)}</span>
        </div>
        <div class="receipt-row">
          <span class="receipt-row-label">Payment Method</span>
          <span class="receipt-row-value">${methodLabel(p.paymentMethod)}</span>
        </div>
        ${p.transactionId ? `
        <div class="receipt-row">
          <span class="receipt-row-label">Transaction ID</span>
          <span class="receipt-row-value">${escapeHtml(p.transactionId)}</span>
        </div>` : ''}
        <div class="receipt-row">
          <span class="receipt-row-label">Due Date</span>
          <span class="receipt-row-value">${formatDate(p.dueDate)}</span>
        </div>
        <div class="receipt-row">
          <span class="receipt-row-label">Paid Date</span>
          <span class="receipt-row-value">${formatDate(p.paidDate)}</span>
        </div>
      </div>

      <div class="receipt-amount-row">
        <span class="receipt-amount-label">Amount Paid</span>
        <span class="receipt-amount-value">${formatCurrency(p.amount)}</span>
      </div>

      <div class="receipt-status-row">
        <span class="status-badge ${statusBadgeCls(p.status)}">${p.status}</span>
      </div>

      ${p.notes ? `<div style="font-size:.78rem;color:var(--text3);font-style:italic">${escapeHtml(p.notes)}</div>` : ''}

      <div class="receipt-footer">
        Thank you for your payment · NestManager Property System
      </div>
    </div>`;

  openModal(receiptModal);
}

printBtn.addEventListener('click', () => window.print());

/* ------------------------------------------------------------------ */
/*  Delete Modal                                                        */
/* ------------------------------------------------------------------ */

function openDeleteModal(id, receiptNo) {
  deletingId = id;
  deleteReceiptNo.textContent = receiptNo;
  openModal(deleteModal);
}

deleteConfirm.addEventListener('click', async () => {
  if (!deletingId) return;
  setDeleteLoading(true);
  try {
    await deletePaymentReq(deletingId);
    showToast('Payment record deleted.', 'info');
    closeModal(deleteModal);
    await fetchPayments();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    setDeleteLoading(false);
    deletingId = null;
  }
});

/* ------------------------------------------------------------------ */
/*  Modal Helpers                                                       */
/* ------------------------------------------------------------------ */

function openModal(overlay)  { overlay.classList.add('open');    document.body.style.overflow = 'hidden'; }
function closeModal(overlay) { overlay.classList.remove('open'); document.body.style.overflow = ''; }

paymentModal.addEventListener('click', e => { if (e.target === paymentModal) closeModal(paymentModal); });
receiptModal.addEventListener('click', e => { if (e.target === receiptModal) closeModal(receiptModal); });
deleteModal.addEventListener('click',  e => { if (e.target === deleteModal)  closeModal(deleteModal); });

document.getElementById('modal-close').addEventListener('click',        () => closeModal(paymentModal));
document.getElementById('modal-cancel').addEventListener('click',       () => closeModal(paymentModal));
document.getElementById('receipt-close').addEventListener('click',      () => closeModal(receiptModal));
document.getElementById('delete-modal-close').addEventListener('click', () => closeModal(deleteModal));
document.getElementById('delete-cancel').addEventListener('click',      () => closeModal(deleteModal));

function setSubmitLoading(on) {
  modalSubmitBtn.disabled = on;
  submitSpinner.classList.toggle('hidden', !on);
  submitText.textContent = on ? (editingId ? 'Saving...' : 'Recording...') : (editingId ? 'Save Changes' : 'Record Payment');
}

function setDeleteLoading(on) {
  deleteConfirm.disabled = on;
  deleteSpinner.classList.toggle('hidden', !on);
  deleteText.textContent = on ? 'Deleting...' : 'Delete';
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

monthFilter.addEventListener('change',  () => { activeMonth  = monthFilter.value;  applyFilters(); });
methodFilter.addEventListener('change', () => { activeMethod = methodFilter.value; applyFilters(); });
searchInput.addEventListener('input',   () => { searchQuery  = searchInput.value.trim().toLowerCase(); applyFilters(); });

document.getElementById('add-payment-btn').addEventListener('click', openAddModal);
document.getElementById('empty-add-btn').addEventListener('click', openAddModal);

/* ------------------------------------------------------------------ */
/*  Refresh / Sidebar / Logout                                         */
/* ------------------------------------------------------------------ */

refreshBtn.addEventListener('click', fetchPayments);
function setRefreshing(on) { refreshBtn.classList.toggle('spinning', on); refreshBtn.disabled = on; }

menuToggle.addEventListener('click', () => {
  sidebar.classList.toggle('open');
  sidebarOverlay.classList.toggle('visible', sidebar.classList.contains('open'));
});
sidebarOverlay.addEventListener('click', () => {
  sidebar.classList.remove('open');
  sidebarOverlay.classList.remove('visible');
});

logoutBtn.addEventListener('click', async () => {
  try { await fetch(`${API_BASE}/api/auth/logout`, { method:'POST', headers:authHeaders() }); } catch (_) {}
  clearSession();
  window.location.href = LOGIN_PAGE;
});

/* ------------------------------------------------------------------ */
/*  Toast                                                               */
/* ------------------------------------------------------------------ */

function showToast(msg, type = 'info') {
  const icons = { success:'✓', error:'✕', info:'i' };
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
  guardAuth();    // uncomment when backend is ready
  setDate();
  populateUserInfo();

  // Set default month filter to current month
  monthFilter.value = new Date().toISOString().slice(0, 7);

  // Dummy active tenants for modal dropdown
  // allTenants = [
  //   { id:1,  name:'Arjun Sharma',  phone:'+91 98765 43210', roomNumber:'101', rentPerMonth:5500  },
  //   { id:2,  name:'Priya Nair',    phone:'+91 87654 32109', roomNumber:'102', rentPerMonth:3500  },
  //   { id:3,  name:'Mohammed Ali',  phone:'+91 76543 21098', roomNumber:'102', rentPerMonth:3500  },
  //   { id:4,  name:'Sneha Patel',   phone:'+91 65432 10987', roomNumber:'103', rentPerMonth:4000  },
  //   { id:5,  name:'Vikram Singh',  phone:'+91 54321 09876', roomNumber:'201', rentPerMonth:7500  },
  //   { id:6,  name:'Kavitha Rajan', phone:'+91 43210 98765', roomNumber:'103', rentPerMonth:4000  },
  //   { id:7,  name:'Ravi Kumar',    phone:'+91 32109 87654', roomNumber:'202', rentPerMonth:12000 },
  //   { id:8,  name:'Ananya Das',    phone:'+91 21098 76543', roomNumber:'204', rentPerMonth:6000  },
  // ];

  // // Dummy payments — matches tenants & rooms from other pages
  // allPayments = [
  //   { id:1,  receiptNumber:'REC-001', tenantId:1, tenantName:'Arjun Sharma',  tenantPhone:'+91 98765 43210', roomNumber:'101', forMonth:'2025-03', amount:5500,  paymentMethod:'UPI',           transactionId:'UPI25030001', dueDate:'2025-03-05', paidDate:'2025-03-03', status:'PAID',    notes:null },
  //   { id:2,  receiptNumber:'REC-002', tenantId:2, tenantName:'Priya Nair',    tenantPhone:'+91 87654 32109', roomNumber:'102', forMonth:'2025-03', amount:3500,  paymentMethod:'CASH',          transactionId:null,         dueDate:'2025-03-05', paidDate:'2025-03-06', status:'PAID',    notes:null },
  //   { id:3,  receiptNumber:'REC-003', tenantId:3, tenantName:'Mohammed Ali',  tenantPhone:'+91 76543 21098', roomNumber:'102', forMonth:'2025-03', amount:3500,  paymentMethod:null,            transactionId:null,         dueDate:'2025-03-05', paidDate:null,         status:'OVERDUE', notes:'Not reachable on phone.' },
  //   { id:4,  receiptNumber:'REC-004', tenantId:4, tenantName:'Sneha Patel',   tenantPhone:'+91 65432 10987', roomNumber:'103', forMonth:'2025-03', amount:4000,  paymentMethod:'UPI',           transactionId:'UPI25030004', dueDate:'2025-03-05', paidDate:'2025-03-04', status:'PAID',    notes:null },
  //   { id:5,  receiptNumber:'REC-005', tenantId:5, tenantName:'Vikram Singh',  tenantPhone:'+91 54321 09876', roomNumber:'201', forMonth:'2025-03', amount:7500,  paymentMethod:'BANK_TRANSFER', transactionId:'NEFT25030005',dueDate:'2025-03-05', paidDate:'2025-03-05', status:'PAID',    notes:null },
  //   { id:6,  receiptNumber:'REC-006', tenantId:6, tenantName:'Kavitha Rajan', tenantPhone:'+91 43210 98765', roomNumber:'103', forMonth:'2025-03', amount:4000,  paymentMethod:null,            transactionId:null,         dueDate:'2025-03-05', paidDate:null,         status:'OVERDUE', notes:'Promised to pay by 20th.' },
  //   { id:7,  receiptNumber:'REC-007', tenantId:7, tenantName:'Ravi Kumar',    tenantPhone:'+91 32109 87654', roomNumber:'202', forMonth:'2025-03', amount:12000, paymentMethod:'UPI',           transactionId:'UPI25030007', dueDate:'2025-03-05', paidDate:'2025-03-07', status:'PAID',    notes:null },
  //   { id:8,  receiptNumber:'REC-008', tenantId:8, tenantName:'Ananya Das',    tenantPhone:'+91 21098 76543', roomNumber:'204', forMonth:'2025-03', amount:6000,  paymentMethod:null,            transactionId:null,         dueDate:'2025-03-05', paidDate:null,         status:'PENDING', notes:null },
  //   { id:9,  receiptNumber:'REC-009', tenantId:1, tenantName:'Arjun Sharma',  tenantPhone:'+91 98765 43210', roomNumber:'101', forMonth:'2025-02', amount:5500,  paymentMethod:'UPI',           transactionId:'UPI25020001', dueDate:'2025-02-05', paidDate:'2025-02-04', status:'PAID',    notes:null },
  //   { id:10, receiptNumber:'REC-010', tenantId:5, tenantName:'Vikram Singh',  tenantPhone:'+91 54321 09876', roomNumber:'201', forMonth:'2025-02', amount:7500,  paymentMethod:'BANK_TRANSFER', transactionId:'NEFT25020005',dueDate:'2025-02-05', paidDate:'2025-02-05', status:'PAID',    notes:null },
  //   { id:11, receiptNumber:'REC-011', tenantId:2, tenantName:'Priya Nair',    tenantPhone:'+91 87654 32109', roomNumber:'102', forMonth:'2025-03', amount:3500,  paymentMethod:null,            transactionId:null,         dueDate:'2025-03-05', paidDate:null,         status:'PENDING', notes:null },
  //   { id:12, receiptNumber:'REC-012', tenantId:7, tenantName:'Ravi Kumar',    tenantPhone:'+91 32109 87654', roomNumber:'202', forMonth:'2025-02', amount:12000, paymentMethod:'CHEQUE',        transactionId:'CHQ-00123',  dueDate:'2025-02-05', paidDate:'2025-02-06', status:'PAID',    notes:'Cheque no. 00123' },
  // ];

  updateFinanceCards(allPayments);
  applyFilters();

  fetchPayments();      // uncomment when backend is ready
  loadActiveTenants();  // uncomment when backend is ready — for modal dropdown
})();
