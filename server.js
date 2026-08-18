require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const dayjs = require('dayjs');
const moment = require('moment-jalaali');

const app = express();
const PORT = process.env.PORT || 3000;

// ──────────── Trust Proxy for Railway/Heroku ────────────
app.set('trust proxy', 1);

// ──────────── Database Configuration ────────────
const dbConfig = {
  host: process.env.MYSQLHOST || 'localhost',
  port: process.env.MYSQLPORT || 3306,
  user: process.env.MYSQLUSER || 'root',
  password: process.env.MYSQLPASSWORD || '',
  database: process.env.MYSQLDATABASE || 'student_tracker',
  waitForConnections: trueاین نسخه کامل، اصلاح شده و با **ظاهر مدرن (Glassmorphism UI)** است. تمام مشکلات سشن حل شده، تاریخ شمسی اضافه شده و طراحی کاملاً تغییر کرده است.

### 📁 ساختار فایل‌ها
شما باید ۴ فایل اصلی داشته باشید:
1.  `package.json`
2.  `server.js`
3.  `public/index.html`
4.  `public/css/style.css`
5.  `public/js/app.js`

---

### 1️⃣ `package.json`

```json
{
  "name": "student-study-tracker",
  "version": "2.0.0",
  "description": "سیستم پیشرفته پیگیری مطالعه با رابط کاربری مدرن",
  "main": "server.js",
  "scripts": {
    "start": "node server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "mysql2": "^3.6.5",
    "multer": "^1.4.5-lts.1",
    "bcryptjs": "^2.4.3",
    "express-session": "^1.17.3",
    "dotenv": "^16.3.1",
    "dayjs": "^1.11.10",
    "moment-jalaali": "^0.10.0"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const dayjs = require('dayjs');
const moment = require('moment-jalaali');

const app = express();
const PORT = process.env.PORT || 3000;

// ──────────── Trust Proxy for Railway/Heroku ────────────
app.set('trust proxy', 1);

// ──────────── Database Configuration ────────────
const dbConfig = {
  host: process.env.MYSQLHOST || 'localhost',
  port: process.env.MYSQLPORT || 3306,
  user: process.env.MYSQLUSER || 'root',
  password: process.env.MYSQLPASSWORD || '',
  database: process.env.MYSQLDATABASE || 'student_tracker',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4'
};

let pool;

// ──────────── Initialize Database ────────────
async function initDB() {
  try {
    const connWithoutDB = await mysql.createConnection({
      host: dbConfig.host,
      port: dbConfig.port,
      user: dbConfig.user,
      password: dbConfig.password,
      charset: 'utf8mb4'
    });

    await connWithoutDB.query(`CREATE DATABASE IF NOT EXISTS ${dbConfig.database} 
      CHARACTER SET utf8mb4 COLLATE utf8mb4_persian_ci`);
    await connWithoutDB.end();

    pool = mysql.createPool(dbConfig);
    const conn = await pool.getConnection();

    // Create Tables
    const tables = [
      `CREATE TABLE IF NOT EXISTS users (id INT PRIMARY KEY AUTO_INCREMENT, username VARCHAR(50) NOT NULL UNIQUE, password_hash VARCHAR(255) NOT NULL, full_name VARCHAR(100) NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_persian_ci`,
      `CREATE TABLE IF NOT EXISTS subjects (id INT PRIMARY KEY AUTO_INCREMENT, name VARCHAR(100) NOT NULL, color VARCHAR(7) DEFAULT '#4A90D9', icon VARCHAR(50) DEFAULT '📖', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_persian_ci`,
      `CREATE TABLE IF NOT EXISTS teachers (id INT PRIMARY KEY AUTO_INCREMENT, name VARCHAR(100) NOT NULL, photo_url VARCHAR(500) DEFAULT NULL, phone VARCHAR(20) DEFAULT NULL, specialty VARCHAR(100) DEFAULT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_persian_ci`,
      `CREATE TABLE IF NOT EXISTS weekly_schedule (id INT PRIMARY KEY AUTO_INCREMENT, day_of_week TINYINT NOT NULL, start_time TIME NOT NULL, end_time TIME NOT NULL, subject_id INT NOT NULL, teacher_id INT DEFAULT NULL, room VARCHAR(50) DEFAULT NULL, is_active BOOLEAN DEFAULT TRUE, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE, FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE SET NULL) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_persian_ci`,
      `CREATE TABLE IF NOT EXISTS study_logs (id INT PRIMARY KEY AUTO_INCREMENT, subject_id INT NOT NULL, study_date DATE NOT NULL, start_time TIME NOT NULL, end_time TIME NOT NULL, duration_minutes INT NOT NULL, topic VARCHAR(200) DEFAULT NULL, notes TEXT DEFAULT NULL, quality_rating TINYINT DEFAULT 3, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_persian_ci`,
      `CREATE TABLE IF NOT EXISTS study_goals (id INT PRIMARY KEY AUTO_INCREMENT, subject_id INT NOT NULL, weekly_target_minutes INT NOT NULL DEFAULT 300, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_persian_ci`,
      `CREATE TABLE IF NOT EXISTS exams (id INT PRIMARY KEY AUTO_INCREMENT, subject_id INT NOT NULL, exam_date DATE NOT NULL, exam_time TIME DEFAULT NULL, type VARCHAR(50) DEFAULT 'میان‌ترم', score DECIMAL(5,2) DEFAULT NULL, max_score DECIMAL(5,2) DEFAULT 20, notes TEXT DEFAULT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_persian_ci`
    ];

    for (const table of tables) {
      await conn.query(table);
    }

    // Indexes
    try { await conn.query('CREATE INDEX idx_study_logs_date ON study_logs(study_date)'); } catch(e){}
    try { await conn.query('CREATE INDEX idx_study_logs_subject ON study_logs(subject_id)'); } catch(e){}
    try { await conn.query('CREATE INDEX idx_weekly_schedule_day ON weekly_schedule(day_of_week)'); } catch(e){}

    // Seed Data
    const [users] = await conn.query('SELECT COUNT(*) as cnt FROM users');
    if (users[0].cnt === 0) {
      const hash = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'student123', 10);
      await conn.query('INSERT INTO users (username, password_hash, full_name) VALUES (?, ?, ?)', ['student', hash, 'دانش‌آموز']);
    }

    const [subjects] = await conn.query('SELECT COUNT(*) as cnt FROM subjects');
    if (subjects[0].cnt === 0) {
      const defaultSubjects = [
        ['ریاضیات', '#E74C3C', '📐'], ['فیزیک', '#3498DB', '⚡'], ['شیمی', '#2ECC71', '🧪'],
        ['زیست‌شناسی', '#27AE60', '🧬'], ['ادبیات فارسی', '#9B59B6', '📜'], ['عربی', '#F39C12', '🕌'],
        ['زبان انگلیسی', '#1ABC9C', '🌍'], ['دینی', '#E67E22', '📿'], ['تاریخ', '#8E44AD', '🏛️']
      ];
      for (const s of defaultSubjects) {
        await conn.query('INSERT INTO subjects (name, color, icon) VALUES (?, ?, ?)', s);
      }
    }

    conn.release();
    console.log('✅ Database initialized successfully');
  } catch (err) {
    console.error('❌ DB Init Error:', err.message);
    setTimeout(initDB, 3000);
  }
}

// ──────────── Middleware ────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

const uploadsDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
app.use('/uploads', express.static(uploadsDir));

app.use(session({
  secret: process.env.SESSION_SECRET || 'super-secret-key-change-this-in-env',
  resave: false,
  saveUninitialized: true,
  cookie: {
    maxAge: 24 * 60 * 60 * 1000,
    secure: false, // Set to true if using HTTPS only in production with proper proxy setup
    httpOnly: true,
    sameSite: 'lax'
  }
}));

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname))
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

function requireAuth(req, res, next) {
  if (req.session && req.session.userId) return next();
  res.status(401).json({ error: 'لطفاً وارد شوید' });
}

// ──────────── Routes ────────────
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const [users] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
    if (users.length === 0 || !(await bcrypt.compare(password, users[0].password_hash))) {
      return res.status(401).json({ error: 'نام کاربری یا رمز عبور اشتباه است' });
    }
    req.session.userId = users[0].id;
    req.session.userName = users[0].full_name;
    res.json({ success: true, user: { id: users[0].id, name: users[0].full_name } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/logout', (req, res) => { req.session.destroy(); res.json({ success: true }); });
app.get('/api/me', (req, res) => res.json({ loggedIn: !!req.session.userId, name: req.session.userName }));

// Subjects
app.get('/api/subjects', requireAuth, async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM subjects ORDER BY name');
  res.json(rows);
});
app.post('/api/subjects', requireAuth, async (req, res) => {
  const { name, color, icon } = req.body;
  const [result] = await pool.query('INSERT INTO subjects (name, color, icon) VALUES (?, ?, ?)', [name, color, icon]);
  res.json({ id: result.insertId, ...req.body });
});
app.delete('/api/subjects/:id', requireAuth, async (req, res) => {
  await pool.query('DELETE FROM subjects WHERE id=?', [req.params.id]);
  res.json({ success: true });
});

// Teachers
app.get('/api/teachers', requireAuth, async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM teachers ORDER BY name');
  res.json(rows);
});
app.post('/api/teachers', requireAuth, upload.single('photo'), async (req, res) => {
  const { name, phone, specialty } = req.body;
  const photo_url = req.file ? `/uploads/${req.file.filename}` : null;
  const [result] = await pool.query('INSERT INTO teachers (name, photo_url, phone, specialty) VALUES (?, ?, ?, ?)', [name, photo_url, phone, specialty]);
  res.json({ id: result.insertId, ...req.body, photo_url });
});
app.delete('/api/teachers/:id', requireAuth, async (req, res) => {
  await pool.query('DELETE FROM teachers WHERE id=?', [req.params.id]);
  res.json({ success: true });
});

// Schedule
app.get('/api/schedule', requireAuth, async (req, res) => {
  const [rows] = await pool.query(`SELECT ws.*, s.name as subject_name, s.color, s.icon, t.name as teacher_name, t.photo_url FROM weekly_schedule ws JOIN subjects s ON ws.subject_id = s.id LEFT JOIN teachers t ON ws.teacher_id = t.id ORDER BY ws.day_of_week, ws.start_time`);
  res.json(rows);
});
app.post('/api/schedule', requireAuth, async (req, res) => {
  const { day_of_week, start_time, end_time, subject_id, teacher_id, room } = req.body;
  const [result] = await pool.query('INSERT INTO weekly_schedule (day_of_week, start_time, end_time, subject_id, teacher_id, room) VALUES (?, ?, ?, ?, ?, ?)', [day_of_week, start_time, end_time, subject_id, teacher_id || null, room || null]);
  res.json({ id: result.insertId, ...req.body });
});
app.delete('/api/schedule/:id', requireAuth, async (req, res) => {
  await pool.query('DELETE FROM weekly_schedule WHERE id=?', [req.params.id]);
  res.json({ success: true });
});

// Study Logs
app.get('/api/study-logs', requireAuth, async (req, res) => {
  const { from, to, subject_id } = req.query;
  let query = `SELECT sl.*, s.name as subject_name, s.color, s.icon FROM study_logs sl JOIN subjects s ON sl.subject_id = s.id WHERE 1=1`;
  const params = [];
  if (from) { query += ' AND sl.study_date >= ?'; params.push(from); }
  if (to) { query += ' AND sl.study_date <= ?'; params.push(to); }
  if (subject_id) { query += ' AND sl.subject_id = ?'; params.push(subject_id); }
  query += ' ORDER BY sl.study_date DESC LIMIT 100';
  const [rows] = await pool.query(query, params);
  res.json(rows);
});
app.post('/api/study-logs', requireAuth, async (req, res) => {
  const { subject_id, study_date, start_time, end_time, topic, notes, quality_rating } = req.body;
  const start = dayjs(`2000-01-01 ${start_time}`);
  const end = dayjs(`2000-01-01 ${end_time}`);
  let duration_minutes = end.diff(start, 'minute');
  if (duration_minutes < 0) duration_minutes += 1440;
  const [result] = await pool.query('INSERT INTO study_logs (subject_id, study_date, start_time, end_time, duration_minutes, topic, notes, quality_rating) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [subject_id, study_date, start_time, end_time, duration_minutes, topic, notes, quality_rating]);
  res.json({ id: result.insertId, duration_minutes, ...req.body });
});
app.delete('/api/study-logs/:id', requireAuth, async (req, res) => {
  await pool.query('DELETE FROM study_logs WHERE id=?', [req.params.id]);
  res.json({ success: true });
});

// Stats
app.get('/api/stats/overview', requireAuth, async (req, res) => {
  const today = dayjs().format('YYYY-MM-DD');
  const weekStart = dayjs().startOf('week').add(1, 'day').format('YYYY-MM-DD');
  
  const [todayStats] = await pool.query('SELECT COALESCE(SUM(duration_minutes),0) as total_minutes FROM study_logs WHERE study_date = ?', [today]);
  const [weekStats] = await pool.query('SELECT COALESCE(SUM(duration_minutes),0) as total_minutes FROM study_logs WHERE study_date >= ?', [weekStart]);
  
  const [subjectBreakdown] = await pool.query(`SELECT s.name, s.color, s.icon, COALESCE(SUM(sl.duration_minutes),0) as total_minutes FROM subjects s LEFT JOIN study_logs sl ON s.id = sl.subject_id AND sl.study_date >= ? GROUP BY s.id ORDER BY total_minutes DESC`, [weekStart]);
  
  res.json({ today: todayStats[0], week: weekStats[0], subjectBreakdown });
});

// Export
app.get('/api/export', requireAuth, async (req, res) => {
  const [logs] = await pool.query('SELECT * FROM study_logs');
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', 'attachment; filename=backup.json');
  res.json(logs);
});

app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

initDB().then(() => {
  app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
});
