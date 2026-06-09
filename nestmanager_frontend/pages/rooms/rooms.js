/**
 * rooms.js — NestManager Rooms & Beds Page
 *
 * Responsibilities (UI only):
 *  - Auth guard: redirect to login if no token
 *  - Fetch all rooms           GET  /api/rooms
 *  - Add a new room            POST /api/rooms
 *  - Edit an existing room     PUT  /api/rooms/{id}
 *  - Delete a room             DELETE /api/rooms/{id}
 *  - Render rooms as card grid or table (toggle)
 *  - Filter by status (All / Vacant / Occupied / Maintenance)
 *  - Filter by room type dropdown
 *  - Live search by room number
 *  - Populate summary strip (totals + occupancy rate)
 *  - Show Add / Edit modal with validation
 *  - Show Delete confirmation modal
 *  - Toast notifications
 *  - Mobile sidebar toggle
 */

'use strict';

/* ------------------------------------------------------------------ */
/*  Config                                                              */
/* ------------------------------------------------------------------ */

const API_BASE    = 'http://localhost:8080';
const ROOMS_URL   = `${API_BASE}/api/rooms`;
const LOGIN_PAGE  = '../login/login.html';

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

function guardAuth() {
  if (!getToken()) window.location.href = LOGIN_PAGE;
}

/* ------------------------------------------------------------------ */
/*  DOM References                                                      */
/* ------------------------------------------------------------------ */

const roomsGrid       = document.getElementById('rooms-grid');
const roomsTbody      = document.getElementById('rooms-tbody');
const roomsTableWrap  = document.getElementById('rooms-table-wrap');
const emptyState      = document.getElementById('empty-state');
const pageSub         = document.getElementById('page-sub');

// Summary strip
const sumTotal       = document.getElementById('sum-total');
const sumVacant      = document.getElementById('sum-vacant');
const sumOccupied    = document.getElementById('sum-occupied');
const sumMaint       = document.getElementById('sum-maintenance');
const sumOccRate     = document.getElementById('sum-occ-rate');

// Toolbar
const filterBtns     = document.querySelectorAll('.filter-btn');
const typeFilter     = document.getElementById('type-filter');
const searchInput    = document.getElementById('search-input');
const viewGridBtn    = document.getElementById('view-grid');
const viewListBtn    = document.getElementById('view-list');

// Add/Edit modal
const roomModal      = document.getElementById('room-modal');
const modalTitle     = document.getElementById('modal-title');
const roomForm       = document.getElementById('room-form');
const roomIdInput    = document.getElementById('room-id');
const fNumber        = document.getElementById('f-number');
const fFloor         = document.getElementById('f-floor');
const fType          = document.getElementById('f-type');
const fCapacity      = document.getElementById('f-capacity');
const fPrice         = document.getElementById('f-price');
const fStatus        = document.getElementById('f-status');
const fAmenities     = document.getElementById('f-amenities');
const fNotes         = document.getElementById('f-notes');
const submitText     = document.getElementById('submit-text');
const submitSpinner  = document.getElementById('submit-spinner');
const modalSubmitBtn = document.getElementById('modal-submit');

// Delete modal
const deleteModal     = document.getElementById('delete-modal');
const deleteRoomLabel = document.getElementById('delete-room-label');
const deleteConfirm   = document.getElementById('delete-confirm');
const deleteText      = document.getElementById('delete-text');
const deleteSpinner   = document.getElementById('delete-spinner');

// Sidebar / topbar
const sidebar         = document.getElementById('sidebar');
const sidebarOverlay  = document.getElementById('sidebar-overlay');
const menuToggle      = document.getElementById('menu-toggle');
const logoutBtn       = document.getElementById('logout-btn');
const refreshBtn      = document.getElementById('refresh-btn');
const topbarDate      = document.getElementById('topbar-date');
const userAvatar      = document.getElementById('user-avatar');
const userName        = document.getElementById('user-name');
const userRole        = document.getElementById('user-role');

/* ------------------------------------------------------------------ */
/*  State                                                               */
/* ------------------------------------------------------------------ */

