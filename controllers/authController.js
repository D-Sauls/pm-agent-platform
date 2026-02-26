const bcrypt = require("bcryptjs");
const { OAuth2Client } = require("google-auth-library");
const { findUserByEmail, insertUser } = require("../models/userModel");

const SALT_ROUNDS = 12;
const MIN_PASSWORD_LENGTH = 8;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const googleClient = GOOGLE_CLIENT_ID ? new OAuth2Client(GOOGLE_CLIENT_ID) : null;

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function normalizeUsername(username) {
  return String(username || "").trim();
}

function publicUser(user) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    provider: user.provider,
    teamId: user.teamId || null,
    role: user.role || "staff"
  };
}

async function signup(req, res) {
  const username = normalizeUsername(req.body.username);
  const email = normalizeEmail(req.body.email);
  const password = req.body.password;

  if (!username || !email || !password) {
    return res.status(400).json({ error: "username, email, and password are required." });
  }
  if (typeof password !== "string" || password.length < MIN_PASSWORD_LENGTH) {
    return res
      .status(400)
      .json({ error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.` });
  }

  const existing = findUserByEmail(email);
  if (existing) {
    return res.status(409).json({ error: "An account with this email already exists." });
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const user = {
    id: Date.now().toString(),
    username,
    email,
    provider: "local",
    teamId: req.body.teamId || null,
    role: req.body.role || "staff",
    passwordHash,
    createdAt: new Date().toISOString()
  };

  insertUser(user);
  return res.status(201).json(publicUser(user));
}

async function login(req, res) {
  const email = normalizeEmail(req.body.email);
  const password = req.body.password;

  if (!email || !password) {
    return res.status(400).json({ error: "email and password are required." });
  }

  const user = findUserByEmail(email);
  if (!user) {
    return res.status(401).json({ error: "Invalid credentials." });
  }
  if (user.provider !== "local" || !user.passwordHash) {
    return res.status(401).json({ error: "Use Google Sign-In for this account." });
  }

  const matches = await bcrypt.compare(password, user.passwordHash);
  if (!matches) {
    return res.status(401).json({ error: "Invalid credentials." });
  }

  return res.status(200).json({
    message: "Login successful.",
    user: publicUser(user)
  });
}

async function googleSignup(req, res) {
  if (!googleClient) {
    return res.status(500).json({ error: "Google signup is not configured on the server." });
  }

  const username = normalizeUsername(req.body.username);
  const credential = String(req.body.credential || "");

  if (!username || !credential) {
    return res.status(400).json({ error: "username and credential are required." });
  }

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: GOOGLE_CLIENT_ID
    });
    const payload = ticket.getPayload();
    const email = normalizeEmail(payload?.email);

    if (!email) {
      return res.status(400).json({ error: "Google account email is required." });
    }

    const existing = findUserByEmail(email);
    if (existing) {
      return res.status(200).json(publicUser(existing));
    }

    const user = {
      id: Date.now().toString(),
      username,
      email,
      provider: "google",
      teamId: req.body.teamId || null,
      role: req.body.role || "staff",
      passwordHash: null,
      createdAt: new Date().toISOString()
    };

    insertUser(user);
    return res.status(201).json(publicUser(user));
  } catch (_error) {
    return res.status(401).json({ error: "Invalid Google credential." });
  }
}

module.exports = {
  signup,
  login,
  googleSignup
};
