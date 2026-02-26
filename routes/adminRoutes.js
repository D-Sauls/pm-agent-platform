const express = require("express");
const { getCapacity } = require("../controllers/adminController");

const router = express.Router();

router.get("/capacity", getCapacity);

module.exports = router;
