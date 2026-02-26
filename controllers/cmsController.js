const bcrypt = require("bcryptjs");
const { findUserByEmail, createAdminSession, getAdminSession } = require("../models/userModel");
const {
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
} = require("../models/cmsModel");

function badRequest(res, message) {
  return res.status(400).json({ error: message });
}

function parseCookie(headerValue) {
  const out = {};
  if (!headerValue) return out;
  const parts = String(headerValue).split(";");
  for (const part of parts) {
    const [k, ...v] = part.trim().split("=");
    if (!k) continue;
    out[k] = decodeURIComponent(v.join("=") || "");
  }
  return out;
}

async function cmsLoginHandler(req, res) {
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");
  if (!email || !password) return badRequest(res, "email and password are required.");

  const user = findUserByEmail(email);
  if (!user || user.role !== "admin" || !user.passwordHash) {
    return res.status(401).json({ error: "Invalid CMS credentials." });
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: "Invalid CMS credentials." });

  const session = createAdminSession(user.id);
  const maxAge = 8 * 60 * 60;
  res.setHeader(
    "Set-Cookie",
    `cms_session=${session.token}; HttpOnly; Path=/; Max-Age=${maxAge}; SameSite=Lax`
  );
  return res.status(200).json({
    message: "CMS login successful.",
    user: { id: user.id, email: user.email, role: user.role }
  });
}

function cmsMeHandler(req, res) {
  const cookies = parseCookie(req.headers.cookie);
  const token = cookies.cms_session;
  if (!token) return res.status(401).json({ error: "Not authenticated." });
  const session = getAdminSession(token);
  if (!session || session.role !== "admin") return res.status(401).json({ error: "Not authenticated." });
  return res.status(200).json({ user: { id: session.userId, email: session.email, role: session.role } });
}

function createRestaurantHandler(req, res) {
  const name = String(req.body.name || "").trim();
  if (!name) return badRequest(res, "Restaurant name is required.");
  try {
    return res.status(201).json(createRestaurant(name));
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
}

function createTeamHandler(req, res) {
  const restaurantId = String(req.body.restaurantId || "").trim();
  const name = String(req.body.name || "").trim();
  if (!restaurantId || !name) return badRequest(res, "restaurantId and team name are required.");
  try {
    return res.status(201).json(createTeam(restaurantId, name));
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
}

function createCourseHandler(req, res) {
  const { restaurantId, title, description, contentType } = req.body;
  if (!restaurantId || !title) return badRequest(res, "restaurantId and title are required.");
  try {
    return res.status(201).json(createCourse(restaurantId, title, description, contentType));
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
}

function createModuleHandler(req, res) {
  const { courseId, title, position } = req.body;
  if (!courseId || !title) return badRequest(res, "courseId and title are required.");
  try {
    return res.status(201).json(createModule(courseId, title, position));
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
}

function createQuestionHandler(req, res) {
  const { moduleId, prompt, options, correctOptionIndex, videoUrl, position } = req.body;
  if (!moduleId || !prompt || !Array.isArray(options) || options.length < 2) {
    return badRequest(res, "moduleId, prompt, and at least 2 options are required.");
  }
  if (!Number.isInteger(Number(correctOptionIndex))) {
    return badRequest(res, "correctOptionIndex must be an integer.");
  }
  try {
    return res
      .status(201)
      .json(createQuestion(moduleId, prompt, options, Number(correctOptionIndex), videoUrl, position));
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
}

function scheduleReleaseHandler(req, res) {
  const { courseId, releaseAt } = req.body;
  if (!courseId || !releaseAt) return badRequest(res, "courseId and releaseAt are required.");
  const date = new Date(releaseAt);
  if (Number.isNaN(date.getTime())) return badRequest(res, "releaseAt must be a valid datetime.");
  return res.status(200).json(scheduleCourseRelease(courseId, date.toISOString()));
}

function assignCourseHandler(req, res) {
  const { courseId, teamId } = req.body;
  if (!courseId || !teamId) return badRequest(res, "courseId and teamId are required.");
  return res.status(201).json(assignCourseToTeam(courseId, teamId));
}

function assignUserTeamHandler(req, res) {
  const { email, teamId } = req.body;
  if (!email || !teamId) return badRequest(res, "email and teamId are required.");
  const user = assignUserToTeam(email, teamId);
  if (!user) return res.status(404).json({ error: "User not found." });
  return res.status(200).json(user);
}

function templateHandler(req, res) {
  const restaurantId = String(req.query.restaurantId || "").trim() || null;
  return res.status(200).json({ restaurants: getCmsTemplate(restaurantId) });
}

function userProfileHandler(req, res) {
  const email = String(req.query.email || "").trim().toLowerCase();
  if (!email) return badRequest(res, "email is required.");
  const data = getUserProfileAndCourses(email);
  if (!data.user) return res.status(404).json({ error: "User not found." });
  return res.status(200).json(data);
}

module.exports = {
  parseCookie,
  cmsLoginHandler,
  cmsMeHandler,
  createRestaurantHandler,
  createTeamHandler,
  createCourseHandler,
  createModuleHandler,
  createQuestionHandler,
  scheduleReleaseHandler,
  assignCourseHandler,
  assignUserTeamHandler,
  templateHandler,
  userProfileHandler
};
