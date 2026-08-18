// ═══════════════════════════════════════════
// Student Study Tracker - Frontend App
// ═══════════════════════════════════════════

const API = '';
const persianDays = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه'];

// ──────────── State ────────────
let subjects = [];
let teachers = [];
let schedule = [];
let studyLogs = [];
let exams = [];
let goals = [];

// ──────────── Utility Functions ────────────
function $(sel) { return document.querySelector(sel); }
function $$(sel) { return document.querySelectorAll(sel); }

async function api(url, options = {}) {
  try {
    const res = await fetch(API + url, {
      headers: { 'Content-Type': 'application/json' },
      ...options
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'خطا');
    return data;
  } catch (err) {
    console.error('API Error:', err);
    throw err;
  }
}

async function apiFormData(url, formData) {
  try {
    const res = await fetch(API + url, {
      method: 'POST',
      body: formData
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'خطا');
    return data;
  } catch (err) {
    console.error('API Error:', err);
    throw err;
  }
}

function showToast(message, type = 'info') {
  const toast = $('#toast');
  toast.textContent = message;
  toast.className = 'toast ' + type + ' show';
  setTimeout(() => toast.classList.remove('show'), 3000);
}

function formatMinutes(min) {
  if (min < 60) return `${min} دقیقه`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `${h} ساعت و ${m} دقیقه` : `${h} ساعت`;
}

function formatDate(dateStr) {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('fa-IR');
  } catch { return dateStr; }
}

function getQualityStars(rating) {
  return '⭐'.repeat(rating);
}

function getScoreClass(score, max) {
  const pct = (score / max) * 100;
  if (pct >= 85) return 'score-excellent';
  if (pct >= 70) return 'score-good';
  if (pct >= 50) return 'score-average';
  return 'score-poor';
}

// ──────────── Auth ────────────
async function checkAuth() {
  try {
    const data = await api('/api/me');
    if (data.loggedIn) {
      showApp(data.name);
    } else {
      showLogin();
    }
  } catch {
    showLogin();
  }
}

function showLogin() {
  $('#loginPage').classList.add('active');
  $('#appPage').classList.remove('active');
}

function showApp(name) {
  $('#loginPage').classList.remove('active');
  $('#appPage').classList.add('active');
  $('#userName').textContent = name;
  loadAllData();
}

$('#loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    const data = await api('/api/login', {
      method: 'POST',
      body: JSON.stringify({
        username: $('#loginUsername').value,
        password: $('#loginPassword').value
      })
    });
    showApp(data.user.name);
    showToast('خوش آمدید! 👋', 'success');
  } catch (err) {
    showToast(err.message, 'error');
  }
});

$('#logoutBtn').addEventListener('click', async () => {
  await api('/api/logout', { method: 'POST' });
  showLogin();
  showToast('خروج موفق', 'info');
});

// ──────────── Navigation ────────────
$$('.nav-item').forEach(item => {
  item.addEventListener('click', (e) => {
    e.preventDefault();
    const page = item.dataset.page;
    navigateTo(page);
    // Close mobile sidebar
    $('#sidebar').classList.remove('open');
    $$('.sidebar-overlay').forEach(o => o.classList.remove('active'));
  });
});

function navigateTo(page) {
  $$('.nav-item').forEach(n => n.classList.remove('active'));
  $(`.nav-item[data-page="${page}"]`).classList.add('active');

  $$('.page-section').forEach(s => s.classList.remove('active'));
  $(`#page-${page}`).classList.add('active');

  const titles = {
    'dashboard': 'داشبورد',
    'study-log': 'ثبت مطالعه',
    'schedule': 'برنامه هفتگی',
    'teachers': 'اساتید',
    'subjects': 'دروس',
    'exams': 'امتحانات',
    'goals': 'اهداف'
  };
  $('#pageTitle').textContent = titles[page] || page;
}

// Mobile menu toggle
$('#menuToggle').addEventListener('click', () => {
  $('#sidebar').classList.toggle('open');
  let overlay = $('.sidebar-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.className = 'sidebar-overlay';
    document.body.appendChild(overlay);
  }
  overlay.classList.toggle('active');
  overlay.addEventListener('click', () => {
    $('#sidebar').classList.remove('open');
    overlay.classList.remove('active');
  });
});

