const API = '';
const persianDays = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه'];
let subjects = [], teachers = [];

// ─── Utils ───
const $ = id => document.getElementById(id);
const showToast = (msg, type='info') => {
  const t = $('toast');
  t.textContent = msg;
  t.style.background = type === 'error' ? '#ff7675' : '#2d3436';
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
};

async function api(url, opts = {}) {
  try {
    const res = await fetch(API + url, {
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      ...opts
    });
    const data = await res.json();
    if (!res.ok) {
      if (res.status === 401) { location.reload(); throw new Error('Login required'); }
      throw new Error(data.error);
    }
    return data;
  } catch (e) { showToast(e.message, 'error'); throw e; }
}

// ─── Auth ───
$('loginForm').onsubmit = async e => {
  e.preventDefault();
  try {
    await api('/api/login', { method: 'POST', body: JSON.stringify({ username: $('loginUsername').value, password: $('loginPassword').value }) });
    location.reload();
  } catch(e){}
};

async function logout() {
  await api('/api/logout', { method: 'POST' });
  location.reload();
}

async function checkAuth() {
  const me = await api('/api/me');
  if (me.loggedIn) {
    $('loginPage').classList.remove('active');
    $('appPage').classList.add('active');
    $('userNameDisplay').textContent = me.name;
    loadAll();
  } else {
    $('loginPage').classList.add('active');
    $('appPage').classList.remove('active');
  }
}

// ─── Navigation ───
window.showPage = pageId => {
  document.querySelectorAll('.page-section').forEach(el => el.classList.remove('active'));
  $(pageId).classList.add('active');
  document.querySelectorAll('.nav-links li').forEach(el => el.classList.remove('active'));
  event.currentTarget.classList.add('active');
  $('pageTitle').textContent = event.currentTarget.textContent.trim();
};

window.toggleTheme = () => document.body.classList.toggle('dark-mode');

// ─── Data Loading ───
async function loadAll() {
  subjects = await api('/api/subjects');
  teachers = await api('/api/teachers');
  updateSelects();
  loadDashboard();
  loadLogs();
  loadSchedule();
  loadTeachers();
  loadSubjects();
}

function updateSelects() {
  const subOpts = subjects.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
  $('studySubject').innerHTML = subOpts;
  $('schSubject').innerHTML = subOpts;
  
  const teachOpts = teachers.map(t => `<option value="${t.id}">${t.name}</option>`).join('');
  $('schTeacher').innerHTML = '<option value="">بدون استاد</option>' + teachOpts;
}

// ─── Dashboard ───
async function loadDashboard() {
  const stats = await api('/api/stats/overview');
  $('statToday').textContent = `${stats.today.total_minutes} دقیقه`;
  $('statWeek').textContent = `${Math.floor(stats.week.total_minutes / 60)} ساعت`;
  
  const chart = $('subjectChart');
  chart.innerHTML = stats.subjectBreakdown.map(s => `
    <div style="margin-bottom:10px">
      <div style="display:flex;justify-content:space-between;margin-bottom:5px">
        <span>${s.icon} ${s.name}</span>
        <span>${s.total_minutes} دقیقه</span>
      </div>
      <div style="background:#eee;height:8px;border-radius:4px;overflow:hidden">
        <div style="width:${Math.min((s.total_minutes / (stats.week.total_minutes || 1)) * 100, 100)}%;background:${s.color};height:100%"></div>
      </div>
    </div>
  `).join('');
}

// ─── Study Logs ───
$('studyForm').onsubmit = async e => {
  e.preventDefault();
  const data = {
    subject_id: $('studySubject').value,
    study_date: $('studyDate').value,
    start_time: $('studyStart').value,
    end_time: $('studyEnd').value,
    topic: $('studyTopic').value,
    quality_rating: $('studyQuality').value
  };
  await api('/api/study-logs', { method: 'POST', body: JSON.stringify(data) });
  showToast('مطالعه ثبت شد ✅');
  loadLogs();
  loadDashboard();
  e.target.reset();
  $('studyDate').valueAsDate = new Date();
};