let allRooms        = [];   // raw data from API
let filteredRooms   = [];   // after filters applied
let activeFilter    = 'ALL';
let activeType      = 'ALL';
let searchQuery     = '';
let viewMode        = 'grid';    // 'grid' | 'list'
let editingRoomId   = null;      // null = add mode, number = edit mode
let deletingRoomId  = null;

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

function formatCurrency(val) {
  return '₹' + Number(val).toLocaleString('en-IN');
}

function formatRole(role) {
  const map = { ADMIN: 'Owner / Admin', MANAGER: 'Manager', STAFF: 'Staff' };
  return map[role] || role;
}

function escapeHtml(str) {
  const d = document.createElement('div');
  d.appendChild(document.createTextNode(String(str ?? '')));
  return d.innerHTML;
}

function statusBadgeClass(status) {
  const map = { VACANT: 'status-badge--vacant', OCCUPIED: 'status-badge--occupied', MAINTENANCE: 'status-badge--maintenance' };
  return map[(status || '').toUpperCase()] || 'status-badge--vacant';
}

function statusLabel(status) {
  const map = { VACANT: 'Vacant', OCCUPIED: 'Occupied', MAINTENANCE: 'Maintenance' };
  return map[(status || '').toUpperCase()] || status;
}

function cardClass(status) {
  const map = { VACANT: 'room-card--vacant', OCCUPIED: 'room-card--occupied', MAINTENANCE: 'room-card--maintenance' };
  return map[(status || '').toUpperCase()] || 'room-card--vacant';
}

/* ------------------------------------------------------------------ */
/*  User Info                                                           */
/* ------------------------------------------------------------------ */

function populateUserInfo() {
  const name     = sessionStorage.getItem('nestmanager_username') || localStorage.getItem('nestmanager_username') || 'Admin';
  const role     = sessionStorage.getItem('nestmanager_role')     || localStorage.getItem('nestmanager_role')     || 'ADMIN';
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  userAvatar.textContent = initials;
  userName.textContent   = name;
  userRole.textContent   = formatRole(role);
}

