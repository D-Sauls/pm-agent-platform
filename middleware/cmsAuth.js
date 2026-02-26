const { getAdminSession } = require("../models/userModel");
const { parseCookie } = require("../controllers/cmsController");

function requireCmsAdmin(req, res, next) {
  const cookies = parseCookie(req.headers.cookie);
  const token = cookies.cms_session;
  if (!token) return res.status(401).json({ error: "CMS admin login required." });

  const session = getAdminSession(token);
  if (!session || session.role !== "admin") {
    return res.status(401).json({ error: "CMS admin login required." });
  }

  req.cmsAdmin = { userId: session.userId, email: session.email };
  next();
}

module.exports = {
  requireCmsAdmin
};
