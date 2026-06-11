/**
 * bookings.js — NestManager Bookings Page
 *
 * Responsibilities (UI only):
 *  - Auth guard: redirect to login if no token
 *  - Fetch all bookings         GET    /api/bookings
 *  - Fetch vacant rooms         GET    /api/rooms?status=VACANT  (room dropdown)
 *  - Create new booking         POST   /api/bookings
 *  - Edit existing booking      PUT    /api/bookings/{id}
 *  - Cancel booking             PATCH  /api/bookings/{id}/cancel
 *  - Confirm pending booking    PATCH  /api/bookings/{id}/confirm
 *  - Check-in guest             PATCH  /api/bookings/{id}/checkin
 *  - Check-out guest            PATCH  /api/bookings/{id}/checkout
 *  - Render bookings table
 *  - Filter by status tabs
 *  - Filter by month
 *  - Live search (guest name, room, booking ID)
 *  - Summary strip counts + total revenue
 *  - Detail modal (read-only)
 *  - Add/Edit modal with validation
 *  - Cancel confirm modal
 *  - Toast notifications
 *  - Mobile sidebar toggle
 */

'use strict';

/* ------------------------------------------------------------------ */
/*  Config                                                              */
/* ------------------------------------------------------------------ */

// Production
const API_BASE = 'https://nestmanager.onrender.com';

// Local testing
// const API_BASE = 'http://localhost:8080';
const BOOKINGS_URL     = `${API_BASE}/api/bookings`;
const VACANT_ROOMS_URL = `${API_BASE}/api/rooms?status=VACANT`;
const LOGIN_PAGE       = '../login/login.html';

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

// Summary
const sumTotal     = document.getElementById('sum-total');
const sumConfirmed = document.getElementById('sum-confirmed');
const sumPending   = document.getElementById('sum-pending');
const sumCancelled = document.getElementById('sum-cancelled');
const sumCheckedIn = document.getElementById('sum-checkedin');
const sumRevenue   = document.getElementById('sum-revenue');

// Toolbar
const filterBtns   = document.querySelectorAll('.filter-btn');
const monthFilter  = document.getElementById('month-filter');
const searchInput  = document.getElementById('search-input');

// Table
const bookingsTbody = document.getElementById('bookings-tbody');
const emptyState    = document.getElementById('empty-state');

// Add/Edit modal
const bookingModal   = document.getElementById('booking-modal');
const modalTitle     = document.getElementById('modal-title');
const bookingForm    = document.getElementById('booking-form');
const bookingIdInput = document.getElementById('booking-id');
const fGuestName     = document.getElementById('f-guest-name');
const fGuestPhone    = document.getElementById('f-guest-phone');
const fGuestEmail    = document.getElementById('f-guest-email');
const fGuestsCount   = document.getElementById('f-guests-count');
const fRoom          = document.getElementById('f-room');
const fBookingType   = document.getElementById('f-booking-type');
const fCheckin       = document.getElementById('f-checkin');
const fCheckout      = document.getElementById('f-checkout');
const fAmount        = document.getElementById('f-amount');
const fAdvance       = document.getElementById('f-advance');
const fStatus        = document.getElementById('f-status');
const fPaymentStatus = document.getElementById('f-payment-status');
const fNotes         = document.getElementById('f-notes');
const submitText     = document.getElementById('submit-text');
const submitSpinner  = document.getElementById('submit-spinner');
const modalSubmitBtn = document.getElementById('modal-submit');

// Detail modal
const detailModal = document.getElementById('detail-modal');
const detailBody  = document.getElementById('detail-body');

// Cancel modal
const cancelModal      = document.getElementById('cancel-modal');
const cancelBookingId  = document.getElementById('cancel-booking-id');
const cancelGuestName  = document.getElementById('cancel-guest-name');
const cancelYes        = document.getElementById('cancel-yes');
const cancelText       = document.getElementById('cancel-text');
const cancelSpinner    = document.getElementById('cancel-spinner');

/* ------------------------------------------------------------------ */
/*  State                                                               */
/* ------------------------------------------------------------------ */