function setDate() {
  topbarDate.textContent = new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

/* ------------------------------------------------------------------ */
/*  Summary Strip                                                       */
/* ------------------------------------------------------------------ */

function updateSummary(rooms) {
  const total    = rooms.length;
  const vacant   = rooms.filter(r => r.status === 'VACANT').length;
  const occupied = rooms.filter(r => r.status === 'OCCUPIED').length;
  const maint    = rooms.filter(r => r.status === 'MAINTENANCE').length;
  const rate     = total ? Math.round((occupied / total) * 100) : 0;

  sumTotal.textContent    = total;
  sumVacant.textContent   = vacant;
  sumOccupied.textContent = occupied;
  sumMaint.textContent    = maint;
  sumOccRate.textContent  = rate + '%';
  pageSub.textContent     = `${total} rooms · ${vacant} vacant · ${occupied} occupied`;
}

/* ------------------------------------------------------------------ */
/*  Filter & Search                                                     */
/* ------------------------------------------------------------------ */

function applyFilters() {
  filteredRooms = allRooms.filter(room => {
    const matchStatus = activeFilter === 'ALL' || room.status === activeFilter;
    const matchType   = activeType   === 'ALL' || room.type   === activeType;
    const matchSearch = !searchQuery || room.roomNumber.toLowerCase().includes(searchQuery);
    return matchStatus && matchType && matchSearch;
  });
  renderRooms();
}

/* ------------------------------------------------------------------ */
/*  Render — Grid                                                       */
/* ------------------------------------------------------------------ */

/**
 * Renders a single room card for the grid view.
 *
 * Room object shape from GET /api/rooms:
 * {
 *   id          : number,
 *   roomNumber  : string,
 *   floor       : string,
 *   type        : "SINGLE"|"DOUBLE"|"SHARED"|"SUITE",
 *   capacity    : number,    total beds
 *   occupiedBeds: number,    beds currently occupied
 *   pricePerMonth: number,
 *   status      : "VACANT"|"OCCUPIED"|"MAINTENANCE",
 *   amenities   : string,    comma-separated
 *   notes       : string
 * }
 *
 * @param {Object} room
 * @returns {string} HTML string
 */
function roomCardHTML(room) {
  const amenityList = (room.amenities || '').split(',').map(a => a.trim()).filter(Boolean);
  const amenityTags = amenityList.slice(0, 4).map(a =>
    `<span class="amenity-tag">${escapeHtml(a)}</span>`
  ).join('');

  const totalBeds    = room.capacity    || 0;
  const occupiedBeds = room.occupiedBeds || 0;
  const bedDots = Array.from({ length: totalBeds }, (_, i) =>
    `<span class="bed-dot ${i < occupiedBeds ? 'bed-dot--filled' : 'bed-dot--empty'}" title="${i < occupiedBeds ? 'Occupied' : 'Vacant'}"></span>`
  ).join('');

  return `
    <div class="room-card ${cardClass(room.status)}" data-id="${room.id}">
      <div class="room-card__head">
        <div>
          <div class="room-number">Room ${escapeHtml(room.roomNumber)}</div>
          <div class="room-floor">${escapeHtml(room.floor)}</div>
        </div>
        <span class="status-badge ${statusBadgeClass(room.status)}">${statusLabel(room.status)}</span>
      </div>

      <div class="room-type-row">
        <span class="room-type">${escapeHtml(room.type)}</span>
        <span class="room-price">${formatCurrency(room.pricePerMonth)}/mo</span>
      </div>

      <div class="bed-row">
        ${bedDots}
        <span class="bed-label">${occupiedBeds}/${totalBeds} beds</span>
      </div>

      <div class="amenity-tags">${amenityTags || '<span class="amenity-tag">No amenities listed</span>'}</div>

      <div class="room-card__actions">
        <button class="btn btn-secondary btn-sm" onclick="openEditModal(${room.id})">Edit</button>
        <button class="btn btn-danger btn-sm" onclick="openDeleteModal(${room.id}, '${escapeHtml(room.roomNumber)}')">Delete</button>
      </div>
    </div>`;
}

/* ------------------------------------------------------------------ */
/*  Render — Table Row                                                  */
/* ------------------------------------------------------------------ */

function roomRowHTML(room) {
  const amenityList = (room.amenities || '').split(',').map(a => a.trim()).filter(Boolean);
  const amenDisplay = amenityList.slice(0, 3).join(', ') + (amenityList.length > 3 ? '...' : '');

  return `
    <tr>
      <td><strong>Room ${escapeHtml(room.roomNumber)}</strong></td>
      <td>${escapeHtml(room.floor)}</td>
      <td>${escapeHtml(room.type)}</td>
      <td>${room.capacity}</td>
      <td>${room.occupiedBeds || 0}</td>
      <td>${formatCurrency(room.pricePerMonth)}</td>
      <td>${escapeHtml(amenDisplay || '—')}</td>
      <td><span class="status-badge ${statusBadgeClass(room.status)}">${statusLabel(room.status)}</span></td>
      <td>
        <div class="table-actions">
          <button class="btn btn-secondary btn-sm" onclick="openEditModal(${room.id})">Edit</button>
          <button class="btn btn-danger btn-sm" onclick="openDeleteModal(${room.id}, '${escapeHtml(room.roomNumber)}')">Delete</button>
        </div>
      </td>
    </tr>`;
}

/* ------------------------------------------------------------------ */
/*  Render — Main                                                       */
/* ------------------------------------------------------------------ */

function renderRooms() {
  const isGrid = viewMode === 'grid';

  roomsGrid.classList.toggle('hidden', !isGrid);
  roomsTableWrap.classList.toggle('hidden', isGrid);

  if (filteredRooms.length === 0) {
    emptyState.classList.remove('hidden');
    roomsGrid.innerHTML  = '';
    roomsTbody.innerHTML = '';
    return;
  }

  emptyState.classList.add('hidden');

  if (isGrid) {
    roomsGrid.innerHTML = filteredRooms.map(roomCardHTML).join('');
  } else {
    roomsTbody.innerHTML = filteredRooms.map(roomRowHTML).join('');
  }
}

/* ------------------------------------------------------------------ */
/*  API — Fetch Rooms                                                   */
/*                                                                      */
/*  GET /api/rooms                                                      */
/*  Response: Room[]   (see shape documented in roomCardHTML above)    */
/* ------------------------------------------------------------------ */

async function fetchRooms() {
  setRefreshing(true);
  try {
    const res = await fetch(ROOMS_URL, { headers: authHeaders() });
    if (res.status === 401) { clearSession(); window.location.href = LOGIN_PAGE; return; }
    if (!res.ok) throw new Error('Failed to fetch rooms');
    allRooms = await res.json();
    updateSummary(allRooms);
    applyFilters();
  } catch (err) {
    console.error('[Rooms] Fetch error:', err);
    showToast('Could not load rooms. Check server connection.', 'error');
  } finally {
    setRefreshing(false);
  }
}

/* ------------------------------------------------------------------ */
/*  API — Add Room                                                      */
/*                                                                      */
/*  POST /api/rooms                                                     */
/*  Request body: { roomNumber, floor, type, capacity,                  */
/*                  pricePerMonth, status, amenities, notes }           */
/*  Response: Room (the created room object with id)                    */
/* ------------------------------------------------------------------ */

async function addRoom(payload) {
  const res = await fetch(ROOMS_URL, {
    method : 'POST',
    headers: authHeaders(),
    body   : JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to add room');
  }
  return res.json();
}

/* ------------------------------------------------------------------ */
/*  API — Edit Room                                                     */
/*                                                                      */
/*  PUT /api/rooms/{id}                                                 */
/*  Request body: same shape as POST                                    */
/*  Response: Room (the updated room object)                            */
/* ------------------------------------------------------------------ */

async function editRoom(id, payload) {
  const res = await fetch(`${ROOMS_URL}/${id}`, {
    method : 'PUT',
    headers: authHeaders(),
    body   : JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to update room');
  }
  return res.json();
}

/* ------------------------------------------------------------------ */
/*  API — Delete Room                                                   */
/*                                                                      */
/*  DELETE /api/rooms/{id}                                              */
/*  Response: 204 No Content                                            */
/* ------------------------------------------------------------------ */

async function deleteRoom(id) {
  const res = await fetch(`${ROOMS_URL}/${id}`, {
    method : 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to delete room');
  }
}

/* ------------------------------------------------------------------ */
/*  Form Validation                                                     */
/* ------------------------------------------------------------------ */

function clearErrors() {
  ['f-number', 'f-floor', 'f-capacity', 'f-price'].forEach(id => {
    document.getElementById(id).classList.remove('is-error');
  });
  ['err-number', 'err-floor', 'err-capacity', 'err-price'].forEach(id => {
    document.getElementById(id).textContent = '';
  });
}

function showFieldError(inputId, errId, msg) {
  document.getElementById(inputId).classList.add('is-error');
  document.getElementById(errId).textContent = msg;
}

function validateForm() {
  clearErrors();
  let valid = true;

  if (!fNumber.value.trim()) {
    showFieldError('f-number', 'err-number', 'Room number is required.');
    valid = false;
  }
  if (!fFloor.value.trim()) {
    showFieldError('f-floor', 'err-floor', 'Floor is required.');
    valid = false;
  }
  const cap = parseInt(fCapacity.value);
  if (!fCapacity.value || isNaN(cap) || cap < 1) {
    showFieldError('f-capacity', 'err-capacity', 'Enter a valid bed count (min 1).');
    valid = false;
  }
  const price = parseFloat(fPrice.value);
  if (!fPrice.value || isNaN(price) || price < 0) {
    showFieldError('f-price', 'err-price', 'Enter a valid rent amount.');
    valid = false;
  }
  return valid;
}

/* ------------------------------------------------------------------ */
/*  Add / Edit Modal                                                    */
/* ------------------------------------------------------------------ */

function openAddModal() {
  editingRoomId = null;
  modalTitle.textContent    = 'Add New Room';
  submitText.textContent    = 'Add Room';
  roomForm.reset();
  clearErrors();
  openModal(roomModal);
}

/**
 * Opens modal pre-filled with existing room data.
 * @param {number} id  room ID
 */
function openEditModal(id) {
  const room = allRooms.find(r => r.id === id);
  if (!room) return;

  editingRoomId = id;
  modalTitle.textContent = `Edit Room ${room.roomNumber}`;
  submitText.textContent = 'Save Changes';

  roomIdInput.value = room.id;
  fNumber.value     = room.roomNumber;
  fFloor.value      = room.floor;
  fType.value       = room.type;
  fCapacity.value   = room.capacity;
  fPrice.value      = room.pricePerMonth;
  fStatus.value     = room.status;
  fAmenities.value  = room.amenities || '';
  fNotes.value      = room.notes || '';

  clearErrors();
  openModal(roomModal);
}

/* ------------------------------------------------------------------ */
/*  Delete Modal                                                        */
/* ------------------------------------------------------------------ */

function openDeleteModal(id, roomNumber) {
  deletingRoomId              = id;
  deleteRoomLabel.textContent = `Room ${roomNumber}`;
  openModal(deleteModal);
}

/* ------------------------------------------------------------------ */
/*  Form Submit                                                         */
/* ------------------------------------------------------------------ */

roomForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!validateForm()) return;

  const payload = {
    roomNumber   : fNumber.value.trim(),
    floor        : fFloor.value.trim(),
    type         : fType.value,
    capacity     : parseInt(fCapacity.value),
    pricePerMonth: parseFloat(fPrice.value),
    status       : fStatus.value,
    amenities    : fAmenities.value.trim(),
    notes        : fNotes.value.trim(),
  };

  setModalLoading(true);

  try {
    if (editingRoomId) {
      await editRoom(editingRoomId, payload);
      showToast(`Room ${payload.roomNumber} updated successfully.`, 'success');
    } else {
      await addRoom(payload);
      showToast(`Room ${payload.roomNumber} added successfully.`, 'success');
    }
    closeModal(roomModal);
    await fetchRooms();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    setModalLoading(false);
  }
});

/* ------------------------------------------------------------------ */
/*  Delete Confirm                                                      */
/* ------------------------------------------------------------------ */

deleteConfirm.addEventListener('click', async () => {
  if (!deletingRoomId) return;
  setDeleteLoading(true);
  try {
    await deleteRoom(deletingRoomId);
    showToast('Room deleted successfully.', 'success');
    closeModal(deleteModal);
    await fetchRooms();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    setDeleteLoading(false);
    deletingRoomId = null;
  }
});

/* ------------------------------------------------------------------ */
/*  Modal Helpers                                                       */
/* ------------------------------------------------------------------ */

function openModal(overlay) {
  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal(overlay) {
  overlay.classList.remove('open');
  document.body.style.overflow = '';
}

function setModalLoading(on) {
  modalSubmitBtn.classList.toggle('loading', on);
  modalSubmitBtn.disabled = on;
  if (on) submitSpinner.style.display = 'inline-block';
  else    submitSpinner.style.display = 'none';
}

function setDeleteLoading(on) {
  deleteConfirm.classList.toggle('loading', on);
  deleteConfirm.disabled = on;
  deleteText.textContent    = on ? 'Deleting...' : 'Delete Room';
}

// Close modals on overlay click
roomModal.addEventListener('click',   e => { if (e.target === roomModal)   closeModal(roomModal); });
deleteModal.addEventListener('click', e => { if (e.target === deleteModal) closeModal(deleteModal); });

document.getElementById('modal-close').addEventListener('click',        () => closeModal(roomModal));
document.getElementById('modal-cancel').addEventListener('click',       () => closeModal(roomModal));
document.getElementById('delete-modal-close').addEventListener('click', () => closeModal(deleteModal));
document.getElementById('delete-cancel').addEventListener('click',      () => closeModal(deleteModal));

// Clear field error on input
['f-number','f-floor','f-capacity','f-price'].forEach(id => {
  document.getElementById(id).addEventListener('input', () => {
    document.getElementById(id).classList.remove('is-error');
  });
});

/* ------------------------------------------------------------------ */
/*  View Toggle                                                         */
/* ------------------------------------------------------------------ */

viewGridBtn.addEventListener('click', () => {
  viewMode = 'grid';
  viewGridBtn.classList.add('active');
  viewListBtn.classList.remove('active');
  viewGridBtn.setAttribute('aria-pressed', 'true');
  viewListBtn.setAttribute('aria-pressed', 'false');
  renderRooms();
});

viewListBtn.addEventListener('click', () => {
  viewMode = 'list';
  viewListBtn.classList.add('active');
  viewGridBtn.classList.remove('active');
  viewListBtn.setAttribute('aria-pressed', 'true');
  viewGridBtn.setAttribute('aria-pressed', 'false');
  renderRooms();
});

/* ------------------------------------------------------------------ */
/*  Filters & Search                                                    */
/* ------------------------------------------------------------------ */

filterBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    filterBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activeFilter = btn.dataset.filter;
    applyFilters();
  });
});

