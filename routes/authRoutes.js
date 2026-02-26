const express = require("express");
const { signup, login, googleSignup } = require("../controllers/authController");

const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);
router.post("/google", googleSignup);

module.exports = router;