let allBookings      = [];
let filteredBookings = [];
let activeFilter     = 'ALL';
let searchQuery      = '';
let activeMonth      = '';
let editingId        = null;
let cancellingId     = null;

/* ------------------------------------------------------------------ */
/*  Avatar colors                                                       */
/* ------------------------------------------------------------------ */

const AVATAR_COLORS = ['#3b82f6','#10b981','#8b5cf6','#f59e0b','#ef4444','#06b6d4','#ec4899','#f97316'];

function avatarColor(name) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

function initials(name) {
  return (name || '').trim().split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
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

function formatRole(role) {
  const map = { ADMIN:'Owner / Admin', MANAGER:'Manager', STAFF:'Staff' };
  return map[role] || role;
}

function bookingTypeLabel(type) {
  const map = { MONTHLY:'Monthly', WEEKLY:'Weekly', DAILY:'Daily' };
  return map[type] || type;
}

function bookingTypeBadgeCls(type) {
  const map = { MONTHLY:'type-badge--monthly', WEEKLY:'type-badge--weekly', DAILY:'type-badge--daily' };
  return map[type] || 'type-badge--monthly';
}

function statusBadgeCls(status) {
  const map = {
    CONFIRMED  : 'status-badge--confirmed',
    PENDING    : 'status-badge--pending',
    CHECKED_IN : 'status-badge--checked-in',
    CHECKED_OUT: 'status-badge--checked-out',
    CANCELLED  : 'status-badge--cancelled',
  };
  return map[status] || 'status-badge--pending';
}

function statusLabel(status) {
  const map = {
    CONFIRMED  : 'Confirmed',
    PENDING    : 'Pending',
    CHECKED_IN : 'Checked In',
    CHECKED_OUT: 'Checked Out',
    CANCELLED  : 'Cancelled',
  };
  return map[status] || status;
}

function payBadgeCls(status) {
  const map = { PAID:'pay-badge--paid', PARTIAL:'pay-badge--partial', UNPAID:'pay-badge--unpaid' };
  return map[status] || 'pay-badge--unpaid';
}

/* ------------------------------------------------------------------ */
/*  User info & date                                                    */
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
/*  Summary Strip                                                       */
/* ------------------------------------------------------------------ */

/**
 * Calculates and renders the summary strip.
 * Revenue = sum of amount for all non-cancelled bookings.
 * @param {Array} bookings
 */
function updateSummary(bookings) {
  const total      = bookings.length;
  const confirmed  = bookings.filter(b => b.status === 'CONFIRMED').length;
  const pending    = bookings.filter(b => b.status === 'PENDING').length;
  const cancelled  = bookings.filter(b => b.status === 'CANCELLED').length;
  const checkedIn  = bookings.filter(b => b.status === 'CHECKED_IN').length;
  const revenue    = bookings
    .filter(b => b.status !== 'CANCELLED')
    .reduce((sum, b) => sum + (b.amount || 0), 0);

  sumTotal.textContent     = total;
  sumConfirmed.textContent = confirmed;
  sumPending.textContent   = pending;
  sumCancelled.textContent = cancelled;
  sumCheckedIn.textContent = checkedIn;
  sumRevenue.textContent   = formatCurrency(revenue);
  pageSub.textContent      = `${total} bookings · ${confirmed} confirmed · ${pending} pending`;
}

/* ------------------------------------------------------------------ */
/*  Filters                                                             */
/* ------------------------------------------------------------------ */

function applyFilters() {
  filteredBookings = allBookings.filter(b => {
    const matchStatus = activeFilter === 'ALL' || b.status === activeFilter;
    const matchMonth  = !activeMonth || (b.checkInDate && b.checkInDate.startsWith(activeMonth));
    const matchSearch = !searchQuery || [
      b.guestName, b.roomNumber, b.bookingCode,
    ].some(v => (v || '').toLowerCase().includes(searchQuery));
    return matchStatus && matchMonth && matchSearch;
  });
  renderTable();
}

/* ------------------------------------------------------------------ */
/*  Render Table                                                        */
/* ------------------------------------------------------------------ */

/**
 * Renders a single booking row.
 *
 * Expected Booking object from GET /api/bookings:
 * {
 *   id            : number,
 *   bookingCode   : string,      e.g. "BK-001"
 *   guestName     : string,
 *   guestPhone    : string,
 *   guestEmail    : string|null,
 *   guestsCount   : number,
 *   roomId        : number,
 *   roomNumber    : string,
 *   bookingType   : "MONTHLY"|"WEEKLY"|"DAILY",
 *   checkInDate   : string,      ISO date
 *   checkOutDate  : string|null,
 *   amount        : number,
 *   advancePaid   : number,
 *   status        : "CONFIRMED"|"PENDING"|"CHECKED_IN"|"CHECKED_OUT"|"CANCELLED",
 *   paymentStatus : "PAID"|"PARTIAL"|"UNPAID",
 *   notes         : string|null,
 * }
 *
 * @param {Object} b  booking
 * @returns {string}  HTML string
 */
function rowHTML(b) {
  const color     = avatarColor(b.guestName);
  const inits     = initials(b.guestName);
  const isCancelled  = b.status === 'CANCELLED';
  const isCheckedOut = b.status === 'CHECKED_OUT';
  const canConfirm   = b.status === 'PENDING';
  const canCheckin   = b.status === 'CONFIRMED';
  const canCheckout  = b.status === 'CHECKED_IN';
  const canCancel    = !isCancelled && !isCheckedOut;

  return `
    <tr data-id="${b.id}" onclick="openDetailModal(${b.id})">
      <td>
        <span class="booking-id-cell">${escapeHtml(b.bookingCode || '#' + b.id)}</span>
      </td>
      <td>
        <div class="guest-cell">
          <div class="guest-avatar" style="background:${color}">${escapeHtml(inits)}</div>
          <div>
            <div class="guest-name">${escapeHtml(b.guestName)}</div>
            <div class="guest-phone">${escapeHtml(b.guestPhone)}</div>
          </div>
        </div>
      </td>
      <td>
        ${b.roomNumber ? `<span class="room-badge">Room ${escapeHtml(b.roomNumber)}</span>` : '<span style="color:var(--text3)">—</span>'}
      </td>
      <td>
        <span class="type-badge ${bookingTypeBadgeCls(b.bookingType)}">${bookingTypeLabel(b.bookingType)}</span>
      </td>
      <td style="color:var(--text2)">${formatDate(b.checkInDate)}</td>
      <td style="color:var(--text2)">${formatDate(b.checkOutDate)}</td>
      <td>
        <span style="color:var(--text);font-weight:500">${formatCurrency(b.amount)}</span>
        <span class="pay-badge ${payBadgeCls(b.paymentStatus)}">${b.paymentStatus || 'UNPAID'}</span>
      </td>
      <td>
        <span class="status-badge ${statusBadgeCls(b.status)}">${statusLabel(b.status)}</span>
      </td>
      <td onclick="event.stopPropagation()">
        <div class="table-actions">
          ${canConfirm  ? `<button class="btn btn-success btn-sm"   onclick="confirmBooking(${b.id})">Confirm</button>` : ''}
          ${canCheckin  ? `<button class="btn btn-primary btn-sm"   onclick="checkinBooking(${b.id})">Check-in</button>` : ''}
          ${canCheckout ? `<button class="btn btn-warning btn-sm"   onclick="checkoutBooking(${b.id})">Check-out</button>` : ''}
          <button class="btn btn-secondary btn-sm" onclick="openEditModal(${b.id})">Edit</button>
          ${canCancel   ? `<button class="btn btn-danger btn-sm"    onclick="openCancelModal(${b.id}, '${escapeHtml(b.bookingCode || '#'+b.id)}', '${escapeHtml(b.guestName)}')">Cancel</button>` : ''}
        </div>
      </td>
    </tr>`;
}

function renderTable() {
  if (filteredBookings.length === 0) {
    bookingsTbody.innerHTML = '';
    emptyState.classList.remove('hidden');
    return;
  }
  emptyState.classList.add('hidden');
  bookingsTbody.innerHTML = filteredBookings.map(rowHTML).join('');
}

/* ------------------------------------------------------------------ */
/*  Room dropdown                                                       */
/* ------------------------------------------------------------------ */

/**
 * Loads vacant rooms into the room select in the modal.
 * GET /api/rooms?status=VACANT
 * @param {string|null} currentRoom  current room in edit mode
 */
async function loadVacantRooms(currentRoom = null) {
  try {
    const res = await fetch(VACANT_ROOMS_URL, { headers: authHeaders() });
    if (!res.ok) throw new Error();
    const rooms = await res.json();
    fRoom.innerHTML = '<option value="">-- Select Room --</option>';
    if (currentRoom) {
      fRoom.innerHTML += `<option value="${escapeHtml(currentRoom)}">Room ${escapeHtml(currentRoom)} (Current)</option>`;
    }
    rooms.forEach(r => {
      if (r.roomNumber !== currentRoom) {
        fRoom.innerHTML += `<option value="${escapeHtml(r.roomNumber)}">Room ${escapeHtml(r.roomNumber)} — ${escapeHtml(r.type)} (${formatCurrency(r.pricePerMonth)}/mo)</option>`;
      }
    });
  } catch {
    fRoom.innerHTML = '<option value="">Could not load rooms</option>';
  }
}

/* ------------------------------------------------------------------ */
/*  API — Fetch Bookings                                                */
/*                                                                      */
/*  GET /api/bookings                                                   */
/*  Response: Booking[]  (see shape in rowHTML above)                  */
/* ------------------------------------------------------------------ */

async function fetchBookings() {
  setRefreshing(true);
  try {
    const res = await fetch(BOOKINGS_URL, { headers: authHeaders() });
    if (res.status === 401) { clearSession(); window.location.href = LOGIN_PAGE; return; }
    if (!res.ok) throw new Error('Failed to fetch bookings');
    allBookings = await res.json();
    updateSummary(allBookings);
    applyFilters();
  } catch (err) {
    console.error('[Bookings] Fetch error:', err);
    showToast('Could not load bookings. Check server connection.', 'error');
  } finally {
    setRefreshing(false);
  }
}

/* ------------------------------------------------------------------ */
/*  API — Create Booking                                                */
/*                                                                      */
/*  POST /api/bookings                                                  */
/*  Request body:                                                       */
/*  {                                                                   */
/*    guestName, guestPhone, guestEmail, guestsCount,                  */
/*    roomNumber, bookingType, checkInDate, checkOutDate,               */
/*    amount, advancePaid, status, paymentStatus, notes                 */
/*  }                                                                   */
/*  Response: Booking (created, with id + bookingCode)                 */
/* ------------------------------------------------------------------ */

async function createBooking(payload) {
  const res = await fetch(BOOKINGS_URL, {
    method : 'POST',
    headers: authHeaders(),
    body   : JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to create booking');
  }
  return res.json();
}

/* ------------------------------------------------------------------ */
/*  API — Edit Booking                                                  */
/*                                                                      */
/*  PUT /api/bookings/{id}                                              */
/*  Request body: same as POST                                          */
/*  Response: Booking (updated)                                         */
/* ------------------------------------------------------------------ */

async function updateBooking(id, payload) {
  const res = await fetch(`${BOOKINGS_URL}/${id}`, {
    method : 'PUT',
    headers: authHeaders(),
    body   : JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to update booking');
  }
  return res.json();
}

/* ------------------------------------------------------------------ */
/*  API — Status transition helpers                                     */
/*                                                                      */
/*  PATCH /api/bookings/{id}/confirm   → status = CONFIRMED            */
/*  PATCH /api/bookings/{id}/checkin   → status = CHECKED_IN           */
/*  PATCH /api/bookings/{id}/checkout  → status = CHECKED_OUT          */
/*  PATCH /api/bookings/{id}/cancel    → status = CANCELLED            */
/*  Response: Booking (updated)                                         */
/* ------------------------------------------------------------------ */

async function patchBookingStatus(id, action) {
  const res = await fetch(`${BOOKINGS_URL}/${id}/${action}`, {
    method : 'PATCH',
    headers: authHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Failed to ${action} booking`);
  }
  return res.json();
}

/* ------------------------------------------------------------------ */
/*  Quick status actions (called from table row buttons)               */
/* ------------------------------------------------------------------ */

async function confirmBooking(id) {
  try {
    await patchBookingStatus(id, 'confirm');
    showToast('Booking confirmed successfully.', 'success');
    await fetchBookings();
  } catch (err) { showToast(err.message, 'error'); }
}

async function checkinBooking(id) {
  try {
    await patchBookingStatus(id, 'checkin');
    showToast('Guest checked in successfully.', 'success');
    await fetchBookings();
  } catch (err) { showToast(err.message, 'error'); }
}

async function checkoutBooking(id) {
  try {
    await patchBookingStatus(id, 'checkout');
    showToast('Guest checked out successfully.', 'success');
    await fetchBookings();
  } catch (err) { showToast(err.message, 'error'); }
}

/* ------------------------------------------------------------------ */
/*  Form Validation                                                     */
/* ------------------------------------------------------------------ */

function clearErrors() {
  ['f-guest-name','f-guest-phone','f-room','f-checkin','f-amount'].forEach(id => {
    document.getElementById(id)?.classList.remove('is-error');
  });
  ['err-guest-name','err-guest-phone','err-room','err-checkin','err-amount'].forEach(id => {
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

  if (!fGuestName.value.trim()) {
    showFieldError('f-guest-name', 'err-guest-name', 'Guest name is required.');
    valid = false;
  }

  const phone = fGuestPhone.value.trim();
  if (!phone) {
    showFieldError('f-guest-phone', 'err-guest-phone', 'Phone number is required.');
    valid = false;
  } else if (!/^[+\d\s\-]{7,15}$/.test(phone)) {
    showFieldError('f-guest-phone', 'err-guest-phone', 'Enter a valid phone number.');
    valid = false;
  }

  if (!fRoom.value) {
    showFieldError('f-room', 'err-room', 'Please select a room.');
    valid = false;
  }

  if (!fCheckin.value) {
    showFieldError('f-checkin', 'err-checkin', 'Check-in date is required.');
    valid = false;
  }

  const amount = parseFloat(fAmount.value);
  if (!fAmount.value || isNaN(amount) || amount < 0) {
    showFieldError('f-amount', 'err-amount', 'Enter a valid amount.');
    valid = false;
  }

  return valid;
}

['f-guest-name','f-guest-phone','f-room','f-checkin','f-amount'].forEach(id => {
  document.getElementById(id)?.addEventListener('input', () => {
    document.getElementById(id)?.classList.remove('is-error');
  });
});

/* ------------------------------------------------------------------ */
/*  Add Modal                                                           */
/* ------------------------------------------------------------------ */

function openAddModal() {
  editingId = null;
  modalTitle.textContent = 'New Booking';
  submitText.textContent = 'Create Booking';
  bookingForm.reset();
  fCheckin.value = new Date().toISOString().split('T')[0];
  fGuestsCount.value = '1';
  clearErrors();
  loadVacantRooms();
  openModal(bookingModal);
}

/* ------------------------------------------------------------------ */
/*  Edit Modal                                                          */
/* ------------------------------------------------------------------ */

function openEditModal(id) {
  const b = allBookings.find(x => x.id === id);
  if (!b) return;
  editingId = id;
  modalTitle.textContent = `Edit Booking ${b.bookingCode || '#' + b.id}`;
  submitText.textContent = 'Save Changes';

  bookingIdInput.value     = b.id;
  fGuestName.value         = b.guestName || '';
  fGuestPhone.value        = b.guestPhone || '';
  fGuestEmail.value        = b.guestEmail || '';
  fGuestsCount.value       = b.guestsCount || 1;
  fBookingType.value       = b.bookingType || 'MONTHLY';
  fCheckin.value           = b.checkInDate || '';
  fCheckout.value          = b.checkOutDate || '';
  fAmount.value            = b.amount || '';
  fAdvance.value           = b.advancePaid || '';
  fStatus.value            = b.status || 'CONFIRMED';
  fPaymentStatus.value     = b.paymentStatus || 'UNPAID';
  fNotes.value             = b.notes || '';

  clearErrors();
  loadVacantRooms(b.roomNumber).then(() => { fRoom.value = b.roomNumber || ''; });
  openModal(bookingModal);
}

/* ------------------------------------------------------------------ */
/*  Form Submit                                                         */
/* ------------------------------------------------------------------ */

bookingForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!validateForm()) return;

  const payload = {
    guestName    : fGuestName.value.trim(),
    guestPhone   : fGuestPhone.value.trim(),
    guestEmail   : fGuestEmail.value.trim() || null,
    guestsCount  : parseInt(fGuestsCount.value) || 1,
    roomNumber   : fRoom.value,
    bookingType  : fBookingType.value,
    checkInDate  : fCheckin.value,
    checkOutDate : fCheckout.value || null,
    amount       : parseFloat(fAmount.value),
    advancePaid  : parseFloat(fAdvance.value) || 0,
    status       : fStatus.value,
    paymentStatus: fPaymentStatus.value,
    notes        : fNotes.value.trim() || null,
  };

  setSubmitLoading(true);
  try {
    if (editingId) {
      await updateBooking(editingId, payload);
      showToast('Booking updated successfully.', 'success');
    } else {
      await createBooking(payload);
      showToast(`Booking created for ${payload.guestName}.`, 'success');
    }
    closeModal(bookingModal);
    await fetchBookings();
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
  const b = allBookings.find(x => x.id === id);
  if (!b) return;

  detailBody.innerHTML = `
    <div class="detail-header-row">
      <div>
        <div class="detail-booking-id">${escapeHtml(b.bookingCode || '#' + b.id)}</div>
        <div class="detail-guest-name">${escapeHtml(b.guestName)}</div>
        <div class="detail-guest-phone">${escapeHtml(b.guestPhone)}${b.guestEmail ? ' · ' + escapeHtml(b.guestEmail) : ''}</div>
      </div>
      <span class="status-badge ${statusBadgeCls(b.status)}" style="margin-left:auto;">${statusLabel(b.status)}</span>
    </div>
    <div class="detail-grid">
      <div class="detail-item">
        <div class="detail-item-label">Room</div>
        <div class="detail-item-value">${b.roomNumber ? 'Room ' + escapeHtml(b.roomNumber) : '—'}</div>
      </div>
      <div class="detail-item">
        <div class="detail-item-label">Booking Type</div>
        <div class="detail-item-value">${bookingTypeLabel(b.bookingType)}</div>
      </div>
      <div class="detail-item">
        <div class="detail-item-label">Check-in</div>
        <div class="detail-item-value">${formatDate(b.checkInDate)}</div>
      </div>
      <div class="detail-item">
        <div class="detail-item-label">Check-out</div>
        <div class="detail-item-value">${formatDate(b.checkOutDate)}</div>
      </div>
      <div class="detail-item">
        <div class="detail-item-label">Amount</div>
        <div class="detail-item-value">${formatCurrency(b.amount)}</div>
      </div>
      <div class="detail-item">
        <div class="detail-item-label">Advance Paid</div>
        <div class="detail-item-value">${formatCurrency(b.advancePaid)}</div>
      </div>
      <div class="detail-item">
        <div class="detail-item-label">Payment Status</div>
        <div class="detail-item-value">
          <span class="pay-badge ${payBadgeCls(b.paymentStatus)}">${b.paymentStatus || 'UNPAID'}</span>
        </div>
      </div>
      <div class="detail-item">
        <div class="detail-item-label">No. of Guests</div>
        <div class="detail-item-value">${b.guestsCount || 1}</div>
      </div>
      ${b.notes ? `
      <div class="detail-item" style="grid-column:1/-1">
        <div class="detail-item-label">Notes</div>
        <div class="detail-item-value">${escapeHtml(b.notes)}</div>
      </div>` : ''}
    </div>
    <div class="detail-actions">
      <button class="btn btn-secondary btn-sm" onclick="closeModal(document.getElementById('detail-modal')); openEditModal(${b.id});">Edit</button>
      ${b.status === 'PENDING'     ? `<button class="btn btn-success btn-sm"   onclick="closeModal(document.getElementById('detail-modal')); confirmBooking(${b.id});">Confirm</button>`  : ''}
      ${b.status === 'CONFIRMED'   ? `<button class="btn btn-primary btn-sm"   onclick="closeModal(document.getElementById('detail-modal')); checkinBooking(${b.id});">Check-in</button>` : ''}
      ${b.status === 'CHECKED_IN'  ? `<button class="btn btn-warning btn-sm"   onclick="closeModal(document.getElementById('detail-modal')); checkoutBooking(${b.id});">Check-out</button>` : ''}
      ${b.status !== 'CANCELLED' && b.status !== 'CHECKED_OUT'
        ? `<button class="btn btn-danger btn-sm" onclick="closeModal(document.getElementById('detail-modal')); openCancelModal(${b.id}, '${escapeHtml(b.bookingCode||'#'+b.id)}', '${escapeHtml(b.guestName)}');">Cancel</button>` : ''}
    </div>`;

  openModal(detailModal);
}

/* ------------------------------------------------------------------ */
/*  Cancel Modal                                                        */
/* ------------------------------------------------------------------ */

function openCancelModal(id, code, guestName) {
  cancellingId = id;
  cancelBookingId.textContent  = code;
  cancelGuestName.textContent  = guestName;
  openModal(cancelModal);
}

cancelYes.addEventListener('click', async () => {
  if (!cancellingId) return;
  setCancelLoading(true);
  try {
    await patchBookingStatus(cancellingId, 'cancel');
    showToast('Booking cancelled successfully.', 'info');
    closeModal(cancelModal);
    await fetchBookings();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    setCancelLoading(false);
    cancellingId = null;
  }
});

/* ------------------------------------------------------------------ */
/*  Modal helpers                                                       */
/* ------------------------------------------------------------------ */

function openModal(overlay)  { overlay.classList.add('open');    document.body.style.overflow = 'hidden'; }
function closeModal(overlay) { overlay.classList.remove('open'); document.body.style.overflow = ''; }

bookingModal.addEventListener('click', e => { if (e.target === bookingModal) closeModal(bookingModal); });
detailModal.addEventListener('click',  e => { if (e.target === detailModal)  closeModal(detailModal); });
cancelModal.addEventListener('click',  e => { if (e.target === cancelModal)  closeModal(cancelModal); });

document.getElementById('modal-close').addEventListener('click',        () => closeModal(bookingModal));
document.getElementById('modal-cancel').addEventListener('click',       () => closeModal(bookingModal));
document.getElementById('detail-close').addEventListener('click',       () => closeModal(detailModal));
document.getElementById('cancel-modal-close').addEventListener('click', () => closeModal(cancelModal));
document.getElementById('cancel-no').addEventListener('click',          () => closeModal(cancelModal));

function setSubmitLoading(on) {
  modalSubmitBtn.disabled = on;
  submitSpinner.classList.toggle('hidden', !on);
  submitText.textContent = on ? (editingId ? 'Saving...' : 'Creating...') : (editingId ? 'Save Changes' : 'Create Booking');
}

function setCancelLoading(on) {
  cancelYes.disabled = on;
  cancelSpinner.classList.toggle('hidden', !on);
  cancelText.textContent = on ? 'Cancelling...' : 'Cancel Booking';
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

monthFilter.addEventListener('change', () => {
  activeMonth = monthFilter.value;
  applyFilters();
});

searchInput.addEventListener('input', () => {
  searchQuery = searchInput.value.trim().toLowerCase();
  applyFilters();
});

document.getElementById('add-booking-btn').addEventListener('click', openAddModal);
document.getElementById('empty-add-btn').addEventListener('click', openAddModal);

/* ------------------------------------------------------------------ */
/*  Refresh / Sidebar / Logout                                         */
/* ------------------------------------------------------------------ */

refreshBtn.addEventListener('click', fetchBookings);

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

  // ── Dummy data (matches rooms + tenants) ──
  // allBookings = [
  //   { id:1,  bookingCode:'BK-001', guestName:'Ravi Shankar',    guestPhone:'+91 91234 56789', guestEmail:'ravi.s@email.com',   guestsCount:1, roomNumber:'104', bookingType:'MONTHLY', checkInDate:'2025-03-20', checkOutDate:'2025-04-20', amount:5500,  advancePaid:2000, status:'CONFIRMED',   paymentStatus:'PARTIAL', notes:'Ground floor preferred.' },
  //   { id:2,  bookingCode:'BK-002', guestName:'Meena Kumari',    guestPhone:'+91 82345 67890', guestEmail:'meena@email.com',    guestsCount:1, roomNumber:'204', bookingType:'MONTHLY', checkInDate:'2025-03-22', checkOutDate:'2025-04-22', amount:6000,  advancePaid:0,    status:'PENDING',     paymentStatus:'UNPAID',  notes:null },
  //   { id:3,  bookingCode:'BK-003', guestName:'Gopal Krishna',   guestPhone:'+91 73456 78901', guestEmail:null,                 guestsCount:2, roomNumber:'302', bookingType:'MONTHLY', checkInDate:'2025-03-25', checkOutDate:'2025-04-25', amount:5800,  advancePaid:0,    status:'PENDING',     paymentStatus:'UNPAID',  notes:'Need WiFi access.' },
  //   { id:4,  bookingCode:'BK-004', guestName:'Sunita Verma',    guestPhone:'+91 64567 89012', guestEmail:'sunita@email.com',   guestsCount:1, roomNumber:'101', bookingType:'MONTHLY', checkInDate:'2025-02-01', checkOutDate:'2025-03-01', amount:5500,  advancePaid:5500, status:'CHECKED_OUT', paymentStatus:'PAID',    notes:null },
  //   { id:5,  bookingCode:'BK-005', guestName:'Arjun Menon',     guestPhone:'+91 55678 90123', guestEmail:'arjun.m@email.com',  guestsCount:1, roomNumber:'203', bookingType:'MONTHLY', checkInDate:'2025-03-10', checkOutDate:null,         amount:3500,  advancePaid:3500, status:'CHECKED_IN',  paymentStatus:'PAID',    notes:null },
  //   { id:6,  bookingCode:'BK-006', guestName:'Preethi Das',     guestPhone:'+91 46789 01234', guestEmail:'preethi@email.com',  guestsCount:2, roomNumber:'202', bookingType:'WEEKLY',  checkInDate:'2025-03-15', checkOutDate:'2025-03-22', amount:3000,  advancePaid:1000, status:'CHECKED_OUT', paymentStatus:'PAID',    notes:'Early check-in requested.' },
  //   { id:7,  bookingCode:'BK-007', guestName:'Kiran Reddy',     guestPhone:'+91 37890 12345', guestEmail:null,                 guestsCount:1, roomNumber:'104', bookingType:'DAILY',   checkInDate:'2025-03-18', checkOutDate:'2025-03-20', amount:800,   advancePaid:800,  status:'CHECKED_OUT', paymentStatus:'PAID',    notes:null },
  //   { id:8,  bookingCode:'BK-008', guestName:'Lakshmi Priya',   guestPhone:'+91 28901 23456', guestEmail:'lakshmi@email.com',  guestsCount:1, roomNumber:'302', bookingType:'MONTHLY', checkInDate:'2025-03-05', checkOutDate:'2025-04-05', amount:5800,  advancePaid:0,    status:'CANCELLED',   paymentStatus:'UNPAID',  notes:'Cancelled due to relocation.' },
  //   { id:9,  bookingCode:'BK-009', guestName:'Suresh Nair',     guestPhone:'+91 19012 34567', guestEmail:'suresh.n@email.com', guestsCount:1, roomNumber:'201', bookingType:'MONTHLY', checkInDate:'2025-04-01', checkOutDate:'2025-05-01', amount:7500,  advancePaid:3000, status:'CONFIRMED',   paymentStatus:'PARTIAL', notes:null },
  //   { id:10, bookingCode:'BK-010', guestName:'Divya Mohan',     guestPhone:'+91 90123 45678', guestEmail:'divya@email.com',    guestsCount:2, roomNumber:'103', bookingType:'MONTHLY', checkInDate:'2025-04-05', checkOutDate:'2025-05-05', amount:4000,  advancePaid:4000, status:'CONFIRMED',   paymentStatus:'PAID',    notes:'Vegetarian meals required.' },
  // ];

  updateSummary(allBookings);
  applyFilters();

  fetchBookings();   // uncomment when backend is ready
})();
