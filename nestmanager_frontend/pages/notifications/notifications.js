/**
 * notifications.js — NestManager Notifications Page
 *
 * Responsibilities:
 *  - Auth guard
 *  - Fetch notifications        GET    /api/notifications
 *  - Mark one as read           PATCH  /api/notifications/{id}/read
 *  - Mark all as read           PATCH  /api/notifications/read-all
 *  - Delete one notification    DELETE /api/notifications/{id}
 *  - Clear all notifications    DELETE /api/notifications
 *  - Render grouped list (Today / Earlier)
 *  - Filter tabs (All / Rent / Checkout / Booking / System)
 *  - Tab counts
 *  - Mobile sidebar toggle
 */

'use strict';

const API_BASE    = 'http://localhost:8080';
const NOTIF_URL   = `${API_BASE}/api/notifications`;
const LOGIN_PAGE  = '../login/login.html';

function getToken() {
  return sessionStorage.getItem('nestmanager_token') || localStorage.getItem('nestmanager_token') || null;
}
function authHeaders() {
  return { 'Content-Type':'application/json', 'Authorization':`Bearer ${getToken()}` };
}
function clearSession() {
  ['nestmanager_token','nestmanager_role','nestmanager_username'].forEach(k=>{sessionStorage.removeItem(k);localStorage.removeItem(k);});
}
function guardAuth() {
  if (!getToken()) window.location.href = LOGIN_PAGE;
}
function escapeHtml(str) {
  const d=document.createElement('div'); d.appendChild(document.createTextNode(String(str??''))); return d.innerHTML;
}
function formatRole(r){return({ADMIN:'Owner / Admin',MANAGER:'Manager',STAFF:'Staff'})[r]||r;}
function initials(n){return(n||'?').trim().split(' ').map(x=>x[0]).join('').toUpperCase().slice(0,2);}

/* ---- DOM ---- */
const sidebar=document.getElementById('sidebar');
const sidebarOverlay=document.getElementById('sidebar-overlay');
const menuToggle=document.getElementById('menu-toggle');
const logoutBtn=document.getElementById('logout-btn');
const refreshBtn=document.getElementById('refresh-btn');
const markAllBtn=document.getElementById('mark-all-btn');
const clearAllBtn=document.getElementById('clear-all-btn');
const notifPanel=document.getElementById('notif-panel');
const emptyState=document.getElementById('empty-state');
const pageSub=document.getElementById('page-sub');

/* ---- State ---- */
let allNotifs   = [];
let activeFilter = 'ALL';

/* ---- User info ---- */
function populateUserInfo() {
  const name = sessionStorage.getItem('nestmanager_username')||localStorage.getItem('nestmanager_username')||'Admin';
  const role = sessionStorage.getItem('nestmanager_role')||localStorage.getItem('nestmanager_role')||'ADMIN';
  document.getElementById('user-avatar').textContent = initials(name);
  document.getElementById('user-name').textContent   = name;
  document.getElementById('user-role').textContent   = formatRole(role);
}

function setDate() {
  document.getElementById('topbar-date').textContent =
    new Date().toLocaleDateString('en-IN',{weekday:'short',day:'numeric',month:'short',year:'numeric'});
}

/* ---- Icons per type ---- */
function iconForType(type) {
  const icons = {
    RENT    : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>`,
    CHECKOUT: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>`,
    BOOKING : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
    SYSTEM  : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
  };
  return icons[type] || icons.SYSTEM;
}

function colorForType(type) {
  const map = { RENT:'red', CHECKOUT:'yellow', BOOKING:'blue', SYSTEM:'cyan' };
  return map[type] || 'cyan';
}

function tagClass(type) {
  return ({ RENT:'notif-tag--rent', CHECKOUT:'notif-tag--checkout', BOOKING:'notif-tag--booking', SYSTEM:'notif-tag--system' })[type] || 'notif-tag--system';
}

function tagLabel(type) {
  return ({ RENT:'Rent', CHECKOUT:'Check-out', BOOKING:'Booking', SYSTEM:'System' })[type] || type;
}

/* ---- Update tab counts ---- */
function updateCounts(notifs) {
  document.getElementById('cnt-all').textContent     = notifs.length;
  document.getElementById('cnt-rent').textContent    = notifs.filter(n=>n.type==='RENT').length;
  document.getElementById('cnt-checkout').textContent= notifs.filter(n=>n.type==='CHECKOUT').length;
  document.getElementById('cnt-booking').textContent = notifs.filter(n=>n.type==='BOOKING').length;
  document.getElementById('cnt-system').textContent  = notifs.filter(n=>n.type==='SYSTEM').length;
  const unread = notifs.filter(n=>!n.read).length;
  pageSub.textContent = `${notifs.length} total · ${unread} unread`;
}

