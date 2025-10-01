const express = require("express");
const { getCurrentUser } = require("../controllers/user.controllers.js");
const { updateProfile } = require("../controllers/user.controllers");
const isAuth = require("../middlewares/isAuth.js");

const router = express.Router();

router.get("/current", isAuth, getCurrentUser);
router.patch("/update-profile", isAuth, updateProfile);

module.exports = router;
