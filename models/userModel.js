const fs = require("fs");
const path = require("path");
const { DatabaseSync } = require("node:sqlite");
const bcrypt = require("bcryptjs");
const { randomUUID } = require("crypto");

const DATA_DIR = path.join(__dirname, "..", "data");
const DB_FILE = path.join(DATA_DIR, "app.db");
const LEGACY_USERS_FILE = path.join(DATA_DIR, "users.json");

let db;

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function getDb() {
  if (!db) {
    ensureDataDir();
    db = new DatabaseSync(DB_FILE);
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        provider TEXT NOT NULL,
        passwordHash TEXT,
        teamId TEXT,
        role TEXT NOT NULL DEFAULT 'staff',
        createdAt TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

      CREATE TABLE IF NOT EXISTS admin_sessions (
        token TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        expiresAt TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        FOREIGN KEY (userId) REFERENCES users(id)
      );
      CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires ON admin_sessions(expiresAt);
    `);
    ensureUserColumns();
    migrateLegacyUsersIfNeeded();
    ensureDefaultAdminUser();
  }
  return db;
}

function ensureUserColumns() {
  const columns = db.prepare("PRAGMA table_info(users)").all();
  const names = new Set(columns.map((c) => c.name));
  if (!names.has("teamId")) {
    db.exec("ALTER TABLE users ADD COLUMN teamId TEXT");
  }
  if (!names.has("role")) {
    db.exec("ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'staff'");
  }
}

function migrateLegacyUsersIfNeeded() {
  if (!fs.existsSync(LEGACY_USERS_FILE)) return;
  const conn = db;
  const count = conn.prepare("SELECT COUNT(*) AS total FROM users").get().total;
  if (count > 0) return;

  const raw = fs.readFileSync(LEGACY_USERS_FILE, "utf8");
  const parsed = JSON.parse(raw);
  const usersTable = Array.isArray(parsed.usersTable)
    ? parsed.usersTable
    : Array.isArray(parsed.users)
      ? parsed.users
      : [];

  if (!usersTable.length) return;

  const insertStmt = conn.prepare(
    "INSERT OR IGNORE INTO users (id, username, email, provider, passwordHash, teamId, role, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  );
  for (const user of usersTable) {
    insertStmt.run(
      String(user.id || Date.now()),
      String(user.username || ""),
      String(user.email || "").toLowerCase(),
      String(user.provider || "local"),
      user.passwordHash ? String(user.passwordHash) : null,
      user.teamId ? String(user.teamId) : null,
      String(user.role || "staff"),
      String(user.createdAt || new Date().toISOString())
    );
  }
}

function ensureUsersTable() {
  getDb();
}

function ensureDefaultAdminUser() {
  const conn = db;
  const adminEmail = String(process.env.CMS_ADMIN_EMAIL || "admin@onboarding.local").toLowerCase();
  const adminPassword = String(process.env.CMS_ADMIN_PASSWORD || "AdminPass123!");
  const existing = conn.prepare("SELECT id FROM users WHERE email = ? LIMIT 1").get(adminEmail);
  if (existing) return;

  const id = randomUUID();
  const passwordHash = bcrypt.hashSync(adminPassword, 12);
  conn
    .prepare(
      "INSERT INTO users (id, username, email, provider, passwordHash, teamId, role, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .run(
      id,
      "cms_admin",
      adminEmail,
      "local",
      passwordHash,
      null,
      "admin",
      new Date().toISOString()
    );
}

function findUserByEmail(email) {
  const conn = getDb();
  return conn.prepare("SELECT * FROM users WHERE email = ? LIMIT 1").get(email) || null;
}

function insertUser(user) {
  const conn = getDb();
  conn
    .prepare(
      "INSERT INTO users (id, username, email, provider, passwordHash, teamId, role, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .run(
      user.id,
      user.username,
      user.email,
      user.provider,
      user.passwordHash || null,
      user.teamId || null,
      user.role || "staff",
      user.createdAt
    );
  return user;
}

function countUsers() {
  const conn = getDb();
  return conn.prepare("SELECT COUNT(*) AS total FROM users").get().total;
}

function getDbFilePath() {
  return DB_FILE;
}

function createAdminSession(userId) {
  const conn = getDb();
  const token = randomUUID().replace(/-/g, "") + randomUUID().replace(/-/g, "");
  const createdAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString();
  conn
    .prepare("INSERT INTO admin_sessions (token, userId, expiresAt, createdAt) VALUES (?, ?, ?, ?)")
    .run(token, userId, expiresAt, createdAt);
  return { token, expiresAt };
}

function getAdminSession(token) {
  const conn = getDb();
  conn.prepare("DELETE FROM admin_sessions WHERE expiresAt < ?").run(new Date().toISOString());
  return (
    conn
      .prepare(
        `SELECT s.token, s.expiresAt, u.id AS userId, u.email, u.role
         FROM admin_sessions s
         JOIN users u ON u.id = s.userId
         WHERE s.token = ?
         LIMIT 1`
      )
      .get(String(token)) || null
  );
}

function findUserById(id) {
  const conn = getDb();
  return conn.prepare("SELECT * FROM users WHERE id = ? LIMIT 1").get(String(id)) || null;
}

module.exports = {
  ensureUsersTable,
  findUserByEmail,
  findUserById,
  insertUser,
  countUsers,
  getDbFilePath,
  getDb,
  createAdminSession,
  getAdminSession
};