/* ---- Render ---- */
/**
 * Expected Notification object from GET /api/notifications:
 * {
 *   id      : number,
 *   type    : "RENT"|"CHECKOUT"|"BOOKING"|"SYSTEM",
 *   title   : string,
 *   message : string,
 *   time    : string,    e.g. "2 hours ago"
 *   isToday : boolean,
 *   read    : boolean,
 * }
 */
function renderNotifications() {
  const filtered = activeFilter === 'ALL'
    ? allNotifs
    : allNotifs.filter(n => n.type === activeFilter);

  if (filtered.length === 0) {
    notifPanel.innerHTML = '';
    notifPanel.classList.add('hidden');
    emptyState.classList.remove('hidden');
    return;
  }

  emptyState.classList.add('hidden');
  notifPanel.classList.remove('hidden');

  const today   = filtered.filter(n => n.isToday);
  const earlier = filtered.filter(n => !n.isToday);

  let html = '';

  if (today.length > 0) {
    html += `<div class="notif-group-label">Today</div>`;
    html += today.map(notifItemHTML).join('');
  }
  if (earlier.length > 0) {
    html += `<div class="notif-group-label">Earlier</div>`;
    html += earlier.map(notifItemHTML).join('');
  }

  notifPanel.innerHTML = html;
}

function notifItemHTML(n) {
  const color = colorForType(n.type);
  return `
    <div class="notif-item ${n.read ? '' : 'unread'}" data-id="${n.id}" onclick="markRead(${n.id})">
      <div class="notif-icon-wrap notif-icon-wrap--${color}">
        ${iconForType(n.type)}
      </div>
      <div class="notif-body">
        <div class="notif-title">${escapeHtml(n.title)}</div>
        <div class="notif-msg">${escapeHtml(n.message)}</div>
        <div class="notif-meta">
          <span class="notif-time">${escapeHtml(n.time)}</span>
          <span class="notif-tag ${tagClass(n.type)}">${tagLabel(n.type)}</span>
        </div>
      </div>
      <div class="notif-actions">
        ${!n.read ? '<div class="notif-unread-dot"></div>' : ''}
        <button class="notif-dismiss" onclick="event.stopPropagation(); dismissOne(${n.id})" title="Dismiss">✕</button>
      </div>
    </div>`;
}

/* ---- API Calls ---- */

/** GET /api/notifications — Response: Notification[] */
async function fetchNotifications() {
  setRefreshing(true);
  try {
    const res = await fetch(NOTIF_URL, { headers: authHeaders() });
    if (res.status === 401) { clearSession(); window.location.href = LOGIN_PAGE; return; }
    if (!res.ok) throw new Error();
    allNotifs = await res.json();
    updateCounts(allNotifs);
    renderNotifications();
  } catch {
    showToast('Could not load notifications.', 'error');
  } finally {
    setRefreshing(false);
  }
}

/** PATCH /api/notifications/{id}/read */
async function markRead(id) {
  const n = allNotifs.find(x => x.id === id);
  if (!n || n.read) return;
  n.read = true;
  renderNotifications();
  updateCounts(allNotifs);
  try {
    await fetch(`${NOTIF_URL}/${id}/read`, { method:'PATCH', headers: authHeaders() });
  } catch (_) {}
}

/** PATCH /api/notifications/read-all */
async function markAllRead() {
  allNotifs.forEach(n => n.read = true);
  renderNotifications();
  updateCounts(allNotifs);
  try {
    await fetch(`${NOTIF_URL}/read-all`, { method:'PATCH', headers: authHeaders() });
    showToast('All notifications marked as read.', 'success');
  } catch { showToast('Could not reach server.', 'error'); }
}

/** DELETE /api/notifications/{id} */
async function dismissOne(id) {
  allNotifs = allNotifs.filter(n => n.id !== id);
  renderNotifications();
  updateCounts(allNotifs);
  try {
    await fetch(`${NOTIF_URL}/${id}`, { method:'DELETE', headers: authHeaders() });
  } catch (_) {}
}

/** DELETE /api/notifications */
async function clearAll() {
  allNotifs = [];
  renderNotifications();
  updateCounts(allNotifs);
  try {
    await fetch(NOTIF_URL, { method:'DELETE', headers: authHeaders() });
    showToast('All notifications cleared.', 'info');
  } catch { showToast('Could not reach server.', 'error'); }
}

