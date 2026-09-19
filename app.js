/* ============================================================
   Simply Connect — HR Portal
   Vanilla JS SPA. No framework/build step needed -> deploys on
   Vercel as a static site, instantly, with no cold-start.
   ============================================================ */

const State = {
  user: null,          // { role, empId, employee }
  employees: [],
  attendance: [],
  payroll: [],
  requests: [],
  notifications: [],
  leaveBalances: [],
  devices: [],
  currentPage: 'dashboard',
  empView: 'grid',
  activeProfileEmpId: null
};

const AVATAR_COLORS = [
  ['#F4B400', '#F2994A'], ['#6A63E0', '#8E88EF'], ['#2E7D32', '#66BB6A'],
  ['#C0392B', '#E17055'], ['#2E5FA3', '#5B8DEF'], ['#B7791F', '#F2C14E']
];

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function initials(name) {
  if (!name) return '?';
  const parts = String(name).trim().split(/\s+/);
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase();
}

function avatarColor(seed) {
  const idx = Math.abs(hashCode(String(seed))) % AVATAR_COLORS.length;
  return AVATAR_COLORS[idx];
}
function hashCode(s) { let h = 0; for (let i = 0; i < s.length; i++) h = (h << 5) - h + s.charCodeAt(i) | 0; return h; }