// ──────────── Load All Data ────────────
async function loadAllData() {
  await Promise.all([
    loadSubjects(),
    loadTeachers(),
    loadSchedule(),
    loadStudyLogs(),
    loadExams(),
    loadGoals(),
    loadDashboard()
  ]);
}

// ──────────── Dashboard ────────────
async function loadDashboard() {
  try {
    const stats = await api('/api/stats/overview');

    $('#statToday').textContent = formatMinutes(stats.today.total_minutes);
    $('#statWeek').textContent = formatMinutes(stats.week.total_minutes);
    $('#statMonth').textContent = formatMinutes(stats.month.total_minutes);
    $('#statTotal').textContent = formatMinutes(stats.total.total_minutes);

    // Daily chart
    renderDailyChart(stats.dailyChart);

    // Subject breakdown
    renderSubjectBreakdown(stats.subjectBreakdown);

    // Today's schedule
    renderTodaySchedule();
  } catch (err) {
    console.error('Dashboard error:', err);
  }
}

function renderDailyChart(data) {
  const container = $('#dailyChart');
  if (!data || data.length === 0) {
    container.innerHTML = '<div class="no-data">هنوز داده‌ای ثبت نشده</div>';
    return;
  }

  const maxMin = Math.max(...data.map(d => d.total_minutes), 1);

  container.innerHTML = data.map(d => {
    const height = Math.max((d.total_minutes / maxMin) * 140, 4);
    const date = new Date(d.date || d.study_date);
    const dayName = persianDays[(date.getDay() + 1) % 7];
    const dayNum = date.getDate();
    return `
      <div class="bar-item">
        <div class="bar-value">${Math.round(d.total_minutes / 60 * 10) / 10}h</div>
        <div class="bar" style="height:${height}px" title="${formatMinutes(d.total_minutes)}"></div>
        <div class="bar-label">${dayName}<br>${dayNum}</div>
      </div>
    `;
  }).join('');
}

function renderSubjectBreakdown(data) {
  const container = $('#subjectBreakdown');
  const filtered = data.filter(d => d.total_minutes > 0);

  if (filtered.length === 0) {
    container.innerHTML = '<div class="no-data">این هفته مطالعه‌ای ثبت نشده</div>';
    return;
  }

  const maxMin = Math.max(...filtered.map(d => d.total_minutes), 1);

  container.innerHTML = filtered.map(d => {
    const pct = (d.total_minutes / maxMin) * 100;
    return `
      <div class="breakdown-item">
        <div class="breakdown-icon">${d.icon}</div>
        <div class="breakdown-info">
          <div class="breakdown-name">${d.name}</div>
          <div class="breakdown-bar-bg">
            <div class="breakdown-bar" style="width:${pct}%;background:${d.color}"></div>
          </div>
        </div>
        <div class="breakdown-time">${formatMinutes(d.total_minutes)}</div>
      </div>
    `;
  }).join('');
}

function renderTodaySchedule() {
  const container = $('#todaySchedule');
  const today = (new Date().getDay() + 1) % 7;
  const todayClasses = schedule
    .filter(s => s.day_of_week === today && s.is_active)
    .sort((a, b) => a.start_time.localeCompare(b.start_time));

  if (todayClasses.length === 0) {
    container.innerHTML = '<div class="no-data">امروز کلاسی ندارید 🎉</div>';
    return;
  }

  container.innerHTML = todayClasses.map(s => `
    <div class="schedule-item" style="border-right-color:${s.subject_color}">
      <div class="schedule-time">${s.start_time.substring(0,5)} - ${s.end_time.substring(0,5)}</div>
      <span style="font-size:20px">${s.subject_icon}</span>
      <div class="schedule-subject">${s.subject_name}</div>
      ${s.teacher_name ? `
        <div class="schedule-teacher-info">
          ${s.teacher_photo ? `<img src="${s.teacher_photo}" class="teacher-mini-photo" alt="${s.teacher_name}">` : ''}
          <span>${s.teacher_name}</span>
        </div>
      ` : ''}
      ${s.room ? `<span class="schedule-room">کلاس ${s.room}</span>` : ''}
    </div>
  `).join('');
}

// ──────────── Subjects ────────────
async function loadSubjects() {
  try {
    subjects = await api('/api/subjects');
    renderSubjects();
    populateSubjectSelects();
  } catch (err) {
    console.error('Subjects error:', err);
  }
}

