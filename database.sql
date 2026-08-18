CREATE DATABASE IF NOT EXISTS student_tracker
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_persian_ci;

USE student_tracker;

-- جدول کاربر (تک کاربره)
CREATE TABLE IF NOT EXISTS users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(50) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_persian_ci;

-- جدول دروس
CREATE TABLE IF NOT EXISTS subjects (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  color VARCHAR(7) DEFAULT '#4A90D9',
  icon VARCHAR(50) DEFAULT '📖',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_persian_ci;

-- جدول اساتید
CREATE TABLE IF NOT EXISTS teachers (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  photo_url VARCHAR(500) DEFAULT NULL,
  phone VARCHAR(20) DEFAULT NULL,
  specialty VARCHAR(100) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_persian_ci;

-- جدول برنامه هفتگی کلاس‌ها
CREATE TABLE IF NOT EXISTS weekly_schedule (
  id INT PRIMARY KEY AUTO_INCREMENT,
  day_of_week TINYINT NOT NULL COMMENT '0=شنبه 1=یکشنبه ... 6=جمعه',
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  subject_id INT NOT NULL,
  teacher_id INT DEFAULT NULL,
  room VARCHAR(50) DEFAULT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
  FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_persian_ci;

-- جدول ثبت مطالعه
CREATE TABLE IF NOT EXISTS study_logs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  subject_id INT NOT NULL,
  study_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  duration_minutes INT NOT NULL,
  topic VARCHAR(200) DEFAULT NULL,
  notes TEXT DEFAULT NULL,
  quality_rating TINYINT DEFAULT 3 COMMENT '1=بد 2=متوسط 3=خوب 4=عالی 5=فوق‌العاده',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_persian_ci;

-- جدول اهداف مطالعه
CREATE TABLE IF NOT EXISTS study_goals (
  id INT PRIMARY KEY AUTO_INCREMENT,
  subject_id INT NOT NULL,
  weekly_target_minutes INT NOT NULL DEFAULT 300,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_persian_ci;

-- جدول امتحانات
CREATE TABLE IF NOT EXISTS exams (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_persian_ci;

-- ایندکس‌ها
CREATE INDEX idx_study_logs_date ON study_logs(study_date);
CREATE INDEX idx_study_logs_subject ON study_logs(subject_id);
CREATE INDEX idx_weekly_schedule_day ON weekly_schedule(day_of_week);
CREATE INDEX idx_exams_date ON exams(exam_date);

-- داده‌های اولیه
INSERT INTO users (username, password_hash, full_name) VALUES
('student', '$2a$10$X7p9mKqJZz8YvFwBnE5L.OqR3sT1uVwXyZaBcDeFgHiJkLmNoPqR', 'دانش‌آموز');
-- رمز پیش‌فرض: student123 (بعداً تغییر دهید)

INSERT INTO subjects (name, color, icon) VALUES
('ریاضیات', '#E74C3C', '📐'),
('فیزیک', '#3498DB', '⚡'),
('شیمی', '#2ECC71', '🧪'),
('زیست‌شناسی', '#27AE60', '🧬'),
('ادبیات فارسی', '#9B59B6', '📜'),
('عربی', '#F39C12', '🕌'),
('زبان انگلیسی', '#1ABC9C', '🌍'),
('دینی', '#E67E22', '📿'),
('تاریخ', '#8E44AD', '🏛️'),
('جغرافیا', '#16A085', '🗺️');