function toast(message, type = 'default') {
  const wrap = document.getElementById('toastWrap');
  const el = document.createElement('div');
  el.className = 'toast' + (type !== 'default' ? ' ' + type : '');
  el.textContent = message;
  wrap.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

function todayISO() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

/* ================= LOGIN SCREEN ================= */

const CAROUSEL_SLIDES = [
  { img: 'assets/illustrations/onboarding.png', caption: 'Onboard new hires in a click' },
  { img: 'assets/illustrations/data.png', caption: 'Live data, straight from your sheet' },
  { img: 'assets/illustrations/attendance.png', caption: 'Attendance confirmed the moment they punch in' }
];
let carouselIndex = 0;
let carouselTimer = null;

function renderCarousel() {
  const track = document.getElementById('carouselTrack');
  track.innerHTML = CAROUSEL_SLIDES.map((s, i) => `
    <div class="carousel-slide ${i === carouselIndex ? 'active' : ''}">
      <img src="${s.img}" alt="">
    </div>
  `).join('');
  document.getElementById('carouselCaption').textContent = CAROUSEL_SLIDES[carouselIndex].caption;
  document.getElementById('carouselDots').innerHTML = CAROUSEL_SLIDES.map((_, i) =>
    `<span class="${i === carouselIndex ? 'active' : ''}"></span>`).join('');
}
function nextSlide() { carouselIndex = (carouselIndex + 1) % CAROUSEL_SLIDES.length; renderCarousel(); }
function prevSlide() { carouselIndex = (carouselIndex - 1 + CAROUSEL_SLIDES.length) % CAROUSEL_SLIDES.length; renderCarousel(); }
function startCarousel() { clearInterval(carouselTimer); carouselTimer = setInterval(nextSlide, 4000); }

function startClock() {
  function tick() {
    const now = new Date();
    document.getElementById('loginClock').textContent = now.toLocaleTimeString('en-GB');
    document.getElementById('loginDate').textContent = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  }
  tick();
  setInterval(tick, 1000);
}

function setRole(role) {
  document.querySelectorAll('.role-toggle button').forEach(b => b.classList.toggle('active', b.dataset.role === role));
  document.getElementById('loginForm').dataset.role = role;
}

async function handleLogin(e) {
  e.preventDefault();
  const btn = document.getElementById('loginBtn');
  const errBox = document.getElementById('loginError');
  errBox.classList.remove('show');

  const id = document.getElementById('loginId').value.trim();
  const password = document.getElementById('loginPassword').value;
  const role = document.getElementById('loginForm').dataset.role || 'employee';

  if (!id || !password) {
    errBox.textContent = 'Employee ID aur password dono likhein.';
    errBox.classList.add('show');
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Signing in…';

  try {
    const data = await Api.login(id, password);
    if (role === 'admin' && String(data.role).toLowerCase() !== 'admin') {
      throw new Error('Ye account Admin nahi hai. Employee tab try karein.');
    }
    State.user = data;
    sessionStorage.setItem('sc_user', JSON.stringify(data));
    await bootApp();
  } catch (err) {
    errBox.textContent = err.message || 'Login fail ho gaya. ID/Password dobara check karein.';
    errBox.classList.add('show');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Sign in';
  }
}

/* ================= BOOTSTRAP / APP SHELL ================= */

async function bootApp() {
  document.getElementById('loginScreen').classList.add('hidden');
  const loading = document.getElementById('loadingScreen');
  loading.classList.remove('hidden');

  try {
    const data = await Api.bootstrap();
    State.employees = data.employees || [];
    State.attendance = data.attendance || [];
    State.payroll = data.payroll || [];
    State.requests = data.requests || [];
    State.notifications = data.notifications || [];
    State.leaveBalances = data.leaveBalances || [];
    State.devices = data.devices || [];

    document.getElementById('appShell').classList.remove('hidden');
    initShell();
    navigate(State.user.role === 'Admin' ? 'dashboard' : 'dashboard');

    // Refresh silently in the background so first paint stays instant.
    refreshInBackground();
  } catch (err) {
    toast('Data load nahi ho saka: ' + err.message, 'error');
  } finally {
    loading.classList.add('hidden');
  }
}

async function refreshInBackground() {
  try {
    const data = await Api.bootstrap({ useCache: false });
    State.employees = data.employees || [];
    State.attendance = data.attendance || [];
    State.payroll = data.payroll || [];
    State.requests = data.requests || [];
    State.notifications = data.notifications || [];
    State.leaveBalances = data.leaveBalances || [];
    State.devices = data.devices || [];
    renderPage();
  } catch (_) { /* silent — stale cache is fine, user already sees data */ }
}

function initShell() {
  const isAdmin = String(State.user.role).toLowerCase() === 'admin';
  const emp = State.user.employee || {};
  document.getElementById('tbAvatar').textContent = initials(emp['Name'] || State.user.empId);
  document.getElementById('tbCompany').textContent = CONFIG.COMPANY_NAME;

  document.querySelectorAll('.nav-item[data-page]').forEach(btn => {
    btn.classList.toggle('hidden', btn.dataset.adminOnly === 'true' && !isAdmin);
    btn.addEventListener('click', () => navigate(btn.dataset.page));
  });
  document.getElementById('logoutBtn').addEventListener('click', logout);
  document.getElementById('notifBtn').addEventListener('click', toggleNotifPanel);
}

function logout() {
  sessionStorage.removeItem('sc_user');
  State.user = null;
  location.reload();
}

function navigate(page) {
  State.currentPage = page;
  document.querySelectorAll('.nav-item[data-page]').forEach(b => b.classList.toggle('active', b.dataset.page === page));
  renderPage();
  document.getElementById('mainContent').scrollTo({ top: 0, behavior: 'smooth' });
}

function renderPage() {
  const isAdmin = String(State.user.role).toLowerCase() === 'admin';
  const el = document.getElementById('mainContent');
  switch (State.currentPage) {
    case 'dashboard': el.innerHTML = renderDashboard(isAdmin); attachDashboardEvents(); break;
    case 'employees': el.innerHTML = renderEmployees(isAdmin); attachEmployeesEvents(isAdmin); break;
    case 'payroll': el.innerHTML = renderPayroll(isAdmin); break;
    case 'attendance': el.innerHTML = renderAttendance(isAdmin); attachAttendanceEvents(); break;
    case 'requests': el.innerHTML = renderRequests(isAdmin); attachRequestsEvents(isAdmin); break;
    case 'profile': el.innerHTML = renderProfile(State.activeProfileEmpId); attachProfileEvents(); break;
    default: el.innerHTML = renderDashboard(isAdmin);
  }
}

/* ================= DASHBOARD ================= */

function computeTodayAttendance() {
  const today = todayISO();
  return State.attendance.filter(a => a['Date'] === today);
}

function renderDashboard(isAdmin) {
  const todayAtt = computeTodayAttendance();
  const totalEmployees = State.employees.length;
  const present = todayAtt.filter(a => a['Status'] === 'Present').length;
  const absent = todayAtt.filter(a => a['Status'] === 'Absent').length;
  const late = todayAtt.filter(a => a['Status'] === 'Late').length;
  const leave = todayAtt.filter(a => a['Status'] === 'Leave').length;

  const emp = State.user.employee || {};
  const myToday = todayAtt.find(a => String(a['EMP ID']) === String(State.user.empId));

  const rows = todayAtt.slice(0, 8).map(a => `
    <tr>
      <td>${escapeHtml(a['Date'])}</td>
      <td>${escapeHtml(a['EMP ID'])}</td>
      <td>${escapeHtml(a['Employee Name'])}</td>
      <td>${escapeHtml(a['Punch In'] || '—')}</td>
      <td>${escapeHtml(a['Punch Out'] || '—')}</td>
      <td>${escapeHtml(a['Working Hours'] ?? '0')}</td>
      <td><span class="badge ${escapeHtml(a['Status'])}">${escapeHtml(a['Status'])}</span></td>
    </tr>
  `).join('') || `<tr><td colspan="7"><div class="empty-state"><div class="ic">📋</div>Aaj ka attendance data abhi nahi hai</div></td></tr>`;

  return `
    <div class="kpi-row">
      <div class="kpi-card"><div class="kpi-icon">👥</div><div class="kpi-number">${totalEmployees}</div><div class="kpi-label">Total employees</div></div>
      <div class="kpi-card status-Present"><div class="kpi-icon">✓</div><div class="kpi-number">${present}</div><div class="kpi-label">Present today</div></div>
      <div class="kpi-card status-Absent"><div class="kpi-icon">✕</div><div class="kpi-number">${absent}</div><div class="kpi-label">Absent</div></div>
      <div class="kpi-card status-Late"><div class="kpi-icon">⏳</div><div class="kpi-number">${late}</div><div class="kpi-label">Late</div></div>
      <div class="kpi-card"><div class="kpi-icon">📅</div><div class="kpi-number">${leave}</div><div class="kpi-label">On leave</div></div>
    </div>

    <div class="card">
      <h3>Welcome back, ${escapeHtml(emp['Name'] || State.user.empId)} 👋</h3>
      <p class="card-sub">${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
      ${myToday ? `
        <div style="display:flex;gap:20px;flex-wrap:wrap;font-size:13px;font-weight:600;">
          <span>🟢 Punch In — ${escapeHtml(myToday['Punch In'] || '—')}</span>
          <span>🔴 Punch Out — ${escapeHtml(myToday['Punch Out'] || '—')}</span>
          <span>⏱ ${escapeHtml(myToday['Working Hours'] ?? 0)} hrs today</span>
        </div>
      ` : `<div class="empty-state" style="padding:10px 0;">Aaj ka punch record nahi mila</div>`}
    </div>

    <div class="table-wrap">
      <div style="padding:14px 16px 0;"><h3>${isAdmin ? "Today's Attendance — All Employees" : 'My Recent Attendance'}</h3></div>
      <table>
        <thead><tr><th>Date</th><th>Emp ID</th><th>Name</th><th>Time In</th><th>Time Out</th><th>Hours</th><th>Status</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

function attachDashboardEvents() { /* static content, nothing to wire yet */ }

/* ================= EMPLOYEES ================= */

function filteredEmployees() {
  const q = (document.getElementById('empSearch')?.value || '').toLowerCase().trim();
  const dept = document.getElementById('empDeptFilter')?.value || '';
  return State.employees.filter(e => {
    const matchesQ = !q || [e['Name'], e['EMP ID'], e['Department'], e['Designation']]
      .some(v => String(v ?? '').toLowerCase().includes(q));
    const matchesDept = !dept || e['Department'] === dept;
    return matchesQ && matchesDept;
  });
}

function employeeCardsHtml(list) {
  return list.map((e, i) => {
    const [c1, c2] = avatarColor(e['EMP ID']);
    return `
      <div class="emp-card" style="animation-delay:${Math.min(i * 0.03, 0.4)}s" data-emp-id="${escapeHtml(e['EMP ID'])}">
        <div class="emp-avatar" style="background:linear-gradient(135deg,${c1},${c2});">${initials(e['Name'])}</div>
        <div class="emp-name">${escapeHtml(e['Name'])}</div>
        <div class="emp-role">${escapeHtml(e['Designation'] || '—')}</div>
        <div class="emp-dept-badge">${escapeHtml(e['Department'] || '—')}</div>
        ${isAdmin ? `
          <div class="row-actions" style="justify-content:center;margin-top:10px;">
            <button class="icon-btn edit-emp-btn" data-row="${e._row}" title="Edit">✎</button>
            <button class="icon-btn delete-emp-btn" data-row="${e._row}" data-name="${escapeHtml(e['Name'])}" title="Delete">🗑</button>
          </div>` : ''}
      </div>
    `;
  }).join('') || `<div class="empty-state" style="grid-column:1/-1;"><div class="ic">👤</div>Koi employee nahi mila</div>`;
}

function renderEmployees(isAdmin) {
  const depts = [...new Set(State.employees.map(e => e['Department']).filter(Boolean))].sort();
  const list = filteredEmployees();

  return `
    <div class="section-head"><h2>Employees</h2>${isAdmin ? `<button class="btn-yellow" id="addEmpBtn">+ Add Employee</button>` : ''}</div>
    <div class="toolbar">
      <input type="text" id="empSearch" placeholder="Search by name, ID or department">
      <select id="empDeptFilter"><option value="">All departments</option>${depts.map(d => `<option value="${escapeHtml(d)}">${escapeHtml(d)}</option>`).join('')}</select>
      <span class="spacer"></span>
      <span class="emp-count-label" id="empCountLabel">${list.length} of ${State.employees.length} employees</span>
    </div>
    <div class="emp-grid" id="empGrid">${employeeCardsHtml(list)}</div>
  `;
}

function refreshEmployeeGrid(isAdmin) {
  const list = filteredEmployees();
  document.getElementById('empGrid').innerHTML = employeeCardsHtml(list);
  document.getElementById('empCountLabel').textContent = `${list.length} of ${State.employees.length} employees`;
  wireEmployeeCardEvents(isAdmin);
}

function wireEmployeeCardEvents(isAdmin) {
  document.querySelectorAll('.emp-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('.icon-btn')) return;
      State.activeProfileEmpId = card.dataset.empId;
      navigate('profile');
    });
  });
  document.querySelectorAll('.edit-emp-btn').forEach(btn => btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const emp = State.employees.find(x => String(x._row) === btn.dataset.row);
    openEmployeeModal(emp);
  }));
  document.querySelectorAll('.delete-emp-btn').forEach(btn => btn.addEventListener('click', async (e) => {
    e.stopPropagation();
    if (!confirm(`${btn.dataset.name} ko delete karna hai? Ye action wapis nahi ho sakta.`)) return;
    try {
      await Api.deleteEmployee(Number(btn.dataset.row));
      State.employees = State.employees.filter(x => String(x._row) !== btn.dataset.row);
      toast('Employee delete ho gaya', 'success');
      refreshEmployeeGrid(isAdmin);
    } catch (err) { toast('Delete nahi ho saka: ' + err.message, 'error'); }
  }));
}

function attachEmployeesEvents(isAdmin) {
  let debounceTimer;
  document.getElementById('empSearch')?.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => refreshEmployeeGrid(isAdmin), 150);
  });
  document.getElementById('empDeptFilter')?.addEventListener('change', () => refreshEmployeeGrid(isAdmin));
  document.getElementById('addEmpBtn')?.addEventListener('click', () => openEmployeeModal(null));
  wireEmployeeCardEvents(isAdmin);
}

function openEmployeeModal(emp) {
  const isEdit = !!emp;
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal">
      <h3>${isEdit ? 'Edit Employee' : 'Add New Employee'}</h3>
      <p class="modal-sub">${isEdit ? 'Details update karein aur save karein.' : 'Naya employee Google Sheet me add ho jayega.'}</p>
      <form id="empForm">
        <div class="form-grid">
          <div><label>Employee ID *</label><input name="EMP ID" type="number" required value="${escapeHtml(emp?.['EMP ID'] ?? '')}" ${isEdit ? 'readonly' : ''}></div>
          <div><label>Name *</label><input name="Name" required value="${escapeHtml(emp?.['Name'] ?? '')}"></div>
          <div><label>Designation</label><input name="Designation" value="${escapeHtml(emp?.['Designation'] ?? '')}"></div>
          <div><label>Department</label><input name="Department" value="${escapeHtml(emp?.['Department'] ?? '')}"></div>
          <div><label>Team</label><input name="Team" value="${escapeHtml(emp?.['Team'] ?? '')}"></div>
          <div><label>Joining Date</label><input name="D.O.J" type="date" value="${escapeHtml(emp?.['D.O.J'] ?? '')}"></div>
          <div><label>Timings</label><input name="Timings" placeholder="9:00 TO 6:00" value="${escapeHtml(emp?.['Timings'] ?? '')}"></div>
          <div><label>Salary</label><input name="Salary" type="number" value="${escapeHtml(emp?.['Salary'] ?? '')}"></div>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn-secondary" id="cancelEmpModal">Cancel</button>
          <button type="submit" class="btn-yellow" id="saveEmpBtn">${isEdit ? 'Save changes' : 'Add employee'}</button>
        </div>
      </form>
    </div>
  `;
  document.body.appendChild(overlay);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
  overlay.querySelector('#cancelEmpModal').addEventListener('click', () => overlay.remove());
  overlay.querySelector('#empForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const saveBtn = overlay.querySelector('#saveEmpBtn');
    const fd = new FormData(e.target);
    const payload = Object.fromEntries(fd.entries());
    payload['EMP ID'] = Number(payload['EMP ID']);
    payload['Salary'] = payload['Salary'] ? Number(payload['Salary']) : '';

    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving…';
    try {
      if (isEdit) {
        await Api.updateEmployee(emp._row, payload);
        Object.assign(emp, payload);
        toast('Employee update ho gaya', 'success');
      } else {
        await Api.addEmployee(payload);
        toast('Employee add ho gaya', 'success');
        const data = await Api.bootstrap({ useCache: false });
        State.employees = data.employees || [];
      }
      overlay.remove();
      renderPage();
    } catch (err) {
      toast('Save nahi ho saka: ' + err.message, 'error');
      saveBtn.disabled = false;
      saveBtn.textContent = isEdit ? 'Save changes' : 'Add employee';
    }
  });
}

/* ================= PAYROLL ================= */

function renderPayroll(isAdmin) {
  const list = isAdmin ? State.payroll : State.payroll.filter(p => String(p['EMP ID']) === String(State.user.empId));
  const gross = list.reduce((s, p) => s + (Number(p['Gross Salary']) || 0), 0);
  const net = list.reduce((s, p) => s + (Number(p['Net Salary']) || 0), 0);
  const deductions = list.reduce((s, p) => s + (Number(p['Deductions']) || 0), 0);

  const rows = list.map(p => `
    <tr>
      <td>${escapeHtml(p['EMP ID'])}</td>
      <td>${escapeHtml(p['Employee Name'])}</td>
      <td>${escapeHtml(p['Month'])}</td>
      <td>Rs ${Number(p['Basic Salary'] || 0).toLocaleString()}</td>
      <td>Rs ${Number(p['Gross Salary'] || 0).toLocaleString()}</td>
      <td>Rs ${Number(p['Deductions'] || 0).toLocaleString()}</td>
      <td><strong>Rs ${Number(p['Net Salary'] || 0).toLocaleString()}</strong></td>
      <td><span class="badge ${escapeHtml(p['Status'])}">${escapeHtml(p['Status'])}</span></td>
    </tr>
  `).join('') || `<tr><td colspan="8"><div class="empty-state"><div class="ic">💰</div>Payroll data abhi available nahi</div></td></tr>`;

  return `
    <div class="section-head"><h2>Payroll</h2></div>
    <div class="kpi-row">
      <div class="kpi-card"><div class="kpi-icon">👥</div><div class="kpi-number">${list.length}</div><div class="kpi-label">Records</div></div>
      <div class="kpi-card status-Present"><div class="kpi-icon">💰</div><div class="kpi-number">Rs ${gross.toLocaleString()}</div><div class="kpi-label">Gross payroll</div></div>
      <div class="kpi-card status-Absent"><div class="kpi-icon">−</div><div class="kpi-number">Rs ${deductions.toLocaleString()}</div><div class="kpi-label">Deductions</div></div>
      <div class="kpi-card status-Late"><div class="kpi-icon">✓</div><div class="kpi-number">Rs ${net.toLocaleString()}</div><div class="kpi-label">Net payable</div></div>
    </div>
    <div class="table-wrap">
      <table>
        <thead><tr><th>Emp ID</th><th>Name</th><th>Month</th><th>Basic</th><th>Gross</th><th>Deductions</th><th>Net</th><th>Status</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

/* ================= ATTENDANCE ================= */

function renderAttendance(isAdmin) {
  const base = isAdmin ? State.attendance : State.attendance.filter(a => String(a['EMP ID']) === String(State.user.empId));
  return `
    <div class="section-head"><h2>Attendance</h2></div>
    <div class="toolbar">
      <label style="font-size:12px;font-weight:600;">From <input type="date" id="attFrom" style="margin-top:4px;"></label>
      <label style="font-size:12px;font-weight:600;">To <input type="date" id="attTo" style="margin-top:4px;"></label>
      <button class="btn-secondary" id="attApply">Apply filters</button>
      <span class="spacer"></span>
      <span class="emp-count-label">${base.length} records</span>
    </div>
    <div class="table-wrap">
      <table>
        <thead><tr><th>Date</th><th>Emp ID</th><th>Name</th><th>Time In</th><th>Time Out</th><th>Hours</th><th>Status</th></tr></thead>
        <tbody id="attBody">${attendanceRows(base)}</tbody>
      </table>
    </div>
  `;
}

function attendanceRows(rows) {
  return rows.slice(0, 200).map(a => `
    <tr>
      <td>${escapeHtml(a['Date'])}</td>
      <td>${escapeHtml(a['EMP ID'])}</td>
      <td>${escapeHtml(a['Employee Name'])}</td>
      <td>${escapeHtml(a['Punch In'] || '—')}</td>
      <td>${escapeHtml(a['Punch Out'] || '—')}</td>
      <td>${escapeHtml(a['Working Hours'] ?? '0')}</td>
      <td><span class="badge ${escapeHtml(a['Status'])}">${escapeHtml(a['Status'])}</span></td>
    </tr>
  `).join('') || `<tr><td colspan="7"><div class="empty-state"><div class="ic">📋</div>Koi record nahi mila</div></td></tr>`;
}

function attachAttendanceEvents() {
  document.getElementById('attApply')?.addEventListener('click', () => {
    const isAdmin = String(State.user.role).toLowerCase() === 'admin';
    const base = isAdmin ? State.attendance : State.attendance.filter(a => String(a['EMP ID']) === String(State.user.empId));
    const from = document.getElementById('attFrom').value;
    const to = document.getElementById('attTo').value;
    const filtered = base.filter(a => (!from || a['Date'] >= from) && (!to || a['Date'] <= to));
    document.getElementById('attBody').innerHTML = attendanceRows(filtered);
  });
}

/* ================= REQUESTS (Leave) ================= */

function renderRequests(isAdmin) {
  const list = isAdmin ? State.requests : State.requests.filter(r => String(r['EMP ID']) === String(State.user.empId));
  const rows = list.map(r => `
    <tr>
      <td>${escapeHtml(r['ID'])}</td>
      <td>${escapeHtml(r['Employee Name'])}</td>
      <td>${escapeHtml(r['Leave Type'])}</td>
      <td>${escapeHtml(r['Leave From'])} → ${escapeHtml(r['Leave To'])}</td>
      <td>${escapeHtml(r['Reason'])}</td>
      <td><span class="badge ${escapeHtml(r['Status'])}">${escapeHtml(r['Status'])}</span></td>
      ${isAdmin ? `<td class="row-actions">
        ${r['Status'] === 'Pending' ? `
          <button class="btn-secondary approve-req-btn" data-row="${r._row}" style="padding:5px 10px;">Approve</button>
          <button class="btn-danger-ghost reject-req-btn" data-row="${r._row}">Reject</button>` : '—'}
      </td>` : ''}
    </tr>
  `).join('') || `<tr><td colspan="${isAdmin ? 7 : 6}"><div class="empty-state"><div class="ic">📋</div>Koi leave request nahi</div></td></tr>`;

  return `
    <div class="section-head"><h2>Leave Requests</h2>${!isAdmin ? `<button class="btn-yellow" id="newReqBtn">+ Request Leave</button>` : ''}</div>
    <div class="table-wrap">
      <table>
        <thead><tr><th>ID</th><th>Employee</th><th>Type</th><th>Dates</th><th>Reason</th><th>Status</th>${isAdmin ? '<th>Actions</th>' : ''}</tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

function attachRequestsEvents(isAdmin) {
  document.getElementById('newReqBtn')?.addEventListener('click', openLeaveRequestModal);
  document.querySelectorAll('.approve-req-btn').forEach(btn => btn.addEventListener('click', () => actOnRequest(btn.dataset.row, 'Approved')));
  document.querySelectorAll('.reject-req-btn').forEach(btn => btn.addEventListener('click', () => actOnRequest(btn.dataset.row, 'Rejected')));
}

async function actOnRequest(row, status) {
  try {
    await Api.updateRequestStatus(Number(row), status, State.user.employee?.['Name'] || 'Admin');
    const r = State.requests.find(x => String(x._row) === row);
    if (r) r['Status'] = status;
    toast(`Request ${status.toLowerCase()}`, 'success');
    renderPage();
  } catch (err) { toast('Update fail: ' + err.message, 'error'); }
}

function openLeaveRequestModal() {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal">
      <h3>Request Leave</h3>
      <p class="modal-sub">Aapka request admin ko bhej diya jayega approval ke liye.</p>
      <form id="reqForm">
        <div class="form-grid">
          <div><label>Leave Type</label><select name="Leave Type"><option>Casual</option><option>Sick</option><option>Annual</option></select></div>
          <div></div>
          <div><label>From</label><input name="Leave From" type="date" required></div>
          <div><label>To</label><input name="Leave To" type="date" required></div>
          <div class="full"><label>Reason</label><input name="Reason" required placeholder="Briefly describe the reason"></div>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn-secondary" id="cancelReqModal">Cancel</button>
          <button type="submit" class="btn-yellow">Submit request</button>
        </div>
      </form>
    </div>
  `;
  document.body.appendChild(overlay);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
  overlay.querySelector('#cancelReqModal').addEventListener('click', () => overlay.remove());
  overlay.querySelector('#reqForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const payload = Object.fromEntries(fd.entries());
    payload['EMP ID'] = State.user.empId;
    payload['Employee Name'] = State.user.employee?.['Name'] || '';
    try {
      await Api.addRequest(payload);
      toast('Leave request bhej diya gaya', 'success');
      const data = await Api.bootstrap({ useCache: false });
      State.requests = data.requests || [];
      overlay.remove();
      renderPage();
    } catch (err) { toast('Request fail: ' + err.message, 'error'); }
  });
}

/* ================= EMPLOYEE PROFILE ================= */

function renderProfile(empId) {
  const emp = State.employees.find(e => String(e['EMP ID']) === String(empId));
  if (!emp) return `<div class="empty-state"><div class="ic">👤</div>Employee nahi mila</div>`;

  const empAttendance = State.attendance.filter(a => String(a['EMP ID']) === String(empId));
  const empPayroll = State.payroll.filter(p => String(p['EMP ID']) === String(empId));
  const present = empAttendance.filter(a => a['Status'] === 'Present').length;
  const absent = empAttendance.filter(a => a['Status'] === 'Absent').length;
  const late = empAttendance.filter(a => a['Status'] === 'Late').length;
  const rate = empAttendance.length ? Math.round((present / empAttendance.length) * 100) : 0;
  const latestPay = empPayroll[empPayroll.length - 1];
  const [c1, c2] = avatarColor(emp['EMP ID']);

  const attRows = empAttendance.slice(-10).reverse().map(a => `
    <tr>
      <td>${escapeHtml(a['Date'])}</td><td>${escapeHtml(a['Punch In'] || '—')}</td><td>${escapeHtml(a['Punch Out'] || '—')}</td>
      <td>${escapeHtml(a['Working Hours'] ?? 0)}</td><td><span class="badge ${escapeHtml(a['Status'])}">${escapeHtml(a['Status'])}</span></td>
    </tr>
  `).join('') || `<tr><td colspan="5"><div class="empty-state">Attendance history nahi mili</div></td></tr>`;

  return `
    <button class="back-link" id="backToEmpBtn">← Back to employees</button>
    <div class="profile-banner">
      <div class="profile-avatar-lg" style="background:linear-gradient(135deg,${c1},${c2});">${initials(emp['Name'])}</div>
      <div class="profile-banner-info">
        <h2>${escapeHtml(emp['Name'])}</h2>
        <div class="role-line">${escapeHtml(emp['Designation'] || '—')} · ${escapeHtml(emp['Department'] || '—')} · EMP${escapeHtml(emp['EMP ID'])}</div>
        <div>
          <span class="profile-tag active-tag">Active</span>
          <span class="profile-tag">Joined ${escapeHtml(emp['D.O.J'] || '—')}</span>
        </div>
      </div>
    </div>

    <div class="mini-stat-row">
      <div class="mini-stat"><div class="n">${present}</div><div class="l">Present</div></div>
      <div class="mini-stat"><div class="n">${absent}</div><div class="l">Absent</div></div>
      <div class="mini-stat"><div class="n">${late}</div><div class="l">Late</div></div>
      <div class="mini-stat"><div class="n">${rate}%</div><div class="l">Attendance rate</div></div>
    </div>

    <div class="info-grid" style="margin-bottom:20px;">
      <div class="info-item"><div class="lbl">Employee ID</div><div class="val">EMP${escapeHtml(emp['EMP ID'])}</div></div>
      <div class="info-item"><div class="lbl">Department</div><div class="val">${escapeHtml(emp['Department'] || '—')}</div></div>
      <div class="info-item"><div class="lbl">Team</div><div class="val">${escapeHtml(emp['Team'] || '—')}</div></div>
      <div class="info-item"><div class="lbl">Timings</div><div class="val">${escapeHtml(emp['Timings'] || '—')}</div></div>
      <div class="info-item"><div class="lbl">Salary</div><div class="val">${emp['Salary'] ? 'Rs ' + Number(emp['Salary']).toLocaleString() : '—'}</div></div>
      <div class="info-item"><div class="lbl">Joining Date</div><div class="val">${escapeHtml(emp['D.O.J'] || '—')}</div></div>
    </div>

    <div class="card">
      <h3>Recent Attendance</h3>
      <div class="table-wrap" style="box-shadow:none;">
        <table><thead><tr><th>Date</th><th>In</th><th>Out</th><th>Hours</th><th>Status</th></tr></thead><tbody>${attRows}</tbody></table>
      </div>
    </div>

    ${latestPay ? `
    <div class="card">
      <h3>Latest Payslip — ${escapeHtml(latestPay['Month'])}</h3>
      <div style="display:flex;gap:30px;flex-wrap:wrap;margin-top:10px;">
        <div><div class="info-item lbl">Gross</div><div class="val">Rs ${Number(latestPay['Gross Salary'] || 0).toLocaleString()}</div></div>
        <div><div class="info-item lbl">Deductions</div><div class="val">Rs ${Number(latestPay['Deductions'] || 0).toLocaleString()}</div></div>
        <div><div class="info-item lbl">Net Pay</div><div class="val" style="font-size:17px;font-weight:700;">Rs ${Number(latestPay['Net Salary'] || 0).toLocaleString()}</div></div>
      </div>
    </div>` : ''}
  `;
}

function attachProfileEvents() {
  document.getElementById('backToEmpBtn')?.addEventListener('click', () => navigate('employees'));
}

/* ================= NOTIFICATIONS ================= */

function toggleNotifPanel() {
  let panel = document.getElementById('notifPanel');
  if (panel) { panel.remove(); return; }
  const unread = State.notifications.filter(n => !n['Read']);
  panel = document.createElement('div');
  panel.id = 'notifPanel';
  panel.style.cssText = 'position:absolute;top:60px;right:24px;width:320px;max-height:420px;overflow-y:auto;background:#fff;border:1px solid var(--border);border-radius:12px;box-shadow:var(--shadow-hover);z-index:60;padding:10px;';
  panel.innerHTML = (State.notifications.slice(-15).reverse().map(n => `
    <div style="padding:10px;border-radius:8px;${!n['Read'] ? 'background:var(--yellow-soft);' : ''}margin-bottom:4px;">
      <div style="font-weight:700;font-size:12.5px;">${escapeHtml(n['Title'])}</div>
      <div style="font-size:12px;color:var(--muted);margin-top:2px;">${escapeHtml(n['Body'])}</div>
    </div>
  `).join('')) || `<div class="empty-state">Koi notification nahi</div>`;
  document.body.appendChild(panel);
  setTimeout(() => document.addEventListener('click', function closeOnce(e) {
    if (!panel.contains(e.target) && e.target.id !== 'notifBtn') { panel.remove(); document.removeEventListener('click', closeOnce); }
  }), 10);
}

/* ================= INIT ================= */

document.addEventListener('DOMContentLoaded', () => {
  if (!CONFIG.API_URL || CONFIG.API_URL.includes('PASTE_YOUR')) {
    const err = document.getElementById('loginError');
    err.textContent = '⚠️ js/config.js me abhi Apps Script URL set nahi hai. Setup ke liye README.md dekhein.';
    err.classList.add('show');
  }

  renderCarousel();
  startCarousel();
  startClock();

  document.querySelectorAll('.role-toggle button').forEach(b => b.addEventListener('click', () => setRole(b.dataset.role)));
  document.getElementById('carouselNext').addEventListener('click', () => { nextSlide(); startCarousel(); });
  document.getElementById('carouselPrev').addEventListener('click', () => { prevSlide(); startCarousel(); });
  document.getElementById('loginForm').addEventListener('submit', handleLogin);

  const savedUser = sessionStorage.getItem('sc_user');
  if (savedUser) {
    try {
      State.user = JSON.parse(savedUser);
      bootApp();
    } catch (_) { sessionStorage.removeItem('sc_user'); }
  }
});