function renderSubjects() {
  const container = $('#subjectsGrid');
  if (subjects.length === 0) {
    container.innerHTML = '<div class="no-data">درسی ثبت نشده</div>';
    return;
  }

  container.innerHTML = subjects.map(s => `
    <div class="subject-card" style="border-right-color:${s.color}">
      <div class="subject-icon">${s.icon}</div>
      <div class="subject-name">${s.name}</div>
      <div class="subject-actions">
        <button class="btn btn-sm btn-warning" onclick="editSubject(${s.id})">✏️</button>
        <button class="btn btn-sm btn-danger" onclick="deleteSubject(${s.id})">🗑️</button>
      </div>
    </div>
  `).join('');
}

function populateSubjectSelects() {
  const selects = ['studySubject', 'filterSubject', 'scheduleSubject', 'examSubject'];
  selects.forEach(id => {
    const sel = $(`#${id}`);
    if (!sel) return;
    const currentVal = sel.value;
    const hasEmpty = id === 'filterSubject';
    sel.innerHTML = hasEmpty ? '<option value="">همه دروس</option>' : '';
    subjects.forEach(s => {
      sel.innerHTML += `<option value="${s.id}">${s.icon} ${s.name}</option>`;
    });
    sel.value = currentVal;
  });
}

function showSubjectModal(id = null) {
  $('#subjectId').value = '';
  $('#subjectName').value = '';
  $('#subjectIcon').value = '📖';
  $('#subjectColor').value = '#4A90D9';

  if (id) {
    const s = subjects.find(x => x.id === id);
    if (s) {
      $('#subjectId').value = s.id;
      $('#subjectName').value = s.name;
      $('#subjectIcon').value = s.icon;
      $('#subjectColor').value = s.color;
    }
  }
  openModal('subjectModal');
}

function editSubject(id) { showSubjectModal(id); }