/* ---- Events ---- */
markAllBtn.addEventListener('click', markAllRead);
clearAllBtn.addEventListener('click', clearAll);
refreshBtn.addEventListener('click', fetchNotifications);

document.querySelectorAll('.ntab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.ntab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activeFilter = btn.dataset.filter;
    renderNotifications();
  });
});

menuToggle.addEventListener('click', () => {
  sidebar.classList.toggle('open');
  sidebarOverlay.classList.toggle('visible', sidebar.classList.contains('open'));
});
sidebarOverlay.addEventListener('click', () => {
  sidebar.classList.remove('open');
  sidebarOverlay.classList.remove('visible');
});
logoutBtn.addEventListener('click', async () => {
  try { await fetch(`${API_BASE}/api/auth/logout`,{method:'POST',headers:authHeaders()}); } catch(_){}
  clearSession(); window.location.href = LOGIN_PAGE;
});

function setRefreshing(on){refreshBtn.classList.toggle('spinning',on);refreshBtn.disabled=on;}

function showToast(msg, type='info') {
  const t=document.createElement('div');
  t.className=`toast toast--${type}`;
  t.innerHTML=`<span class="toast-msg">${escapeHtml(msg)}</span>`;
  document.getElementById('toast-container').appendChild(t);
  setTimeout(()=>t.remove(),3500);
}

/* ---- Init ---- */
(function init() {
  guardAuth();
  setDate();
  populateUserInfo();

  // Dummy notifications — match all pages
  // allNotifs = [
  //   { id:1,  type:'RENT',     title:'Rent overdue — Mohammed Ali',       message:'Room 102 rent of ₹3,500 is overdue by 15 days. Please follow up immediately.',      time:'2 hours ago',   isToday:true,  read:false },
  //   { id:2,  type:'RENT',     title:'Rent overdue — Kavitha Rajan',      message:'Room 103 rent of ₹4,000 is overdue by 12 days. Tenant has been notified.',          time:'2 hours ago',   isToday:true,  read:false },
  //   { id:3,  type:'RENT',     title:'Rent pending — Priya Nair',         message:'Room 102 rent of ₹3,500 is due in 2 days (5th Mar). Reminder sent.',                time:'5 hours ago',   isToday:true,  read:false },
  //   { id:4,  type:'RENT',     title:'Rent pending — Ananya Das',         message:'Room 204 rent of ₹6,000 is due in 5 days. Reminder sent via SMS.',                  time:'5 hours ago',   isToday:true,  read:false },
  //   { id:5,  type:'CHECKOUT', title:'Check-out scheduled — Priya Nair',  message:'Priya Nair (Room 102) is scheduled to check out on 22 March 2025.',                 time:'1 day ago',     isToday:false, read:false },
  //   { id:6,  type:'BOOKING',  title:'New booking — Meena Kumari',        message:'New booking BK-002 received for Room 204. Status: Pending. Please confirm.',        time:'1 day ago',     isToday:false, read:false },
  //   { id:7,  type:'BOOKING',  title:'New booking — Gopal Krishna',       message:'New booking BK-003 received for Room 302. Status: Pending. Needs confirmation.',    time:'2 days ago',    isToday:false, read:true  },
  //   { id:8,  type:'SYSTEM',   title:'Monthly rent reminders sent',       message:'Automated rent reminders sent to 8 active tenants for March 2025.',                 time:'3 days ago',    isToday:false, read:true  },
  //   { id:9,  type:'SYSTEM',   title:'Room 301 marked for maintenance',   message:'Room 301 (2nd Floor, Double) has been flagged for maintenance. Estimated 5 days.',  time:'4 days ago',    isToday:false, read:true  },
  //   { id:10, type:'BOOKING',  title:'Booking confirmed — Ravi Shankar',  message:'Booking BK-001 for Room 104 has been confirmed. Check-in: 20 March 2025.',          time:'5 days ago',    isToday:false, read:true  },
  //   { id:11, type:'RENT',     title:'Rent collected — Vikram Singh',     message:'₹7,500 rent received from Vikram Singh (Room 201) via Bank Transfer.',              time:'6 days ago',    isToday:false, read:true  },
  //   { id:12, type:'SYSTEM',   title:'New tenant added — Ananya Das',     message:'Ananya Das has been added as a new tenant for Room 204 starting 20 Jan 2025.',      time:'1 week ago',    isToday:false, read:true  },
  // ];

  updateCounts(allNotifs);
  renderNotifications();
  fetchNotifications();  // uncomment when backend is ready
})();
