require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const dayjs = require('dayjs');

const app = express();
const PORT = process.env.PORT || 3000;

// ──────────── Database Connection ────────────
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
async function initDB() {
  try {
    // First connect without database to create it if needed
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

    // Now connect with database
    pool = mysql.createPool(dbConfig);

    // Create tables
    const conn = await pool.getConnection();

    await conn.query(`CREATE TABLE IF NOT EXISTS users (
      id INT PRIMARY KEY AUTO_INCREMENT,
      username VARCHAR(50) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      full_name VARCHAR(100) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_persian_ci`);

    await conn.query(`CREATE TABLE IF NOT EXISTS subjects (
      id INT PRIMARY KEY AUTO_INCREMENT,
      name VARCHAR(100) NOT NULL,
      color VARCHAR(7) DEFAULT '#4A90D9',
      icon VARCHAR(50) DEFAULT '📖',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_persian_ci`);

    await conn.query(`CREATE TABLE IF NOT EXISTS teachers (
      id INT PRIMARY KEY AUTO_INCREMENT,
      name VARCHAR(100) NOT NULL,
      photo_url VARCHAR(500) DEFAULT NULL,
      phone VARCHAR(20) DEFAULT NULL,
      specialty VARCHAR(100) DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_persian_ci`);

    await conn.query(`CREATE TABLE IF NOT EXISTS weekly_schedule (
      id INT PRIMARY KEY AUTO_INCREMENT,
      day_of_week TINYINT NOT NULL,
      start_time TIME NOT NULL,
      end_time TIME NOT NULL,
      subject_id INT NOT NULL,
      teacher_id INT DEFAULT NULL,
      room VARCHAR(50) DEFAULT NULL,
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
      FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_persian_ci`);

    await conn.query(`CREATE TABLE IF NOT EXISTS study_logs (
      id INT PRIMARY KEY AUTO_INCREMENT,
      subject_id INT NOT NULL,
      study_date DATE NOT NULL,
      start_time TIME NOT NULL,
      end_time TIME NOT NULL,
      duration_minutes INT NOT NULL,
      topic VARCHAR(200) DEFAULT NULL,
      notes TEXT DEFAULT NULL,
      quality_rating TINYINT DEFAULT 3,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_persian_ci`);

    await conn.query(`CREATE TABLE IF NOT EXISTS study_goals (
      id INT PRIMARY KEY AUTO_INCREMENT,
      subject_id INT NOT NULL,
      weekly_target_minutes INT NOT NULL DEFAULT 300,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_persian_ci`);

    await conn.query(`CREATE TABLE IF NOT EXISTS exams (
      id INT PRIMARY KEY AUTO_INCREMENT,
      subject_id INT NOT NULL,
      exam_date DATE NOT NULL,
      exam_time TIME DEFAULT NULL,
      type VARCHAR(50) DEFAULT 'میان‌ترم',
      score DECIMAL(5,2) DEFAULT NULL,
      max_score DECIMAL(5,2) DEFAULT 20,
      notes TEXT DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_persian_ci`);

    // Create indexes
    try {
      await conn.query('CREATE INDEX idx_study_logs_date ON study_logs(study_date)');
    } catch(e) {}
    try {
      await conn.query('CREATE INDEX idx_study_logs_subject ON study_logs(subject_id)');
    } catch(e) {}
    try {
      await conn.query('CREATE INDEX idx_weekly_schedule_day ON weekly_schedule(day_of_week)');
    } catch(e) {}
    try {
      await conn.query('CREATE INDEX idx_exams_date ON exams(exam_date)');
    } catch(e) {}

    // Seed default data
    const [users] = await conn.query('SELECT COUNT(*) as cnt FROM users');
    if (users[0].cnt === 0) {
      const hash = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'student123', 10);
      await conn.query('INSERT INTO users (username, password_hash, full_name) VALUES (?, ?, ?)',
        ['student', hash, 'دانش‌آموز']);
    }

    const [subjects] = await conn.query('SELECT COUNT(*) as cnt FROM subjects');
    if (subjects[0].cnt === 0) {
      const defaultSubjects = [
        ['ریاضیات', '#E74C3C', '📐'],
        ['فیزیک', '#3498DB', '⚡'],
        ['شیمی', '#2ECC71', '🧪'],
        ['زیست‌شناسی', '#27AE60', '🧬'],
        ['ادبیات فارسی', '#9B59B6', '📜'],
        ['عربی', '#F39C12', '🕌'],
        ['زبان انگلیسی', '#1ABC9C', '🌍'],
        ['دینی', '#E67E22', '📿'],
        ['تاریخ', '#8E44AD', '🏛️'],
        ['جغرافیا', '#16A085', '🗺️'] // ✅ اصلاح شد: پرانتز اضافی حذف شد
      ];
      
      for (const s of defaultSubjects) {
        await conn.query('INSERT INTO subjects (name, color, icon) VALUES (?, ?, ?)', s);
      }
    }
      for (const s of defaultSubjects) {
        await conn.query('INSERT INTO subjects (name, color, icon) VALUES (?, ?, ?)', s);
      }
    }

    conn.release();
    console.log('✅ Database initialized successfully');
  } catch (err) {
    console.error('❌ Database initialization error:', err.message);
    // Retry after 3 seconds
    setTimeout(initDB, 3000);
  }
}