async function deleteSubject(id) {
  if (!confirm('آیا از حذف این درس مطمئنید؟')) return;
  try {
    await api(`/api/subjects/${id}`, { method: 'DELETE' });
    showToast('درس حذف شد', 'success');
    loadSubjects();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

$('#subjectForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = $('#subjectId').value;
  const data = {
    name: $('#subjectName').value,
    icon: $('#subjectIcon').value,
    color: $('#subjectColor').value
  };

  try {
    if (id) {
      await api(`/api/subjects/${id}`, { method: 'PUT', body: JSON.stringify(data) });
      showToast('درس ویرایش شد', 'success');
    } else {
      await api('/api/subjects', { method: 'POST', body: JSON.stringify(data) });
      showToast('درس اضافه شد', 'success');
    }
    closeModal('subjectModal');
    loadSubjects();
  } catch (err) {
    showToast(err.message, 'error');
  }
});

// ──────────── Teachers ────────────
async function loadTeachers() {
  try {
    teachers = await api('/api/teachers');
    renderTeachers();
    populateTeacherSelect();
  } catch (err) {
    console.error('Teachers error:', err);
  }
}

function renderTeachers() {
  const container = $('#teachersGrid');
  if (teachers.length === 0) {
    container.innerHTML = '<div class="no-data">استادی ثبت نشده</div>';
    return;
  }

  container.innerHTML = teachers.map(t => `
    <div class="teacher-card">
      ${t.photo_url
        ? `<img src="${t.photo_url}" class="teacher-photo" alt="${t.name}">`
        : `<div class="teacher-avatar">👨‍🏫</div>`
      }
      <div class="teacher-name">${t.name}</div>
      <div class="teacher-specialty">${t.specialty || ''}</div>
      <div class="teacher-phone">${t.phone || ''}</div>
      <div class="teacher-actions">
        <button class="btn btn-sm btn-warning" onclick="editTeacher(${t.id})">✏️ ویرایش</button>
        <button class="btn btn-sm btn-danger" onclick="deleteTeacher(${t.id})">🗑️ حذف</button>
      </div>
    </div>
  `).join('');
}

function populateTeacherSelect() {
  const sel = $('#scheduleTeacher');
  if (!sel) return;
  const currentVal = sel.value;
  sel.innerHTML = '<option value="">بدون استاد</option>';
  teachers.forEach(t => {
    sel.innerHTML += `<option value="${t.id}">${t.name}</option>`;
  });
  sel.value = currentVal;
}

function showTeacherModal(id = null) {
  $('#teacherId').value = '';
  $('#teacherName').value = '';
  $('#teacherSpecialty').value = '';
  $('#teacherPhone').value = '';
  $('#teacherPhoto').value = '';
  $('#teacherPhotoPreview').innerHTML = '';

  if (id) {
    const t = teachers.find(x => x.id === id);
    if (t) {
      $('#teacherId').value = t.id;
      $('#teacherName').value = t.name;
      $('#teacherSpecialty').value = t.specialty || '';
      $('#teacherPhone').value = t.phone || '';
      if (t.photo_url) {
        $('#teacherPhotoPreview').innerHTML = `<img src="${t.photo_url}" alt="عکس فعلی">`;
      }
    }
  }
  openModal('teacherModal');
}

function editTeacher(id) { showTeacherModal(id); }

async function deleteTeacher(id) {
  if (!confirm('آیا از حذف این استاد مطمئنید؟')) return;
  try {
    await api(`/api/teachers/${id}`, { method: 'DELETE' });
    showToast('استاد حذف شد', 'success');
    loadTeachers();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

$('#teacherPhoto').addEventListener('change', function() {
  const preview = $('#teacherPhotoPreview');
  if (this.files && this.files[0]) {
    const reader = new FileReader();
    reader.onload = (e) => {
      preview.innerHTML = `<img src="${e.target.result}" alt="پیش‌نمایش">`;
    };
    reader.readAsDataURL(this.files[0]);
  }
});

$('#teacherForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = $('#teacherId').value;
  const formData = new FormData();
  formData.append('name', $('#teacherName').value);
  formData.append('specialty', $('#teacherSpecialty').value);
  formData.append('phone', $('#teacherPhone').value);

  const photoFile = $('#teacherPhoto').files[0];
  if (photoFile) formData.append('photo', photoFile);

  try {
    if (id) {
      await apiFormData(`/api/teachers/${id}?_method=PUT`, formData);
      showToast('استاد ویرایش شد', 'success');
    } else {
      await apiFormData('/api/teachers', formData);
      showToast('استاد اضافه شد', 'success');
    }
    closeModal('teacherModal');
    loadTeachers();
  } catch (err) {
    showToast(err.message, 'error');
  }
});

// ──────────── Schedule ────────────
async function loadSchedule() {
  try {
    schedule = await api('/api/schedule');
    renderSchedule();
    renderWeeklyGrid();
  } catch (err) {
    console.error('Schedule error:', err);
  }
}

function renderSchedule() {
  const tbody = $('#scheduleTable tbody');
  if (schedule.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="no-data">برنامه‌ای ثبت نشده</td></tr>';
    return;
  }

  tbody.innerHTML = schedule.map(s => `
    <tr>
      <td>${persianDays[s.day_of_week]}</td>
      <td>${s.start_time.substring(0,5)} - ${s.end_time.substring(0,5)}</td>
      <td><span style="color:${s.subject_color}">${s.subject_icon} ${s.subject_name}</span></td>
      <td>
        ${s.teacher_name ? `
          <div style="display:flex;align-items:center;gap:6px">
            ${s.teacher_photo ? `<img src="${s.teacher_photo}" class="teacher-mini-photo">` : ''}
            ${s.teacher_name}
          </div>
        ` : '-'}
      </td>
      <td>${s.room || '-'}</td>
      <td class="actions">
        <button class="btn btn-sm btn-warning" onclick="editSchedule(${s.id})">✏️</button>
        <button class="btn btn-sm btn-danger" onclick="deleteScheduleItem(${s.id})">🗑️</button>
      </td>
    </tr>
  `).join('');
}

function renderWeeklyGrid() {
  const container = $('#gridBody');
  // Generate time slots from 7:00 to 20:00
  const hours = [];
  for (let h = 7; h <= 20; h++) {
    hours.push(`${String(h).padStart(2, '0')}:00`);
  }

  container.innerHTML = hours.map(time => {
    const hour = parseInt(time.split(':')[0]);
    let cells = `<div class="time-cell">${time}</div>`;

    for (let day = 0; day < 7; day++) {
      const classes = schedule.filter(s => {
        const startH = parseInt(s.start_time.split(':')[0]);
        const endH = parseInt(s.end_time.split(':')[0]);
        return s.day_of_week === day && s.is_active && startH <= hour && endH > hour;
      });

      if (classes.length > 0) {
        const c = classes[0];
        cells += `
          <div class="schedule-cell">
            <div class="schedule-block" style="background:${c.subject_color}" onclick="editSchedule(${c.id})">
              <span class="block-subject">${c.subject_icon} ${c.subject_name}</span>
              ${c.teacher_name ? `<span class="block-teacher">${c.teacher_name}</span>` : ''}
              <span class="block-time">${c.start_time.substring(0,5)}-${c.end_time.substring(0,5)}</span>
            </div>
          </div>
        `;
      } else {
        cells += '<div class="schedule-cell"></div>';
      }
    }

    return `<div class="grid-row">${cells}</div>`;
  }).join('');
}

function showScheduleModal(id = null) {
  $('#scheduleId').value = '';
  $('#scheduleDay').value = '0';
  $('#scheduleStart').value = '08:00';
  $('#scheduleEnd').value = '09:30';
  $('#scheduleSubject').value = subjects[0]?.id || '';
  $('#scheduleTeacher').value = '';
  $('#scheduleRoom').value = '';

  if (id) {
    const s = schedule.find(x => x.id === id);
    if (s) {
      $('#scheduleId').value = s.id;
      $('#scheduleDay').value = s.day_of_week;
      $('#scheduleStart').value = s.start_time.substring(0, 5);
      $('#scheduleEnd').value = s.end_time.substring(0, 5);
      $('#scheduleSubject').value = s.subject_id;
      $('#scheduleTeacher').value = s.teacher_id || '';
      $('#scheduleRoom').value = s.room || '';
    }
  }
  openModal('scheduleModal');
}

function editSchedule(id) { showScheduleModal(id); }

async function deleteScheduleItem(id) {
  if (!confirm('آیا از حذف این کلاس مطمئنید؟')) return;
  try {
    await api(`/api/schedule/${id}`, { method: 'DELETE' });
    showToast('کلاس حذف شد', 'success');
    loadSchedule();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

$('#scheduleForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = $('#scheduleId').value;
  const data = {
    day_of_week: parseInt($('#scheduleDay').value),
    start_time: $('#scheduleStart').value + ':00',
    end_time: $('#scheduleEnd').value + ':00',
    subject_id: parseInt($('#scheduleSubject').value),
    teacher_id: $('#scheduleTeacher').value ? parseInt($('#scheduleTeacher').value) : null,
    room: $('#scheduleRoom').value || null
  };

  try {
    if (id) {
      await api(`/api/schedule/${id}`, { method: 'PUT', body: JSON.stringify(data) });
      showToast('کلاس ویرایش شد', 'success');
    } else {
      await api('/api/schedule', { method: 'POST', body: JSON.stringify(data) });
      showToast('کلاس اضافه شد', 'success');
    }
    closeModal('scheduleModal');
    loadSchedule();
  } catch (err) {
    showToast(err.message, 'error');
  }
});

// ──────────── Study Logs ────────────
async function loadStudyLogs() {
  try {
    const params = new URLSearchParams();
    if ($('#filterFrom').value) params.append('from', $('#filterFrom').value);
    if ($('#filterTo').value) params.append('to', $('#filterTo').value);
    if ($('#filterSubject').value) params.append('subject_id', $('#filterSubject').value);

    studyLogs = await api('/api/study-logs?' + params.toString());
    renderStudyLogs();
  } catch (err) {
    console.error('Study logs error:', err);
  }
}

function renderStudyLogs() {
  const tbody = $('#studyLogsTable tbody');
  if (studyLogs.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" class="no-data">مطالعه‌ای ثبت نشده</td></tr>';
    return;
  }

  tbody.innerHTML = studyLogs.map(log => `
    <tr>
      <td>${formatDate(log.study_date)}</td>
      <td><span style="color:${log.subject_color}">${log.subject_icon} ${log.subject_name}</span></td>
      <td>${log.topic || '-'}</td>
      <td>${log.start_time.substring(0,5)}</td>
      <td>${log.end_time.substring(0,5)}</td>
      <td><strong>${formatMinutes(log.duration_minutes)}</strong></td>
      <td><span class="quality-stars">${getQualityStars(log.quality_rating)}</span></td>
      <td class="actions">
        <button class="btn btn-sm btn-warning" onclick="editStudyLog(${log.id})">✏️</button>
        <button class="btn btn-sm btn-danger" onclick="deleteStudyLog(${log.id})">🗑️</button>
      </td>
    </tr>
  `).join('');
}

function editStudyLog(id) {
  const log = studyLogs.find(x => x.id === id);
  if (!log) return;

  $('#studySubject').value = log.subject_id;
  $('#studyDate').value = log.study_date;
  $('#studyStart').value = log.start_time.substring(0, 5);
  $('#studyEnd').value = log.end_time.substring(0, 5);
  $('#studyTopic').value = log.topic || '';
  $('#studyNotes').value = log.notes || '';
  $('#studyQuality').value = log.quality_rating;

  // Store edit ID
  $('#studyForm').dataset.editId = id;
  window.scrollTo({ top: 0, behavior: 'smooth' });
  showToast('در حال ویرایش - فرم را پر کنید', 'info');
}

async function deleteStudyLog(id) {
  if (!confirm('آیا از حذف این رکورد مطمئنید؟')) return;
  try {
    await api(`/api/study-logs/${id}`, { method: 'DELETE' });
    showToast('رکورد حذف شد', 'success');
    loadStudyLogs();
    loadDashboard();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

$('#studyForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const editId = $('#studyForm').dataset.editId;
  const data = {
    subject_id: parseInt($('#studySubject').value),
    study_date: $('#studyDate').value,
    start_time: $('#studyStart').value + ':00',
    end_time: $('#studyEnd').value + ':00',
    topic: $('#studyTopic').value,
    notes: $('#studyNotes').value,
    quality_rating: parseInt($('#studyQuality').value)
  };

  try {
    if (editId) {
      await api(`/api/study-logs/${editId}`, { method: 'PUT', body: JSON.stringify(data) });
      showToast('مطالعه ویرایش شد', 'success');
      delete $('#studyForm').dataset.editId;
    } else {
      await api('/api/study-logs', { method: 'POST', body: JSON.stringify(data) });
      showToast('مطالعه ثبت شد ✅', 'success');
    }

    // Reset form
    $('#studyTopic').value = '';
    $('#studyNotes').value = '';
    loadStudyLogs();
    loadDashboard();
  } catch (err) {
    showToast(err.message, 'error');
  }
});

// Set default date to today
$('#studyDate').valueAsDate = new Date();

// ──────────── Exams ────────────
async function loadExams() {
  try {
    exams = await api('/api/exams');
    renderExams();
  } catch (err) {
    console.error('Exams error:', err);
  }
}

function renderExams() {
  const tbody = $('#examsTable tbody');
  if (exams.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="no-data">امتحانی ثبت نشده</td></tr>';
    return;
  }

  tbody.innerHTML = exams.map(ex => `
    <tr>
      <td><span style="color:${ex.color}">${ex.icon} ${ex.subject_name}</span></td>
      <td>${formatDate(ex.exam_date)}</td>
      <td>${ex.exam_time ? ex.exam_time.substring(0,5) : '-'}</td>
      <td>${ex.type}</td>
      <td>
        ${ex.score !== null ? `
          <span class="score-badge ${getScoreClass(ex.score, ex.max_score)}">
            ${ex.score} / ${ex.max_score}
          </span>
        ` : '<span style="color:var(--text-muted)">ثبت نشده</span>'}
      </td>
      <td class="actions">
        <button class="btn btn-sm btn-warning" onclick="editExam(${ex.id})">✏️</button>
        <button class="btn btn-sm btn-danger" onclick="deleteExam(${ex.id})">🗑️</button>
      </td>
    </tr>
  `).join('');
}

function showExamModal(id = null) {
  $('#examId').value = '';
  $('#examSubject').value = subjects[0]?.id || '';
  $('#examDate').value = '';
  $('#examTime').value = '';
  $('#examType').value = 'میان‌ترم';
  $('#examScore').value = '';
  $('#examMaxScore').value = '20';
  $('#examNotes').value = '';

  if (id) {
    const ex = exams.find(x => x.id === id);
    if (ex) {
      $('#examId').value = ex.id;
      $('#examSubject').value = ex.subject_id;
      $('#examDate').value = ex.exam_date;
      $('#examTime').value = ex.exam_time ? ex.exam_time.substring(0, 5) : '';
      $('#examType').value = ex.type;
      $('#examScore').value = ex.score || '';
      $('#examMaxScore').value = ex.max_score;
      $('#examNotes').value = ex.notes || '';
    }
  }
  openModal('examModal');
}

function editExam(id) { showExamModal(id); }

async function deleteExam(id) {
  if (!confirm('آیا از حذف این امتحان مطمئنید؟')) return;
  try {
    await api(`/api/exams/${id}`, { method: 'DELETE' });
    showToast('امتحان حذف شد', 'success');
    loadExams();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

$('#examForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = $('#examId').value;
  const data = {
    subject_id: parseInt($('#examSubject').value),
    exam_date: $('#examDate').value,
    exam_time: $('#examTime').value ? $('#examTime').value + ':00' : null,
    type: $('#examType').value,
    score: $('#examScore').value ? parseFloat($('#examScore').value) : null,
    max_score: parseFloat($('#examMaxScore').value),
    notes: $('#examNotes').value
  };

  try {
    if (id) {
      await api(`/api/exams/${id}`, { method: 'PUT', body: JSON.stringify(data) });
      showToast('امتحان ویرایش شد', 'success');
    } else {
      await api('/api/exams', { method: 'POST', body: JSON.stringify(data) });
      showToast('امتحان اضافه شد', 'success');
    }
    closeModal('examModal');
    loadExams();
  } catch (err) {
    showToast(err.message, 'error');
  }
});

// ──────────── Goals ────────────
async function loadGoals() {
  try {
    goals = await api('/api/goals');
    renderGoals();
  } catch (err) {
    console.error('Goals error:', err);
  }
}

function renderGoals() {
  const container = $('#goalsContainer');

  // Get weekly study per subject
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 1) % 7));
  const weekStartStr = weekStart.toISOString().split('T')[0];

  const weeklyStudy = {};
  studyLogs.forEach(log => {
    if (log.study_date >= weekStartStr) {
      weeklyStudy[log.subject_id] = (weeklyStudy[log.subject_id] || 0) + log.duration_minutes;
    }
  });

  container.innerHTML = subjects.map(s => {
    const goal = goals.find(g => g.subject_id === s.id);
    const target = goal ? goal.weekly_target_minutes : 300;
    const studied = weeklyStudy[s.id] || 0;
    const pct = Math.min((studied / target) * 100, 100);
    const overTarget = studied >= target;

    return `
      <div class="goal-card" style="margin-bottom:16px">
        <div class="goal-header">
          <span class="goal-icon">${s.icon}</span>
          <span class="goal-subject">${s.name}</span>
        </div>
        <div class="goal-progress">
          <div class="goal-progress-bar">
            <div class="goal-progress-fill ${overTarget ? 'over' : ''}" style="width:${pct}%;background:${s.color}"></div>
          </div>
          <div class="goal-stats">
            <span>مطالعه شده: ${formatMinutes(studied)}</span>
            <span>هدف: ${formatMinutes(target)}</span>
            <span>${Math.round(pct)}%</span>
          </div>
        </div>
        <div class="goal-input-row">
          <input type="number" id="goal-${s.id}" value="${target}" min="0" step="30" placeholder="هدف هفتگی (دقیقه)">
          <button class="btn btn-sm btn-primary" onclick="saveGoal(${s.id})">💾</button>
        </div>
      </div>
    `;
  }).join('');
}

async function saveGoal(subjectId) {
  const input = $(`#goal-${subjectId}`);
  const target = parseInt(input.value);
  if (isNaN(target) || target < 0) {
    showToast('مقدار نامعتبر', 'error');
    return;
  }

  try {
    await api('/api/goals', {
      method: 'POST',
      body: JSON.stringify({ subject_id: subjectId, weekly_target_minutes: target })
    });
    showToast('هدف ذخیره شد', 'success');
    loadGoals();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ──────────── Modal Helpers ────────────
function openModal(id) {
  $(`#${id}`).classList.add('active');
}

function closeModal(id) {
  $(`#${id}`).classList.remove('active');
}

// Close modal on overlay click
$$('.modal').forEach(modal => {
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.classList.remove('active');
    }
  });
});

// ──────────── Initialize ────────────
document.addEventListener('DOMContentLoaded', () => {
  checkAuth();
});
