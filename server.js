const express = require("express");
const path = require("path");
const dotenv = require("dotenv");
const authRoutes = require("./routes/authRoutes");
const adminRoutes = require("./routes/adminRoutes");
const { ensureUsersTable } = require("./models/userModel");
const cmsRoutes = require("./routes/cmsRoutes");
const { ensureCmsTables } = require("./models/cmsModel");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/", (_req, res) => {
  res.redirect("/signup.html");
});

app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/cms", cmsRoutes);

app.listen(PORT, () => {
  ensureUsersTable();
  ensureCmsTables();
  console.log(`Server running on http://localhost:${PORT}`);
});