// ──────────── Middleware ────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Uploads directory
const uploadsDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
app.use('/uploads', express.static(uploadsDir));

// Session
app.use(session({
  secret: process.env.SESSION_SECRET || 'default-secret-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 7 * 24 * 60 * 60 * 1000, // 1 week
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true
  }
}));

// Multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
    cb(null, uniqueName);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    if (ext) cb(null, true);
    else cb(new Error('فقط فایل‌های تصویری مجاز هستند'));
  }
});

// Auth middleware
function requireAuth(req, res, next) {
  if (req.session && req.session.userId) {
    return next();
  }
  res.status(401).json({ error: 'لطفاً وارد شوید' });
}

// ──────────── Persian Day Names ────────────
const persianDays = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه'];

function getDayOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay();
  // Convert JS day (0=Sunday) to Persian (0=Saturday)
  return (day + 1) % 7;
}

// ──────────── Auth Routes ────────────
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const [users] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);

    if (users.length === 0) {
      return res.status(401).json({ error: 'نام کاربری یا رمز عبور اشتباه است' });
    }

    const valid = await bcrypt.compare(password, users[0].password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'نام کاربری یا رمز عبور اشتباه است' });
    }

    req.session.userId = users[0].id;
    req.session.userName = users[0].full_name;
    res.json({ success: true, user: { id: users[0].id, name: users[0].full_name } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

app.get('/api/me', (req, res) => {
  if (req.session && req.session.userId) {
    res.json({ loggedIn: true, name: req.session.userName });
  } else {
    res.json({ loggedIn: false });
  }
});

// ──────────── Subjects Routes ────────────
app.get('/api/subjects', requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM subjects ORDER BY name');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/subjects', requireAuth, async (req, res) => {
  try {
    const { name, color, icon } = req.body;
    const [result] = await pool.query(
      'INSERT INTO subjects (name, color, icon) VALUES (?, ?, ?)',
      [name, color || '#4A90D9', icon || '📖']
    );
    res.json({ id: result.insertId, name, color, icon });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/subjects/:id', requireAuth, async (req, res) => {
  try {
    const { name, color, icon } = req.body;
    await pool.query(
      'UPDATE subjects SET name=?, color=?, icon=? WHERE id=?',
      [name, color, icon, req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/subjects/:id', requireAuth, async (req, res) => {
  try {
    await pool.query('DELETE FROM subjects WHERE id=?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ──────────── Teachers Routes ────────────
app.get('/api/teachers', requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM teachers ORDER BY name');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/teachers', requireAuth, upload.single('photo'), async (req, res) => {
  try {
    const { name, phone, specialty } = req.body;
    const photo_url = req.file ? `/uploads/${req.file.filename}` : null;
    const [result] = await pool.query(
      'INSERT INTO teachers (name, photo_url, phone, specialty) VALUES (?, ?, ?, ?)',
      [name, photo_url, phone, specialty]
    );
    res.json({ id: result.insertId, name, photo_url, phone, specialty });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/teachers/:id', requireAuth, upload.single('photo'), async (req, res) => {
  try {
    const { name, phone, specialty } = req.body;
    const photo_url = req.file ? `/uploads/${req.file.filename}` : undefined;

    if (photo_url) {
      await pool.query(
        'UPDATE teachers SET name=?, photo_url=?, phone=?, specialty=? WHERE id=?',
        [name, photo_url, phone, specialty, req.params.id]
      );
    } else {
      await pool.query(
        'UPDATE teachers SET name=?, phone=?, specialty=? WHERE id=?',
        [name, phone, specialty, req.params.id]
      );
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/teachers/:id', requireAuth, async (req, res) => {
  try {
    const [teachers] = await pool.query('SELECT photo_url FROM teachers WHERE id=?', [req.params.id]);
    if (teachers[0] && teachers[0].photo_url) {
      const filePath = path.join(__dirname, 'public', teachers[0].photo_url);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
    await pool.query('DELETE FROM teachers WHERE id=?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ──────────── Weekly Schedule Routes ────────────
app.get('/api/schedule', requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT ws.*, s.name as subject_name, s.color as subject_color, s.icon as subject_icon,
             t.name as teacher_name, t.photo_url as teacher_photo, t.phone as teacher_phone
      FROM weekly_schedule ws
      JOIN subjects s ON ws.subject_id = s.id
      LEFT JOIN teachers t ON ws.teacher_id = t.id
      ORDER BY ws.day_of_week, ws.start_time
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/schedule', requireAuth, async (req, res) => {
  try {
    const { day_of_week, start_time, end_time, subject_id, teacher_id, room } = req.body;
    const [result] = await pool.query(
      'INSERT INTO weekly_schedule (day_of_week, start_time, end_time, subject_id, teacher_id, room) VALUES (?, ?, ?, ?, ?, ?)',
      [day_of_week, start_time, end_time, subject_id, teacher_id || null, room || null]
    );
    res.json({ id: result.insertId, ...req.body });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/schedule/:id', requireAuth, async (req, res) => {
  try {
    const { day_of_week, start_time, end_time, subject_id, teacher_id, room, is_active } = req.body;
    await pool.query(
      'UPDATE weekly_schedule SET day_of_week=?, start_time=?, end_time=?, subject_id=?, teacher_id=?, room=?, is_active=? WHERE id=?',
      [day_of_week, start_time, end_time, subject_id, teacher_id || null, room || null, is_active !== false, req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/schedule/:id', requireAuth, async (req, res) => {
  try {
    await pool.query('DELETE FROM weekly_schedule WHERE id=?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ──────────── Study Logs Routes ────────────
app.get('/api/study-logs', requireAuth, async (req, res) => {
  try {
    const { from, to, subject_id } = req.query;
    let query = `
      SELECT sl.*, s.name as subject_name, s.color as subject_color, s.icon as subject_icon
      FROM study_logs sl
      JOIN subjects s ON sl.subject_id = s.id
      WHERE 1=1
    `;
    const params = [];

    if (from) { query += ' AND sl.study_date >= ?'; params.push(from); }
    if (to) { query += ' AND sl.study_date <= ?'; params.push(to); }
    if (subject_id) { query += ' AND sl.subject_id = ?'; params.push(subject_id); }

    query += ' ORDER BY sl.study_date DESC, sl.start_time DESC LIMIT 200';

    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/study-logs', requireAuth, async (req, res) => {
  try {
    const { subject_id, study_date, start_time, end_time, topic, notes, quality_rating } = req.body;

    // Calculate duration
    const start = dayjs(`2000-01-01 ${start_time}`);
    const end = dayjs(`2000-01-01 ${end_time}`);
    let duration_minutes = end.diff(start, 'minute');
    if (duration_minutes < 0) duration_minutes += 1440; // handle midnight crossing

    const [result] = await pool.query(
      'INSERT INTO study_logs (subject_id, study_date, start_time, end_time, duration_minutes, topic, notes, quality_rating) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [subject_id, study_date, start_time, end_time, duration_minutes, topic || null, notes || null, quality_rating || 3]
    );
    res.json({ id: result.insertId, duration_minutes, ...req.body });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/study-logs/:id', requireAuth, async (req, res) => {
  try {
    const { subject_id, study_date, start_time, end_time, topic, notes, quality_rating } = req.body;

    const start = dayjs(`2000-01-01 ${start_time}`);
    const end = dayjs(`2000-01-01 ${end_time}`);
    let duration_minutes = end.diff(start, 'minute');
    if (duration_minutes < 0) duration_minutes += 1440;

    await pool.query(
      'UPDATE study_logs SET subject_id=?, study_date=?, start_time=?, end_time=?, duration_minutes=?, topic=?, notes=?, quality_rating=? WHERE id=?',
      [subject_id, study_date, start_time, end_time, duration_minutes, topic, notes, quality_rating, req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/study-logs/:id', requireAuth, async (req, res) => {
  try {
    await pool.query('DELETE FROM study_logs WHERE id=?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ──────────── Statistics Routes ────────────
app.get('/api/stats/overview', requireAuth, async (req, res) => {
  try {
    const today = dayjs().format('YYYY-MM-DD');
    const weekStart = dayjs().startOf('week').add(1, 'day').format('YYYY-MM-DD'); // Saturday start
    const monthStart = dayjs().startOf('month').format('YYYY-MM-DD');

    const [todayStats] = await pool.query(
      'SELECT COUNT(*) as sessions, COALESCE(SUM(duration_minutes),0) as total_minutes FROM study_logs WHERE study_date = ?',
      [today]
    );

    const [weekStats] = await pool.query(
      'SELECT COUNT(*) as sessions, COALESCE(SUM(duration_minutes),0) as total_minutes FROM study_logs WHERE study_date >= ?',
      [weekStart]
    );

    const [monthStats] = await pool.query(
      'SELECT COUNT(*) as sessions, COALESCE(SUM(duration_minutes),0) as total_minutes FROM study_logs WHERE study_date >= ?',
      [monthStart]
    );

    const [totalStats] = await pool.query(
      'SELECT COUNT(*) as sessions, COALESCE(SUM(duration_minutes),0) as total_minutes FROM study_logs'
    );

    // Subject breakdown this week
    const [subjectBreakdown] = await pool.query(`
      SELECT s.name, s.color, s.icon, COALESCE(SUM(sl.duration_minutes),0) as total_minutes, COUNT(sl.id) as sessions
      FROM subjects s
      LEFT JOIN study_logs sl ON s.id = sl.subject_id AND sl.study_date >= ?
      GROUP BY s.id
      ORDER BY total_minutes DESC
    `, [weekStart]);

    // Daily chart for last 14 days
    const [dailyChart] = await pool.query(`
      SELECT study_date, SUM(duration_minutes) as total_minutes
      FROM study_logs
      WHERE study_date >= DATE_SUB(?, INTERVAL 13 DAY)
      GROUP BY study_date
      ORDER BY study_date
    `, [today]);

    res.json({
      today: todayStats[0],
      week: weekStats[0],
      month: monthStats[0],
      total: totalStats[0],
      subjectBreakdown,
      dailyChart
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ──────────── Goals Routes ────────────
app.get('/api/goals', requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT g.*, s.name as subject_name, s.color, s.icon
      FROM study_goals g
      JOIN subjects s ON g.subject_id = s.id
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/goals', requireAuth, async (req, res) => {
  try {
    const { subject_id, weekly_target_minutes } = req.body;
    const [existing] = await pool.query('SELECT id FROM study_goals WHERE subject_id=?', [subject_id]);
    if (existing.length > 0) {
      await pool.query('UPDATE study_goals SET weekly_target_minutes=? WHERE subject_id=?',
        [weekly_target_minutes, subject_id]);
      res.json({ success: true, updated: true });
    } else {
      const [result] = await pool.query(
        'INSERT INTO study_goals (subject_id, weekly_target_minutes) VALUES (?, ?)',
        [subject_id, weekly_target_minutes]
      );
      res.json({ id: result.insertId, subject_id, weekly_target_minutes });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ──────────── Exams Routes ────────────
app.get('/api/exams', requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT e.*, s.name as subject_name, s.color, s.icon
      FROM exams e
      JOIN subjects s ON e.subject_id = s.id
      ORDER BY e.exam_date DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/exams', requireAuth, async (req, res) => {
  try {
    const { subject_id, exam_date, exam_time, type, score, max_score, notes } = req.body;
    const [result] = await pool.query(
      'INSERT INTO exams (subject_id, exam_date, exam_time, type, score, max_score, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [subject_id, exam_date, exam_time || null, type || 'میان‌ترم', score || null, max_score || 20, notes || null]
    );
    res.json({ id: result.insertId, ...req.body });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/exams/:id', requireAuth, async (req, res) => {
  try {
    const { subject_id, exam_date, exam_time, type, score, max_score, notes } = req.body;
    await pool.query(
      'UPDATE exams SET subject_id=?, exam_date=?, exam_time=?, type=?, score=?, max_score=?, notes=? WHERE id=?',
      [subject_id, exam_date, exam_time, type, score, max_score, notes, req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/exams/:id', requireAuth, async (req, res) => {
  try {
    await pool.query('DELETE FROM exams WHERE id=?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ──────────── Health Check ────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ──────────── Serve Frontend ────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ──────────── Error Handler ────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message || 'خطای سرور' });
});

// ──────────── Start Server ────────────
initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📚 Student Study Tracker is ready!`);
  });
});
