const express = require("express");
const {
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
} = require("../controllers/cmsController");
const { requireCmsAdmin } = require("../middleware/cmsAuth");

const router = express.Router();

router.post("/login", cmsLoginHandler);
router.get("/me", cmsMeHandler);

router.post("/restaurants", requireCmsAdmin, createRestaurantHandler);
router.post("/teams", requireCmsAdmin, createTeamHandler);
router.post("/courses", requireCmsAdmin, createCourseHandler);
router.post("/modules", requireCmsAdmin, createModuleHandler);
router.post("/questions", requireCmsAdmin, createQuestionHandler);
router.post("/releases", requireCmsAdmin, scheduleReleaseHandler);
router.post("/assignments", requireCmsAdmin, assignCourseHandler);
router.post("/users/team", requireCmsAdmin, assignUserTeamHandler);
router.get("/template", requireCmsAdmin, templateHandler);
router.get("/user/profile", userProfileHandler);

module.exports = router;
