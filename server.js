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