async function loadLogs() {
  const logs = await api('/api/study-logs');
  $('logsList').innerHTML = logs.map(l => `
    <div style="padding:10px;border-bottom:1px solid #eee;display:flex;justify-content:space-between;align-items:center">
      <div>
        <strong style="color:${l.color}">${l.icon} ${l.subject_name}</strong>
        <small style="display:block;color:#888">${l.topic || '-'}</small>
      </div>
      <div style="text-align:left">
        <span style="font-weight:bold">${l.duration_minutes} دقیقه</span>
        <button onclick="deleteLog(${l.id})" style="color:red;background:none;border:none;cursor:pointer;margin-right:10px">🗑️</button>
      </div>
    </div>
  `).join('');
}

window.deleteLog = async id => {
  if(confirm('حذف شود؟')) {
    await api(`/api/study-logs/${id}`, { method: 'DELETE' });
    loadLogs();
    loadDashboard();
  }
};

// ─── Schedule ───
async function loadSchedule() {
  const sch = await api('/api/schedule');
  $('scheduleTable').querySelector('tbody').innerHTML = sch.map(s => `
    <tr>
      <td>${persianDays[s.day_of_week]}</td>
      <td>${s.start_time.substring(0,5)} - ${s.end_time.substring(0,5)}</td>
      <td>${s.subject_name}</td>
      <td>${s.teacher_name || '-'}</td>
      <td><button onclick="deleteSch(${s.id})" class="btn-danger sm" style="padding:5px 10px;font-size:12px">حذف</button></td>
    </tr>
  `).join('');
}

$('scheduleForm').onsubmit = async e => {
  e.preventDefault();
  const data = {
    day_of_week: $('schDay').value,
    start_time: $('schStart').value,
    end_time: $('schEnd').value,
    subject_id: $('schSubject').value,
    teacher_id: $('schTeacher').value
  };
  await api('/api/schedule', { method: 'POST', body: JSON.stringify(data) });
  closeModal('scheduleModal');
  loadSchedule();
};

window.deleteSch = async id => {
  if(confirm('حذف شود؟')) {
    await api(`/api/schedule/${id}`, { method: 'DELETE' });
    loadSchedule();
  }
};

// ─── Teachers & Subjects ───
async function loadTeachers() {
  const list = await api('/api/teachers');
  $('teachersGrid').innerHTML = list.map(t => `
    <div class="card-item">
      ${t.photo_url ? `<img src="${t.photo_url}">` : '<div style="width:80px;height:80px;background:#ddd;border-radius:50%;margin:0 auto 10px"></div>'}
      <h4>${t.name}</h4>
      <p style="font-size:12px;color:#888">${t.specialty || ''}</p>
      <button onclick="deleteTeacher(${t.id})" style="margin-top:10px;color:red;background:none;border:none;cursor:pointer">حذف</button>
    </div>
  `).join('');
}

$('teacherForm').onsubmit = async e => {
  e.preventDefault();
  const formData = new FormData();
  formData.append('name', $('tName').value);
  formData.append('specialty', $('tSpec').value);
  if($('tPhoto').files[0]) formData.append('photo', $('tPhoto').files[0]);
  
  await fetch(API + '/api/teachers', { method: 'POST', body: formData, credentials: 'include' });
  closeModal('teacherModal');
  loadTeachers();
};

window.deleteTeacher = async id => {
  if(confirm('حذف شود؟')) {
    await api(`/api/teachers/${id}`, { method: 'DELETE' });
    loadTeachers();
  }
};

async function loadSubjects() {
  const list = await api('/api/subjects');
  $('subjectsGrid').innerHTML = list.map(s => `
    <div class="card-item" style="border-right: 5px solid ${s.color}">
      <div style="font-size:30px;margin-bottom:10px">${s.icon}</div>
      <h4>${s.name}</h4>
      <button onclick="deleteSubject(${s.id})" style="margin-top:10px;color:red;background:none;border:none;cursor:pointer">حذف</button>
    </div>
  `).join('');
}

$('subjectForm').onsubmit = async e => {
  e.preventDefault();
  const data = { name: $('sName').value, color: $('sColor').value, icon: $('sIcon').value };
  await api('/api/subjects', { method: 'POST', body: JSON.stringify(data) });
  closeModal('subjectModal');
  loadSubjects();
  updateSelects();
};

window.deleteSubject = async id => {
  if(confirm('حذف شود؟')) {
    await api(`/api/subjects/${id}`, { method: 'DELETE' });
    loadSubjects();
  }
};

// ─── Modal Helpers ───
window.openModal = id => $(id).classList.add('active');
window.closeModal = id => $(id).classList.remove('active');

// ─── Init ───
$('studyDate').valueAsDate = new Date();
checkAuth();