typeFilter.addEventListener('change', () => {
  activeType = typeFilter.value;
  applyFilters();
});

searchInput.addEventListener('input', () => {
  searchQuery = searchInput.value.trim().toLowerCase();
  applyFilters();
});

/* ------------------------------------------------------------------ */
/*  Add Room Buttons                                                    */
/* ------------------------------------------------------------------ */

document.getElementById('add-room-btn').addEventListener('click', openAddModal);
document.getElementById('empty-add-btn').addEventListener('click', openAddModal);

/* ------------------------------------------------------------------ */
/*  Refresh                                                             */
/* ------------------------------------------------------------------ */

refreshBtn.addEventListener('click', fetchRooms);

function setRefreshing(on) {
  refreshBtn.classList.toggle('spinning', on);
  refreshBtn.disabled = on;
}

/* ------------------------------------------------------------------ */
/*  Sidebar Mobile                                                      */
/* ------------------------------------------------------------------ */

menuToggle.addEventListener('click', () => {
  sidebar.classList.toggle('open');
  sidebarOverlay.classList.toggle('visible', sidebar.classList.contains('open'));
});

sidebarOverlay.addEventListener('click', () => {
  sidebar.classList.remove('open');
  sidebarOverlay.classList.remove('visible');
});

/* ------------------------------------------------------------------ */
/*  Logout                                                              */
/* ------------------------------------------------------------------ */

