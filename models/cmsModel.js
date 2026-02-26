const { randomUUID } = require("crypto");
const { getDb } = require("./userModel");

function ensureCmsTables() {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS restaurants (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS teams (
      id TEXT PRIMARY KEY,
      restaurantId TEXT NOT NULL,
      name TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      FOREIGN KEY (restaurantId) REFERENCES restaurants(id)
    );
    CREATE INDEX IF NOT EXISTS idx_teams_restaurant ON teams(restaurantId);

    CREATE TABLE IF NOT EXISTS courses (
      id TEXT PRIMARY KEY,
      restaurantId TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      contentType TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      FOREIGN KEY (restaurantId) REFERENCES restaurants(id)
    );
    CREATE INDEX IF NOT EXISTS idx_courses_restaurant ON courses(restaurantId);

    CREATE TABLE IF NOT EXISTS modules (
      id TEXT PRIMARY KEY,
      courseId TEXT NOT NULL,
      title TEXT NOT NULL,
      position INTEGER NOT NULL DEFAULT 1,
      createdAt TEXT NOT NULL,
      FOREIGN KEY (courseId) REFERENCES courses(id)
    );
    CREATE INDEX IF NOT EXISTS idx_modules_course ON modules(courseId, position);

    CREATE TABLE IF NOT EXISTS quiz_questions (
      id TEXT PRIMARY KEY,
      moduleId TEXT NOT NULL,
      prompt TEXT NOT NULL,
      optionsJson TEXT NOT NULL,
      correctOptionIndex INTEGER NOT NULL,
      videoUrl TEXT,
      position INTEGER NOT NULL DEFAULT 1,
      createdAt TEXT NOT NULL,
      FOREIGN KEY (moduleId) REFERENCES modules(id)
    );
    CREATE INDEX IF NOT EXISTS idx_questions_module ON quiz_questions(moduleId, position);

    CREATE TABLE IF NOT EXISTS course_releases (
      courseId TEXT PRIMARY KEY,
      releaseAt TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      FOREIGN KEY (courseId) REFERENCES courses(id)
    );

    CREATE TABLE IF NOT EXISTS course_assignments (
      id TEXT PRIMARY KEY,
      courseId TEXT NOT NULL,
      teamId TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      UNIQUE(courseId, teamId),
      FOREIGN KEY (courseId) REFERENCES courses(id),
      FOREIGN KEY (teamId) REFERENCES teams(id)
    );
  `);
}

function createRestaurant(name) {
  const db = getDb();
  const record = { id: randomUUID(), name: String(name).trim(), createdAt: new Date().toISOString() };
  db.prepare("INSERT INTO restaurants (id, name, createdAt) VALUES (?, ?, ?)").run(
    record.id,
    record.name,
    record.createdAt
  );
  return record;
}

function createTeam(restaurantId, name) {
  const db = getDb();
  const record = {
    id: randomUUID(),
    restaurantId: String(restaurantId),
    name: String(name).trim(),
    createdAt: new Date().toISOString()
  };
  db.prepare("INSERT INTO teams (id, restaurantId, name, createdAt) VALUES (?, ?, ?, ?)").run(
    record.id,
    record.restaurantId,
    record.name,
    record.createdAt
  );
  return record;
}

function createCourse(restaurantId, title, description, contentType) {
  const db = getDb();
  const record = {
    id: randomUUID(),
    restaurantId: String(restaurantId),
    title: String(title).trim(),
    description: String(description || "").trim(),
    contentType: String(contentType || "multiple_choice_video"),
    createdAt: new Date().toISOString()
  };
  db.prepare(
    "INSERT INTO courses (id, restaurantId, title, description, contentType, createdAt) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(
    record.id,
    record.restaurantId,
    record.title,
    record.description,
    record.contentType,
    record.createdAt
  );
  return record;
}

function createModule(courseId, title, position) {
  const db = getDb();
  const record = {
    id: randomUUID(),
    courseId: String(courseId),
    title: String(title).trim(),
    position: Number(position) || 1,
    createdAt: new Date().toISOString()
  };
  db.prepare("INSERT INTO modules (id, courseId, title, position, createdAt) VALUES (?, ?, ?, ?, ?)").run(
    record.id,
    record.courseId,
    record.title,
    record.position,
    record.createdAt
  );
  return record;
}

function createQuestion(moduleId, prompt, options, correctOptionIndex, videoUrl, position) {
  const db = getDb();
  const record = {
    id: randomUUID(),
    moduleId: String(moduleId),
    prompt: String(prompt).trim(),
    optionsJson: JSON.stringify(options),
    correctOptionIndex: Number(correctOptionIndex),
    videoUrl: videoUrl ? String(videoUrl).trim() : null,
    position: Number(position) || 1,
    createdAt: new Date().toISOString()
  };
  db.prepare(
    "INSERT INTO quiz_questions (id, moduleId, prompt, optionsJson, correctOptionIndex, videoUrl, position, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  ).run(
    record.id,
    record.moduleId,
    record.prompt,
    record.optionsJson,
    record.correctOptionIndex,
    record.videoUrl,
    record.position,
    record.createdAt
  );
  return {
    ...record,
    options
  };
}

function scheduleCourseRelease(courseId, releaseAt) {
  const db = getDb();
  const createdAt = new Date().toISOString();
  db.prepare(
    "INSERT INTO course_releases (courseId, releaseAt, createdAt) VALUES (?, ?, ?) ON CONFLICT(courseId) DO UPDATE SET releaseAt = excluded.releaseAt"
  ).run(courseId, releaseAt, createdAt);
  return { courseId, releaseAt };
}

function assignCourseToTeam(courseId, teamId) {
  const db = getDb();
  const record = {
    id: randomUUID(),
    courseId: String(courseId),
    teamId: String(teamId),
    createdAt: new Date().toISOString()
  };
  db.prepare(
    "INSERT OR IGNORE INTO course_assignments (id, courseId, teamId, createdAt) VALUES (?, ?, ?, ?)"
  ).run(record.id, record.courseId, record.teamId, record.createdAt);
  return record;
}

function assignUserToTeam(email, teamId) {
  const db = getDb();
  db.prepare("UPDATE users SET teamId = ? WHERE email = ?").run(String(teamId), String(email).toLowerCase());
  return db.prepare("SELECT * FROM users WHERE email = ?").get(String(email).toLowerCase()) || null;
}

function getCmsTemplate(restaurantId) {
  const db = getDb();
  const restaurants = restaurantId
    ? db.prepare("SELECT * FROM restaurants WHERE id = ?").all(String(restaurantId))
    : db.prepare("SELECT * FROM restaurants ORDER BY createdAt DESC").all();

  return restaurants.map((restaurant) => {
    const teams = db.prepare("SELECT * FROM teams WHERE restaurantId = ? ORDER BY createdAt DESC").all(restaurant.id);
    const courses = db
      .prepare("SELECT * FROM courses WHERE restaurantId = ? ORDER BY createdAt DESC")
      .all(restaurant.id)
      .map((course) => {
        const modules = db
          .prepare("SELECT * FROM modules WHERE courseId = ? ORDER BY position ASC, createdAt ASC")
          .all(course.id)
          .map((module) => {
            const questions = db
              .prepare(
                "SELECT id, moduleId, prompt, optionsJson, correctOptionIndex, videoUrl, position, createdAt FROM quiz_questions WHERE moduleId = ? ORDER BY position ASC, createdAt ASC"
              )
              .all(module.id)
              .map((q) => ({
                ...q,
                options: JSON.parse(q.optionsJson)
              }));
            return { ...module, questions };
          });

        const release = db.prepare("SELECT releaseAt FROM course_releases WHERE courseId = ?").get(course.id) || null;
        const assignedTeamIds = db
          .prepare("SELECT teamId FROM course_assignments WHERE courseId = ?")
          .all(course.id)
          .map((r) => r.teamId);

        return {
          ...course,
          releaseAt: release ? release.releaseAt : null,
          assignedTeamIds,
          modules
        };
      });

    return { ...restaurant, teams, courses };
  });
}

function getUserProfileAndCourses(email) {
  const db = getDb();
  const user = db
    .prepare(
      `SELECT u.id, u.username, u.email, u.provider, u.teamId, u.role, t.name AS teamName, r.id AS restaurantId, r.name AS restaurantName
       FROM users u
       LEFT JOIN teams t ON t.id = u.teamId
       LEFT JOIN restaurants r ON r.id = t.restaurantId
       WHERE u.email = ?`
    )
    .get(String(email).toLowerCase());

  if (!user) return { user: null, courses: [] };
  if (!user.teamId) return { user, courses: [] };

  const nowIso = new Date().toISOString();
  const courses = db
    .prepare(
      `SELECT c.id, c.title, c.description, c.contentType, c.createdAt, cr.releaseAt
       FROM course_assignments ca
       JOIN courses c ON c.id = ca.courseId
       LEFT JOIN course_releases cr ON cr.courseId = c.id
       WHERE ca.teamId = ?
         AND (cr.releaseAt IS NULL OR cr.releaseAt <= ?)
       ORDER BY c.createdAt DESC`
    )
    .all(user.teamId, nowIso);

  return { user, courses };
}

module.exports = {
  ensureCmsTables,
  createRestaurant,
  createTeam,
  createCourse,
  createModule,
  createQuestion,
  scheduleCourseRelease,
  assignCourseToTeam,
  assignUserToTeam,
  getCmsTemplate,
  getUserProfileAndCourses
};