function clearSession() {
  ['nestmanager_token','nestmanager_role','nestmanager_username'].forEach(k => {
    sessionStorage.removeItem(k);
    localStorage.removeItem(k);
  });
}

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
  fetchRooms();   // comment out until backend is ready

  // Temporary dummy data for UI testing
  // allRooms = [
  //   { id:1, roomNumber:'101', floor:'1st', type:'SINGLE',  capacity:1, occupiedBeds:1, pricePerMonth:5500, status:'OCCUPIED',    amenities:'AC, WiFi' },
  //   { id:2, roomNumber:'102', floor:'1st', type:'DOUBLE',  capacity:2, occupiedBeds:2, pricePerMonth:7000, status:'OCCUPIED',    amenities:'AC, WiFi, Attached Bath' },
  //   { id:3, roomNumber:'103', floor:'1st', type:'SHARED',  capacity:4, occupiedBeds:2, pricePerMonth:4000, status:'OCCUPIED',    amenities:'WiFi' },
  //   { id:4, roomNumber:'104', floor:'1st', type:'SINGLE',  capacity:1, occupiedBeds:0, pricePerMonth:5500, status:'VACANT',      amenities:'AC, WiFi' },
  //   { id:5, roomNumber:'201', floor:'2nd', type:'DOUBLE',  capacity:2, occupiedBeds:1, pricePerMonth:7500, status:'OCCUPIED',    amenities:'AC, WiFi, Balcony' },
  //   { id:6, roomNumber:'202', floor:'2nd', type:'SUITE',   capacity:2, occupiedBeds:2, pricePerMonth:12000,status:'OCCUPIED',    amenities:'AC, WiFi, TV, Attached Bath' },
  //   { id:7, roomNumber:'203', floor:'2nd', type:'SHARED',  capacity:6, occupiedBeds:4, pricePerMonth:3500, status:'OCCUPIED',    amenities:'WiFi' },
  //   { id:8, roomNumber:'204', floor:'2nd', type:'SINGLE',  capacity:1, occupiedBeds:0, pricePerMonth:6000, status:'VACANT',      amenities:'AC' },
  //   { id:9, roomNumber:'301', floor:'3rd', type:'DOUBLE',  capacity:2, occupiedBeds:0, pricePerMonth:7000, status:'MAINTENANCE', amenities:'AC, WiFi' },
  //   { id:10,roomNumber:'302', floor:'3rd', type:'SINGLE',  capacity:1, occupiedBeds:0, pricePerMonth:5800, status:'VACANT',      amenities:'WiFi' },
  // ];

  updateSummary(allRooms);
  applyFilters();
})();